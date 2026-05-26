/**
 * create-tip-payment-intent — Creates a Stripe PaymentIntent for in-app tipping.
 */
import { createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { scanContentForLinks, logBlockedAttempt, isAbuseThresholdExceeded, isIpAbuseThresholdExceeded, getRequestIpHash } from "../_shared/contentLinkValidation.ts";
import { isLikelyMaliciousBot } from "../_shared/botDetection.ts";

Deno.serve(withSecurity("create-tip-payment-intent", async (req, ctx) => {
  const cors = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    if (isLikelyMaliciousBot(req.headers)) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const rl = await rateLimitDb(user.id, "payment");
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again shortly." }), {
        status: 429, headers: { ...cors, "Content-Type": "application/json", ...rateLimitHeaders(rl, "payment") },
      });
    }

    const { creator_id, amount_cents, message, is_anonymous } = await req.json();

    if (!creator_id || !amount_cents || amount_cents < 100) {
      return new Response(JSON.stringify({ error: "creator_id required, minimum tip $1.00" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    {
      const admin = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const ipHash = await getRequestIpHash(req);
      if (await isIpAbuseThresholdExceeded(admin, ipHash)) {
        return new Response(JSON.stringify({ error: "rate_limited", code: "ip_abuse_threshold_exceeded", message: "Too many recent blocked submissions from your network." }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
      }
      if (await isAbuseThresholdExceeded(admin, user.id)) {
        return new Response(JSON.stringify({ error: "rate_limited", code: "abuse_threshold_exceeded", message: "Too many recent blocked submissions. Try again in 24 hours." }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
      }
    }

    if (typeof message === "string") {
      const linkScan = scanContentForLinks(message);
      if (!linkScan.ok) {
        const admin = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        logBlockedAttempt(admin, { endpoint: "create-tip-payment-intent", userId: user.id, urls: linkScan.blocked, text: message, ip: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") });
        return new Response(JSON.stringify({ error: "blocked_link", code: "blocked_link", urls: linkScan.blocked }), { status: 422, headers: { ...cors, "Content-Type": "application/json" } });
      }
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find or create Stripe customer
    let customerId: string | undefined;
    if (user.email) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const c = await stripe.customers.create({
          email: user.email,
          metadata: { supabase_user_id: user.id },
        });
        customerId = c.id;
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: "usd",
      customer: customerId,
      metadata: {
        type: "creator_tip",
        tipper_id: user.id,
        creator_id,
        message: message || "",
        is_anonymous: String(!!is_anonymous),
      },
    });

    // Record pending tip
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await admin.from("creator_tips").insert({
      tipper_id: user.id,
      creator_id,
      amount_cents,
      message: message || null,
      is_anonymous: !!is_anonymous,
      currency: "USD",
      status: "pending",
      payment_intent_id: paymentIntent.id,
    } as any);

    console.log(`[create-tip-payment-intent] PI ${paymentIntent.id} for ${amount_cents}c`);

    return new Response(JSON.stringify({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[create-tip-payment-intent] Error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}, { rateLimit: "payment", strictCors: true }));
