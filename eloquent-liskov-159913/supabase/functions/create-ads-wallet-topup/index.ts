// Stripe Checkout for Ads Studio wallet top-up. Returns checkout URL.
import { createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

Deno.serve(withSecurity("create-ads-wallet-topup", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const storeId = String(body?.store_id || "");
    const amountCents = Math.max(500, Math.min(1_000_000, Number(body?.amount_cents) || 0));
    const saveCard = !!body?.save_card;
    const requestedReturnUrl = String(body?.return_url || "/admin/stores");
    const returnUrl = requestedReturnUrl.startsWith("/") && !requestedReturnUrl.startsWith("//")
      ? requestedReturnUrl
      : "/admin/stores";
    if (!storeId || !amountCents) {
      return new Response(JSON.stringify({ error: "store_id and amount_cents required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY missing");
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" as any });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { data: wallet } = await admin
      .from("ads_studio_wallet")
      .select("stripe_customer_id")
      .eq("store_id", storeId)
      .maybeSingle();

    let customerId = wallet?.stripe_customer_id as string | null;
    if (!customerId) {
      const cust = await stripe.customers.create({
        email: userRes.user.email ?? undefined,
        metadata: { store_id: storeId, user_id: userRes.user.id },
      });
      customerId = cust.id;
      await admin.from("ads_studio_wallet").upsert(
        { store_id: storeId, stripe_customer_id: customerId, balance_cents: 0 },
        { onConflict: "store_id" }
      );
    }

    const origin = req.headers.get("origin") || "https://www.zivollc.com";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: `Ads Studio top-up ($${(amountCents / 100).toFixed(2)})` },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      payment_intent_data: saveCard ? { setup_future_usage: "off_session" } : undefined,
      metadata: { store_id: storeId, user_id: userRes.user.id, kind: "ads_wallet_topup", amount_cents: String(amountCents) },
      success_url: `${origin}${returnUrl}?topup=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${returnUrl}?topup=cancelled`,
    });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { rateLimit: "payment", strictCors: true, trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));
