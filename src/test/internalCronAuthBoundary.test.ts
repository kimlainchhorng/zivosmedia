import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const helper = read("supabase/functions/_shared/internalCronAuth.ts");
const autoCancel = read("supabase/functions/auto-cancel-stale-orders/index.ts");
const closeCalls = read("supabase/functions/close-trip-call-sessions/index.ts");
const marketing = read(
  "supabase/functions/marketing-automations-tick/index.ts",
);
const signerMigration = read(
  "supabase/migrations/20260830163714_harden_internal_cron_auth.sql",
);
const cutoverMigration = read(
  "supabase/migrations/20260830173024_cutover_internal_cron_hmac_jobs.sql",
);
const migration = `${signerMigration}\n${cutoverMigration}`;
const runbook = read("docs/internal-cron-auth-cutover.md");
const config = read("supabase/config.toml");

describe("internal cron authentication boundary", () => {
  it("lets all handler-authenticated HMAC cron requests reach their exact boundary", () => {
    for (const slug of [
      "auto-cancel-stale-orders",
      "close-trip-call-sessions",
      "marketing-automations-tick",
    ]) {
      expect(config).toMatch(
        new RegExp(`\\[functions\\.${slug}\\]\\s+verify_jwt\\s*=\\s*false`),
      );
    }
  });

  it("uses a signed one-use steady-state boundary and keeps direct credentials behind the transition switch", () => {
    expect(helper).toContain('readSecret("INTERNAL_CRON_SECRET", 32)');
    expect(helper).toContain('"x-zivo-cron-signature"');
    expect(helper).toContain('"x-zivo-cron-purpose"');
    expect(helper).toContain("crypto.subtle.importKey(");
    expect(helper).toContain('["verify"]');
    expect(helper).toContain('supabase.from("nonce_cache").insert');
    expect(helper).toContain("MAX_REQUEST_AGE_SECONDS = 240");
    expect(helper).toContain("MAX_FUTURE_SKEW_SECONDS = 30");
    expect(helper.indexOf("hasAnySignedHeader(req)")).toBeLessThan(
      helper.indexOf(
        'Deno.env.get("INTERNAL_CRON_LEGACY_AUTH_ENABLED") !== "true"',
      ),
    );
    expect(helper).toContain('req.headers.get("x-cron-secret")');
    expect(helper).toContain('event: "internal_cron_signed_rejected"');
    expect(helper).toContain(
      "export function getInternalCronReadinessFailurePayload(",
    );
    expect(helper).toContain('error: "signed_readiness_rejected"');
    expect(helper).toContain("stage: InternalCronAuthFailureStage");
    expect(helper).toContain('"envelope"');
    expect(helper).toContain('"timestamp"');
    expect(helper).toContain('"url"');
    expect(helper).toContain('"body"');
    expect(helper).toContain('"hmac"');
    expect(helper).toContain('"nonce_claim"');
    expect(helper).toContain(
      "never add request headers, URLs, bodies, signatures",
    );
    expect(helper).toContain(
      'Deno.env.get("INTERNAL_CRON_LEGACY_AUTH_ENABLED") !== "true"',
    );
    expect(helper.indexOf('req.headers.get("x-cron-secret")')).toBeGreaterThan(
      helper.indexOf(
        'Deno.env.get("INTERNAL_CRON_LEGACY_AUTH_ENABLED") !== "true"',
      ),
    );
    expect(helper).not.toContain(".includes(");
    expect(helper).not.toContain("searchParams");
    expect(helper).not.toContain('req.headers.get("x-cron-probe")');
    expect(helper).toContain(
      "const expectedPath = `/functions/v1/${functionName}`;",
    );
    expect(helper).toContain('if (url.search !== "")');
    expect(helper).not.toContain("url.pathname !== expectedPath");
    expect(helper).not.toContain(
      "url.pathname === `/functions/v1/${functionName}`",
    );
  });

  it.each([
    ["auto-cancel-stale-orders", autoCancel],
    ["close-trip-call-sessions", closeCalls],
    ["marketing-automations-tick", marketing],
  ])(
    "authenticates %s before creating its privileged client",
    (_name, source) => {
      const authCheck = source.indexOf("await isInternalCaller(req,");
      const privilegedClient = source.indexOf("createClient(");

      expect(source).toContain("isAuthorizedInternalCron,");
      expect(source).toContain("getInternalCronReadinessFailurePayload,");
      expect(source).toContain("isInternalCronReadinessProbe,");
      expect(source).toContain("return isAuthorizedInternalCron(req, {");
      expect(source).toContain(`functionName: "${_name}"`);
      expect(authCheck).toBeGreaterThan(-1);
      expect(privilegedClient).toBeGreaterThan(authCheck);
      expect(source).toContain("isInternalCronReadinessProbe(req)");
      expect(source).toContain("diagnosticObserver,");
      expect(source).toContain("getInternalCronReadinessFailurePayload(");
      expect(source).toContain("authFailureStage,");
      expect(source).toContain("JSON.stringify(diagnostic ?? { error:");
      expect(source).toContain('allowedMethods: ["POST"]');
      expect(
        source.indexOf("isInternalCronReadinessProbe(req)"),
      ).toBeGreaterThan(authCheck);
      expect(privilegedClient).toBeGreaterThan(
        source.indexOf("isInternalCronReadinessProbe(req)"),
      );
    },
  );

  it("preserves only the documented cutover credentials while transition mode is enabled", () => {
    expect(autoCancel).toContain(
      'legacyBearerEnvNames: ["SUPABASE_SERVICE_ROLE_KEY"]',
    );
    expect(closeCalls).toContain(
      'legacyBearerEnvNames: ["SUPABASE_SERVICE_ROLE_KEY"]',
    );
    expect(autoCancel).not.toContain("SUPABASE_ANON_KEY");
    expect(closeCalls).not.toContain("SUPABASE_ANON_KEY");
    expect(marketing).toContain('legacyBearerEnvNames: ["CRON_SECRET"]');
    expect(marketing).toContain('legacyHeaderEnvNames: ["CRON_SECRET"]');
    expect(autoCancel).not.toContain("authHeader.includes");
    expect(closeCalls).not.toContain("authHeader.includes");
  });

  it("rewrites all three jobs through a Vault-signed one-use envelope without embedding credentials", () => {
    expect(signerMigration).not.toContain("cron.alter_job(");
    expect(signerMigration).not.toContain("update cron.job_run_details");
    expect(cutoverMigration.match(/cron\.alter_job\(/g)).toHaveLength(3);
    expect(migration.match(/cron\.alter_job\(/g)).toHaveLength(3);
    expect(migration).toContain(
      "create or replace function private.enqueue_internal_cron(",
    );
    expect(migration.match(/'x-zivo-cron-signature'/g)).toHaveLength(1);
    expect(migration.match(/'x-zivo-cron-purpose'/g)).toHaveLength(1);
    expect(migration).toContain("extensions.hmac(");
    expect(migration).toContain("extensions.digest(");
    expect(migration).toContain("pg_catalog.gen_random_uuid()");
    expect(migration).not.toContain("delete from public.nonce_cache");
    expect(migration).toContain("security invoker");
    expect(migration).toContain(
      "grant execute on function private.enqueue_internal_cron(text, jsonb, text)",
    );
    expect(migration.match(/private\.enqueue_internal_cron\(\n/g)).toHaveLength(
      4,
    );
    expect(
      migration.match(/name = 'internal_cron_secret'/g)?.length,
    ).toBeGreaterThanOrEqual(2);
    expect(migration).toContain(
      "'https://slirphzzwcogdbkeicff.supabase.co' || v_function_path",
    );
    expect(migration).not.toContain("name = 'project_url'");
    expect(migration).toContain("target_job_rows <> 3");
    expect(migration).toContain("rolcanlogin");
    expect(migration).toContain(
      "A browser-executable Data API function exposes cron/pg_net internals",
    );
    expect(cutoverMigration).toContain(
      "where n.nspname in ('public', 'graphql_public')",
    );
    expect(cutoverMigration).toContain("and p.prokind = 'f'");
    expect(cutoverMigration).not.toContain("where p.prosecdef");
    expect(migration).not.toContain(
      "revoke all privileges on table net.http_request_queue",
    );
    expect(migration).not.toContain(
      "revoke all privileges on table cron.job_run_details",
    );
    expect(migration).toContain("update cron.job_run_details");
    expect(migration).toContain("[redacted legacy cron credential command]");
    expect(cutoverMigration).toContain("or command ilike '%x-cron-secret%'");
    expect(migration).not.toContain("cron.unschedule");
    expect(migration).not.toContain("cron.schedule(");
    expect(migration).not.toContain("'Authorization',");
    expect(migration).not.toContain("'x-cron-secret',");
    expect(migration).not.toMatch(/Bearer\s+[A-Za-z0-9._-]{16,}/);
  });

  it("requires signed no-op evidence between signer preparation and live job cutover", () => {
    const preparation = runbook.indexOf(
      "20260830163714_harden_internal_cron_auth.sql",
    );
    const signedProbe = runbook.indexOf(
      "enqueue one signed readiness request for each",
    );
    const cutover = runbook.indexOf(
      "20260830173024_cutover_internal_cron_hmac_jobs.sql",
      signedProbe,
    );

    expect(preparation).toBeGreaterThan(-1);
    expect(signedProbe).toBeGreaterThan(preparation);
    expect(cutover).toBeGreaterThan(signedProbe);
    expect(runbook).toContain(
      "When this flag is false, direct `x-cron-secret`",
    );
    expect(runbook).toContain("`x-cron-probe` header cannot turn a signed");
    expect(runbook).toContain("execute request into a probe.");
    expect(runbook).toContain("Legacy or direct credentials never select");
  });
});
