#!/usr/bin/env node
/**
 * Payments, refunds, and webhook contract check.
 *
 * Verifies provider-authoritative webhooks, idempotent refunds, subscription
 * portal security, customer/host refund states, and RLS/audit ledger coverage.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function source(relativePath) {
  const file = path.join(root, relativePath);
  if (!existsSync(file)) {
    failures.push(`missing file: ${relativePath}`);
    return "";
  }
  return readFileSync(file, "utf8");
}

function requireContains(id, text, needle, relativePath) {
  if (!text.includes(needle)) {
    failures.push(`${id}: ${relativePath} missing ${JSON.stringify(needle)}`);
  }
}

function requirePostPaymentRoute(id, text, relativePath, risk = "blockNetworkRiskAt: 80") {
  requireContains(id, text, "strictCors: true", relativePath);
  requireContains(id, text, 'allowedMethods: ["POST"]', relativePath);
  requireContains(id, text, 'trackNetwork: "suspicious"', relativePath);
  requireContains(id, text, risk, relativePath);
}

const contracts = [
  {
    id: "provider-authoritative-webhooks",
    category: "webhooks",
    check() {
      const stripePath = "supabase/functions/stripe-webhook/index.ts";
      const paypalPath = "supabase/functions/paypal-grocery-webhook/index.ts";
      const squarePath = "supabase/functions/square-grocery-webhook/index.ts";
      const paypalEatsPath = "supabase/functions/paypal-eats-webhook/index.ts";
      const squareEatsPath = "supabase/functions/square-eats-webhook/index.ts";
      const paypalTipPath = "supabase/functions/paypal-tip-webhook/index.ts";
      const squareTipPath = "supabase/functions/square-tip-webhook/index.ts";
      const createPath = "supabase/functions/create-grocery-payment-intent/index.ts";
      const confirmPath = "supabase/functions/confirm-grocery-payment/index.ts";
      const stripe = source(stripePath);
      const paypal = source(paypalPath);
      const square = source(squarePath);
      const paypalEats = source(paypalEatsPath);
      const squareEats = source(squareEatsPath);
      const paypalTip = source(paypalTipPath);
      const squareTip = source(squareTipPath);
      const create = source(createPath);
      const confirm = source(confirmPath);
      requirePostPaymentRoute(this.id, create, createPath);
      requirePostPaymentRoute(this.id, confirm, confirmPath);

      for (const needle of [
        'withSecurity("stripe-webhook"',
        "constructEvent",
        "upsert(payload, { onConflict: 'transaction_id' })",
        "Webhook safety net for grocery orders",
        '.eq("stripe_payment_intent_id", paymentIntent.id)',
        "notifyGroceryOrderConfirmed",
      ]) {
        requireContains(this.id, stripe, needle, stripePath);
      }
      for (const [relativePath, text] of [
        [paypalPath, paypal],
        [squarePath, square],
      ]) {
        for (const needle of [
          "withSecurity",
          "signature_invalid",
          "ignoreDuplicates: true",
          "processing_status",
          '.from("shopping_orders")',
          "payment_status",
          "refunded",
        ]) {
          requireContains(this.id, text, needle, relativePath);
        }
      }
      requireContains(this.id, paypal, "grocery_paypal_webhook_events", paypalPath);
      requireContains(this.id, square, "grocery_square_webhook_events", squarePath);
      for (const [relativePath, text, table] of [
        [paypalEatsPath, paypalEats, "eats_paypal_webhook_events"],
        [squareEatsPath, squareEats, "eats_square_webhook_events"],
        [paypalTipPath, paypalTip, "tip_paypal_webhook_events"],
        [squareTipPath, squareTip, "tip_square_webhook_events"],
      ]) {
        for (const needle of [
          "withSecurity",
          "signature_invalid",
          "ignoreDuplicates: true",
          "dedup: true",
          "processing_status",
          "skipWaf: true",
          "skipBotDetection: true",
          table,
        ]) {
          requireContains(this.id, text, needle, relativePath);
        }
      }
      requireContains(this.id, create, "stripe_payment_intent_id: paymentIntent.id", createPath);
      requireContains(this.id, create, 'payment_provider: "stripe"', createPath);
      requireContains(this.id, confirm, "paymentIntent.metadata?.order_id", confirmPath);
      requireContains(this.id, confirm, "orderRecord.user_id !== user.id", confirmPath);
      requireContains(this.id, confirm, 'payment_status: "paid"', confirmPath);
    },
  },
  {
    id: "idempotent-scoped-refunds",
    category: "refunds",
    check() {
      const processPath = "supabase/functions/process-refund/index.ts";
      const carPath = "supabase/functions/refund-car-rental-deposit/index.ts";
      const idempotencyTestPath = "src/test/paymentWebhookIdempotency.test.ts";
      const checkoutRefundE2ePath = "tests/e2e/checkout-refund-state.spec.ts";
      const processRefund = source(processPath);
      const carRefund = source(carPath);
      const checkoutRefundE2e = source(checkoutRefundE2ePath);
      requirePostPaymentRoute(this.id, processRefund, processPath, "blockNetworkRiskAt: 85");
      requirePostPaymentRoute(this.id, carRefund, carPath);

      for (const needle of [
        'withSecurity("process-refund"',
        'rateLimit: "admin_action"',
        "admin role required",
        "scanContentForLinks(notes)",
        "const idempotencyKey = `ride_refund_",
        "stripe.refunds.create(",
        "{ idempotencyKey }",
        '.from("financial_ledger")',
        '.eq("stripe_reference", stripeRefundId)',
        "if (!existingLedger)",
        'action_type: "refund_processed"',
        'action_type: "refund_denied"',
        "partial_refund",
        "refunded",
      ]) {
        requireContains(this.id, processRefund, needle, processPath);
      }
      for (const needle of [
        'withSecurity("refund-car-rental-deposit"',
        'rateLimitDb(user.id, "payment")',
        "paymentIntents.cancel(",
        "stripe.refunds.create(",
        "idempotencyKey: `car_rental_dep_cancel_",
        "idempotencyKey: `car_rental_dep_refund_",
        'payment_status: "refunded"',
        'payment_status: refund.status === "succeeded" ? "refunded" : "refund_pending"',
      ]) {
        requireContains(this.id, carRefund, needle, carPath);
      }
      requireContains(this.id, source(idempotencyTestPath), "payment webhook and payout idempotency contracts", idempotencyTestPath);
      for (const needle of [
        "checkout and refund state contracts",
        "keeps admin refund processing idempotent",
        "keeps car rental refund state",
      ]) {
        requireContains(this.id, checkoutRefundE2e, needle, checkoutRefundE2ePath);
      }
    },
  },
  {
    id: "subscription-portal-strict-security",
    category: "subscriptions",
    check() {
      for (const relativePath of [
        "supabase/functions/check-zivo-plus/index.ts",
        "supabase/functions/zivo-plus-portal/index.ts",
      ]) {
        const text = source(relativePath);
        requirePostPaymentRoute(this.id, text, relativePath);
        for (const needle of [
          'withSecurity("',
          "const corsHeaders = ctx.corsHeaders",
          "strictCors: true",
          'trackNetwork: "suspicious"',
          "blockNetworkRiskAt: 80",
        ]) {
          requireContains(this.id, text, needle, relativePath);
        }
        if (text.includes('"Access-Control-Allow-Origin": "*"')) {
          failures.push(`${this.id}: ${relativePath} must not use wildcard CORS`);
        }
      }
      const checkPlusPath = "supabase/functions/check-zivo-plus/index.ts";
      const portalPath = "supabase/functions/zivo-plus-portal/index.ts";
      const checkPlus = source(checkPlusPath);
      const portal = source(portalPath);
      for (const [relativePath, text] of [
        ["supabase/functions/create-car-rental-deposit/index.ts", source("supabase/functions/create-car-rental-deposit/index.ts")],
        ["supabase/functions/create-lodging-deposit/index.ts", source("supabase/functions/create-lodging-deposit/index.ts")],
        ["supabase/functions/create-salon-deposit/index.ts", source("supabase/functions/create-salon-deposit/index.ts")],
        ["supabase/functions/submit-lodging-refund-dispute/index.ts", source("supabase/functions/submit-lodging-refund-dispute/index.ts")],
        ["supabase/functions/create-payment-intent/index.ts", source("supabase/functions/create-payment-intent/index.ts")],
        ["supabase/functions/create-ride-payment-intent/index.ts", source("supabase/functions/create-ride-payment-intent/index.ts")],
        ["supabase/functions/create-ride-payment/index.ts", source("supabase/functions/create-ride-payment/index.ts")],
        ["supabase/functions/capture-ride-payment/index.ts", source("supabase/functions/capture-ride-payment/index.ts")],
      ]) {
        requirePostPaymentRoute(this.id, text, relativePath);
      }
      requirePostPaymentRoute(this.id, source("supabase/functions/resolve-bakong-ride-refund/index.ts"), "supabase/functions/resolve-bakong-ride-refund/index.ts", "blockNetworkRiskAt: 85");
      requireContains(this.id, checkPlus, "zivo_subscriptions", checkPlusPath);
      requireContains(this.id, checkPlus, "subscriptions.list", checkPlusPath);
      requireContains(this.id, checkPlus, "return notSubscribed()", checkPlusPath);
      requireContains(this.id, portal, 'rateLimitDb(user.id, "payment")', portalPath);
      requireContains(this.id, portal, "billingPortal.sessions.create", portalPath);
    },
  },
  {
    id: "refund-state-ui-and-realtime",
    category: "frontend",
    check() {
      const files = {
        cancelSheet: "src/components/lodging/guest/CancelReservationSheet.tsx",
        disputeCard: "src/components/lodging/guest/RefundDisputeCard.tsx",
        disputeSheet: "src/components/lodging/guest/RefundDisputeSheet.tsx",
        disputeHook: "src/hooks/lodging/useLodgingRefundDisputes.ts",
        liveHook: "src/hooks/lodging/useReservationLive.ts",
        tripToasts: "src/hooks/lodging/useLodgingTripToasts.ts",
        hostToasts: "src/hooks/lodging/useHostLodgingOpsToasts.ts",
        paymentBadge: "src/components/lodging/LodgingPaymentBadge.tsx",
        opsSummary: "src/components/lodging/host/HostReservationOpsSummary.tsx",
      };
      const text = Object.fromEntries(Object.entries(files).map(([key, relativePath]) => [key, source(relativePath)]));

      for (const needle of [
        'supabase.functions.invoke("cancel-lodging-reservation"',
        "preview: true",
        "payment_method_outcome",
        "Refundable",
        "Non-refundable",
        "requestCancel.mutateAsync",
      ]) {
        requireContains(this.id, text.cancelSheet, needle, files.cancelSheet);
      }
      requireContains(this.id, text.disputeCard, 'id="refund-disputes"', files.disputeCard);
      requireContains(this.id, text.disputeCard, "Latest update", files.disputeCard);
      requireContains(this.id, text.disputeCard, "Resolution amount", files.disputeCard);
      requireContains(this.id, text.disputeSheet, "confirmContentSafe", files.disputeSheet);
      requireContains(this.id, text.disputeHook, '.from("lodge_refund_disputes"', files.disputeHook);
      requireContains(this.id, text.disputeHook, 'supabase.functions.invoke("submit-lodging-refund-dispute"', files.disputeHook);
      requireContains(this.id, text.disputeHook, 'queryKey: ["lodge-refund-disputes", reservationId]', files.disputeHook);
      requireContains(this.id, text.liveHook, "payment_status", files.liveHook);
      requireContains(this.id, text.liveHook, "stripe_payment_intent_id", files.liveHook);
      requireContains(this.id, text.liveHook, "lodge_reservation_audit", files.liveHook);
      requireContains(this.id, text.tripToasts, 'status === "refund_pending"', files.tripToasts);
      requireContains(this.id, text.tripToasts, 'status === "refunded"', files.tripToasts);
      requireContains(this.id, text.tripToasts, "Refund request submitted", files.tripToasts);
      requireContains(this.id, text.hostToasts, "New refund dispute", files.hostToasts);
      requireContains(this.id, text.paymentBadge, "refund_pending", files.paymentBadge);
      requireContains(this.id, text.paymentBadge, "refunded", files.paymentBadge);
      requireContains(this.id, text.opsSummary, "Cancelled/refund", files.opsSummary);
    },
  },
  {
    id: "payment-rls-audit-ledgers",
    category: "database",
    check() {
      const rideRefundsPath = "supabase/migrations/20260421190154_a493c5f5-dc62-44c8-8b79-b5e5cd56670d.sql";
      const lodgeAuditPath = "supabase/migrations/20260422050619_8f163271-e8eb-4475-b3da-298872286d4e.sql";
      const lodgeAuditFixPath = "supabase/migrations/20260422164931_4a75586f-2751-4663-bbc2-98c075d7e297.sql";
      const realtimePath = "supabase/migrations/20260422170713_20446c7d-eb8c-434b-b7ad-52d20fe52cdf.sql";
      const carSecurePath = "supabase/migrations/20260529170001_car_rental_secure_reservation_access.sql";
      const grantsPath = "supabase/migrations/20260531142721_data_api_grants_recent_public_tables.sql";
      const providerEventsPath = "supabase/migrations/20260601154600_payment_provider_webhook_event_logs.sql";
      const rideRefunds = source(rideRefundsPath);
      const providerEvents = source(providerEventsPath);

      for (const needle of [
        "CREATE TABLE IF NOT EXISTS public.ride_refund_requests",
        "ALTER TABLE public.ride_refund_requests ENABLE ROW LEVEL SECURITY",
        "Users create own ride refunds",
        "Users view own ride refunds",
        "Admins manage ride refunds",
        "CREATE TABLE IF NOT EXISTS public.financial_ledger",
        "Users view own ledger",
      ]) {
        requireContains(this.id, rideRefunds, needle, rideRefundsPath);
      }
      requireContains(this.id, source(lodgeAuditPath), "CREATE TABLE IF NOT EXISTS public.lodge_reservation_audit", lodgeAuditPath);
      requireContains(this.id, source(lodgeAuditPath), "ALTER TABLE public.lodge_reservation_audit ENABLE ROW LEVEL SECURITY", lodgeAuditPath);
      requireContains(this.id, source(lodgeAuditFixPath), "lodge_reservation_audit_reservation_id_fkey", lodgeAuditFixPath);
      requireContains(this.id, source(realtimePath), "lodge_reservation_audit in supabase_realtime", realtimePath);
      requireContains(this.id, source(carSecurePath), "get_car_rental_reservation_payment_status", carSecurePath);
      requireContains(this.id, source(carSecurePath), "GRANT EXECUTE ON FUNCTION public.get_car_rental_reservation_payment_status(uuid) TO anon, authenticated, service_role", carSecurePath);
      requireContains(this.id, source(grantsPath), "grant select, insert, update, delete on table public.store_payment_settings to authenticated;", grantsPath);
      requireContains(this.id, source(grantsPath), "grant select, insert, update, delete on table public.store_promotions to authenticated;", grantsPath);
      for (const [table, eventColumn] of [
        ["eats_paypal_webhook_events", "paypal_event_id TEXT NOT NULL UNIQUE"],
        ["eats_square_webhook_events", "square_event_id TEXT NOT NULL UNIQUE"],
        ["tip_paypal_webhook_events", "paypal_event_id TEXT NOT NULL UNIQUE"],
        ["tip_square_webhook_events", "square_event_id TEXT NOT NULL UNIQUE"],
      ]) {
        requireContains(this.id, providerEvents, `CREATE TABLE IF NOT EXISTS public.${table}`, providerEventsPath);
        requireContains(this.id, providerEvents, eventColumn, providerEventsPath);
        requireContains(this.id, providerEvents, `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`, providerEventsPath);
        requireContains(this.id, providerEvents, `ON public.${table} FOR SELECT TO authenticated`, providerEventsPath);
      }
    },
  },
];

for (const contract of contracts) contract.check();

console.log(JSON.stringify({
  generated: new Date().toISOString(),
  counts: {
    contracts: contracts.length,
    failures: failures.length,
  },
  contracts: contracts.map(({ id, category }) => ({ id, category })),
  failures,
}, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
