// @ts-nocheck
import {
  auditPaymentEvent,
  getOrCreatePaymentCustomer,
  json,
  normalizeCurrency,
  requireUser,
  requireUuid,
  serviceClient,
  stripeClient,
} from "./zivopay.ts";

export async function assertBusinessBillingAccess(admin: any, userId: string, businessId: string) {
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

  throw new Error("Business billing access required");
}

function businessIdFromRequest(req: Request, body?: any): string {
  const url = new URL(req.url);
  return requireUuid(body?.business_id || url.searchParams.get("business_id"), "business_id");
}

function safeBillingAddress(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const allowed = ["line1", "line2", "city", "state", "postal_code", "country"];
  return Object.fromEntries(
    allowed
      .filter((key) => typeof source[key] === "string")
      .map((key) => [key, String(source[key]).slice(0, 200)]),
  );
}

export async function getBusinessBillingProfile(req: Request, ctx: any) {
  const cors = ctx.corsHeaders;
  const { user, error: authError } = await requireUser(req);
  if (authError || !user) return json(cors, { error: "Unauthorized" }, 401);

  try {
    const businessId = businessIdFromRequest(req);
    const admin = serviceClient();
    await assertBusinessBillingAccess(admin, user.id, businessId);

    const { data: existing, error } = await admin
      .from("business_billing_profiles")
      .select("*, payment_customers(id, provider, provider_customer_id, email, name, phone, default_currency)")
      .eq("business_id", businessId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    if (existing) return json(cors, { billing_profile: existing });

    const { data: created, error: createError } = await admin
      .from("business_billing_profiles")
      .insert({
        business_id: businessId,
        business_owner_zivosmedia_user_id: user.id,
        billing_email: user.email || null,
        default_currency: "usd",
        payment_status: "pending",
      })
      .select("*")
      .single();
    if (createError) throw new Error(createError.message);

    return json(cors, { billing_profile: created });
  } catch (error) {
    return json(cors, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
}

export async function getBusinessSubscriptions(req: Request, ctx: any) {
  const cors = ctx.corsHeaders;
  const { user, error: authError } = await requireUser(req);
  if (authError || !user) return json(cors, { error: "Unauthorized" }, 401);

  try {
    const businessId = businessIdFromRequest(req);
    const admin = serviceClient();
    await assertBusinessBillingAccess(admin, user.id, businessId);

    const { data: subscriptions, error } = await admin
      .from("payment_subscriptions")
      .select("*")
      .eq("business_id", businessId)
      .eq("zivosmedia_user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: entitlements, error: entitlementError } = await admin
      .from("business_software_entitlements")
      .select("*, software_products(id, slug, name, category)")
      .eq("business_id", businessId)
      .eq("zivosmedia_user_id", user.id)
      .order("created_at", { ascending: false });
    if (entitlementError) throw new Error(entitlementError.message);

    return json(cors, { subscriptions: subscriptions ?? [], entitlements: entitlements ?? [] });
  } catch (error) {
    return json(cors, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
}

export async function getBusinessInvoices(req: Request, ctx: any) {
  const cors = ctx.corsHeaders;
  const { user, error: authError } = await requireUser(req);
  if (authError || !user) return json(cors, { error: "Unauthorized" }, 401);

  try {
    const businessId = businessIdFromRequest(req);
    const url = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 50)));
    const admin = serviceClient();
    await assertBusinessBillingAccess(admin, user.id, businessId);

    const { data: invoices, error } = await admin
      .from("payment_invoices")
      .select("*, payment_subscriptions(id, software_product_id, plan_name, billing_interval, status)")
      .eq("business_id", businessId)
      .eq("zivosmedia_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);

    return json(cors, { invoices: invoices ?? [] });
  } catch (error) {
    return json(cors, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
}

export async function updateBusinessBillingInfo(req: Request, ctx: any) {
  const cors = ctx.corsHeaders;
  const { user, error: authError } = await requireUser(req);
  if (authError || !user) return json(cors, { error: "Unauthorized" }, 401);

  try {
    const body = await req.json();
    const businessId = businessIdFromRequest(req, body);
    const currency = normalizeCurrency(body.default_currency || "usd");
    const billingEmail = body.billing_email ? String(body.billing_email).slice(0, 320) : user.email || null;
    const billingAddress = safeBillingAddress(body.billing_address);
    const admin = serviceClient();
    await assertBusinessBillingAccess(admin, user.id, businessId);

    const stripe = stripeClient();
    const providerCustomerId = await getOrCreatePaymentCustomer(admin, stripe, user, {
      business_id: businessId,
      email: billingEmail,
      name: body.name || body.customer_name || null,
      phone: body.phone || null,
      currency,
    });

    const { data: paymentCustomer } = await admin
      .from("payment_customers")
      .select("id")
      .eq("provider", "stripe")
      .eq("provider_customer_id", providerCustomerId)
      .maybeSingle();

    await stripe.customers.update(providerCustomerId, {
      email: billingEmail || undefined,
      name: body.name || body.customer_name || undefined,
      phone: body.phone || undefined,
      address: Object.keys(billingAddress).length ? billingAddress : undefined,
      metadata: {
        zivosmedia_user_id: user.id,
        business_id: businessId,
      },
    });

    await admin.from("payment_customers").update({
      email: billingEmail,
      name: body.name || body.customer_name || null,
      phone: body.phone || null,
      default_currency: currency,
      updated_at: new Date().toISOString(),
    }).eq("provider", "stripe").eq("provider_customer_id", providerCustomerId);

    const { data: profile, error } = await admin
      .from("business_billing_profiles")
      .upsert({
        business_id: businessId,
        business_owner_zivosmedia_user_id: user.id,
        payment_customer_id: paymentCustomer?.id ?? null,
        billing_email: billingEmail,
        tax_id: body.tax_id ? String(body.tax_id).slice(0, 120) : null,
        billing_address: billingAddress,
        default_currency: currency,
        payment_status: "active",
      }, { onConflict: "business_id" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await auditPaymentEvent(admin, {
      event_type: "business_billing_info_updated",
      actor_user_id: user.id,
      zivosmedia_user_id: user.id,
      business_id: businessId,
      source_platform: "zivo_business",
      ip_address: ctx.ip,
      user_agent: ctx.userAgent,
      metadata: { payment_customer_id: paymentCustomer?.id ?? null, provider_customer_id: providerCustomerId },
    });

    return json(cors, { billing_profile: profile });
  } catch (error) {
    return json(cors, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
}
