// @ts-nocheck
import { serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { SOURCE_PLATFORMS, auditPaymentEvent, env, json, serviceClient, stripeClient } from "../_shared/zivopay.ts";

function optionalUuid(value: unknown): string | null {
  const text = String(value || "");
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : null;
}

function stripeTime(value: unknown): string | null {
  return typeof value === "number" && value > 0 ? new Date(value * 1000).toISOString() : null;
}

function mapSubscriptionStatus(status: string): string {
  if (status === "canceled") return "cancelled";
  if (status === "incomplete_expired") return "expired";
  if (["trialing", "active", "past_due", "unpaid", "incomplete", "paused"].includes(status)) return status;
  return "incomplete";
}

async function markTransaction(admin: any, tx: any, status: string, extra: Record<string, unknown> = {}) {
  await admin.from("payment_transactions").update({
    status,
    ...extra,
    updated_at: new Date().toISOString(),
  }).eq("id", tx.id);

  await admin.from("payment_orders").update({
    status,
    updated_at: new Date().toISOString(),
  }).eq("id", tx.payment_order_id);
}

serve(withSecurity("zivopay-stripe-webhook", async (req, ctx) => {
  const cors = ctx.corsHeaders;
  if (req.method !== "POST") return json(cors, { error: "Method not allowed" }, 405);

  const admin = serviceClient();
  const stripe = stripeClient();
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = env("STRIPE_WEBHOOK_SECRET");

  let event: any;
  try {
    if (!signature) return json(cors, { error: "Missing Stripe signature" }, 400);
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
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

  if (eventInsertError?.code === "23505") {
    return json(cors, { received: true, duplicate: true });
  }
  if (eventInsertError) {
    return json(cors, { error: eventInsertError.message }, 500);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const paymentOrderId = optionalUuid(session.metadata?.payment_order_id);
        const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
        if (paymentOrderId && session.mode === "payment") {
          const { data: tx } = await admin
            .from("payment_transactions")
            .select("id, payment_order_id, amount")
            .eq("payment_order_id", paymentOrderId)
            .maybeSingle();
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
        const { data: tx } = await admin
          .from("payment_transactions")
          .select("id, payment_order_id")
          .eq("provider_checkout_session_id", session.id)
          .maybeSingle();
        if (tx) await markTransaction(admin, tx, "cancelled");
        break;
      }

      case "payment_intent.succeeded": {
        const pi = event.data.object;
        const { data: tx } = await admin
          .from("payment_transactions")
          .select("id, payment_order_id")
          .eq("provider", "stripe")
          .eq("provider_payment_intent_id", pi.id)
          .maybeSingle();
        if (tx) await markTransaction(admin, tx, "paid", { paid_at: new Date().toISOString() });
        break;
      }

      case "charge.succeeded": {
        const charge = event.data.object;
        const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id ?? null;
        if (paymentIntentId) {
          await admin.from("payment_transactions").update({
            provider_charge_id: charge.id,
            updated_at: new Date().toISOString(),
          }).eq("provider", "stripe").eq("provider_payment_intent_id", paymentIntentId);
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object;
        const { data: tx } = await admin
          .from("payment_transactions")
          .select("id, payment_order_id")
          .eq("provider", "stripe")
          .eq("provider_payment_intent_id", pi.id)
          .maybeSingle();
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
        const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id ?? null;
        if (!paymentIntentId) break;
        const { data: tx } = await admin
          .from("payment_transactions")
          .select("id, payment_order_id, zivosmedia_user_id, amount, currency")
          .eq("provider", "stripe")
          .eq("provider_payment_intent_id", paymentIntentId)
          .maybeSingle();
        if (!tx) break;
        const refund = charge.refunds?.data?.[0];
        if (refund?.id) {
          await admin.from("payment_refunds").upsert({
            payment_transaction_id: tx.id,
            provider: "stripe",
            provider_refund_id: refund.id,
            amount: refund.amount ?? charge.amount_refunded ?? 0,
            currency: String(refund.currency || tx.currency || "usd").toLowerCase(),
            reason: refund.reason ?? null,
            status: refund.status ?? "succeeded",
          }, { onConflict: "provider,provider_refund_id" });
        }
        const nextStatus = Number(charge.amount_refunded || 0) >= Number(charge.amount || tx.amount) ? "refunded" : "partially_refunded";
        await markTransaction(admin, tx, nextStatus);
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object;
        const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id ?? null;
        const { data: tx } = await admin
          .from("payment_transactions")
          .select("id, payment_order_id")
          .eq("provider", "stripe")
          .eq("provider_charge_id", chargeId)
          .maybeSingle();
        if (tx) await markTransaction(admin, tx, "disputed");
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const metadata = subscription.metadata || {};
        const zivosmediaUserId = optionalUuid(metadata.zivosmedia_user_id);
        const businessId = optionalUuid(metadata.business_id);
        const softwareProductId = optionalUuid(metadata.software_product_id);
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
        if (!zivosmediaUserId || !customerId) break;
        const item = subscription.items?.data?.[0];

        await admin.from("payment_subscriptions").upsert({
          zivosmedia_user_id: zivosmediaUserId,
          business_id: businessId,
          software_product_id: softwareProductId,
          provider: "stripe",
          provider_subscription_id: subscription.id,
          provider_customer_id: customerId,
          provider_price_id: item?.price?.id ?? null,
          plan_name: metadata.plan_name || item?.price?.nickname || null,
          billing_interval: metadata.billing_interval || item?.price?.recurring?.interval || null,
          status: mapSubscriptionStatus(subscription.status),
          trial_start: stripeTime(subscription.trial_start),
          trial_end: stripeTime(subscription.trial_end),
          current_period_start: stripeTime(subscription.current_period_start),
          current_period_end: stripeTime(subscription.current_period_end),
          cancel_at: stripeTime(subscription.cancel_at),
          cancelled_at: stripeTime(subscription.canceled_at),
          metadata,
        }, { onConflict: "provider,provider_subscription_id" });

        const { data: localSub } = await admin
          .from("payment_subscriptions")
          .select("id")
          .eq("provider", "stripe")
          .eq("provider_subscription_id", subscription.id)
          .maybeSingle();

        if (businessId && softwareProductId && localSub?.id) {
          const localStatus = mapSubscriptionStatus(subscription.status);
          await admin.from("business_software_entitlements").upsert({
            business_id: businessId,
            zivosmedia_user_id: zivosmediaUserId,
            software_product_id: softwareProductId,
            payment_subscription_id: localSub.id,
            provider: "stripe",
            provider_subscription_id: subscription.id,
            status: localStatus,
            current_period_start: stripeTime(subscription.current_period_start),
            current_period_end: stripeTime(subscription.current_period_end),
            trial_end: stripeTime(subscription.trial_end),
            activated_at: ["trialing", "active"].includes(localStatus) ? new Date().toISOString() : null,
            cancelled_at: localStatus === "cancelled" ? stripeTime(subscription.canceled_at) ?? new Date().toISOString() : null,
            metadata,
          }, { onConflict: "business_id,software_product_id" });
        }
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id ?? null;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;
        const { data: sub } = subscriptionId
          ? await admin.from("payment_subscriptions").select("id, zivosmedia_user_id, business_id").eq("provider", "stripe").eq("provider_subscription_id", subscriptionId).maybeSingle()
          : { data: null };
        if (!sub && !customerId) break;
        const zivosmediaUserId = sub?.zivosmedia_user_id || optionalUuid(invoice.metadata?.zivosmedia_user_id);
        if (!zivosmediaUserId) break;

        await admin.from("payment_invoices").upsert({
          subscription_id: sub?.id ?? null,
          zivosmedia_user_id: zivosmediaUserId,
          business_id: sub?.business_id ?? optionalUuid(invoice.metadata?.business_id),
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
        }, { onConflict: "provider,provider_invoice_id" });

        if (sub?.id && event.type === "invoice.payment_failed") {
          await admin.from("payment_subscriptions").update({ status: "past_due", updated_at: new Date().toISOString() }).eq("id", sub.id);
        }
        if (sub?.id && event.type === "invoice.paid") {
          await admin.from("payment_subscriptions").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", sub.id);
        }
        break;
      }

      case "payout.paid":
      case "payout.failed": {
        const payout = event.data.object;
        await admin.from("driver_payouts").update({
          status: event.type === "payout.paid" ? "paid" : "failed",
          paid_at: event.type === "payout.paid" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        }).eq("provider", "stripe").eq("provider_payout_id", payout.id);
        break;
      }
    }

    await admin.from("payment_webhook_events").update({
      processed: true,
      processed_at: new Date().toISOString(),
      processing_error: null,
    }).eq("provider", "stripe").eq("provider_event_id", event.id);

    await auditPaymentEvent(admin, {
      event_type: `stripe_webhook_${event.type}`,
      source_platform: sourcePlatform,
      success: true,
      metadata: { provider_event_id: event.id },
    });

    return json(cors, { received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await admin.from("payment_webhook_events").update({
      processing_error: message,
      retry_count: 1,
    }).eq("provider", "stripe").eq("provider_event_id", event.id);

    await auditPaymentEvent(admin, {
      event_type: `stripe_webhook_${event.type}`,
      source_platform: sourcePlatform,
      success: false,
      error_message: message,
      metadata: { provider_event_id: event.id },
    });

    return json(cors, { error: message }, 500);
  }
}, {
  strictCors: false,
  allowedMethods: ["POST"],
  strictCors: true,
  skipBotDetection: true,
  skipWaf: true,
}));
