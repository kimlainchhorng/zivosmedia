// deno-lint-ignore-file no-explicit-any
// @ts-nocheck: Supabase's generated query types do not cover this cross-domain payment schema.
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { SOURCE_PLATFORMS, auditPaymentEvent, env, json, serviceClient, stripeClient } from "../_shared/zivopay.ts";

function optionalUuid(value: unknown): string | null {
  const text = String(value || "");
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : null;
}

function metadataUuid(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  const uuid = optionalUuid(value);
  if (!uuid) throw new Error(`Stripe metadata ${field} must be a UUID`);
  return uuid;
}

function stripeTime(value: unknown): string | null {
  return typeof value === "number" && value > 0 ? new Date(value * 1000).toISOString() : null;
}

function stripeId(value: unknown): string | null {
  if (typeof value === "string" && value) return value;
  if (value && typeof value === "object" && typeof (value as { id?: unknown }).id === "string") {
    return (value as { id: string }).id;
  }
  return null;
}

function mapSubscriptionStatus(status: string): string {
  if (status === "canceled") return "cancelled";
  if (status === "incomplete_expired") return "expired";
  if (["trialing", "active", "past_due", "unpaid", "incomplete", "paused"].includes(status)) return status;
  return "incomplete";
}

function throwQueryError(error: any, operation: string): void {
  if (error) throw new Error(`${operation}: ${error.message || String(error)}`);
}

function retryableJson(cors: Record<string, string>, body: unknown, status = 503): Response {
  const response = json(cors, body, status);
  response.headers.set("Retry-After", "30");
  return response;
}

async function markTransaction(admin: any, tx: any, status: string, extra: Record<string, unknown> = {}) {
  const { data: updatedTransaction, error: transactionError } = await admin
    .from("payment_transactions")
    .update({
      status,
      ...extra,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tx.id)
    .select("id")
    .single();
  throwQueryError(transactionError, "Unable to update payment transaction");
  if (!updatedTransaction) throw new Error("Unable to update payment transaction: row not found");

  const { data: updatedOrder, error: orderError } = await admin
    .from("payment_orders")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tx.payment_order_id)
    .select("id")
    .single();
  throwQueryError(orderError, "Unable to update payment order");
  if (!updatedOrder) throw new Error("Unable to update payment order: row not found");
}

async function transitionSoftwareCheckoutReservation(
  admin: any,
  transition: "completed" | "expired",
  reservationId: string,
  checkoutSessionId: string,
): Promise<void> {
  const functionName = transition === "completed"
    ? "complete_software_checkout_reservation"
    : "release_software_checkout_reservation";
  const args = transition === "completed"
    ? {
      p_reservation_id: reservationId,
      p_provider_checkout_session_id: checkoutSessionId,
    }
    : {
      p_reservation_id: reservationId,
      p_provider_checkout_session_id: checkoutSessionId,
      p_reason: "checkout_session_expired",
    };
  const { data, error } = await admin.rpc(functionName, args);
  throwQueryError(error, `Unable to mark Software checkout reservation ${transition}`);
  if (data !== true) {
    throw new Error(`Unable to mark Software checkout reservation ${transition}: reservation/session mismatch`);
  }
}

async function loadCanonicalSoftwarePlan(
  admin: any,
  planId: string | null,
  providerPriceId: string | null,
  options: { allowHistorical?: boolean } = {},
): Promise<any> {
  if (!planId && !providerPriceId) {
    throw new Error("Software subscription is missing plan_id and a Stripe price");
  }

  let query = admin
    .from("software_pricing_plans")
    .select("id, software_product_id, provider_price_id, plan_name, billing_interval, software_products!inner(status)")
    .eq("provider", "stripe");
  if (!options.allowHistorical) {
    query = query
      .eq("active", true)
      .eq("software_products.status", "active");
  }
  query = planId ? query.eq("id", planId) : query.eq("provider_price_id", providerPriceId);

  const { data: plan, error } = await query.maybeSingle();
  throwQueryError(error, "Unable to load canonical software plan");
  if (!plan) throw new Error("Stripe subscription does not match a canonical software plan");
  if (providerPriceId && plan.provider_price_id !== providerPriceId) {
    throw new Error("Stripe subscription price does not match plan_id");
  }
  if (!options.allowHistorical) {
    const { data: publicTier, error: publicTierError } = await admin
      .from("software_public_pricing_catalog")
      .select("id, software_product_id")
      .or(`monthly_plan_id.eq.${plan.id},annual_plan_id.eq.${plan.id}`)
      .maybeSingle();
    throwQueryError(publicTierError, "Unable to validate the public software catalog");
    if (!publicTier) {
      throw new Error("Stripe subscription plan is not part of a complete reconciled catalog tier");
    }
    if (publicTier.software_product_id !== plan.software_product_id) {
      throw new Error("Stripe subscription plan does not match the public catalog product");
    }
  }
  return plan;
}

type ReconcileResult = {
  localSubscriptionId: string | null;
  userId: string | null;
  businessId: string | null;
  softwareProductId: string | null;
  ignoredOutOfOrder: boolean;
};

async function reconcileVerifiedSubscription(
  admin: any,
  subscription: any,
  options: { eventCreated: number; eventId: string; enforceEventOrder: boolean },
): Promise<ReconcileResult> {
  const customerId = stripeId(subscription.customer);
  if (!customerId) throw new Error("Verified Stripe subscription is missing its customer");

  const { data: current, error: currentError } = await admin
    .from("payment_subscriptions")
    .select("id, zivosmedia_user_id, business_id, software_product_id, provider_price_id, status, metadata, updated_at")
    .eq("provider", "stripe")
    .eq("provider_subscription_id", subscription.id)
    .maybeSingle();
  throwQueryError(currentError, "Unable to load existing payment subscription");

  const previousEventCreated = Number(current?.metadata?.stripe_event_created);
  const localStatus = mapSubscriptionStatus(subscription.status);
  if (
    options.enforceEventOrder &&
    Number.isFinite(previousEventCreated) &&
    (
      previousEventCreated > options.eventCreated ||
      (
        previousEventCreated === options.eventCreated &&
        ["cancelled", "expired"].includes(current?.status) &&
        !["cancelled", "expired"].includes(localStatus)
      )
    )
  ) {
    return {
      localSubscriptionId: current?.id ?? null,
      userId: current?.zivosmedia_user_id ?? null,
      businessId: current?.business_id ?? null,
      softwareProductId: current?.software_product_id ?? null,
      ignoredOutOfOrder: true,
    };
  }

  const rawMetadata = subscription.metadata && typeof subscription.metadata === "object"
    ? subscription.metadata
    : {};
  const exactUserId = metadataUuid(rawMetadata.user_id, "user_id");
  const legacyUserId = metadataUuid(rawMetadata.zivosmedia_user_id, "zivosmedia_user_id");
  metadataUuid(rawMetadata.actor_user_id, "actor_user_id");
  const exactProductId = metadataUuid(rawMetadata.product_id, "product_id");
  const legacyProductId = metadataUuid(rawMetadata.software_product_id, "software_product_id");
  let planId = metadataUuid(rawMetadata.plan_id, "plan_id");
  const businessId = metadataUuid(rawMetadata.business_id, "business_id");

  if (exactUserId && legacyUserId && exactUserId !== legacyUserId) {
    throw new Error("Stripe subscription user metadata is inconsistent");
  }
  if (exactProductId && legacyProductId && exactProductId !== legacyProductId) {
    throw new Error("Stripe subscription product metadata is inconsistent");
  }

  const userId = exactUserId ?? legacyUserId;
  let softwareProductId = exactProductId ?? legacyProductId;
  const item = subscription.items?.data?.[0];
  const providerPriceId = stripeId(item?.price);
  const claimsSoftware = rawMetadata.source_platform === "zivo_software" ||
    Boolean(softwareProductId) ||
    Boolean(planId) ||
    Boolean(current?.software_product_id);

  let canonicalPlan: any = null;
  if (claimsSoftware) {
    if (!userId) throw new Error("Software subscription is missing user_id metadata");
    if (!businessId) throw new Error("Software subscription is missing business_id metadata");
    const recordedPlanId = optionalUuid(current?.metadata?.plan_id);
    const isTerminalUpdate = ["cancelled", "expired"].includes(localStatus);
    const matchesRecordedHistoricalPlan = Boolean(
      current && (
        (planId && recordedPlanId === planId) ||
        (providerPriceId && current.provider_price_id === providerPriceId)
      ),
    );
    canonicalPlan = await loadCanonicalSoftwarePlan(admin, planId, providerPriceId, {
      allowHistorical: Boolean(current) && (isTerminalUpdate || matchesRecordedHistoricalPlan),
    });
    if (softwareProductId && softwareProductId !== canonicalPlan.software_product_id) {
      throw new Error("Stripe subscription product_id does not match plan_id");
    }
    softwareProductId = canonicalPlan.software_product_id;
    planId = canonicalPlan.id;
  }

  // Events for unrelated Stripe products share the account and are intentionally ignored.
  if (!userId) {
    return {
      localSubscriptionId: current?.id ?? null,
      userId: null,
      businessId: null,
      softwareProductId: null,
      ignoredOutOfOrder: false,
    };
  }

  if (current?.zivosmedia_user_id && current.zivosmedia_user_id !== userId) {
    throw new Error("Stripe subscription cannot be reassigned to another user");
  }
  if (current?.business_id && businessId && current.business_id !== businessId) {
    throw new Error("Stripe subscription cannot be reassigned to another business");
  }
  if (current?.software_product_id && softwareProductId && current.software_product_id !== softwareProductId) {
    throw new Error("Stripe subscription cannot be reassigned to another software product");
  }

  const eventCreated = Number.isFinite(previousEventCreated)
    ? Math.max(previousEventCreated, options.eventCreated)
    : options.eventCreated;
  const persistedMetadata: Record<string, unknown> = {
    ...rawMetadata,
    stripe_event_created: eventCreated,
    stripe_event_id: options.eventId,
  };
  if (claimsSoftware) {
    // These exact keys are the cross-system identity contract used by checkout,
    // Stripe, the local subscription row, and the entitlement row.
    persistedMetadata.user_id = userId;
    persistedMetadata.zivosmedia_user_id = userId;
    persistedMetadata.product_id = softwareProductId;
    persistedMetadata.plan_id = planId;
  }

  const subscriptionRow = {
    zivosmedia_user_id: userId,
    business_id: businessId,
    software_product_id: softwareProductId,
    provider: "stripe",
    provider_subscription_id: subscription.id,
    provider_customer_id: customerId,
    provider_price_id: providerPriceId,
    plan_name: canonicalPlan?.plan_name || rawMetadata.plan_name || item?.price?.nickname || null,
    billing_interval: canonicalPlan?.billing_interval || rawMetadata.billing_interval || item?.price?.recurring?.interval || null,
    status: localStatus,
    trial_start: stripeTime(subscription.trial_start),
    trial_end: stripeTime(subscription.trial_end),
    current_period_start: stripeTime(subscription.current_period_start),
    current_period_end: stripeTime(subscription.current_period_end),
    cancel_at: stripeTime(subscription.cancel_at),
    cancelled_at: stripeTime(subscription.canceled_at),
    metadata: persistedMetadata,
  };

  let localSubscription: { id: string } | null = null;
  if (current) {
    const { data, error } = await admin
      .from("payment_subscriptions")
      .update(subscriptionRow)
      .eq("id", current.id)
      .eq("updated_at", current.updated_at)
      .select("id")
      .maybeSingle();
    throwQueryError(error, "Unable to reconcile payment subscription");
    if (!data) {
      throw new Error("Payment subscription changed concurrently; retrying from verified Stripe state");
    }
    localSubscription = data;
  } else {
    const { data, error } = await admin
      .from("payment_subscriptions")
      .insert(subscriptionRow)
      .select("id")
      .single();
    if (error?.code === "23505") {
      throw new Error("Payment subscription was created concurrently; retrying from verified Stripe state");
    }
    throwQueryError(error, "Unable to reconcile payment subscription");
    localSubscription = data;
  }
  if (!localSubscription?.id) throw new Error("Unable to reconcile payment subscription: row not returned");

  if (claimsSoftware && businessId && softwareProductId) {
    const { data: currentEntitlement, error: entitlementReadError } = await admin
      .from("business_software_entitlements")
      .select("id, zivosmedia_user_id, provider_subscription_id, status, activated_at, cancelled_at, metadata, updated_at")
      .eq("business_id", businessId)
      .eq("software_product_id", softwareProductId)
      .maybeSingle();
    throwQueryError(entitlementReadError, "Unable to load existing software entitlement");
    if (currentEntitlement?.zivosmedia_user_id && currentEntitlement.zivosmedia_user_id !== userId) {
      throw new Error("Software entitlement cannot be reassigned to another user");
    }
    const isActive = ["trialing", "active"].includes(localStatus);
    const isTerminal = ["cancelled", "expired"].includes(localStatus);
    const sameSubscription = !currentEntitlement?.provider_subscription_id ||
      currentEntitlement.provider_subscription_id === subscription.id;
    const currentIsActive = ["trialing", "active"].includes(currentEntitlement?.status);
    const entitlementEventCreated = Number(currentEntitlement?.metadata?.stripe_event_created);
    const entitlementIsNewer = Number.isFinite(entitlementEventCreated) &&
      entitlementEventCreated > eventCreated;

    // A delayed event from an older subscription must not deactivate the
    // entitlement held by a different, currently active subscription. If two
    // different subscriptions are both active, fail closed for operator review.
    if (!sameSubscription && currentIsActive && isActive) {
      throw new Error("Software entitlement is linked to another active Stripe subscription");
    }
    const shouldReconcileEntitlement = !entitlementIsNewer &&
      !(!sameSubscription && currentIsActive && !isActive);
    const now = new Date().toISOString();
    const entitlementRow = {
      business_id: businessId,
      zivosmedia_user_id: userId,
      software_product_id: softwareProductId,
      payment_subscription_id: localSubscription.id,
      provider: "stripe",
      provider_subscription_id: subscription.id,
      status: localStatus,
      current_period_start: stripeTime(subscription.current_period_start),
      current_period_end: stripeTime(subscription.current_period_end),
      trial_end: stripeTime(subscription.trial_end),
      activated_at: isActive
        ? (sameSubscription ? currentEntitlement?.activated_at : null) ?? now
        : sameSubscription ? currentEntitlement?.activated_at ?? null : null,
      cancelled_at: isTerminal
        ? stripeTime(subscription.canceled_at) ??
          (sameSubscription ? currentEntitlement?.cancelled_at : null) ??
          now
        : null,
      metadata: persistedMetadata,
    };

    let entitlement: { id: string } | null = null;
    if (shouldReconcileEntitlement && currentEntitlement) {
      const { data, error } = await admin
        .from("business_software_entitlements")
        .update(entitlementRow)
        .eq("id", currentEntitlement.id)
        .eq("updated_at", currentEntitlement.updated_at)
        .select("id")
        .maybeSingle();
      throwQueryError(error, "Unable to reconcile software entitlement");
      if (!data) {
        throw new Error("Software entitlement changed concurrently; retrying from verified Stripe state");
      }
      entitlement = data;
    } else if (shouldReconcileEntitlement) {
      const { data, error } = await admin
        .from("business_software_entitlements")
        .insert(entitlementRow)
        .select("id")
        .single();
      if (error?.code === "23505") {
        throw new Error("Software entitlement was created concurrently; retrying from verified Stripe state");
      }
      throwQueryError(error, "Unable to reconcile software entitlement");
      entitlement = data;
    }
    if (shouldReconcileEntitlement && !entitlement?.id) {
      throw new Error("Unable to reconcile software entitlement: row not returned");
    }
  }

  return {
    localSubscriptionId: localSubscription.id,
    userId,
    businessId,
    softwareProductId,
    ignoredOutOfOrder: false,
  };
}

serve(withSecurity("zivopay-stripe-webhook", async (req, ctx) => {
  const cors = ctx.corsHeaders;
  if (req.method !== "POST") return json(cors, { error: "Method not allowed" }, 405);

  const admin = serviceClient();
  const stripe = stripeClient();
  // Stripe requires verification against the exact, unparsed request bytes.
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = env("STRIPE_WEBHOOK_SECRET");

  let event: any;
  try {
    if (!signature) return json(cors, { error: "Missing Stripe signature" }, 400);
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (_error) {
    return json(cors, { error: "Invalid Stripe webhook signature" }, 400);
  }

  const payload = JSON.parse(body);
  const rawSourcePlatform = event.data?.object?.metadata?.source_platform || null;
  const sourcePlatform = SOURCE_PLATFORMS.has(rawSourcePlatform) ? rawSourcePlatform : null;

  const { error: eventInsertError } = await admin.from("payment_webhook_events").insert({
    provider: "stripe",
    provider_event_id: event.id,
    event_type: event.type,
    source_platform: sourcePlatform,
    related_payment_id: optionalUuid(event.data?.object?.metadata?.payment_order_id),
    related_subscription_id: null,
    payload,
    processed: false,
    retry_count: 0,
  });
  if (eventInsertError && eventInsertError.code !== "23505") {
    console.error("Unable to record Stripe webhook event", eventInsertError);
    return retryableJson(cors, { error: "Unable to record webhook event", retryable: true });
  }

  const { data: claimRows, error: claimError } = await admin.rpc("claim_payment_webhook_event", {
    p_provider: "stripe",
    p_provider_event_id: event.id,
  });
  if (claimError) {
    console.error("Unable to claim Stripe webhook event", claimError);
    return retryableJson(cors, { error: "Unable to claim webhook event", retryable: true });
  }

  const claim = Array.isArray(claimRows) ? claimRows[0] : claimRows;
  if (!claim || typeof claim.claimed !== "boolean" || typeof claim.already_processed !== "boolean") {
    console.error("Invalid claim_payment_webhook_event response", claimRows);
    return retryableJson(cors, { error: "Unable to claim webhook event", retryable: true });
  }
  if (claim.already_processed) {
    return json(cors, { received: true, duplicate: true });
  }
  if (!claim.claimed) {
    return retryableJson(cors, {
      error: "Webhook event is already being processed",
      duplicate: true,
      retryable: true,
    });
  }

  const claimRetryCount = Number(claim.retry_count);
  if (!Number.isInteger(claimRetryCount) || claimRetryCount < 1) {
    console.error("Invalid claim retry_count", claim);
    return retryableJson(cors, { error: "Unable to claim webhook event", retryable: true });
  }

  let relatedSubscriptionId: string | null = null;
  let relatedInvoiceId: string | null = null;
  let ignoredOutOfOrder = false;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const reservationId = metadataUuid(
          session.metadata?.software_checkout_reservation_id,
          "software_checkout_reservation_id",
        );
        if (session.mode === "subscription" && session.metadata?.source_platform === "zivo_software") {
          if (!reservationId) throw new Error("ZIVO Software Checkout Session is missing its reservation id");
          const providerSubscriptionId = stripeId(session.subscription);
          if (!providerSubscriptionId) {
            throw new Error("Completed ZIVO Software Checkout Session is missing its subscription");
          }
          // The reservation remains blocking until current Stripe state has
          // produced the local subscription and entitlement. If any part of
          // reconciliation fails, this event retries and the claim stays live.
          const verifiedSubscription = await stripe.subscriptions.retrieve(providerSubscriptionId);
          const reconciled = await reconcileVerifiedSubscription(admin, verifiedSubscription, {
            eventCreated: event.created,
            eventId: event.id,
            enforceEventOrder: false,
          });
          relatedSubscriptionId = reconciled.localSubscriptionId;
          ignoredOutOfOrder = reconciled.ignoredOutOfOrder;
          await transitionSoftwareCheckoutReservation(admin, "completed", reservationId, session.id);
        }
        const paymentOrderId = optionalUuid(session.metadata?.payment_order_id);
        const paymentIntentId = stripeId(session.payment_intent);
        if (paymentOrderId && session.mode === "payment") {
          const { data: tx, error: txError } = await admin
            .from("payment_transactions")
            .select("id, payment_order_id, amount")
            .eq("payment_order_id", paymentOrderId)
            .maybeSingle();
          throwQueryError(txError, "Unable to load checkout payment transaction");
          if (tx) {
            await markTransaction(admin, tx, session.payment_status === "paid" ? "paid" : "checkout_created", {
              provider_payment_intent_id: paymentIntentId,
              provider_checkout_session_id: session.id,
              paid_at: session.payment_status === "paid" ? new Date().toISOString() : null,
            });
          }
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object;
        const reservationId = metadataUuid(
          session.metadata?.software_checkout_reservation_id,
          "software_checkout_reservation_id",
        );
        if (session.mode === "subscription" && session.metadata?.source_platform === "zivo_software") {
          if (!reservationId) throw new Error("ZIVO Software Checkout Session is missing its reservation id");
          await transitionSoftwareCheckoutReservation(admin, "expired", reservationId, session.id);
        }
        const { data: tx, error: txError } = await admin
          .from("payment_transactions")
          .select("id, payment_order_id")
          .eq("provider_checkout_session_id", session.id)
          .maybeSingle();
        throwQueryError(txError, "Unable to load expired checkout transaction");
        if (tx) await markTransaction(admin, tx, "cancelled");
        break;
      }

      case "payment_intent.succeeded": {
        const pi = event.data.object;
        const { data: tx, error: txError } = await admin
          .from("payment_transactions")
          .select("id, payment_order_id")
          .eq("provider", "stripe")
          .eq("provider_payment_intent_id", pi.id)
          .maybeSingle();
        throwQueryError(txError, "Unable to load succeeded payment transaction");
        if (tx) await markTransaction(admin, tx, "paid", { paid_at: new Date().toISOString() });
        break;
      }

      case "charge.succeeded": {
        const charge = event.data.object;
        const paymentIntentId = stripeId(charge.payment_intent);
        if (paymentIntentId) {
          const { error } = await admin.from("payment_transactions").update({
            provider_charge_id: charge.id,
            updated_at: new Date().toISOString(),
          }).eq("provider", "stripe").eq("provider_payment_intent_id", paymentIntentId);
          throwQueryError(error, "Unable to attach Stripe charge to payment transaction");
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object;
        const { data: tx, error: txError } = await admin
          .from("payment_transactions")
          .select("id, payment_order_id")
          .eq("provider", "stripe")
          .eq("provider_payment_intent_id", pi.id)
          .maybeSingle();
        throwQueryError(txError, "Unable to load failed payment transaction");
        if (tx) {
          await markTransaction(admin, tx, "failed", {
            failure_code: pi.last_payment_error?.code ?? null,
            failure_message: pi.last_payment_error?.message ?? null,
          });
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        const paymentIntentId = stripeId(charge.payment_intent);
        if (!paymentIntentId) break;
        const { data: tx, error: txError } = await admin
          .from("payment_transactions")
          .select("id, payment_order_id, zivosmedia_user_id, amount, currency")
          .eq("provider", "stripe")
          .eq("provider_payment_intent_id", paymentIntentId)
          .maybeSingle();
        throwQueryError(txError, "Unable to load refunded payment transaction");
        if (!tx) break;
        const refund = charge.refunds?.data?.[0];
        if (refund?.id) {
          const { error: refundError } = await admin.from("payment_refunds").upsert({
            payment_transaction_id: tx.id,
            provider: "stripe",
            provider_refund_id: refund.id,
            amount: refund.amount ?? charge.amount_refunded ?? 0,
            currency: String(refund.currency || tx.currency || "usd").toLowerCase(),
            reason: refund.reason ?? null,
            status: refund.status ?? "succeeded",
          }, { onConflict: "provider,provider_refund_id" });
          throwQueryError(refundError, "Unable to reconcile Stripe refund");
        }
        const nextStatus = Number(charge.amount_refunded || 0) >= Number(charge.amount || tx.amount)
          ? "refunded"
          : "partially_refunded";
        await markTransaction(admin, tx, nextStatus);
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object;
        const chargeId = stripeId(dispute.charge);
        const { data: tx, error: txError } = await admin
          .from("payment_transactions")
          .select("id, payment_order_id")
          .eq("provider", "stripe")
          .eq("provider_charge_id", chargeId)
          .maybeSingle();
        throwQueryError(txError, "Unable to load disputed payment transaction");
        if (tx) await markTransaction(admin, tx, "disputed");
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        // Event timestamps have one-second precision and delivery is not
        // ordered. Re-read Stripe so equal-second lifecycle events converge on
        // provider truth instead of allowing a delayed snapshot to regress a
        // terminal subscription.
        let verifiedSubscription = event.data.object;
        try {
          verifiedSubscription = await stripe.subscriptions.retrieve(event.data.object.id);
        } catch (error) {
          if (event.type !== "customer.subscription.deleted") throw error;
        }
        const result = await reconcileVerifiedSubscription(admin, verifiedSubscription, {
          eventCreated: event.created,
          eventId: event.id,
          enforceEventOrder: false,
        });
        relatedSubscriptionId = result.localSubscriptionId;
        ignoredOutOfOrder = result.ignoredOutOfOrder;
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subscriptionId = stripeId(invoice.subscription) ||
          stripeId(invoice.parent?.subscription_details?.subscription) ||
          stripeId(invoice.lines?.data?.[0]?.parent?.subscription_item_details?.subscription);

        let reconciled: ReconcileResult | null = null;
        if (subscriptionId) {
          // Invoice events can arrive out of order. Re-read Stripe instead of
          // inferring active/past_due from the invoice event type.
          const verifiedSubscription = await stripe.subscriptions.retrieve(subscriptionId);
          reconciled = await reconcileVerifiedSubscription(admin, verifiedSubscription, {
            eventCreated: event.created,
            eventId: event.id,
            enforceEventOrder: false,
          });
          relatedSubscriptionId = reconciled.localSubscriptionId;
        }

        const invoiceMetadata = invoice.metadata && typeof invoice.metadata === "object" ? invoice.metadata : {};
        const invoiceUserId = metadataUuid(invoiceMetadata.user_id, "invoice.user_id") ??
          metadataUuid(invoiceMetadata.zivosmedia_user_id, "invoice.zivosmedia_user_id");
        const invoiceBusinessId = metadataUuid(invoiceMetadata.business_id, "invoice.business_id");
        const zivosmediaUserId = reconciled?.userId ?? invoiceUserId;
        const businessId = reconciled?.businessId ?? invoiceBusinessId;
        if (!zivosmediaUserId) break;

        const { data: invoiceRow, error: invoiceError } = await admin.from("payment_invoices").upsert({
          subscription_id: reconciled?.localSubscriptionId ?? null,
          zivosmedia_user_id: zivosmediaUserId,
          business_id: businessId,
          provider: "stripe",
          provider_invoice_id: invoice.id,
          invoice_number: invoice.number ?? null,
          amount_due: invoice.amount_due ?? 0,
          amount_paid: invoice.amount_paid ?? 0,
          currency: String(invoice.currency || "usd").toLowerCase(),
          status: invoice.status || (event.type === "invoice.paid" ? "paid" : "open"),
          hosted_invoice_url: invoice.hosted_invoice_url ?? null,
          invoice_pdf_url: invoice.invoice_pdf ?? null,
          due_date: stripeTime(invoice.due_date),
          paid_at: stripeTime(invoice.status_transitions?.paid_at),
        }, { onConflict: "provider,provider_invoice_id" }).select("id").single();
        throwQueryError(invoiceError, "Unable to reconcile Stripe invoice");
        if (!invoiceRow?.id) throw new Error("Unable to reconcile Stripe invoice: row not returned");
        relatedInvoiceId = invoiceRow.id;
        break;
      }

      case "payout.paid":
      case "payout.failed": {
        const payout = event.data.object;
        const { error: payoutError } = await admin.from("driver_payouts").update({
          status: event.type === "payout.paid" ? "paid" : "failed",
          paid_at: event.type === "payout.paid" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        }).eq("provider", "stripe").eq("provider_payout_id", payout.id);
        throwQueryError(payoutError, "Unable to reconcile Stripe payout");
        break;
      }
    }

    // The audit write is part of successful processing. The event is marked
    // processed only after every other database write has succeeded.
    await auditPaymentEvent(admin, {
      event_type: `stripe_webhook_${event.type}`,
      source_platform: sourcePlatform,
      subscription_id: relatedSubscriptionId,
      invoice_id: relatedInvoiceId,
      success: true,
      metadata: {
        provider_event_id: event.id,
        ignored_out_of_order: ignoredOutOfOrder,
        claim_attempt: claimRetryCount,
      },
    });

    const { data: completedEvent, error: completedEventError } = await admin
      .from("payment_webhook_events")
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        processing_started_at: null,
        processing_error: null,
        related_subscription_id: relatedSubscriptionId,
      })
      .eq("provider", "stripe")
      .eq("provider_event_id", event.id)
      .eq("processed", false)
      .eq("retry_count", claimRetryCount)
      .select("id")
      .single();
    throwQueryError(completedEventError, "Unable to complete Stripe webhook event");
    if (!completedEvent?.id) throw new Error("Unable to complete Stripe webhook event: row not returned");

    return json(cors, { received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const bookkeepingFailures: string[] = [];

    const { data: failedEvent, error: failedEventError } = await admin
      .from("payment_webhook_events")
      .update({
        processing_started_at: null,
        processing_error: message,
      })
      .eq("provider", "stripe")
      .eq("provider_event_id", event.id)
      .eq("processed", false)
      .eq("retry_count", claimRetryCount)
      .select("id")
      .maybeSingle();
    if (failedEventError) {
      bookkeepingFailures.push(`failure-state update: ${failedEventError.message}`);
    } else if (!failedEvent) {
      bookkeepingFailures.push("failure-state update: webhook claim was no longer owned");
    }

    try {
      await auditPaymentEvent(admin, {
        event_type: `stripe_webhook_${event.type}`,
        source_platform: sourcePlatform,
        subscription_id: relatedSubscriptionId,
        invoice_id: relatedInvoiceId,
        success: false,
        error_message: message,
        metadata: { provider_event_id: event.id, claim_attempt: claimRetryCount },
      });
    } catch (auditError) {
      bookkeepingFailures.push(`failure audit: ${auditError instanceof Error ? auditError.message : String(auditError)}`);
    }

    console.error("Stripe webhook processing failed", {
      provider_event_id: event.id,
      event_type: event.type,
      message,
      bookkeeping_failures: bookkeepingFailures,
    });
    return retryableJson(cors, { error: "Webhook processing failed", retryable: true });
  }
}, {
  strictCors: true,
  allowedMethods: ["POST"],
  skipBotDetection: true,
  skipWaf: true,
}));
