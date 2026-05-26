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

const frontendSecretPatterns = [
  { id: "frontend-service-role", label: "Supabase service role reference", re: /SUPABASE_SERVICE_ROLE_KEY|service_role/i },
  { id: "frontend-stripe-secret", label: "Stripe secret key reference", re: /STRIPE_SECRET_KEY|sk_live_[0-9A-Za-z]{20,}/ },
  { id: "frontend-twilio-secret", label: "Twilio auth token reference", re: /TWILIO_AUTH_TOKEN/i },
  { id: "frontend-private-key", label: "Private key block", re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/ },
];

const highRiskFunctionName = /(admin|auth|otp|token|session|wallet|payment|checkout|capture|webhook|payout|refund|cancel|delete|moderate|verify|transfer|coin|stripe|paypal|square|aba|bakong)/i;
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
  const files = walkFiles(srcDir, (file, stats) => stats.size < 2_000_000 && sourceExtensions.has(path.extname(file).toLowerCase()));
  for (const file of files) {
    const text = readText(file);
    for (const pattern of frontendSecretPatterns) {
      const match = text.match(pattern.re);
      if (!match) continue;
      if (pattern.id === "frontend-service-role" && rel(file).endsWith("types.ts")) continue;
      const line = text.slice(0, match.index).split("\n").length;
      add("critical", pattern.id, `${pattern.label} found in frontend source.`, { file: rel(file), line });
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

function inspectFunctions() {
  const functionsDir = path.join(root, "supabase", "functions");
  if (!existsSync(functionsDir)) {
    add("critical", "missing-functions-dir", "supabase/functions is missing.");
    return { total: 0, highRisk: 0, withSecurity: 0, strictCors: 0, serviceRole: 0, highRiskMissingSecurity: [] };
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
      wildcardCors: /corsHeaders|Access-Control-Allow-Origin["']?\s*:\s*["']\*/.test(text),
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
  return {
    total: rows.length,
    highRisk: rows.filter((row) => row.highRisk).length,
    withSecurity: rows.filter((row) => row.withSecurity).length,
    strictCors: rows.filter((row) => row.strictCors).length,
    serviceRole: rows.filter((row) => row.serviceRole).length,
    highRiskMissingSecurity,
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
    remoteError: remoteSection.startsWith("- Error:"),
  };
  const currentLocalCount = existsSync(migrationsDir)
    ? readdirSync(migrationsDir).filter((entry) => entry.endsWith(".sql")).length
    : 0;
  drift.currentLocal = currentLocalCount;
  if (currentLocalCount !== drift.local) {
    add(
      "warnings",
      "stale-migration-drift-report",
      `Supabase migration drift report is stale: report local=${drift.local}, current local=${currentLocalCount}.`,
      { file: rel(file) },
    );
  }
  if (drift.newDuplicateVersions > 0) {
    add("warnings", "duplicate-migration-versions", `Local Supabase migrations contain ${drift.newDuplicateVersions} new duplicate version(s).`, { file: rel(file) });
  }
  if (drift.remoteError) {
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
      "Local and remote Supabase migration histories have no matching versions. Treat db push/pull as risky until reconciled.",
      { file: rel(file) },
    );
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
    `- Functions using service role: ${summary.functions.serviceRole}`,
    drift ? `- Supabase migration drift: reportLocal=${drift.local}, currentLocal=${drift.currentLocal}, remote=${drift.remote}, matched=${drift.matched}, duplicateVersions=${drift.duplicateVersions}, allowedDuplicateVersions=${drift.allowedDuplicateVersions}, newDuplicateVersions=${drift.newDuplicateVersions}, remoteError=${drift.remoteError ? "yes" : "no"}` : "- Supabase migration drift: report missing",
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
    "## Next Hardening Moves",
    "",
    "- Reconcile Supabase migration history before running production schema pushes.",
    "- Run npm run supabase:upgrade-readiness before a Postgres major-version upgrade.",
    "- Move browser Supabase URL/key to Vite env variables for staging and production separation.",
    "- Add withSecurity() to high-risk Edge Functions first, starting with payment, webhook, admin, auth, and wallet routes.",
    "- Replace wildcard CORS on authenticated/service-role functions with strictCorsHeaders().",
    "",
  ].join("\n");
}

const pkg = parsePackage();
checkRuntime(pkg);
checkEnvTemplate();
checkSupabaseClient();
checkFrontendSecrets();
checkSharedEdgeFiles();

if (!existsSync(path.join(root, "supabase", "config.toml"))) {
  add("critical", "missing-supabase-config", "supabase/config.toml is missing.");
}

const summary = {
  functions: inspectFunctions(),
  migrationDrift: readMigrationDrift(),
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
  report: writeReport ? rel(reportPath) : undefined,
}, null, 2));

if (strict && findings.critical.length > 0) {
  process.exitCode = 1;
}
