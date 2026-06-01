import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("API observability contracts", () => {
  it("keeps edge requests correlated, logged, rate limited, and visible in readiness", () => {
    const wrapper = source("supabase/functions/_shared/withSecurity.ts");
    const audit = source("supabase/functions/_shared/audit.ts");
    const limiter = source("supabase/functions/_shared/rateLimiter.ts");
    const readiness = source("scripts/security/api-readiness-check.mjs");
    const runbook = source("docs/api-operations-runbook.md");

    for (const needle of [
      "x-request-id",
      "newCorrelationId(req)",
      "request_completed",
      "request_failed",
      "err(req, 'Internal error', 500",
      "recordSecurityEvent",
      "recordNetworkEvent",
      "rateLimit(ip, opts.rateLimit)",
      "rateLimitHeaders",
      "SECURITY_RESPONSE_HEADERS",
    ]) {
      expect(wrapper).toContain(needle);
    }

    for (const table of ["security_events", "network_security_events", "audit_logs"]) {
      expect(audit).toContain(table);
    }

    for (const category of ["auth_login", "auth_otp", "payment", "search", "upload", "admin_action", "api_general"]) {
      expect(limiter).toContain(category);
    }
    expect(limiter).toContain("rateLimitDb");
    expect(limiter).toContain("rate_limit_check");
    expect(limiter).toContain("Fail-open with in-memory fallback");

    for (const phrase of [
      "checkOperationsRunbook",
      "api-operations-runbook.md",
      "function 5xx",
      "webhook failure",
      "slow query",
      "auth spike",
      "payment spike",
      "looseRouteBacklog",
      "Every Edge Function must use withSecurity()",
    ]) {
      expect(readiness).toContain(phrase);
    }

    for (const phrase of [
      "Function 5xx",
      "Webhook failure",
      "Slow query",
      "Auth spike",
      "Payment spike",
      "x-request-id",
      "pg_stat_statements",
    ]) {
      expect(runbook).toContain(phrase);
    }
  });

  it("keeps client-side request health and render-error telemetry wired", () => {
    const app = source("src/App.tsx");
    const requestHealth = source("src/lib/requestHealth.ts");
    const requestBadge = source("src/components/dev/RequestHealthBadge.tsx");
    const errorReporting = source("src/lib/security/errorReporting.ts");
    const globalBoundary = source("src/components/shared/ErrorBoundary.tsx");
    const routeBoundary = source("src/components/shared/RouteErrorBoundary.tsx");

    for (const needle of [
      "new QueryCache",
      "new MutationCache",
      "recordRequestIssue",
      'scope: "query"',
      'scope: "mutation"',
      'scope: "retry"',
      "categorizeError(error)",
      "extractHttpStatus(error)",
      "RequestHealthBadge",
      "SHOW_REQUEST_HEALTH_BADGE",
    ]) {
      expect(app).toContain(needle);
    }

    for (const bucket of [
      "totalIssues",
      "byScope",
      "byCategory",
      "byRoute",
      "byStatus",
      "recent",
      "MAX_RECENT_ISSUES",
      "useSyncExternalStore",
      "clearRequestHealth",
    ]) {
      expect(requestHealth).toContain(bucket);
    }

    for (const needle of [
      "useRequestHealthSnapshot",
      "clearRequestHealth",
      "summary.total",
      "summary.topStatus",
      "summary.network",
      "summary.auth",
      "summary.retry",
      "summary.home",
      "summary.feed",
      "summary.reels",
      "summary.chat",
      "summary.profile",
    ]) {
      expect(requestBadge).toContain(needle);
    }

    expect(errorReporting).toContain('event_name: "client_error"');
    expect(errorReporting).toContain('event_name: "client_error_boundary"');
    expect(errorReporting).toContain('new CustomEvent("zivo:client-error"');
    expect(errorReporting).toContain("report_id: reportId");
    expect(globalBoundary).toContain("reportBoundaryError");
    expect(globalBoundary).toContain("Support code:");
    expect(routeBoundary).toContain("reportBoundaryError");
    expect(routeBoundary).toContain("Support code:");
  });

  it("keeps API operations contract scripts and workflow reports in the platform audit", () => {
    const packageJson = source("package.json");
    const workflowCoverage = source("scripts/qa/workflow-coverage.mjs");
    const workflowTestPlan = source("scripts/qa/workflow-test-plan.mjs");
    const apiContracts = source("scripts/qa/api-operations-contracts.mjs");
    const platformMatrix = source("scripts/qa/platform-readiness-matrix.mjs");

    expect(packageJson).toContain('"qa:api-operations-contracts": "node scripts/qa/api-operations-contracts.mjs"');
    expect(packageJson).toContain("npm run qa:api-operations-contracts");
    expect(workflowCoverage).toContain("qa:api-operations-contracts");
    expect(workflowCoverage).toContain("5xx");
    expect(workflowCoverage).toContain("webhook failure");
    expect(workflowCoverage).toContain("slow");
    expect(workflowTestPlan).toContain("health/error visibility");

    for (const contractId of [
      "edge-wrapper-observability",
      "preflight-and-runtime-artifacts",
      "operations-runbook-alert-owners",
      "webhook-and-payment-ops-surfaces",
      "cron-monitor-and-maintenance-routes",
    ]) {
      expect(apiContracts).toContain(contractId);
    }

    expect(platformMatrix).toContain("src/test/apiObservabilityContracts.test.ts");
    expect(platformMatrix).toContain("src/test/webhookFailureAlerting.test.ts");
  });
});
