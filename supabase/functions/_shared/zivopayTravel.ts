// @ts-nocheck
import { withIdempotency } from "./idempotency.ts";
import {
  auditPaymentEvent,
  getOrCreatePaymentCustomer,
  json,
  normalizeCurrency,
  parseAmount,
  requireUser,
  requireUuid,
  safeUrl,
  serviceClient,
  stripeClient,
} from "./zivopay.ts";

export async function createTravelCheckout(req: Request, ctx: any, input: {
  driverPayment?: boolean;
}) {
  const cors = ctx.corsHeaders;
  const { user, error: authError } = await requireUser(req);
  if (authError || !user) return json(cors, { error: "Unauthorized" }, 401);

  try {
    return await withIdempotency(req, input.driverPayment ? "travel-create-driver-payment" : "travel-create-payment", user.id, async () => {
      const body = await req.json();
      const amount = parseAmount(body.amount);
      const currency = normalizeCurrency(body.currency);
      const travelBookingId = requireUuid(body.travel_booking_id, "travel_booking_id");
      const driverJobId = body.driver_job_id ? requireUuid(body.driver_job_id, "driver_job_id") : null;
      const orderType = String(body.order_type || (input.driverPayment ? "driver_transfer" : "travel_booking")).trim();
      const relatedTable = String(body.related_table || "travel_bookings").trim();
      const relatedId = body.related_id ? requireUuid(body.related_id, "related_id") : travelBookingId;
      const name = String(body.name || (input.driverPayment ? "Zivo Travel driver service" : "Zivo Travel booking")).slice(0, 120);
      const origin = req.headers.get("origin") || "https://zivostravel.com";
      const successUrl = safeUrl(body.success_url, `${origin}/booking/${travelBookingId}/payment-success?session_id={CHECKOUT_SESSION_ID}`);
      const cancelUrl = safeUrl(body.cancel_url, `${origin}/booking/${travelBookingId}/payment-cancelled`);
      const admin = serviceClient();
      const stripe = stripeClient();

      const customerId = await getOrCreatePaymentCustomer(admin, stripe, user, {
        business_id: null,
        email: body.email,
        name: body.customer_name,
        phone: body.customer_phone,
        currency,
      });

      const { data: order, error: orderError } = await admin.from("payment_orders").insert({
        zivosmedia_user_id: user.id,
        source_platform: "zivo_travel",
        order_type: orderType,
        related_table: relatedTable,
        related_id: relatedId,
        travel_booking_id: travelBookingId,
        driver_job_id: driverJobId,
        amount,
        currency,
        status: "pending",
        metadata: {
          ...(body.metadata ?? {}),
          travel_payment_type: input.driverPayment ? "driver_related" : "booking",
          refund_status: "none",
        },
      }).select("id").single();
      if (orderError) throw new Error(orderError.message);

      const metadata = {
        payment_order_id: order.id,
        zivosmedia_user_id: user.id,
        source_platform: "zivo_travel",
        related_table: relatedTable,
        related_id: relatedId,
        travel_booking_id: travelBookingId,
        ...(driverJobId ? { driver_job_id: driverJobId } : {}),
      };

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: customerId,
        line_items: [{
          price_data: {
            currency,
            product_data: { name },
            unit_amount: amount,
          },
          quantity: 1,
        }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
        payment_intent_data: { metadata },
      });

      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
      const { error: txError } = await admin.from("payment_transactions").insert({
        payment_order_id: order.id,
        zivosmedia_user_id: user.id,
        provider: "stripe",
        provider_payment_intent_id: paymentIntentId,
        provider_checkout_session_id: session.id,
        amount,
        currency,
        status: "checkout_created",
      });
      if (txError) throw new Error(txError.message);

      await admin.from("payment_orders").update({ status: "checkout_created" }).eq("id", order.id);
      await syncLegacyTravelPayment(admin, {
        order,
        user,
        travelBookingId,
        driverJobId,
        amount,
        currency,
        sessionId: session.id,
        paymentIntentId,
      });

      await auditPaymentEvent(admin, {
        event_type: input.driverPayment ? "travel_driver_checkout_created" : "travel_checkout_created",
        actor_user_id: user.id,
        zivosmedia_user_id: user.id,
        source_platform: "zivo_travel",
        payment_id: order.id,
        ip_address: ctx.ip,
        user_agent: ctx.userAgent,
        metadata: { checkout_session_id: session.id, travel_booking_id: travelBookingId, driver_job_id: driverJobId },
      });

      return { status: 200, body: { payment_order_id: order.id, travel_booking_id: travelBookingId, driver_job_id: driverJobId, checkout_session_id: session.id, url: session.url } };
    }).then((result) => json(cors, { ...result.body, cached: result.cached }, result.status));
  } catch (error) {
    return json(cors, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
}

async function syncLegacyTravelPayment(admin: any, input: any) {
  const payload = {
    order_id: input.travelBookingId,
    amount: input.amount / 100,
    currency: input.currency.toUpperCase(),
    status: "processing",
    stripe_checkout_session_id: input.sessionId,
    stripe_payment_intent_id: input.paymentIntentId,
  };
  const { error } = await admin.from("travel_payments").insert(payload);
  if (error && error.code !== "42P01" && error.code !== "42703") {
    console.warn("[zivopay-travel] legacy travel_payments sync skipped", error.message);
  }
}

export function requireInternalPaymentWebhook(req: Request): Response | null {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("authorization") ?? "";
  if (!serviceKey || authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

export async function applyTravelPaymentStatus(req: Request, ctx: any, status: "paid" | "refunded" | "partially_refunded" | "failed") {
  const unauthorized = requireInternalPaymentWebhook(req);
  if (unauthorized) return unauthorized;
  const cors = ctx.corsHeaders;
  try {
    const body = await req.json();
    const paymentOrderId = body.payment_order_id ? requireUuid(body.payment_order_id, "payment_order_id") : null;
    const travelBookingId = body.travel_booking_id ? requireUuid(body.travel_booking_id, "travel_booking_id") : null;
    const checkoutSessionId = body.checkout_session_id ? String(body.checkout_session_id) : null;
    const paymentIntentId = body.payment_intent_id ? String(body.payment_intent_id) : null;
    if (!paymentOrderId && !travelBookingId && !checkoutSessionId && !paymentIntentId) {
      throw new Error("payment_order_id, travel_booking_id, checkout_session_id, or payment_intent_id is required");
    }

    const admin = serviceClient();
    let orderId = paymentOrderId;
    if (!orderId && checkoutSessionId) {
      const { data } = await admin.from("payment_transactions").select("payment_order_id").eq("provider_checkout_session_id", checkoutSessionId).maybeSingle();
      orderId = data?.payment_order_id ?? null;
    }
    if (!orderId && paymentIntentId) {
      const { data } = await admin.from("payment_transactions").select("payment_order_id").eq("provider_payment_intent_id", paymentIntentId).maybeSingle();
      orderId = data?.payment_order_id ?? null;
    }
    if (!orderId && travelBookingId) {
      const { data } = await admin.from("payment_orders").select("id").eq("source_platform", "zivo_travel").eq("travel_booking_id", travelBookingId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      orderId = data?.id ?? null;
    }
    if (!orderId) return json(cors, { error: "Payment order not found" }, 404);

    const update = {
      status,
      updated_at: new Date().toISOString(),
    };
    await admin.from("payment_orders").update(update).eq("id", orderId);
    await admin.from("payment_transactions").update(update).eq("payment_order_id", orderId);

    if (travelBookingId) {
      await admin.from("travel_payments").update({
        status: legacyTravelStatus(status),
      }).eq("order_id", travelBookingId);
    }

    await auditPaymentEvent(admin, {
      event_type: `travel_payment_${status}`,
      source_platform: "zivo_travel",
      payment_id: orderId,
      success: true,
      metadata: { travel_booking_id: travelBookingId, checkout_session_id: checkoutSessionId, payment_intent_id: paymentIntentId },
    });

    return json(cors, { ok: true, payment_order_id: orderId, status });
  } catch (error) {
    return json(cors, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
}

function legacyTravelStatus(status: string): string {
  if (status === "paid") return "succeeded";
  if (status === "partially_refunded") return "refunded";
  if (status === "checkout_created") return "processing";
  if (status === "cancelled") return "canceled";
  return status;
}
