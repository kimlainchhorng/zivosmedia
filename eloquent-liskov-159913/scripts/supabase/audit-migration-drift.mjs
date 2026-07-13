import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationsDir = path.join(root, "supabase", "migrations");
const docsDir = path.join(root, "docs");
const reportPath = path.join(docsDir, "supabase-migration-drift-report.md");

const args = new Set(process.argv.slice(2));
const useLinked = args.has("--linked");
const writeReport = args.has("--write-report");
const strict = args.has("--strict");
const allowedDuplicateVersions = new Set(
  [...args]
    .filter((arg) => arg.startsWith("--allow-duplicate-version="))
    .map((arg) => arg.split("=")[1])
    .filter(Boolean),
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
  const result = spawnSync("supabase", ["db", "query", "--agent=no", "--linked", "-o", "json", query], {
    cwd: root,
    encoding: "utf8",
  });

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

function renderReport(summary) {
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
    `- Duplicate SQL hashes: ${summary.duplicateHashes.length}`,
    `- Remote migrations: ${summary.remoteVersions.length}`,
    `- Matched versions: ${summary.matchedVersions.length}`,
    `- Local-only pending: ${summary.localOnly.length}`,
    `- Remote-only missing locally: ${summary.remoteOnly.length}`,
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
      (items) => `- ${items[0].version}: ${items.map((item) => item.name).join(", ")}`,
      50,
    ),
    "",
    "## Remote Query",
    "",
    summary.remoteError ? `- Error: ${summary.remoteError}` : "- Linked remote migration history was read successfully.",
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

  return `${lines.join("\n")}\n`;
}

const { files: local, invalid } = readLocalMigrations();
const duplicateVersions = findDuplicates(local, "version");
const duplicateHashes = findDuplicates(local, "hash");
const blockingDuplicateVersions = duplicateVersions.filter(
  (items) => !allowedDuplicateVersions.has(items[0].version),
);
const { versions: remoteVersions, error: remoteError } = readRemoteVersions();

const localVersionSet = new Set(local.map((item) => item.version));
const remoteVersionSet = new Set(remoteVersions);
const matchedVersions = local.filter((item) => remoteVersionSet.has(item.version));
const localOnly = local.filter((item) => !remoteVersionSet.has(item.version));
const remoteOnly = remoteVersions.filter((version) => !localVersionSet.has(version));
const riskCounts = countBy(localOnly, "risk");
const domainCounts = countBy(localOnly, "domain");

const summary = {
  local,
  invalid,
  duplicateVersions,
  blockingDuplicateVersions,
  duplicateHashes,
  remoteVersions,
  remoteError,
  matchedVersions,
  localOnly,
  remoteOnly,
  riskCounts,
  domainCounts,
};

if (writeReport) {
  mkdirSync(docsDir, { recursive: true });
  writeFileSync(reportPath, renderReport(summary), "utf8");
}

console.log(JSON.stringify({
  localMigrations: local.length,
  invalidFilenames: invalid.length,
  duplicateVersions: duplicateVersions.length,
  allowedDuplicateVersions: duplicateVersions.length - blockingDuplicateVersions.length,
  newDuplicateVersions: blockingDuplicateVersions.length,
  duplicateHashes: duplicateHashes.length,
  remoteMigrations: remoteVersions.length,
  matchedVersions: matchedVersions.length,
  localOnlyPending: localOnly.length,
  remoteOnlyMissingLocally: remoteOnly.length,
  pendingRisk: {
    high: riskCounts.high ?? 0,
    medium: riskCounts.medium ?? 0,
    low: riskCounts.low ?? 0,
  },
  report: writeReport ? path.relative(root, reportPath) : undefined,
  remoteError,
}, null, 2));

if (strict && (invalid.length || blockingDuplicateVersions.length || duplicateHashes.length || remoteError)) {
  process.exitCode = 1;
}
