import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

Deno.serve(withSecurity("capture-ride-payment", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const admin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    const rl = await rateLimitDb(userId, "payment");
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", ...rateLimitHeaders(rl, "payment") },
      });
    }

    const { ride_request_id, final_amount_cents } = await req.json();

    if (!ride_request_id) {
      return new Response(JSON.stringify({ error: "ride_request_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get ride request to find payment intent
    const { data: ride, error: rideError } = await admin
      .from("ride_requests")
      .select("payment_intent_id, stripe_payment_intent_id, user_id, quoted_total, status, payment_status, payment_currency, bakong_reference, captured_amount_cents")
      .eq("id", ride_request_id)
      .single();

    if (rideError || !ride) {
      return new Response(JSON.stringify({ error: "Ride not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (ride.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (["cancelled", "canceled"].includes(String(ride.status || "").toLowerCase())) {
      return new Response(JSON.stringify({ error: "Cannot capture a cancelled ride" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (String(ride.payment_currency || "").toUpperCase() === "KHR" || ride.bakong_reference) {
      return new Response(JSON.stringify({ error: "Bakong rides are verified through KHQR, not Stripe capture" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentIntentId = ride.payment_intent_id || ride.stripe_payment_intent_id;
    if (!paymentIntentId) {
      return new Response(JSON.stringify({ error: "No payment intent found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (ride.payment_status === "captured" && Number(ride.captured_amount_cents || 0) > 0) {
      return new Response(JSON.stringify({
        ok: true,
        idempotent: true,
        amount_captured: ride.captured_amount_cents,
        status: "captured",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Capture with optional adjusted amount
    const captureParams: Record<string, unknown> = {};
    if (final_amount_cents && final_amount_cents > 0) {
      captureParams.amount_to_capture = final_amount_cents;
    }

    let captured;
    try {
      captured = await stripe.paymentIntents.capture(
        paymentIntentId,
        captureParams
      );
    } catch (e: any) {
      if (String(e?.code || "") !== "payment_intent_unexpected_state") throw e;
      captured = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (captured.status !== "succeeded") throw e;
    }

    // Update ride request payment status
    const capturedCents = Number(captured.amount_received || captured.amount || 0);
    const { error: updateError } = await admin
      .from("ride_requests")
      .update({ payment_status: "captured", captured_amount_cents: capturedCents })
      .eq("id", ride_request_id);
    if (updateError) {
      console.error("[capture-ride] DB update failed:", updateError);
      return new Response(JSON.stringify({ error: "Payment captured but ride update failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[capture-ride] Captured PI ${paymentIntentId} for ride ${ride_request_id} ($${(capturedCents / 100).toFixed(2)})`);

    return new Response(JSON.stringify({
      ok: true,
      amount_captured: capturedCents,
      status: captured.status,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[capture-ride] Error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { strictCors: true, rateLimit: "payment", trackNetwork: "suspicious" }));
