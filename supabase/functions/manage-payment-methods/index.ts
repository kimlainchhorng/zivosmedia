// Manage Payment Methods - Stripe real card management
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

Deno.serve(withSecurity("manage-payment-methods", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  console.log("[manage-payment-methods] Request received:", req.method);
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    console.log("[manage-payment-methods] Auth header present:", !!authHeader, "starts with Bearer:", authHeader.startsWith("Bearer "));
    
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    console.log("[manage-payment-methods] Getting user...");
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("[manage-payment-methods] Auth error:", userError?.message || "No user");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email!;
    console.log("[manage-payment-methods] User authenticated:", userId, userEmail);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("[manage-payment-methods] STRIPE_SECRET_KEY not set");
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("[manage-payment-methods] Stripe key found, length:", stripeKey.length);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find or create Stripe customer
    console.log("[manage-payment-methods] Looking up Stripe customer");
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("[manage-payment-methods] Found existing customer:", customerId);
    } else {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { zivo_user_id: userId },
      });
      customerId = customer.id;
      console.log("[manage-payment-methods] Created new customer:", customerId);
    }

    let body;
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const { action, payment_method_id } = body;
    console.log("[manage-payment-methods] Action:", action, "PM ID:", payment_method_id);

    // LIST saved payment methods
    if (action === "list") {
      const methods = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
      });

      const defaultPm = customers.data[0]?.invoice_settings?.default_payment_method;
      const cards = methods.data.map((pm: any) => ({
        id: pm.id,
        brand: pm.card?.brand ?? "unknown",
        last4: pm.card?.last4 ?? "****",
        exp_month: pm.card?.exp_month,
        exp_year: pm.card?.exp_year,
        is_default: pm.id === defaultPm,
      }));

      console.log("[manage-payment-methods] Returning", cards.length, "cards");
      return new Response(JSON.stringify({ ok: true, cards, customer_id: customerId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CREATE SetupIntent (for adding a new card)
    if (action === "create_setup_intent") {
      console.log("[manage-payment-methods] Creating SetupIntent for customer:", customerId);
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"],
        metadata: { zivo_user_id: userId },
      });

      console.log("[manage-payment-methods] SetupIntent created:", setupIntent.id);
      return new Response(JSON.stringify({
        ok: true,
        client_secret: setupIntent.client_secret,
        customer_id: customerId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE a saved payment method
    if (action === "delete" && payment_method_id) {
      await stripe.paymentMethods.detach(payment_method_id);
      console.log("[manage-payment-methods] Detached PM:", payment_method_id);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SET DEFAULT payment method
    if (action === "set_default" && payment_method_id) {
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: payment_method_id },
      });
      console.log("[manage-payment-methods] Set default PM:", payment_method_id);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[manage-payment-methods] Error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { strictCors: true, rateLimit: "payment", trackNetwork: "suspicious" }));
