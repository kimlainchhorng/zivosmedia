#!/usr/bin/env node
/**
 * Production preflight for ZIVO.
 *
 * Runs the upgrade/readiness checks that matter before a deploy or schema push.
 * Default mode is local-friendly and reports blockers without failing on known
 * migration-history gaps. Pass --strict for production gating.
 */
import { spawnSync } from "node:child_process";
import { existsSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { knownDuplicateVersionArgs } from "../supabase/migration-policy.mjs";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const strict = args.has("--strict");
const skipBuild = args.has("--skip-build");
const skipTypeCheck = args.has("--skip-type-check");
const reportPath = path.join(root, "docs", "production-preflight-report.md");
const reportJsonPath = path.join(root, "docs", "production-preflight-summary.json");
const npmCommand = process.platform === "win32" ? "cmd.exe" : "npm";
const npmArgsPrefix = process.platform === "win32" ? ["/d", "/s", "/c", "npm"] : [];

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
  const failureMeta = result.status === 0 ? "" : [
    result.status === null ? "exitStatus=null" : `exitStatus=${result.status}`,
    result.signal ? `signal=${result.signal}` : null,
    result.error?.message ? `error=${result.error.message}` : null,
  ].filter(Boolean).join(", ");
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
        failureMeta,
        output,
      });
      return null;
    }
  }

  results.push({
    id,
    title,
    command: options.label ?? commandLabel(command, commandArgs),
    status: result.status === 0 ? "passed" : "failed",
    failureMeta,
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

function artifactMeta(artifacts) {
  return Object.fromEntries(Object.entries(artifacts).map(([key, value]) => {
    if (typeof value !== "string") return [key, { path: value, exists: false, bytes: null }];
    const file = path.join(root, value);
    return [
      key,
      {
        path: value,
        exists: existsSync(file),
        bytes: existsSync(file) ? statSync(file).size : null,
      },
    ];
  }));
}

function artifactSummary(meta) {
  const rows = Object.values(meta);
  const total = rows.length;
  const existing = rows.filter((item) => item?.exists).length;
  const bytes = rows.reduce((sum, item) => (
    sum + (typeof item?.bytes === "number" ? item.bytes : 0)
  ), 0);

  return {
    total,
    existing,
    missing: total - existing,
    bytes,
  };
}

function renderMachineSummary({ api, database, drift, env, runtimeSettings, edgeDeploy, edgeSlots, edgeBrowser, productionBlockers, currentGateBlockers, failedCommands }) {
  const artifacts = {
    markdown: rel(reportPath),
    json: rel(reportJsonPath),
    migrationDrift: drift?.report ?? null,
    databaseReadiness: database?.report ?? null,
    apiReadiness: api?.report ?? null,
    reconciliationPlan: drift?.reconciliationPlan ?? null,
    reconciliationCandidates: drift?.reconciliationCandidatesReport ?? null,
    reconciliationRepairDraft: drift?.reconciliationRepairDraft ?? null,
    pendingLocalReview: drift?.pendingLocalReviewReport ?? null,
    unmatchedLocal: drift?.unmatchedLocalReport ?? null,
    unmatchedRemote: drift?.unmatchedRemoteReport ?? null,
  };
  const meta = artifactMeta(artifacts);
  const reconciliation = reconciliationSummary(drift);

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    mode: strict ? "strict" : "soft",
    options: {
      strict,
      skipBuild,
      skipTypeCheck,
    },
    readyForCurrentGate: failedCommands.length === 0 && currentGateBlockers.length === 0,
    readyForProductionGate: failedCommands.length === 0 && productionBlockers.length === 0,
    counts: {
      apiCritical: api?.critical ?? null,
      apiWarnings: api?.warnings ?? null,
      environmentCritical: env?.critical ?? null,
      environmentWarnings: env?.warnings ?? null,
      databaseBlockers: database?.blockers ?? null,
      databaseWarnings: database?.warnings ?? null,
      edgeFunctionDeployFailures: edgeDeploy?.counts?.failures ?? null,
      edgeFunctionMissingLiveCritical: edgeSlots?.counts?.missingLiveCritical ?? null,
      edgeFunctionBrowserGateFailures: edgeBrowser?.counts?.failures ?? null,
      failedCommands: failedCommands.length,
      productionBlockers: productionBlockers.length,
      currentGateBlockers: currentGateBlockers.length,
    },
    supabase: {
      envAccessToken: Boolean(env?.checked?.supabaseAccessToken),
      driftAccessToken: Boolean(drift?.supabaseAccessToken),
      runtimeSettingsSqlInputs: Boolean(env?.checked?.runtimeSettingsSqlInputs),
      linkedHistoryDisconnected: Boolean(drift?.linkedHistoryDisconnected),
      remoteMigrationHistoryRead: Boolean(drift && !drift.remoteError),
      remoteMigrationHistoryStatus: remoteMigrationHistoryStatus(drift),
      remoteMigrations: drift?.remoteMigrations ?? null,
      matchedVersions: drift?.matchedVersions ?? null,
      duplicateVersions: drift?.duplicateVersions ?? null,
      newDuplicateVersions: drift?.newDuplicateVersions ?? null,
    },
    reconciliation: {
      candidates: reconciliation.candidates,
      highConfidenceCandidates: reconciliation.highConfidence,
      mediumConfidenceCandidates: reconciliation.mediumConfidence,
      unmatchedLocalAfterCandidates: reconciliation.unmatchedLocalAfterCandidates,
      unmatchedRemoteAfterCandidates: reconciliation.unmatchedRemoteAfterCandidates,
      unmatchedLocalAfterRemoteRange: reconciliation.unmatchedLocalAfterRemoteRange,
      reviewOrder: reconciliation.reviewOrder,
      reviewBuckets: reconciliation.reviewBuckets,
    },
    pendingMigrationGates: drift?.pendingLocalRiskGates ?? null,
    edgeFunctions: {
      deployContractFailures: edgeDeploy?.counts?.failures ?? null,
      slotReadinessMode: edgeSlots?.mode ?? null,
      missingLiveCritical: edgeSlots?.missingLiveCritical ?? null,
      slotReadinessWarnings: edgeSlots?.counts?.warnings ?? null,
      slotReadinessFailures: edgeSlots?.counts?.failures ?? null,
      browserGateFailures: edgeBrowser?.counts?.failures ?? null,
      browserGatedFunctions: edgeBrowser?.counts?.gatedFunctions ?? null,
    },
    blockers: {
      production: productionBlockers,
      currentGate: currentGateBlockers,
      failedCommands: failedCommands.map((result) => result.title),
    },
    steps: results.map((result) => ({
      id: result.id,
      title: result.title,
      status: result.status,
    })),
    artifacts,
    artifactMeta: meta,
    artifactSummary: artifactSummary(meta),
  };
}

function writeMachineSummary(summary) {
  let settled = summary;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    writeFileSync(reportJsonPath, `${JSON.stringify(settled, null, 2)}\n`, "utf8");
    const actualBytes = statSync(reportJsonPath).size;

    if (settled.artifactMeta?.json?.bytes === actualBytes) return;

    settled = {
      ...settled,
      artifactMeta: {
        ...settled.artifactMeta,
        json: {
          ...settled.artifactMeta.json,
          exists: true,
          bytes: actualBytes,
        },
      },
    };
    settled.artifactSummary = artifactSummary(settled.artifactMeta);
  }

  writeFileSync(reportJsonPath, `${JSON.stringify(settled, null, 2)}\n`, "utf8");
}

function remoteMigrationHistoryStatus(drift) {
  if (!drift) return "unknown";
  if (!drift.remoteError) return "read";
  if (/access token not provided|supabase login|SUPABASE_ACCESS_TOKEN/i.test(drift.remoteError)) {
    return "access_token_missing";
  }
  return "unavailable";
}

function buildBlockers({ api, database, drift, env, production }) {
  const blockers = [];
  const checked = env?.checked ?? {};

  if (api?.critical > 0) blockers.push(`API readiness has ${api.critical} critical finding(s).`);
  if (env?.critical > 0) blockers.push(`Environment readiness has ${env.critical} critical finding(s).`);
  if (production && checked.backendSupabaseUrl === false) blockers.push("Missing SUPABASE_URL for production backend cron/runtime settings.");
  if (production && checked.anonKey === false) blockers.push("Missing SUPABASE_ANON_KEY for production Edge Function verification and database cron auth.");
  if (production && checked.supabaseAccessToken === false) blockers.push("Missing SUPABASE_ACCESS_TOKEN for production migration-history verification.");
  if (production && env?.warnings > 0) blockers.push(`Environment readiness has ${env.warnings} warning(s).`);
  if (production && api?.warnings > 0) blockers.push(`API readiness has ${api.warnings} warning(s).`);
  if (production && database?.blockers > 0) blockers.push(`Database readiness has ${database.blockers} blocker(s).`);
  if (production && database?.warnings > 0) blockers.push(`Database readiness has ${database.warnings} warning(s).`);
  if (production && drift?.remoteError) blockers.push(`Supabase remote migration history is unavailable (${remoteMigrationHistoryStatus(drift)}).`);
  if (production && drift?.linkedHistoryDisconnected) blockers.push("Supabase linked migration history is disconnected: local and remote have zero exact version matches.");
  if (production && drift?.newDuplicateVersions > 0) blockers.push(`Supabase migrations have ${drift.newDuplicateVersions} unresolved duplicate version(s).`);

  return blockers;
}

function reconciliationSummary(drift) {
  const candidates = drift?.reconciliationCandidates ?? null;
  const highConfidence = drift?.oneToOneReconciliationCandidatesWithinFiveSeconds ?? null;
  const mediumConfidence = typeof candidates === "number" && typeof highConfidence === "number"
    ? candidates - highConfidence
    : null;
  const unmatchedLocalAfterCandidates = drift?.unmatchedLocalAfterReconciliationCandidates ?? null;
  const unmatchedRemoteAfterCandidates = drift?.unmatchedRemoteAfterReconciliationCandidates ?? null;
  const unmatchedLocalAfterRemoteRange = drift?.unmatchedLocalAfterRemoteRange ?? null;
  const reviewOrder = [
    "high-confidence candidate mappings",
    "medium-confidence candidate mappings",
    "unmatched local migrations after candidates",
    "unmatched remote versions after candidates",
    "likely pending local migrations after remote range",
  ];
  const reviewCounts = [
    highConfidence,
    mediumConfidence,
    unmatchedLocalAfterCandidates,
    unmatchedRemoteAfterCandidates,
    unmatchedLocalAfterRemoteRange,
  ];

  return {
    candidates,
    highConfidence,
    mediumConfidence,
    unmatchedLocalAfterCandidates,
    unmatchedRemoteAfterCandidates,
    unmatchedLocalAfterRemoteRange,
    reviewOrder,
    reviewBuckets: reviewOrder.map((label, index) => ({
      order: index + 1,
      label,
      count: reviewCounts[index],
    })),
  };
}

function renderReport({ api, database, drift, env, runtimeSettings, edgeDeploy, edgeSlots, edgeBrowser, productionBlockers, currentGateBlockers, failedCommands }) {
  const reconciliation = reconciliationSummary(drift);
  const reconciliationReviewOrder = reconciliation.reviewBuckets.map((bucket) => `${bucket.label} (${bucket.count})`).join(" -> ");
  const lines = [
    "# Production Preflight Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Mode: ${strict ? "strict" : "soft"}`,
    `Options: strict=${strict ? "yes" : "no"}, skipBuild=${skipBuild ? "yes" : "no"}, skipTypeCheck=${skipTypeCheck ? "yes" : "no"}`,
    "",
    "## Summary",
    "",
    `- Machine summary: \`${rel(reportJsonPath)}\``,
    "- Enforce current JSON gate: `npm run deploy:preflight:check-summary`",
    "- Run local release gate without TypeScript resource pressure: `npm run deploy:preflight:local`",
    "- Enforce production JSON gate: `npm run deploy:preflight:check-summary -- --production`",
    "- Enforce strict production JSON gate: `npm run deploy:preflight:check-production-summary`",
    "- Preview GitHub step summary locally: `npm run deploy:preflight:summary`",
    "- Enforce another summary file: `npm run deploy:preflight:check-summary -- --summary-path <path>`",
    "- Preview another summary file: `npm run deploy:preflight:summary -- --summary-path <path>`",
    "- Validate another summary file: `npm run deploy:preflight:test-summary-schema -- --summary-path <path>`",
    "- Override JSON freshness window: append `-- --max-age-minutes=60`",
    "- Require a strict-mode summary: append `-- --require-mode=strict`",
    "- TypeScript SIGTERM/resource notes: `docs/typescript-preflight-resource-notes.md`",
    `- API readiness: critical=${api?.critical ?? "unknown"}, warnings=${api?.warnings ?? "unknown"}`,
    `- Environment readiness: critical=${env?.critical ?? "unknown"}, warnings=${env?.warnings ?? "unknown"}`,
    `- Runtime settings SQL: ${runtimeSettings?.status ?? "unknown"}`,
    `- Database readiness: blockers=${database?.blockers ?? "unknown"}, warnings=${database?.warnings ?? "unknown"}`,
    `- Edge Function deploy contracts: failures=${edgeDeploy?.counts?.failures ?? "unknown"}`,
    `- Edge Function slot readiness: mode=${edgeSlots?.mode ?? "unknown"}, missingLiveCritical=${edgeSlots?.counts?.missingLiveCritical ?? "unknown"}, warnings=${edgeSlots?.counts?.warnings ?? "unknown"}, failures=${edgeSlots?.counts?.failures ?? "unknown"}`,
    `- Edge Function browser gates: gatedFunctions=${edgeBrowser?.counts?.gatedFunctions ?? "unknown"}, failures=${edgeBrowser?.counts?.failures ?? "unknown"}`,
    `- Supabase auth: envAccessToken=${env?.checked?.supabaseAccessToken ? "yes" : "no"}, driftAccessToken=${drift?.supabaseAccessToken ? "yes" : "no"}`,
    `- Supabase remote migration history read: ${drift && !drift.remoteError ? "yes" : "no"}`,
    `- Supabase remote migration history status: ${remoteMigrationHistoryStatus(drift)}`,
    `- Migration drift: duplicateVersions=${drift?.duplicateVersions ?? "unknown"}, allowedDuplicateVersions=${drift?.allowedDuplicateVersions ?? "unknown"}, newDuplicateVersions=${drift?.newDuplicateVersions ?? "unknown"}, linkedHistoryDisconnected=${drift?.linkedHistoryDisconnected ? "yes" : "no"}, remoteError=${drift?.remoteError ? "yes" : "no"}`,
    `- Reconciliation: candidates=${reconciliation.candidates ?? "unknown"}, highConfidence=${reconciliation.highConfidence ?? "unknown"}, mediumConfidence=${reconciliation.mediumConfidence ?? "unknown"}, unmatchedLocal=${reconciliation.unmatchedLocalAfterCandidates ?? "unknown"}, unmatchedRemote=${reconciliation.unmatchedRemoteAfterCandidates ?? "unknown"}, likelyPendingLocal=${reconciliation.unmatchedLocalAfterRemoteRange ?? "unknown"}`,
    `- Reconciliation review order: ${reconciliationReviewOrder}`,
    `- Pending migration gates: createsTables=${drift?.pendingLocalRiskGates?.createsTables ?? "unknown"}, withoutRls=${drift?.pendingLocalRiskGates?.withoutRls ?? "unknown"}, withoutGrants=${drift?.pendingLocalRiskGates?.withoutGrants ?? "unknown"}, sequenceWithoutGrants=${drift?.pendingLocalRiskGates?.sequenceWithoutGrants ?? "unknown"}, definerWithoutSearchPath=${drift?.pendingLocalRiskGates?.definerWithoutSearchPath ?? "unknown"}, hardcodedUrls=${drift?.pendingLocalRiskGates?.hardcodedUrls ?? "unknown"}, legacyAnonJwts=${drift?.pendingLocalRiskGates?.legacyAnonJwts ?? "unknown"}`,
    "",
    "## Steps",
    "",
  ];

  for (const result of results) {
    lines.push(`### ${result.title}`);
    lines.push("");
    lines.push(`- Command: \`${result.command}\``);
    lines.push(`- Status: ${summarizeStatus(result)}`);
    if (result.failureMeta) lines.push(`- Failure: ${result.failureMeta}`);
    if (result.id === "type-check" && /signal=SIGTERM/.test(result.failureMeta || "")) {
      lines.push("- Diagnostic: TypeScript was terminated without compiler diagnostics. See `docs/typescript-preflight-resource-notes.md`.");
    }
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
  lines.push("## Migration Reconciliation");
  lines.push("");
  lines.push(`- Candidate mappings: ${reconciliation.candidates ?? "unknown"}`);
  lines.push(`- High-confidence candidates: ${reconciliation.highConfidence ?? "unknown"}`);
  lines.push(`- Medium-confidence candidates: ${reconciliation.mediumConfidence ?? "unknown"}`);
  lines.push(`- Unmatched local after candidates: ${reconciliation.unmatchedLocalAfterCandidates ?? "unknown"}`);
  lines.push(`- Unmatched remote after candidates: ${reconciliation.unmatchedRemoteAfterCandidates ?? "unknown"}`);
  lines.push(`- Likely pending local after remote range: ${reconciliation.unmatchedLocalAfterRemoteRange ?? "unknown"}`);
  lines.push(`- Review order: ${reconciliationReviewOrder}`);
  lines.push("");
  lines.push("## Production Blockers");
  lines.push("");
  if (failedCommands.length) {
    for (const result of failedCommands) lines.push(`- Failed command: ${result.title}`);
  }
  if (productionBlockers.length) {
    for (const blocker of productionBlockers) lines.push(`- ${blocker}`);
  }
  if (!failedCommands.length && !productionBlockers.length) {
    lines.push("- None");
  }
  lines.push("");
  lines.push("## Current Gate Blockers");
  lines.push("");
  if (failedCommands.length) {
    for (const result of failedCommands) lines.push(`- Failed command: ${result.title}`);
  }
  if (currentGateBlockers.length) {
    for (const blocker of currentGateBlockers) lines.push(`- ${blocker}`);
  }
  if (!failedCommands.length && !currentGateBlockers.length) {
    lines.push("- None");
  }
  lines.push("");

  return lines.join("\n");
}

runStep(
  "secrets",
  "Security scan",
  npmCommand,
  [...npmArgsPrefix, "run", "security:scan"],
  { label: "npm run security:scan" },
);

const env = runStep(
  "environment",
  "Supabase deploy environment",
  "node",
  ["scripts/deploy/env-preflight.mjs", ...(strict ? ["--strict"] : [])],
  { capture: true, parseJson: true },
);

runStep(
  "runtime-settings-sql",
  "Supabase runtime settings SQL",
  "node",
  ["scripts/supabase/runtime-settings-sql.mjs", ...(strict ? ["--strict"] : [])],
  { capture: true },
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

const edgeDeploy = runStep(
  "edge-function-deploy-contracts",
  "Edge Function deploy contracts",
  "node",
  ["scripts/qa/edge-function-deploy-contracts.mjs"],
  { capture: true, parseJson: true },
);

const edgeSlots = runStep(
  "edge-function-slot-readiness",
  "Edge Function slot readiness",
  "node",
  ["scripts/qa/edge-function-slot-readiness.mjs", "--write-report"],
  { capture: true, parseJson: true },
);

const edgeBrowser = runStep(
  "edge-function-browser-gates",
  "Edge Function browser gates",
  "node",
  ["scripts/qa/edge-function-browser-gates.mjs"],
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
      "tsconfig.preflight.json",
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

const failedCommands = results.filter((result) => result.status === "failed");
const productionBlockers = buildBlockers({ api, database, drift, env, production: true });
const hardBlockers = buildBlockers({ api, database, drift, env, production: strict });
const runtimeSettings = results.find((result) => result.id === "runtime-settings-sql");

writeFileSync(
  reportPath,
  renderReport({
    api,
    database,
    drift,
    env,
    runtimeSettings,
    edgeDeploy,
    edgeSlots,
    edgeBrowser,
    productionBlockers,
    currentGateBlockers: hardBlockers,
    failedCommands,
  }),
  "utf8",
);

writeMachineSummary(
  renderMachineSummary({
    api,
    database,
    drift,
    env,
    runtimeSettings,
    edgeDeploy,
    edgeSlots,
    edgeBrowser,
    productionBlockers,
    currentGateBlockers: hardBlockers,
    failedCommands,
  }),
);

console.log(`\n[preflight] Report written to ${rel(reportPath)}`);

if (failedCommands.length || hardBlockers.length) {
  console.error("\n[preflight] Not production-ready yet:");
  for (const result of failedCommands) console.error(`- ${result.title} failed`);
  for (const blocker of hardBlockers) console.error(`- ${blocker}`);
  process.exitCode = 1;
} else {
  console.log("\n[preflight] Ready for the selected gate.");
}
