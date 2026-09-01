/**
 * refund-car-rental-deposit
 * Called by the admin Return / Check-in flow when the operator decides to
 * refund the security deposit (full or partial — e.g. minus damage fees).
 *
 * If the deposit was pre-authorised (capture_method = manual) and never
 * captured, we CANCEL the PaymentIntent instead of refunding (no funds
 * moved → cleanest outcome for the renter).
 *
 * If the deposit was already captured, we issue a Stripe refund for the
 * computed amount. The webhook flips payment_status → refund_pending
 * and then refunded once the refund settles.
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import Stripe from "../_shared/stripe.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface Body {
  reservation_id: string;
  /** Amount to refund in cents. Omit to refund the full deposit. */
  amount_cents?: number;
  reason?: string;
}

Deno.serve(withSecurity("refund-car-rental-deposit", async (req, ctx) => {
  const cors = ctx.corsHeaders;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return new Response(
        JSON.stringify({ error: "Refund service is unavailable" }),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth
      .getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    const rl = await rateLimitDb(user.id, "payment");
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: {
            ...cors,
            "Content-Type": "application/json",
            ...rateLimitHeaders(rl, "payment"),
          },
        },
      );
    }

    const body = await req.json().catch(() => null) as Body | null;
    const reservationId = cleanUuid(body?.reservation_id);
    if (!reservationId) {
      return new Response(
        JSON.stringify({ error: "reservation_id required" }),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: reservation, error: resErr } = await admin
      .from("car_rental_reservations")
      .select(
        "id, store_id, security_deposit_cents, deposit_paid_cents, " +
          "payment_status, stripe_payment_intent_id, stripe_refund_id",
      )
      .eq("id", reservationId)
      .maybeSingle();
    if (resErr) throw resErr;
    if (!reservation) {
      return new Response(JSON.stringify({ error: "Reservation not found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const r = reservation as any;

    // Authentication alone is not refund authority. The reservation's
    // server-owned store_id must belong to this caller, or the caller must
    // hold the exact platform admin role, before any Stripe state is disclosed
    // or acted on.
    const canRefund = await canManageStore(admin, r.store_id, user.id);
    if (!canRefund) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (!r.stripe_payment_intent_id) {
      return new Response(
        JSON.stringify({
          error:
            "No Stripe PaymentIntent on this reservation — nothing to refund.",
        }),
        {
          status: 409,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    if (r.stripe_refund_id) {
      return new Response(
        JSON.stringify({
          ok: true,
          already_refunded: true,
          refund_id: r.stripe_refund_id,
          message: "Deposit already refunded.",
        }),
        { headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const depositPi = await stripe.paymentIntents.retrieve(
      r.stripe_payment_intent_id,
    );

    // Compute the refund amount. If caller didn't specify, refund the
    // amount actually held on the deposit PI (handles partial captures
    // too). Cap at amount_received / amount_capturable.
    const heldCents = (depositPi.amount_received as number) ||
      (depositPi.amount_capturable as number) ||
      (r.deposit_paid_cents || 0) ||
      (r.security_deposit_cents || 0);
    const requestedCents = Number(body?.amount_cents);
    const refundCents = Number.isFinite(requestedCents) && requestedCents > 0
      ? Math.min(requestedCents, heldCents)
      : heldCents;

    if (refundCents <= 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          refunded_cents: 0,
          message: "Nothing to refund.",
        }),
        { headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // ---- Path A: uncaptured pre-auth → cancel the PI (cleaner UX, no Stripe fee) ----
    if (depositPi.status === "requires_capture") {
      const cancelled = await stripe.paymentIntents.cancel(
        r.stripe_payment_intent_id,
        { cancellation_reason: "requested_by_customer" },
        {
          idempotencyKey: `car_rental_dep_cancel_${
            reservationId.replace(/-/g, "")
          }`,
        },
      );

      await admin
        .from("car_rental_reservations")
        .update({
          payment_status: "refunded",
          last_payment_error: null,
        })
        .eq("id", reservationId);

      return new Response(
        JSON.stringify({
          ok: true,
          action: "cancelled_preauth",
          payment_intent_id: cancelled.id,
          refunded_cents: refundCents,
          status: cancelled.status,
        }),
        { headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // ---- Path B: captured deposit → issue a refund ----
    const refund = await stripe.refunds.create(
      {
        payment_intent: r.stripe_payment_intent_id,
        amount: refundCents,
        reason: "requested_by_customer",
        metadata: {
          type: "car_rental_deposit_refund",
          reservation_id: reservationId,
          store_id: r.store_id,
          reason_label: cleanReason(body?.reason),
        },
      },
      {
        idempotencyKey: `car_rental_dep_refund_${
          reservationId.replace(/-/g, "")
        }_${refundCents}`,
      },
    );

    await admin
      .from("car_rental_reservations")
      .update({
        stripe_refund_id: refund.id,
        // deno-fmt-ignore
        payment_status: refund.status === "succeeded" ? "refunded" : "refund_pending",
        last_payment_error: null,
      })
      .eq("id", reservationId);

    return new Response(
      JSON.stringify({
        ok: true,
        action: "refunded",
        refund_id: refund.id,
        refunded_cents: refundCents,
        status: refund.status,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    const msg = e?.message || String(e);
    console.error("[refund-car-rental-deposit] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
}, {
  rateLimit: "payment",
  strictCors: true,
  allowedMethods: ["POST"],
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
}));

async function canManageStore(
  admin: any,
  storeId: unknown,
  userId: string,
): Promise<boolean> {
  const cleanStoreId = cleanUuid(storeId);
  if (!cleanStoreId) return false;

  const { data: ownedStore, error: ownerError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", cleanStoreId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (ownerError) {
    console.error(
      "[refund-car-rental-deposit:store-owner]",
      ownerError.message,
    );
    return false;
  }
  if (ownedStore?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[refund-car-rental-deposit:admin-role]", roleError.message);
    return false;
  }
  return isAdmin === true;
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanReason(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 200) : "";
}
