/**
 * create-car-rental-deposit
 * Creates a Stripe PaymentIntent to pre-authorise the security deposit on a
 * car-rental reservation. Saves the payment method to the customer so the
 * balance can be captured off-session at pickup time
 * (see capture-car-rental-balance).
 *
 * Hardening:
 *  - dedup_key persisted to car_rental_payment_attempts (UNIQUE). Duplicate POSTs
 *    return the cached client_secret instead of minting a new PaymentIntent.
 *  - Stripe Idempotency-Key derived from (reservation_id, deposit_cents,
 *    client_attempt_id) — equivalent calls always return the same PI.
 *  - Bails out if the reservation is already in a terminal payment state.
 */
import { createClient } from "../_shared/deps.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import Stripe from "../_shared/stripe.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";

interface Body {
  reservation_id: string;
  client_attempt_id?: string;
  force_new?: boolean;
}

const TERMINAL_PAYMENT_STATES = new Set([
  "authorized",
  "captured",
  "paid",
  "refund_pending",
  "refunded",
]);

const sha256Hex = async (s: string) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

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

    // Allow anonymous booking — many public rentals are guest checkouts.
    // Rate-limit by user_id when signed in, by IP otherwise.
    const rlKey = user?.id || req.headers.get("x-forwarded-for") || "anon";
    const rl = await rateLimitDb(rlKey, "payment");
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

    const clientAttemptId = (body.client_attempt_id || "default").slice(0, 64);
    const forceNew = body.force_new === true;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: reservation, error: resErr } = await admin
      .from("car_rental_reservations")
      .select(
        "id, store_id, customer_email, customer_name, confirmation_code, " +
        "security_deposit_cents, total_cents, payment_status, " +
        "stripe_customer_id, stripe_payment_intent_id",
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

    if (r.payment_status && TERMINAL_PAYMENT_STATES.has(r.payment_status)) {
      return new Response(
        JSON.stringify({
          already_paid: true,
          status: r.payment_status,
          message: `Payment is already ${r.payment_status.replace("_", " ")}.`,
        }),
        { headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // Settings drive currency + capture mode
    const { data: settings } = await admin
      .from("car_rental_store_settings")
      .select("currency_code, deposit_capture_mode")
      .eq("store_id", r.store_id)
      .maybeSingle();
    const currency = String((settings as any)?.currency_code || "USD").toLowerCase();
    const captureMode: "manual" | "immediate" =
      (settings as any)?.deposit_capture_mode === "immediate" ? "immediate" : "manual";

    /**
     * Deposit-at-booking model:
     *   - capture_method "manual"  → pre-authorise the security deposit only.
     *     Balance gets captured at pickup via capture-car-rental-balance.
     *   - "immediate"              → charge the full total upfront.
     * Floor of $0.50 enforced — Stripe rejects sub-$0.50 PaymentIntents.
     */
    const amountCents =
      captureMode === "immediate"
        ? Math.max(50, r.total_cents || 0)
        : Math.max(50, r.security_deposit_cents || 0);

    if (amountCents < 50) {
      return new Response(
        JSON.stringify({ error: "Reservation amount must be at least $0.50" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // ---- Dedup-key check ----
    const forceSuffix = forceNew ? `|force_${Date.now()}` : "";
    const dedupKey = `${body.reservation_id}|${amountCents}|${captureMode}|${clientAttemptId}${forceSuffix}`;

    const { data: dedupRow } = await admin
      .from("car_rental_payment_attempts")
      .insert({
        dedup_key: dedupKey,
        reservation_id: body.reservation_id,
        client_attempt_id: clientAttemptId,
        customer_user_id: user?.id ?? null,
        result: "in_progress",
      })
      .select("id")
      .maybeSingle();

    if (!dedupRow) {
      const { data: prior } = await admin
        .from("car_rental_payment_attempts")
        .select("stripe_payment_intent_id, stripe_client_secret")
        .eq("dedup_key", dedupKey)
        .maybeSingle();
      if ((prior as any)?.stripe_client_secret) {
        return new Response(
          JSON.stringify({
            client_secret: (prior as any).stripe_client_secret,
            payment_intent_id: (prior as any).stripe_payment_intent_id,
            amount_cents: amountCents,
            currency,
            reused: true,
          }),
          { headers: { ...cors, "Content-Type": "application/json" } },
        );
      }
    }
    const dedupRowId = (dedupRow as any)?.id || null;

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // ---- Customer lookup / create ----
    let customerId: string | undefined = r.stripe_customer_id || undefined;
    const email = user?.email || r.customer_email || undefined;
    if (!customerId && email) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const created = await stripe.customers.create({
          email,
          name: r.customer_name || undefined,
          metadata: {
            zivo_user_id: user?.id || "",
            reservation_id: body.reservation_id,
            confirmation_code: r.confirmation_code || "",
          },
        });
        customerId = created.id;
      }
    }

    // ---- Reuse an existing open PI for this reservation, unless forced ----
    const existingPiId = forceNew ? null : (r.stripe_payment_intent_id as string | null);
    if (existingPiId) {
      try {
        const existing = await stripe.paymentIntents.retrieve(existingPiId);
        if (
          ["requires_payment_method", "requires_confirmation", "requires_action"].includes(existing.status)
          && (existing as any).client_secret
        ) {
          if (dedupRowId) {
            await admin
              .from("car_rental_payment_attempts")
              .update({
                completed_at: new Date().toISOString(),
                result: "reused_pi",
                stripe_payment_intent_id: existing.id,
                stripe_client_secret: (existing as any).client_secret,
              })
              .eq("id", dedupRowId);
          }
          return new Response(
            JSON.stringify({
              client_secret: (existing as any).client_secret,
              payment_intent_id: existing.id,
              amount_cents: amountCents,
              currency,
              reused: true,
            }),
            { headers: { ...cors, "Content-Type": "application/json" } },
          );
        }
      } catch (_) { /* fall through to create new */ }
    }

    // Idempotency key — equivalent inputs always resolve to the same PI.
    const attemptHash = await sha256Hex(
      `${body.reservation_id}|${amountCents}|${captureMode}|${clientAttemptId}${forceSuffix}`,
    );
    const idempotencyKey = `car_rental_dep_${body.reservation_id.replace(/-/g, "")}_${attemptHash.slice(0, 16)}`;

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency,
        customer: customerId,
        capture_method: captureMode === "manual" ? "manual" : "automatic",
        // Save the PM to the customer so we can charge the balance off-session at pickup.
        setup_future_usage: "off_session",
        payment_method_types: ["card"],
        description:
          captureMode === "manual"
            ? `Security deposit hold · ${r.confirmation_code || "rental"}`
            : `Car rental · ${r.confirmation_code || "rental"}`,
        metadata: {
          type: captureMode === "manual" ? "car_rental_deposit" : "car_rental_full",
          reservation_id: body.reservation_id,
          store_id: r.store_id,
          confirmation_code: r.confirmation_code || "",
        },
      },
      { idempotencyKey },
    );

    await admin
      .from("car_rental_reservations")
      .update({
        stripe_customer_id: customerId ?? null,
        stripe_payment_intent_id: paymentIntent.id,
        payment_provider: "stripe",
        last_payment_error: null,
      })
      .eq("id", body.reservation_id);

    if (dedupRowId) {
      await admin
        .from("car_rental_payment_attempts")
        .update({
          completed_at: new Date().toISOString(),
          result: "created_pi",
          stripe_payment_intent_id: paymentIntent.id,
          stripe_client_secret: (paymentIntent as any).client_secret ?? null,
        })
        .eq("id", dedupRowId);
    }

    return new Response(
      JSON.stringify({
        client_secret: (paymentIntent as any).client_secret,
        payment_intent_id: paymentIntent.id,
        amount_cents: amountCents,
        currency,
        capture_mode: captureMode,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[create-car-rental-deposit] Error:", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
