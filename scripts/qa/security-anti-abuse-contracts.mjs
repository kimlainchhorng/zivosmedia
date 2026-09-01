#!/usr/bin/env node
/**
 * Security, anti-abuse, and hacker-protection contract check.
 *
 * Verifies shared Edge Function defenses, attack drills, rate-limit decisions,
 * scanner/WAF controls, payment/booking abuse protections, and secret scanning.
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
    failures.push(
      `${id}: ${relativePath} must not contain ${JSON.stringify(needle)}`,
    );
  }
}

function requireMatch(id, text, pattern, relativePath) {
  if (!pattern.test(text)) {
    failures.push(`${id}: ${relativePath} missing pattern ${pattern}`);
  }
}

function requireNotMatch(id, text, pattern, relativePath) {
  if (pattern.test(text)) {
    failures.push(`${id}: ${relativePath} must not match ${pattern}`);
  }
}

function requireStrictRoute(id, route, expected) {
  const relativePath = `supabase/functions/${route}/index.ts`;
  const text = source(relativePath);
  requireContains(id, text, `withSecurity("${route}"`, relativePath);
  requireContains(id, text, "strictCors: true", relativePath);
  requireContains(id, text, 'allowedMethods: ["POST"]', relativePath);
  requireContains(id, text, 'trackNetwork: "suspicious"', relativePath);
  requireContains(id, text, expected.rateLimit, relativePath);
  requireContains(id, text, expected.risk, relativePath);
  requireNotContains(
    id,
    text,
    '"Access-Control-Allow-Origin": "*"',
    relativePath,
  );
  return text;
}

const contracts = [
  {
    id: "shared-edge-defense-wrapper",
    category: "edge-security",
    check() {
      const wrapperPath = "supabase/functions/_shared/withSecurity.ts";
      const corsPath = "supabase/functions/_shared/cors.ts";
      const readinessPath = "scripts/security/api-readiness-check.mjs";
      const wrapper = source(wrapperPath);
      const cors = source(corsPath);
      const readiness = source(readinessPath);

      for (const needle of [
        "inspectRequest",
        "detectBot",
        "isIpBlocked",
        "autoBlockIfHighThreat",
        "rateLimit(ip, opts.rateLimit)",
        "recordSecurityEvent",
        "recordNetworkEvent",
        "blockNetworkRiskAt",
        "allowedMethods",
        "Method not allowed",
        "Allow",
        "X-Content-Type-Options",
        "X-Frame-Options",
      ]) {
        requireContains(this.id, wrapper, needle, wrapperPath);
      }
      for (const needle of [
        "strictCorsHeaders",
        "Access-Control-Allow-Origin",
        "idempotency-key",
        "x-device-fingerprint",
      ]) {
        requireContains(this.id, cors, needle, corsPath);
      }
      for (const needle of [
        "high-risk-function-without-wrapper",
        "highRiskMissingSecurity",
        "missingWithSecurity",
        "missingStrictCors",
        "frontendSecretPatterns",
        "frontend-service-role",
      ]) {
        requireContains(this.id, readiness, needle, readinessPath);
      }
    },
  },
  {
    id: "risk-rate-limit-route-matrix",
    category: "rate-limits",
    check() {
      const limiterPath = "supabase/functions/_shared/rateLimiter.ts";
      const migrationPath =
        "supabase/migrations/20260429230000_security_hardening.sql";
      const limiter = source(limiterPath);
      const migration = source(migrationPath);

      for (const category of [
        "auth_login",
        "auth_register",
        "auth_otp",
        "auth_password_reset",
        "payment",
        "search",
        "upload",
        "admin_action",
        "api_general",
      ]) {
        requireContains(this.id, limiter, `${category}:`, limiterPath);
      }
      for (const needle of [
        "rateLimitDb(",
        "rate_limit_check",
        "Fail-open with in-memory fallback",
        "Retry-After",
      ]) {
        requireContains(this.id, limiter, needle, limiterPath);
      }
      for (const needle of [
        "create table if not exists public.rate_limit_buckets",
        "create or replace function public.rate_limit_check",
        "for update",
        "grant execute on function public.rate_limit_check",
      ]) {
        requireContains(this.id, migration, needle, migrationPath);
      }

      for (const [route, rateLimit, risk] of [
        ["send-otp-email", 'rateLimit: "auth_otp"', "blockNetworkRiskAt: 80"],
        ["send-otp-sms", 'rateLimit: "auth_otp"', "blockNetworkRiskAt: 90"],
        ["log-login", 'rateLimit: "auth_login"', "blockNetworkRiskAt: 80"],
        [
          "process-refund",
          'rateLimit: "admin_action"',
          "blockNetworkRiskAt: 85",
        ],
        [
          "admin-delete-user",
          'rateLimit: "admin_action"',
          "blockNetworkRiskAt: 85",
        ],
        [
          "create-grocery-checkout",
          'rateLimit: "payment"',
          "blockNetworkRiskAt: 80",
        ],
        [
          "create-flight-checkout",
          'rateLimit: "payment"',
          "blockNetworkRiskAt: 80",
        ],
        ["target-search", 'rateLimit: "search"', "blockNetworkRiskAt: 80"],
      ]) {
        requireStrictRoute(this.id, route, { rateLimit, risk });
      }

      for (const [route, rateLimit] of [
        ["admin-create-user", 'rateLimit: "admin_action"'],
        ["admin-delete-user", 'rateLimit: "admin_action"'],
        ["admin-list-created-users", 'rateLimit: "admin_action"'],
        ["admin-update-profile", 'rateLimit: "upload"'],
        ["admin-create-user-post", 'rateLimit: "upload"'],
        ["admin-delete-user-post", 'rateLimit: "admin_action"'],
        ["admin-post-comment", 'rateLimit: "admin_action"'],
        ["admin-moderate-message", 'rateLimit: "admin_action"'],
      ]) {
        requireStrictRoute(this.id, route, {
          rateLimit,
          risk: "blockNetworkRiskAt: 85",
        });
      }

      for (const [route, rateLimit] of [
        ["list-my-sessions", 'rateLimit: "api_general"'],
        ["revoke-session", 'rateLimit: "auth_password_reset"'],
        ["wallet-summary", 'rateLimit: "api_general"'],
        ["create-user-wallet-topup", 'rateLimit: "payment"'],
        ["verify-user-wallet-topup", 'rateLimit: "payment"'],
      ]) {
        requireStrictRoute(this.id, route, {
          rateLimit,
          risk: "blockNetworkRiskAt: 80",
        });
      }
    },
  },
  {
    id: "waf-bot-network-threat-intel",
    category: "threat-detection",
    check() {
      const wafPath = "supabase/functions/_shared/waf.ts";
      const botPath = "supabase/functions/_shared/botDetection.ts";
      const networkPath = "supabase/functions/_shared/networkSignals.ts";
      const threatPath = "supabase/functions/_shared/threatIntel.ts";
      const threatMigrationPath =
        "supabase/migrations/20260501100000_threat_intel.sql";
      const autoBlockPath =
        "supabase/migrations/20260501110000_auto_block_threat.sql";
      const networkMigrationPath =
        "supabase/migrations/20260521183500_network_security_events.sql";
      const waf = source(wafPath);
      const bot = source(botPath);
      const network = source(networkPath);
      const threat = source(threatPath);
      const threatMigration = source(threatMigrationPath);
      const autoBlock = source(autoBlockPath);
      const networkMigration = source(networkMigrationPath);

      for (const needle of [
        "SQLI",
        "XSS",
        "TRAVERSAL",
        "CMD_INJECTION",
        "NOSQL",
        "PROTO_POLLUTION",
        "MAX_BODY_BYTES",
        "payload_too_large",
      ]) {
        requireContains(this.id, waf, needle, wafPath);
      }
      for (const needle of [
        "SCRAPER_UA_PATTERNS",
        "SCANNER_UA_PATTERNS",
        "missing_ua",
        "isLikelyMaliciousBot",
      ]) {
        requireContains(this.id, bot, needle, botPath);
      }
      for (const needle of [
        "SUSPICIOUS_PROXY_HEADERS",
        "long_forwarded_chain",
        "tor_exit_country_code",
        "probableProxyOrVpn",
        "Math.min(riskScore, 100)",
      ]) {
        requireContains(this.id, network, needle, networkPath);
      }
      for (const needle of [
        "isIpBlocked",
        "lookupThreatHistory",
        "scoreThreatHistory",
        "autoBlockIfHighThreat",
      ]) {
        requireContains(this.id, threat, needle, threatPath);
      }
      for (const needle of [
        "CREATE TABLE IF NOT EXISTS public.ip_blocklist",
        "CREATE OR REPLACE FUNCTION public.is_ip_blocked",
        "CREATE OR REPLACE FUNCTION public.get_threat_history",
      ]) {
        requireContains(this.id, threatMigration, needle, threatMigrationPath);
      }
      requireContains(
        this.id,
        autoBlock,
        "CREATE OR REPLACE FUNCTION public.auto_block_if_high_threat",
        autoBlockPath,
      );
      for (const needle of [
        "CREATE TABLE IF NOT EXISTS public.network_security_events",
        "risk_score",
        "request_id",
        "ip_hash",
        "signals text[] NOT NULL DEFAULT '{}'",
      ]) {
        requireContains(
          this.id,
          networkMigration,
          needle,
          networkMigrationPath,
        );
      }
    },
  },
  {
    id: "attack-drill-coverage",
    category: "drills",
    check() {
      const drillsPath = "docs/security-anti-abuse-drills.md";
      const workflowPath = "src/test/workflows/security-anti-abuse.test.ts";
      const focusedDrillsPath = "src/test/securityAttackDrills.test.ts";
      const rateLimitTestPath = "src/test/rateLimitRiskDecisions.test.ts";
      const accountTakeoverE2ePath =
        "tests/e2e/account-takeover-protection.spec.ts";
      const matrixPath = "scripts/qa/platform-readiness-matrix.mjs";
      const coveragePath = "scripts/qa/workflow-coverage.mjs";
      const packagePath = "package.json";
      const drills = source(drillsPath);
      const workflow = source(workflowPath);
      const focusedDrills = source(focusedDrillsPath);
      const rateLimitTest = source(rateLimitTestPath);
      const accountTakeoverE2e = source(accountTakeoverE2ePath);
      const matrix = source(matrixPath);
      const coverage = source(coveragePath);
      const packageJson = source(packagePath);

      for (const drill of [
        "Account takeover / OTP stuffing",
        "Card testing / payment replay",
        "Spam / notification abuse",
        "Scraping / scanner traffic",
        "Fake booking / price tampering",
        "Key leakage / frontend secret exposure",
      ]) {
        requireContains(this.id, drills, drill, drillsPath);
        requireContains(this.id, workflow, drill, workflowPath);
        requireContains(this.id, focusedDrills, drill, focusedDrillsPath);
      }
      requireContains(
        this.id,
        rateLimitTest,
        "sensitive routes on the right rate-limit and network-risk thresholds",
        rateLimitTestPath,
      );
      for (const needle of [
        "auth_precheck_login",
        "verify-otp-code",
        "register_trusted_device",
        "new_device_login",
        "country_change_login",
      ]) {
        requireContains(
          this.id,
          accountTakeoverE2e,
          needle,
          accountTakeoverE2ePath,
        );
      }
      requireContains(
        this.id,
        matrix,
        "src/test/securityAttackDrills.test.ts",
        matrixPath,
      );
      requireContains(
        this.id,
        matrix,
        "tests/e2e/account-takeover-protection.spec.ts",
        matrixPath,
      );
      requireContains(
        this.id,
        matrix,
        "qa:security-anti-abuse-contracts",
        matrixPath,
      );
      requireContains(
        this.id,
        coverage,
        "qa:security-anti-abuse-contracts",
        coveragePath,
      );
      requireContains(
        this.id,
        packageJson,
        '"qa:security-anti-abuse-contracts"',
        packagePath,
      );
      requireContains(
        this.id,
        packageJson,
        "npm run qa:security-anti-abuse-contracts",
        packagePath,
      );
    },
  },
  {
    id: "money-booking-spam-abuse",
    category: "abuse-prevention",
    check() {
      const stripeWebhookPath = "supabase/functions/stripe-webhook/index.ts";
      const carDepositPath =
        "supabase/functions/create-car-rental-deposit/index.ts";
      const lodgingDepositPath =
        "supabase/functions/create-lodging-deposit/index.ts";
      const groceryCheckoutPath =
        "supabase/functions/create-grocery-checkout/index.ts";
      const notifyDispatchPath = "supabase/functions/notify-dispatch/index.ts";
      const bookingSecurityPath =
        "supabase/migrations/20260524110000_salon_public_booking_security.sql";
      const bookingGatePath =
        "supabase/migrations/20260601231500_salon_bookings_public_submit_gate.sql";
      const bookingSubmitPath =
        "supabase/functions/salon-booking-submit/index.ts";
      const bookingPagePath = "src/pages/salon/PublicSalonBookingPage.tsx";
      const stripeWebhook = source(stripeWebhookPath);
      const carDeposit = source(carDepositPath);
      const lodgingDeposit = source(lodgingDepositPath);
      const groceryCheckout = source(groceryCheckoutPath);
      const notifyDispatch = source(notifyDispatchPath);
      const bookingSecurity = source(bookingSecurityPath);
      const bookingGate = source(bookingGatePath);
      const bookingSubmit = source(bookingSubmitPath);
      const bookingPage = source(bookingPagePath);

      requireMatch(
        this.id,
        stripeWebhook,
        /withSecurity\(\s*["']stripe-webhook["']/,
        stripeWebhookPath,
      );
      requireContains(this.id, stripeWebhook, "idempotency", stripeWebhookPath);
      requireContains(
        this.id,
        stripeWebhook,
        "purchase_records",
        stripeWebhookPath,
      );
      for (const [text, relativePath] of [
        [carDeposit, carDepositPath],
        [lodgingDeposit, lodgingDepositPath],
        [groceryCheckout, groceryCheckoutPath],
      ]) {
        requireContains(this.id, text, "rateLimit", relativePath);
        requireContains(this.id, text, "strictCors: true", relativePath);
        requireContains(
          this.id,
          text,
          'trackNetwork: "suspicious"',
          relativePath,
        );
        requireContains(this.id, text, "blockNetworkRiskAt: 80", relativePath);
      }
      requireContains(
        this.id,
        carDeposit,
        'code: "car_rental_payment_authority_unavailable"',
        carDepositPath,
      );
      requireContains(this.id, carDeposit, "status: 503", carDepositPath);
      for (const retiredNeedle of ["Stripe", "paymentIntents", "req.json"]) {
        if (carDeposit.includes(retiredNeedle)) {
          failures.push(
            `${this.id}: ${carDepositPath} must not contain retired charge path ${retiredNeedle}`,
          );
        }
      }
      requireContains(
        this.id,
        lodgingDeposit,
        "TERMINAL_PAYMENT_STATES",
        lodgingDepositPath,
      );
      requireContains(
        this.id,
        lodgingDeposit,
        "checkout.sessions.create(sessionParams, { idempotencyKey })",
        lodgingDepositPath,
      );
      for (const needle of [
        "marketing_enabled",
        "marketing_disabled",
        "deliveryAllowed",
      ]) {
        requireContains(this.id, notifyDispatch, needle, notifyDispatchPath);
      }
      for (const needle of [
        "tg_salon_sanitize_public_booking",
        "NEW.price_cents := v_svc.price_cents",
        "NEW.status := 'pending'",
        "Public can request bookings",
      ]) {
        requireContains(this.id, bookingSecurity, needle, bookingSecurityPath);
      }
      requireContains(
        this.id,
        bookingPage,
        '"salon-booking-submit"',
        bookingPagePath,
      );
      requireNotMatch(
        this.id,
        bookingPage,
        /from\("salon_bookings"\)[\s\S]{0,360}\.(insert|upsert)/,
        bookingPagePath,
      );
      for (const needle of [
        'withSecurity("salon-booking-submit"',
        'allowedMethods: ["POST"]',
        "strictCors: true",
        "SUPABASE_SERVICE_ROLE_KEY",
        '.from("store_profiles")',
        '.from("salon_services")',
        '.from("salon_stylists")',
        '.from("salon_bookings")',
      ]) {
        requireContains(this.id, bookingSubmit, needle, bookingSubmitPath);
      }
      for (const needle of [
        "Salon booking public inserts require trusted server-side validation",
        "REVOKE INSERT ON TABLE public.salon_bookings FROM anon",
        "TO service_role",
      ]) {
        requireContains(this.id, bookingGate, needle, bookingGatePath);
      }
    },
  },
  {
    id: "audit-incidents-secret-leakage",
    category: "audit",
    check() {
      const auditPath = "supabase/functions/_shared/audit.ts";
      const sentinelPath =
        "supabase/migrations/20260411160000_security_sentinel_project.sql";
      const chatSecurityPath =
        "supabase/migrations/20260411124500_chat_security_enforcement.sql";
      const loginPath = "supabase/functions/log-login/index.ts";
      const securityNotificationsPath =
        "supabase/functions/process-security-notifications/index.ts";
      const secretScannerPath = "scripts/security/check-secrets.mjs";
      const rotationRunbookPath = "docs/supabase-secret-rotation-runbook.md";
      const deploySecretsPath = "docs/production-deploy-secrets.md";
      const drillsPath = "docs/security-anti-abuse-drills.md";
      const audit = source(auditPath);
      const sentinel = source(sentinelPath);
      const chatSecurity = source(chatSecurityPath);
      const login = source(loginPath);
      const securityNotifications = source(securityNotificationsPath);
      const secretScanner = source(secretScannerPath);
      const rotationRunbook = source(rotationRunbookPath);
      const deploySecrets = source(deploySecretsPath);
      const drills = source(drillsPath);

      for (const needle of [
        "redactPii",
        "recordSecurityEvent",
        "recordNetworkEvent",
        "recordAudit",
        "security_events",
      ]) {
        requireContains(this.id, audit, needle, auditPath);
      }
      for (const needle of [
        "CREATE TABLE IF NOT EXISTS public.security_incidents",
        "chain_hash",
        "prev_chain_hash",
        "compute_incident_chain_hash",
        "admin_ack_security_incident",
        "Only admins can acknowledge incidents",
      ]) {
        requireContains(this.id, sentinel, needle, sentinelPath);
      }
      for (const needle of [
        "CREATE TABLE IF NOT EXISTS public.chat_security_events",
        "analyze_chat_content_security",
        "enforce_chat_message_security",
        "RAISE EXCEPTION 'Message blocked by security policy",
      ]) {
        requireContains(this.id, chatSecurity, needle, chatSecurityPath);
      }
      requireContains(this.id, login, "login_history", loginPath);
      requireContains(
        this.id,
        securityNotifications,
        "new-device-login",
        securityNotificationsPath,
      );
      requireContains(
        this.id,
        securityNotifications,
        "country-change-login",
        securityNotificationsPath,
      );
      for (const secretGuard of [
        "Supabase service-role JWT",
        "Supabase publishable key",
        "Supabase secret key",
        "Supabase access token",
        "Private key block",
        "OpenAI API key",
      ]) {
        requireContains(this.id, secretScanner, secretGuard, secretScannerPath);
      }
      for (const needle of [
        "Supabase Secret Rotation Runbook",
        "Treat the value as compromised",
        "SUPABASE_SERVICE_ROLE_KEY",
        "SUPABASE_ANON_KEY",
        "SUPABASE_ACCESS_TOKEN",
        "rg -l --hidden",
        "--glob '!.env.local'",
        "Incident Closeout",
      ]) {
        requireContains(this.id, rotationRunbook, needle, rotationRunbookPath);
      }
      requireContains(
        this.id,
        deploySecrets,
        "docs/supabase-secret-rotation-runbook.md",
        deploySecretsPath,
      );
      requireContains(this.id, drills, "Supabase rotation runbook", drillsPath);
    },
  },
];

for (const contract of contracts) contract.check();

console.log(
  JSON.stringify(
    {
      generated: new Date().toISOString(),
      counts: {
        contracts: contracts.length,
        failures: failures.length,
      },
      contracts: contracts.map(({ id, category }) => ({ id, category })),
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) {
  process.exitCode = 1;
}
