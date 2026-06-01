#!/usr/bin/env node
/**
 * Validate the generated workflow test plan.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const planPath = path.join(root, "docs", "workflow-test-plan.json");
const coveragePath = path.join(root, "docs", "workflow-coverage.json");
const summaryPath = path.join(root, "docs", "production-preflight-summary.json");
const failures = [];

function fail(message) {
  failures.push(message);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

if (!existsSync(planPath)) {
  fail("docs/workflow-test-plan.json is missing.");
} else {
  let plan = null;
  let coverage = null;
  let summary = null;
  try {
    plan = JSON.parse(readFileSync(planPath, "utf8"));
  } catch (error) {
    fail(`docs/workflow-test-plan.json could not be parsed: ${error.message}`);
  }
  if (existsSync(coveragePath)) {
    try {
      coverage = JSON.parse(readFileSync(coveragePath, "utf8"));
    } catch (error) {
      fail(`docs/workflow-coverage.json could not be parsed: ${error.message}`);
    }
  } else {
    fail("docs/workflow-coverage.json is missing.");
  }
  if (existsSync(summaryPath)) {
    try {
      summary = JSON.parse(readFileSync(summaryPath, "utf8"));
    } catch (error) {
      fail(`docs/production-preflight-summary.json could not be parsed: ${error.message}`);
    }
  } else {
    fail("docs/production-preflight-summary.json is missing.");
  }

  if (plan) {
    if (typeof plan.generated !== "string") fail("plan.generated must be string.");
    if (plan.sourceCoverage !== "docs/workflow-coverage.json") fail("plan.sourceCoverage must point to docs/workflow-coverage.json.");
    if (!isObject(plan.currentGate)) fail("plan.currentGate must be object.");
    if (!Array.isArray(plan.productionBlockers)) fail("plan.productionBlockers must be array.");
    if (!Array.isArray(plan.verificationCommands) || plan.verificationCommands.length === 0) {
      fail("plan.verificationCommands must be a non-empty array.");
    } else {
      if (!plan.verificationCommands.includes("npm run platform:audit")) {
        fail("plan.verificationCommands must include npm run platform:audit.");
      }
      if (!plan.verificationCommands.includes("npm run release:gate")) {
        fail("plan.verificationCommands must include npm run release:gate.");
      }
      if (!plan.verificationCommands.includes("npm run release:production-gate")) {
        fail("plan.verificationCommands must include npm run release:production-gate.");
      }
      if (!plan.verificationCommands.includes("npm run deploy:preflight:strict")) {
        fail("plan.verificationCommands must include npm run deploy:preflight:strict.");
      }
    }
    if (!Array.isArray(plan.actions) || plan.actions.length === 0) fail("plan.actions must be a non-empty array.");

    if (isObject(plan.currentGate)) {
      if (!Array.isArray(plan.currentGate.productionBlockers)) fail("plan.currentGate.productionBlockers must be array.");
      if (Array.isArray(plan.productionBlockers) && Array.isArray(plan.currentGate.productionBlockers)) {
        const expected = JSON.stringify(plan.currentGate.productionBlockers);
        const actual = JSON.stringify(plan.productionBlockers);
        if (actual !== expected) fail("plan.productionBlockers must match plan.currentGate.productionBlockers.");
      }
    }
    if (plan && coverage && isObject(plan.currentGate) && isObject(coverage.currentGate)) {
      const expectedGate = JSON.stringify(coverage.currentGate);
      const actualGate = JSON.stringify(plan.currentGate);
      if (actualGate !== expectedGate) fail("plan.currentGate must match workflow coverage currentGate.");
      const expectedBlockers = JSON.stringify(coverage.productionBlockers ?? coverage.currentGate?.productionBlockers ?? []);
      const actualBlockers = JSON.stringify(plan.productionBlockers ?? []);
      if (actualBlockers !== expectedBlockers) fail("plan.productionBlockers must match workflow coverage productionBlockers.");
    }
    if (summary && isObject(plan.currentGate)) {
      if (plan.currentGate.mode !== summary.mode) fail("plan.currentGate.mode must match preflight summary mode.");
      const expectedStatus = summary.supabase?.remoteMigrationHistoryStatus ?? "unknown";
      if (plan.currentGate.remoteMigrationHistoryStatus !== expectedStatus) {
        fail("plan.currentGate.remoteMigrationHistoryStatus must match preflight summary.");
      }
      const expectedBlockers = JSON.stringify(summary.blockers?.production ?? []);
      const actualBlockers = JSON.stringify(plan.productionBlockers ?? []);
      if (actualBlockers !== expectedBlockers) fail("plan.productionBlockers must match preflight summary production blockers.");
    }

    for (const [index, action] of (plan.actions ?? []).entries()) {
      if (!isObject(action)) {
        fail(`plan.actions[${index}] must be object.`);
        continue;
      }
      for (const key of ["id", "label", "status", "target", "command"]) {
        if (typeof action[key] !== "string" || !action[key].trim()) {
          fail(`plan.actions[${index}].${key} must be non-empty string.`);
        }
      }
      if (typeof action.order !== "number" || action.order !== index + 1) {
        fail(`plan.actions[${index}].order must be ${index + 1}.`);
      }
      if (!Array.isArray(action.acceptance) || action.acceptance.length === 0) {
        fail(`plan.actions[${index}].acceptance must be non-empty array.`);
      }
    }
  }
}

if (failures.length) {
  console.error("workflow-test-plan: failed");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("workflow-test-plan: ok");
