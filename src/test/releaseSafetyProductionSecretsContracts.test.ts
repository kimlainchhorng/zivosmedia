import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

const json = (relativePath: string) => JSON.parse(source(relativePath));

describe("release safety production secret contracts", () => {
  it("keeps production preflight blockers explicit while Supabase deploy secrets are missing", () => {
    const summary = json("docs/production-preflight-summary.json");

    expect(["soft", "strict"]).toContain(summary.mode);
    expect(summary.readyForCurrentGate).toBe(
      summary.blockers.currentGate.length === 0 && summary.blockers.failedCommands.length === 0,
    );
    expect(summary.readyForProductionGate).toBe(false);
    if (summary.mode === "strict") {
      expect(summary.counts.environmentCritical).toBeGreaterThan(0);
    } else {
      expect(summary.counts.environmentCritical).toBeGreaterThanOrEqual(0);
    }
    expect(summary.counts.apiWarnings).toBeGreaterThanOrEqual(0);
    expect(summary.supabase).toEqual(
      expect.objectContaining({
        envAccessToken: false,
        driftAccessToken: false,
        runtimeSettingsSqlInputs: false,
      }),
    );

    // remoteMigrationHistoryRead/Status are deliberately NOT pinned above: the
    // Supabase CLI can read linked history through a stored `supabase login`
    // session even with SUPABASE_ACCESS_TOKEN unset, so they differ between a
    // maintainer's machine and CI. The contract that matters is the implication
    // below, which holds in both.
    expect(["read", "access_token_missing", "unavailable"]).toContain(
      summary.supabase.remoteMigrationHistoryStatus,
    );
    if (summary.supabase.remoteMigrationHistoryRead) {
      expect(summary.supabase.remoteMigrationHistoryStatus).toBe("read");
    } else {
      expect(summary.supabase.remoteMigrationHistoryStatus).not.toBe("read");
      expect(summary.blockers.production).toContain(
        `Supabase remote migration history is unavailable (${summary.supabase.remoteMigrationHistoryStatus}).`,
      );
    }

    expect(summary.blockers.production.length).toBeGreaterThan(0);
    expect(summary.blockers.production).toContain("Missing SUPABASE_URL for production backend cron/runtime settings.");
    expect(summary.blockers.production).toContain("Missing SUPABASE_ANON_KEY for production Edge Function verification and database cron auth.");
    expect(summary.blockers.production).toContain("Missing SUPABASE_ACCESS_TOKEN for production migration-history verification.");
    if (summary.mode === "strict") {
      expect(summary.blockers.failedCommands).toContain("Supabase deploy environment");
      expect(summary.blockers.failedCommands).toContain("Supabase runtime settings SQL");
      expect(summary.blockers.failedCommands).not.toContain("Security scan");
    }
  });

  it("keeps deploy-secret documentation aligned with strict preflight requirements", () => {
    const secrets = source("docs/production-deploy-secrets.md");
    const supabaseSetup = source("docs/supabase-deploy-env-setup.md");
    const migrationAuth = source("docs/supabase-migration-auth-setup.md");
    const workflow = source(".github/workflows/deploy-production.yml");
    const envPreflightTest = source("src/test/deployEnvPreflight.test.ts");

    for (const required of [
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_PUBLISHABLE_KEY",
      "VITE_SUPABASE_PROJECT_ID",
      "VITE_ZIVO_SOFTWARE_SUPABASE_URL",
      "VITE_ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_URL",
      "SUPABASE_ANON_KEY",
      "SUPABASE_ACCESS_TOKEN",
      "NETLIFY_AUTH_TOKEN",
      "NETLIFY_SITE_ID",
    ]) {
      expect(secrets).toContain(required);
    }

    expect(secrets).toContain("Do not use `SUPABASE_SERVICE_ROLE_KEY` as `SUPABASE_ANON_KEY`.");
    expect(secrets).toContain("npm run deploy:preflight:strict -- --skip-build --skip-type-check");
    expect(supabaseSetup).toContain("Never put");
    expect(supabaseSetup).toContain("SUPABASE_ACCESS_TOKEN`, `sbp_...`, `sb_secret_...`, or a service-role JWT");
    expect(supabaseSetup).toContain("Environment readiness has `0` critical findings.");
    expect(migrationAuth).toContain("supabase login");
    expect(migrationAuth).toContain("export SUPABASE_ACCESS_TOKEN=<your-supabase-access-token>");

    expect(workflow).toContain("SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}");
    expect(workflow).toContain("SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}");
    expect(workflow).toContain("VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}");
    expect(workflow).toContain("VITE_ZIVO_SOFTWARE_SUPABASE_URL: ${{ secrets.VITE_ZIVO_SOFTWARE_SUPABASE_URL }}");
    expect(workflow).toContain("VITE_ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY }}");
    expect(envPreflightTest).toContain("requires a Supabase access token in strict production checks");
    expect(envPreflightTest).toContain("rejects service-role JWTs configured as SUPABASE_ANON_KEY");
  });

  it("keeps API readiness warning tied to remote migration auth instead of loose function security", () => {
    const summary = json("docs/production-preflight-summary.json");
    const apiReport = source("docs/api-readiness-report.md");
    const driftReport = source("docs/supabase-migration-drift-report.md");
    const secretRunbook = source("docs/supabase-secret-rotation-runbook.md");

    expect(apiReport).toContain("- Critical findings: 0");
    expect(apiReport).toMatch(/- Warnings: \d+/);
    expect(apiReport).toContain("- Loose Edge Function security backlog: 0");

    expect(driftReport).toContain("SUPABASE_ACCESS_TOKEN configured: no");
    // Same flag, same reason: audit-migration-drift.mjs emits the "requires
    // authenticated history" line only on the remoteError branch. When the
    // history WAS read it must instead report real diagnostics, never that line.
    if (summary.supabase.remoteMigrationHistoryRead) {
      expect(driftReport).not.toContain(
        "Near-timestamp diagnostics require authenticated remote migration history.",
      );
      expect(driftReport).toMatch(
        /- (Many migrations appear to have near-identical timestamps|No near-timestamp pattern detected)/,
      );
    } else {
      expect(driftReport).toContain(
        "Near-timestamp diagnostics require authenticated remote migration history.",
      );
    }

    expect(secretRunbook).toContain("Keep `SUPABASE_SERVICE_ROLE_KEY` separate from `SUPABASE_ANON_KEY`.");
    expect(secretRunbook).toContain(
      "Remote migration history is readable when `SUPABASE_ACCESS_TOKEN` is configured",
    );
    // The runbook must name BOTH auth paths: claiming only the env var reads the
    // history is what makes a logged-in machine's richer artifact look like a bug.
    expect(secretRunbook).toContain("stored `supabase login` session");
  });
});
