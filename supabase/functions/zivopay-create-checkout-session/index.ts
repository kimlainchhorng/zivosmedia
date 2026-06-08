// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { withIdempotency } from "../_shared/idempotency.ts";
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
  sourcePlatform,
  stripeClient,
} from "../_shared/zivopay.ts";

serve(withSecurity("zivopay-create-checkout-session", async (req, ctx) => {
  const cors = ctx.corsHeaders;
  const { user, error: authError } = await requireUser(req);
  if (authError || !user) return json(cors, { error: "Unauthorized" }, 401);

  try {
    return await withIdempotency(req, "zivopay-create-checkout-session", user.id, async () => {
      const body = await req.json();
      const amount = parseAmount(body.amount);
      const currency = normalizeCurrency(body.currency);
      const platform = sourcePlatform(body.source_platform);
      const relatedId = requireUuid(body.related_id, "related_id");
      const businessId = body.business_id ? requireUuid(body.business_id, "business_id") : null;
      const travelBookingId = body.travel_booking_id ? requireUuid(body.travel_booking_id, "travel_booking_id") : null;
      const driverJobId = body.driver_job_id ? requireUuid(body.driver_job_id, "driver_job_id") : null;
      const softwareProductId = body.software_product_id ? requireUuid(body.software_product_id, "software_product_id") : null;
      const orderType = String(body.order_type || "").trim();
      const relatedTable = String(body.related_table || "").trim();
      if (!orderType || !relatedTable) throw new Error("order_type and related_table are required");

      const origin = req.headers.get("origin") || "https://zivosmedia.com";
      const successUrl = safeUrl(body.success_url, `${origin}/payments/success?session_id={CHECKOUT_SESSION_ID}`);
      const cancelUrl = safeUrl(body.cancel_url, `${origin}/payments/cancelled`);
      const name = String(body.name || orderType || "Zivo payment").slice(0, 120);
      const admin = serviceClient();
      const stripe = stripeClient();

      const customerId = await getOrCreatePaymentCustomer(admin, stripe, user, {
        business_id: businessId,
        email: body.email,
        name: body.customer_name,
        phone: body.customer_phone,
        currency,
      });

      const { data: order, error: orderError } = await admin
        .from("payment_orders")
        .insert({
          zivosmedia_user_id: user.id,
          source_platform: platform,
          order_type: orderType,
          related_table: relatedTable,
          related_id: relatedId,
          business_id: businessId,
          travel_booking_id: travelBookingId,
          driver_job_id: driverJobId,
          software_product_id: softwareProductId,
          amount,
          currency,
          status: "pending",
          metadata: body.metadata ?? {},
        })
        .select("id")
        .single();
      if (orderError) throw new Error(orderError.message);

      const metadata = {
        payment_order_id: order.id,
        zivosmedia_user_id: user.id,
        source_platform: platform,
        related_table: relatedTable,
        related_id: relatedId,
        ...(businessId ? { business_id: businessId } : {}),
        ...(travelBookingId ? { travel_booking_id: travelBookingId } : {}),
        ...(driverJobId ? { driver_job_id: driverJobId } : {}),
        ...(softwareProductId ? { software_product_id: softwareProductId } : {}),
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
      await auditPaymentEvent(admin, {
        event_type: "checkout_session_created",
        actor_user_id: user.id,
        zivosmedia_user_id: user.id,
        business_id: businessId,
        source_platform: platform,
        payment_id: order.id,
        ip_address: ctx.ip,
        user_agent: ctx.userAgent,
        metadata: { checkout_session_id: session.id },
      });

      return { status: 200, body: { payment_order_id: order.id, checkout_session_id: session.id, url: session.url } };
    }).then((result) => json(cors, { ...result.body, cached: result.cached }, result.status));
  } catch (error) {
    return json(cors, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
}, {
  strictCors: true,
  allowedMethods: ["POST"],
  rateLimit: "payment",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
}));
