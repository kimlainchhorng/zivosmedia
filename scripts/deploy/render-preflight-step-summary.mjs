#!/usr/bin/env node
/**
 * Render a safe GitHub Step Summary for production preflight results.
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

function renderFailure(message) {
  console.log([
    "## Production preflight",
    "",
    message,
  ].join("\n"));
  process.exit(0);
}

if (!existsSync(summaryPath)) {
  renderFailure("No production preflight summary was generated.");
}

let summary;
try {
  summary = JSON.parse(readFileSync(summaryPath, "utf8"));
} catch (error) {
  renderFailure(`Could not parse production preflight summary: ${error.message}`);
}

if (summary.schemaVersion !== 1) {
  renderFailure(`Unsupported production preflight summary schemaVersion: ${summary.schemaVersion ?? "missing"}.`);
}

const failedCommands = summary.blockers?.failedCommands ?? [];
const productionBlockers = summary.blockers?.production ?? [];
const currentGateBlockers = summary.blockers?.currentGate ?? [];
const artifactMeta = summary.artifactMeta ?? {};
const artifactSummary = summary.artifactSummary ?? {};
const options = summary.options ?? {};
const supabase = summary.supabase ?? {};

function hasSupabaseEnvBlocker() {
  const blockers = [...failedCommands, ...productionBlockers].join("\n");
  return /SUPABASE_URL|SUPABASE_ANON_KEY|SUPABASE_ACCESS_TOKEN|runtime settings|migration-history|migration history|Supabase remote/i.test(blockers) ||
    supabase.runtimeSettingsSqlInputs === false ||
    supabase.remoteMigrationHistoryStatus === "access_token_missing";
}

const computedCurrentGateReady = failedCommands.length === 0 && currentGateBlockers.length === 0;
const computedProductionGateReady = failedCommands.length === 0 && productionBlockers.length === 0;
const readinessMismatch =
  summary.readyForCurrentGate !== computedCurrentGateReady ||
  summary.readyForProductionGate !== computedProductionGateReady;

const lines = [
  "## Production preflight",
  "",
  `- Mode: ${summary.mode}`,
  `- Options: strict=${options.strict ? "yes" : "no"}, skipBuild=${options.skipBuild ? "yes" : "no"}, skipTypeCheck=${options.skipTypeCheck ? "yes" : "no"}`,
  `- Current gate ready: ${summary.readyForCurrentGate ? "yes" : "no"}`,
  `- Production gate ready: ${summary.readyForProductionGate ? "yes" : "no"}`,
  `- Remote migration history read: ${summary.supabase?.remoteMigrationHistoryRead ? "yes" : "no"}`,
  `- Remote migration history status: ${summary.supabase?.remoteMigrationHistoryStatus ?? "unknown"}`,
  `- Linked migration history disconnected: ${summary.supabase?.linkedHistoryDisconnected ? "yes" : "no"}`,
  "",
  "### Production blockers",
  "",
];

if (!failedCommands.length && !productionBlockers.length) {
  lines.push("- None");
} else {
  for (const command of failedCommands) lines.push(`- Failed command: ${command}`);
  for (const blocker of productionBlockers) lines.push(`- ${blocker}`);
}

if (readinessMismatch) {
  lines.push("");
  lines.push("### Readiness consistency");
  lines.push("");
  lines.push("- Summary ready flags disagree with blockers or failed commands.");
  lines.push(`- Current gate: summary=${summary.readyForCurrentGate ? "yes" : "no"}, computed=${computedCurrentGateReady ? "yes" : "no"}, blockers=${currentGateBlockers.length}, failedCommands=${failedCommands.length}`);
  lines.push(`- Production gate: summary=${summary.readyForProductionGate ? "yes" : "no"}, computed=${computedProductionGateReady ? "yes" : "no"}, blockers=${productionBlockers.length}, failedCommands=${failedCommands.length}`);
}

if (hasSupabaseEnvBlocker()) {
  lines.push("");
  lines.push("### Supabase setup next steps");
  lines.push("");
  lines.push("- Configure `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_ACCESS_TOKEN` in the production secret store.");
  lines.push("- Generate runtime settings SQL with `npm run supabase:runtime-settings:sql -- --strict --emit-secrets` from a private terminal.");
  lines.push("- Refresh linked migration history with `npm run supabase:migrations:report` after `supabase login` or `SUPABASE_ACCESS_TOKEN` is configured.");
  lines.push("- Setup guide: `docs/supabase-deploy-env-setup.md`; migration auth guide: `docs/supabase-migration-auth-setup.md`.");
}

if (summary.reconciliation) {
  lines.push("");
  lines.push("### Migration reconciliation");
  lines.push("");
  lines.push(`- Candidate mappings: ${summary.reconciliation.candidates ?? "unknown"}`);
  lines.push(`- High confidence: ${summary.reconciliation.highConfidenceCandidates ?? "unknown"}`);
  lines.push(`- Medium confidence: ${summary.reconciliation.mediumConfidenceCandidates ?? "unknown"}`);
  lines.push(`- Unmatched local after candidates: ${summary.reconciliation.unmatchedLocalAfterCandidates ?? "unknown"}`);
  lines.push(`- Unmatched remote after candidates: ${summary.reconciliation.unmatchedRemoteAfterCandidates ?? "unknown"}`);
  lines.push(`- Likely pending local after remote range: ${summary.reconciliation.unmatchedLocalAfterRemoteRange ?? "unknown"}`);
  if (Array.isArray(summary.reconciliation.reviewBuckets)) {
    lines.push(`- Review order: ${summary.reconciliation.reviewBuckets.map((bucket) => `${bucket.label} (${bucket.count})`).join(" -> ")}`);
  } else if (Array.isArray(summary.reconciliation.reviewOrder)) {
    lines.push(`- Review order: ${summary.reconciliation.reviewOrder.join(" -> ")}`);
  }
}

const artifactRows = Object.entries(artifactMeta).filter(([, meta]) => meta && typeof meta === "object");
if (artifactRows.length) {
  const existingArtifacts = artifactSummary.existing ?? artifactRows.filter(([, meta]) => meta.exists).length;
  const totalArtifacts = artifactSummary.total ?? artifactRows.length;
  const totalBytes = artifactSummary.bytes ?? artifactRows.reduce((total, [, meta]) => (
    total + (typeof meta.bytes === "number" ? meta.bytes : 0)
  ), 0);

  lines.push("");
  lines.push("### Report artifacts");
  lines.push("");
  lines.push(`- Generated artifacts: ${existingArtifacts}/${totalArtifacts}`);
  lines.push(`- Total bytes: ${totalBytes}`);
  lines.push("");
  lines.push("| Artifact | Exists | Bytes |");
  lines.push("| --- | --- | ---: |");
  for (const [name, meta] of artifactRows) {
    lines.push(`| ${name} | ${meta.exists ? "yes" : "no"} | ${typeof meta.bytes === "number" ? meta.bytes : "n/a"} |`);
  }
}

console.log(lines.join("\n"));
