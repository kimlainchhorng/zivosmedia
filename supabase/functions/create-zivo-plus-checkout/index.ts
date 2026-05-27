import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "../_shared/stripe.ts";
import { createClient } from "../_shared/deps.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-ZIVO-PLUS-CHECKOUT] ${step}${d}`);
};

// Price IDs
const PRICES: Record<string, string> = {
  monthly: "price_1SyjkMBxRnIs4yDmaW20lkln",
  chat: "price_1TIHWdBxRnIs4yDmTfsdqdod",
  pro: "price_1TIHbdBxRnIs4yDmQKf80Sm7",
  annual: "price_1SyjkSBxRnIs4yDmSFHyzxLL",
};

const GIFT_PREMIUM_DURATIONS: Record<string, { label: string; months: number; amountCents: number }> = {
  "three-months": { label: "3 months", months: 3, amountCents: 1199 },
  "six-months": { label: "6 months", months: 6, amountCents: 1599 },
  "one-year": { label: "1 year", months: 12, amountCents: 2899 },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const billingCycleFor = (plan: string) => plan === "annual" ? "yearly" : "monthly";

serve(withSecurity("create-zivo-plus-checkout", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id });

    const rl = await rateLimitDb(user.id, "payment");
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", ...rateLimitHeaders(rl, "payment") },
      });
    }

    const {
      plan,
      gift_recipient_id,
      gift_recipient_name,
      gift_duration,
    } = await req.json();
    const priceId = PRICES[plan];
    if (!priceId) throw new Error(`Invalid plan: ${plan}. Use 'monthly' or 'annual'`);
    logStep("Plan selected", { plan, priceId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const { data: planRow, error: planError } = await supabaseClient
      .from("zivo_subscription_plans")
      .select("id")
      .eq("slug", "zivo-plus")
      .eq("is_active", true)
      .maybeSingle();

    if (planError) throw planError;
    if (!planRow?.id) throw new Error("ZIVO+ plan is not configured");

    const hasGiftRecipient = typeof gift_recipient_id === "string" && gift_recipient_id.length > 0;
    if (hasGiftRecipient && !UUID_RE.test(gift_recipient_id)) {
      throw new Error("Invalid gift recipient");
    }
    const isGiftCheckout = hasGiftRecipient && gift_recipient_id !== user.id;

    // Find or reference existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;

      // Check if already subscribed
      const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 10,
      });
      const alreadyPlus = subs.data.some((s) => {
        const prod = s.items.data[0]?.price?.product;
        return prod === "prod_Twd0bbN76Y6chu" || prod === "prod_UGpAC1qAhDttlE" || prod === "prod_UGpG91XdzsUk4s" || prod === "prod_Twd004sz9HeIVX";
      });
      if (alreadyPlus && !isGiftCheckout) {
        throw new Error("You already have an active ZIVO+ subscription");
      }
    }
    logStep("Customer lookup done", { customerId });

    const origin = req.headers.get("origin") || "https://myzivo.lovable.app";

    if (isGiftCheckout) {
      const giftDuration = GIFT_PREMIUM_DURATIONS[String(gift_duration)] ?? GIFT_PREMIUM_DURATIONS["three-months"];
      const successParams = new URLSearchParams({ with: gift_recipient_id, gift: "success" });
      const cancelParams = new URLSearchParams({ with: gift_recipient_id, gift: "canceled" });
      const giftMetadata: Record<string, string> = {
        type: "zivo_plus_gift",
        user_id: gift_recipient_id,
        plan,
        plan_id: planRow.id,
        billing_cycle: giftDuration.months >= 12 ? "yearly" : "monthly",
        gift_duration: String(gift_duration || "three-months"),
        gift_duration_label: giftDuration.label,
        gift_months: String(giftDuration.months),
        gift_recipient_id,
        gift_recipient_name: String(gift_recipient_name || "").slice(0, 120),
        gift_sender_id: user.id,
        gift_sender_email: user.email,
      };

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: giftDuration.amountCents,
              product_data: {
                name: `ZIVO Premium Gift - ${giftDuration.label}`,
                description: `Gift ${giftDuration.label} of ZIVO Premium`,
              },
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${origin}/chat?${successParams.toString()}`,
        cancel_url: `${origin}/chat?${cancelParams.toString()}`,
        metadata: giftMetadata,
        payment_intent_data: { metadata: giftMetadata },
        allow_promotion_codes: true,
      });

      logStep("Gift checkout session created", { sessionId: session.id, recipientId: gift_recipient_id });

      return new Response(
        JSON.stringify({ url: session.url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const checkoutMetadata: Record<string, string> = {
      type: "membership",
      user_id: user.id,
      plan_id: planRow.id,
      plan,
      billing_cycle: billingCycleFor(plan),
    };

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/zivo-plus?success=true`,
      cancel_url: `${origin}/zivo-plus?canceled=true`,
      metadata: checkoutMetadata,
      subscription_data: { metadata: checkoutMetadata },
      allow_promotion_codes: true,
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
}, { strictCors: true, rateLimit: "payment", trackNetwork: "suspicious" }));
