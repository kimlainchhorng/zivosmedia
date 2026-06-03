#!/usr/bin/env node
/**
 * Edge Function slot readiness report.
 *
 * This is intentionally read-only. It compares local critical functions,
 * deployment config, env defaults, and an optional live function snapshot so a
 * release can see when browser-invoked functions are queued but not deployed.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const argValue = (name) => {
  const prefix = `${name}=`;
  const hit = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
};

const reportPath = argValue("--report") ?? "docs/qa/edge-function-slot-readiness.json";
const liveSnapshotPath = argValue("--live-snapshot");
const knownLiveGapPath = argValue("--known-live-gap") ?? "docs/qa/edge-function-live-gap-2026-06-03.json";
const slotLimit = Number.parseInt(process.env.SUPABASE_EDGE_FUNCTION_SLOT_LIMIT ?? "", 10);
const conservativeSlotLimit = Number.isFinite(slotLimit) && slotLimit > 0 ? slotLimit : 25;

const criticalFunctions = [
  {
    slug: "analytics-event-track",
    verifyJwt: false,
    browserFeatureFlag: "VITE_ANALYTICS_EVENT_TRACK_ENABLED",
    why: "browser analytics telemetry",
  },
  {
    slug: "notification-manage",
    verifyJwt: true,
    browserFeatureFlag: "VITE_NOTIFICATION_MANAGE_ENABLED",
    why: "notification read/delete/snooze mutations",
  },
  {
    slug: "social-notification-manage",
    verifyJwt: true,
    browserFeatureFlag: "VITE_SOCIAL_NOTIFICATION_MANAGE_ENABLED",
    why: "social notification mutations",
  },
  {
    slug: "push-device-manage",
    verifyJwt: true,
    browserFeatureFlag: "VITE_PUSH_DEVICE_MANAGE_ENABLED",
    why: "push device revocation",
  },
  {
    slug: "talent-invite-notification",
    verifyJwt: true,
    browserFeatureFlag: "VITE_TALENT_INVITE_NOTIFICATION_ENABLED",
    why: "talent invite notification creation",
  },
  {
    slug: "admin-broadcast-notification",
    verifyJwt: true,
    browserFeatureFlag: "VITE_ADMIN_BROADCAST_NOTIFICATION_ENABLED",
    why: "admin broadcast notification creation",
  },
];

function read(relativePath) {
  const file = path.join(root, relativePath);
  return existsSync(file) ? readFileSync(file, "utf8") : "";
}

function configuredFunctions() {
  const config = read("supabase/config.toml");
  const matches = config.matchAll(/^\s*\[functions\.([^\]]+)\]/gm);
  return [...matches].map((match) => match[1]).sort((a, b) => a.localeCompare(b));
}

function localFunctions() {
  const functionsDir = path.join(root, "supabase/functions");
  if (!existsSync(functionsDir)) return [];
  return [...new Set(configuredFunctions())].filter((slug) =>
    existsSync(path.join(functionsDir, slug, "index.ts")),
  );
}

function envFlagDefault(file, flag) {
  const text = read(file);
  const match = text.match(new RegExp(`^${flag}=([^\\r\\n#]+)`, "m"));
  return match ? match[1].trim() : null;
}

function loadLiveSnapshot() {
  const raw =
    (liveSnapshotPath && read(liveSnapshotPath)) ||
    process.env.ZIVO_EDGE_FUNCTIONS_LIVE_SNAPSHOT ||
    "";
  if (!raw.trim()) return null;

  const parsed = JSON.parse(raw);
  const functions = Array.isArray(parsed) ? parsed : parsed.functions;
  if (!Array.isArray(functions)) {
    throw new Error("Live snapshot must be an array or an object with a functions array.");
  }
  return functions.map((fn) => ({
    slug: String(fn.slug ?? fn.name ?? ""),
    status: String(fn.status ?? "UNKNOWN"),
    verify_jwt: Boolean(fn.verify_jwt),
    updated_at: fn.updated_at ?? null,
  })).filter((fn) => fn.slug);
}

function loadKnownLiveGap() {
  if (args.has("--ignore-known-live-gap")) return null;
  const raw = read(knownLiveGapPath);
  if (!raw.trim()) return null;

  const parsed = JSON.parse(raw);
  const critical = Array.isArray(parsed.criticalFunctions) ? parsed.criticalFunctions : [];
  const missing = critical
    .filter((fn) => fn.liveStatus === "not_found")
    .map((fn) => String(fn.slug ?? ""))
    .filter(Boolean);

  return {
    path: knownLiveGapPath,
    generated: parsed.generated ?? null,
    projectId: parsed.projectId ?? null,
    missing,
  };
}

const configured = configuredFunctions();
const local = localFunctions();
const live = loadLiveSnapshot();
const knownLiveGap = live ? null : loadKnownLiveGap();
const liveSlugs = new Set((live ?? []).map((fn) => fn.slug));
const knownMissingLiveSlugs = new Set(knownLiveGap?.missing ?? []);
const failures = [];
const warnings = [];

if (!live && !knownLiveGap) {
  warnings.push(
    "live Edge Function snapshot not provided; pass --live-snapshot=... or ZIVO_EDGE_FUNCTIONS_LIVE_SNAPSHOT for deployment-gap checks",
  );
} else if (knownLiveGap) {
  warnings.push(
    `using known live-gap artifact ${knownLiveGap.path}; replace with --live-snapshot after the next Supabase deploy`,
  );
}

const readiness = criticalFunctions.map((fn) => {
  const configPresent = configured.includes(fn.slug);
  const localPresent = local.includes(fn.slug);
  const livePresent = live ? liveSlugs.has(fn.slug) : knownMissingLiveSlugs.has(fn.slug) ? false : null;
  const deployEnvDefault = fn.browserFeatureFlag
    ? envFlagDefault(".env.deploy.example", fn.browserFeatureFlag)
    : null;
  const localEnvDefault = fn.browserFeatureFlag
    ? envFlagDefault(".env.example", fn.browserFeatureFlag)
    : null;

  if (!configPresent) failures.push(`${fn.slug}: missing supabase/config.toml function entry`);
  if (!localPresent) failures.push(`${fn.slug}: missing local supabase/functions/${fn.slug}/index.ts`);
  if (fn.browserFeatureFlag && livePresent === false && deployEnvDefault === "true") {
    failures.push(`${fn.slug}: ${fn.browserFeatureFlag}=true but live function snapshot does not include the function`);
  }
  if (fn.browserFeatureFlag && deployEnvDefault !== "false") {
    warnings.push(`${fn.slug}: .env.deploy.example should default ${fn.browserFeatureFlag}=false until deployed`);
  }
  if (fn.browserFeatureFlag && localEnvDefault !== "false") {
    warnings.push(`${fn.slug}: .env.example should default ${fn.browserFeatureFlag}=false until deployed`);
  }

  return {
    slug: fn.slug,
    why: fn.why,
    verifyJwt: fn.verifyJwt,
    configPresent,
    localPresent,
    livePresent,
    browserFeatureFlag: fn.browserFeatureFlag ?? null,
    envDefaults: fn.browserFeatureFlag
      ? {
          ".env.example": localEnvDefault,
          ".env.deploy.example": deployEnvDefault,
        }
      : null,
  };
});

if (live && live.length >= conservativeSlotLimit) {
  warnings.push(
    `live snapshot has ${live.length} functions, at or above conservative slot limit ${conservativeSlotLimit}`,
  );
}

const missingLiveCritical = readiness
  .filter((item) => item.livePresent === false)
  .map((item) => item.slug);

const report = {
  generated: new Date().toISOString(),
  mode: live ? "local-plus-live-snapshot" : knownLiveGap ? "local-plus-known-live-gap" : "local-only",
  counts: {
    configuredFunctions: configured.length,
    localConfiguredFunctions: local.length,
    liveFunctions: live?.length ?? null,
    knownMissingLiveFunctions: knownLiveGap?.missing.length ?? 0,
    criticalFunctions: criticalFunctions.length,
    missingLiveCritical: missingLiveCritical.length,
    warnings: warnings.length,
    failures: failures.length,
  },
  slotPolicy: {
    conservativeSlotLimit,
    source: "Supabase hosted limits are plan-dependent; set SUPABASE_EDGE_FUNCTION_SLOT_LIMIT for the project plan.",
    deployBlocker: "Do not enable browser calls for a missing live function; resolve plan/spend-cap/function-slot capacity first.",
  },
  knownLiveGap,
  readiness,
  missingLiveCritical,
  warnings,
  failures,
};

if (args.has("--write-report")) {
  const absoluteReportPath = path.join(root, reportPath);
  mkdirSync(path.dirname(absoluteReportPath), { recursive: true });
  writeFileSync(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`);
}

console.log(JSON.stringify(report, null, 2));

if (failures.length) process.exit(1);
