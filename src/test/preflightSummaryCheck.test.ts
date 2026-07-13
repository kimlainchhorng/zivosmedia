import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const checker = join(root, "scripts/deploy/check-preflight-summary.mjs");

function baseSummary(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    mode: "soft",
    options: { strict: false, skipBuild: true, skipTypeCheck: true },
    readyForCurrentGate: true,
    readyForProductionGate: false,
    counts: {
      apiCritical: 0,
      apiWarnings: 1,
      environmentCritical: 0,
      environmentWarnings: 0,
      databaseBlockers: 0,
      databaseWarnings: 0,
      failedCommands: 0,
      productionBlockers: 1,
      currentGateBlockers: 0,
    },
    supabase: {
      envAccessToken: false,
      driftAccessToken: false,
      runtimeSettingsSqlInputs: false,
      linkedHistoryDisconnected: false,
      remoteMigrationHistoryRead: false,
      remoteMigrationHistoryStatus: "access_token_missing",
      remoteMigrations: 0,
      matchedVersions: 0,
      duplicateVersions: 0,
      newDuplicateVersions: 0,
    },
    reconciliation: {
      candidates: 0,
      highConfidenceCandidates: 0,
      mediumConfidenceCandidates: 0,
      unmatchedLocalAfterCandidates: 0,
      unmatchedRemoteAfterCandidates: 0,
      unmatchedLocalAfterRemoteRange: 0,
      reviewOrder: [],
      reviewBuckets: [],
    },
    pendingMigrationGates: null,
    blockers: {
      production: ["API readiness has 1 warning(s)."],
      currentGate: [],
      failedCommands: [],
    },
    steps: [],
    artifacts: {},
    artifactMeta: {},
    artifactSummary: { total: 0, existing: 0, missing: 0, bytes: 0 },
    ...overrides,
  };
}

describe("preflight summary checker", () => {
  it("can enforce an alternate summary file path", () => {
    const dir = mkdtempSync(join(tmpdir(), "zivo-preflight-"));
    const file = join(dir, "summary.json");
    writeFileSync(file, `${JSON.stringify(baseSummary(), null, 2)}\n`);

    const result = spawnSync(process.execPath, [checker, "--summary-path", file], {
      cwd: root,
      encoding: "utf8",
      env: { PATH: process.env.PATH ?? "" },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("current gate is ready");
  });

  it("prints the alternate summary path when mode validation fails", () => {
    const dir = mkdtempSync(join(tmpdir(), "zivo-preflight-"));
    const file = join(dir, "summary.json");
    writeFileSync(file, `${JSON.stringify(baseSummary(), null, 2)}\n`);

    const result = spawnSync(process.execPath, [checker, "--summary-path", file, "--require-mode", "strict"], {
      cwd: root,
      encoding: "utf8",
      env: { PATH: process.env.PATH ?? "" },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Summary mode is soft, but strict was required.");
    expect(result.stderr).toContain("Summary path:");
    expect(result.stderr).toContain(file);
  });

  it("fails when the ready flag disagrees with blockers", () => {
    const dir = mkdtempSync(join(tmpdir(), "zivo-preflight-"));
    const file = join(dir, "summary.json");
    writeFileSync(file, `${JSON.stringify(baseSummary({
      readyForCurrentGate: true,
      counts: {
        ...baseSummary().counts,
        currentGateBlockers: 1,
      },
      blockers: {
        production: ["API readiness has 1 warning(s)."],
        currentGate: ["Environment readiness has 1 critical finding(s)."],
        failedCommands: [],
      },
    }), null, 2)}\n`);

    const result = spawnSync(process.execPath, [checker, "--summary-path", file], {
      cwd: root,
      encoding: "utf8",
      env: { PATH: process.env.PATH ?? "" },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("current gate readiness is inconsistent with blockers");
    expect(result.stderr).toContain("Computed ready from blockers: no");
    expect(result.stderr).toContain("Current gate blockers: 1");
  });
});
