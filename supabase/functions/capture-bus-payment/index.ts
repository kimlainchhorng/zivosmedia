/**
 * capture-bus-payment
 *
 * Operator-side capture for a bus booking. When the operator confirms a held
 * booking, this captures the authorize-only (manual capture) Stripe
 * PaymentIntent created by create-bus-payment-intent, then flips the booking to
 * status='confirmed' / payment_status='captured'. Amount is read authoritatively
 * from the DB. Only the owner of the booking's store may capture.
 *
 * Bookings with no PaymentIntent (cash / payment not enabled) are simply
 * confirmed — so the operator's "Confirm" works whether or not card payment is
 * live.
 *
 * Self-contained (npm: specifiers + inline auth/CORS) so it deploys without
 * pulling the _shared bundle. Requires env: SUPABASE_URL, SUPABASE_ANON_KEY,
 * SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.106.0";
import Stripe from "npm:stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const { booking_id } = await req.json();
    if (!booking_id) return json({ error: "booking_id required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: booking, error: bErr } = await admin
      .from("bus_bookings")
      .select("id, store_id, customer_id, amount_cents, currency, status, payment_status, booking_ref, stripe_payment_intent_id")
      .eq("id", booking_id)
      .maybeSingle();

    if (bErr || !booking) return json({ error: "Booking not found" }, 404);

    // Only the owner of the booking's store may capture/confirm.
    const { data: store } = await admin
      .from("store_profiles")
      .select("id")
      .eq("id", booking.store_id)
      .eq("owner_id", userId)
      .maybeSingle();
    if (!store) return json({ error: "Forbidden" }, 403);

    if (booking.status === "cancelled") return json({ error: "Booking is cancelled" }, 409);
    if (booking.status === "confirmed" && booking.payment_status === "captured") {
      return json({ ok: true, idempotent: true, captured: true, status: "confirmed" });
    }

    const paymentIntentId = booking.stripe_payment_intent_id;

    // No card authorization on file (cash / payment not enabled) → just confirm.
    if (!paymentIntentId) {
      const { error: uErr } = await admin
        .from("bus_bookings")
        .update({ status: "confirmed" })
        .eq("id", booking.id);
      if (uErr) return json({ error: "Could not confirm booking" }, 500);
      return json({ ok: true, captured: false, status: "confirmed" });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "Stripe not configured" }, 500);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let captured;
    try {
      captured = await stripe.paymentIntents.capture(paymentIntentId);
    } catch (e) {
      // Already captured out-of-band → reconcile instead of failing.
      if (String((e as { code?: string })?.code || "") !== "payment_intent_unexpected_state") throw e;
      captured = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (captured.status !== "succeeded") throw e;
    }

    const capturedCents = Number(captured.amount_received || captured.amount || booking.amount_cents);
    const { error: uErr } = await admin
      .from("bus_bookings")
      .update({ status: "confirmed", payment_status: "captured" })
      .eq("id", booking.id);
    if (uErr) return json({ error: "Payment captured but booking update failed" }, 500);

    return json({
      ok: true,
      captured: true,
      amount_captured: capturedCents,
      currency: booking.currency || "usd",
      status: "confirmed",
    });
  } catch (e) {
    console.error("[capture-bus-payment] Error:", e);
    return json({ error: String(e) }, 500);
  }
});
