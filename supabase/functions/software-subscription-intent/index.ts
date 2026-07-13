/**
 * software-subscription-intent — embedded, in-app checkout for a ZIVO Software
 * plan. The store owner stays inside the admin: we create an incomplete Stripe
 * subscription with a 14-day trial and return a client secret for the embedded
 * Payment Element. A trial collects the card via a SetupIntent (nothing charged
 * today); a no-trial plan returns the first invoice's PaymentIntent.
 *
 * Prices are resolved (and bootstrapped if missing) by a stable lookup_key
 * `software_<plan>_<cycle>`, so this works in whichever Stripe mode the
 * STRIPE_SECRET_KEY belongs to (test now, live later) without a manual catalog.
 */
import Stripe from "../_shared/stripe.ts";
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const log = (s: string, d?: unknown) =>
  console.log(`[SOFTWARE-SUBSCRIPTION-INTENT] ${s}${d ? " " + JSON.stringify(d) : ""}`);

const TRIAL_DAYS = 14;
const ANNUAL_DISCOUNT = 0.2; // keep in sync with src/lib/software/softwarePlans.ts

// Monthly list price per plan, in cents. Source of truth mirrors softwarePlans.ts.
const PLAN_MONTHLY_CENTS: Record<string, { name: string; cents: number }> = {
  base: { name: "Base", cents: 999 },
  gold: { name: "Gold", cents: 2999 },
  platinum: { name: "Platinum", cents: 5999 },
  pro: { name: "Pro", cents: 15999 },
};

function priceForCycle(planId: string, cycle: "monthly" | "annual") {
  const plan = PLAN_MONTHLY_CENTS[planId];
  if (!plan) return null;
  if (cycle === "annual") {
    // Total charged once per year: monthly * 12, discounted.
    return { unitAmount: Math.round(plan.cents * 12 * (1 - ANNUAL_DISCOUNT)), interval: "year" as const, name: plan.name };
  }
  return { unitAmount: plan.cents, interval: "month" as const, name: plan.name };
}

/** Resolve the Stripe price for a plan+cycle, creating product/price on first use. */
async function ensurePriceId(stripe: Stripe, planId: string, cycle: "monthly" | "annual"): Promise<string> {
  const cfg = priceForCycle(planId, cycle);
  if (!cfg) throw new Error(`Unknown plan: ${planId}`);
  const lookupKey = `software_${planId}_${cycle}`;

  const existing = await stripe.prices.search({
    query: `lookup_key:'${lookupKey}' AND active:'true'`,
    limit: 1,
  });
  if (existing.data[0]) return existing.data[0].id;

  // Find or create the plan's product (one product per plan, two prices).
  const products = await stripe.products.search({
    query: `metadata['zivo_software_plan']:'${planId}' AND active:'true'`,
    limit: 1,
  });
  const productId = products.data[0]?.id ??
    (await stripe.products.create({
      name: `ZIVO ${cfg.name}`,
      metadata: { zivo_software_plan: planId, source: "zivo_software" },
    })).id;

  const price = await stripe.prices.create({
    product: productId,
    currency: "usd",
    unit_amount: cfg.unitAmount,
    recurring: { interval: cfg.interval },
    lookup_key: lookupKey,
    transfer_lookup_key: true,
    metadata: { zivo_software_plan: planId, billing_cycle: cycle },
  });
  log("Created price", { lookupKey, priceId: price.id, unitAmount: cfg.unitAmount });
  return price.id;
}

serve(withSecurity("software-subscription-intent", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
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

    const body = await req.json();
    const planId = String(body.plan_id ?? "").trim().toLowerCase();
    const cycle = body.cycle === "annual" ? "annual" : "monthly";
    const storeId = String(body.store_id ?? "").trim();
    if (!PLAN_MONTHLY_CENTS[planId]) throw new Error("unknown_plan");
    if (!storeId) throw new Error("store_id is required");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const priceId = await ensurePriceId(stripe, planId, cycle);

    // Find or create the Stripe customer for this owner.
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id ??
      (await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id, store_id: storeId },
      })).id;

    const metadata = {
      zivosmedia_user_id: user.id,
      store_id: storeId,
      plan_id: planId,
      billing_cycle: cycle,
      source: "zivo_software_admin",
    };

    // Hosted Checkout fallback — when the app has no Stripe *publishable* key the
    // embedded Payment Element can't mount, so we hand off to Stripe's own hosted
    // page (needs only this backend's secret key) and return after. No card is
    // collected until the owner completes the page, so nothing is created here.
    if (body.flow === "hosted") {
      const origin = req.headers.get("origin") || "https://www.zivosmedia.com";
      const rawReturn = String(body.return_url || "/admin/stores");
      const safeReturn = rawReturn.startsWith("/") && !rawReturn.startsWith("//") ? rawReturn : "/admin/stores";
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: { trial_period_days: TRIAL_DAYS, metadata },
        success_url: `${origin}${safeReturn}?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}${safeReturn}?subscription=cancelled`,
        allow_promotion_codes: true,
        metadata,
      });
      log("Checkout session created", { id: session.id });
      return new Response(
        JSON.stringify({ url: session.url, session_id: session.id, mode: "hosted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    const sub = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: TRIAL_DAYS,
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
      expand: ["pending_setup_intent", "latest_invoice.payment_intent"],
      metadata,
    });

    const setupSecret = (sub.pending_setup_intent as any)?.client_secret ?? null;
    const invoice = sub.latest_invoice as any;
    const paySecret = (invoice?.payment_intent as any)?.client_secret ?? null;
    const clientSecret = setupSecret ?? paySecret;
    const mode = setupSecret ? "setup" : "payment";

    if (!clientSecret) throw new Error("Stripe did not return a client secret");

    log("Subscription created", { id: sub.id, status: sub.status, mode });

    return new Response(
      JSON.stringify({
        client_secret: clientSecret,
        subscription_id: sub.id,
        customer_id: customerId,
        mode,
        status: sub.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
}, { allowedMethods: ["POST"], strictCors: true, rateLimit: "payment", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));
