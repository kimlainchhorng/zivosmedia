import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const requiredArtifactKeys = [
  "markdown",
  "json",
  "migrationDrift",
  "databaseReadiness",
  "apiReadiness",
  "reconciliationPlan",
  "reconciliationCandidates",
  "reconciliationRepairDraft",
  "pendingLocalReview",
  "unmatchedLocal",
  "unmatchedRemote",
] as const;

function source(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function json(relativePath: string) {
  return JSON.parse(source(relativePath));
}

describe("release safety artifact contracts", () => {
  it("keeps every required preflight artifact present, unique, relative, and byte-accurate", () => {
    const summary = json("docs/production-preflight-summary.json");
    const seenPaths = new Set<string>();
    let existing = 0;
    let bytes = 0;

    expect(summary.schemaVersion).toBe(1);
    expect(summary.artifacts).toBeTruthy();
    expect(summary.artifactMeta).toBeTruthy();
    expect(summary.artifactSummary).toBeTruthy();

    for (const key of requiredArtifactKeys) {
      const artifactPath = summary.artifacts[key];
      const meta = summary.artifactMeta[key];

      expect(typeof artifactPath).toBe("string");
      expect(path.isAbsolute(artifactPath)).toBe(false);
      expect(seenPaths.has(artifactPath)).toBe(false);
      expect(meta).toEqual(
        expect.objectContaining({
          path: artifactPath,
          exists: true,
          bytes: expect.any(Number),
        }),
      );

      const absoluteArtifactPath = path.join(root, artifactPath);
      expect(existsSync(absoluteArtifactPath)).toBe(true);
      expect(meta.bytes).toBe(statSync(absoluteArtifactPath).size);
      expect(meta.bytes).toBeGreaterThan(0);

      seenPaths.add(artifactPath);
      existing += 1;
      bytes += meta.bytes;
    }

    expect(summary.artifactSummary).toEqual({
      total: requiredArtifactKeys.length,
      existing,
      missing: 0,
      bytes,
    });
  });

  it("keeps markdown and JSON preflight reports aligned on gate status and blockers", () => {
    const summary = json("docs/production-preflight-summary.json");
    const report = source(summary.artifacts.markdown);

    expect(report).toContain(`Mode: ${summary.mode}`);
    expect(report).toContain("## Production Gate");
    expect(report).toContain("## Production Blockers");
    expect(report).toContain("## Current Gate Blockers");
    expect(report).toContain(`- Supabase remote migration history status: ${summary.supabase.remoteMigrationHistoryStatus}`);

    for (const blocker of summary.blockers.production) {
      expect(report).toContain(blocker);
    }
  });

  it("keeps readiness reports connected to current and production blockers", () => {
    const summary = json("docs/production-preflight-summary.json");
    const databaseReadiness = source(summary.artifacts.databaseReadiness);
    const apiReadiness = source(summary.artifacts.apiReadiness);
    const migrationDrift = source(summary.artifacts.migrationDrift);

    expect(["soft", "strict"]).toContain(summary.mode);
    expect(summary.readyForCurrentGate).toBe(summary.blockers.currentGate.length === 0 && summary.blockers.failedCommands.length === 0);
    expect(summary.readyForProductionGate).toBe(false);
    expect(summary.counts.databaseBlockers).toBe(0);
    expect(summary.pendingMigrationGates).toEqual(
      expect.objectContaining({
        withoutRls: 0,
        withoutGrants: 0,
        sequenceWithoutGrants: 0,
        definerWithoutSearchPath: 0,
        hardcodedUrls: 0,
        legacyAnonJwts: 0,
      }),
    );
    expect(summary.supabase.linkedHistoryDisconnected).toBe(false);
    expect(summary.supabase.remoteMigrationHistoryStatus).toBe("unavailable");
    expect(summary.blockers.production).toContain("Missing SUPABASE_ACCESS_TOKEN for production migration-history verification.");
    expect(summary.blockers.production).toContain("Supabase remote migration history is unavailable (unavailable).");

    expect(apiReadiness).toContain(`- Warnings: ${summary.counts.apiWarnings}`);
    expect(databaseReadiness).toContain("## Blockers");
    expect(databaseReadiness).toContain("- None");
    expect(migrationDrift).toContain("SUPABASE_ACCESS_TOKEN configured: no");
    expect(migrationDrift).toContain("- Pending local creates tables without explicit grants: 0");
    expect(migrationDrift).toContain("- Pending local hardcoded Supabase URLs: 0");
  });

  it("keeps the artifact checker wired to the same required report set", () => {
    const checker = source("scripts/deploy/check-preflight-artifacts.mjs");

    for (const key of requiredArtifactKeys) {
      expect(checker).toContain(`"${key}"`);
    }

    expect(checker).toContain("artifactSummary");
    expect(checker).toContain("validateMarkdownReport");
    expect(checker).toContain("validateReconciliationPlan");
    expect(checker).toContain("validateRepairDraft");
    expect(checker).toContain("validatePendingLocalReviewCsv");
    expect(checker).toContain("validateUnmatchedLocalCsv");
    expect(checker).toContain("validateUnmatchedRemoteCsv");
  });
});
