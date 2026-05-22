import { createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { z } from "npm:zod@3.23.8";

const PACKAGES = {
  starter: { coins: 60, bonus: 0, price_cents: 99, label: "60 Z Coins" },
  basic: { coins: 300, bonus: 15, price_cents: 499, label: "300 Z Coins + 15 bonus" },
  popular: { coins: 1000, bonus: 80, price_cents: 1499, label: "1,000 Z Coins + 80 bonus" },
  premium: { coins: 5000, bonus: 500, price_cents: 6999, label: "5,000 Z Coins + 500 bonus" },
  vip: { coins: 10000, bonus: 1500, price_cents: 12999, label: "10,000 Z Coins + 1,500 bonus" },
  whale: { coins: 50000, bonus: 10000, price_cents: 49999, label: "50,000 Z Coins + 10,000 bonus" },
} as const;

const BodySchema = z.object({
  package_id: z.enum(["starter", "basic", "popular", "premium", "vip", "whale"]),
});

Deno.serve(withSecurity("create-coin-payment-intent", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user?.email) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const user = userData.user;

    const rl = await rateLimitDb(user.id, "payment");
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again shortly." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json", ...rateLimitHeaders(rl, "payment") },
        status: 429,
      });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const packageId = parsed.data.package_id;
    const pkg = PACKAGES[packageId];
    const totalCoins = pkg.coins + pkg.bonus;

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    if (!stripeKey) throw new Error("Stripe not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const existing = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = existing.data[0]?.id ?? (
      await stripe.customers.create({
        email: user.email,
        metadata: { zivo_user_id: user.id },
      })
    ).id;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: pkg.price_cents,
      currency: "usd",
      customer: customerId,
      payment_method_types: ["card"],
      setup_future_usage: "off_session",
      metadata: {
        user_id: user.id,
        package_id: packageId,
        coins: String(totalCoins),
      },
      description: `Z Coin top-up · ${pkg.label}`,
    });

    return new Response(JSON.stringify({
      ok: true,
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount_cents: pkg.price_cents,
      coins: totalCoins,
      customer_id: customerId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
}, { rateLimit: "payment", strictCors: true }));
