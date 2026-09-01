import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

const expectSecurityRoute = (text: string, route: string) => {
  expect(text).toMatch(new RegExp(`withSecurity\\(\\s*"${route}"`));
};

describe("webhook failure alerting contracts", () => {
  it("keeps provider webhook handlers idempotent, signed, and exempt from browser-only defenses", () => {
    const providers = [
      ["stripe-webhook", "supabase/functions/stripe-webhook/index.ts"],
      ["paypal-grocery-webhook", "supabase/functions/paypal-grocery-webhook/index.ts"],
      ["square-grocery-webhook", "supabase/functions/square-grocery-webhook/index.ts"],
      ["stripe-lodging-webhook", "supabase/functions/stripe-lodging-webhook/index.ts"],
      ["paypal-lodging-webhook", "supabase/functions/paypal-lodging-webhook/index.ts"],
      ["square-lodging-webhook", "supabase/functions/square-lodging-webhook/index.ts"],
    ] as const;

    for (const [route, relativePath] of providers) {
      const text = source(relativePath);
      expectSecurityRoute(text, route);
      expect(text).toContain("strictCors: true");
      expect(text).toContain('trackNetwork: "suspicious"');
      expect(text).toContain("skipWaf: true");
      expect(text).toContain("skipBotDetection: true");
      expect(text).not.toContain('"Access-Control-Allow-Origin": "*"');
      expect(text).not.toContain("'Access-Control-Allow-Origin': '*'");
    }

    const stripe = source("supabase/functions/stripe-webhook/index.ts");
    const stripeRide = source("supabase/functions/stripe-ride-webhook/index.ts");
    const stripeCarRental = source("supabase/functions/stripe-car-rental-webhook/index.ts");
    expect(stripe).toContain("stripe.webhooks.constructEvent");
    expect(stripe).toContain('allowedMethods: ["POST"]');
    expect(stripeRide).toContain('allowedMethods: ["POST"]');
    expect(stripeCarRental).toContain('allowedMethods: ["POST"]');
    expect(stripe).toContain("stripe-signature");
    expect(stripe).toContain("payment_intent");
    expect(stripe).toContain("idempotency");
    expect(stripe).toContain("purchase_records");
    expect(stripe).toContain("flight_payment_audit_log");

    const paypalGrocery = source("supabase/functions/paypal-grocery-webhook/index.ts");
    const squareGrocery = source("supabase/functions/square-grocery-webhook/index.ts");
    expect(paypalGrocery).toContain("paypal_order_id");
    expect(paypalGrocery).toContain("paypal_capture_id");
    expect(paypalGrocery).toContain("shopping_orders");
    expect(squareGrocery).toContain("square_payment_id");
    expect(squareGrocery).toContain("shopping_orders");
  });

  it("keeps admin webhook status pages showing failures, mismatches, filters, and exports", () => {
    const statusPage = source("src/pages/admin/AdminWebhookStatusPage.tsx");
    const lodgingEvents = source("src/pages/admin/AdminLodgingWebhookEventsPage.tsx");
    const app = source("src/App.tsx");

    expect(app).toContain('path="/admin/payments/webhook-status"');
    expect(app).toContain('path="/admin/lodging/webhook-events"');

    for (const needle of [
      'supabase.from("webhook_events")',
      '.from("ride_requests")',
      "Mismatch alerts",
      "PaymentIntent",
      "payment_intent.payment_failed",
      "Rides with PaymentIntent but no webhook update",
    ]) {
      expect(statusPage).toContain(needle);
    }

    for (const needle of [
      "lodging_stripe_webhook_events",
      "processing_status",
      "error_message",
      "Last 200 Stripe webhook events",
      "Export CSV",
      "downloadWebhookEventsCsv",
      "statusConfig",
      "error",
    ]) {
      expect(lodgingEvents).toContain(needle);
    }
  });

  it("keeps webhook replay and incident response documented in tests and runbooks", () => {
    const paymentWorkflow = source("src/test/workflows/payments-refunds-webhooks.test.ts");
    const idempotencyTest = source("src/test/paymentWebhookIdempotency.test.ts");
    const customerWorkflow = source("src/test/workflows/customer-booking-order.test.ts");
    const apiWorkflow = source("src/test/workflows/api-operations-readiness.test.ts");
    const runbook = source("docs/api-operations-runbook.md");
    const e2eFallback = source("tests/e2e/server-error-fallbacks.spec.ts");

    for (const needle of [
      "grocery_paypal_webhook_events",
      "grocery_square_webhook_events",
      "keeps provider webhooks idempotent and provider-authoritative",
      "paymentWebhookIdempotency",
    ]) {
      expect(paymentWorkflow).toContain(needle);
    }

    for (const needle of [
      "Stripe webhook purchase writes idempotent",
      "payment confirmation notifications idempotent",
      "idempotencyKey",
    ]) {
      expect(idempotencyTest).toContain(needle);
    }
    expect(customerWorkflow).toContain("Webhook safety net for grocery orders");

    expect(apiWorkflow).toContain("webhook failures");
    expect(apiWorkflow).toContain("payment mismatches");
    expect(runbook).toContain("Webhook failure");
    expect(runbook).toContain("Replay provider event after idempotency check");
    expect(runbook).toContain("pending payment mismatch older than 5 minutes");
    expect(e2eFallback).toContain("api observability workflow keeps backend incident ownership documented");
  });

  it("keeps cron and maintenance routes ready to alert operators before customers notice", () => {
    const cronRoutes = [
      "lodging-wiring-monitor",
      "marketing-automations-tick",
      "process-security-notifications",
      "schedule-fire",
      "secret-media-prune",
      "security-cleanup",
      "salon-low-stock-digest",
      "refresh-smart-deals",
      "refresh-popular-routes",
    ];

    for (const route of cronRoutes) {
      const text = source(`supabase/functions/${route}/index.ts`);
      expectSecurityRoute(text, route);
      expect(text).toContain("strictCors: true");
      expect(text).toContain('trackNetwork: "suspicious"');
      expect(text).toContain("blockNetworkRiskAt: 80");
      if (route === "marketing-automations-tick") {
        expect(text).toContain("isAuthorizedInternalCron");
        expect(text).toContain("getInternalCronReadinessFailurePayload");
      } else {
        expect(text).toContain("x-cron-secret");
      }
      expect(text).toContain("skipBotDetection: true");
      expect(text).not.toContain('"Access-Control-Allow-Origin": "*"');
    }

    const wiring = source("supabase/functions/lodging-wiring-monitor/index.ts");
    const securityQueue = source("supabase/functions/process-security-notifications/index.ts");
    const cleanup = source("supabase/functions/security-cleanup/index.ts");

    expect(wiring).toContain("lodging_wiring_report");
    expect(wiring).toContain("send-admin-alert");
    expect(securityQueue).toContain("dequeue_security_notifications");
    expect(securityQueue).toContain("send-transactional-email");
    expect(cleanup).toContain("prune_expired_ip_blocklist");
    expect(cleanup).toContain("security_notification_queue");
  });
});
