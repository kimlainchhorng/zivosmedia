// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { json, requireUser, requireUuid, safeUrl, serviceClient, stripeClient } from "../_shared/zivopay.ts";

serve(withSecurity("zivopay-create-billing-portal", async (req, ctx) => {
  const cors = ctx.corsHeaders;
  const { user, error: authError } = await requireUser(req);
  if (authError || !user) return json(cors, { error: "Unauthorized" }, 401);

  try {
    const body = await req.json();
    const businessId = body.business_id ? requireUuid(body.business_id, "business_id") : null;
    const origin = req.headers.get("origin") || "https://zivosmedia.com";
    const returnUrl = safeUrl(body.return_url, `${origin}/billing`);
    const admin = serviceClient();
    const stripe = stripeClient();

    let query = admin
      .from("payment_customers")
      .select("provider_customer_id")
      .eq("provider", "stripe")
      .eq("zivosmedia_user_id", user.id)
      .limit(1);
    query = businessId ? query.eq("business_id", businessId) : query.is("business_id", null);
    const { data: customer, error } = await query.maybeSingle();
    if (error) throw new Error(error.message);
    if (!customer?.provider_customer_id) return json(cors, { error: "No billing customer found" }, 404);

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.provider_customer_id,
      return_url: returnUrl,
    });

    return json(cors, { url: session.url });
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
