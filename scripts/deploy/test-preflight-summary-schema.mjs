#!/usr/bin/env node
/**
 * Contract check for docs/production-preflight-summary.json.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function argValue(name) {
  const prefix = `${name}=`;
  const inline = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(name);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];
  return "";
}

const summaryPath = path.resolve(
  root,
  argValue("--summary-path") || path.join("docs", "production-preflight-summary.json"),
);
const failures = [];
const requiredStepIds = [
  "secrets",
  "environment",
  "runtime-settings-sql",
  "migration-drift",
  "database-upgrade",
  "api-readiness",
  "edge-function-deploy-contracts",
  "edge-function-slot-readiness",
  "edge-function-browser-gates",
  "media-readiness",
];
const requiredStepTitles = {
  secrets: "Security scan",
};
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
];
const expectedReconciliationReviewOrder = [
  "high-confidence candidate mappings",
  "medium-confidence candidate mappings",
  "unmatched local migrations after candidates",
  "unmatched remote versions after candidates",
  "likely pending local migrations after remote range",
];
const expectedReconciliationReviewBucketCountKeys = [
  "highConfidenceCandidates",
  "mediumConfidenceCandidates",
  "unmatchedLocalAfterCandidates",
  "unmatchedRemoteAfterCandidates",
  "unmatchedLocalAfterRemoteRange",
];

function fail(message) {
  failures.push(message);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function expectType(object, key, type) {
  if (typeof object?.[key] !== type) fail(`${key} must be ${type}.`);
}

function existingArtifactPath(value, key) {
  if (typeof value !== "string") {
    fail(`artifacts.${key} must be string.`);
    return;
  }

  if (path.isAbsolute(value)) {
    fail(`artifacts.${key} must be repository-relative.`);
    return;
  }

  if (!existsSync(path.join(root, value))) {
    fail(`artifacts.${key} does not exist: ${value}.`);
  }
}

if (!existsSync(summaryPath)) {
  fail(`${path.relative(root, summaryPath).replace(/\\/g, "/")} is missing. Run npm run deploy:preflight first.`);
} else {
  let summary = null;
  try {
    summary = JSON.parse(readFileSync(summaryPath, "utf8"));
  } catch (error) {
    fail(`Could not parse production preflight summary: ${error.message}`);
  }

  if (summary) {
    if (summary.schemaVersion !== 1) fail("schemaVersion must be 1.");
    if (!["soft", "strict"].includes(summary.mode)) fail("mode must be soft or strict.");
    expectType(summary, "generated", "string");
    expectType(summary, "readyForCurrentGate", "boolean");
    expectType(summary, "readyForProductionGate", "boolean");

    if (!isPlainObject(summary.counts)) fail("counts must be an object.");
    if (!isPlainObject(summary.options)) fail("options must be an object.");
    if (!isPlainObject(summary.supabase)) fail("supabase must be an object.");
    if (!isPlainObject(summary.reconciliation)) fail("reconciliation must be an object.");
    if (!isPlainObject(summary.edgeFunctions)) fail("edgeFunctions must be an object.");
    if (!isPlainObject(summary.blockers)) fail("blockers must be an object.");
    if (!isPlainObject(summary.artifacts)) fail("artifacts must be an object.");
    if (!isPlainObject(summary.artifactMeta)) fail("artifactMeta must be an object.");
    if (!isPlainObject(summary.artifactSummary)) fail("artifactSummary must be an object.");
    if (!Array.isArray(summary.steps)) {
      fail("steps must be an array.");
    } else {
      const stepIds = new Set();
      for (const [index, step] of summary.steps.entries()) {
        if (!isPlainObject(step)) {
          fail(`steps[${index}] must be an object.`);
          continue;
        }
        if (typeof step.id !== "string") fail(`steps[${index}].id must be string.`);
        if (typeof step.title !== "string") fail(`steps[${index}].title must be string.`);
        if (!["passed", "failed"].includes(step.status)) fail(`steps[${index}].status must be passed or failed.`);
        if (typeof step.id === "string") stepIds.add(step.id);
        if (requiredStepTitles[step.id] && step.title !== requiredStepTitles[step.id]) {
          fail(`steps[${index}].title must be ${requiredStepTitles[step.id]} for ${step.id}.`);
        }
      }

      for (const requiredStepId of requiredStepIds) {
        if (!stepIds.has(requiredStepId)) fail(`steps must include ${requiredStepId}.`);
      }
    }

    if (summary.supabase) {
      expectType(summary.supabase, "linkedHistoryDisconnected", "boolean");
      expectType(summary.supabase, "remoteMigrationHistoryRead", "boolean");
      expectType(summary.supabase, "remoteMigrationHistoryStatus", "string");
      if (!["read", "access_token_missing", "unavailable", "unknown"].includes(summary.supabase.remoteMigrationHistoryStatus)) {
        fail("supabase.remoteMigrationHistoryStatus must be read, access_token_missing, unavailable, or unknown.");
      }
    }

    if (summary.options) {
      expectType(summary.options, "strict", "boolean");
      expectType(summary.options, "skipBuild", "boolean");
      expectType(summary.options, "skipTypeCheck", "boolean");
      if (typeof summary.options.strict === "boolean" && (summary.options.strict !== (summary.mode === "strict"))) {
        fail("options.strict must match mode.");
      }
      const stepIds = new Set(Array.isArray(summary.steps) ? summary.steps.map((step) => step?.id) : []);
      if (summary.options.skipBuild === true && stepIds.has("build")) fail("steps must not include build when options.skipBuild is true.");
      if (summary.options.skipTypeCheck === true && stepIds.has("type-check")) fail("steps must not include type-check when options.skipTypeCheck is true.");
    }

    if (summary.reconciliation) {
      for (const key of [
        "candidates",
        "highConfidenceCandidates",
        "mediumConfidenceCandidates",
        "unmatchedLocalAfterCandidates",
        "unmatchedRemoteAfterCandidates",
        "unmatchedLocalAfterRemoteRange",
      ]) {
        if (typeof summary.reconciliation[key] !== "number") fail(`reconciliation.${key} must be number.`);
      }
      if (
        typeof summary.reconciliation.candidates === "number" &&
        typeof summary.reconciliation.highConfidenceCandidates === "number" &&
        typeof summary.reconciliation.mediumConfidenceCandidates === "number" &&
        summary.reconciliation.candidates !== summary.reconciliation.highConfidenceCandidates + summary.reconciliation.mediumConfidenceCandidates
      ) {
        fail("reconciliation.candidates must equal highConfidenceCandidates + mediumConfidenceCandidates.");
      }
      if (!Array.isArray(summary.reconciliation.reviewOrder)) {
        fail("reconciliation.reviewOrder must be an array.");
      } else {
        if (summary.reconciliation.reviewOrder.length !== expectedReconciliationReviewOrder.length) {
          fail(`reconciliation.reviewOrder must contain ${expectedReconciliationReviewOrder.length} items.`);
        }
        for (const [index, expectedItem] of expectedReconciliationReviewOrder.entries()) {
          if (summary.reconciliation.reviewOrder[index] !== expectedItem) {
            fail(`reconciliation.reviewOrder[${index}] must be ${expectedItem}.`);
          }
        }
      }
      if (!Array.isArray(summary.reconciliation.reviewBuckets)) {
        fail("reconciliation.reviewBuckets must be an array.");
      } else {
        if (summary.reconciliation.reviewBuckets.length !== expectedReconciliationReviewOrder.length) {
          fail(`reconciliation.reviewBuckets must contain ${expectedReconciliationReviewOrder.length} items.`);
        }
        for (const [index, expectedItem] of expectedReconciliationReviewOrder.entries()) {
          const bucket = summary.reconciliation.reviewBuckets[index];
          if (!isPlainObject(bucket)) {
            fail(`reconciliation.reviewBuckets[${index}] must be an object.`);
            continue;
          }
          if (bucket.order !== index + 1) fail(`reconciliation.reviewBuckets[${index}].order must be ${index + 1}.`);
          if (bucket.label !== expectedItem) fail(`reconciliation.reviewBuckets[${index}].label must be ${expectedItem}.`);
          const expectedCount = summary.reconciliation[expectedReconciliationReviewBucketCountKeys[index]];
          if (bucket.count !== expectedCount) fail(`reconciliation.reviewBuckets[${index}].count must be ${expectedCount}.`);
        }
      }
    }

    if (summary.edgeFunctions) {
      for (const key of [
        "deployContractFailures",
        "slotReadinessWarnings",
        "slotReadinessFailures",
        "browserGateFailures",
        "browserGatedFunctions",
      ]) {
        if (summary.edgeFunctions[key] !== null && typeof summary.edgeFunctions[key] !== "number") {
          fail(`edgeFunctions.${key} must be number or null.`);
        }
      }
      if (summary.edgeFunctions.slotReadinessMode !== null && typeof summary.edgeFunctions.slotReadinessMode !== "string") {
        fail("edgeFunctions.slotReadinessMode must be string or null.");
      }
      if (summary.edgeFunctions.missingLiveCritical !== null && !Array.isArray(summary.edgeFunctions.missingLiveCritical)) {
        fail("edgeFunctions.missingLiveCritical must be an array or null.");
      }
    }

    if (summary.blockers) {
      if (!Array.isArray(summary.blockers.production)) fail("blockers.production must be an array.");
      if (!Array.isArray(summary.blockers.currentGate)) fail("blockers.currentGate must be an array.");
      if (!Array.isArray(summary.blockers.failedCommands)) fail("blockers.failedCommands must be an array.");
    }

    if (summary.counts && summary.blockers) {
      const expectedCounts = {
        productionBlockers: Array.isArray(summary.blockers.production) ? summary.blockers.production.length : null,
        currentGateBlockers: Array.isArray(summary.blockers.currentGate) ? summary.blockers.currentGate.length : null,
        failedCommands: Array.isArray(summary.blockers.failedCommands) ? summary.blockers.failedCommands.length : null,
      };

      for (const [key, expected] of Object.entries(expectedCounts)) {
        if (expected === null) continue;
        if (summary.counts[key] !== expected) fail(`counts.${key} must match blockers.${key === "productionBlockers" ? "production" : key === "currentGateBlockers" ? "currentGate" : "failedCommands"}.length.`);
      }

      if (typeof summary.readyForProductionGate === "boolean" && Array.isArray(summary.blockers.production) && Array.isArray(summary.blockers.failedCommands)) {
        const expectedReady = summary.blockers.production.length === 0 && summary.blockers.failedCommands.length === 0;
        if (summary.readyForProductionGate !== expectedReady) fail("readyForProductionGate must match production blockers and failed commands.");
      }
      if (typeof summary.readyForCurrentGate === "boolean" && Array.isArray(summary.blockers.currentGate) && Array.isArray(summary.blockers.failedCommands)) {
        const expectedReady = summary.blockers.currentGate.length === 0 && summary.blockers.failedCommands.length === 0;
        if (summary.readyForCurrentGate !== expectedReady) fail("readyForCurrentGate must match current gate blockers and failed commands.");
      }
    }

    if (summary.artifacts) {
      for (const key of requiredArtifactKeys) {
        existingArtifactPath(summary.artifacts[key], key);
      }
    }

    if (summary.artifactMeta) {
      for (const key of requiredArtifactKeys) {
        const meta = summary.artifactMeta[key];
        if (!isPlainObject(meta)) {
          fail(`artifactMeta.${key} must be an object.`);
          continue;
        }
        if (meta.path !== summary.artifacts?.[key]) fail(`artifactMeta.${key}.path must match artifacts.${key}.`);
        if (meta.exists !== true) fail(`artifactMeta.${key}.exists must be true.`);
        if (typeof meta.bytes !== "number" || meta.bytes <= 0) fail(`artifactMeta.${key}.bytes must be a positive number.`);
      }
    }

    if (summary.artifactSummary) {
      const expectedTotal = requiredArtifactKeys.length;
      const expectedExisting = requiredArtifactKeys.filter((key) => summary.artifactMeta?.[key]?.exists === true).length;
      const expectedBytes = requiredArtifactKeys.reduce((sum, key) => (
        sum + (typeof summary.artifactMeta?.[key]?.bytes === "number" ? summary.artifactMeta[key].bytes : 0)
      ), 0);

      if (summary.artifactSummary.total !== expectedTotal) fail("artifactSummary.total must match required artifact count.");
      if (summary.artifactSummary.existing !== expectedExisting) fail("artifactSummary.existing must match existing artifact count.");
      if (summary.artifactSummary.missing !== expectedTotal - expectedExisting) fail("artifactSummary.missing must match missing artifact count.");
      if (summary.artifactSummary.bytes !== expectedBytes) fail("artifactSummary.bytes must match artifactMeta byte total.");
    }
  }
}

if (failures.length) {
  console.error("preflight-summary-schema: failed");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("preflight-summary-schema: ok");
