// Verify a Stripe payment and write the creator_subscriptions row.
//
// After 20260528000010_close_subscriber_paywall_bypass, the cs_ins RLS policy
// only accepts free-tier inserts from the client. Paid-tier rows must be
// written by service_role *after* Stripe confirms payment — otherwise a
// malicious client could insert a forged "active" row and short-circuit any
// downstream "free for subscribers" logic.
//
// Body: { mode: "payment" | "subscription", tier_id, creator_id,
//         payment_intent_id?: string, subscription_id?: string }
//
// Verification per mode:
//   • mode="payment" (lifetime tier): retrieve the PaymentIntent and require
//     status="succeeded". Metadata.subscriber_id must match the caller's UID
//     so a client can't pass another user's PaymentIntent.
//   • mode="subscription" (recurring): retrieve the Subscription and require
//     status in {active, trialing}. Same metadata.subscriber_id check.
//
// On success, insert (or upsert by stripe_subscription_id) into
// creator_subscriptions via service_role.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "../_shared/stripe.ts";
import { createClient } from "../_shared/deps.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (s: string, d?: any) =>
  console.log(`[CONFIRM-TIER-SUBSCRIPTION] ${s}${d ? " " + JSON.stringify(d) : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY missing");

    const auth = req.headers.get("Authorization");
    if (!auth) throw new Error("No authorization");
    const { data: u } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    const user = u.user;
    if (!user) throw new Error("Not authenticated");

    const rl = await rateLimitDb(user.id, "payment");
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again shortly." }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            ...rateLimitHeaders(rl, "payment"),
          },
        },
      );
    }

    const { mode, tier_id, creator_id, payment_intent_id, subscription_id } =
      await req.json();
    if (!tier_id || !creator_id) throw new Error("tier_id and creator_id required");
    if (mode !== "payment" && mode !== "subscription") {
      throw new Error("mode must be 'payment' or 'subscription'");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let stripeSubscriptionId: string | null = null;

    if (mode === "subscription") {
      if (!subscription_id) throw new Error("subscription_id required for mode=subscription");
      const sub = await stripe.subscriptions.retrieve(subscription_id);
      // Trust Stripe's view of payment status — never the client's claim.
      if (sub.status !== "active" && sub.status !== "trialing") {
        throw new Error(`subscription status not active (got: ${sub.status})`);
      }
      // Defense in depth: the Stripe object's metadata was set by the
      // create-intent call and proves the subscription belongs to this user.
      if (sub.metadata?.subscriber_id !== user.id) {
        throw new Error("subscription does not belong to caller");
      }
      if (sub.metadata?.tier_id !== tier_id || sub.metadata?.creator_id !== creator_id) {
        throw new Error("subscription metadata does not match request");
      }
      stripeSubscriptionId = subscription_id;
    } else {
      if (!payment_intent_id) throw new Error("payment_intent_id required for mode=payment");
      const pi = await stripe.paymentIntents.retrieve(payment_intent_id);
      if (pi.status !== "succeeded") {
        throw new Error(`payment status not succeeded (got: ${pi.status})`);
      }
      if (pi.metadata?.subscriber_id !== user.id) {
        throw new Error("payment does not belong to caller");
      }
      if (pi.metadata?.tier_id !== tier_id || pi.metadata?.creator_id !== creator_id) {
        throw new Error("payment metadata does not match request");
      }
    }

    // Insert the row via service_role (bypasses the locked-down cs_ins policy).
    const sbAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: tier, error: tierErr } = await sbAdmin
      .from("subscription_tiers")
      .select("price_cents,name")
      .eq("id", tier_id)
      .single();
    if (tierErr || !tier) throw new Error("Tier not found");

    const { error: insertErr } = await sbAdmin.from("creator_subscriptions").insert({
      creator_id,
      subscriber_id: user.id,
      tier_id,
      status: "active",
      price_cents: tier.price_cents,
      stripe_subscription_id: stripeSubscriptionId,
    });
    if (insertErr) {
      // 23505 = unique_violation → already recorded (e.g. webhook beat us).
      // Treat as success so the client doesn't show a misleading error.
      if ((insertErr as any).code !== "23505") throw insertErr;
      log("subscription already recorded (unique_violation)", { user: user.id, tier_id });
    }

    log("subscription recorded", { user: user.id, tier_id, mode });
    return new Response(JSON.stringify({ recorded: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
