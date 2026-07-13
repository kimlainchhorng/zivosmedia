// Returns the signed-in owner's current ZIVO Software subscription for a store,
// read live from Stripe (the account this app bills on). Used by the
// Subscriptions tab to show the active plan, status, and renewal date. No DB
// table needed — we look it up by the owner's Stripe customer + store metadata.
import { createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

// Stripe statuses we treat as "this is their plan" (most recent wins).
const LIVE_STATUSES = new Set(["trialing", "active", "past_due", "unpaid"]);

Deno.serve(withSecurity("software-subscription-status", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: u } = await sb.auth.getUser();
    const user = u?.user;
    if (!user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }

    const body = await req.json().catch(() => ({}));
    const storeId = String(body?.store_id || "");
    if (!storeId) {
      return new Response(JSON.stringify({ error: "store_id is required" }), { status: 400, headers: jsonHeaders });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      // No billing connected yet — report "no subscription" rather than erroring.
      return new Response(JSON.stringify({ subscription: null }), { headers: jsonHeaders });
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" as any });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customer = customers.data[0];
    if (!customer) {
      return new Response(JSON.stringify({ subscription: null }), { headers: jsonHeaders });
    }

    const subs = await stripe.subscriptions.list({ customer: customer.id, status: "all", limit: 20 });
    // Pick this store's software subscription, preferring a live one, newest first.
    const candidates = subs.data
      .filter((s: any) => (s.metadata?.store_id === storeId) && (s.metadata?.source === "zivo_software_admin"))
      .sort((a: any, b: any) => (b.created ?? 0) - (a.created ?? 0));
    const sub = candidates.find((s: any) => LIVE_STATUSES.has(s.status)) ?? candidates[0] ?? null;

    if (!sub) {
      return new Response(JSON.stringify({ subscription: null }), { headers: jsonHeaders });
    }

    const item = (sub as any).items?.data?.[0];
    const iso = (unix: number | null | undefined) => (unix ? new Date(unix * 1000).toISOString() : null);

    return new Response(
      JSON.stringify({
        subscription: {
          plan: (sub as any).metadata?.plan_id ?? null,
          cycle: (sub as any).metadata?.billing_cycle ?? (item?.price?.recurring?.interval === "year" ? "annual" : "monthly"),
          status: (sub as any).status,
          current_period_end: iso((sub as any).current_period_end),
          trial_end: iso((sub as any).trial_end),
          cancel_at_period_end: !!(sub as any).cancel_at_period_end,
          amount_cents: item?.price?.unit_amount ?? null,
          interval: item?.price?.recurring?.interval ?? null,
        },
      }),
      { headers: jsonHeaders },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message, subscription: null }), {
      status: 200,
      headers: jsonHeaders,
    });
  }
}, { rateLimit: "api_general", strictCors: true, allowedMethods: ["POST"] }));
