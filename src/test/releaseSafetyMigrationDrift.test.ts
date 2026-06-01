import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function json(relativePath: string) {
  return JSON.parse(source(relativePath));
}

function parseCsv(relativePath: string) {
  const [headerLine, ...lines] = source(relativePath).trim().split(/\r?\n/);
  const headers = headerLine.split(",");

  return lines
    .filter(Boolean)
    .map((line) => {
      const cells = line.split(",");
      return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
    });
}

function liveSqlStatements(sql: string) {
  return sql
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("--"));
}

describe("release safety migration drift artifacts", () => {
  it("keeps the reconciliation repair draft review-only and aligned with candidate count", () => {
    const draft = source("docs/supabase-migration-reconciliation-repair-draft.sql");
    const candidates = parseCsv("docs/supabase-migration-reconciliation-candidates.csv");

    expect(draft).toContain("Review-only artifact. Do not run this file as-is.");
    expect(draft).toContain("Every repair statement is commented out");
    expect(draft).toContain("begin;");
    expect(draft.trim().endsWith("rollback;")).toBe(true);
    expect(liveSqlStatements(draft)).toEqual(["begin;", "rollback;"]);

    const commentedUpdates = draft.match(/^-- update supabase_migrations\.schema_migrations$/gm) ?? [];
    expect(commentedUpdates).toHaveLength(candidates.length);
  });

  it("keeps candidate CSV totals and confidence buckets aligned with the preflight summary", () => {
    const summary = json("docs/production-preflight-summary.json");
    const candidates = parseCsv("docs/supabase-migration-reconciliation-candidates.csv");
    const highConfidence = candidates.filter((candidate) => candidate.confidence === "high");
    const mediumConfidence = candidates.filter((candidate) => candidate.confidence === "medium");

    expect(candidates).toHaveLength(summary.reconciliation.candidates);
    expect(highConfidence).toHaveLength(summary.reconciliation.highConfidenceCandidates);
    expect(mediumConfidence).toHaveLength(summary.reconciliation.mediumConfidenceCandidates);

    for (const candidate of candidates) {
      const deltaSeconds = Number(candidate.delta_seconds);

      expect(candidate.local_version).toMatch(/^\d{14}$/);
      expect(candidate.remote_version).toMatch(/^\d{14}$/);
      expect(candidate.local_filename.startsWith(`${candidate.local_version}_`)).toBe(true);
      expect(candidate.local_filename.endsWith(".sql")).toBe(true);

      if (candidate.confidence === "high") {
        expect(deltaSeconds).toBeGreaterThanOrEqual(0);
        expect(deltaSeconds).toBeLessThanOrEqual(5);
      } else {
        expect(candidate.confidence).toBe("medium");
        expect(deltaSeconds).toBeGreaterThanOrEqual(6);
        expect(deltaSeconds).toBeLessThanOrEqual(60);
      }
    }
  });

  it("keeps the reconciliation plan diagnostic and ordered by preflight review buckets", () => {
    const plan = source("docs/supabase-migration-reconciliation-plan.md");
    const summary = json("docs/production-preflight-summary.json");

    expect(plan).toContain("This plan is diagnostic only. It does not repair migration history or change the remote schema.");
    expect(plan).toContain("Do not run production `db push`, `db pull`, or migration repair");
    expect(plan).toContain("Review-only repair SQL draft");

    for (const [index, bucket] of summary.reconciliation.reviewBuckets.entries()) {
      expect(plan).toContain(`${index + 1}. ${bucket.label} (${bucket.count} items)`);
    }
  });

  it("keeps migration drift auditing wired to reconciliation artifacts and strict blockers", () => {
    const auditScript = source("scripts/supabase/audit-migration-drift.mjs");
    const preflightScript = source("scripts/deploy/preflight.mjs");
    const artifactCheckScript = source("scripts/deploy/check-preflight-artifacts.mjs");

    expect(auditScript).toContain("reconciliationRepairDraftPath");
    expect(auditScript).toContain("writeFileSync(reconciliationRepairDraftPath");
    expect(auditScript).toContain("renderReconciliationRepairDraftSql");
    expect(auditScript).toContain("remoteError");
    expect(auditScript).toContain("linkedHistoryDisconnected");
    expect(auditScript).toContain("pendingLocalRiskGateFailures");

    expect(preflightScript).toContain("linkedHistoryDisconnected");
    expect(preflightScript).toContain("Supabase linked migration history is disconnected");
    expect(preflightScript).toContain("reviewBuckets");

    expect(artifactCheckScript).toContain("validateCandidateCsv");
    expect(artifactCheckScript).toContain("validateCandidateConfidenceDelta");
    expect(artifactCheckScript).toContain("reconciliationRepairDraft");
    expect(artifactCheckScript).toContain("reconciliation.reviewBuckets");
    expect(artifactCheckScript).toContain("bucket.label");
    expect(artifactCheckScript).toContain("bucket.count");
  });
});
