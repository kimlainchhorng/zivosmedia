/**
 * capture-car-rental-balance
 * Called by the admin Pickup Check-out flow. Charges the balance
 * (total_cents - deposit_paid_cents) off-session against the same
 * Stripe Customer + PaymentMethod used for the deposit pre-auth.
 *
 * The deposit pre-auth itself is left holding the security deposit
 * until return time; this function only captures the rental balance.
 *
 * Idempotent — second call returns the same balance PI.
 */
import { createClient } from "../_shared/deps.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import Stripe from "../_shared/stripe.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";

interface Body {
  reservation_id: string;
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
        "id, store_id, confirmation_code, total_cents, deposit_paid_cents, " +
        "amount_paid_cents, payment_status, stripe_customer_id, " +
        "stripe_payment_intent_id, stripe_balance_payment_intent_id, " +
        "stripe_payment_method_id",
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

    if (!r.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: "No Stripe customer on this reservation — no card on file to charge." }),
        { status: 409, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const balanceCents = Math.max(0, (r.total_cents || 0) - (r.amount_paid_cents || 0));
    if (balanceCents <= 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          already_settled: true,
          balance_cents: 0,
          message: "Rental balance is already fully paid.",
        }),
        { headers: { ...cors, "Content-Type": "application/json" } },
      );
    }
    if (balanceCents < 50) {
      return new Response(
        JSON.stringify({ error: "Outstanding balance is below Stripe's $0.50 minimum charge." }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Idempotency: same reservation + same balance amount → same PaymentIntent.
    const idempotencyKey = `car_rental_bal_${body.reservation_id.replace(/-/g, "")}_${balanceCents}`;

    // If we already minted a balance PI, retrieve it instead of creating a new one.
    if (r.stripe_balance_payment_intent_id) {
      try {
        const existing = await stripe.paymentIntents.retrieve(r.stripe_balance_payment_intent_id);
        if (existing.status === "succeeded") {
          return new Response(
            JSON.stringify({
              ok: true,
              payment_intent_id: existing.id,
              amount_cents: balanceCents,
              status: existing.status,
              reused: true,
            }),
            { headers: { ...cors, "Content-Type": "application/json" } },
          );
        }
      } catch (_) { /* fall through and create new */ }
    }

    // Resolve a payment method — prefer the one explicitly stored, else fall
    // back to whatever PM the deposit PI ended up confirming.
    let paymentMethodId: string | undefined = r.stripe_payment_method_id || undefined;
    if (!paymentMethodId && r.stripe_payment_intent_id) {
      try {
        const depositPi = await stripe.paymentIntents.retrieve(r.stripe_payment_intent_id);
        if (typeof depositPi.payment_method === "string") {
          paymentMethodId = depositPi.payment_method;
        } else if (depositPi.payment_method && typeof depositPi.payment_method === "object") {
          paymentMethodId = (depositPi.payment_method as any).id;
        }
      } catch (e) {
        console.warn("[capture-car-rental-balance] could not retrieve deposit PI", e);
      }
    }

    if (!paymentMethodId) {
      return new Response(
        JSON.stringify({ error: "No saved payment method found for this reservation." }),
        { status: 409, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const balancePi = await stripe.paymentIntents.create(
      {
        amount: balanceCents,
        currency: "usd",
        customer: r.stripe_customer_id,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        description: `Car rental balance · ${r.confirmation_code || r.id}`,
        metadata: {
          type: "car_rental_balance",
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
        stripe_balance_payment_intent_id: balancePi.id,
        stripe_payment_method_id: paymentMethodId,
        last_payment_error: null,
      })
      .eq("id", body.reservation_id);

    return new Response(
      JSON.stringify({
        ok: true,
        payment_intent_id: balancePi.id,
        amount_cents: balanceCents,
        status: balancePi.status,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    // Surface Stripe's structured error when off-session charge fails
    // (e.g. card declined, authentication required).
    const code = e?.code || e?.raw?.code;
    const msg = e?.message || String(e);
    console.error("[capture-car-rental-balance] Error:", code, msg);
    return new Response(
      JSON.stringify({
        error: msg,
        code: code || null,
        decline_code: e?.decline_code || e?.raw?.decline_code || null,
        requires_authentication: code === "authentication_required",
      }),
      { status: 402, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
