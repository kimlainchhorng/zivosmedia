import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import Stripe from "../_shared/stripe.ts";
import { notifyGroceryOrderConfirmed } from "../_shared/grocery-notifications.ts";

Deno.serve(withSecurity("confirm-grocery-payment", async (req, ctx) => {
  const cors = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  const { data: { user }, error: authErr } = await createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  ).auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { order_id, payment_intent_id } = await req.json();

    if (!order_id || !payment_intent_id) {
      return new Response(JSON.stringify({ error: "order_id and payment_intent_id are required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if ((paymentIntent.metadata?.order_id || "") !== order_id) {
      return new Response(JSON.stringify({ error: "Payment intent does not match order" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (!["succeeded", "processing", "requires_capture"].includes(paymentIntent.status)) {
      return new Response(JSON.stringify({ error: `Payment not completed (status: ${paymentIntent.status})` }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Verify caller owns this order
    const { data: orderRecord } = await admin
      .from("shopping_orders")
      .select("user_id")
      .eq("id", order_id)
      .maybeSingle();
    if (!orderRecord || orderRecord.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Order not found or access denied" }), {
        status: 403, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { error: updateError } = await admin
      .from("shopping_orders")
      .update({
        status: "pending",
        payment_status: "paid",
        payment_provider: "stripe",
        stripe_payment_intent_id: payment_intent_id,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", order_id);

    if (updateError) {
      console.error("[confirm-grocery-payment] Failed to update order:", updateError);
      throw new Error("Failed to finalize order");
    }

    console.log(`[confirm-grocery-payment] Order ${order_id} confirmed via PI ${payment_intent_id}`);

    // Customer confirmation email + SMS (idempotent — keyed on paid amount).
    try {
      await notifyGroceryOrderConfirmed(admin, order_id, "Card");
    } catch (e) {
      console.warn("[confirm-grocery-payment] confirmation email skipped", e);
    }

    return new Response(
      JSON.stringify({ ok: true, status: paymentIntent.status, order_id }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[confirm-grocery-payment] Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}, { rateLimit: "payment", strictCors: true, trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));
