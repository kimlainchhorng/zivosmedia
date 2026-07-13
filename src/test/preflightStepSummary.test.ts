import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const renderer = join(root, "scripts/deploy/render-preflight-step-summary.mjs");

function summary() {
  return {
    schemaVersion: 1,
    mode: "strict",
    options: { strict: true, skipBuild: true, skipTypeCheck: true },
    readyForCurrentGate: false,
    readyForProductionGate: false,
    supabase: {
      runtimeSettingsSqlInputs: false,
      remoteMigrationHistoryRead: false,
      remoteMigrationHistoryStatus: "access_token_missing",
      linkedHistoryDisconnected: false,
    },
    blockers: {
      failedCommands: ["Supabase deploy environment", "Supabase runtime settings SQL"],
      production: [
        "Missing SUPABASE_URL for production backend cron/runtime settings.",
        "Missing SUPABASE_ANON_KEY for production Edge Function verification and database cron auth.",
        "Missing SUPABASE_ACCESS_TOKEN for production migration-history verification.",
      ],
      currentGate: [
        "Missing SUPABASE_URL for production backend cron/runtime settings.",
      ],
    },
    reconciliation: {
      candidates: 0,
      highConfidenceCandidates: 0,
      mediumConfidenceCandidates: 0,
      unmatchedLocalAfterCandidates: 0,
      unmatchedRemoteAfterCandidates: 0,
      unmatchedLocalAfterRemoteRange: 0,
      reviewBuckets: [],
    },
    artifactMeta: {},
    artifactSummary: {},
  };
}

describe("preflight step summary renderer", () => {
  it("prints Supabase setup next steps for missing deploy env", () => {
    const dir = mkdtempSync(join(tmpdir(), "zivo-preflight-summary-"));
    const file = join(dir, "summary.json");
    writeFileSync(file, `${JSON.stringify(summary(), null, 2)}\n`);

    const result = spawnSync(process.execPath, [renderer, "--summary-path", file], {
      cwd: root,
      encoding: "utf8",
      env: { PATH: process.env.PATH ?? "" },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("### Supabase setup next steps");
    expect(result.stdout).toContain("SUPABASE_URL");
    expect(result.stdout).toContain("SUPABASE_ANON_KEY");
    expect(result.stdout).toContain("SUPABASE_ACCESS_TOKEN");
    expect(result.stdout).toContain("npm run supabase:runtime-settings:sql -- --strict --emit-secrets");
    expect(result.stdout).toContain("npm run supabase:migrations:report");
    expect(result.stdout).toContain("docs/supabase-deploy-env-setup.md");
    expect(result.stdout).toContain("docs/supabase-migration-auth-setup.md");
  });

  it("prints a readiness consistency warning when ready flags drift from blockers", () => {
    const dir = mkdtempSync(join(tmpdir(), "zivo-preflight-summary-"));
    const file = join(dir, "summary.json");
    writeFileSync(file, `${JSON.stringify({
      ...summary(),
      readyForCurrentGate: true,
      readyForProductionGate: true,
    }, null, 2)}\n`);

    const result = spawnSync(process.execPath, [renderer, "--summary-path", file], {
      cwd: root,
      encoding: "utf8",
      env: { PATH: process.env.PATH ?? "" },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("### Readiness consistency");
    expect(result.stdout).toContain("Summary ready flags disagree with blockers or failed commands.");
    expect(result.stdout).toContain("Current gate: summary=yes, computed=no");
    expect(result.stdout).toContain("Production gate: summary=yes, computed=no");
  });
});
