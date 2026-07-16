// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import {
  manualSoftwareAccessGranted,
  stripeSoftwareAccessGranted,
} from "../_shared/softwareAccess.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { assertBusinessOwner } from "../_shared/zivopaySoftware.ts";
import { json, requireUser, requireUuid, serviceClient } from "../_shared/zivopay.ts";

// Read webhook-reconciled local state. The browser never receives a service key
// and this endpoint never trusts an email/store pair to search Stripe directly.
serve(withSecurity("software-subscription-status", async (req, ctx) => {
  const cors = ctx.corsHeaders;
  const { user, error: authError } = await requireUser(req);
  if (authError || !user) return json(cors, { error: "Unauthorized" }, 401);

  try {
    const body = await req.json();
    const businessId = requireUuid(body.business_id ?? body.store_id, "business_id");
    const admin = serviceClient();
    await assertBusinessOwner(admin, user.id, businessId);
    const { data: autoRepairProduct, error: productError } = await admin
      .from("software_products")
      .select("id")
      .eq("slug", "zivo-auto-repair")
      .eq("status", "active")
      .maybeSingle();
    if (productError) throw new Error(productError.message);
    if (!autoRepairProduct?.id) throw new Error("ZIVO Auto Repair product is not active");

    const [subscriptionResult, entitlementResult] = await Promise.all([
      admin
        .from("payment_subscriptions")
        .select("id, provider_subscription_id, provider_price_id, plan_name, billing_interval, status, trial_end, current_period_end, cancel_at, metadata, created_at")
        .eq("provider", "stripe")
        .eq("business_id", businessId)
        .eq("software_product_id", autoRepairProduct.id)
        .in("status", ["trialing", "active", "past_due", "unpaid", "incomplete", "paused"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("business_software_entitlements")
        .select("id, status, current_period_end, trial_end, cancelled_at, metadata, created_at, payment_subscription_id, provider_subscription_id, software_products(name)")
        .eq("business_id", businessId)
        .eq("software_product_id", autoRepairProduct.id)
        .in("status", ["trialing", "active", "past_due", "unpaid", "incomplete", "paused"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (subscriptionResult.error) throw new Error(subscriptionResult.error.message);
    if (entitlementResult.error) throw new Error(entitlementResult.error.message);

    const subscription = subscriptionResult.data;
    const entitlement = entitlementResult.data;
    const subscriptionAccess = stripeSoftwareAccessGranted(subscription?.status);
    const manualAccess = manualSoftwareAccessGranted(entitlement);

    if (!subscription || (!subscriptionAccess && manualAccess)) {
      if (!entitlement) return json(cors, { subscription: null });

      const entitlementMetadata = entitlement.metadata && typeof entitlement.metadata === "object"
        ? entitlement.metadata
        : {};
      return json(cors, {
        subscription: {
          id: entitlement.id,
          plan_id: entitlementMetadata.plan_id ?? null,
          plan: entitlementMetadata.tier_key
            ?? entitlementMetadata.plan_name
            ?? entitlement.software_products?.name
            ?? "Software access",
          cycle: entitlementMetadata.billing_interval === "year"
            ? "annual"
            : entitlementMetadata.billing_interval === "month"
              ? "monthly"
              : null,
          status: entitlement.status,
          current_period_end: entitlement.current_period_end,
          trial_end: entitlement.trial_end,
          cancel_at_period_end: Boolean(entitlement.cancelled_at),
          amount_cents: null,
          currency: null,
          interval: entitlementMetadata.billing_interval ?? null,
          billing_portal_available: false,
          reconciliation_required: true,
          access_granted: manualAccess,
        },
      });
    }

    const { data: plan, error: planError } = subscription.provider_price_id
      ? await admin
        .from("software_pricing_plans")
        .select("id, amount, currency, billing_interval")
        .eq("provider", "stripe")
        .eq("provider_price_id", subscription.provider_price_id)
        .eq("software_product_id", autoRepairProduct.id)
        .maybeSingle()
      : { data: null, error: null };
    if (planError) throw new Error(planError.message);

    const metadata = subscription.metadata && typeof subscription.metadata === "object"
      ? subscription.metadata
      : {};
    const interval = plan?.billing_interval || subscription.billing_interval || null;
    return json(cors, {
      subscription: {
        id: subscription.id,
        plan_id: plan?.id ?? metadata.plan_id ?? null,
        plan: metadata.tier_key ?? subscription.plan_name ?? null,
        cycle: interval === "year" ? "annual" : interval === "month" ? "monthly" : interval,
        status: subscription.status,
        current_period_end: subscription.current_period_end,
        trial_end: subscription.trial_end,
        cancel_at_period_end: Boolean(metadata._stripe_cancel_at_period_end ?? subscription.cancel_at),
        amount_cents: plan?.amount ?? null,
        currency: plan?.currency ?? null,
        interval,
        billing_portal_available: true,
        reconciliation_required: false,
        access_granted: subscriptionAccess,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes("owner access") ? 403 : 400;
    return json(cors, { error: message }, status);
  }
}, {
  rateLimit: "api_general",
  strictCors: true,
  allowedMethods: ["POST"],
}));
