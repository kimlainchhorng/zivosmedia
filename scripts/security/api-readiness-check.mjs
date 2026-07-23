#!/usr/bin/env node
/**
 * API readiness check
 *
 * Produces a production-focused report for the Supabase/API layer:
 * - public env/config sanity
 * - frontend secret exposure guardrails
 * - Supabase Edge Function inventory
 * - high-risk function coverage for shared security wrappers
 * - migration drift summary from the generated Supabase report
 *
 * Strict mode exits non-zero only for critical issues. Warnings are printed and
 * reported so the backlog is visible without blocking every local build.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const writeReport = args.has("--write-report");
const strict = args.has("--strict");
const docsDir = path.join(root, "docs");
const reportPath = path.join(docsDir, "api-readiness-report.md");

const requiredPublicEnv = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_PROJECT_ID",
];

const recommendedBackendEnv = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const frontendSecretPatterns = [
  { id: "frontend-service-role", label: "Supabase service role reference", re: /SUPABASE_SERVICE_ROLE_KEY|service_role/i },
  { id: "frontend-supabase-secret-key", label: "Supabase secret key reference", re: /sb_secret_[0-9A-Za-z_-]{20,}/ },
  { id: "frontend-stripe-secret", label: "Stripe secret key reference", re: /STRIPE_SECRET_KEY|sk_live_[0-9A-Za-z]{20,}/ },
  { id: "frontend-twilio-secret", label: "Twilio auth token reference", re: /TWILIO_AUTH_TOKEN/i },
  { id: "frontend-private-key", label: "Private key block", re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/ },
];

const highRiskFunctionName = /(admin|auth|login|otp|token|session|wallet|payment|checkout|capture|webhook|payout|withdraw|withdrawal|refund|cancel|delete|moderate|verify|transfer|coin|stripe|paypal|square|aba|bakong)/i;
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const findings = {
  critical: [],
  warnings: [],
  info: [],
};

function add(level, id, message, details = {}) {
  findings[level].push({ id, message, ...details });
}

function rel(file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

function readText(file) {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function readJson(file) {
  try {
    return JSON.parse(readText(file));
  } catch {
    return null;
  }
}

function walkFiles(dir, predicate, output = []) {
  if (!existsSync(dir)) return output;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".git" || entry === "dist") continue;
    const full = path.join(dir, entry);
    let stats;
    try {
      stats = statSync(full);
    } catch {
      continue;
    }
    if (stats.isDirectory()) {
      walkFiles(full, predicate, output);
      continue;
    }
    if (predicate(full, stats)) output.push(full);
  }
  return output;
}

function parsePackage() {
  const file = path.join(root, "package.json");
  if (!existsSync(file)) {
    add("critical", "missing-package-json", "package.json is missing.");
    return null;
  }
  try {
    return JSON.parse(readText(file));
  } catch (error) {
    add("critical", "invalid-package-json", `package.json could not be parsed: ${error.message}`);
    return null;
  }
}

function compareVersions(actual, minimum) {
  const a = actual.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const b = minimum.split(".").map((part) => Number.parseInt(part, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if ((a[i] ?? 0) > (b[i] ?? 0)) return 1;
    if ((a[i] ?? 0) < (b[i] ?? 0)) return -1;
  }
  return 0;
}

function checkRuntime(pkg) {
  const engine = pkg?.engines?.node;
  if (!engine) {
    add("warnings", "missing-node-engine", "package.json does not declare a Node engine.");
    return;
  }
  const minimum = String(engine).match(/>=\s*([0-9]+(?:\.[0-9]+){0,2})/)?.[1];
  if (!minimum) {
    add("warnings", "unparsed-node-engine", `Node engine "${engine}" could not be parsed by the readiness checker.`);
    return;
  }
  if (compareVersions(process.versions.node, minimum) < 0) {
    add("critical", "node-version-too-old", `Current Node ${process.versions.node} is below required ${minimum}.`);
  }
}

function checkEnvTemplate() {
  const file = path.join(root, ".env.example");
  if (!existsSync(file)) {
    add("critical", "missing-env-example", ".env.example is missing.");
    return;
  }
  const text = readText(file);
  for (const name of requiredPublicEnv) {
    if (!new RegExp(`^${name}=`, "m").test(text)) {
      add("critical", "missing-public-env-template", `.env.example is missing ${name}.`, { file: rel(file) });
    }
  }
  for (const name of recommendedBackendEnv) {
    if (!new RegExp(`^${name}=`, "m").test(text)) {
      add("warnings", "missing-backend-env-template", `.env.example is missing ${name}.`, { file: rel(file) });
    }
  }

  const anonLine = text.match(/^SUPABASE_ANON_KEY=(.+)$/m)?.[1]?.trim() ?? "";
  if (anonLine && !anonLine.startsWith("eyJ") && !anonLine.includes("<legacy-anon")) {
    add(
      "warnings",
      "backend-anon-env-template-format",
      "SUPABASE_ANON_KEY in .env.example should document the legacy anon JWT needed by Edge Function JWT verification and database cron auth.",
      { file: rel(file) },
    );
  }

  const publishableLine = text.match(/^VITE_SUPABASE_PUBLISHABLE_KEY=(.+)$/m)?.[1]?.trim() ?? "";
  if (publishableLine.startsWith("sb_secret_") || publishableLine.includes("service_role")) {
    add("critical", "public-env-template-secret", ".env.example puts a secret/service-role value in VITE_SUPABASE_PUBLISHABLE_KEY.", { file: rel(file) });
  }
}

function checkSupabaseClient() {
  const file = path.join(root, "src", "integrations", "supabase", "client.ts");
  if (!existsSync(file)) {
    add("critical", "missing-supabase-client", "Supabase browser client is missing.", { file: rel(file) });
    return;
  }
  const text = readText(file);
  if (/SUPABASE_PUBLISHABLE_KEY\s*=\s*"eyJ/.test(text) || /SUPABASE_URL\s*=\s*"https:\/\/[a-z0-9]+\.supabase\.co"/i.test(text)) {
    add(
      "warnings",
      "hardcoded-supabase-browser-config",
      "Browser Supabase URL/key are hardcoded. Prefer Vite env values so staging and production can use separate projects.",
      { file: rel(file) },
    );
  }
  for (const pattern of frontendSecretPatterns) {
    if (pattern.re.test(text) && pattern.id !== "frontend-service-role") {
      add("critical", pattern.id, `${pattern.label} appears in the browser Supabase client.`, { file: rel(file) });
    }
  }
}

function checkFrontendSecrets() {
  const srcDir = path.join(root, "src");
  const files = walkFiles(srcDir, (file, stats) => {
    if (stats.size >= 2_000_000) return false;
    if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(file)) return false;
    if (file.includes(`${path.sep}src${path.sep}test${path.sep}`)) return false;
    return sourceExtensions.has(path.extname(file).toLowerCase());
  });
  for (const file of files) {
    const text = readText(file);
    for (const pattern of frontendSecretPatterns) {
      const match = text.match(pattern.re);
      if (!match) continue;
      if (pattern.id === "frontend-service-role" && rel(file).endsWith("types.ts")) continue;
      if (
        pattern.id === "frontend-service-role" &&
        rel(file) === "src/integrations/supabase/client.ts" &&
        /json\?\.(?:role|\["role"\])\s*===\s*["']service_role["']/.test(text)
      ) {
        continue;
      }
      const line = text.slice(0, match.index).split("\n").length;
      add("critical", pattern.id, `${pattern.label} found in frontend source.`, { file: rel(file), line });
    }
  }
}

function checkActiveHardcodedSupabaseUrls() {
  const activeRoots = ["src", "scripts", "cloudflare", "netlify"];
  const files = activeRoots.flatMap((dir) =>
    walkFiles(path.join(root, dir), (file, stats) => {
      if (stats.size >= 2_000_000) return false;
      if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(file)) return false;
      return sourceExtensions.has(path.extname(file).toLowerCase()) ||
        [".md", ".sh", ".toml", ".yaml", ".yml"].includes(path.extname(file).toLowerCase());
    }),
  );

  for (const file of files) {
    const text = readText(file);
    const matches = [...text.matchAll(/https:\/\/([a-z0-9]{12,})\.supabase\.co\b/gi)];
    for (const match of matches) {
      const projectRef = match[1];
      if (projectRef === "project-ref") continue;
      const line = text.slice(0, match.index).split("\n").length;
      add(
        "warnings",
        "active-hardcoded-supabase-url",
        "Active app/script code contains a hardcoded Supabase project URL. Prefer SUPABASE_URL/VITE_SUPABASE_URL.",
        { file: rel(file), line },
      );
    }
  }
}

function checkSharedEdgeFiles() {
  const required = [
    "supabase/functions/_shared/withSecurity.ts",
    "supabase/functions/_shared/cors.ts",
    "supabase/functions/_shared/respond.ts",
    "supabase/functions/_shared/rateLimiter.ts",
    "supabase/functions/_shared/audit.ts",
  ];
  for (const item of required) {
    if (!existsSync(path.join(root, item))) {
      add("critical", "missing-edge-shared-helper", `Missing shared Edge Function helper: ${item}`);
    }
  }

  const corsFile = path.join(root, "supabase", "functions", "_shared", "cors.ts");
  const corsText = readText(corsFile);
  if (/lovable\.dev|lovable\.app/.test(corsText)) {
    add(
      "warnings",
      "preview-origin-allowed-in-cors",
      "Shared CORS allowlist still accepts Lovable preview origins. Remove before strict production go-live if previews are not needed.",
      { file: rel(corsFile) },
    );
  }
}

function checkOperationsRunbook() {
  const file = path.join(root, "docs", "api-operations-runbook.md");
  if (!existsSync(file)) {
    add(
      "warnings",
      "missing-api-operations-runbook",
      "docs/api-operations-runbook.md is missing; ops needs owners and checks for function 5xx, webhook failures, slow queries, and auth/payment spikes.",
    );
    return { present: false, file: rel(file), missingTopics: ["function 5xx", "webhook failure", "slow query", "auth spike", "payment spike"] };
  }

  const text = readText(file).toLowerCase();
  const topics = [
    ["function 5xx", /function\s+5xx|5xx/],
    ["webhook failure", /webhook\s+failure|webhook failures/],
    ["slow query", /slow\s+quer|pg_stat_statements|database\s+slow/],
    ["auth spike", /auth\s+spike|auth_login/],
    ["payment spike", /payment\s+spike|payment\s+error/],
    ["owner", /owner|primary owner|engineering|security|payments|database/],
  ];
  const missingTopics = topics.filter(([, re]) => !re.test(text)).map(([topic]) => topic);
  for (const topic of missingTopics) {
    add("warnings", "api-operations-runbook-topic-missing", `API operations runbook is missing ${topic} coverage.`, { file: rel(file) });
  }
  return { present: true, file: rel(file), missingTopics };
}

function inspectFunctions() {
  const functionsDir = path.join(root, "supabase", "functions");
  if (!existsSync(functionsDir)) {
    add("critical", "missing-functions-dir", "supabase/functions is missing.");
    return {
      total: 0,
      highRisk: 0,
      withSecurity: 0,
      strictCors: 0,
      methodGated: 0,
      serviceRole: 0,
      highRiskMissingSecurity: [],
      highRiskMissingMethodGate: [],
      missingWithSecurity: [],
      missingStrictCors: [],
      missingMethodGate: [],
      wildcardCors: [],
      looseRouteBacklog: [],
    };
  }

  const rows = [];
  for (const name of readdirSync(functionsDir).sort()) {
    if (name.startsWith("_")) continue;
    const indexFile = path.join(functionsDir, name, "index.ts");
    if (!existsSync(indexFile)) continue;
    const text = readText(indexFile);
    const row = {
      name,
      file: rel(indexFile),
      highRisk: highRiskFunctionName.test(name),
      hasServe: /Deno\.serve|serve\s*\(/.test(text),
      withSecurity: /withSecurity\s*\(/.test(text),
      strictCors: /strictCorsHeaders\s*\(|strictCors\s*:\s*true/.test(text),
      methodGated: /allowedMethods\s*:/.test(text),
      wildcardCors:
        /Access-Control-Allow-Origin["']?\s*:\s*["']\*/.test(text) ||
        /['"]Access-Control-Allow-Origin['"]\s*,\s*['"]\*['"]/.test(text),
      serviceRole: /SUPABASE_SERVICE_ROLE_KEY/.test(text),
    };
    rows.push(row);

    if (!row.hasServe) {
      add("critical", "edge-function-missing-serve", "Edge Function has no Deno.serve/serve handler.", { file: row.file });
    }
    if (row.highRisk && !row.withSecurity) {
      add("warnings", "high-risk-function-without-wrapper", "High-risk Edge Function does not use withSecurity().", { file: row.file });
    }
    if (row.highRisk && row.serviceRole && row.wildcardCors && !row.withSecurity) {
      add(
        "warnings",
        "service-role-wildcard-cors",
        "High-risk service-role function appears to use wildcard CORS without the shared security wrapper.",
        { file: row.file },
      );
    }
  }

  const highRiskMissingSecurity = rows.filter((row) => row.highRisk && !row.withSecurity).map((row) => row.file);
  const missingWithSecurity = rows.filter((row) => !row.withSecurity).map((row) => row.file);
  const missingStrictCors = rows.filter((row) => !row.strictCors).map((row) => row.file);
  const missingMethodGate = rows.filter((row) => row.withSecurity && !row.methodGated).map((row) => row.file);
  const highRiskMissingMethodGate = rows.filter((row) => row.highRisk && row.withSecurity && !row.methodGated).map((row) => row.file);
  const wildcardCors = rows.filter((row) => row.wildcardCors).map((row) => row.file);
  const looseRouteBacklog = rows
    .filter((row) => !row.withSecurity || !row.strictCors || row.wildcardCors)
    .map((row) => row.file);

  if (looseRouteBacklog.length > 0) {
    add(
      "critical",
      "edge-function-security-backlog",
      "Every Edge Function must use withSecurity(), strict CORS, and avoid literal wildcard origins.",
      { count: looseRouteBacklog.length },
    );
  }
  if (missingMethodGate.length > 0) {
    add(
      "critical",
      "edge-function-method-gate-backlog",
      "Every Edge Function using withSecurity() must declare wrapper-level allowedMethods.",
      { count: missingMethodGate.length },
    );
  }

  return {
    total: rows.length,
    highRisk: rows.filter((row) => row.highRisk).length,
    withSecurity: rows.filter((row) => row.withSecurity).length,
    strictCors: rows.filter((row) => row.strictCors).length,
    methodGated: rows.filter((row) => row.methodGated).length,
    serviceRole: rows.filter((row) => row.serviceRole).length,
    highRiskMissingSecurity,
    highRiskMissingMethodGate,
    missingWithSecurity,
    missingStrictCors,
    missingMethodGate,
    wildcardCors,
    looseRouteBacklog,
  };
}

function readMcpMigrationHistoryReport(currentLocalCount) {
  const file = path.join(root, "docs", "supabase-mcp-migration-history-report.json");
  if (!existsSync(file)) return null;

  const report = readJson(file);
  const requiredVersions = [
    "20260722192749",
    "20260722193417",
    "20260722193446",
  ];
  const verifiedVersions = new Set(
    Array.isArray(report?.verifiedAppliedMigrations)
      ? report.verifiedAppliedMigrations.map((item) => String(item?.version ?? ""))
      : [],
  );
  const localMigrations = Number(report?.localMigrations ?? 0);
  const remoteMigrations = Number(report?.remoteMigrations ?? 0);
  const valid = (
    report?.source === "supabase-mcp" &&
    report?.projectRef === "slirphzzwcogdbkeicff" &&
    localMigrations === currentLocalCount &&
    remoteMigrations > 0 &&
    typeof report?.latestRemoteVersion === "string" &&
    requiredVersions.every((version) => verifiedVersions.has(version))
  );

  return {
    file: rel(file),
    valid,
    source: String(report?.source ?? ""),
    projectRef: String(report?.projectRef ?? ""),
    generated: String(report?.generated ?? ""),
    localMigrations,
    remoteMigrations,
    firstRemoteVersion: String(report?.firstRemoteVersion ?? ""),
    latestRemoteVersion: String(report?.latestRemoteVersion ?? ""),
    verifiedVersions: [...verifiedVersions].filter(Boolean).sort(),
  };
}

function readMigrationDrift() {
  const file = path.join(root, "docs", "supabase-migration-drift-report.md");
  const migrationsDir = path.join(root, "supabase", "migrations");
  if (!existsSync(file)) {
    add("warnings", "missing-migration-drift-report", "Run npm run supabase:migrations:report to generate migration drift data.");
    return null;
  }
  const text = readText(file);
  const pick = (label) => Number.parseInt(text.match(new RegExp(`- ${label}: (\\d+)`))?.[1] ?? "0", 10);
  const remoteSection = text.match(/## Remote Query\n\n([\s\S]*?)(?:\n## |$)/)?.[1]?.trim() ?? "";
  const drift = {
    local: pick("Local migrations"),
    duplicateVersions: pick("Duplicate versions"),
    allowedDuplicateVersions: pick("Allowed duplicate versions"),
    newDuplicateVersions: pick("New duplicate versions"),
    remote: pick("Remote migrations"),
    matched: pick("Matched versions"),
    localOnly: pick("Local-only pending"),
    remoteOnly: pick("Remote-only missing locally"),
    nearFiveSeconds: pick("Near timestamp pairs within 5 seconds"),
    nearOneMinute: pick("Near timestamp pairs within 1 minute"),
    oneToOneNearFiveSeconds: pick("One-to-one reconciliation candidates within 5 seconds"),
    oneToOneNearOneMinute: pick("One-to-one reconciliation candidates within 1 minute"),
    unmatchedLocalAfterCandidates: pick("Unmatched local migrations after one-to-one candidates"),
    unmatchedRemoteAfterCandidates: pick("Unmatched remote versions after one-to-one candidates"),
    unmatchedLocalAfterRemoteRange: pick("Unmatched local migrations after remote range"),
    unmatchedRemoteBeforeLocalRange: pick("Unmatched remote versions before local range"),
    pendingCreatesTables: pick("Pending local creates tables"),
    pendingCreatesTablesWithoutRls: pick("Pending local creates tables without RLS"),
    pendingCreatesTablesWithoutGrants: pick("Pending local creates tables without explicit grants"),
    pendingSequenceBackedIdsWithoutSequenceGrants: pick("Pending local sequence-backed ids without sequence grants"),
    pendingSecurityDefinersWithoutSearchPath: pick("Pending local SECURITY DEFINER without search_path"),
    pendingHardcodedSupabaseUrls: pick("Pending local hardcoded Supabase URLs"),
    pendingLegacyAnonJwts: pick("Pending local legacy anon JWTs"),
    sharedDays: pick("Shared migration calendar days"),
    remoteError: /(?:^|\n)- Error:/.test(remoteSection),
  };
  const currentLocalCount = existsSync(migrationsDir)
    ? readdirSync(migrationsDir).filter((entry) => entry.endsWith(".sql")).length
    : 0;
  drift.currentLocal = currentLocalCount;
  drift.mcpHistory = readMcpMigrationHistoryReport(currentLocalCount);
  if (currentLocalCount !== drift.local) {
    add(
      "warnings",
      "stale-migration-drift-report",
      `Supabase migration drift report is stale: report local=${drift.local}, current local=${currentLocalCount}.`,
      { file: rel(file) },
    );
  }
  if (drift.mcpHistory && !drift.mcpHistory.valid) {
    add(
      "warnings",
      "stale-mcp-migration-history-report",
      "Supabase MCP migration-history verification is missing required current production details.",
      { file: drift.mcpHistory.file },
    );
  }
  if (drift.newDuplicateVersions > 0) {
    add("warnings", "duplicate-migration-versions", `Local Supabase migrations contain ${drift.newDuplicateVersions} new duplicate version(s).`, { file: rel(file) });
  }
  if (drift.remoteError && !drift.mcpHistory?.valid) {
    add(
      "warnings",
      "migration-history-unavailable",
      "Linked Supabase migration history could not be read. Run supabase login or configure authenticated MCP before production schema work.",
      { file: rel(file) },
    );
  } else if (drift.local > 0 && drift.remote > 0 && drift.matched === 0) {
    add(
      "warnings",
      "migration-history-disconnected",
      drift.nearOneMinute > 0
        ? `Local and remote Supabase migration histories have no exact matches, but ${drift.nearOneMinute} local migrations have a remote timestamp within one minute. Treat db push/pull as risky until version-id drift is reconciled.`
        : "Local and remote Supabase migration histories have no matching versions. Treat db push/pull as risky until reconciled.",
      { file: rel(file) },
    );
  }

  const pendingRiskFindings = [
    ["pending-local-table-without-rls", drift.pendingCreatesTablesWithoutRls, "likely pending local migration(s) create public tables without detected RLS."],
    ["pending-local-table-without-grant", drift.pendingCreatesTablesWithoutGrants, "likely pending local migration(s) create public tables without detected explicit grants."],
    ["pending-local-sequence-without-grant", drift.pendingSequenceBackedIdsWithoutSequenceGrants, "likely pending local migration(s) create sequence-backed ids without detected sequence grants."],
    ["pending-local-definer-without-search-path", drift.pendingSecurityDefinersWithoutSearchPath, "likely pending local migration(s) use SECURITY DEFINER without detected search_path."],
    ["pending-local-hardcoded-supabase-url", drift.pendingHardcodedSupabaseUrls, "likely pending local migration(s) contain hardcoded Supabase URLs."],
    ["pending-local-legacy-anon-jwt", drift.pendingLegacyAnonJwts, "likely pending local migration(s) contain legacy anon JWT literals."],
  ];

  for (const [id, count, message] of pendingRiskFindings) {
    if (count > 0) add("warnings", id, `${count} ${message}`, { file: rel(file) });
  }
  return drift;
}

function renderFindingList(items, emptyLabel, limit = 80) {
  if (!items.length) return `- ${emptyLabel}`;
  const visible = items.slice(0, limit).map((item) => {
    const location = item.file ? ` (${item.file}${item.line ? `:${item.line}` : ""})` : "";
    return `- [${item.id}] ${item.message}${location}`;
  });
  const hidden = items.length - visible.length;
  if (hidden > 0) visible.push(`- ...and ${hidden} more`);
  return visible.join("\n");
}

function renderReport(summary) {
  const drift = summary.migrationDrift;
  const nextMoves = [
    "- Reconcile Supabase migration history before running production schema pushes.",
    drift?.remoteError && !drift?.mcpHistory?.valid
      ? "- Configure `SUPABASE_ACCESS_TOKEN` or run `supabase login` so readiness checks can compare remote migration history. See `docs/supabase-migration-auth-setup.md`."
      : drift?.mcpHistory?.valid
        ? "- Supabase MCP migration history is verified for this run; keep `SUPABASE_ACCESS_TOKEN` available in CI so the CLI report can also compare remote history."
        : "- Keep `SUPABASE_ACCESS_TOKEN` available in production readiness jobs so remote migration history remains comparable.",
    "- Configure `app.settings.supabase_url` and `app.settings.supabase_anon_key` per Supabase project before relying on database cron jobs.",
    "- Run `npm run supabase:upgrade-readiness` before a Postgres major-version upgrade or production schema push.",
    "- Keep new high-risk Edge Functions on `withSecurity()` and strict CORS from the first commit.",
    "- Prefer wrapper-level `allowedMethods` on mutating Edge Functions so method rejection happens before handler logic reads request bodies.",
    "- Keep `docs/api-operations-runbook.md` current with owners for function 5xx, webhook failures, slow queries, and auth/payment spikes.",
  ];

  return [
    "# API Readiness Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `- Critical findings: ${findings.critical.length}`,
    `- Warnings: ${findings.warnings.length}`,
    `- Edge Functions inventoried: ${summary.functions.total}`,
    `- High-risk Edge Functions: ${summary.functions.highRisk}`,
    `- Functions using withSecurity(): ${summary.functions.withSecurity}`,
    `- Functions using strictCorsHeaders(): ${summary.functions.strictCors}`,
    `- Method-gated Edge Functions: ${summary.functions.methodGated}`,
    `- Functions using service role: ${summary.functions.serviceRole}`,
    `- Loose Edge Function security backlog: ${summary.functions.looseRouteBacklog.length}`,
    `- Method gate backlog: ${summary.functions.missingMethodGate.length}`,
    `- Required public env documented: ${requiredPublicEnv.join(", ")}`,
    `- Recommended backend env documented: ${recommendedBackendEnv.join(", ")}`,
    `- API operations runbook: ${summary.operations.present ? `present (${summary.operations.missingTopics.length} missing topics)` : "missing"}`,
    drift ? `- Supabase migration drift: reportLocal=${drift.local}, currentLocal=${drift.currentLocal}, remote=${drift.remote}, matched=${drift.matched}, duplicateVersions=${drift.duplicateVersions}, allowedDuplicateVersions=${drift.allowedDuplicateVersions}, newDuplicateVersions=${drift.newDuplicateVersions}, remoteError=${drift.remoteError ? "yes" : "no"}, mcpVerified=${drift.mcpHistory?.valid ? "yes" : "no"}` : "- Supabase migration drift: report missing",
    drift?.mcpHistory?.valid ? `- Supabase MCP migration history: remote=${drift.mcpHistory.remoteMigrations}, first=${drift.mcpHistory.firstRemoteVersion}, latest=${drift.mcpHistory.latestRemoteVersion}, verified=${drift.mcpHistory.verifiedVersions.join(", ")}` : "",
    drift ? `- Supabase migration near-match diagnostics: near5s=${drift.nearFiveSeconds}, near60s=${drift.nearOneMinute}, oneToOne5s=${drift.oneToOneNearFiveSeconds}, oneToOne60s=${drift.oneToOneNearOneMinute}, unmatchedLocal=${drift.unmatchedLocalAfterCandidates}, unmatchedRemote=${drift.unmatchedRemoteAfterCandidates}, localAfterRemoteRange=${drift.unmatchedLocalAfterRemoteRange}, sharedDays=${drift.sharedDays}` : "",
    drift ? `- Pending local migration risk gates: createsTables=${drift.pendingCreatesTables}, withoutRls=${drift.pendingCreatesTablesWithoutRls}, withoutGrants=${drift.pendingCreatesTablesWithoutGrants}, sequenceWithoutGrants=${drift.pendingSequenceBackedIdsWithoutSequenceGrants}, definerWithoutSearchPath=${drift.pendingSecurityDefinersWithoutSearchPath}, hardcodedUrls=${drift.pendingHardcodedSupabaseUrls}, legacyAnonJwts=${drift.pendingLegacyAnonJwts}` : "",
    "",
    "## Critical",
    "",
    renderFindingList(findings.critical, "No critical API readiness issues found."),
    "",
    "## Warnings",
    "",
    renderFindingList(findings.warnings, "No warnings found."),
    "",
    "## High-Risk Functions Missing withSecurity()",
    "",
    summary.functions.highRiskMissingSecurity.length
      ? summary.functions.highRiskMissingSecurity.slice(0, 120).map((file) => `- ${file}`).join("\n")
      : "- None",
    "",
    "## High-Risk Functions Missing allowedMethods",
    "",
    summary.functions.highRiskMissingMethodGate.length
      ? summary.functions.highRiskMissingMethodGate.slice(0, 120).map((file) => `- ${file}`).join("\n")
      : "- None",
    "",
    "## Loose Edge Function Security Backlog",
    "",
    summary.functions.looseRouteBacklog.length
      ? summary.functions.looseRouteBacklog.slice(0, 120).map((file) => `- ${file}`).join("\n")
      : "- None",
    "",
    "## Next Hardening Moves",
    "",
    ...nextMoves,
    "",
  ].join("\n");
}

const pkg = parsePackage();
checkRuntime(pkg);
checkEnvTemplate();
checkSupabaseClient();
checkFrontendSecrets();
checkActiveHardcodedSupabaseUrls();
checkSharedEdgeFiles();

if (!existsSync(path.join(root, "supabase", "config.toml"))) {
  add("critical", "missing-supabase-config", "supabase/config.toml is missing.");
}

const summary = {
  functions: inspectFunctions(),
  migrationDrift: readMigrationDrift(),
  operations: checkOperationsRunbook(),
};

if (writeReport) {
  mkdirSync(docsDir, { recursive: true });
  writeFileSync(reportPath, renderReport(summary), "utf8");
}

console.log(JSON.stringify({
  critical: findings.critical.length,
  warnings: findings.warnings.length,
  edgeFunctions: summary.functions,
  migrationDrift: summary.migrationDrift,
  operations: summary.operations,
  report: writeReport ? rel(reportPath) : undefined,
}, null, 2));

if (strict && findings.critical.length > 0) {
  process.exitCode = 1;
}
