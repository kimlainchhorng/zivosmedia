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

const reportPath =
  argValue("--report") ?? "docs/qa/edge-function-slot-readiness.json";
const liveSnapshotPath = argValue("--live-snapshot");
const knownLiveGapPath =
  argValue("--known-live-gap") ??
  "docs/qa/edge-function-live-gap-2026-06-03.json";
const slotLimit = Number.parseInt(
  process.env.SUPABASE_EDGE_FUNCTION_SLOT_LIMIT ?? "",
  10,
);
const conservativeSlotLimit =
  Number.isFinite(slotLimit) && slotLimit > 0 ? slotLimit : 25;

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
  {
    slug: "mint-sso-handoff",
    verifyJwt: true,
    why: "cross-domain SSO one-time token minting",
  },
  {
    slug: "supplier-proxy",
    verifyJwt: true,
    why: "authenticated, non-forwarding supplier compatibility tombstone",
  },
  {
    slug: "send-transactional-email",
    verifyJwt: false,
    why: "service-key-only email delivery with handler-owned authorization",
  },
  {
    slug: "software-subscription-intent",
    verifyJwt: false,
    why: "public checkout bootstrap with handler-owned authorization",
  },
];

function read(relativePath) {
  const file = path.isAbsolute(relativePath)
    ? relativePath
    : path.join(root, relativePath);
  return existsSync(file) ? readFileSync(file, "utf8") : "";
}

function configuredFunctions() {
  const config = read("supabase/config.toml");
  const matches = config.matchAll(/^\s*\[functions\.([^\]]+)\]/gm);
  return [...matches]
    .map((match) => match[1])
    .sort((a, b) => a.localeCompare(b));
}

function configuredFunctionPolicies() {
  const policies = new Map();
  let currentSlug = null;

  for (const line of read("supabase/config.toml").split(/\r?\n/)) {
    const section = line.match(/^\s*\[functions\.([^\]]+)\]\s*$/);
    if (section) {
      currentSlug = section[1];
      continue;
    }
    if (/^\s*\[/.test(line)) currentSlug = null;
    const policy =
      currentSlug && line.match(/^\s*verify_jwt\s*=\s*(true|false)\s*$/);
    if (policy) policies.set(currentSlug, policy[1] === "true");
  }

  return policies;
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
    throw new Error(
      "Live snapshot must be an array or an object with a functions array.",
    );
  }
  return functions
    .map((fn) => ({
      slug: String(fn.slug ?? fn.name ?? ""),
      status: String(fn.status ?? "UNKNOWN"),
      verify_jwt: typeof fn.verify_jwt === "boolean" ? fn.verify_jwt : null,
      updated_at: fn.updated_at ?? null,
    }))
    .filter((fn) => fn.slug);
}

function loadKnownLiveGap() {
  if (args.has("--ignore-known-live-gap")) return null;
  const raw = read(knownLiveGapPath);
  if (!raw.trim()) return null;

  const parsed = JSON.parse(raw);
  const critical = Array.isArray(parsed.criticalFunctions)
    ? parsed.criticalFunctions
    : [];
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
const configuredPolicies = configuredFunctionPolicies();
const local = localFunctions();
const live = loadLiveSnapshot();
const knownLiveGap = live ? null : loadKnownLiveGap();
const liveSlugs = new Set((live ?? []).map((fn) => fn.slug));
const liveBySlug = new Map((live ?? []).map((fn) => [fn.slug, fn]));
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
  const configVerifyJwt = configuredPolicies.get(fn.slug) ?? null;
  const localPresent = local.includes(fn.slug);
  const livePresent = live
    ? liveSlugs.has(fn.slug)
    : knownMissingLiveSlugs.has(fn.slug)
      ? false
      : null;
  const liveVerifyJwt = livePresent
    ? (liveBySlug.get(fn.slug)?.verify_jwt ?? null)
    : null;
  const deployEnvDefault = fn.browserFeatureFlag
    ? envFlagDefault(".env.deploy.example", fn.browserFeatureFlag)
    : null;
  const localEnvDefault = fn.browserFeatureFlag
    ? envFlagDefault(".env.example", fn.browserFeatureFlag)
    : null;

  if (!configPresent)
    failures.push(`${fn.slug}: missing supabase/config.toml function entry`);
  if (configPresent && configVerifyJwt === null) {
    failures.push(
      `${fn.slug}: source verify_jwt policy is missing from supabase/config.toml`,
    );
  } else if (configVerifyJwt !== null && configVerifyJwt !== fn.verifyJwt) {
    failures.push(
      `${fn.slug}: source verify_jwt=${configVerifyJwt} does not match release expectation ${fn.verifyJwt}`,
    );
  }
  if (!localPresent)
    failures.push(
      `${fn.slug}: missing local supabase/functions/${fn.slug}/index.ts`,
    );
  if (livePresent && liveVerifyJwt === null) {
    failures.push(
      `${fn.slug}: live snapshot is missing verify_jwt policy data`,
    );
  } else if (liveVerifyJwt !== null && liveVerifyJwt !== fn.verifyJwt) {
    failures.push(
      `${fn.slug}: live verify_jwt=${liveVerifyJwt} does not match source expectation ${fn.verifyJwt}`,
    );
  }
  if (
    fn.browserFeatureFlag &&
    livePresent === false &&
    deployEnvDefault === "true"
  ) {
    failures.push(
      `${fn.slug}: ${fn.browserFeatureFlag}=true but live function snapshot does not include the function`,
    );
  }
  if (fn.browserFeatureFlag && deployEnvDefault !== "false") {
    warnings.push(
      `${fn.slug}: .env.deploy.example should default ${fn.browserFeatureFlag}=false until deployed`,
    );
  }
  if (fn.browserFeatureFlag && localEnvDefault !== "false") {
    warnings.push(
      `${fn.slug}: .env.example should default ${fn.browserFeatureFlag}=false until deployed`,
    );
  }

  return {
    slug: fn.slug,
    why: fn.why,
    verifyJwt: fn.verifyJwt,
    configPresent,
    configVerifyJwt,
    localPresent,
    livePresent,
    liveVerifyJwt,
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
  mode: live
    ? "local-plus-live-snapshot"
    : knownLiveGap
      ? "local-plus-known-live-gap"
      : "local-only",
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
    source:
      "Supabase hosted limits are plan-dependent; set SUPABASE_EDGE_FUNCTION_SLOT_LIMIT for the project plan.",
    deployBlocker:
      "Do not enable browser calls for a missing live function; resolve plan/spend-cap/function-slot capacity first.",
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
