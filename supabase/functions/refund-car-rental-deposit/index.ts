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
import { getCorsHeaders } from "../_shared/cors.ts";
import Stripe from "../_shared/stripe.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";

interface Body {
  reservation_id: string;
  /** Amount to refund in cents. Omit to refund the full deposit. */
  amount_cents?: number;
  reason?: string;
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const rl = await rateLimitDb(user.id, "payment");
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...cors, "Content-Type": "application/json", ...rateLimitHeaders(rl, "payment") },
      });
    }

    const body = (await req.json()) as Body;
    if (!body?.reservation_id) {
      return new Response(JSON.stringify({ error: "reservation_id required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
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
      .eq("id", body.reservation_id)
      .maybeSingle();
    if (resErr) throw resErr;
    if (!reservation) {
      return new Response(JSON.stringify({ error: "Reservation not found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const r = reservation as any;

    if (!r.stripe_payment_intent_id) {
      return new Response(
        JSON.stringify({ error: "No Stripe PaymentIntent on this reservation — nothing to refund." }),
        { status: 409, headers: { ...cors, "Content-Type": "application/json" } },
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
    const depositPi = await stripe.paymentIntents.retrieve(r.stripe_payment_intent_id);

    // Compute the refund amount. If caller didn't specify, refund the
    // amount actually held on the deposit PI (handles partial captures
    // too). Cap at amount_received / amount_capturable.
    const heldCents =
      (depositPi.amount_received as number)
      || (depositPi.amount_capturable as number)
      || (r.deposit_paid_cents || 0)
      || (r.security_deposit_cents || 0);
    const requestedCents = Number(body.amount_cents);
    const refundCents = Number.isFinite(requestedCents) && requestedCents > 0
      ? Math.min(requestedCents, heldCents)
      : heldCents;

    if (refundCents <= 0) {
      return new Response(
        JSON.stringify({ ok: true, refunded_cents: 0, message: "Nothing to refund." }),
        { headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // ---- Path A: uncaptured pre-auth → cancel the PI (cleaner UX, no Stripe fee) ----
    if (depositPi.status === "requires_capture") {
      const cancelled = await stripe.paymentIntents.cancel(
        r.stripe_payment_intent_id,
        { cancellation_reason: "requested_by_customer" },
        { idempotencyKey: `car_rental_dep_cancel_${body.reservation_id.replace(/-/g, "")}` },
      );

      await admin
        .from("car_rental_reservations")
        .update({
          payment_status: "refunded",
          last_payment_error: null,
        })
        .eq("id", body.reservation_id);

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
          reservation_id: body.reservation_id,
          store_id: r.store_id,
          reason_label: (body.reason || "").slice(0, 200),
        },
      },
      { idempotencyKey: `car_rental_dep_refund_${body.reservation_id.replace(/-/g, "")}_${refundCents}` },
    );

    await admin
      .from("car_rental_reservations")
      .update({
        stripe_refund_id: refund.id,
        payment_status: refund.status === "succeeded" ? "refunded" : "refund_pending",
        last_payment_error: null,
      })
      .eq("id", body.reservation_id);

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
});
