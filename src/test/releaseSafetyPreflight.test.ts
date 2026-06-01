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

describe("release safety preflight contracts", () => {
  it("keeps machine summaries explicit about mode, options, artifacts, and Supabase history", () => {
    const summary = json("docs/production-preflight-summary.json");
    const schemaCheck = source("scripts/deploy/test-preflight-summary-schema.mjs");

    expect(summary.schemaVersion).toBe(1);
    expect(["soft", "strict"]).toContain(summary.mode);
    expect(summary.options).toEqual(
      expect.objectContaining({
        strict: summary.mode === "strict",
        skipBuild: expect.any(Boolean),
        skipTypeCheck: expect.any(Boolean),
      }),
    );
    expect(summary.supabase).toEqual(
      expect.objectContaining({
        remoteMigrationHistoryRead: expect.any(Boolean),
        remoteMigrationHistoryStatus: expect.any(String),
        linkedHistoryDisconnected: expect.any(Boolean),
      }),
    );
    expect(summary.artifactSummary).toEqual(
      expect.objectContaining({
        total: expect.any(Number),
        existing: expect.any(Number),
        missing: expect.any(Number),
        bytes: expect.any(Number),
      }),
    );
    expect(summary.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "secrets", title: "Security scan" }),
      ]),
    );
    expect(schemaCheck).toContain("productionBlockers: Array.isArray(summary.blockers.production)");
    expect(schemaCheck).toContain('secrets: "Security scan"');
    expect(schemaCheck).toContain("summary.counts[key] !== expected");
    expect(schemaCheck).toContain("readyForProductionGate must match production blockers and failed commands");
  });

  it("keeps production summary checks strict-mode aware and diagnostic-rich", () => {
    const text = source("scripts/deploy/check-preflight-summary.mjs");
    const renderer = source("scripts/deploy/render-preflight-step-summary.mjs");

    expect(text).toContain("requiredMode");
    expect(text).toContain('argValue("--summary-path")');
    expect(text).toContain("summaryLabel");
    expect(text).toContain("Summary mode is");
    expect(text).toContain("printSummaryContext()");
    expect(text).toContain("Summary path");
    expect(text).toContain("Remote migration history status");
    expect(text).toContain("gate readiness is inconsistent with blockers");
    expect(text).toContain("Computed ready from blockers");
    expect(text).toContain("Supabase access token configured for drift check");
    expect(text).toContain("Reconciliation candidates");
    expect(text).toContain("remoteMigrationHistoryStatus=");

    expect(renderer).toContain("Supabase setup next steps");
    expect(renderer).toContain("Readiness consistency");
    expect(renderer).toContain("Summary ready flags disagree with blockers or failed commands.");
    expect(renderer).toContain("supabase:runtime-settings:sql -- --strict --emit-secrets");
    expect(renderer).toContain("docs/supabase-deploy-env-setup.md");
  });

  it("keeps artifact checks tied to required report files and reconciliation CSV contracts", () => {
    const text = source("scripts/deploy/check-preflight-artifacts.mjs");

    expect(text).toContain('argValue("--summary-path")');
    expect(text).toContain("summaryLabel");
    expect(text).toContain("Could not parse ${summaryLabel}");

    for (const artifactKey of [
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
    ]) {
      expect(text).toContain(`"${artifactKey}"`);
    }

    expect(text).toContain("validateCandidateCsv");
    expect(text).toContain("validatePendingLocalReviewCsv");
    expect(text).toContain("validateUnmatchedLocalCsv");
    expect(text).toContain("validateUnmatchedRemoteCsv");
    expect(text).toContain("validateCandidateConfidenceDelta");
    expect(text).toContain("validateUniqueColumn");
    expect(text).toContain("reconciliation.reviewBuckets");
    expect(text).toContain("bucket.label");
    expect(text).toContain("bucket.count");
  });

  it("keeps platform readiness matrix checks aligned with the preflight summary", () => {
    const text = source("scripts/qa/check-platform-readiness-matrix.mjs");

    expect(text).toContain("requiredLaneIds");
    expect(text).toContain("matrix.currentGate.mode must match preflight summary mode");
    expect(text).toContain("matrix.currentGate.remoteMigrationHistoryStatus must match preflight summary");
    expect(text).toContain("matrix.productionBlockers must match preflight summary production blockers");
    expect(text).toContain("priority must be ok when testsNeededForOk is 0");
    expect(text).toContain("testsNeededForOk must be greater than 0");
    expect(text).toContain("matrix.priorityTestGapActions must include non-ok lane");
    expect(text).toContain("suggestedTestFiles must be");
  });

  it("keeps Supabase secret misuse regressions in the release-safety lane", () => {
    const matrix = source("scripts/qa/platform-readiness-matrix.mjs");
    const coverage = source("scripts/qa/workflow-coverage.mjs");
    const coverageCheck = source("scripts/qa/check-workflow-coverage.mjs");
    const plan = source("scripts/qa/workflow-test-plan.mjs");
    const planCheck = source("scripts/qa/check-workflow-test-plan.mjs");
    const preflight = source("scripts/deploy/preflight.mjs");
    const packageJson = source("package.json");
    const readinessDocs = source("docs/end-to-end-platform-readiness.md");
    const upgradeDocs = source("docs/platform-upgrade-workflow.md");
    const deploySecretsDocs = source("docs/production-deploy-secrets.md");
    const rotationRunbook = source("docs/supabase-secret-rotation-runbook.md");

    expect(matrix).toContain("src/test/deployEnvPreflight.test.ts");
    expect(matrix).toContain("src/test/deployWorkflowGates.test.ts");
    expect(matrix).toContain("src/test/otaDeployBypass.test.ts");
    expect(matrix).toContain("src/test/secretScanner.test.ts");
    expect(matrix).toContain("SUPABASE_ACCESS_TOKEN");
    expect(matrix).toContain("VITE_SUPABASE_PUBLISHABLE_KEY");
    expect(matrix).toContain("service-role JWT");
    expect(plan).toContain("Deploy env preflight rejects service-role JWTs configured as anon keys.");
    expect(plan).toContain("Production and preview deploy workflows run preflight/secret gates before publishing.");
    expect(plan).toContain("Secret scanning blocks pasted Supabase publishable keys before commit/deploy.");
    expect(plan).toContain("Secret scanning blocks Supabase management access tokens before commit/deploy.");
    expect(preflight).toContain('"Security scan"');
    expect(preflight).toContain('"security:scan"');
    expect(source("docs/production-preflight-report.md")).toContain("- Command: `npm run security:scan`");
    expect(packageJson).toContain('"security:check-secrets:local"');
    expect(packageJson).toContain('"security:check-supabase-token-fragments"');
    expect(packageJson).toContain('"platform:audit": "npm run security:scan && npm run qa:platform-readiness');
    expect(packageJson).toContain('"release:gate": "npm run deploy:preflight:test-summary-schema && npm run deploy:preflight:check-artifacts && npm run qa:platform-readiness && npm run qa:platform-readiness:check && npm run security:scan"');
    expect(packageJson).toContain('"release:production-gate": "npm run release:gate && npm run deploy:preflight:check-production-summary"');
    expect(packageJson).toContain("npm run qa:platform-readiness && npm run qa:platform-readiness:check");
    expect(packageJson).toContain("npm run qa:workflow-coverage && npm run qa:workflow-coverage:check");
    expect(packageJson).toContain("npm run qa:workflow-test-plan && npm run qa:workflow-test-plan:check");
    expect(coverage).toContain("productionBlockers");
    expect(coverage).toContain("## Production Blockers");
    expect(coverageCheck).toContain("report.productionBlockers must match preflight summary production blockers");
    expect(plan).toContain("productionBlockers");
    expect(plan).toContain("verificationCommands");
    expect(plan).toContain("npm run platform:audit");
    expect(plan).toContain("npm run release:gate");
    expect(plan).toContain("npm run release:production-gate");
    expect(plan).toContain("npm run deploy:preflight:strict");
    expect(plan).toContain("## Audit Command");
    expect(plan).toContain("## Production Blockers");
    expect(planCheck).toContain("plan.productionBlockers must match plan.currentGate.productionBlockers");
    expect(planCheck).toContain("plan.currentGate must match workflow coverage currentGate");
    expect(planCheck).toContain("plan.productionBlockers must match preflight summary production blockers");
    expect(planCheck).toContain("plan.verificationCommands must include npm run platform:audit");
    expect(planCheck).toContain("plan.verificationCommands must include npm run release:gate");
    expect(planCheck).toContain("plan.verificationCommands must include npm run release:production-gate");
    expect(readinessDocs).toContain("Full platform audit: `npm run platform:audit`");
    expect(readinessDocs).toContain("Compact release gate: `npm run release:gate`");
    expect(readinessDocs).toContain("Production release gate: `npm run release:production-gate`");
    expect(readinessDocs).toContain("npm run platform:audit");
    expect(readinessDocs).toContain("npm run release:gate");
    expect(readinessDocs).toContain("npm run release:production-gate");
    expect(upgradeDocs).toContain("npm run platform:audit");
    expect(upgradeDocs).toContain("npm run release:gate");
    expect(upgradeDocs).toContain("npm run release:production-gate");
    expect(deploySecretsDocs).toContain("npm run release:production-gate");
    expect(deploySecretsDocs).not.toContain("npm run deploy:preflight:check-production-summary");
    expect(rotationRunbook).toContain("npm run release:production-gate");
  });
});
