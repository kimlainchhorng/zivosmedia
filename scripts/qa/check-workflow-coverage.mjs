#!/usr/bin/env node
/**
 * Validate the generated workflow coverage report.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const reportPath = path.join(root, "docs", "workflow-coverage.json");
const summaryPath = path.join(root, "docs", "production-preflight-summary.json");
const requiredWorkflowIds = [
  "sso-auth-sessions",
  "customer-booking-order",
  "shop-owner-admin",
  "client-staff-workflows",
  "payments-refunds",
  "payouts-earnings",
  "email-marketing-consent",
  "ads-monetization-tracking",
  "push-notifications",
  "storage-media-cdn",
  "policy-legal-trust",
  "api-speed-ops",
  "security-anti-hack",
  "graphics-design-speed",
  "native-mobile-release",
];
const failures = [];

function fail(message) {
  failures.push(message);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

if (!existsSync(reportPath)) {
  fail("docs/workflow-coverage.json is missing.");
} else {
  let report = null;
  let summary = null;
  try {
    report = JSON.parse(readFileSync(reportPath, "utf8"));
  } catch (error) {
    fail(`docs/workflow-coverage.json could not be parsed: ${error.message}`);
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

  if (report) {
    if (typeof report.generated !== "string") fail("report.generated must be string.");
    if (!isObject(report.currentGate)) fail("report.currentGate must be object.");
    if (!Array.isArray(report.productionBlockers)) fail("report.productionBlockers must be array.");
    if (!isObject(report.totals)) fail("report.totals must be object.");
    if (!Array.isArray(report.priority)) fail("report.priority must be array.");
    if (!Array.isArray(report.workflows)) fail("report.workflows must be array.");
    if (isObject(report.currentGate)) {
      if (typeof report.currentGate.mode !== "string") fail("report.currentGate.mode must be string.");
      if (!Array.isArray(report.currentGate.productionBlockers)) fail("report.currentGate.productionBlockers must be array.");
      if (Array.isArray(report.productionBlockers) && Array.isArray(report.currentGate.productionBlockers)) {
        const expected = JSON.stringify(report.currentGate.productionBlockers);
        const actual = JSON.stringify(report.productionBlockers);
        if (actual !== expected) fail("report.productionBlockers must match report.currentGate.productionBlockers.");
      }
    }
    if (summary && isObject(report.currentGate)) {
      if (report.currentGate.mode !== summary.mode) fail("report.currentGate.mode must match preflight summary mode.");
      const expectedStatus = summary.supabase?.remoteMigrationHistoryStatus ?? "unknown";
      if (report.currentGate.remoteMigrationHistoryStatus !== expectedStatus) {
        fail("report.currentGate.remoteMigrationHistoryStatus must match preflight summary.");
      }
      const expectedBlockers = JSON.stringify(summary.blockers?.production ?? []);
      const actualBlockers = JSON.stringify(report.productionBlockers ?? []);
      if (actualBlockers !== expectedBlockers) fail("report.productionBlockers must match preflight summary production blockers.");
    }

    const workflowIds = new Set();
    for (const [index, workflow] of (report.workflows ?? []).entries()) {
      if (!isObject(workflow)) {
        fail(`report.workflows[${index}] must be object.`);
        continue;
      }
      if (typeof workflow.id !== "string") fail(`report.workflows[${index}].id must be string.`);
      if (typeof workflow.label !== "string") fail(`report.workflows[${index}].label must be string.`);
      if (typeof workflow.status !== "string") fail(`report.workflows[${index}].status must be string.`);
      if (typeof workflow.testCoverageRatio !== "number") fail(`report.workflows[${index}].testCoverageRatio must be number.`);
      for (const key of ["frontend", "backend", "database", "tests", "docs"]) {
        if (!isObject(workflow[key])) fail(`report.workflows[${index}].${key} must be object.`);
        if (typeof workflow[key]?.count !== "number") fail(`report.workflows[${index}].${key}.count must be number.`);
        if (!Array.isArray(workflow[key]?.samples)) fail(`report.workflows[${index}].${key}.samples must be array.`);
      }
      if (typeof workflow.id === "string") workflowIds.add(workflow.id);
    }

    for (const id of requiredWorkflowIds) {
      if (!workflowIds.has(id)) fail(`report.workflows must include ${id}.`);
    }
  }
}

if (failures.length) {
  console.error("workflow-coverage: failed");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`workflow-coverage: ok (${requiredWorkflowIds.length} workflows)`);
