import { serve, createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

async function notify(
  supabaseAdmin: any,
  userId: string,
  type: string,
  message: string,
  entityId: string,
) {
  try {
    await supabaseAdmin.from("user_notifications").insert({
      user_id: userId,
      type,
      entity_id: entityId,
      entity_type: "coin_purchase",
      message,
      is_read: false,
    });
  } catch (e) {
    console.error("[verify-coin-purchase] notify failed", e);
  }
}

serve(withSecurity("verify-coin-purchase", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  try {
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Not authenticated");
    const user = userData.user;

    const rl = await rateLimitDb(user.id, "payment");
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", ...rateLimitHeaders(rl, "payment") },
      });
    }

    const body = await req.json().catch(() => ({}));
    const sessionId = String(body?.session_id || "");
    const paymentIntentId = String(body?.payment_intent_id || "");
    if (!sessionId && !paymentIntentId) throw new Error("Missing payment reference");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY missing");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let paymentStatus = "pending";
    let paymentRef = sessionId;
    let coins = 0;
    let packageId = "unknown";
    let amountCents = 0;
    let currency = "usd";
    let failureMessage = "";

    if (paymentIntentId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.metadata?.user_id !== user.id) {
        throw new Error("Payment does not belong to this user");
      }

      paymentStatus = paymentIntent.status;
      paymentRef = paymentIntent.id;
      coins = parseInt(paymentIntent.metadata?.coins || "0", 10);
      packageId = paymentIntent.metadata?.package_id || "unknown";
      amountCents = paymentIntent.amount_received || paymentIntent.amount || 0;
      currency = paymentIntent.currency ?? "usd";

      if (paymentIntent.status !== "succeeded") {
        failureMessage = paymentIntent.last_payment_error?.message ?? `Payment status: ${paymentIntent.status}`;
        await notify(
          supabaseAdmin,
          user.id,
          "coin_topup_failed",
          `Top-up failed: ${failureMessage}`,
          paymentIntent.id,
        );
        return new Response(JSON.stringify({ status: paymentIntent.status, credited: false, error: failureMessage }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    } else {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.metadata?.user_id !== user.id) {
        throw new Error("Session does not belong to this user");
      }

      paymentStatus = session.payment_status || "pending";
      paymentRef = session.id;
      coins = parseInt(session.metadata?.coins || "0", 10);
      packageId = session.metadata?.package_id || "unknown";
      amountCents = session.amount_total ?? 0;
      currency = session.currency ?? "usd";

      if (session.payment_status !== "paid") {
        return new Response(JSON.stringify({ status: session.payment_status, credited: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    if (!coins || coins <= 0) throw new Error("Invalid coin amount in payment");

    const { data: balance, error: rpcErr } = await supabaseAdmin.rpc("credit_coin_purchase", {
      _user_id: user.id,
      _session_id: paymentRef,
      _package_id: packageId,
      _coins: coins,
      _amount_cents: amountCents,
      _currency: currency,
    });

    if (rpcErr) throw new Error(rpcErr.message);

    await notify(
      supabaseAdmin,
      user.id,
      "coin_topup_success",
      `+${coins.toLocaleString()} Z Coins added to your wallet`,
      paymentRef,
    );

    return new Response(JSON.stringify({ status: paymentStatus, credited: true, coins, balance }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
}, { rateLimit: "payment", strictCors: true, trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));
