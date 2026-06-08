// @ts-nocheck
import { withIdempotency } from "./idempotency.ts";
import {
  auditPaymentEvent,
  getOrCreatePaymentCustomer,
  json,
  normalizeCurrency,
  requireUser,
  requireUuid,
  safeUrl,
  serviceClient,
  stripeClient,
} from "./zivopay.ts";

function stripeTime(value: unknown): string | null {
  return typeof value === "number" && value > 0 ? new Date(value * 1000).toISOString() : null;
}

function mapSubscriptionStatus(status: string): string {
  if (status === "canceled") return "cancelled";
  if (status === "incomplete_expired") return "expired";
  if (["trialing", "active", "past_due", "unpaid", "incomplete", "paused", "cancelled", "expired"].includes(status)) return status;
  return "incomplete";
}

async function loadPlan(admin: any, body: any) {
  const priceId = String(body.price_id || body.provider_price_id || "").trim();
  let query = admin
    .from("software_pricing_plans")
    .select("id, software_product_id, provider_price_id, plan_name, billing_interval, amount, currency, trial_period_days, active, software_products(id, slug, name, status)")
    .eq("active", true)
    .limit(1);
  if (priceId) query = query.eq("provider_price_id", priceId);
  else if (body.plan_id) query = query.eq("id", requireUuid(body.plan_id, "plan_id"));
  else throw new Error("price_id or plan_id is required");

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Software pricing plan not found");
  return data;
}

async function assertBusinessOwner(admin: any, userId: string, businessId: string) {
  const { data: profile } = await admin
    .from("business_billing_profiles")
    .select("business_id")
    .eq("business_id", businessId)
    .eq("business_owner_zivosmedia_user_id", userId)
    .maybeSingle();
  if (profile?.business_id) return;

  const { data: store } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", businessId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (store?.id) return;

  const { data: businessUser } = await admin
    .from("business_account_users")
    .select("business_id")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .in("role", ["owner", "admin"])
    .maybeSingle();
  if (businessUser?.business_id) return;

  throw new Error("Business billing owner access required");
}

export async function createSoftwareSubscription(req: Request, ctx: any) {
  const cors = ctx.corsHeaders;
  const { user, error: authError } = await requireUser(req);
  if (authError || !user) return json(cors, { error: "Unauthorized" }, 401);

  try {
    return await withIdempotency(req, "software-create-subscription", user.id, async () => {
      const body = await req.json();
      const businessId = requireUuid(body.business_id, "business_id");
      const admin = serviceClient();
      await assertBusinessOwner(admin, user.id, businessId);
      const plan = await loadPlan(admin, body);
      const currency = normalizeCurrency(body.currency || plan.currency);
      const stripe = stripeClient();
      const origin = req.headers.get("origin") || "https://zivosoftware.com";
      const successUrl = safeUrl(body.success_url, `${origin}/business/billing/success?session_id={CHECKOUT_SESSION_ID}`);
      const cancelUrl = safeUrl(body.cancel_url, `${origin}/business/billing`);

      const customerId = await getOrCreatePaymentCustomer(admin, stripe, user, {
        business_id: businessId,
        email: body.email,
        name: body.customer_name,
        phone: body.customer_phone,
        currency,
      });
      const { data: paymentCustomer } = await admin
        .from("payment_customers")
        .select("id")
        .eq("provider", "stripe")
        .eq("provider_customer_id", customerId)
        .maybeSingle();

      await admin.from("business_billing_profiles").upsert({
        business_id: businessId,
        business_owner_zivosmedia_user_id: user.id,
        payment_customer_id: paymentCustomer?.id ?? null,
        billing_email: body.billing_email || user.email || null,
        default_currency: currency,
        payment_status: "checkout_created",
      }, { onConflict: "business_id" });

      const metadata = {
        zivosmedia_user_id: user.id,
        source_platform: "zivo_software",
        related_table: "business_software_entitlements",
        related_id: businessId,
        business_id: businessId,
        software_product_id: plan.software_product_id,
        plan_name: plan.plan_name,
        billing_interval: plan.billing_interval,
      };

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: plan.provider_price_id, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        subscription_data: {
          metadata,
          ...(plan.trial_period_days > 0 ? { trial_period_days: plan.trial_period_days } : {}),
        },
        metadata,
      });

      await auditPaymentEvent(admin, {
        event_type: "software_subscription_checkout_created",
        actor_user_id: user.id,
        zivosmedia_user_id: user.id,
        business_id: businessId,
        source_platform: "zivo_software",
        ip_address: ctx.ip,
        user_agent: ctx.userAgent,
        metadata: { checkout_session_id: session.id, price_id: plan.provider_price_id, software_product_id: plan.software_product_id },
      });

      return { status: 200, body: { checkout_session_id: session.id, url: session.url, business_id: businessId, software_product_id: plan.software_product_id } };
    }).then((result) => json(cors, { ...result.body, cached: result.cached }, result.status));
  } catch (error) {
    return json(cors, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
}

export async function cancelSoftwareSubscription(req: Request, ctx: any) {
  const cors = ctx.corsHeaders;
  const { user, error: authError } = await requireUser(req);
  if (authError || !user) return json(cors, { error: "Unauthorized" }, 401);

  try {
    const body = await req.json();
    const subscriptionId = requireUuid(body.subscription_id, "subscription_id");
    const admin = serviceClient();
    const { data: sub, error } = await admin
      .from("payment_subscriptions")
      .select("id, business_id, provider_subscription_id, zivosmedia_user_id")
      .eq("id", subscriptionId)
      .eq("zivosmedia_user_id", user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!sub) return json(cors, { error: "Subscription not found" }, 404);
    if (sub.business_id) await assertBusinessOwner(admin, user.id, sub.business_id);

    const stripe = stripeClient();
    const updated = body.cancel_at_period_end === false
      ? await stripe.subscriptions.cancel(sub.provider_subscription_id)
      : await stripe.subscriptions.update(sub.provider_subscription_id, { cancel_at_period_end: true });

    await admin.from("payment_subscriptions").update({
      status: mapSubscriptionStatus(updated.status),
      cancel_at: stripeTime(updated.cancel_at),
      cancelled_at: stripeTime(updated.canceled_at),
      updated_at: new Date().toISOString(),
    }).eq("id", sub.id);

    await auditPaymentEvent(admin, {
      event_type: "software_subscription_cancel_requested",
      actor_user_id: user.id,
      zivosmedia_user_id: user.id,
      business_id: sub.business_id,
      source_platform: "zivo_software",
      subscription_id: sub.id,
      ip_address: ctx.ip,
      user_agent: ctx.userAgent,
      metadata: { provider_subscription_id: sub.provider_subscription_id, cancel_at_period_end: body.cancel_at_period_end !== false },
    });

    return json(cors, { ok: true, subscription_id: sub.id, status: mapSubscriptionStatus(updated.status), cancel_at: stripeTime(updated.cancel_at) });
  } catch (error) {
    return json(cors, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
}

export async function changeSoftwarePlan(req: Request, ctx: any) {
  const cors = ctx.corsHeaders;
  const { user, error: authError } = await requireUser(req);
  if (authError || !user) return json(cors, { error: "Unauthorized" }, 401);

  try {
    const body = await req.json();
    const subscriptionId = requireUuid(body.subscription_id, "subscription_id");
    const admin = serviceClient();
    const plan = await loadPlan(admin, body);
    const { data: sub, error } = await admin
      .from("payment_subscriptions")
      .select("id, business_id, provider_subscription_id, zivosmedia_user_id")
      .eq("id", subscriptionId)
      .eq("zivosmedia_user_id", user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!sub) return json(cors, { error: "Subscription not found" }, 404);
    if (sub.business_id) await assertBusinessOwner(admin, user.id, sub.business_id);

    const stripe = stripeClient();
    const current = await stripe.subscriptions.retrieve(sub.provider_subscription_id);
    const itemId = current.items?.data?.[0]?.id;
    if (!itemId) throw new Error("Subscription item not found");

    const updated = await stripe.subscriptions.update(sub.provider_subscription_id, {
      items: [{ id: itemId, price: plan.provider_price_id }],
      proration_behavior: body.proration_behavior || "create_prorations",
      metadata: {
        ...(current.metadata ?? {}),
        software_product_id: plan.software_product_id,
        plan_name: plan.plan_name,
        billing_interval: plan.billing_interval,
      },
    });

    await admin.from("payment_subscriptions").update({
      software_product_id: plan.software_product_id,
      provider_price_id: plan.provider_price_id,
      plan_name: plan.plan_name,
      billing_interval: plan.billing_interval,
      status: mapSubscriptionStatus(updated.status),
      current_period_start: stripeTime(updated.current_period_start),
      current_period_end: stripeTime(updated.current_period_end),
      updated_at: new Date().toISOString(),
    }).eq("id", sub.id);

    await auditPaymentEvent(admin, {
      event_type: "software_subscription_plan_changed",
      actor_user_id: user.id,
      zivosmedia_user_id: user.id,
      business_id: sub.business_id,
      source_platform: "zivo_software",
      subscription_id: sub.id,
      ip_address: ctx.ip,
      user_agent: ctx.userAgent,
      metadata: { provider_subscription_id: sub.provider_subscription_id, price_id: plan.provider_price_id, software_product_id: plan.software_product_id },
    });

    return json(cors, { ok: true, subscription_id: sub.id, status: mapSubscriptionStatus(updated.status), price_id: plan.provider_price_id });
  } catch (error) {
    return json(cors, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
}

export async function applySoftwareSubscriptionStatus(req: Request, ctx: any, status: "active" | "past_due" | "cancelled") {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("authorization") ?? "";
  if (!serviceKey || authHeader !== `Bearer ${serviceKey}`) return json(ctx.corsHeaders, { error: "Unauthorized" }, 401);

  try {
    const body = await req.json();
    const providerSubscriptionId = body.provider_subscription_id ? String(body.provider_subscription_id) : null;
    const subscriptionId = body.subscription_id ? requireUuid(body.subscription_id, "subscription_id") : null;
    if (!providerSubscriptionId && !subscriptionId) throw new Error("provider_subscription_id or subscription_id is required");

    const admin = serviceClient();
    const query = admin.from("payment_subscriptions").select("*").limit(1);
    const { data: sub, error } = subscriptionId
      ? await query.eq("id", subscriptionId).maybeSingle()
      : await query.eq("provider", "stripe").eq("provider_subscription_id", providerSubscriptionId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!sub) return json(ctx.corsHeaders, { error: "Subscription not found" }, 404);

    await admin.from("payment_subscriptions").update({
      status,
      updated_at: new Date().toISOString(),
      ...(status === "cancelled" ? { cancelled_at: new Date().toISOString() } : {}),
    }).eq("id", sub.id);

    if (sub.business_id && sub.software_product_id) {
      await admin.from("business_software_entitlements").upsert({
        business_id: sub.business_id,
        zivosmedia_user_id: sub.zivosmedia_user_id,
        software_product_id: sub.software_product_id,
        payment_subscription_id: sub.id,
        provider: sub.provider,
        provider_subscription_id: sub.provider_subscription_id,
        status,
        current_period_start: sub.current_period_start,
        current_period_end: sub.current_period_end,
        trial_end: sub.trial_end,
        activated_at: status === "active" ? new Date().toISOString() : null,
        cancelled_at: status === "cancelled" ? new Date().toISOString() : null,
      }, { onConflict: "business_id,software_product_id" });
    }

    await auditPaymentEvent(admin, {
      event_type: `software_subscription_${status}`,
      zivosmedia_user_id: sub.zivosmedia_user_id,
      business_id: sub.business_id,
      source_platform: "zivo_software",
      subscription_id: sub.id,
      success: true,
      metadata: { provider_subscription_id: sub.provider_subscription_id },
    });

    return json(ctx.corsHeaders, { ok: true, subscription_id: sub.id, status });
  } catch (error) {
    return json(ctx.corsHeaders, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
}
