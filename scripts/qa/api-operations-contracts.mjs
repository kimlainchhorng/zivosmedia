#!/usr/bin/env node
/**
 * API, server speed, and operations readiness contract check.
 *
 * Verifies Edge Function observability, preflight artifacts, runtime settings,
 * webhook/payment operations visibility, and documented alert ownership.
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
  // Normalize CRLF -> LF so multiline assertions are line-ending agnostic
  // (Windows/OneDrive checkouts with core.autocrlf=true yield CRLF files).
  return readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function requireContains(id, text, needle, relativePath) {
  if (!text.includes(needle)) {
    failures.push(`${id}: ${relativePath} missing ${JSON.stringify(needle)}`);
  }
}

function requireNotContains(id, text, needle, relativePath) {
  if (text.includes(needle)) {
    failures.push(`${id}: ${relativePath} must not contain ${JSON.stringify(needle)}`);
  }
}

function requireStrictSecurity(id, route, text) {
  const relativePath = `supabase/functions/${route}/index.ts`;
  requireContains(id, text, `withSecurity("${route}"`, relativePath);
  requireContains(id, text, "strictCors: true", relativePath);
  requireContains(id, text, 'trackNetwork: "suspicious"', relativePath);
  requireContains(id, text, "blockNetworkRiskAt: 80", relativePath);
  requireNotContains(id, text, '"Access-Control-Allow-Origin": "*"', relativePath);
  requireNotContains(id, text, "'Access-Control-Allow-Origin': '*'", relativePath);
}

const contracts = [
  {
    id: "edge-wrapper-observability",
    category: "edge-functions",
    check() {
      const wrapperPath = "supabase/functions/_shared/withSecurity.ts";
      const auditPath = "supabase/functions/_shared/audit.ts";
      const limiterPath = "supabase/functions/_shared/rateLimiter.ts";
      const readinessPath = "scripts/security/api-readiness-check.mjs";
      const wrapper = source(wrapperPath);
      const audit = source(auditPath);
      const limiter = source(limiterPath);
      const readiness = source(readinessPath);

      for (const needle of [
        "x-request-id",
        "request_completed",
        "request_failed",
        "err(req, 'Internal error', 500",
        "recordSecurityEvent",
        "recordNetworkEvent",
        "rateLimit(ip, opts.rateLimit)",
      ]) {
        requireContains(this.id, wrapper, needle, wrapperPath);
      }
      for (const table of ["security_events", "network_security_events", "audit_logs"]) {
        requireContains(this.id, audit, table, auditPath);
      }
      for (const needle of ["auth_login", "payment", "search", "upload", "rateLimitDb"]) {
        requireContains(this.id, limiter, needle, limiterPath);
      }
      for (const needle of [
        "highRiskFunctionName",
        "looseRouteBacklog",
        "methodGated",
        "missingMethodGate",
        "highRiskMissingMethodGate",
        "Method-gated Edge Functions",
        "High-Risk Functions Missing allowedMethods",
        "edge-function-security-backlog",
        "Every Edge Function must use withSecurity()",
        "checkOperationsRunbook",
        "api-operations-runbook.md",
      ]) {
        requireContains(this.id, readiness, needle, readinessPath);
      }
    },
  },
  {
    id: "preflight-and-runtime-artifacts",
    category: "release-gates",
    check() {
      const packagePath = "package.json";
      const preflightPath = "scripts/deploy/preflight.mjs";
      const summaryCheckPath = "scripts/deploy/check-preflight-summary.mjs";
      const artifactCheckPath = "scripts/deploy/check-preflight-artifacts.mjs";
      const schemaPath = "scripts/deploy/test-preflight-summary-schema.mjs";
      const runtimePath = "scripts/supabase/runtime-settings-sql.mjs";
      const envPath = "scripts/deploy/env-preflight.mjs";
      const packageJson = source(packagePath);
      const preflight = source(preflightPath);
      const summaryCheck = source(summaryCheckPath);
      const artifactCheck = source(artifactCheckPath);
      const schema = source(schemaPath);
      const runtime = source(runtimePath);
      const env = source(envPath);

      for (const scriptName of [
        "deploy:preflight:strict",
        "deploy:preflight:test-summary-schema",
        "deploy:preflight:check-artifacts",
        "deploy:preflight:check-production-summary",
        "supabase:runtime-settings:sql",
        "security:api-readiness:report",
      ]) {
        requireContains(this.id, packageJson, `"${scriptName}"`, packagePath);
      }

      for (const needle of [
        "production-preflight-summary.json",
        "Supabase deploy environment",
        "Supabase runtime settings SQL",
        "API readiness",
        "Production build",
        "buildBlockers",
        "Missing SUPABASE_URL",
        "Missing SUPABASE_ANON_KEY",
        "Missing SUPABASE_ACCESS_TOKEN",
      ]) {
        requireContains(this.id, preflight, needle, preflightPath);
      }

      for (const needle of ["schemaVersion", "mode", "artifacts", "failedCommands", "blockers"]) {
        requireContains(this.id, schema, needle, schemaPath);
      }
      for (const needle of ["max-age-minutes", "require-mode", "production", "Remote migration history status"]) {
        requireContains(this.id, summaryCheck, needle, summaryCheckPath);
      }
      for (const needle of ["validateCsvHeader", "production-preflight-summary.json", "preflight-artifacts: ok"]) {
        requireContains(this.id, artifactCheck, needle, artifactCheckPath);
      }
      for (const needle of [
        "app.settings.supabase_url",
        "app.settings.supabase_anon_key",
        "--emit-secrets",
        "Strict mode requires a legacy anon JWT",
        "Refusing to use a Supabase secret/service_role key",
      ]) {
        requireContains(this.id, runtime, needle, runtimePath);
      }
      for (const needle of ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ACCESS_TOKEN"]) {
        requireContains(this.id, env, needle, envPath);
      }
    },
  },
  {
    id: "operations-runbook-alert-owners",
    category: "runbook",
    check() {
      const runbookPath = "docs/api-operations-runbook.md";
      const readinessPath = "scripts/security/api-readiness-check.mjs";
      const workflowPath = "scripts/qa/workflow-coverage.mjs";
      const runbook = source(runbookPath);
      const readiness = source(readinessPath);
      const workflow = source(workflowPath);

      for (const phrase of [
        "Function 5xx",
        "Webhook failure",
        "Slow query",
        "Auth spike",
        "Payment spike",
        "Primary owner",
        "Supabase Edge Function logs",
        "pg_stat_statements",
        "rate_limits",
        "security_events",
        "network_security_events",
        "x-request-id",
        "method gate backlog",
        "wrapper-level `allowedMethods`",
      ]) {
        requireContains(this.id, runbook, phrase, runbookPath);
      }
      for (const phrase of [
        "function 5xx",
        "webhook failure",
        "slow query",
        "auth spike",
        "payment spike",
        "checkOperationsRunbook",
        "api-operations-runbook.md",
      ]) {
        requireContains(this.id, readiness, phrase, readinessPath);
      }
      requireContains(this.id, workflow, "qa:api-operations-contracts", workflowPath);
    },
  },
  {
    id: "webhook-and-payment-ops-surfaces",
    category: "payments",
    check() {
      const webhookStatusPath = "src/pages/admin/AdminWebhookStatusPage.tsx";
      const lodgingEventsPath = "src/pages/admin/AdminLodgingWebhookEventsPage.tsx";
      const paymentsWorkflowPath = "src/test/workflows/payments-refunds-webhooks.test.ts";
      const stripePath = "supabase/functions/stripe-webhook/index.ts";
      const paypalPath = "supabase/functions/paypal-grocery-webhook/index.ts";
      const squarePath = "supabase/functions/square-grocery-webhook/index.ts";
      const webhookStatus = source(webhookStatusPath);
      const lodgingEvents = source(lodgingEventsPath);
      const paymentsWorkflow = source(paymentsWorkflowPath);

      for (const needle of [
        'supabase.from("webhook_events")',
        "Mismatch alerts",
        "payment_failed",
        "PaymentIntent",
      ]) {
        requireContains(this.id, webhookStatus, needle, webhookStatusPath);
      }
      for (const needle of ["lodging_stripe_webhook_events", "Last 200 Stripe webhook events"]) {
        requireContains(this.id, lodgingEvents, needle, lodgingEventsPath);
      }
      for (const needle of ["grocery_paypal_webhook_events", "grocery_square_webhook_events", "paymentWebhookIdempotency"]) {
        requireContains(this.id, paymentsWorkflow, needle, paymentsWorkflowPath);
      }
      for (const [route, relativePath] of [
        ["stripe-webhook", stripePath],
        ["paypal-grocery-webhook", paypalPath],
        ["square-grocery-webhook", squarePath],
      ]) {
        const text = source(relativePath);
        requireContains(this.id, text, `withSecurity("${route}"`, relativePath);
        requireContains(this.id, text, "strictCors: true", relativePath);
        requireContains(this.id, text, 'trackNetwork: "suspicious"', relativePath);
        requireContains(this.id, text, "skipWaf: true", relativePath);
        requireContains(this.id, text, "skipBotDetection: true", relativePath);
        requireNotContains(this.id, text, '"Access-Control-Allow-Origin": "*"', relativePath);
        requireNotContains(this.id, text, "'Access-Control-Allow-Origin': '*'", relativePath);
      }
      for (const needle of ["stripe.webhooks.constructEvent", "stripe-signature", "payment_intent", "payment_status"]) {
        requireContains(this.id, source(stripePath), needle, stripePath);
      }
    },
  },
  {
    id: "cron-monitor-and-maintenance-routes",
    category: "cron",
    check() {
      const routes = [
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
      for (const route of routes) {
        const relativePath = `supabase/functions/${route}/index.ts`;
        const text = source(relativePath);
        requireStrictSecurity(this.id, route, text);
        requireContains(this.id, text, "x-cron-secret", relativePath);
        requireContains(this.id, text, "skipBotDetection: true", relativePath);
      }

      const wiring = source("supabase/functions/lodging-wiring-monitor/index.ts");
      requireContains(this.id, wiring, "lodging_wiring_report", "supabase/functions/lodging-wiring-monitor/index.ts");
      requireContains(this.id, wiring, "send-admin-alert", "supabase/functions/lodging-wiring-monitor/index.ts");

      const securityQueue = source("supabase/functions/process-security-notifications/index.ts");
      requireContains(this.id, securityQueue, "dequeue_security_notifications", "supabase/functions/process-security-notifications/index.ts");
      requireContains(this.id, securityQueue, "send-transactional-email", "supabase/functions/process-security-notifications/index.ts");

      const cleanup = source("supabase/functions/security-cleanup/index.ts");
      requireContains(this.id, cleanup, "prune_expired_ip_blocklist", "supabase/functions/security-cleanup/index.ts");
      requireContains(this.id, cleanup, "security_notification_queue", "supabase/functions/security-cleanup/index.ts");
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
