/**
 * charge-salon-tip
 * ----------------
 * Customer-initiated off-session tip charge.
 *
 * Auth model: anon-callable. The booking UUID is the unguessable token (same
 * trust model as salon_public_get_booking / cancel). Customer visits
 * /booking/:id after their visit, taps "Leave a tip", picks an amount, and
 * we charge the card we saved off-session during the deposit Checkout
 * (see create-salon-deposit — `setup_future_usage: 'off_session'` +
 * `customer_creation: 'always'` makes this PM + Customer reusable).
 *
 * The resulting transfer lands on the salon owner's Stripe Connect Express
 * account, same as the deposit (`transfer_data.destination`).
 *
 * Idempotent:
 *   - `tip_stripe_payment_intent_id` is set BEFORE returning, so a retry
 *     short-circuits at the "tip already submitted" check.
 *   - Stripe Idempotency-Key is `salon-tip:<booking_id>` so a rapid
 *     double-tap returns the SAME PI rather than charging twice.
 *
 * Failure handling: card declines + authentication-required surface as
 * exceptions when `off_session: true` + `confirm: true`. We persist the
 * failure reason synchronously so the booking page can re-prompt without
 * waiting for the payment_intent.payment_failed webhook.
 */
import { createClient } from "../_shared/deps.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import Stripe from "../_shared/stripe.ts";

interface Body {
  booking_id?: string;
  tip_cents?: number;
}

// Cap on tip-vs-service-price ratio. Beyond this looks like an entry error
// (e.g. user typed "5000" thinking dollars when the field is cents) — bail
// rather than charge $50 on a $5 service.
const MAX_TIP_RATIO = 2.0;
// Absolute cap for paranoia (Stripe also has its own ceilings).
const MAX_TIP_CENTS = 100_00; // $100

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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    const body = (await req.json().catch(() => ({}))) as Body;
    const bookingId = body.booking_id?.trim();
    const tipCents = Math.floor(Number(body.tip_cents ?? 0));
    if (!bookingId) {
      return new Response(JSON.stringify({ error: "booking_id required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!Number.isFinite(tipCents) || tipCents <= 0) {
      return new Response(JSON.stringify({ error: "tip_cents must be a positive integer" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (tipCents > MAX_TIP_CENTS) {
      return new Response(JSON.stringify({ error: `Tip is capped at $${(MAX_TIP_CENTS / 100).toFixed(0)}. Please pay any excess in person.` }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // --- Load booking + validate payable state -----------------------------
    const { data: booking, error: bErr } = await supabase
      .from("salon_bookings")
      .select([
        "id", "store_id", "status",
        "price_cents", "addons_total_cents",
        "tip_cents", "tip_stripe_payment_intent_id",
        "stripe_customer_id", "stripe_payment_method_id",
      ].join(","))
      .eq("id", bookingId)
      .maybeSingle();
    if (bErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const b = booking as any;

    // Tip is only meaningful once the customer has been served. Allow
    // `confirmed` too in case the owner forgets to mark complete — the
    // customer is right there at the counter.
    if (b.status !== "completed" && b.status !== "confirmed") {
      return new Response(JSON.stringify({ error: `Can't tip on a ${b.status} booking.` }), {
        status: 409,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (b.tip_stripe_payment_intent_id) {
      return new Response(JSON.stringify({
        error: "A tip has already been recorded for this booking.",
        payment_intent_id: b.tip_stripe_payment_intent_id,
      }), {
        status: 409,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!b.stripe_customer_id || !b.stripe_payment_method_id) {
      return new Response(JSON.stringify({ error: "No card on file for this booking — please tip in person." }), {
        status: 409,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const billCents = Number(b.price_cents ?? 0) + Number(b.addons_total_cents ?? 0);
    if (billCents > 0 && tipCents > billCents * MAX_TIP_RATIO) {
      return new Response(JSON.stringify({
        error: `Tip looks unusually high (more than ${MAX_TIP_RATIO}× the bill). Please double-check the amount.`,
      }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // --- Stripe Connect destination ---------------------------------------
    const { data: settings } = await supabase
      .from("store_payment_settings")
      .select("stripe_account_id, stripe_status, tips_enabled")
      .eq("store_id", b.store_id)
      .eq("market", "us")
      .maybeSingle();
    const accountId = (settings as any)?.stripe_account_id;
    const stripeStatus = (settings as any)?.stripe_status;
    const tipsEnabled = (settings as any)?.tips_enabled ?? true;
    if (!tipsEnabled) {
      return new Response(JSON.stringify({ error: "This salon isn't accepting online tips right now." }), {
        status: 409,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!accountId || stripeStatus !== "active") {
      return new Response(JSON.stringify({ error: "This salon's Stripe account isn't active." }), {
        status: 409,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // --- Off-session PaymentIntent ----------------------------------------
    try {
      const pi = await stripe.paymentIntents.create(
        {
          amount: tipCents,
          currency: "usd",
          customer: b.stripe_customer_id,
          payment_method: b.stripe_payment_method_id,
          off_session: true,
          confirm: true,
          transfer_data: { destination: accountId },
          metadata: {
            type: "salon_tip",
            salon_booking_id: b.id,
            store_id: b.store_id,
          },
        },
        { idempotencyKey: `salon-tip:${b.id}` },
      );

      // Stamp PI id + clear any prior failure state up-front so a retry from
      // the customer page short-circuits at the "already recorded" branch
      // even if the webhook hasn't fired yet.
      const updatePatch: Record<string, unknown> = {
        tip_stripe_payment_intent_id: pi.id,
        tip_charge_failed_at: null,
        tip_charge_failed_reason: null,
        updated_at: new Date().toISOString(),
      };
      // If Stripe returned 'succeeded' synchronously (no 3DS required), we
      // can credit tip_cents inline so the customer's "thanks for tipping"
      // copy renders on first render rather than after the webhook round-trip.
      if (pi.status === "succeeded") {
        updatePatch.tip_cents = (Number(b.tip_cents ?? 0) || 0) + (pi.amount_received || pi.amount || tipCents);
        updatePatch.tip_charged_at = new Date().toISOString();
      }
      await supabase
        .from("salon_bookings")
        .update(updatePatch)
        .eq("id", b.id);

      return new Response(JSON.stringify({
        ok: true,
        payment_intent_id: pi.id,
        amount: pi.amount,
        status: pi.status,
      }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    } catch (e) {
      const err = e as Stripe.StripeRawError & { code?: string; message: string };
      const reason = err.message || err.code || "unknown";
      const piId = (err as any).payment_intent?.id ?? null;
      await supabase
        .from("salon_bookings")
        .update({
          tip_charge_failed_at: new Date().toISOString(),
          tip_charge_failed_reason: reason,
          // Persist PI id from the failed attempt too — webhook may still
          // see retries on the same PI.
          ...(piId ? { tip_stripe_payment_intent_id: piId } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", b.id);
      console.warn("[charge-salon-tip] charge failed", { booking: b.id, reason });
      // Use 402 (Payment Required) so the FE can branch on status to render
      // a card-decline UI distinct from generic 500s.
      return new Response(JSON.stringify({
        ok: false,
        error_code: err.code ?? "stripe_error",
        error_message: reason,
      }), {
        status: 402,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("[charge-salon-tip]", e);
    return new Response(JSON.stringify({ error: (e as Error).message || "Unknown error" }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
