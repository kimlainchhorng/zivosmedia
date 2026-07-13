/**
 * create-bus-payment-intent
 *
 * Authorize-only (manual capture) Stripe PaymentIntent for a bus booking.
 * The booking row is created first via the create_bus_booking RPC
 * (status='hold'); this function attaches the PaymentIntent and flips
 * payment_status to 'authorized'. Amount is read authoritatively from the DB.
 *
 * Requires env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
 * STRIPE_SECRET_KEY.
 *
 * NOTE: not yet deployed — the Supabase project is at its plan's edge-function
 * cap. Deploy once a slot is freed / the plan is upgraded.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.106.0";
import Stripe from "npm:stripe@18.5.0";
import { withSecurity } from "../_shared/withSecurity.ts";

Deno.serve(withSecurity("create-bus-payment-intent", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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
    const userEmail = userData.user.email;
    if (!userEmail) return json({ error: "Account email required for payment" }, 400);

    const { booking_id, payment_method_id } = await req.json();
    if (!booking_id) return json({ error: "booking_id required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: booking, error: bErr } = await admin
      .from("bus_bookings")
      .select("id, customer_id, amount_cents, currency, status, payment_status, booking_ref, stripe_payment_intent_id")
      .eq("id", booking_id)
      .maybeSingle();

    if (bErr || !booking) return json({ error: "Booking not found" }, 404);
    if (booking.customer_id !== userId) return json({ error: "Forbidden" }, 403);
    if (booking.status !== "hold") return json({ error: "Booking is not awaiting payment" }, 409);
    if (booking.payment_status === "captured" || booking.payment_status === "authorized") {
      return json({ error: "Payment already in progress for this booking" }, 409);
    }

    const amountCents = booking.amount_cents;
    if (!amountCents || amountCents < 50) return json({ error: "Amount too low (min 50 cents)" }, 400);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "Stripe not configured" }, 500);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    const customerId = customers.data.length > 0
      ? customers.data[0].id
      : (await stripe.customers.create({ email: userEmail, metadata: { zivo_user_id: userId } })).id;

    const piParams: Record<string, unknown> = {
      amount: amountCents,
      currency: (booking.currency || "usd").toLowerCase(),
      customer: customerId,
      capture_method: "manual",
      metadata: { zivo_user_id: userId, bus_booking_id: booking.id, booking_ref: booking.booking_ref ?? "" },
      description: `ZIVO Bus booking ${booking.booking_ref ?? booking.id}`,
    };
    if (payment_method_id) {
      piParams.payment_method = payment_method_id;
      piParams.confirm = true;
      piParams.off_session = true;
    } else {
      piParams.payment_method_types = ["card"];
    }

    const paymentIntent = await stripe.paymentIntents.create(piParams as Stripe.PaymentIntentCreateParams);

    const paymentStatus = paymentIntent.status === "requires_capture" ? "authorized" : "pending";
    await admin.from("bus_bookings")
      .update({ stripe_payment_intent_id: paymentIntent.id, payment_status: paymentStatus })
      .eq("id", booking.id).eq("customer_id", userId);

    return json({
      ok: true,
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      customer_id: customerId,
      amount_cents: amountCents,
      currency: booking.currency || "usd",
      status: paymentIntent.status,
      auto_confirmed: !!payment_method_id,
    });
  } catch (e) {
    console.error("[bus-payment] Error:", e);
    return json({ error: String(e) }, 500);
  }
}, { rateLimit: "payment", strictCors: true, allowedMethods: ["POST"], trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));
