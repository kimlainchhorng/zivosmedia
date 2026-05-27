#!/usr/bin/env node
/**
 * Database upgrade readiness
 *
 * Non-destructive scanner for Supabase/Postgres upgrade planning. It does not
 * connect to or mutate the remote database. Use it before Postgres major
 * upgrades, migration reconciliation, or production schema pushes.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { KNOWN_DUPLICATE_MIGRATION_VERSION_SET } from "./migration-policy.mjs";
import { getSupabaseCli as readSupabaseCli } from "./supabase-cli.mjs";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const writeReport = args.has("--write-report");
const strict = args.has("--strict");
const docsDir = path.join(root, "docs");
const migrationsDir = path.join(root, "supabase", "migrations");
const driftReportPath = path.join(docsDir, "supabase-migration-drift-report.md");
const reportPath = path.join(docsDir, "database-upgrade-readiness-report.md");

const migrationPattern = /^(\d{14})_.+\.sql$/;
const pg17UnsupportedExtensions = new Set(["timescaledb", "plv8", "plls", "plcoffee", "pgjwt"]);
const dataApiGrantReviewVersion = "20260428000000";

function readText(file) {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function rel(file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

function readLocalMigrations() {
  if (!existsSync(migrationsDir)) return [];
  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => {
      const file = path.join(migrationsDir, name);
      const sql = readText(file);
      const match = name.match(migrationPattern);
      return {
        name,
        file,
        version: match?.[1] ?? null,
        hash: createHash("sha256").update(sql).digest("hex"),
        sql,
      };
    });
}

function groupBy(items, keyFn) {
  const grouped = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  return grouped;
}

function parseDriftReport() {
  if (!existsSync(driftReportPath)) return null;
  const text = readText(driftReportPath);
  const pick = (label) => Number.parseInt(text.match(new RegExp(`- ${label}: (\\d+)`))?.[1] ?? "0", 10);
  const remoteSection = text.match(/## Remote Query\n\n([\s\S]*?)(?:\n## |$)/)?.[1]?.trim() ?? "";
  const remoteError = remoteSection.startsWith("- Error:") ? remoteSection.replace(/^- Error:\s*/, "").trim() : null;
  return {
    file: driftReportPath,
    generated: text.match(/^Generated: (.+)$/m)?.[1] ?? "unknown",
    local: pick("Local migrations"),
    duplicateVersions: pick("Duplicate versions"),
    allowedDuplicateVersions: pick("Allowed duplicate versions"),
    newDuplicateVersions: pick("New duplicate versions"),
    duplicateHashes: pick("Duplicate SQL hashes"),
    remote: pick("Remote migrations"),
    matched: pick("Matched versions"),
    localOnly: pick("Local-only pending"),
    remoteOnly: pick("Remote-only missing locally"),
    remoteError,
  };
}

function getSupabaseCli() {
  return readSupabaseCli(root);
}

function stripQuotes(value) {
  return value.replace(/^"+|"+$/g, "").toLowerCase();
}

function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--.*$/gm, " ");
}

function extractExtensions(migrations) {
  const rows = [];
  const re = /\bcreate\s+extension\s+(?:if\s+not\s+exists\s+)?("?[\w-]+"?)/gi;
  for (const migration of migrations) {
    const sql = stripSqlComments(migration.sql);
    for (const match of sql.matchAll(re)) {
      const name = stripQuotes(match[1]);
      rows.push({
        name,
        file: rel(migration.file),
        pg17Unsupported: pg17UnsupportedExtensions.has(name),
      });
    }
  }
  return rows;
}

function extractPublicTables(migrations) {
  const created = new Map();
  const rlsEnabled = new Set();
  const createRe = /\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?(?:(public)\.)?("?[\w]+"?)/gi;
  const rlsRe = /\balter\s+table\s+(?:if\s+exists\s+)?(?:(public)\.)?("?[\w]+"?)\s+enable\s+row\s+level\s+security\b/gi;

  for (const migration of migrations) {
    const sql = stripSqlComments(migration.sql);
    for (const match of sql.matchAll(createRe)) {
      const schema = match[1] ?? "public";
      const table = stripQuotes(match[2]);
      if (schema.toLowerCase() !== "public") continue;
      if (!created.has(table)) created.set(table, { table, version: migration.version, file: rel(migration.file) });
    }
    for (const match of sql.matchAll(rlsRe)) {
      const schema = match[1] ?? "public";
      if (schema.toLowerCase() === "public") rlsEnabled.add(stripQuotes(match[2]));
    }
  }

  return {
    created: [...created.values()],
    missingRlsInMigrations: [...created.values()].filter((row) => !rlsEnabled.has(row.table)),
  };
}

function extractDataApiGrantReview(migrations, publicTables) {
  const grantedTables = new Set();
  const grantRe = /\bgrant\b[\s\S]{0,500}?\bon\s+(?:table\s+)?(?:public\.)?("?[\w]+"?)\s+to\s+([^;]+);/gi;
  for (const migration of migrations) {
    const sql = stripSqlComments(migration.sql);
    for (const match of sql.matchAll(grantRe)) {
      const grantees = match[2].toLowerCase();
      if (!/\b(anon|authenticated|service_role)\b/.test(grantees)) continue;
      grantedTables.add(stripQuotes(match[1]));
    }
  }

  return publicTables.created.filter((row) => (
    row.version &&
    row.version >= dataApiGrantReviewVersion &&
    !grantedTables.has(row.table)
  ));
}

function extractViewRisks(migrations) {
  const rows = [];
  const hardenedViews = new Set();
  const createRe = /\bcreate\s+(?:or\s+replace\s+)?view\s+(?:public\.)?("?[\w]+"?)/gi;
  const alterRe = /\balter\s+view\s+(?:if\s+exists\s+)?(?:public\.)?("?[\w]+"?)\s+set\s*\([^)]*\bsecurity_invoker\s*=\s*true/gi;

  for (const migration of migrations) {
    const sql = stripSqlComments(migration.sql);
    for (const match of sql.matchAll(alterRe)) {
      hardenedViews.add(stripQuotes(match[1]));
    }
  }

  for (const migration of migrations) {
    const sql = stripSqlComments(migration.sql);
    for (const match of sql.matchAll(createRe)) {
      const view = stripQuotes(match[1]);
      const nearby = sql.slice(Math.max(0, match.index - 220), match.index + 420).toLowerCase();
      if (nearby.includes("security_invoker")) continue;
      if (hardenedViews.has(view)) continue;
      rows.push({
        view,
        file: rel(migration.file),
      });
    }
  }
  return rows;
}

function hasGlobalSecurityDefinerSearchPathHardening(migrations) {
  return migrations.some((migration) => {
    const sql = stripSqlComments(migration.sql);
    return /\bpg_proc\b/i.test(sql)
      && /\bprosecdef\b/i.test(sql)
      && /\balter\s+function\b/i.test(sql)
      && /\bset\s+search_path\b/i.test(sql);
  });
}

function extractSecurityDefinerRisks(migrations) {
  if (hasGlobalSecurityDefinerSearchPathHardening(migrations)) return [];
  return migrations
    .filter((migration) => /\bsecurity\s+definer\b/i.test(migration.sql) && !/\bset\s+search_path\b/i.test(migration.sql))
    .map((migration) => rel(migration.file));
}

function renderList(items, mapper, limit = 40) {
  if (!items.length) return "- None";
  const visible = items.slice(0, limit).map(mapper);
  const hidden = items.length - visible.length;
  if (hidden > 0) visible.push(`- ...and ${hidden} more`);
  return visible.join("\n");
}

function buildSummary() {
  const migrations = readLocalMigrations();
  const invalidFilenames = migrations.filter((item) => !item.version);
  const duplicateVersions = [...groupBy(migrations, (item) => item.version).values()].filter((items) => items.length > 1);
  const blockingDuplicateVersions = duplicateVersions.filter((items) => !KNOWN_DUPLICATE_MIGRATION_VERSION_SET.has(items[0].version));
  const allowedDuplicateVersions = duplicateVersions.filter((items) => KNOWN_DUPLICATE_MIGRATION_VERSION_SET.has(items[0].version));
  const duplicateHashes = [...groupBy(migrations, (item) => item.hash).values()].filter((items) => items.length > 1);
  const drift = parseDriftReport();
  const cli = getSupabaseCli();
  const extensions = extractExtensions(migrations);
  const unsupportedExtensions = extensions.filter((item) => item.pg17Unsupported);
  const publicTables = extractPublicTables(migrations);
  const dataApiGrantReview = extractDataApiGrantReview(migrations, publicTables);
  const viewRisks = extractViewRisks(migrations);
  const securityDefinerWithoutSearchPath = extractSecurityDefinerRisks(migrations);

  const blockers = [];
  const warnings = [];

  if (invalidFilenames.length) blockers.push(`${invalidFilenames.length} migration filename(s) do not match the Supabase timestamp format.`);
  if (blockingDuplicateVersions.length) blockers.push(`${blockingDuplicateVersions.length} new duplicate migration version(s) need reconciliation before db push/pull.`);
  if (duplicateHashes.length) warnings.push(`${duplicateHashes.length} duplicate migration SQL hash(es) found.`);
  if (unsupportedExtensions.length) blockers.push("Postgres 17-unsupported extension declarations were found in local migrations.");
  if (!cli.installed) warnings.push("Supabase CLI is not installed, so linked migration history and advisors cannot be refreshed from this machine.");
  if (!drift) {
    warnings.push("Supabase migration drift report is missing.");
  } else {
    if (drift.local !== migrations.length) warnings.push(`Supabase migration drift report is stale: report local=${drift.local}, current local=${migrations.length}.`);
    if (drift.newDuplicateVersions !== blockingDuplicateVersions.length) warnings.push(`Supabase migration drift report is stale: report new duplicates=${drift.newDuplicateVersions}, current new duplicates=${blockingDuplicateVersions.length}.`);
    if (drift.remoteError) {
      blockers.push("Linked Supabase migration history could not be read. Run supabase login or configure authenticated MCP before upgrade.");
    } else if (drift.local > 0 && drift.remote > 0 && drift.matched === 0) {
      blockers.push("Local and remote migration histories have zero matching versions.");
    }
  }
  if (publicTables.missingRlsInMigrations.length) {
    warnings.push(`${publicTables.missingRlsInMigrations.length} public table(s) were created without a detected RLS enable statement in migrations.`);
  }
  if (dataApiGrantReview.length) {
    warnings.push(`${dataApiGrantReview.length} recent public table(s) should be reviewed for explicit Data API grants after the Supabase exposure change.`);
  }
  if (viewRisks.length) warnings.push(`${viewRisks.length} view(s) may need security_invoker=true review before Postgres 17/Data API exposure.`);
  if (securityDefinerWithoutSearchPath.length) {
    warnings.push(`${securityDefinerWithoutSearchPath.length} SECURITY DEFINER migration file(s) may need explicit SET search_path review.`);
  }

  return {
    cli,
    localMigrations: migrations.length,
    invalidFilenames,
    duplicateVersions,
    blockingDuplicateVersions,
    allowedDuplicateVersions,
    duplicateHashes,
    drift,
    extensions,
    unsupportedExtensions,
    publicTables,
    dataApiGrantReview,
    viewRisks,
    securityDefinerWithoutSearchPath,
    blockers,
    warnings,
  };
}

function renderReport(summary) {
  return [
    "# Database Upgrade Readiness Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `- Supabase CLI: ${summary.cli.installed ? summary.cli.version : "missing"}`,
    `- Local migrations: ${summary.localMigrations}`,
    `- Invalid migration filenames: ${summary.invalidFilenames.length}`,
    `- Duplicate migration versions: ${summary.duplicateVersions.length}`,
    `- Allowed legacy duplicate migration versions: ${summary.allowedDuplicateVersions.length}`,
    `- New duplicate migration versions: ${summary.blockingDuplicateVersions.length}`,
    `- Duplicate SQL hashes: ${summary.duplicateHashes.length}`,
    summary.drift
      ? `- Last linked drift report: local=${summary.drift.local}, remote=${summary.drift.remote}, matched=${summary.drift.matched}, remoteError=${summary.drift.remoteError ? "yes" : "no"}, generated=${summary.drift.generated}`
      : "- Last linked drift report: missing",
    `- Declared extensions: ${[...new Set(summary.extensions.map((item) => item.name))].sort().join(", ") || "none"}`,
    `- Postgres 17 unsupported extensions found: ${summary.unsupportedExtensions.length}`,
    `- Public tables created in migrations: ${summary.publicTables.created.length}`,
    `- Public tables needing RLS review: ${summary.publicTables.missingRlsInMigrations.length}`,
    `- Recent public tables needing Data API grant review: ${summary.dataApiGrantReview.length}`,
    `- Views needing security_invoker review: ${summary.viewRisks.length}`,
    `- SECURITY DEFINER files needing search_path review: ${summary.securityDefinerWithoutSearchPath.length}`,
    "",
    "## Blockers",
    "",
    renderList(summary.blockers, (item) => `- ${item}`),
    "",
    "## Warnings",
    "",
    renderList(summary.warnings, (item) => `- ${item}`),
    "",
    "## Duplicate Versions",
    "",
    renderList(
      summary.duplicateVersions,
      (items) => {
        const version = items[0].version;
        const suffix = KNOWN_DUPLICATE_MIGRATION_VERSION_SET.has(version)
          ? " (allowed legacy duplicate)"
          : " (needs reconciliation)";
        return `- ${version}: ${items.map((item) => item.name).join(", ")}${suffix}`;
      },
      80,
    ),
    "",
    "## Postgres 17 Extension Review",
    "",
    renderList(
      summary.unsupportedExtensions,
      (item) => `- ${item.name}: ${item.file}`,
      80,
    ),
    "",
    "## RLS Review Candidates",
    "",
    renderList(
      summary.publicTables.missingRlsInMigrations,
      (item) => `- ${item.table}: ${item.file}`,
      80,
    ),
    "",
    "## Data API Grant Review Candidates",
    "",
    renderList(
      summary.dataApiGrantReview,
      (item) => `- ${item.table}: ${item.file}`,
      80,
    ),
    "",
    "## View Review Candidates",
    "",
    renderList(summary.viewRisks, (item) => `- ${item.view}: ${item.file}`, 80),
    "",
    "## Remote SQL To Run Before Upgrade",
    "",
    "```sql",
    "select version();",
    "select extname, extversion from pg_extension order by extname;",
    "select version from supabase_migrations.schema_migrations order by version;",
    "select table_schema, table_name, privilege_type, grantee",
    "from information_schema.role_table_grants",
    "where table_schema = 'public' and grantee in ('anon', 'authenticated')",
    "order by table_schema, table_name, grantee, privilege_type;",
    "select schemaname, tablename",
    "from pg_tables t",
    "join pg_class c on c.relname = t.tablename",
    "join pg_namespace n on n.oid = c.relnamespace and n.nspname = t.schemaname",
    "where schemaname = 'public' and not c.relrowsecurity",
    "order by schemaname, tablename;",
    "```",
    "",
    "## Upgrade Path",
    "",
    "1. Install/authenticate Supabase CLI or MCP and refresh `docs/supabase-migration-drift-report.md`.",
    "2. Reconcile duplicate local migration versions without rewriting already-applied production history.",
    "3. Compare remote schema history to local migrations and decide whether this repo needs a baseline migration.",
    "4. Confirm no Postgres 17-unsupported extensions are installed remotely.",
    "5. For every public table that must be reachable through REST/GraphQL, enable RLS and add explicit grants for `anon` and/or `authenticated`.",
    "6. Run Supabase advisors, type generation, API readiness, secret scan, and a production build.",
    "",
  ].join("\n");
}

const summary = buildSummary();

if (writeReport) {
  mkdirSync(docsDir, { recursive: true });
  writeFileSync(reportPath, renderReport(summary), "utf8");
}

console.log(JSON.stringify({
  blockers: summary.blockers.length,
  warnings: summary.warnings.length,
  localMigrations: summary.localMigrations,
  duplicateVersions: summary.duplicateVersions.length,
  allowedDuplicateVersions: summary.allowedDuplicateVersions.length,
  newDuplicateVersions: summary.blockingDuplicateVersions.length,
  duplicateHashes: summary.duplicateHashes.length,
  unsupportedPg17Extensions: summary.unsupportedExtensions.length,
  publicTablesNeedingRlsReview: summary.publicTables.missingRlsInMigrations.length,
  dataApiGrantReviewCandidates: summary.dataApiGrantReview.length,
  viewsNeedingSecurityInvokerReview: summary.viewRisks.length,
  securityDefinerFilesNeedingSearchPathReview: summary.securityDefinerWithoutSearchPath.length,
  supabaseCli: summary.cli.installed ? summary.cli.version : "missing",
  report: writeReport ? rel(reportPath) : undefined,
}, null, 2));

if (strict && summary.blockers.length > 0) {
  process.exitCode = 1;
}
