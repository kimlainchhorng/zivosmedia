import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "../_shared/stripe.ts";
import { createClient } from "../_shared/deps.ts";
import { withIdempotency } from "../_shared/idempotency.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { creatorMonetizationBlockedResponse, isCreatorMonetizationDisabled } from "../_shared/creatorMonetizationCompliance.ts";
import {
  adultCreatorPaymentBlockedResponse,
  isAdultCreatorAccount,
} from "../_shared/adultCreatorPaymentBoundary.ts";

const log = (s: string, d?: any) => console.log(`[SUBSCRIBE-TO-TIER] ${s}${d ? " " + JSON.stringify(d) : ""}`);

const INTERVAL_MAP: Record<string, { interval: "day" | "week" | "month" | "year"; count: number } | null> = {
  month: { interval: "month", count: 1 },
  "3_months": { interval: "month", count: 3 },
  "6_months": { interval: "month", count: 6 },
  year: { interval: "year", count: 1 },
  lifetime: null, // one-time payment
};

serve(withSecurity("subscribe-to-tier", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (isCreatorMonetizationDisabled()) return creatorMonetizationBlockedResponse(corsHeaders);

  const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");

  try {
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

    // Read from a clone: the idempotency wrapper hashes the request with
    // `await req.clone().text()`, and cloning a Request whose body is already
    // consumed is a spec-mandated TypeError ("unusable"). Reading `req`
    // directly here threw before the payout was ever claimed, and the outer
    // catch reported it as a flat failure.
    const { tier_id, creator_id, amount_cents } = await req.clone().json();
    if (!tier_id || !creator_id) throw new Error("tier_id and creator_id required");

    // Use service-role client to read tier securely
    const sbAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: tier, error: tierErr } = await sbAdmin
      .from("subscription_tiers")
      .select("*")
      .eq("id", tier_id)
      .single();
    if (tierErr || !tier) throw new Error("Tier not found");
    if (!tier.is_active) throw new Error("Tier not active");
    if (tier.creator_id !== creator_id) throw new Error("Tier does not belong to creator");

    // Adult-creator subscriptions do not settle on this Stripe account — see
    // _shared/adultCreatorPaymentBoundary.ts. A recurring charge is the worst
    // shape to get wrong: left unguarded it keeps billing restricted content on
    // the platform's account every month without anyone re-approving it.
    if (await isAdultCreatorAccount(sbAdmin, creator_id)) {
      return adultCreatorPaymentBlockedResponse(corsHeaders);
    }

    const result = await withIdempotency(req, "subscribe-to-tier", user.id, async () => {
      if (tier.is_free) {
        const { data: subscription, error: subErr } = await sbAdmin
          .from("creator_subscriptions")
          .upsert({
            creator_id,
            subscriber_id: user.id,
            tier_id,
            status: "active",
            price_cents: 0,
            payment_method: "free",
          }, { onConflict: "creator_id,subscriber_id" })
          .select("id")
          .single();
        if (subErr) throw subErr;

        return {
          status: 200,
          body: {
            ok: true,
            subscription_id: (subscription as any).id,
            status: "active",
            free: true,
          },
        };
      }

      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) throw new Error("STRIPE_SECRET_KEY missing");

      const cents = Math.max(tier.is_custom_price ? (amount_cents ?? tier.price_cents) : tier.price_cents, 99);
      log("Tier loaded", { tier_id, cents, interval: tier.billing_interval });

      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

      // Find or hint customer
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      const customerId = customers.data[0]?.id;

      const intervalCfg = INTERVAL_MAP[tier.billing_interval || "month"];
      const isOneTime = intervalCfg === null;

      const origin = req.headers.get("origin") || "https://zivosmedia.com";

      // Build per-tier discount via Stripe coupon (creator-set launch discount)
      const discounts: Array<{ coupon: string }> = [];
      const pct = Number(tier.discount_percent || 0);
      if (pct > 0) {
        const months = Number(tier.discount_months || 0);
        const couponParams: any = {
          percent_off: pct,
          name: `${tier.name} launch discount`,
        };
        if (isOneTime) {
          couponParams.duration = "once";
        } else if (months > 1) {
          couponParams.duration = "repeating";
          couponParams.duration_in_months = months;
        } else {
          couponParams.duration = "once";
        }
        const coupon = await stripe.coupons.create(couponParams);
        discounts.push({ coupon: coupon.id });
        log("Applied tier discount", { pct, months, couponId: coupon.id });
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        mode: isOneTime ? "payment" : "subscription",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: (tier.currency || "USD").toLowerCase(),
              unit_amount: cents,
              product_data: {
                name: tier.name,
                metadata: { tier_id, creator_id },
              },
              ...(isOneTime
                ? {}
                : { recurring: { interval: intervalCfg.interval, interval_count: intervalCfg.count } }),
            },
          },
        ],
        ...(!isOneTime && tier.trial_days > 0
          ? { subscription_data: { trial_period_days: tier.trial_days } }
          : {}),
        ...(discounts.length > 0
          ? { discounts }
          : { allow_promotion_codes: true }),
        metadata: { tier_id, creator_id, subscriber_id: user.id },
        success_url: `${origin}/u/${creator_id}?subscribed=true`,
        cancel_url: `${origin}/u/${creator_id}?canceled=true`,
      });

      log("Session created", { id: session.id });
      return { status: 200, body: { url: session.url } };
    });

    return new Response(JSON.stringify(result.body), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "X-Idempotency-Cache": result.cached ? "HIT" : "MISS",
      },
      status: result.status,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}, { allowedMethods: ["POST"], strictCors: true, rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));
