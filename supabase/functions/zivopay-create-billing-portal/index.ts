// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withIdempotency } from "../_shared/idempotency.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { assertBusinessOwner } from "../_shared/zivopaySoftware.ts";
import { auditPaymentEvent, json, requireUser, requireUuid, serviceClient, stripeClient } from "../_shared/zivopay.ts";

const DEFAULT_RETURN_ORIGINS = new Set([
  "https://zivosoftware.com",
  "https://www.zivosoftware.com",
  "https://zivosmedia.com",
  "https://www.zivosmedia.com",
]);

function portalReturnUrl(input: unknown): string {
  const raw = String(input || "").trim();
  const url = new URL(raw || "https://zivosoftware.com/business/account");
  const configured = String(Deno.env.get("BILLING_PORTAL_ALLOWED_RETURN_ORIGINS") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const isLocal = Deno.env.get("ALLOW_LOCAL_BILLING_RETURN_URLS") === "true"
    && url.protocol === "http:"
    && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (![...DEFAULT_RETURN_ORIGINS, ...configured].includes(url.origin) && !isLocal) {
    throw new Error("Return URL origin is not allowed");
  }
  return url.toString();
}

serve(withSecurity("zivopay-create-billing-portal", async (req, ctx) => {
  const cors = ctx.corsHeaders;
  const { user, error: authError } = await requireUser(req);
  if (authError || !user) return json(cors, { error: "Unauthorized" }, 401);

  try {
    return await withIdempotency(req, "zivopay-create-billing-portal", user.id, async ({ providerKey }) => {
      const body = await req.json();
      const businessId = requireUuid(body.business_id, "business_id");
      const returnUrl = portalReturnUrl(body.return_url);
      const admin = serviceClient();
      const { ownerUserId } = await assertBusinessOwner(admin, user.id, businessId);
      const stripe = stripeClient();

      const { data: customer, error } = await admin
        .from("payment_customers")
        .select("provider_customer_id")
        .eq("provider", "stripe")
        .eq("zivosmedia_user_id", ownerUserId)
        .eq("business_id", businessId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!customer?.provider_customer_id) return { status: 404, body: { error: "No billing customer found" } };

      const session = await stripe.billingPortal.sessions.create(
        { customer: customer.provider_customer_id, return_url: returnUrl },
        { idempotencyKey: `${providerKey}:portal` },
      );
      await auditPaymentEvent(admin, {
        event_type: "software_billing_portal_created",
        actor_user_id: user.id,
        zivosmedia_user_id: ownerUserId,
        business_id: businessId,
        source_platform: "zivo_software",
        ip_address: ctx.ip,
        user_agent: ctx.userAgent,
        metadata: { provider_customer_id: customer.provider_customer_id },
      });

      return { status: 200, body: { url: session.url } };
    }, { required: true }).then((result) => json(cors, { ...result.body, cached: result.cached }, result.status));
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
