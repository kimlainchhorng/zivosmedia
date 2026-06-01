#!/usr/bin/env node
/**
 * Validate the generated platform readiness matrix.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const matrixPath = path.join(root, "docs", "platform-readiness-matrix.json");
const summaryPath = path.join(root, "docs", "production-preflight-summary.json");
const failures = [];

const requiredLaneIds = [
  "release-safety",
  "auth-sso-sessions",
  "role-workflows",
  "payments-payouts",
  "email-push-marketing",
  "database-storage-media",
  "security-anti-abuse",
  "legal-policy-compliance",
  "frontend-graphics-speed",
  "native-mobile-release",
  "api-server-operations",
];

function fail(message) {
  failures.push(message);
}

function readJson(file, label) {
  if (!existsSync(file)) {
    fail(`${label} is missing.`);
    return null;
  }

  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    fail(`${label} could not be parsed: ${error.message}`);
    return null;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const matrix = readJson(matrixPath, "docs/platform-readiness-matrix.json");
const summary = readJson(summaryPath, "docs/production-preflight-summary.json");

if (matrix) {
  if (typeof matrix.generated !== "string") fail("matrix.generated must be string.");
  if (!isPlainObject(matrix.totals)) fail("matrix.totals must be object.");
  if (!isPlainObject(matrix.currentGate)) fail("matrix.currentGate must be object.");
  if (!Array.isArray(matrix.productionBlockers)) fail("matrix.productionBlockers must be array.");
  if (!Array.isArray(matrix.lanes)) fail("matrix.lanes must be array.");
  if (!Array.isArray(matrix.priorityTestGapActions)) fail("matrix.priorityTestGapActions must be array.");

  const totals = matrix.totals ?? {};
  for (const [key, minimum] of Object.entries({
    pageFiles: 1,
    componentFiles: 1,
    sourceFiles: 1,
    edgeFunctions: 1,
    migrations: 1,
    testFiles: 1,
    docsFiles: 1,
  })) {
    if (typeof totals[key] !== "number" || totals[key] < minimum) {
      fail(`matrix.totals.${key} must be >= ${minimum}.`);
    }
  }

  const laneIds = new Set();
  for (const [index, lane] of (matrix.lanes ?? []).entries()) {
    if (!isPlainObject(lane)) {
      fail(`matrix.lanes[${index}] must be object.`);
      continue;
    }
    if (typeof lane.id !== "string") fail(`matrix.lanes[${index}].id must be string.`);
    if (typeof lane.label !== "string") fail(`matrix.lanes[${index}].label must be string.`);
    if (typeof lane.evidenceCount !== "number") fail(`matrix.lanes[${index}].evidenceCount must be number.`);
    if (!isPlainObject(lane.evidenceBreakdown)) {
      fail(`matrix.lanes[${index}].evidenceBreakdown must be object.`);
    } else {
      const breakdownTotal = ["pages", "components", "otherSource", "edgeFunctions", "migrations", "tests", "docs"].reduce((sum, key) => {
        if (typeof lane.evidenceBreakdown[key] !== "number") fail(`matrix.lanes[${index}].evidenceBreakdown.${key} must be number.`);
        return sum + (typeof lane.evidenceBreakdown[key] === "number" ? lane.evidenceBreakdown[key] : 0);
      }, 0);
      if (typeof lane.evidenceCount === "number" && breakdownTotal !== lane.evidenceCount) {
        fail(`matrix.lanes[${index}].evidenceBreakdown total must equal evidenceCount.`);
      }
    }
    if (!isPlainObject(lane.testGap)) {
      fail(`matrix.lanes[${index}].testGap must be object.`);
    } else {
      for (const key of ["implementationEvidence", "testEvidence", "testCoverageRatio", "targetTestEvidence", "testsNeededForHigh", "testsNeededForOk"]) {
        if (typeof lane.testGap[key] !== "number") fail(`matrix.lanes[${index}].testGap.${key} must be number.`);
      }
      if (!["critical", "high", "medium", "ok"].includes(lane.testGap.priority)) {
        fail(`matrix.lanes[${index}].testGap.priority must be critical, high, medium, or ok.`);
      }
      if (lane.evidenceBreakdown && typeof lane.testGap.testEvidence === "number" && lane.testGap.testEvidence !== lane.evidenceBreakdown.tests) {
        fail(`matrix.lanes[${index}].testGap.testEvidence must equal evidenceBreakdown.tests.`);
      }
      if (
        typeof lane.testGap.testsNeededForHigh === "number" &&
        typeof lane.testGap.testEvidence === "number" &&
        lane.testGap.testsNeededForHigh !== Math.max(0, 5 - lane.testGap.testEvidence)
      ) {
        fail(`matrix.lanes[${index}].testGap.testsNeededForHigh is inconsistent.`);
      }
      if (lane.testGap.testsNeededForOk === 0 && lane.testGap.priority !== "ok") {
        fail(`matrix.lanes[${index}].testGap.priority must be ok when testsNeededForOk is 0.`);
      }
    }
    if (!Array.isArray(lane.sampleEvidence)) fail(`matrix.lanes[${index}].sampleEvidence must be array.`);
    if (!Array.isArray(lane.suggestedTestFiles) || lane.suggestedTestFiles.length === 0) {
      fail(`matrix.lanes[${index}].suggestedTestFiles must be a non-empty array.`);
    }
    if (!Array.isArray(lane.verificationCommands) || lane.verificationCommands.length === 0) {
      fail(`matrix.lanes[${index}].verificationCommands must be a non-empty array.`);
    }
    if (typeof lane.nextAction !== "string" || !lane.nextAction.trim()) {
      fail(`matrix.lanes[${index}].nextAction must be non-empty string.`);
    }
    if (typeof lane.id === "string") laneIds.add(lane.id);
  }

  for (const id of requiredLaneIds) {
    if (!laneIds.has(id)) fail(`matrix.lanes must include ${id}.`);
  }

  const priorityActionLaneIds = new Set();
  for (const [index, action] of (matrix.priorityTestGapActions ?? []).entries()) {
    if (!isPlainObject(action)) {
      fail(`matrix.priorityTestGapActions[${index}] must be object.`);
      continue;
    }
    if (action.order !== index + 1) fail(`matrix.priorityTestGapActions[${index}].order must be ${index + 1}.`);
    if (typeof action.id !== "string") fail(`matrix.priorityTestGapActions[${index}].id must be string.`);
    if (!["critical", "high", "medium"].includes(action.priority)) {
      fail(`matrix.priorityTestGapActions[${index}].priority must be critical, high, or medium.`);
    }
    if (typeof action.nextAction !== "string" || !action.nextAction.trim()) {
      fail(`matrix.priorityTestGapActions[${index}].nextAction must be non-empty string.`);
    }
    if (!Array.isArray(action.verificationCommands) || !action.verificationCommands.length) {
      fail(`matrix.priorityTestGapActions[${index}].verificationCommands must be non-empty array.`);
    }
    if (!Array.isArray(action.suggestedTestFiles) || !action.suggestedTestFiles.length) {
      fail(`matrix.priorityTestGapActions[${index}].suggestedTestFiles must be non-empty array.`);
    }
    for (const key of ["targetTestEvidence", "testsNeededForHigh", "testsNeededForOk"]) {
      if (typeof action[key] !== "number") fail(`matrix.priorityTestGapActions[${index}].${key} must be number.`);
    }
    if (action.testsNeededForOk <= 0) {
      fail(`matrix.priorityTestGapActions[${index}].testsNeededForOk must be greater than 0.`);
    }
    if (typeof action.id === "string") priorityActionLaneIds.add(action.id);
  }

  for (const lane of matrix.lanes ?? []) {
    if (lane?.testGap?.priority && lane.testGap.priority !== "ok" && !priorityActionLaneIds.has(lane.id)) {
      fail(`matrix.priorityTestGapActions must include non-ok lane ${lane.id}.`);
    }
  }
}

if (matrix && summary) {
  if (matrix.currentGate?.mode !== summary.mode) fail("matrix.currentGate.mode must match preflight summary mode.");
  if (matrix.currentGate?.readyForCurrentGate !== summary.readyForCurrentGate) {
    fail("matrix.currentGate.readyForCurrentGate must match preflight summary.");
  }
  if (matrix.currentGate?.readyForProductionGate !== summary.readyForProductionGate) {
    fail("matrix.currentGate.readyForProductionGate must match preflight summary.");
  }
  if (matrix.currentGate?.remoteMigrationHistoryStatus !== summary.supabase?.remoteMigrationHistoryStatus) {
    fail("matrix.currentGate.remoteMigrationHistoryStatus must match preflight summary.");
  }
  if (!Array.isArray(matrix.currentGate?.productionBlockers)) {
    fail("matrix.currentGate.productionBlockers must be array.");
  }
  if (Array.isArray(matrix.productionBlockers) && Array.isArray(matrix.currentGate?.productionBlockers)) {
    const expected = JSON.stringify(matrix.currentGate.productionBlockers);
    const actual = JSON.stringify(matrix.productionBlockers);
    if (actual !== expected) fail("matrix.productionBlockers must match matrix.currentGate.productionBlockers.");
  }
  const expectedBlockers = JSON.stringify(summary.blockers?.production ?? []);
  const actualBlockers = JSON.stringify(matrix.productionBlockers ?? []);
  if (actualBlockers !== expectedBlockers) fail("matrix.productionBlockers must match preflight summary production blockers.");
}

if (failures.length) {
  console.error("platform-readiness-matrix: failed");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`platform-readiness-matrix: ok (${matrix.lanes.length} lanes)`);
