// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { withIdempotency } from "../_shared/idempotency.ts";
import {
  auditPaymentEvent,
  getOrCreatePaymentCustomer,
  json,
  normalizeCurrency,
  requireUser,
  requireUuid,
  safeUrl,
  serviceClient,
  sourcePlatform,
  stripeClient,
} from "../_shared/zivopay.ts";

serve(withSecurity("zivopay-create-subscription-checkout", async (req, ctx) => {
  const cors = ctx.corsHeaders;
  const { user, error: authError } = await requireUser(req);
  if (authError || !user) return json(cors, { error: "Unauthorized" }, 401);

  try {
    const idempotencyRequest = req.clone();
    const body = await req.json();
    const requestedPlatform = String(body.source_platform || "").trim();
    if (!requestedPlatform) {
      return json(cors, { error: "source_platform is required" }, 400);
    }
    const platform = sourcePlatform(requestedPlatform);
    if (platform === "zivo_software") {
      return json(cors, {
        error: "This Software checkout route is retired. Use software-create-subscription.",
      }, 410);
    }

    return await withIdempotency(idempotencyRequest, "zivopay-create-subscription-checkout", user.id, async () => {
      const currency = normalizeCurrency(body.currency);
      const businessId = body.business_id ? requireUuid(body.business_id, "business_id") : null;
      const softwareProductId = body.software_product_id ? requireUuid(body.software_product_id, "software_product_id") : null;
      const providerPriceId = String(body.price_id || body.provider_price_id || "").trim();
      if (!providerPriceId) throw new Error("price_id is required");

      const origin = req.headers.get("origin") || "https://zivosmedia.com";
      const successUrl = safeUrl(body.success_url, `${origin}/software/billing/success?session_id={CHECKOUT_SESSION_ID}`);
      const cancelUrl = safeUrl(body.cancel_url, `${origin}/software/billing`);
      const admin = serviceClient();
      const stripe = stripeClient();

      const customerId = await getOrCreatePaymentCustomer(admin, stripe, user, {
        business_id: businessId,
        email: body.email,
        name: body.customer_name,
        phone: body.customer_phone,
        currency,
      });

      const metadata = {
        zivosmedia_user_id: user.id,
        source_platform: platform,
        related_table: "payment_subscriptions",
        related_id: softwareProductId || businessId || user.id,
        ...(businessId ? { business_id: businessId } : {}),
        ...(softwareProductId ? { software_product_id: softwareProductId } : {}),
        plan_name: String(body.plan_name || ""),
        billing_interval: String(body.billing_interval || ""),
      };

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: providerPriceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        subscription_data: {
          metadata,
          ...(body.trial_period_days ? { trial_period_days: Math.max(0, Math.floor(Number(body.trial_period_days))) } : {}),
        },
        metadata,
      });

      await auditPaymentEvent(admin, {
        event_type: "subscription_checkout_created",
        actor_user_id: user.id,
        zivosmedia_user_id: user.id,
        business_id: businessId,
        source_platform: platform,
        ip_address: ctx.ip,
        user_agent: ctx.userAgent,
        metadata: { checkout_session_id: session.id, price_id: providerPriceId, software_product_id: softwareProductId },
      });

      return { status: 200, body: { checkout_session_id: session.id, url: session.url } };
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
