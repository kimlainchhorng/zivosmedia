import Stripe from "../_shared/stripe.ts";
import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${d}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const notSubscribed = () =>
    new Response(
      JSON.stringify({ subscribed: false, plan: null, subscription_end: null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("STRIPE_SECRET_KEY missing — returning not subscribed (graceful)");
      return notSubscribed();
    }


    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
    if (!authHeader) {
      return new Response(
        JSON.stringify({ subscribed: false, plan: null, subscription_end: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user?.email) {
      logStep("Auth failed, returning not subscribed", { error: userError?.message });
      return new Response(
        JSON.stringify({ subscribed: false, plan: null, subscription_end: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    // Admin override — full access for specific accounts
    const ADMIN_EMAILS = new Set(["chhorngkimlain1@gmail.com"]);
    if (ADMIN_EMAILS.has(user.email!.toLowerCase())) {
      logStep("Admin override — granting pro access");
      return new Response(
        JSON.stringify({
          subscribed: true,
          plan: "pro",
          subscription_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          subscription_id: "admin_override",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(
        JSON.stringify({ subscribed: false, plan: null, subscription_end: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    // ZIVO+ product IDs
    const PLUS_MONTHLY_PRODUCT = "prod_Twd0bbN76Y6chu";
    const PLUS_CHAT_PRODUCT = "prod_UGpAC1qAhDttlE";
    const PLUS_PRO_PRODUCT = "prod_UGpG91XdzsUk4s";
    const PLUS_ANNUAL_PRODUCT = "prod_Twd004sz9HeIVX";
    const PLUS_PRODUCTS = new Set([PLUS_MONTHLY_PRODUCT, PLUS_CHAT_PRODUCT, PLUS_PRO_PRODUCT, PLUS_ANNUAL_PRODUCT]);

    let plusSubscription = null;
    for (const sub of subscriptions.data) {
      const productId = sub.items.data[0]?.price?.product;
      if (typeof productId === "string" && PLUS_PRODUCTS.has(productId)) {
        plusSubscription = sub;
        break;
      }
    }

    if (!plusSubscription) {
      logStep("No active ZIVO+ subscription");
      return new Response(
        JSON.stringify({ subscribed: false, plan: null, subscription_end: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const productId = plusSubscription.items.data[0]?.price?.product;
    const plan = productId === PLUS_ANNUAL_PRODUCT ? "annual" : productId === PLUS_PRO_PRODUCT ? "pro" : productId === PLUS_CHAT_PRODUCT ? "chat" : "monthly";
    const periodEnd = (plusSubscription as any).current_period_end ?? (plusSubscription as any).items?.data?.[0]?.current_period_end;
    const subscriptionEnd = new Date(periodEnd * 1000).toISOString();

    logStep("Active ZIVO+ found", { plan, subscriptionEnd, subId: plusSubscription.id });

    return new Response(
      JSON.stringify({
        subscribed: true,
        plan,
        subscription_end: subscriptionEnd,
        subscription_id: plusSubscription.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR — returning not subscribed (graceful)", { message: msg });
    // Never 500 to the client — membership UI should degrade silently.
    return notSubscribed();
  }
});
