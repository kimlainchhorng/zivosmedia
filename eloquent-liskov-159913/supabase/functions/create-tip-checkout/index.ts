/**
 * create-tip-checkout — Creates a Stripe Checkout Session for tipping a creator.
 * On success, records tip in creator_tips with the payment_intent from the session.
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import Stripe from "../_shared/stripe.ts";
import { scanContentForLinks, logBlockedAttempt, isAbuseThresholdExceeded, isIpAbuseThresholdExceeded, getRequestIpHash } from "../_shared/contentLinkValidation.ts";
import { isLikelyMaliciousBot } from "../_shared/botDetection.ts";

Deno.serve(withSecurity("create-tip-checkout", async (req, ctx) => {
  const cors = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  try {
    if (isLikelyMaliciousBot(req.headers)) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { creator_id, amount_cents, message, is_anonymous } = await req.json();

    if (!creator_id || !amount_cents || amount_cents < 100) {
      return new Response(JSON.stringify({ error: "creator_id required and minimum tip is $1.00" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const ipHash = await getRequestIpHash(req);
    if (await isIpAbuseThresholdExceeded(admin, ipHash)) {
      return new Response(JSON.stringify({ error: "rate_limited", code: "ip_abuse_threshold_exceeded", message: "Too many recent blocked submissions from your network." }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (await isAbuseThresholdExceeded(admin, user.id)) {
      return new Response(JSON.stringify({ error: "rate_limited", code: "abuse_threshold_exceeded", message: "Too many recent blocked submissions. Try again in 24 hours." }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (typeof message === "string") {
      const linkScan = scanContentForLinks(message);
      if (!linkScan.ok) {
        logBlockedAttempt(admin, { endpoint: "create-tip-checkout", userId: user.id, urls: linkScan.blocked, text: message, ip: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") });
        return new Response(JSON.stringify({ error: "blocked_link", code: "blocked_link", urls: linkScan.blocked }), { status: 422, headers: { ...cors, "Content-Type": "application/json" } });
      }
    }

    if (creator_id === user.id) {
      return new Response(JSON.stringify({ error: "Cannot tip yourself" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Look up creator name for display
    const { data: creatorProfile } = await admin
      .from("profiles")
      .select("display_name, full_name")
      .eq("user_id", creator_id)
      .limit(1)
      .maybeSingle();

    const creatorName = creatorProfile?.display_name || creatorProfile?.full_name || "Creator";

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find or create Stripe customer
    let customerId: string | undefined;
    if (user.email) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const newCust = await stripe.customers.create({
          email: user.email,
          metadata: { supabase_user_id: user.id },
        });
        customerId = newCust.id;
      }
    }

    const origin = req.headers.get("origin") || "https://hizivo.com";

    // Create Checkout Session for one-time tip
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: amount_cents,
            product_data: {
              name: `Tip for ${creatorName}`,
              description: message ? `Message: ${message}` : `Tip to ${creatorName} on ZIVO`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "creator_tip",
        tipper_id: user.id,
        creator_id,
        amount_cents: String(amount_cents),
        message: message || "",
        is_anonymous: String(!!is_anonymous),
      },
      success_url: `${origin}/feed?tip=success`,
      cancel_url: `${origin}/feed?tip=cancelled`,
    });

    // Record pending tip in DB
    await admin.from("creator_tips").insert({
      tipper_id: user.id,
      creator_id,
      amount_cents,
      message: message || null,
      is_anonymous: !!is_anonymous,
      currency: "USD",
      status: "pending",
      payment_intent_id: session.payment_intent as string || session.id,
    } as any);

    console.log(`[create-tip-checkout] Session ${session.id} for ${amount_cents}c tip to ${creator_id}`);

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[create-tip-checkout] Error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}, { strictCors: true, rateLimit: "payment", trackNetwork: "suspicious" }));
