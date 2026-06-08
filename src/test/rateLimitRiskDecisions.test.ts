import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("rate-limit and network-risk decision guard", () => {
  it("keeps shared rate-limit categories aligned to auth, payment, upload, admin, and search risk", () => {
    const limiter = read("supabase/functions/_shared/rateLimiter.ts");
    const wrapper = read("supabase/functions/_shared/withSecurity.ts");
    const driftMigration = read("supabase/migrations/20260429230000_security_hardening.sql");

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
      expect(limiter).toContain(`${category}:`);
    }

    expect(limiter).toContain("rateLimit(");
    expect(limiter).toContain("rateLimitDb(");
    expect(limiter).toContain("rate_limit_check");
    expect(limiter).toContain("Fail-open with in-memory fallback");
    expect(limiter).toContain("Retry-After");

    expect(wrapper).toContain("rateLimit(ip, opts.rateLimit)");
    expect(wrapper).toContain("rate_limit.exceeded");
    expect(wrapper).toContain("recordSecurityEvent");
    expect(wrapper).toContain("allowedMethods");
    expect(wrapper).toContain("Method not allowed");
    expect(wrapper).toContain("Allow");

    expect(driftMigration).toContain("create table if not exists public.rate_limit_buckets");
    expect(driftMigration).toContain("create or replace function public.rate_limit_check");
    expect(driftMigration).toContain("for update");
    expect(driftMigration).toContain("grant execute on function public.rate_limit_check");
  });

  it("keeps sensitive routes on the right rate-limit and network-risk thresholds", () => {
    const routeExpectations: Array<[string, string, string]> = [
      ["send-otp-email", 'rateLimit: "auth_otp"', "blockNetworkRiskAt: 80"],
      ["send-otp-sms", 'rateLimit: "auth_otp"', "blockNetworkRiskAt: 90"],
      ["log-login", 'rateLimit: "auth_login"', "blockNetworkRiskAt: 80"],
      ["process-refund", 'rateLimit: "admin_action"', "blockNetworkRiskAt: 85"],
      ["admin-delete-user", 'rateLimit: "admin_action"', "blockNetworkRiskAt: 85"],
      ["create-grocery-checkout", 'rateLimit: "payment"', "blockNetworkRiskAt: 80"],
      ["create-flight-checkout", 'rateLimit: "payment"', "blockNetworkRiskAt: 80"],
      ["target-search", 'rateLimit: "search"', "blockNetworkRiskAt: 80"],
    ];

    for (const [route, rateLimitNeedle, riskNeedle] of routeExpectations) {
      const source = read(`supabase/functions/${route}/index.ts`);
      expect(source).toContain(`withSecurity("${route}"`);
      expect(source).toContain(rateLimitNeedle);
      expect(source).toContain('allowedMethods: ["POST"]');
      expect(source).toContain("strictCors: true");
      expect(source).toContain('trackNetwork: "suspicious"');
      expect(source).toContain(riskNeedle);
      expect(source).not.toContain('"Access-Control-Allow-Origin": "*"');
    }
  });

  it("keeps network-risk decisions logged, blockable, and visible to operations", () => {
    const wrapper = read("supabase/functions/_shared/withSecurity.ts");
    const networkSignals = read("supabase/functions/_shared/networkSignals.ts");
    const networkMigration = read("supabase/migrations/20260521183500_network_security_events.sql");
    const runbook = read("docs/api-operations-runbook.md");

    expect(wrapper).toContain("assessNetwork(req)");
    expect(wrapper).toContain("recordNetworkEvent");
    expect(wrapper).toContain("network.risk_block");
    expect(wrapper).toContain("Network risk too high");
    expect(wrapper).toContain("blocked: Boolean(opts.blockNetworkRiskAt");

    expect(networkSignals).toContain("SUSPICIOUS_PROXY_HEADERS");
    expect(networkSignals).toContain("long_forwarded_chain");
    expect(networkSignals).toContain("tor_exit_country_code");
    expect(networkSignals).toContain("probableProxyOrVpn");
    expect(networkSignals).toContain("Math.min(riskScore, 100)");

    expect(networkMigration).toContain("CREATE TABLE IF NOT EXISTS public.network_security_events");
    expect(networkMigration).toContain("risk_score");
    expect(networkMigration).toContain("request_id");
    expect(networkMigration).toContain("ip_hash");
    expect(networkMigration).toContain("signals text[] NOT NULL DEFAULT '{}'");

    expect(runbook).toContain("network_security_events");
    expect(runbook).toContain("x-request-id");
    expect(runbook).toContain("Auth spike");
  });

  it("keeps the platform readiness lane pointed at focused security risk tests", () => {
    const matrix = read("scripts/qa/platform-readiness-matrix.mjs");
    const workflow = read("src/test/workflows/security-anti-abuse.test.ts");
    const endToEnd = read("docs/end-to-end-platform-readiness.md");

    expect(matrix).toContain("src/test/securityAttackDrills.test.ts");
    expect(matrix).toContain("src/test/rateLimitRiskDecisions.test.ts");
    expect(matrix).toContain("npm run qa:security-anti-abuse-contracts");
    expect(matrix).toContain("npx playwright test tests/e2e/account-takeover-protection.spec.ts");
    expect(matrix).toContain("rate-limit, network-risk, and strict preflight controls green");
    expect(workflow).toContain("covers account takeover, card testing, spam, scraping, fake booking, and key-leak drills");
    expect(workflow).toContain("blocks scanners, scrapers, injection payloads, risky networks, and repeat threat actors");
    expect(endToEnd).toContain("Keep WAF, CORS, rate limits, bot checks, IP hash blocklists, and network-risk scoring enabled");
  });
});
