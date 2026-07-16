// deno-lint-ignore-file no-explicit-any
// @ts-nocheck: Supabase's generated query types do not cover this cross-domain billing schema.
import { withIdempotency } from "./idempotency.ts";
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

function stripeTime(value: unknown): string | null {
  return typeof value === "number" && value > 0 ? new Date(value * 1000).toISOString() : null;
}

function mapSubscriptionStatus(status: string): string {
  if (status === "canceled") return "cancelled";
  if (status === "incomplete_expired") return "expired";
  if (["trialing", "active", "past_due", "unpaid", "incomplete", "paused", "cancelled", "expired"].includes(status)) return status;
  return "incomplete";
}

type SoftwareCheckoutReservation = {
  id: string;
  claimed: boolean;
  expiresAt: string;
  planId: string;
  checkoutSessionId: string | null;
  checkoutSessionUrl: string | null;
};

function stripeCheckoutUrl(value: unknown): string {
  const url = new URL(String(value || ""));
  if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") {
    throw new Error("Stripe Checkout returned an invalid Session URL");
  }
  return url.toString();
}

function isDefinitiveStripeCheckoutRejection(error: any): boolean {
  const status = Number(error?.statusCode ?? error?.raw?.statusCode);
  return Number.isInteger(status) && status >= 400 && status < 500 && ![408, 409, 425, 429].includes(status);
}

async function claimSoftwareCheckoutReservation(
  admin: any,
  input: {
    businessId: string;
    softwareProductId: string;
    planId: string;
    ownerUserId: string;
    actorUserId: string;
    requestIdempotencyKey: string;
    requestHash: string;
    providerIdempotencyKey: string;
  },
): Promise<SoftwareCheckoutReservation> {
  const { data, error } = await admin.rpc("claim_software_checkout_reservation", {
    p_business_id: input.businessId,
    p_software_product_id: input.softwareProductId,
    p_plan_id: input.planId,
    p_owner_user_id: input.ownerUserId,
    p_actor_user_id: input.actorUserId,
    p_request_idempotency_key: input.requestIdempotencyKey,
    p_request_hash: input.requestHash,
    p_provider_idempotency_key: input.providerIdempotencyKey,
  });
  if (error) throw new Error(`Unable to reserve Software checkout: ${error.message}`);

  const row = Array.isArray(data) ? data[0] : data;
  const id = requireUuid(row?.reservation_id, "checkout reservation id");
  const planId = requireUuid(row?.reservation_plan_id, "checkout reservation plan id");
  const expiresAt = String(row?.reservation_expires_at || "");
  const checkoutSessionId = row?.provider_checkout_session_id == null
    ? null
    : String(row.provider_checkout_session_id);
  if (checkoutSessionId && !/^cs_/.test(checkoutSessionId)) {
    throw new Error("Unable to reserve Software checkout: invalid Stripe Session id");
  }
  const checkoutSessionUrl = row?.provider_checkout_session_url == null
    ? null
    : stripeCheckoutUrl(row.provider_checkout_session_url);
  if (typeof row?.claimed !== "boolean" || !Number.isFinite(Date.parse(expiresAt))) {
    throw new Error("Unable to reserve Software checkout: invalid database response");
  }
  if ((checkoutSessionId === null) !== (checkoutSessionUrl === null)) {
    throw new Error("Unable to reserve Software checkout: incomplete Stripe Session recovery data");
  }
  return { id, claimed: row.claimed, expiresAt, planId, checkoutSessionId, checkoutSessionUrl };
}

async function releaseSoftwareCheckoutReservation(
  admin: any,
  reservationId: string,
  reason: string,
): Promise<void> {
  const { data, error } = await admin.rpc("release_software_checkout_reservation", {
    p_reservation_id: reservationId,
    p_provider_checkout_session_id: null,
    p_reason: reason,
  });
  if (error) throw new Error(`Unable to release Software checkout reservation: ${error.message}`);
  if (data !== true) throw new Error("Unable to release Software checkout reservation: claim was not owned");
}

async function attachSoftwareCheckoutSession(
  admin: any,
  reservationId: string,
  checkoutSessionId: string,
  checkoutSessionUrl: string,
): Promise<void> {
  const { data, error } = await admin.rpc("attach_software_checkout_session", {
    p_reservation_id: reservationId,
    p_provider_checkout_session_id: checkoutSessionId,
    p_provider_checkout_session_url: checkoutSessionUrl,
  });
  if (error) throw new Error(`Unable to attach Stripe Checkout Session: ${error.message}`);
  if (data !== true) throw new Error("Unable to attach Stripe Checkout Session: reservation is no longer active");
}

async function loadPlan(admin: any, body: any) {
  const planId = requireUuid(body.plan_id, "plan_id");
  const query = admin
    .from("software_pricing_plans")
    .select("id, software_product_id, provider_price_id, plan_name, billing_interval, amount, currency, trial_period_days, active, software_products!inner(id, slug, name, status)")
    .eq("active", true)
    .eq("provider", "stripe")
    .eq("software_products.status", "active")
    .eq("software_products.slug", "zivo-auto-repair")
    .eq("id", planId)
    .limit(1);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Software pricing plan not found");
  if (!data.provider_price_id || !String(data.provider_price_id).startsWith("price_")) {
    throw new Error("Software pricing plan is not connected to a Stripe Price");
  }
  const { data: publicTier, error: publicTierError } = await admin
    .from("software_public_pricing_catalog")
    .select("id, software_product_id")
    .or(`monthly_plan_id.eq.${planId},annual_plan_id.eq.${planId}`)
    .maybeSingle();
  if (publicTierError) throw new Error(publicTierError.message);
  if (!publicTier) {
    throw new Error("Software pricing plan is not part of a complete reconciled catalog tier");
  }
  if (publicTier.software_product_id !== data.software_product_id) {
    throw new Error("Software pricing plan does not match the public catalog product");
  }
  return data;
}

export async function assertBusinessOwner(
  admin: any,
  userId: string,
  businessId: string,
): Promise<{ ownerUserId: string }> {
  const { data: profile, error: profileError } = await admin
    .from("business_billing_profiles")
    .select("business_id, business_owner_zivosmedia_user_id")
    .eq("business_id", businessId)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (profile?.business_owner_zivosmedia_user_id === userId) return { ownerUserId: userId };

  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id, owner_id")
    .eq("id", businessId)
    .maybeSingle();
  if (storeError) throw new Error(storeError.message);
  if (store?.owner_id === userId) return { ownerUserId: userId };

  const { data: businessUser, error: businessUserError } = await admin
    .from("business_account_users")
    .select("business_id")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .in("role", ["owner", "admin"])
    .maybeSingle();
  if (businessUserError) throw new Error(businessUserError.message);
  if (businessUser?.business_id) {
    return {
      ownerUserId: profile?.business_owner_zivosmedia_user_id || store?.owner_id || userId,
    };
  }

  throw new Error("Business billing owner access required");
}

const DEFAULT_SOFTWARE_RETURN_ORIGINS = new Set([
  "https://zivosoftware.com",
  "https://www.zivosoftware.com",
  "https://zivosmedia.com",
  "https://www.zivosmedia.com",
]);

function allowedSoftwareReturnOrigins(): Set<string> {
  const configured = String(Deno.env.get("SOFTWARE_ALLOWED_RETURN_ORIGINS") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_SOFTWARE_RETURN_ORIGINS, ...configured]);
}

function isLocalOrigin(url: URL): boolean {
  return Deno.env.get("ALLOW_LOCAL_BILLING_RETURN_URLS") === "true"
    && url.protocol === "http:"
    && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
}

function softwareReturnUrl(input: unknown, fallback: string): string {
  const fallbackUrl = new URL(fallback);
  const raw = String(input || "").trim();
  const url = raw ? new URL(raw, fallbackUrl.origin) : fallbackUrl;
  if (!allowedSoftwareReturnOrigins().has(url.origin) && !isLocalOrigin(url)) {
    throw new Error("Return URL origin is not allowed");
  }
  return url.toString();
}

function requestReturnOrigin(req: Request): string {
  const raw = String(req.headers.get("origin") || "").trim();
  if (!raw) return "https://zivosoftware.com";
  try {
    const url = new URL(raw);
    if (allowedSoftwareReturnOrigins().has(url.origin) || isLocalOrigin(url)) return url.origin;
  } catch {
    // Fall back to the production Software origin.
  }
  return "https://zivosoftware.com";
}

export async function createSoftwareSubscription(req: Request, ctx: any) {
  const cors = ctx.corsHeaders;
  const { user, error: authError } = await requireUser(req);
  if (authError || !user) return json(cors, { error: "Unauthorized" }, 401);

  try {
    return await withIdempotency(req, "software-create-subscription", user.id, async ({ key, providerKey, requestHash }) => {
      if (!key || !providerKey || !requestHash) {
        throw new Error("A valid Idempotency-Key header is required");
      }
      const body = await req.json();
      const businessId = requireUuid(body.business_id, "business_id");
      const admin = serviceClient();
      const { ownerUserId } = await assertBusinessOwner(admin, user.id, businessId);
      const plan = await loadPlan(admin, body);
      const blockingStatuses = ["trialing", "active", "past_due", "unpaid", "incomplete", "paused"];
      const { data: existingSubscription, error: existingSubscriptionError } = await admin
        .from("payment_subscriptions")
        .select("id, status")
        .eq("provider", "stripe")
        .eq("business_id", businessId)
        .eq("software_product_id", plan.software_product_id)
        .in("status", blockingStatuses)
        .limit(1)
        .maybeSingle();
      if (existingSubscriptionError) throw new Error(existingSubscriptionError.message);

      const { data: existingEntitlement, error: existingEntitlementError } = await admin
        .from("business_software_entitlements")
        .select("id, status")
        .eq("business_id", businessId)
        .eq("software_product_id", plan.software_product_id)
        .in("status", blockingStatuses)
        .limit(1)
        .maybeSingle();
      if (existingEntitlementError) throw new Error(existingEntitlementError.message);
      if (existingSubscription || existingEntitlement) {
        return {
          status: 409,
          body: {
            error: "An existing Software subscription or entitlement must be managed before starting another checkout",
          },
        };
      }

      const currency = normalizeCurrency(plan.currency);
      const stripe = stripeClient();
      const origin = requestReturnOrigin(req);
      const successUrl = softwareReturnUrl(body.success_url, `${origin}/business/billing/success?session_id={CHECKOUT_SESSION_ID}`);
      const cancelUrl = softwareReturnUrl(body.cancel_url, `${origin}/business/billing`);

      // This RPC is the concurrency boundary. It must run before every Stripe
      // network side effect, including customer creation.
      const reservation = await claimSoftwareCheckoutReservation(admin, {
        businessId,
        softwareProductId: plan.software_product_id,
        planId: plan.id,
        ownerUserId,
        actorUserId: user.id,
        requestIdempotencyKey: key,
        requestHash,
        providerIdempotencyKey: providerKey,
      });
      if (!reservation.claimed) {
        if (reservation.planId === plan.id && reservation.checkoutSessionId && reservation.checkoutSessionUrl) {
          await auditPaymentEvent(admin, {
            event_type: "software_subscription_checkout_resumed",
            actor_user_id: user.id,
            zivosmedia_user_id: ownerUserId,
            business_id: businessId,
            source_platform: "zivo_software",
            ip_address: ctx.ip,
            user_agent: ctx.userAgent,
            metadata: {
              checkout_session_id: reservation.checkoutSessionId,
              software_checkout_reservation_id: reservation.id,
            },
          });
          return {
            status: 200,
            body: {
              checkout_session_id: reservation.checkoutSessionId,
              url: reservation.checkoutSessionUrl,
              resumed: true,
              business_id: businessId,
              software_product_id: plan.software_product_id,
              checkout_reservation_id: reservation.id,
              reservation_expires_at: reservation.expiresAt,
            },
          };
        }
        return {
          status: 409,
          body: {
            error: "A Software checkout is already in progress for this business",
            checkout_reservation_id: reservation.id,
            reservation_plan_id: reservation.planId,
            reservation_expires_at: reservation.expiresAt,
            ...(reservation.checkoutSessionUrl ? { resume_url: reservation.checkoutSessionUrl } : {}),
          },
        };
      }

      if (reservation.checkoutSessionId && reservation.checkoutSessionUrl) {
        await auditPaymentEvent(admin, {
          event_type: "software_subscription_checkout_resumed",
          actor_user_id: user.id,
          zivosmedia_user_id: ownerUserId,
          business_id: businessId,
          source_platform: "zivo_software",
          ip_address: ctx.ip,
          user_agent: ctx.userAgent,
          metadata: {
            checkout_session_id: reservation.checkoutSessionId,
            software_checkout_reservation_id: reservation.id,
          },
        });
        return {
          status: 200,
          body: {
            checkout_session_id: reservation.checkoutSessionId,
            url: reservation.checkoutSessionUrl,
            resumed: true,
            business_id: businessId,
            software_product_id: plan.software_product_id,
            checkout_reservation_id: reservation.id,
            reservation_expires_at: reservation.expiresAt,
          },
        };
      }

      const checkoutExpiresAt = Math.floor(Date.parse(reservation.expiresAt) / 1000);
      const metadata = {
        user_id: ownerUserId,
        actor_user_id: user.id,
        product_id: plan.software_product_id,
        plan_id: plan.id,
        zivosmedia_user_id: ownerUserId,
        source_platform: "zivo_software",
        related_table: "business_software_entitlements",
        related_id: businessId,
        business_id: businessId,
        software_product_id: plan.software_product_id,
        software_checkout_reservation_id: reservation.id,
        plan_name: plan.plan_name,
        billing_interval: plan.billing_interval,
      };

      const billingOwner = { ...user, id: ownerUserId };
      const customerId = await getOrCreatePaymentCustomer(admin, stripe, billingOwner, {
        business_id: businessId,
        email: body.email,
        name: body.customer_name,
        phone: body.customer_phone,
        currency,
        idempotency_key: providerKey,
      });
      const { data: paymentCustomer, error: paymentCustomerError } = await admin
        .from("payment_customers")
        .select("id")
        .eq("provider", "stripe")
        .eq("provider_customer_id", customerId)
        .maybeSingle();
      if (paymentCustomerError) throw new Error(paymentCustomerError.message);

      const { error: billingProfileError } = await admin.from("business_billing_profiles").upsert({
        business_id: businessId,
        business_owner_zivosmedia_user_id: ownerUserId,
        payment_customer_id: paymentCustomer?.id ?? null,
        billing_email: body.billing_email || user.email || null,
        default_currency: currency,
        payment_status: "checkout_created",
      }, { onConflict: "business_id" });
      if (billingProfileError) throw new Error(billingProfileError.message);

      let session: any;
      try {
        session = await stripe.checkout.sessions.create(
          {
            mode: "subscription",
            customer: customerId,
            client_reference_id: businessId,
            line_items: [{ price: plan.provider_price_id, quantity: 1 }],
            success_url: successUrl,
            cancel_url: cancelUrl,
            expires_at: checkoutExpiresAt,
            subscription_data: {
              metadata,
              ...(plan.trial_period_days > 0 ? { trial_period_days: plan.trial_period_days } : {}),
            },
            metadata,
          },
          // Stripe retains idempotency responses longer than this one-hour
          // reservation. Including the reservation UUID keeps an identical
          // retry stable within the claim while preventing a new claim from
          // replaying an expired claim's Session.
          { idempotencyKey: `${providerKey}:checkout:${reservation.id}` },
        );
      } catch (error) {
        // A timeout, connection failure, conflict, or rate limit can happen
        // after Stripe accepted the idempotent request. Retain the claim so the
        // identical request can recover it; release only a definitive 4xx
        // rejection that cannot have created a Session.
        if (isDefinitiveStripeCheckoutRejection(error)) {
          await releaseSoftwareCheckoutReservation(admin, reservation.id, "stripe_checkout_rejected");
        }
        throw error;
      }

      // Once Stripe returned a live Session, never release this claim on a
      // later local failure. An idempotent retry can reattach the same Session,
      // and the signed completed/expired webhook is authoritative thereafter.
      if (session.metadata?.software_checkout_reservation_id !== reservation.id) {
        throw new Error("Stripe Checkout Session does not match its Software reservation");
      }
      const checkoutSessionUrl = stripeCheckoutUrl(session.url);
      await attachSoftwareCheckoutSession(admin, reservation.id, session.id, checkoutSessionUrl);

      await auditPaymentEvent(admin, {
        event_type: "software_subscription_checkout_created",
        actor_user_id: user.id,
        zivosmedia_user_id: ownerUserId,
        business_id: businessId,
        source_platform: "zivo_software",
        ip_address: ctx.ip,
        user_agent: ctx.userAgent,
        metadata: {
          checkout_session_id: session.id,
          software_checkout_reservation_id: reservation.id,
          reservation_expires_at: reservation.expiresAt,
          price_id: plan.provider_price_id,
          software_product_id: plan.software_product_id,
        },
      });

      return {
        status: 200,
        body: {
          checkout_session_id: session.id,
          url: checkoutSessionUrl,
          business_id: businessId,
          software_product_id: plan.software_product_id,
          checkout_reservation_id: reservation.id,
          reservation_expires_at: reservation.expiresAt,
        },
      };
    }, { required: true }).then((result) => json(cors, { ...result.body, cached: result.cached }, result.status));
  } catch (error) {
    return json(cors, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
}

export async function cancelSoftwareSubscription(req: Request, ctx: any) {
  const cors = ctx.corsHeaders;
  const { user, error: authError } = await requireUser(req);
  if (authError || !user) return json(cors, { error: "Unauthorized" }, 401);

  try {
    return await withIdempotency(req, "software-cancel-subscription", user.id, async ({ providerKey }) => {
      const body = await req.json();
      const subscriptionId = requireUuid(body.subscription_id, "subscription_id");
      if (body.cancel_at_period_end === false) {
        return { status: 400, body: { error: "Immediate cancellation is not supported; cancellation is scheduled for period end" } };
      }

      const admin = serviceClient();
      const { data: sub, error } = await admin
        .from("payment_subscriptions")
        .select("id, business_id, provider_subscription_id, zivosmedia_user_id, software_product_id")
        .eq("id", subscriptionId)
        .eq("provider", "stripe")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!sub) return { status: 404, body: { error: "Subscription not found" } };
      if (!sub.business_id) return { status: 404, body: { error: "Business subscription not found" } };
      const { ownerUserId } = await assertBusinessOwner(admin, user.id, sub.business_id);

      const stripe = stripeClient();
      const updated = await stripe.subscriptions.update(
        sub.provider_subscription_id,
        { cancel_at_period_end: true },
        { idempotencyKey: `${providerKey}:cancel` },
      );

      // Local status and entitlements are deliberately reconciled only by the
      // verified Stripe webhook, never by this browser-triggered request.
      await auditPaymentEvent(admin, {
        event_type: "software_subscription_cancel_requested",
        actor_user_id: user.id,
        zivosmedia_user_id: ownerUserId,
        business_id: sub.business_id,
        source_platform: "zivo_software",
        subscription_id: sub.id,
        ip_address: ctx.ip,
        user_agent: ctx.userAgent,
        metadata: { provider_subscription_id: sub.provider_subscription_id, cancel_at_period_end: true },
      });

      return {
        status: 200,
        body: {
          ok: true,
          subscription_id: sub.id,
          status: mapSubscriptionStatus(updated.status),
          cancel_at: stripeTime(updated.cancel_at),
          pending_webhook_reconciliation: true,
        },
      };
    }, { required: true }).then((result) => json(cors, { ...result.body, cached: result.cached }, result.status));
  } catch (error) {
    return json(cors, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
}

export async function changeSoftwarePlan(req: Request, ctx: any) {
  const cors = ctx.corsHeaders;
  const { user, error: authError } = await requireUser(req);
  if (authError || !user) return json(cors, { error: "Unauthorized" }, 401);

  try {
    return await withIdempotency(req, "software-change-plan", user.id, async ({ providerKey }) => {
      const body = await req.json();
      const subscriptionId = requireUuid(body.subscription_id, "subscription_id");
      const admin = serviceClient();
      const plan = await loadPlan(admin, body);
      const { data: sub, error } = await admin
        .from("payment_subscriptions")
        .select("id, business_id, provider_subscription_id, zivosmedia_user_id, software_product_id")
        .eq("id", subscriptionId)
        .eq("provider", "stripe")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!sub) return { status: 404, body: { error: "Subscription not found" } };
      if (!sub.business_id) return { status: 404, body: { error: "Business subscription not found" } };
      const { ownerUserId } = await assertBusinessOwner(admin, user.id, sub.business_id);
      if (sub.software_product_id !== plan.software_product_id) {
        return { status: 400, body: { error: "The selected plan does not belong to this Software product" } };
      }

      const stripe = stripeClient();
      const current = await stripe.subscriptions.retrieve(sub.provider_subscription_id);
      const itemId = current.items?.data?.[0]?.id;
      if (!itemId) throw new Error("Subscription item not found");

      const updated = await stripe.subscriptions.update(
        sub.provider_subscription_id,
        {
          items: [{ id: itemId, price: plan.provider_price_id }],
          proration_behavior: "create_prorations",
          metadata: {
            ...(current.metadata ?? {}),
            user_id: ownerUserId,
            actor_user_id: user.id,
            product_id: plan.software_product_id,
            plan_id: plan.id,
            zivosmedia_user_id: ownerUserId,
            software_product_id: plan.software_product_id,
            plan_name: plan.plan_name,
            billing_interval: plan.billing_interval,
            source_platform: "zivo_software",
          },
        },
        { idempotencyKey: `${providerKey}:change-plan` },
      );

      // The verified webhook is the sole writer of local subscription and
      // entitlement state after Stripe accepts this change.
      await auditPaymentEvent(admin, {
        event_type: "software_subscription_plan_change_requested",
        actor_user_id: user.id,
        zivosmedia_user_id: ownerUserId,
        business_id: sub.business_id,
        source_platform: "zivo_software",
        subscription_id: sub.id,
        ip_address: ctx.ip,
        user_agent: ctx.userAgent,
        metadata: {
          provider_subscription_id: sub.provider_subscription_id,
          price_id: plan.provider_price_id,
          plan_id: plan.id,
          software_product_id: plan.software_product_id,
          proration_behavior: "create_prorations",
        },
      });

      return {
        status: 200,
        body: {
          ok: true,
          subscription_id: sub.id,
          status: mapSubscriptionStatus(updated.status),
          price_id: plan.provider_price_id,
          pending_webhook_reconciliation: true,
        },
      };
    }, { required: true }).then((result) => json(cors, { ...result.body, cached: result.cached }, result.status));
  } catch (error) {
    return json(cors, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
}
