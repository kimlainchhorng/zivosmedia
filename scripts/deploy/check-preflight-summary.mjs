#!/usr/bin/env node
/**
 * Validate the machine-readable production preflight summary.
 *
 * This intentionally reads the generated JSON artifact instead of rerunning the
 * whole preflight. Use it in CI jobs that split "generate report" and "enforce
 * gate" into separate steps.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const production = args.has("--production");

function argValue(name) {
  const prefix = `${name}=`;
  const inline = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(name);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];
  return "";
}

const maxAgeMinutesRaw = argValue("--max-age-minutes");
const maxAgeMinutes = maxAgeMinutesRaw ? Number(maxAgeMinutesRaw) : 1440;
const requiredMode = argValue("--require-mode");
const summaryPath = path.resolve(
  root,
  argValue("--summary-path") || path.join("docs", "production-preflight-summary.json"),
);
const summaryLabel = (() => { const r = path.relative(root, summaryPath).replace(/\\/g, "/"); return r.startsWith("..") ? summaryPath : (r || summaryPath); })();

function fail(message) {
  console.error(`preflight-summary: ${message}`);
  process.exit(1);
}

if (!existsSync(summaryPath)) {
  fail(`Missing ${summaryLabel}. Run npm run deploy:preflight first.`);
}

let summary;
try {
  summary = JSON.parse(readFileSync(summaryPath, "utf8"));
} catch (error) {
  fail(`Could not parse ${summaryLabel}: ${error.message}`);
}

if (summary.schemaVersion !== 1) {
  fail(`Unsupported preflight summary schemaVersion: ${summary.schemaVersion ?? "missing"}.`);
}

if (requiredMode && !["soft", "strict"].includes(requiredMode)) {
  fail("--require-mode must be either soft or strict.");
}

if (!Number.isFinite(maxAgeMinutes) || maxAgeMinutes < 0) {
  fail("--max-age-minutes must be a non-negative number.");
}

const generatedAt = Date.parse(summary.generated ?? "");
if (!Number.isFinite(generatedAt)) {
  fail("Summary is missing a valid generated timestamp.");
}

const ageMinutes = (Date.now() - generatedAt) / 60000;

function printSummaryContext() {
  console.error(`- Summary path: ${summaryLabel}`);
  const options = summary.options ?? {};
  console.error(`- Summary mode: ${summary.mode ?? "missing"}`);
  console.error(`- Summary age: ${Number.isFinite(ageMinutes) ? `${ageMinutes.toFixed(1)} minutes` : "unknown"}`);
  console.error(`- Summary options: strict=${options.strict ? "yes" : "no"}, skipBuild=${options.skipBuild ? "yes" : "no"}, skipTypeCheck=${options.skipTypeCheck ? "yes" : "no"}`);
  console.error(`- Remote migration history status: ${summary.supabase?.remoteMigrationHistoryStatus ?? "unknown"}`);
}

if (requiredMode && summary.mode !== requiredMode) {
  console.error(`preflight-summary: Summary mode is ${summary.mode ?? "missing"}, but ${requiredMode} was required.`);
  printSummaryContext();
  console.error(`- Regenerate with: npm run deploy:preflight${requiredMode === "strict" ? ":strict" : ""}`);
  process.exit(1);
}

if (maxAgeMinutes > 0 && ageMinutes > maxAgeMinutes) {
  console.error(`preflight-summary: Summary is stale: ${ageMinutes.toFixed(1)} minutes old, max allowed is ${maxAgeMinutes}.`);
  printSummaryContext();
  console.error("- Regenerate with: npm run deploy:preflight");
  process.exit(1);
}

const ready = production ? summary.readyForProductionGate : summary.readyForCurrentGate;
const blockers = production ? summary.blockers?.production : summary.blockers?.currentGate;
const failedCommands = summary.blockers?.failedCommands ?? [];

if (!Array.isArray(blockers)) {
  fail(`Summary blockers.${production ? "production" : "currentGate"} must be an array.`);
}
if (!Array.isArray(failedCommands)) {
  fail("Summary blockers.failedCommands must be an array.");
}

const computedReady = blockers.length === 0 && failedCommands.length === 0;
if (ready !== computedReady) {
  console.error(`preflight-summary: ${production ? "production" : "current"} gate readiness is inconsistent with blockers.`);
  printSummaryContext();
  console.error(`- Summary ready flag: ${ready ? "yes" : "no"}`);
  console.error(`- Computed ready from blockers: ${computedReady ? "yes" : "no"}`);
  console.error(`- Failed commands: ${failedCommands.length}`);
  console.error(`- ${production ? "Production" : "Current gate"} blockers: ${blockers.length}`);
  process.exit(1);
}

function printReconciliationDiagnostics() {
  const reconciliation = summary.reconciliation;
  if (!reconciliation || !summary.supabase?.linkedHistoryDisconnected) return;

  console.error("- Reconciliation candidates: " +
    `${reconciliation.candidates ?? "unknown"} total, ` +
    `${reconciliation.highConfidenceCandidates ?? "unknown"} high-confidence, ` +
    `${reconciliation.mediumConfidenceCandidates ?? "unknown"} medium-confidence`);
  console.error(`- Unmatched after candidates: ${reconciliation.unmatchedLocalAfterCandidates ?? "unknown"} local, ${reconciliation.unmatchedRemoteAfterCandidates ?? "unknown"} remote`);
  console.error(`- Likely pending local after remote range: ${reconciliation.unmatchedLocalAfterRemoteRange ?? "unknown"}`);
  if (Array.isArray(reconciliation.reviewBuckets)) {
    console.error(`- Review order: ${reconciliation.reviewBuckets.map((bucket) => `${bucket.label} (${bucket.count})`).join(" -> ")}`);
  } else if (Array.isArray(reconciliation.reviewOrder)) {
    console.error(`- Review order: ${reconciliation.reviewOrder.join(" -> ")}`);
  }
}

function printRemoteMigrationDiagnostics() {
  if (summary.supabase?.remoteMigrationHistoryRead !== false) return;

  console.error(`- Remote migration history status: ${summary.supabase?.remoteMigrationHistoryStatus ?? "unknown"}`);
  console.error(`- Supabase access token configured for drift check: ${summary.supabase?.driftAccessToken ? "yes" : "no"}`);
}

if (!ready) {
  const mode = production ? "production" : "current";
  console.error(`preflight-summary: ${mode} gate is not ready.`);
  for (const command of failedCommands) console.error(`- Failed command: ${command}`);
  for (const blocker of blockers ?? []) console.error(`- ${blocker}`);
  printRemoteMigrationDiagnostics();
  printReconciliationDiagnostics();
  process.exit(1);
}

const options = summary.options ?? {};
console.log(
  `preflight-summary: ${production ? "production" : "current"} gate is ready ` +
  `(${ageMinutes.toFixed(1)} minutes old, mode=${summary.mode ?? "missing"}, ` +
  `skipBuild=${options.skipBuild ? "yes" : "no"}, ` +
  `skipTypeCheck=${options.skipTypeCheck ? "yes" : "no"}, ` +
  `remoteMigrationHistoryStatus=${summary.supabase?.remoteMigrationHistoryStatus ?? "unknown"}).`,
);
