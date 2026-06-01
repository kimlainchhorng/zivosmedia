import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

const json = (relativePath: string) => JSON.parse(source(relativePath));

describe("API operations report and incident surface contracts", () => {
  it("keeps generated API readiness attached to production preflight artifacts", () => {
    const apiReport = source("docs/api-readiness-report.md");
    const summary = json("docs/production-preflight-summary.json");

    expect(apiReport).toContain("- Critical findings: 0");
    expect(apiReport).toContain("- Warnings: 1");
    expect(apiReport).toContain("- Functions using withSecurity():");
    expect(apiReport).toContain("- Functions using strictCorsHeaders():");
    expect(apiReport).toContain("- Loose Edge Function security backlog: 0");
    expect(apiReport).toContain("- API operations runbook: present (0 missing topics)");
    expect(apiReport).toContain("[migration-history-unavailable]");
    expect(apiReport).toContain("Keep new high-risk Edge Functions on `withSecurity()` and strict CORS from the first commit.");

    expect(summary.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "api-readiness", title: "API readiness", status: "passed" }),
      ]),
    );
    expect(summary.artifacts.apiReadiness).toBe("docs/api-readiness-report.md");
    expect(summary.artifactMeta.apiReadiness.exists).toBe(true);
    expect(summary.counts.apiCritical).toBe(0);
    expect(summary.counts.apiWarnings).toBe(1);
  });

  it("keeps admin webhook incident pages queryable, filterable, and exportable", () => {
    const webhookStatus = source("src/pages/admin/AdminWebhookStatusPage.tsx");
    const lodgingEvents = source("src/pages/admin/AdminLodgingWebhookEventsPage.tsx");
    const csv = source("src/lib/admin/webhookEventsCsv.ts");
    const app = source("src/App.tsx");

    expect(app).toContain('path="/admin/payments/webhook-status"');
    expect(app).toContain('path="/admin/lodging/webhook-events"');

    for (const needle of [
      'supabase.from("webhook_events")',
      '.from("ride_requests")',
      "Mismatch alerts",
      "payment_intent.payment_failed",
      "Rides with PaymentIntent but no webhook update",
      "PaymentIntent",
    ]) {
      expect(webhookStatus).toContain(needle);
    }

    for (const needle of [
      "lodging_stripe_webhook_events",
      "processing_status",
      "error_message",
      "Last 200 Stripe webhook events",
      "Export CSV",
      "downloadWebhookEventsCsv",
      "statusConfig",
      "status) q = q.eq(\"processing_status\", status)",
    ]) {
      expect(lodgingEvents).toContain(needle);
    }

    for (const needle of [
      "stripe_event_id",
      "event_type",
      "processing_status",
      "error_message",
      "lodging-webhook-events-",
      "text/csv;charset=utf-8",
    ]) {
      expect(csv).toContain(needle);
    }
  });

  it("keeps API operations wired into platform audit, workflow coverage, and incident runbooks", () => {
    const packageJson = source("package.json");
    const matrix = source("scripts/qa/platform-readiness-matrix.mjs");
    const coverage = source("scripts/qa/workflow-coverage.mjs");
    const apiContracts = source("scripts/qa/api-operations-contracts.mjs");
    const runbook = source("docs/api-operations-runbook.md");
    const e2eFallback = source("tests/e2e/server-error-fallbacks.spec.ts");

    expect(packageJson).toContain('"qa:api-operations-contracts": "node scripts/qa/api-operations-contracts.mjs"');
    expect(packageJson).toContain("npm run qa:api-operations-contracts");
    expect(matrix).toContain("api-server-operations");
    expect(matrix).toContain("npm run qa:api-operations-contracts");
    expect(matrix).toContain("src/test/apiObservabilityContracts.test.ts");
    expect(matrix).toContain("src/test/apiOperationsReportSurfaces.test.ts");
    expect(matrix).toContain("tests/e2e/server-error-fallbacks.spec.ts");
    expect(coverage).toContain("qa:api-operations-contracts");
    expect(coverage).toContain("webhook failure");
    expect(coverage).toContain("5xx");
    expect(coverage).toContain("slow");

    for (const contractId of [
      "edge-wrapper-observability",
      "preflight-and-runtime-artifacts",
      "operations-runbook-alert-owners",
      "webhook-and-payment-ops-surfaces",
      "cron-monitor-and-maintenance-routes",
    ]) {
      expect(apiContracts).toContain(contractId);
    }

    for (const phrase of [
      "Function 5xx",
      "Webhook failure",
      "Slow query",
      "Auth spike",
      "Payment spike",
      "x-request-id",
      "Replay provider event after idempotency check",
    ]) {
      expect(runbook).toContain(phrase);
    }

    expect(e2eFallback).toContain("api observability workflow keeps backend incident ownership documented");
  });
});
