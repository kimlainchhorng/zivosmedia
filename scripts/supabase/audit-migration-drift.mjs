import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { KNOWN_DUPLICATE_MIGRATION_VERSIONS } from "./migration-policy.mjs";
import {
  allCreatedPublicTablesHaveRls,
  createsPublicTable,
  extractRlsEnabledPublicTableNames,
} from "./migration-schema-signals.mjs";
import { runSupabaseCli } from "./supabase-cli.mjs";

const root = process.cwd();
const migrationsDir = path.join(root, "supabase", "migrations");
const docsDir = path.join(root, "docs");
const reportPath = path.join(docsDir, "supabase-migration-drift-report.md");
const reconciliationCandidatesPath = path.join(docsDir, "supabase-migration-reconciliation-candidates.csv");
const unmatchedLocalPath = path.join(docsDir, "supabase-migration-unmatched-local.csv");
const unmatchedRemotePath = path.join(docsDir, "supabase-migration-unmatched-remote.csv");
const reconciliationPlanPath = path.join(docsDir, "supabase-migration-reconciliation-plan.md");
const pendingLocalReviewPath = path.join(docsDir, "supabase-migration-pending-local-review.csv");
const reconciliationRepairDraftPath = path.join(docsDir, "supabase-migration-reconciliation-repair-draft.sql");
const reconciliationReviewOrder = [
  "high-confidence candidate mappings",
  "medium-confidence candidate mappings",
  "unmatched local migrations after candidates",
  "unmatched remote versions after candidates",
  "likely pending local migrations after remote range",
];

for (const file of [".env", ".env.local", ".env.deploy"]) {
  const envPath = path.join(root, file);
  if (existsSync(envPath)) loadDotenv({ path: envPath, override: false, quiet: true });
}

const args = new Set(process.argv.slice(2));
const useLinked = args.has("--linked");
const writeReport = args.has("--write-report");
const strict = args.has("--strict");
const allowKnownDuplicates = args.has("--allow-known-duplicates");
const allowedDuplicateVersions = new Set(
  [
    ...(allowKnownDuplicates ? KNOWN_DUPLICATE_MIGRATION_VERSIONS : []),
    ...[...args]
    .filter((arg) => arg.startsWith("--allow-duplicate-version="))
    .map((arg) => arg.split("=")[1])
    .filter(Boolean),
  ],
);

const migrationPattern = /^(\d{14})_.+\.sql$/;

function readLocalMigrations() {
  if (!existsSync(migrationsDir)) {
    return { files: [], invalid: [] };
  }

  const files = [];
  const invalid = [];

  for (const name of readdirSync(migrationsDir).filter((entry) => entry.endsWith(".sql")).sort()) {
    const match = name.match(migrationPattern);
    const fullPath = path.join(migrationsDir, name);
    const sql = readFileSync(fullPath, "utf8");
    const hash = createHash("sha256").update(sql).digest("hex");

    if (!match) {
      invalid.push(name);
      continue;
    }

    files.push({
      name,
      version: match[1],
      hash,
      risk: classifyRisk(name, sql),
      domain: classifyDomain(name, sql),
      signals: migrationSignals(sql),
    });
  }

  return { files, invalid };
}

function classifyRisk(name, sql) {
  const text = `${name}\n${sql}`.toLowerCase();
  if (
    /\b(drop|truncate|delete\s+from|alter\s+table|create\s+policy|drop\s+policy|security\s+definer|grant|revoke)\b/.test(text) ||
    text.includes("auth.") ||
    text.includes("storage.")
  ) {
    return "high";
  }

  if (/\b(create\s+table|create\s+index|create\s+or\s+replace\s+function|create\s+trigger|insert\s+into|update\s+)/.test(text)) {
    return "medium";
  }

  return "low";
}

function classifyDomain(name, sql) {
  const text = `${name}\n${sql}`.toLowerCase();
  if (/(policy|rls|auth|profile|user|session|permission|role|storage)/.test(text)) return "security/auth";
  if (/(chat|message|dm|feed|post|story|reel|follow|comment|like)/.test(text)) return "chat/social";
  if (/(store|shop|order|product|payment|stripe|checkout|delivery)/.test(text)) return "commerce/store";
  if (/(hotel|lodging|booking|flight|travel|room|ratehawk|hotelbeds)/.test(text)) return "travel/lodging";
  if (/(index|function|trigger|cron|queue|rpc|view|materialized)/.test(text)) return "infrastructure";
  return "general";
}

function migrationSignals(sql) {
  const text = sql.toLowerCase();
  const createTable = createsPublicTable(sql);
  return {
    createTable,
    createsSequenceBackedId: /\b(?:bigserial|serial|smallserial)\b|\bgenerated\s+(?:always|by\s+default)\s+as\s+identity\b|\bcreate\s+sequence\b|\bnextval\s*\(/.test(text),
    enableRls: createTable
      ? allCreatedPublicTablesHaveRls(sql)
      : extractRlsEnabledPublicTableNames(sql).length > 0,
    createPolicy: /\bcreate\s+policy\b/.test(text),
    grant: /\bgrant\b/.test(text),
    sequenceGrant: /\bgrant\b[\s\S]{0,500}?\bon\s+(?:all\s+sequences\s+in\s+schema|sequence)\b|\bgrant\s+usage\s*,\s*select\b[\s\S]{0,500}?\bsequences?\b/.test(text),
    createFunction: /\bcreate\s+(?:or\s+replace\s+)?function\b/.test(text),
    securityDefiner: /\bsecurity\s+definer\b/.test(text),
    setsSearchPath: /\bset\s+search_path\b/.test(text),
    cron: /\bcron\.schedule\b|\bpg_cron\b/.test(text),
    hardcodedSupabaseUrl: /https:\/\/[a-z0-9]{12,}\.supabase\.co\b/i.test(sql),
    legacyAnonJwt: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/.test(sql),
  };
}

function findDuplicates(items, key) {
  const grouped = new Map();
  for (const item of items) {
    const value = item[key];
    const list = grouped.get(value) ?? [];
    list.push(item);
    grouped.set(value, list);
  }
  return [...grouped.values()].filter((list) => list.length > 1);
}

function readRemoteVersions() {
  if (!useLinked) return { versions: [], error: null };

  const query = "select version from supabase_migrations.schema_migrations order by version";
  const result = runSupabaseCli(root, ["db", "query", "--agent=no", "--linked", "-o", "json", query]);

  if (result.status !== 0) {
    return {
      versions: [],
      error: (result.stderr || result.stdout || "Supabase CLI query failed").trim(),
    };
  }

  try {
    const rows = JSON.parse(result.stdout);
    return {
      versions: rows.map((row) => String(row.version)).filter(Boolean),
      error: null,
    };
  } catch (error) {
    return {
      versions: [],
      error: `Could not parse Supabase CLI JSON output: ${error.message}`,
    };
  }
}

function hasSupabaseAccessToken() {
  const value = process.env.SUPABASE_ACCESS_TOKEN;
  return typeof value === "string" && value.trim().length > 0;
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    acc[item[key]] = (acc[item[key]] ?? 0) + 1;
    return acc;
  }, {});
}

function renderList(items, mapper, limit = 25) {
  if (!items.length) return "- None";
  const visible = items.slice(0, limit).map(mapper);
  const hidden = items.length - visible.length;
  if (hidden > 0) visible.push(`- ...and ${hidden} more`);
  return visible.join("\n");
}

function versionToTime(version) {
  if (!/^\d{14}$/.test(version)) return null;
  const year = Number(version.slice(0, 4));
  const month = Number(version.slice(4, 6)) - 1;
  const day = Number(version.slice(6, 8));
  const hour = Number(version.slice(8, 10));
  const minute = Number(version.slice(10, 12));
  const second = Number(version.slice(12, 14));
  return Date.UTC(year, month, day, hour, minute, second);
}

function versionDay(version) {
  return /^\d{8}/.test(version) ? version.slice(0, 8) : "unknown";
}

function versionRange(versions) {
  if (!versions.length) return { first: null, last: null };
  return { first: versions[0], last: versions[versions.length - 1] };
}

function buildNearTimestampDiagnostics(localItems, remoteVersionItems) {
  const localWithTime = localItems
    .map((item) => ({ ...item, time: versionToTime(item.version) }))
    .filter((item) => item.time !== null);
  const remoteWithTime = remoteVersionItems
    .map((version) => ({ version, time: versionToTime(version) }))
    .filter((item) => item.time !== null);

  const rows = [];
  for (const localItem of localItems) {
    const localTime = versionToTime(localItem.version);
    if (localTime === null) continue;

    let closest = null;
    for (const remoteItem of remoteWithTime) {
      const deltaSeconds = Math.abs(remoteItem.time - localTime) / 1000;
      if (!closest || deltaSeconds < closest.deltaSeconds) {
        closest = {
          localVersion: localItem.version,
          localName: localItem.name,
          remoteVersion: remoteItem.version,
          deltaSeconds,
        };
      }
    }

    if (closest) rows.push(closest);
  }

  const remoteClosestRows = [];
  for (const remoteItem of remoteWithTime) {
    let closest = null;
    for (const localItem of localWithTime) {
      const deltaSeconds = Math.abs(remoteItem.time - localItem.time) / 1000;
      if (!closest || deltaSeconds < closest.deltaSeconds) {
        closest = {
          remoteVersion: remoteItem.version,
          localVersion: localItem.version,
          localName: localItem.name,
          deltaSeconds,
        };
      }
    }
    if (closest) remoteClosestRows.push(closest);
  }

  rows.sort((a, b) => a.deltaSeconds - b.deltaSeconds || a.localVersion.localeCompare(b.localVersion));
  const usedLocalVersions = new Set();
  const usedRemoteVersions = new Set();
  const oneToOneCandidates = [];
  for (const row of rows.filter((item) => item.deltaSeconds <= 60)) {
    if (usedLocalVersions.has(row.localVersion) || usedRemoteVersions.has(row.remoteVersion)) continue;
    oneToOneCandidates.push(row);
    usedLocalVersions.add(row.localVersion);
    usedRemoteVersions.add(row.remoteVersion);
  }

  const byLocalDay = new Set(localItems.map((item) => versionDay(item.version)));
  const byRemoteDay = new Set(remoteVersionItems.map(versionDay));
  const sharedDays = [...byLocalDay].filter((day) => byRemoteDay.has(day));

  return {
    withinFiveSeconds: rows.filter((row) => row.deltaSeconds <= 5).length,
    withinOneMinute: rows.filter((row) => row.deltaSeconds <= 60).length,
    oneToOneWithinFiveSeconds: oneToOneCandidates.filter((row) => row.deltaSeconds <= 5).length,
    oneToOneWithinOneMinute: oneToOneCandidates.length,
    sharedDays: sharedDays.length,
    candidatesWithinOneMinute: oneToOneCandidates,
    closestByLocal: rows,
    closestByRemote: remoteClosestRows,
    sampleClosest: oneToOneCandidates.slice(0, 25),
  };
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function renderReconciliationCandidatesCsv(summary) {
  const rows = [
    [
      "local_version",
      "local_filename",
      "remote_version",
      "delta_seconds",
      "confidence",
    ],
  ];

  for (const item of summary.nearTimestampDiagnostics.candidatesWithinOneMinute) {
    rows.push([
      item.localVersion,
      item.localName,
      item.remoteVersion,
      item.deltaSeconds,
      item.deltaSeconds <= 5 ? "high" : "medium",
    ]);
  }

  return `${rows.map((row) => row.map(csvEscape).join(",")).join("\n")}\n`;
}

function buildUnmatchedSummary(summary) {
  const candidateLocalVersions = new Set(summary.nearTimestampDiagnostics.candidatesWithinOneMinute.map((item) => item.localVersion));
  const candidateRemoteVersions = new Set(summary.nearTimestampDiagnostics.candidatesWithinOneMinute.map((item) => item.remoteVersion));
  const remoteRange = versionRange(summary.remoteVersions);
  const localRange = versionRange(summary.local.map((item) => item.version));
  const unmatchedLocal = summary.localOnly.filter((item) => !candidateLocalVersions.has(item.version));
  const unmatchedRemote = summary.remoteOnly.filter((version) => !candidateRemoteVersions.has(version));

  return {
    unmatchedLocal,
    unmatchedRemote,
    unmatchedLocalAfterRemoteRange: remoteRange.last
      ? unmatchedLocal.filter((item) => item.version > remoteRange.last).length
      : 0,
    unmatchedLocalBeforeRemoteRange: remoteRange.first
      ? unmatchedLocal.filter((item) => item.version < remoteRange.first).length
      : 0,
    unmatchedRemoteAfterLocalRange: localRange.last
      ? unmatchedRemote.filter((version) => version > localRange.last).length
      : 0,
    unmatchedRemoteBeforeLocalRange: localRange.first
      ? unmatchedRemote.filter((version) => version < localRange.first).length
      : 0,
  };
}

function countCandidatesByConfidence(summary) {
  return summary.nearTimestampDiagnostics.candidatesWithinOneMinute.reduce((acc, item) => {
    const confidence = item.deltaSeconds <= 5 ? "high" : "medium";
    acc[confidence] = (acc[confidence] ?? 0) + 1;
    return acc;
  }, {});
}

function renderUnmatchedLocalCsv(summary) {
  const unmatched = buildUnmatchedSummary(summary);
  const remoteRange = versionRange(summary.remoteVersions);
  const closestByLocal = new Map(summary.nearTimestampDiagnostics.closestByLocal.map((item) => [item.localVersion, item]));
  const rows = [
    [
      "local_version",
      "local_filename",
      "risk",
      "domain",
      "position_vs_remote_range",
      "nearest_remote_version",
      "nearest_delta_seconds",
    ],
  ];

  for (const item of unmatched.unmatchedLocal) {
    const closest = closestByLocal.get(item.version);
    const position = remoteRange.last && item.version > remoteRange.last
      ? "after_remote_range"
      : remoteRange.first && item.version < remoteRange.first
        ? "before_remote_range"
        : "inside_remote_range";
    rows.push([
      item.version,
      item.name,
      item.risk,
      item.domain,
      position,
      closest?.remoteVersion ?? "",
      closest?.deltaSeconds ?? "",
    ]);
  }

  return `${rows.map((row) => row.map(csvEscape).join(",")).join("\n")}\n`;
}

function renderUnmatchedRemoteCsv(summary) {
  const unmatched = buildUnmatchedSummary(summary);
  const localRange = versionRange(summary.local.map((item) => item.version));
  const closestByRemote = new Map(summary.nearTimestampDiagnostics.closestByRemote.map((item) => [item.remoteVersion, item]));
  const rows = [
    [
      "remote_version",
      "position_vs_local_range",
      "nearest_local_version",
      "nearest_local_filename",
      "nearest_delta_seconds",
    ],
  ];

  for (const version of unmatched.unmatchedRemote) {
    const closest = closestByRemote.get(version);
    const position = localRange.last && version > localRange.last
      ? "after_local_range"
      : localRange.first && version < localRange.first
        ? "before_local_range"
        : "inside_local_range";
    rows.push([
      version,
      position,
      closest?.localVersion ?? "",
      closest?.localName ?? "",
      closest?.deltaSeconds ?? "",
    ]);
  }

  return `${rows.map((row) => row.map(csvEscape).join(",")).join("\n")}\n`;
}

function likelyPendingLocalMigrations(summary) {
  const unmatched = buildUnmatchedSummary(summary);
  const remoteRange = versionRange(summary.remoteVersions);
  return unmatched.unmatchedLocal.filter((item) => remoteRange.last && item.version > remoteRange.last);
}

function renderPendingLocalReviewCsv(summary) {
  const rows = [
    [
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
    ],
  ];

  for (const item of likelyPendingLocalMigrations(summary)) {
    rows.push([
      item.version,
      item.name,
      item.risk,
      item.domain,
      item.signals.createTable,
      item.signals.createsSequenceBackedId,
      item.signals.enableRls,
      item.signals.createTable && !item.signals.enableRls,
      item.signals.createPolicy,
      item.signals.grant,
      item.signals.createTable && !item.signals.grant,
      item.signals.sequenceGrant,
      item.signals.createsSequenceBackedId && !item.signals.sequenceGrant,
      item.signals.createFunction,
      item.signals.securityDefiner,
      item.signals.setsSearchPath,
      item.signals.securityDefiner && !item.signals.setsSearchPath,
      item.signals.cron,
      item.signals.hardcodedSupabaseUrl,
      item.signals.legacyAnonJwt,
    ]);
  }

  return `${rows.map((row) => row.map(csvEscape).join(",")).join("\n")}\n`;
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function renderReconciliationRepairDraftSql(summary) {
  const candidates = summary.nearTimestampDiagnostics.candidatesWithinOneMinute;
  const highConfidence = candidates.filter((item) => item.deltaSeconds <= 5);
  const mediumConfidence = candidates.filter((item) => item.deltaSeconds > 5);

  const lines = [
    "-- Supabase migration reconciliation repair draft",
    `-- Generated: ${new Date().toISOString()}`,
    "--",
    "-- Review-only artifact. Do not run this file as-is.",
    "-- Every repair statement is commented out until local/remote SQL intent is manually verified.",
    "-- Keep a backup of supabase_migrations.schema_migrations before any approved history repair.",
    "--",
    `-- Candidate mappings: ${candidates.length}`,
    `-- High confidence (<= 5 seconds apart): ${highConfidence.length}`,
    `-- Medium confidence (6-60 seconds apart): ${mediumConfidence.length}`,
    "--",
    "-- Suggested manual review query before any repair:",
    "-- select version, name, statements from supabase_migrations.schema_migrations order by version;",
    "--",
    "begin;",
    "",
  ];

  for (const item of candidates) {
    const confidence = item.deltaSeconds <= 5 ? "high" : "medium";
    lines.push(`-- ${confidence}: remote ${item.remoteVersion} -> local ${item.localVersion} (${item.deltaSeconds}s) ${item.localName}`);
    lines.push(`-- update supabase_migrations.schema_migrations`);
    lines.push(`-- set version = ${sqlString(item.localVersion)}`);
    lines.push(`-- where version = ${sqlString(item.remoteVersion)}`);
    lines.push(`--   and not exists (select 1 from supabase_migrations.schema_migrations where version = ${sqlString(item.localVersion)});`);
    lines.push("");
  }

  lines.push("-- Verify after applying an approved subset:");
  lines.push("-- select version from supabase_migrations.schema_migrations order by version;");
  lines.push("");
  lines.push("rollback;");
  lines.push("");

  return lines.join("\n");
}

function pendingLocalRiskSummary(summary) {
  const rows = likelyPendingLocalMigrations(summary);
  const count = (predicate) => rows.filter(predicate).length;
  return {
    total: rows.length,
    createsTables: count((item) => item.signals.createTable),
    createsTablesWithoutRls: count((item) => item.signals.createTable && !item.signals.enableRls),
    createsTablesWithoutGrants: count((item) => item.signals.createTable && !item.signals.grant),
    sequenceBackedIds: count((item) => item.signals.createsSequenceBackedId),
    sequenceBackedIdsWithoutSequenceGrants: count((item) => item.signals.createsSequenceBackedId && !item.signals.sequenceGrant),
    securityDefiners: count((item) => item.signals.securityDefiner),
    securityDefinersWithoutSearchPath: count((item) => item.signals.securityDefiner && !item.signals.setsSearchPath),
    cronJobs: count((item) => item.signals.cron),
    hardcodedSupabaseUrls: count((item) => item.signals.hardcodedSupabaseUrl),
    legacyAnonJwts: count((item) => item.signals.legacyAnonJwt),
  };
}

function renderReconciliationPlan(summary) {
  const unmatched = buildUnmatchedSummary(summary);
  const confidence = countCandidatesByConfidence(summary);
  const unmatchedLocalInsideRemoteRange = unmatched.unmatchedLocal.length
    - unmatched.unmatchedLocalAfterRemoteRange
    - unmatched.unmatchedLocalBeforeRemoteRange;
  const unmatchedRemoteInsideLocalRange = unmatched.unmatchedRemote.length
    - unmatched.unmatchedRemoteAfterLocalRange
    - unmatched.unmatchedRemoteBeforeLocalRange;
  const localAfterRemoteRange = likelyPendingLocalMigrations(summary);
  const pendingRisk = pendingLocalRiskSummary(summary);
  const reviewOrderCounts = [
    confidence.high ?? 0,
    confidence.medium ?? 0,
    unmatched.unmatchedLocal.length,
    unmatched.unmatchedRemote.length,
    unmatched.unmatchedLocalAfterRemoteRange,
  ];

  return [
    "# Supabase Migration Reconciliation Plan",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "This plan is diagnostic only. It does not repair migration history or change the remote schema.",
    "",
    "## Current State",
    "",
    `- Local migrations: ${summary.local.length}`,
    `- Remote migration versions: ${summary.remoteVersions.length}`,
    `- Exact version matches: ${summary.matchedVersions.length}`,
    `- One-to-one likely timestamp-drift matches: ${summary.nearTimestampDiagnostics.oneToOneWithinOneMinute}`,
    `- High-confidence one-to-one matches: ${confidence.high ?? 0}`,
    `- Medium-confidence one-to-one matches: ${confidence.medium ?? 0}`,
    `- Unmatched local migrations: ${unmatched.unmatchedLocal.length}`,
    `- Unmatched local migrations inside remote version range: ${unmatchedLocalInsideRemoteRange}`,
    `- Unmatched local migrations after remote version range: ${unmatched.unmatchedLocalAfterRemoteRange}`,
    `- Unmatched remote versions: ${unmatched.unmatchedRemote.length}`,
    `- Unmatched remote versions inside local version range: ${unmatchedRemoteInsideLocalRange}`,
    `- Unmatched remote versions before local version range: ${unmatched.unmatchedRemoteBeforeLocalRange}`,
    `- Unmatched remote versions after local version range: ${unmatched.unmatchedRemoteAfterLocalRange}`,
    "",
    "## Pending Local Risk Summary",
    "",
    `- Likely pending local migrations: ${pendingRisk.total}`,
    `- Creates tables: ${pendingRisk.createsTables}`,
    `- Creates tables without RLS: ${pendingRisk.createsTablesWithoutRls}`,
    `- Creates tables without explicit grants: ${pendingRisk.createsTablesWithoutGrants}`,
    `- Sequence-backed ids: ${pendingRisk.sequenceBackedIds}`,
    `- Sequence-backed ids without sequence grants: ${pendingRisk.sequenceBackedIdsWithoutSequenceGrants}`,
    `- SECURITY DEFINER migrations: ${pendingRisk.securityDefiners}`,
    `- SECURITY DEFINER without search_path: ${pendingRisk.securityDefinersWithoutSearchPath}`,
    `- Cron migrations: ${pendingRisk.cronJobs}`,
    `- Hardcoded Supabase URLs: ${pendingRisk.hardcodedSupabaseUrls}`,
    `- Legacy anon JWTs: ${pendingRisk.legacyAnonJwts}`,
    "",
    "## Review Files",
    "",
    `- Candidate one-to-one map: \`${path.relative(root, reconciliationCandidatesPath).replace(/\\/g, "/")}\``,
    `- Local migrations with no candidate: \`${path.relative(root, unmatchedLocalPath).replace(/\\/g, "/")}\``,
    `- Remote versions with no candidate: \`${path.relative(root, unmatchedRemotePath).replace(/\\/g, "/")}\``,
    `- Likely pending local review: \`${path.relative(root, pendingLocalReviewPath).replace(/\\/g, "/")}\``,
    `- Review-only repair SQL draft: \`${path.relative(root, reconciliationRepairDraftPath).replace(/\\/g, "/")}\``,
    "",
    "## Review Order",
    "",
    ...reconciliationReviewOrder.map((item, index) => `${index + 1}. ${item} (${reviewOrderCounts[index]} item${reviewOrderCounts[index] === 1 ? "" : "s"})`),
    "",
    "## Recommended Sequence",
    "",
    "1. Review the high-confidence one-to-one candidate map first. These are likely the same logical migrations with slightly different timestamp ids.",
    "2. Review the medium-confidence candidate map next. These need more care because nearby timestamp does not prove SQL equivalence.",
    "3. Inspect unmatched local migrations after the remote range. These are the strongest candidates for genuinely pending local work.",
    "4. Inspect unmatched local migrations inside the remote range. These may be local-only additions, squashed/renamed migrations, or migrations represented differently in remote history.",
    "5. Inspect unmatched remote versions inside the local range. These may be remote-only historical entries not represented by this repository.",
    "6. Do not run production `db push`, `db pull`, or migration repair until the candidate map is reviewed against actual SQL/schema intent.",
    "",
    "## Validation Commands",
    "",
    "- Local migration hygiene: `npm run supabase:migrations:check:main`",
    "- Linked soft report: `npm run supabase:migrations:report`",
    "- Linked strict reconciliation gate: `npm run supabase:migrations:linked:strict`",
    "- Full soft preflight: `npm run deploy:preflight -- --skip-build --skip-type-check`",
    "",
    "## Likely Pending Local Migrations",
    "",
    "These local migrations are newer than the latest remote migration version and have no one-to-one candidate match.",
    `Review flags are generated in \`${path.relative(root, pendingLocalReviewPath).replace(/\\/g, "/")}\`.`,
    "",
    renderList(
      localAfterRemoteRange,
      (item) => `- ${item.version}: ${item.name} (${item.risk}, ${item.domain})`,
      50,
    ),
    "",
    "## Current Gate",
    "",
    summary.matchedVersions.length === 0 && summary.remoteVersions.length > 0
      ? "- Production schema work remains blocked because local and remote histories have zero exact version matches."
      : "- Production schema work still requires normal readiness checks.",
    "",
  ].join("\n");
}

function renderReport(summary) {
  const localRange = versionRange(summary.local.map((item) => item.version));
  const remoteRange = versionRange(summary.remoteVersions);
  const unmatched = buildUnmatchedSummary(summary);
  const pendingRisk = pendingLocalRiskSummary(summary);
  const lines = [
    "# Supabase Migration Drift Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `- Local migrations: ${summary.local.length}`,
    `- Invalid filenames: ${summary.invalid.length}`,
    `- Duplicate versions: ${summary.duplicateVersions.length}`,
    `- Allowed duplicate versions: ${summary.allowedDuplicateVersions.length}`,
    `- New duplicate versions: ${summary.blockingDuplicateVersions.length}`,
    `- Duplicate SQL hashes: ${summary.duplicateHashes.length}`,
    `- SUPABASE_ACCESS_TOKEN configured: ${summary.supabaseAccessToken ? "yes" : "no"}`,
    `- Local version range: ${localRange.first ?? "none"} to ${localRange.last ?? "none"}`,
    `- Remote version range: ${remoteRange.first ?? "none"} to ${remoteRange.last ?? "none"}`,
    `- Remote migrations: ${summary.remoteVersions.length}`,
    `- Matched versions: ${summary.matchedVersions.length}`,
    `- Local-only pending: ${summary.localOnly.length}`,
    `- Remote-only missing locally: ${summary.remoteOnly.length}`,
    `- Near timestamp pairs within 5 seconds: ${summary.nearTimestampDiagnostics.withinFiveSeconds}`,
    `- Near timestamp pairs within 1 minute: ${summary.nearTimestampDiagnostics.withinOneMinute}`,
    `- One-to-one reconciliation candidates within 5 seconds: ${summary.nearTimestampDiagnostics.oneToOneWithinFiveSeconds}`,
    `- One-to-one reconciliation candidates within 1 minute: ${summary.nearTimestampDiagnostics.oneToOneWithinOneMinute}`,
    `- Unmatched local migrations after one-to-one candidates: ${unmatched.unmatchedLocal.length}`,
    `- Unmatched remote versions after one-to-one candidates: ${unmatched.unmatchedRemote.length}`,
    `- Unmatched local migrations after remote range: ${unmatched.unmatchedLocalAfterRemoteRange}`,
    `- Unmatched remote versions before local range: ${unmatched.unmatchedRemoteBeforeLocalRange}`,
    `- Pending local creates tables: ${pendingRisk.createsTables}`,
    `- Pending local creates tables without RLS: ${pendingRisk.createsTablesWithoutRls}`,
    `- Pending local creates tables without explicit grants: ${pendingRisk.createsTablesWithoutGrants}`,
    `- Pending local sequence-backed ids without sequence grants: ${pendingRisk.sequenceBackedIdsWithoutSequenceGrants}`,
    `- Pending local SECURITY DEFINER without search_path: ${pendingRisk.securityDefinersWithoutSearchPath}`,
    `- Pending local hardcoded Supabase URLs: ${pendingRisk.hardcodedSupabaseUrls}`,
    `- Pending local legacy anon JWTs: ${pendingRisk.legacyAnonJwts}`,
    `- Shared migration calendar days: ${summary.nearTimestampDiagnostics.sharedDays}`,
    `- Reconciliation candidates CSV: ${path.relative(root, reconciliationCandidatesPath).replace(/\\/g, "/")}`,
    `- Unmatched local CSV: ${path.relative(root, unmatchedLocalPath).replace(/\\/g, "/")}`,
    `- Unmatched remote CSV: ${path.relative(root, unmatchedRemotePath).replace(/\\/g, "/")}`,
    `- Reconciliation plan: ${path.relative(root, reconciliationPlanPath).replace(/\\/g, "/")}`,
    `- Pending local review CSV: ${path.relative(root, pendingLocalReviewPath).replace(/\\/g, "/")}`,
    `- Pending risk: high=${summary.riskCounts.high ?? 0}, medium=${summary.riskCounts.medium ?? 0}, low=${summary.riskCounts.low ?? 0}`,
    "",
    "## Domains",
    "",
    ...Object.entries(summary.domainCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([domain, count]) => `- ${domain}: ${count}`),
    "",
    "## Duplicate Versions",
    "",
    renderList(
      summary.duplicateVersions,
      (items) => {
        const version = items[0].version;
        const suffix = summary.allowedDuplicateVersions.some((allowed) => allowed[0].version === version)
          ? " (allowed legacy duplicate)"
          : " (needs reconciliation)";
        return `- ${version}: ${items.map((item) => item.name).join(", ")}${suffix}`;
      },
      50,
    ),
    "",
    "## Remote Query",
    "",
    summary.supabaseAccessToken
      ? "- Auth token: SUPABASE_ACCESS_TOKEN was present for this run."
      : "- Auth token: SUPABASE_ACCESS_TOKEN was not present for this run.",
    summary.remoteError ? `- Error: ${summary.remoteError}` : "- Linked remote migration history was read successfully.",
    summary.remoteError && !summary.supabaseAccessToken
      ? "- Hint: Run `supabase login` or export `SUPABASE_ACCESS_TOKEN` before linked migration checks."
      : null,
    "",
    "## Reconciliation Diagnostics",
    "",
    summary.remoteError
      ? "- Exact version overlap was not evaluated because linked remote migration history could not be read."
      : summary.matchedVersions.length === 0 && summary.remoteVersions.length > 0
      ? "- Exact version overlap is zero. Do not run production schema push/pull until migration history is reconciled."
      : "- Exact version overlap is present.",
    summary.remoteError
      ? "- Near-timestamp diagnostics require authenticated remote migration history."
      : summary.nearTimestampDiagnostics.withinOneMinute > 0
      ? "- Many migrations appear to have near-identical timestamps rather than exact matching version ids; this usually means the repo and remote history were generated/imported differently."
      : "- No near-timestamp pattern detected from version ids alone.",
    "",
    "### Closest Local/Remote Version Pairs",
    "",
    renderList(
      summary.nearTimestampDiagnostics.sampleClosest,
      (item) => `- local ${item.localVersion} (${item.localName}) -> remote ${item.remoteVersion} (${item.deltaSeconds}s apart)`,
      25,
    ),
    "",
    "## High Risk Pending Migrations",
    "",
    renderList(
      summary.localOnly.filter((item) => item.risk === "high"),
      (item) => `- ${item.version}: ${item.name} (${item.domain})`,
      100,
    ),
    "",
    "## Remote-Only Versions",
    "",
    renderList(summary.remoteOnly, (version) => `- ${version}`, 100),
    "",
  ];

  return `${lines.join("\n").replace(/\n*$/, "")}\n`;
}

const { files: local, invalid } = readLocalMigrations();
const duplicateVersions = findDuplicates(local, "version");
const duplicateHashes = findDuplicates(local, "hash");
const blockingDuplicateVersions = duplicateVersions.filter(
  (items) => !allowedDuplicateVersions.has(items[0].version),
);
const allowedDuplicateVersionGroups = duplicateVersions.filter(
  (items) => allowedDuplicateVersions.has(items[0].version),
);
const { versions: remoteVersions, error: remoteError } = readRemoteVersions();
const supabaseAccessToken = hasSupabaseAccessToken();

const localVersionSet = new Set(local.map((item) => item.version));
const remoteVersionSet = new Set(remoteVersions);
const matchedVersions = local.filter((item) => remoteVersionSet.has(item.version));
const localOnly = local.filter((item) => !remoteVersionSet.has(item.version));
const remoteOnly = remoteVersions.filter((version) => !localVersionSet.has(version));
const riskCounts = countBy(localOnly, "risk");
const domainCounts = countBy(localOnly, "domain");
const nearTimestampDiagnostics = buildNearTimestampDiagnostics(localOnly, remoteOnly);

const summary = {
  local,
  invalid,
  duplicateVersions,
  blockingDuplicateVersions,
  allowedDuplicateVersions: allowedDuplicateVersionGroups,
  duplicateHashes,
  supabaseAccessToken,
  remoteVersions,
  remoteError,
  matchedVersions,
  localOnly,
  remoteOnly,
  riskCounts,
  domainCounts,
  nearTimestampDiagnostics,
};

if (writeReport) {
  mkdirSync(docsDir, { recursive: true });
  writeFileSync(reportPath, renderReport(summary), "utf8");
  writeFileSync(reconciliationCandidatesPath, renderReconciliationCandidatesCsv(summary), "utf8");
  writeFileSync(unmatchedLocalPath, renderUnmatchedLocalCsv(summary), "utf8");
  writeFileSync(unmatchedRemotePath, renderUnmatchedRemoteCsv(summary), "utf8");
  writeFileSync(reconciliationPlanPath, renderReconciliationPlan(summary), "utf8");
  writeFileSync(pendingLocalReviewPath, renderPendingLocalReviewCsv(summary), "utf8");
  writeFileSync(reconciliationRepairDraftPath, renderReconciliationRepairDraftSql(summary), "utf8");
}

const unmatchedSummary = buildUnmatchedSummary(summary);
const pendingLocalSummary = pendingLocalRiskSummary(summary);
const pendingLocalRiskGateDetails = {
  withoutRls: pendingLocalSummary.createsTablesWithoutRls,
  withoutGrants: pendingLocalSummary.createsTablesWithoutGrants,
  sequenceWithoutGrants: pendingLocalSummary.sequenceBackedIdsWithoutSequenceGrants,
  definerWithoutSearchPath: pendingLocalSummary.securityDefinersWithoutSearchPath,
  hardcodedUrls: pendingLocalSummary.hardcodedSupabaseUrls,
  legacyAnonJwts: pendingLocalSummary.legacyAnonJwts,
};
const pendingLocalRiskGateFailures = Object.values(pendingLocalRiskGateDetails).reduce((total, count) => total + count, 0);
const linkedHistoryDisconnected = useLinked && remoteVersions.length > 0 && local.length > 0 && matchedVersions.length === 0;

console.log(JSON.stringify({
  localMigrations: local.length,
  invalidFilenames: invalid.length,
  duplicateVersions: duplicateVersions.length,
  duplicateVersionGroups: summarizeDuplicateGroups(duplicateVersions),
  allowedDuplicateVersions: allowedDuplicateVersionGroups.length,
  allowedDuplicateVersionGroups: summarizeDuplicateGroups(allowedDuplicateVersionGroups),
  newDuplicateVersions: blockingDuplicateVersions.length,
  blockingDuplicateVersionGroups: summarizeDuplicateGroups(blockingDuplicateVersions),
  duplicateHashes: duplicateHashes.length,
  duplicateHashGroups: summarizeDuplicateGroups(duplicateHashes, "hash"),
  supabaseAccessToken,
  remoteMigrations: remoteVersions.length,
  matchedVersions: matchedVersions.length,
  linkedHistoryDisconnected,
  localOnlyPending: localOnly.length,
  remoteOnlyMissingLocally: remoteOnly.length,
  nearTimestampPairsWithinFiveSeconds: nearTimestampDiagnostics.withinFiveSeconds,
  nearTimestampPairsWithinOneMinute: nearTimestampDiagnostics.withinOneMinute,
  oneToOneReconciliationCandidatesWithinFiveSeconds: nearTimestampDiagnostics.oneToOneWithinFiveSeconds,
  oneToOneReconciliationCandidatesWithinOneMinute: nearTimestampDiagnostics.oneToOneWithinOneMinute,
  sharedMigrationCalendarDays: nearTimestampDiagnostics.sharedDays,
  reconciliationCandidates: nearTimestampDiagnostics.candidatesWithinOneMinute.length,
  unmatchedLocalAfterReconciliationCandidates: unmatchedSummary.unmatchedLocal.length,
  unmatchedRemoteAfterReconciliationCandidates: unmatchedSummary.unmatchedRemote.length,
  unmatchedLocalAfterRemoteRange: unmatchedSummary.unmatchedLocalAfterRemoteRange,
  unmatchedRemoteBeforeLocalRange: unmatchedSummary.unmatchedRemoteBeforeLocalRange,
  pendingLocalRiskGates: {
    createsTables: pendingLocalSummary.createsTables,
    withoutRls: pendingLocalSummary.createsTablesWithoutRls,
    withoutGrants: pendingLocalSummary.createsTablesWithoutGrants,
    sequenceWithoutGrants: pendingLocalSummary.sequenceBackedIdsWithoutSequenceGrants,
    definerWithoutSearchPath: pendingLocalSummary.securityDefinersWithoutSearchPath,
    hardcodedUrls: pendingLocalSummary.hardcodedSupabaseUrls,
    legacyAnonJwts: pendingLocalSummary.legacyAnonJwts,
  },
  pendingLocalRiskGateFailures,
  pendingLocalRiskGateDetails,
  pendingRisk: {
    high: riskCounts.high ?? 0,
    medium: riskCounts.medium ?? 0,
    low: riskCounts.low ?? 0,
  },
  report: writeReport ? path.relative(root, reportPath) : undefined,
  reconciliationCandidatesReport: writeReport ? path.relative(root, reconciliationCandidatesPath) : undefined,
  unmatchedLocalReport: writeReport ? path.relative(root, unmatchedLocalPath) : undefined,
  unmatchedRemoteReport: writeReport ? path.relative(root, unmatchedRemotePath) : undefined,
  reconciliationPlan: writeReport ? path.relative(root, reconciliationPlanPath) : undefined,
  pendingLocalReviewReport: writeReport ? path.relative(root, pendingLocalReviewPath) : undefined,
  reconciliationRepairDraft: writeReport ? path.relative(root, reconciliationRepairDraftPath) : undefined,
  remoteError,
}, null, 2));

if (strict && pendingLocalRiskGateFailures > 0) {
  console.error(`Pending local migration safety gates failed: ${JSON.stringify(pendingLocalRiskGateDetails)}`);
}

if (strict && blockingDuplicateVersions.length > 0) {
  console.error(
    `Blocking duplicate migration versions: ${JSON.stringify(summarizeDuplicateGroups(blockingDuplicateVersions))}`,
  );
}

if (strict && linkedHistoryDisconnected) {
  console.error("Linked Supabase migration history is disconnected: local and remote have zero exact version matches.");
}

if (strict && (invalid.length || blockingDuplicateVersions.length || duplicateHashes.length || remoteError || pendingLocalRiskGateFailures > 0 || linkedHistoryDisconnected)) {
  process.exitCode = 1;
}

function summarizeDuplicateGroups(groups, key = "version") {
  return groups.map((items) => ({
    [key]: items[0]?.[key] ?? "",
    files: items.map((item) => item.name),
  }));
}
