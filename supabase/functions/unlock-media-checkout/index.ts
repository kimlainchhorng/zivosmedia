import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "../_shared/stripe.ts";
import { createClient } from "../_shared/deps.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[UNLOCK-MEDIA-CHECKOUT] ${step}${d}`);
};

serve(withSecurity("unlock-media-checkout", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
    if (!authHeader) throw new Error("Not authenticated");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("Not authenticated");
    logStep("User authenticated", { userId: user.id });

    const rl = await rateLimitDb(user.id, "payment");
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", ...rateLimitHeaders(rl, "payment") },
      });
    }

    const { message_id, seller_id, amount_cents } = await req.json();
    if (!message_id || !seller_id) throw new Error("Missing message_id or seller_id");

    const priceCents = typeof amount_cents === "number" && amount_cents >= 50 ? amount_cents : 99;
    logStep("Unlock request", { message_id, seller_id, priceCents });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { data: message } = await admin
      .from("direct_messages")
      .select("id, sender_id, receiver_id, locked_price_cents")
      .eq("id", message_id)
      .maybeSingle();
    if (!message) throw new Error("Message not found");
    if ((message as any).receiver_id !== user.id) throw new Error("Only the recipient can unlock this media");
    if ((message as any).sender_id !== seller_id) throw new Error("Seller does not match message");
    const lockedPrice = Number((message as any).locked_price_cents || 0);
    const finalPriceCents = lockedPrice >= 50 ? lockedPrice : priceCents;

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY missing");
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Check existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;
    logStep("Customer lookup", { customerId });

    const origin = req.headers.get("origin") || "https://myzivo.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Unlock Media",
              description: "Unlock locked photo or video",
            },
              unit_amount: finalPriceCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/chat?unlocked=${message_id}`,
      cancel_url: `${origin}/chat`,
      metadata: {
        message_id,
        buyer_id: user.id,
        seller_id,
        type: "media_unlock",
        amount_cents: String(finalPriceCents),
      },
    });
    logStep("Checkout session created", { sessionId: session.id });

    // Create pending unlock record
    const { error: insertErr } = await admin.from("media_unlocks").insert({
      message_id,
      buyer_id: user.id,
      seller_id,
      amount_cents: finalPriceCents,
      stripe_session_id: session.id,
      status: "pending",
    });
    if (insertErr) logStep("Insert warning", { error: insertErr.message });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}, { rateLimit: "payment", strictCors: true, trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));
