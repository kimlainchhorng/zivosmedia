#!/usr/bin/env node
/**
 * Validate generated production preflight report artifacts.
 *
 * This is intentionally narrower than the full summary schema check: it gives
 * CI a focused failure when reports were not produced or the aggregate totals
 * drift from the per-artifact metadata.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { KNOWN_DUPLICATE_MIGRATION_VERSION_SET } from "../supabase/migration-policy.mjs";

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
const summaryLabel = (() => { const r = path.relative(root, summaryPath).replace(/\\/g, "/"); return r.startsWith("..") ? summaryPath : (r || summaryPath); })();
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

function fail(message) {
  console.error(`preflight-artifacts: ${message}`);
  process.exit(1);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  values.push(current);
  return values;
}

function readCsvRowCount(artifactPath) {
  const file = path.join(root, artifactPath);
  if (!existsSync(file)) fail(`CSV artifact is missing: ${artifactPath}.`);

  const lines = readFileSync(file, "utf8")
    .trim()
    .split("\n")
    .filter((line) => line.trim());

  if (!lines.length) fail(`${artifactPath} must include a header row.`);
  return lines.length - 1;
}

function readCsvRows(artifactPath) {
  const file = path.join(root, artifactPath);
  if (!existsSync(file)) fail(`CSV artifact is missing: ${artifactPath}.`);

  const lines = readFileSync(file, "utf8")
    .trim()
    .split("\n")
    .filter((line) => line.trim());

  if (!lines.length) fail(`${artifactPath} must include a header row.`);
  const header = parseCsvLine(lines.shift() ?? "");
  return lines.map((line, index) => ({
    lineNumber: index + 2,
    row: Object.fromEntries(parseCsvLine(line).map((value, columnIndex) => [header[columnIndex], value])),
  }));
}

function validateCsvHeader(artifactPath, expectedHeader) {
  const file = path.join(root, artifactPath);
  if (!existsSync(file)) fail(`CSV artifact is missing: ${artifactPath}.`);

  const [headerLine = ""] = readFileSync(file, "utf8").split("\n");
  const header = parseCsvLine(headerLine);
  if (header.length !== expectedHeader.length) {
    fail(`${artifactPath} header has ${header.length} columns, expected ${expectedHeader.length}.`);
  }

  for (const [index, expectedColumn] of expectedHeader.entries()) {
    if (header[index] !== expectedColumn) {
      fail(`${artifactPath} header column ${index + 1} is ${header[index] ?? "missing"}, expected ${expectedColumn}.`);
    }
  }
}

function validateTimestampVersion(artifactPath, lineNumber, column, value) {
  if (!/^\d{14}$/.test(value ?? "")) {
    fail(`${artifactPath}:${lineNumber} ${column} must be a 14-digit migration version.`);
  }
}

function validateOptionalTimestampVersion(artifactPath, lineNumber, column, value) {
  if (value) validateTimestampVersion(artifactPath, lineNumber, column, value);
}

function validateIntegerColumn(artifactPath, lineNumber, column, value) {
  if (!/^-?\d+$/.test(value ?? "")) {
    fail(`${artifactPath}:${lineNumber} ${column} must be an integer.`);
  }
}

function validateOptionalIntegerColumn(artifactPath, lineNumber, column, value) {
  if (value) validateIntegerColumn(artifactPath, lineNumber, column, value);
}

function validateOneOf(artifactPath, lineNumber, column, value, allowedValues) {
  if (!allowedValues.includes(value)) {
    fail(`${artifactPath}:${lineNumber} ${column} must be one of ${allowedValues.join(", ")}.`);
  }
}

function validateFilenameStartsWithVersion(artifactPath, lineNumber, versionColumn, filenameColumn, row) {
  const version = row[versionColumn];
  const filename = row[filenameColumn];
  if (!filename?.startsWith(`${version}_`)) {
    fail(`${artifactPath}:${lineNumber} ${filenameColumn} must start with ${version}_.`);
  }
}

function validateUniqueColumn(artifactPath, rows, column, options = {}) {
  const seen = new Map();
  const allowKnownDuplicateMigrationVersions = Boolean(options.allowKnownDuplicateMigrationVersions);

  for (const { lineNumber, row } of rows) {
    const value = row[column];
    if (!value) continue;
    if (seen.has(value)) {
      if (allowKnownDuplicateMigrationVersions && KNOWN_DUPLICATE_MIGRATION_VERSION_SET.has(value)) {
        continue;
      }
      fail(`${artifactPath}:${lineNumber} ${column} duplicates value ${value} from line ${seen.get(value)}.`);
    }
    seen.set(value, lineNumber);
  }
}

function validateCandidateConfidenceDelta(artifactPath, lineNumber, row) {
  const deltaSeconds = Number(row.delta_seconds);
  if (!Number.isInteger(deltaSeconds) || deltaSeconds < 0) {
    fail(`${artifactPath}:${lineNumber} delta_seconds must be a non-negative integer.`);
  }

  if (row.confidence === "high" && deltaSeconds > 5) {
    fail(`${artifactPath}:${lineNumber} high confidence requires delta_seconds <= 5.`);
  }
  if (row.confidence === "medium" && (deltaSeconds < 6 || deltaSeconds > 60)) {
    fail(`${artifactPath}:${lineNumber} medium confidence requires delta_seconds between 6 and 60.`);
  }
}

function readCandidateStats(summary) {
  const candidatePath = summary.artifacts?.reconciliationCandidates;
  if (typeof candidatePath !== "string") {
    fail("artifacts.reconciliationCandidates must be string when repair draft is present.");
  }

  const file = path.join(root, candidatePath);
  if (!existsSync(file)) fail(`Candidate CSV is missing: ${candidatePath}.`);

  const lines = readFileSync(file, "utf8").trim().split("\n");
  const header = parseCsvLine(lines.shift() ?? "");
  const confidenceIndex = header.indexOf("confidence");
  if (confidenceIndex === -1) fail(`${candidatePath} is missing confidence column.`);

  const stats = { total: 0, high: 0, medium: 0 };
  for (const line of lines) {
    if (!line.trim()) continue;
    const row = parseCsvLine(line);
    const confidence = row[confidenceIndex];
    stats.total += 1;
    if (confidence === "high") stats.high += 1;
    else if (confidence === "medium") stats.medium += 1;
    else fail(`${candidatePath} has unsupported confidence value: ${confidence || "missing"}.`);
  }
  return stats;
}

function validateCsvRowCount(artifactPath, expectedCount, label) {
  if (typeof expectedCount !== "number") {
    fail(`${label} expected count must be number.`);
  }

  const rowCount = readCsvRowCount(artifactPath);
  if (rowCount !== expectedCount) {
    fail(`${artifactPath} has ${rowCount} data rows, expected ${expectedCount}.`);
  }
}

function headerCount(text, label, artifactPath) {
  const match = text.match(new RegExp(`^-- ${label}: (\\d+)`, "m"));
  if (!match) fail(`${artifactPath} must include ${label} header.`);
  return Number(match[1]);
}

function validateRepairDraft(file, artifactPath, summary) {
  const text = readFileSync(file, "utf8");
  if (!/Review-only artifact\. Do not run this file as-is\./.test(text)) {
    fail(`${artifactPath} must include the review-only warning.`);
  }
  if (!/\brollback;\s*$/i.test(text.trim())) {
    fail(`${artifactPath} must end with rollback;`);
  }

  const liveStatements = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("--"));
  const allowedStatements = new Set(["begin;", "rollback;"]);
  for (const statement of liveStatements) {
    if (!allowedStatements.has(statement.toLowerCase())) {
      fail(`${artifactPath} contains live SQL outside begin/rollback: ${statement}`);
    }
  }

  const commentedUpdates = text
    .split("\n")
    .filter((line) => /^--\s*update\s+supabase_migrations\.schema_migrations\b/i.test(line));

  const candidateStats = readCandidateStats(summary);
  if (candidateStats.total > 0 && !commentedUpdates.length) {
    fail(`${artifactPath} must include commented repair update statements.`);
  }

  const draftStats = {
    total: headerCount(text, "Candidate mappings", artifactPath),
    high: headerCount(text, "High confidence \\(<= 5 seconds apart\\)", artifactPath),
    medium: headerCount(text, "Medium confidence \\(6-60 seconds apart\\)", artifactPath),
    commentedUpdates: commentedUpdates.length,
  };

  if (draftStats.total !== candidateStats.total) {
    fail(`${artifactPath} candidate count is ${draftStats.total}, expected ${candidateStats.total}.`);
  }
  if (draftStats.high !== candidateStats.high) {
    fail(`${artifactPath} high-confidence count is ${draftStats.high}, expected ${candidateStats.high}.`);
  }
  if (draftStats.medium !== candidateStats.medium) {
    fail(`${artifactPath} medium-confidence count is ${draftStats.medium}, expected ${candidateStats.medium}.`);
  }
  if (draftStats.commentedUpdates !== candidateStats.total) {
    fail(`${artifactPath} has ${draftStats.commentedUpdates} commented updates, expected ${candidateStats.total}.`);
  }
}

function validateCandidateCsv(artifactPath, summary) {
  const reconciliation = summary.reconciliation;
  if (!isPlainObject(reconciliation)) return;

  validateCsvHeader(artifactPath, [
    "local_version",
    "local_filename",
    "remote_version",
    "delta_seconds",
    "confidence",
  ]);

  const candidateStats = readCandidateStats(summary);
  const rows = readCsvRows(artifactPath);
  validateUniqueColumn(artifactPath, rows, "local_version", { allowKnownDuplicateMigrationVersions: true });
  validateUniqueColumn(artifactPath, rows, "remote_version");
  for (const { lineNumber, row } of rows) {
    validateTimestampVersion(artifactPath, lineNumber, "local_version", row.local_version);
    validateTimestampVersion(artifactPath, lineNumber, "remote_version", row.remote_version);
    validateIntegerColumn(artifactPath, lineNumber, "delta_seconds", row.delta_seconds);
    validateOneOf(artifactPath, lineNumber, "confidence", row.confidence, ["high", "medium"]);
    validateCandidateConfidenceDelta(artifactPath, lineNumber, row);
    validateFilenameStartsWithVersion(artifactPath, lineNumber, "local_version", "local_filename", row);
  }

  const expectedStats = {
    total: reconciliation.candidates,
    high: reconciliation.highConfidenceCandidates,
    medium: reconciliation.mediumConfidenceCandidates,
  };

  for (const [key, expected] of Object.entries(expectedStats)) {
    if (candidateStats[key] !== expected) {
      fail(`${artifactPath} ${key} count is ${candidateStats[key]}, expected ${expected}.`);
    }
  }
}

function validatePendingLocalReviewCsv(artifactPath, summary) {
  validateCsvHeader(artifactPath, [
    "version",
    "filename",
    "risk",
    "domain",
    "create_table",
    "sequence_backed_id",
    "enable_rls",
    "creates_table_without_rls",
    "create_policy",
    "grant",
    "creates_table_without_grant",
    "sequence_grant",
    "sequence_backed_id_without_sequence_grant",
    "create_function",
    "security_definer",
    "sets_search_path",
    "security_definer_without_search_path",
    "cron",
    "hardcoded_supabase_url",
    "legacy_anon_jwt",
  ]);
  validateCsvRowCount(
    artifactPath,
    summary.reconciliation?.unmatchedLocalAfterRemoteRange,
    "reconciliation.unmatchedLocalAfterRemoteRange",
  );
  const rows = readCsvRows(artifactPath);
  validateUniqueColumn(artifactPath, rows, "version", { allowKnownDuplicateMigrationVersions: true });
  for (const { lineNumber, row } of rows) {
    validateTimestampVersion(artifactPath, lineNumber, "version", row.version);
    validateOneOf(artifactPath, lineNumber, "risk", row.risk, ["high", "medium", "low"]);
    validateFilenameStartsWithVersion(artifactPath, lineNumber, "version", "filename", row);
  }
}

function validateUnmatchedLocalCsv(artifactPath, summary) {
  validateCsvHeader(artifactPath, [
    "local_version",
    "local_filename",
    "risk",
    "domain",
    "position_vs_remote_range",
    "nearest_remote_version",
    "nearest_delta_seconds",
  ]);
  validateCsvRowCount(
    artifactPath,
    summary.reconciliation?.unmatchedLocalAfterCandidates,
    "reconciliation.unmatchedLocalAfterCandidates",
  );
  const rows = readCsvRows(artifactPath);
  validateUniqueColumn(artifactPath, rows, "local_version", { allowKnownDuplicateMigrationVersions: true });
  for (const { lineNumber, row } of rows) {
    validateTimestampVersion(artifactPath, lineNumber, "local_version", row.local_version);
    validateOptionalTimestampVersion(artifactPath, lineNumber, "nearest_remote_version", row.nearest_remote_version);
    validateOptionalIntegerColumn(artifactPath, lineNumber, "nearest_delta_seconds", row.nearest_delta_seconds);
    validateOneOf(artifactPath, lineNumber, "risk", row.risk, ["high", "medium", "low"]);
    validateOneOf(artifactPath, lineNumber, "position_vs_remote_range", row.position_vs_remote_range, [
      "before_remote_range",
      "inside_remote_range",
      "after_remote_range",
    ]);
    validateFilenameStartsWithVersion(artifactPath, lineNumber, "local_version", "local_filename", row);
  }
}

function validateUnmatchedRemoteCsv(artifactPath, summary) {
  validateCsvHeader(artifactPath, [
    "remote_version",
    "position_vs_local_range",
    "nearest_local_version",
    "nearest_local_filename",
    "nearest_delta_seconds",
  ]);
  validateCsvRowCount(
    artifactPath,
    summary.reconciliation?.unmatchedRemoteAfterCandidates,
    "reconciliation.unmatchedRemoteAfterCandidates",
  );
  const rows = readCsvRows(artifactPath);
  validateUniqueColumn(artifactPath, rows, "remote_version");
  for (const { lineNumber, row } of rows) {
    validateTimestampVersion(artifactPath, lineNumber, "remote_version", row.remote_version);
    validateOptionalTimestampVersion(artifactPath, lineNumber, "nearest_local_version", row.nearest_local_version);
    validateOptionalIntegerColumn(artifactPath, lineNumber, "nearest_delta_seconds", row.nearest_delta_seconds);
    validateOneOf(artifactPath, lineNumber, "position_vs_local_range", row.position_vs_local_range, [
      "before_local_range",
      "inside_local_range",
      "after_local_range",
    ]);
    if (row.nearest_local_version) {
      validateFilenameStartsWithVersion(artifactPath, lineNumber, "nearest_local_version", "nearest_local_filename", row);
    }
  }
}

function expectMarkdownLine(text, artifactPath, line) {
  if (!text.includes(line)) {
    fail(`${artifactPath} is missing line: ${line}`);
  }
}

function validateMarkdownReport(file, artifactPath, summary) {
  const reconciliation = summary.reconciliation;
  if (!isPlainObject(reconciliation)) return;

  const text = readFileSync(file, "utf8");
  if (isPlainObject(summary.options)) {
    expectMarkdownLine(
      text,
      artifactPath,
      `Options: strict=${summary.options.strict ? "yes" : "no"}, skipBuild=${summary.options.skipBuild ? "yes" : "no"}, skipTypeCheck=${summary.options.skipTypeCheck ? "yes" : "no"}`,
    );
  }
  if (isPlainObject(summary.supabase)) {
    expectMarkdownLine(
      text,
      artifactPath,
      `- Supabase remote migration history read: ${summary.supabase.remoteMigrationHistoryRead ? "yes" : "no"}`,
    );
    expectMarkdownLine(
      text,
      artifactPath,
      `- Supabase remote migration history status: ${summary.supabase.remoteMigrationHistoryStatus ?? "unknown"}`,
    );
  }
  expectMarkdownLine(
    text,
    artifactPath,
    `- Reconciliation: candidates=${reconciliation.candidates}, highConfidence=${reconciliation.highConfidenceCandidates}, mediumConfidence=${reconciliation.mediumConfidenceCandidates}, unmatchedLocal=${reconciliation.unmatchedLocalAfterCandidates}, unmatchedRemote=${reconciliation.unmatchedRemoteAfterCandidates}, likelyPendingLocal=${reconciliation.unmatchedLocalAfterRemoteRange}`,
  );
  expectMarkdownLine(text, artifactPath, "## Migration Reconciliation");
  expectMarkdownLine(text, artifactPath, `- Candidate mappings: ${reconciliation.candidates}`);
  expectMarkdownLine(text, artifactPath, `- High-confidence candidates: ${reconciliation.highConfidenceCandidates}`);
  expectMarkdownLine(text, artifactPath, `- Medium-confidence candidates: ${reconciliation.mediumConfidenceCandidates}`);
  expectMarkdownLine(text, artifactPath, `- Unmatched local after candidates: ${reconciliation.unmatchedLocalAfterCandidates}`);
  expectMarkdownLine(text, artifactPath, `- Unmatched remote after candidates: ${reconciliation.unmatchedRemoteAfterCandidates}`);
  expectMarkdownLine(text, artifactPath, `- Likely pending local after remote range: ${reconciliation.unmatchedLocalAfterRemoteRange}`);
  if (Array.isArray(reconciliation.reviewBuckets)) {
    const countedReviewOrder = reconciliation.reviewBuckets
      .map((bucket) => `${bucket.label} (${bucket.count})`)
      .join(" -> ");
    expectMarkdownLine(text, artifactPath, `- Reconciliation review order: ${countedReviewOrder}`);
    expectMarkdownLine(text, artifactPath, `- Review order: ${countedReviewOrder}`);
  } else if (Array.isArray(reconciliation.reviewOrder)) {
    const reviewOrder = reconciliation.reviewOrder.join(" -> ");
    expectMarkdownLine(text, artifactPath, `- Reconciliation review order: ${reviewOrder}`);
    expectMarkdownLine(text, artifactPath, `- Review order: ${reviewOrder}`);
  }
}

function validateReconciliationPlan(file, artifactPath, summary) {
  const reconciliation = summary.reconciliation;
  if (!isPlainObject(reconciliation)) return;

  const text = readFileSync(file, "utf8");
  expectMarkdownLine(text, artifactPath, "## Review Order");

  if (Array.isArray(reconciliation.reviewBuckets)) {
    for (const [index, bucket] of reconciliation.reviewBuckets.entries()) {
      if (!isPlainObject(bucket) || typeof bucket.label !== "string" || typeof bucket.count !== "number") {
        fail(`reconciliation.reviewBuckets[${index}] must include label and count.`);
      }
      expectMarkdownLine(
        text,
        artifactPath,
        `${index + 1}. ${bucket.label} (${bucket.count} item${bucket.count === 1 ? "" : "s"})`,
      );
    }
    return;
  }

  if (!Array.isArray(reconciliation.reviewOrder)) return;
  const reviewOrderCounts = [
    reconciliation.highConfidenceCandidates,
    reconciliation.mediumConfidenceCandidates,
    reconciliation.unmatchedLocalAfterCandidates,
    reconciliation.unmatchedRemoteAfterCandidates,
    reconciliation.unmatchedLocalAfterRemoteRange,
  ];
  for (const [index, item] of reconciliation.reviewOrder.entries()) {
    const count = reviewOrderCounts[index];
    expectMarkdownLine(text, artifactPath, `${index + 1}. ${item} (${count} item${count === 1 ? "" : "s"})`);
  }
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

if (!isPlainObject(summary.artifacts)) fail("artifacts must be an object.");
if (!isPlainObject(summary.artifactMeta)) fail("artifactMeta must be an object.");
if (!isPlainObject(summary.artifactSummary)) fail("artifactSummary must be an object.");

const artifactRows = Object.entries(summary.artifactMeta);
if (!artifactRows.length) fail("artifactMeta is empty.");

for (const key of requiredArtifactKeys) {
  if (!isPlainObject(summary.artifactMeta[key])) fail(`artifactMeta.${key} must be an object.`);
  if (typeof summary.artifacts[key] !== "string") fail(`artifacts.${key} must be string.`);
}

let existing = 0;
let bytes = 0;
const artifactPaths = new Map();

for (const [key, meta] of artifactRows) {
  if (!isPlainObject(meta)) fail(`artifactMeta.${key} must be an object.`);
  if (typeof meta.path !== "string") fail(`artifactMeta.${key}.path must be string.`);
  if (path.isAbsolute(meta.path)) fail(`artifactMeta.${key}.path must be repository-relative.`);
  if (meta.path !== summary.artifacts?.[key]) fail(`artifactMeta.${key}.path must match artifacts.${key}.`);
  if (artifactPaths.has(meta.path)) {
    fail(`artifactMeta.${key}.path duplicates artifactMeta.${artifactPaths.get(meta.path)}.path: ${meta.path}.`);
  }
  artifactPaths.set(meta.path, key);

  const file = path.join(root, meta.path);
  if (!existsSync(file)) fail(`Artifact is missing: ${meta.path}.`);

  const actualBytes = statSync(file).size;
  if (meta.exists !== true) fail(`artifactMeta.${key}.exists must be true.`);
  if (meta.bytes !== actualBytes) fail(`artifactMeta.${key}.bytes is ${meta.bytes}, expected ${actualBytes}.`);
  if (actualBytes <= 0) fail(`Artifact is empty: ${meta.path}.`);

  if (key === "reconciliationRepairDraft") {
    validateRepairDraft(file, meta.path, summary);
  }
  if (key === "reconciliationCandidates") {
    validateCandidateCsv(meta.path, summary);
  }
  if (key === "pendingLocalReview") {
    validatePendingLocalReviewCsv(meta.path, summary);
  }
  if (key === "unmatchedLocal") {
    validateUnmatchedLocalCsv(meta.path, summary);
  }
  if (key === "unmatchedRemote") {
    validateUnmatchedRemoteCsv(meta.path, summary);
  }
  if (key === "markdown") {
    validateMarkdownReport(file, meta.path, summary);
  }
  if (key === "reconciliationPlan") {
    validateReconciliationPlan(file, meta.path, summary);
  }

  existing += 1;
  bytes += actualBytes;
}

const expectedSummary = {
  total: artifactRows.length,
  existing,
  missing: artifactRows.length - existing,
  bytes,
};

for (const [key, value] of Object.entries(expectedSummary)) {
  if (summary.artifactSummary[key] !== value) {
    fail(`artifactSummary.${key} is ${summary.artifactSummary[key]}, expected ${value}.`);
  }
}

console.log(`preflight-artifacts: ok (${existing}/${artifactRows.length} files, ${bytes} bytes).`);
