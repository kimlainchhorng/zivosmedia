#!/usr/bin/env node
/**
 * Production preflight for ZIVO.
 *
 * Runs the upgrade/readiness checks that matter before a deploy or schema push.
 * Default mode is local-friendly and reports blockers without failing on known
 * migration-history gaps. Pass --strict for production gating.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { knownDuplicateVersionArgs } from "../supabase/migration-policy.mjs";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const strict = args.has("--strict");
const skipBuild = args.has("--skip-build");
const skipTypeCheck = args.has("--skip-type-check");
const reportPath = path.join(root, "docs", "production-preflight-report.md");

const results = [];

function rel(file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

function commandLabel(command, commandArgs) {
  return [command, ...commandArgs].join(" ");
}

function runStep(id, title, command, commandArgs, options = {}) {
  console.log(`\n[preflight] ${title}`);
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const output = `${stdout}${stderr}`.trim();
  let parsed = null;

  if (options.capture && options.parseJson) {
    try {
      parsed = JSON.parse(stdout);
    } catch (error) {
      results.push({
        id,
        title,
        command: commandLabel(command, commandArgs),
        status: "failed",
        message: `Could not parse JSON output: ${error.message}`,
        output,
      });
      return null;
    }
  }

  results.push({
    id,
    title,
    command: commandLabel(command, commandArgs),
    status: result.status === 0 ? "passed" : "failed",
    output,
    parsed,
  });

  return parsed;
}

function summarizeStatus(result) {
  if (result.status === "failed") return "failed";
  return "passed";
}

function renderJsonSummary(parsed) {
  if (!parsed) return "";
  return [
    "```json",
    JSON.stringify(parsed, null, 2),
    "```",
  ].join("\n");
}

function renderReport({ api, database, drift }) {
  const lines = [
    "# Production Preflight Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Mode: ${strict ? "strict" : "soft"}`,
    "",
    "## Summary",
    "",
    `- API readiness: critical=${api?.critical ?? "unknown"}, warnings=${api?.warnings ?? "unknown"}`,
    `- Database readiness: blockers=${database?.blockers ?? "unknown"}, warnings=${database?.warnings ?? "unknown"}`,
    `- Migration drift: duplicateVersions=${drift?.duplicateVersions ?? "unknown"}, allowedDuplicateVersions=${drift?.allowedDuplicateVersions ?? "unknown"}, newDuplicateVersions=${drift?.newDuplicateVersions ?? "unknown"}, remoteError=${drift?.remoteError ? "yes" : "no"}`,
    "",
    "## Steps",
    "",
  ];

  for (const result of results) {
    lines.push(`### ${result.title}`);
    lines.push("");
    lines.push(`- Command: \`${result.command}\``);
    lines.push(`- Status: ${summarizeStatus(result)}`);
    if (result.parsed) {
      lines.push("");
      lines.push(renderJsonSummary(result.parsed));
    } else if (result.output) {
      lines.push("");
      lines.push("```text");
      lines.push(result.output.slice(0, 6000));
      if (result.output.length > 6000) lines.push("...truncated");
      lines.push("```");
    }
    lines.push("");
  }

  lines.push("## Production Gate");
  lines.push("");
  if (strict) {
    lines.push("- Strict mode fails on any readiness warning, database blocker, failed command, or unavailable migration history.");
  } else {
    lines.push("- Soft mode reports readiness blockers but only fails for command/runtime failures.");
  }
  lines.push("");

  return lines.join("\n");
}

runStep(
  "secrets",
  "Secret scan",
  "node",
  ["scripts/security/check-secrets.mjs"],
);

const drift = runStep(
  "migration-drift",
  "Supabase migration drift report",
  "node",
  ["scripts/supabase/audit-migration-drift.mjs", "--linked", "--write-report", ...knownDuplicateVersionArgs()],
  { capture: true, parseJson: true },
);

const database = runStep(
  "database-upgrade",
  "Database upgrade readiness",
  "node",
  ["scripts/supabase/database-upgrade-readiness.mjs", "--write-report"],
  { capture: true, parseJson: true },
);

const api = runStep(
  "api-readiness",
  "API readiness",
  "node",
  ["scripts/security/api-readiness-check.mjs", "--write-report"],
  { capture: true, parseJson: true },
);

runStep(
  "media-readiness",
  "Media lazy-load readiness",
  "node",
  ["scripts/performance/media-readiness-check.mjs"],
  { capture: true },
);

if (!skipTypeCheck) {
  runStep(
    "type-check",
    "TypeScript type-check",
    "node",
    [
      "--max-old-space-size=8192",
      "./node_modules/typescript/bin/tsc",
      "--noEmit",
      "--incremental",
      "--tsBuildInfoFile",
      ".tsbuildinfo.app",
      "-p",
      "tsconfig.app.json",
    ],
  );
}

if (!skipBuild) {
  runStep(
    "build",
    "Production build",
    "node",
    ["--max-old-space-size=8192", "./node_modules/vite/bin/vite.js", "build", "--logLevel", "warn"],
  );
}

writeFileSync(reportPath, renderReport({ api, database, drift }), "utf8");

const failedCommands = results.filter((result) => result.status === "failed");
const hardBlockers = [];

if (api?.critical > 0) hardBlockers.push(`API readiness has ${api.critical} critical finding(s).`);
if (strict && api?.warnings > 0) hardBlockers.push(`API readiness has ${api.warnings} warning(s).`);
if (strict && database?.blockers > 0) hardBlockers.push(`Database readiness has ${database.blockers} blocker(s).`);
if (strict && database?.warnings > 0) hardBlockers.push(`Database readiness has ${database.warnings} warning(s).`);
if (strict && drift?.remoteError) hardBlockers.push("Supabase remote migration history is unavailable.");
if (strict && drift?.newDuplicateVersions > 0) hardBlockers.push(`Supabase migrations have ${drift.newDuplicateVersions} unresolved duplicate version(s).`);

console.log(`\n[preflight] Report written to ${rel(reportPath)}`);

if (failedCommands.length || hardBlockers.length) {
  console.error("\n[preflight] Not production-ready yet:");
  for (const result of failedCommands) console.error(`- ${result.title} failed`);
  for (const blocker of hardBlockers) console.error(`- ${blocker}`);
  process.exitCode = 1;
} else {
  console.log("\n[preflight] Ready for the selected gate.");
}
