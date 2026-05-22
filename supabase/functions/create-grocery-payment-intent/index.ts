import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import Stripe from "../_shared/stripe.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";

Deno.serve(withSecurity("create-grocery-payment-intent", async (req, ctx) => {
  const cors = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("authorization") ?? "";
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

    const rl = await rateLimitDb(user.id, "payment");
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again shortly." }), {
        status: 429,
        headers: { ...cors, "Content-Type": "application/json", ...rateLimitHeaders(rl, "payment") },
      });
    }

    const {
      items,
      delivery_address,
      customer_name,
      customer_phone,
      tip,
      store,
      payment_method_id,
      priority_fee,
      promo_discount,
    } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "No items provided" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (!delivery_address || !customer_name) {
      return new Response(JSON.stringify({ error: "Delivery address and name required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const DELIVERY_BASE = 299; // cents
    const DELIVERY_PER_MILE = 60; // cents
    const DELIVERY_PER_MIN = 10; // cents
    const DELIVERY_MIN = 399; // cents
    const DELIVERY_MAX = 1499; // cents
    const SERVICE_FEE_PCT = 5; // percentage
    const SERVICE_FEE_MIN = 250; // cents
    const SERVICE_FEE_MAX = 1000; // cents

    const estMiles = 3;
    const estMinutes = 30;
    const rawDelivery = DELIVERY_BASE + estMiles * DELIVERY_PER_MILE + estMinutes * DELIVERY_PER_MIN;
    const deliveryFeeCents = Math.min(DELIVERY_MAX, Math.max(DELIVERY_MIN, rawDelivery));

    const subtotalCents = items.reduce((sum: number, item: any) => {
      const priceCents = Math.round(Number(item?.price || 0) * 100);
      const quantity = Number(item?.quantity || 0);
      if (!Number.isFinite(priceCents) || !Number.isFinite(quantity) || quantity <= 0 || priceCents < 0) {
        return sum;
      }
      return sum + priceCents * quantity;
    }, 0);

    if (subtotalCents <= 0) {
      return new Response(JSON.stringify({ error: "Invalid item pricing" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const rawServiceFee = Math.round(subtotalCents * SERVICE_FEE_PCT / 100);
    const serviceFeeCents = Math.min(SERVICE_FEE_MAX, Math.max(SERVICE_FEE_MIN, rawServiceFee));

    const tipCents = Math.max(0, Math.round(Number(tip || 0) * 100));
    const priorityFeeCents = Math.max(0, Math.round(Number(priority_fee || 0) * 100));

    const totalBeforeDiscount = subtotalCents + deliveryFeeCents + serviceFeeCents + tipCents + priorityFeeCents;

    const requestedPromoCents = Math.max(0, Math.round(Number(promo_discount || 0) * 100));
    const promoCap = Math.max(0, totalBeforeDiscount - 50);
    const promoDiscountCents = Math.min(requestedPromoCents, promoCap);

    const totalCents = Math.max(50, totalBeforeDiscount - promoDiscountCents);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: order, error: orderErr } = await admin
      .from("shopping_orders")
      .insert({
        user_id: user?.id || null,
        store: store || "Unknown",
        order_type: "shopping_delivery",
        status: "pending_payment",
        items,
        total_amount: subtotalCents / 100,
        delivery_fee: deliveryFeeCents / 100,
        delivery_address,
        customer_name,
        customer_phone: customer_phone || null,
        customer_email: user?.email || null,
        placed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (orderErr || !order) {
      console.error("[create-grocery-payment-intent] DB error:", orderErr);
      throw new Error("Failed to create order");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let customerId: string | undefined;
    if (user?.email) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { zivo_user_id: user.id },
        });
        customerId = customer.id;
      }
    }

    const piParams: Stripe.PaymentIntentCreateParams = {
      amount: totalCents,
      currency: "usd",
      customer: customerId,
      metadata: {
        order_id: order.id,
        store: store || "Unknown",
        subtotal_cents: String(subtotalCents),
        delivery_fee_cents: String(deliveryFeeCents),
        service_fee_cents: String(serviceFeeCents),
        tip_cents: String(tipCents),
        priority_fee_cents: String(priorityFeeCents),
        promo_discount_cents: String(promoDiscountCents),
      },
      description: `ZIVO Grocery Order • ${store || "Unknown"}`,
      payment_method_types: ["card"],
    };

    let autoConfirmed = false;

    if (payment_method_id) {
      if (!customerId) {
        return new Response(JSON.stringify({ error: "Saved card requires a signed-in customer" }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      piParams.payment_method = payment_method_id;
      piParams.confirm = true;
      piParams.off_session = true;
      autoConfirmed = true;
    }

    const paymentIntent = await stripe.paymentIntents.create(piParams);

    if (["succeeded", "processing", "requires_capture"].includes(paymentIntent.status)) {
      await admin
        .from("shopping_orders")
        .update({ status: "pending", updated_at: new Date().toISOString() } as any)
        .eq("id", order.id);
    }

    console.log(`[create-grocery-payment-intent] PI ${paymentIntent.id} for order ${order.id}, total ${totalCents}c, status=${paymentIntent.status}`);

    return new Response(
      JSON.stringify({
        ok: true,
        order_id: order.id,
        payment_intent_id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        status: paymentIntent.status,
        auto_confirmed: autoConfirmed,
        total_cents: totalCents,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[create-grocery-payment-intent] Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}, { strictCors: true, rateLimit: "payment", trackNetwork: "suspicious" }));
