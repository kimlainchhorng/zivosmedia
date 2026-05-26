import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "../_shared/stripe.ts";
import { createClient } from "../_shared/deps.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (s: string, d?: any) => console.log(`[SUBSCRIBE-TO-TIER-INTENT] ${s}${d ? " " + JSON.stringify(d) : ""}`);

const INTERVAL_MAP: Record<string, { interval: "day" | "week" | "month" | "year"; count: number } | null> = {
  month: { interval: "month", count: 1 },
  "3_months": { interval: "month", count: 3 },
  "6_months": { interval: "month", count: 6 },
  year: { interval: "year", count: 1 },
  lifetime: null,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY missing");

    const auth = req.headers.get("Authorization");
    if (!auth) throw new Error("No authorization");
    const { data: u } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    const user = u.user;
    if (!user?.email) throw new Error("Not authenticated");

    const rl = await rateLimitDb(user.id, "payment");
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", ...rateLimitHeaders(rl, "payment") },
      });
    }

    const { tier_id, creator_id, amount_cents } = await req.json();
    if (!tier_id || !creator_id) throw new Error("tier_id and creator_id required");

    const sbAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: tier, error: tierErr } = await sbAdmin
      .from("subscription_tiers")
      .select("*")
      .eq("id", tier_id)
      .single();
    if (tierErr || !tier) throw new Error("Tier not found");
    if (!tier.is_active) throw new Error("Tier not active");
    if (tier.is_free) throw new Error("Free tier — no payment needed");

    const cents = Math.max(tier.is_custom_price ? (amount_cents ?? tier.price_cents) : tier.price_cents, 99);
    const intervalCfg = INTERVAL_MAP[tier.billing_interval || "month"];
    const isOneTime = intervalCfg === null;

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find or create Stripe customer for the subscriber
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = customers.data[0]?.id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    if (isOneTime) {
      // Lifetime / one-time: create a PaymentIntent
      const pi = await stripe.paymentIntents.create({
        amount: cents,
        currency: (tier.currency || "USD").toLowerCase(),
        customer: customerId,
        automatic_payment_methods: { enabled: true },
        metadata: { tier_id, creator_id, subscriber_id: user.id, kind: "lifetime_tier" },
      });
      log("PaymentIntent created", { id: pi.id, cents });
      return new Response(
        JSON.stringify({
          client_secret: pi.client_secret,
          payment_intent_id: pi.id,
          customer_id: customerId,
          mode: "payment",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // Recurring subscription with default_incomplete so we can confirm in-app
    const sub = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price_data: {
            currency: (tier.currency || "USD").toLowerCase(),
            unit_amount: cents,
            recurring: { interval: intervalCfg.interval, interval_count: intervalCfg.count },
            product_data: {
              name: tier.name,
              metadata: { tier_id, creator_id },
            },
          },
        },
      ],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: { tier_id, creator_id, subscriber_id: user.id },
      ...(tier.trial_days > 0 ? { trial_period_days: tier.trial_days } : {}),
    });

    const invoice: any = sub.latest_invoice;
    const pi: any = invoice?.payment_intent;
    const clientSecret = pi?.client_secret ?? null;

    log("Subscription created", { id: sub.id, status: sub.status, hasSecret: !!clientSecret });

    return new Response(
      JSON.stringify({
        client_secret: clientSecret,
        subscription_id: sub.id,
        customer_id: customerId,
        mode: "subscription",
        status: sub.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
