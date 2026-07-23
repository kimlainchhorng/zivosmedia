#!/usr/bin/env node
/**
 * Zivo Travel backend readiness audit
 *
 * Non-destructive local scanner for the zivostravel.com backend cutover.
 * It does not connect to Supabase and never reads or prints secret values.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const writeReport = args.has("--write-report");
const strict = args.has("--strict");
const docsDir = path.join(root, "docs");
const functionsDir = path.join(root, "supabase", "functions");
const migrationsDir = path.join(root, "supabase", "migrations");
const reportJsonPath = path.join(docsDir, "zivo-travel-readiness-report.json");
const reportMdPath = path.join(docsDir, "zivo-travel-readiness-report.md");
const inventoryPath = path.join(docsDir, "zivo-travel-supabase-inventory.md");
const travelSupabaseProjectRef = "xbllvmpomorawkcrtbcq";
const expectedTravelSupabaseUrl = `https://${travelSupabaseProjectRef}.supabase.co`;

const requiredEdgeFunctions = {
  flights: [
    "duffel-flights",
    "duffel-fare-calendar",
    "duffel-destination-prices",
    "duffel-hot-deals",
    "create-flight-checkout",
    "create-flight-payment-intent",
    "confirm-flight-payment",
    "process-flight-refund",
  ],
  hotels: [
    "hotelbeds-hotels",
    "ratehawk-hotels",
    "create-lodging-deposit",
    "create-lodging-paypal-order",
    "capture-lodging-paypal-order",
    "create-lodging-square-checkout",
    "stripe-lodging-webhook",
    "square-lodging-webhook",
    "paypal-lodging-webhook",
  ],
  cars: [
    "create-car-rental-deposit",
    "capture-car-rental-balance",
    "refund-car-rental-deposit",
    "stripe-car-rental-webhook",
  ],
  bus: [
    "create-bus-payment-intent",
    "capture-bus-payment",
  ],
  payouts: [
    "connect-onboard",
    "connect-status",
    "connect-account-session",
    "connect-instant-payout",
    "process-withdrawal",
    "customer-payout-method-record",
    "merchant-payout-request",
    "paypal-payout",
    "square-payout",
  ],
};

const tableSignals = {
  flights: [/\bflight_/i, /\bflights\b/i, /\bflights_/i],
  hotels: [/\blodge_/i, /\blodging_/i],
  cars: [/\bcar_rental_/i, /\bcar_rentals\b/i],
  bus: [/\bbus_/i],
  payouts: [/\b\w*wallet\w*\b/i, /\b\w*payout\w*\b/i, /\b\w*payment\w*\b/i],
};

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

function envVarValue(name, fileText) {
  const match = fileText.match(new RegExp(`^${name}=([^\\n#]*)`, "m"));
  return match?.[1]?.trim() ?? null;
}

function hasEnvFlagEnabled(file) {
  const text = readText(path.join(root, file));
  const value = envVarValue("VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND", text);
  return value === "true";
}

function listFunctionDirs() {
  if (!existsSync(functionsDir)) return new Set();
  return new Set(readdirSync(functionsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name));
}

function scanMigrations() {
  const groups = Object.fromEntries(Object.keys(tableSignals).map((key) => [key, []]));
  if (!existsSync(migrationsDir)) return groups;
  for (const name of readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort()) {
    const file = path.join(migrationsDir, name);
    const sql = readText(file).toLowerCase();
    for (const [group, signals] of Object.entries(tableSignals)) {
      if (signals.some((signal) => signal.test(sql))) {
        groups[group].push(rel(file));
      }
    }
  }
  return groups;
}

function renderMarkdown(report) {
  const lines = [
    "# Zivo Travel readiness report",
    "",
    `Generated: ${report.generated}`,
    "",
    "## Summary",
    "",
    `- Status: ${report.status}`,
    `- Blockers: ${report.blockers.length}`,
    `- Warnings: ${report.warnings.length}`,
    `- Manual target-project checks required: ${report.manualChecks.length}`,
    "",
    "## Backend flag",
    "",
    `- Dedicated backend flag in source config: ${report.backendFlag.sourceConfig}`,
    `- Dedicated backend enabled in .env.local: ${report.backendFlag.envLocalEnabled}`,
    "",
    "## Required Edge Function source folders",
    "",
  ];

  for (const group of report.edgeFunctions.groups) {
    lines.push(`### ${group.label}`);
    lines.push("");
    lines.push(`- Present: ${group.present.length}/${group.required.length}`);
    if (group.missing.length) lines.push(`- Missing: ${group.missing.join(", ")}`);
    lines.push("");
  }

  lines.push("## Local migration signal files");
  lines.push("");
  for (const group of report.migrations.groups) {
    lines.push(`- ${group.label}: ${group.files.length} local migration files mention matching table names.`);
  }

  if (report.blockers.length) {
    lines.push("");
    lines.push("## Blockers");
    lines.push("");
    for (const blocker of report.blockers) lines.push(`- ${blocker}`);
  }

  if (report.warnings.length) {
    lines.push("");
    lines.push("## Warnings");
    lines.push("");
    for (const warning of report.warnings) lines.push(`- ${warning}`);
  }

  lines.push("");
  lines.push("## Manual target-project checks");
  lines.push("");
  for (const check of report.manualChecks) lines.push(`- ${check}`);

  lines.push("");
  lines.push("## Next safe step");
  lines.push("");
  lines.push("Keep `VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND=false` until the manual target-project checks are complete. Local source folders and migration signal files are necessary, but they do not prove the dedicated travel Supabase project is ready for customer traffic.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

const envExample = readText(path.join(root, ".env.example"));
const envDeployExample = readText(path.join(root, ".env.deploy.example"));
const configText = readText(path.join(root, "src", "config", "zivoTravelDomain.ts"));
const functionDirs = listFunctionDirs();
const migrationSignals = scanMigrations();
const blockers = [];
const warnings = [];
const manualChecks = [
  "Target travel Supabase project has the travel engine schema, indexes, triggers, functions, and RLS policies applied.",
  "Target travel Supabase project exposes intended public tables/functions through explicit grants for anon/authenticated roles, with RLS enabled.",
  "Required Edge Functions are deployed to the target travel Supabase project, not just present in the repo.",
  "Provider API secrets and payment webhook secrets are configured in the target travel Supabase project.",
  "Storage buckets and bucket policies needed by travel workflows are created in the target travel Supabase project.",
  "Supabase Auth redirect allowlists include zivostravel.com, www.zivostravel.com, and auth handoff URLs.",
  "Sandbox payment, payout, flight, hotel, car, and bus smoke tests pass before live keys or the dedicated backend flag are enabled.",
];

for (const file of [".env.example", ".env.deploy.example"]) {
  const text = readText(path.join(root, file));
  if (envVarValue("VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND", text) !== "false") {
    blockers.push(`${file} must keep VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND=false before cutover.`);
  }
}

if (!envExample.includes(`VITE_ZIVO_TRAVEL_SUPABASE_URL=${expectedTravelSupabaseUrl}`)) {
  blockers.push(".env.example must document the travel Supabase URL.");
}
if (!envDeployExample.includes(`VITE_ZIVO_TRAVEL_SUPABASE_URL=${expectedTravelSupabaseUrl}`)) {
  blockers.push(".env.deploy.example must document the travel Supabase URL.");
}
if (!configText.includes("VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND")) {
  blockers.push("src/config/zivoTravelDomain.ts must expose VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND.");
}
if (!existsSync(inventoryPath)) {
  warnings.push("docs/zivo-travel-supabase-inventory.md is missing. Run the live source/target Supabase inventory before cutover planning.");
}
if (hasEnvFlagEnabled(".env.local")) {
  blockers.push(".env.local currently enables VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND=true. Disable before local payment testing unless the travel backend is migrated.");
}

const edgeFunctionGroups = Object.entries(requiredEdgeFunctions).map(([key, required]) => {
  const present = required.filter((slug) => functionDirs.has(slug));
  const missing = required.filter((slug) => !functionDirs.has(slug));
  if (missing.length) warnings.push(`${key} is missing local Edge Function folders: ${missing.join(", ")}`);
  return {
    key,
    label: key,
    required,
    present,
    missing,
  };
});

const migrationGroups = Object.entries(migrationSignals).map(([key, files]) => {
  if (!files.length) warnings.push(`${key} has no local migration files matching the expected travel table signals.`);
  return {
    key,
    label: key,
    files,
  };
});

const report = {
  generated: new Date().toISOString(),
  status: blockers.length ? "blocked" : "hold_for_target_project_verification",
  backendFlag: {
    sourceConfig: configText.includes("VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND") ? "present" : "missing",
    envLocalEnabled: hasEnvFlagEnabled(".env.local"),
  },
  inventory: {
    file: rel(inventoryPath),
    present: existsSync(inventoryPath),
  },
  edgeFunctions: {
    totalRequired: Object.values(requiredEdgeFunctions).flat().length,
    totalPresent: edgeFunctionGroups.reduce((total, group) => total + group.present.length, 0),
    groups: edgeFunctionGroups,
  },
  migrations: {
    groups: migrationGroups,
  },
  blockers,
  warnings,
  manualChecks,
};

if (writeReport) {
  mkdirSync(docsDir, { recursive: true });
  writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(reportMdPath, renderMarkdown(report));
}

console.log(`zivo-travel-readiness: ${report.status}`);
console.log(`- Edge Function source folders: ${report.edgeFunctions.totalPresent}/${report.edgeFunctions.totalRequired}`);
console.log(`- Blockers: ${report.blockers.length}`);
console.log(`- Warnings: ${report.warnings.length}`);
console.log(`- Manual target-project checks: ${report.manualChecks.length}`);
if (writeReport) {
  console.log(`- Wrote ${rel(reportJsonPath)}`);
  console.log(`- Wrote ${rel(reportMdPath)}`);
}

if (strict && blockers.length) {
  process.exit(1);
}
