#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(new URL("../..", import.meta.url).pathname);
const app = {
  name: "Zivosmedia",
  bundleId: "com.hizovo.app",
  teamId: "9KWY67J6LX",
};

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

function resolveInputPath(value) {
  if (!value) return "";
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return path.isAbsolute(value) ? value : path.join(root, value);
}

function parseEnv(text) {
  const values = new Map();
  for (const rawLine of String(text ?? "").split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    let value = rawValue.trim();
    const quote = value[0];
    if ((quote === `"` || quote === `'`) && value.endsWith(quote)) {
      value = value.slice(1, -1);
      if (quote === `"`) {
        value = value
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "\r")
          .replace(/\\t/g, "\t")
          .replace(/\\"/g, `"`)
          .replace(/\\\\/g, "\\");
      }
    } else {
      const commentStart = value.search(/\s+#/);
      if (commentStart >= 0) value = value.slice(0, commentStart).trim();
    }
    values.set(key, value);
  }
  return values;
}

function isPlaceholder(value) {
  return !value || /<[^>]+>|\b(owner|sample|example|todo|replace|changeme|your[-_]?)\b/i.test(value);
}

const checks = [];
const mark = (passed, label, detail = "") => checks.push({ passed, label, detail });
const envFile = resolveInputPath(argValue("--env-file", ".env.push.production.local"));

let env = new Map();
if (fs.existsSync(envFile)) {
  env = parseEnv(fs.readFileSync(envFile, "utf8"));
  mark(true, "Push secret env file present", path.relative(root, envFile) || envFile);
} else {
  mark(false, "Push secret env file present", path.relative(root, envFile) || envFile);
}

const value = (name) => env.get(name) || "";
const ready = (name) => Boolean(value(name)) && !isPlaceholder(value(name));

let fcmJson = null;
if (ready("FCM_SERVICE_ACCOUNT_JSON")) {
  try {
    fcmJson = JSON.parse(value("FCM_SERVICE_ACCOUNT_JSON"));
  } catch {
    // The specific value is secret; only report shape.
  }
}

mark(Boolean(fcmJson?.project_id), "FCM service account has project_id", "FCM_SERVICE_ACCOUNT_JSON");
mark(Boolean(fcmJson?.client_email), "FCM service account has client_email", "FCM_SERVICE_ACCOUNT_JSON");
mark(
  typeof fcmJson?.private_key === "string" && fcmJson.private_key.includes("BEGIN PRIVATE KEY"),
  "FCM service account has private_key",
  "FCM_SERVICE_ACCOUNT_JSON",
);
mark(/^[A-Z0-9]{10}$/.test(value("APNS_KEY_ID")), "APNs key id shape", "APNS_KEY_ID");
mark(value("APNS_TEAM_ID") === app.teamId, "APNs team id matches app", `APNS_TEAM_ID must be ${app.teamId}`);
mark(
  ready("APNS_PRIVATE_KEY") &&
    value("APNS_PRIVATE_KEY").includes("BEGIN PRIVATE KEY") &&
    value("APNS_PRIVATE_KEY").includes("END PRIVATE KEY"),
  "APNs private key shape",
  "APNS_PRIVATE_KEY",
);
mark(value("APNS_BUNDLE_ID") === app.bundleId, "APNs bundle id matches app", `APNS_BUNDLE_ID must be ${app.bundleId}`);
mark(value("APNS_ENV") === "production", "APNs environment is production", "APNS_ENV=production");
mark(ready("VAPID_PUBLIC_KEY") && value("VAPID_PUBLIC_KEY").length > 20, "VAPID public key present", "VAPID_PUBLIC_KEY");
mark(ready("VAPID_PRIVATE_KEY") && value("VAPID_PRIVATE_KEY").length > 20, "VAPID private key present", "VAPID_PRIVATE_KEY");
mark(
  Boolean(value("VAPID_SUBJECT")) &&
    !/<[^>]+>/.test(value("VAPID_SUBJECT")) &&
    /^(mailto:|https:\/\/)/.test(value("VAPID_SUBJECT")),
  "VAPID subject present",
  "VAPID_SUBJECT",
);

const viteVapid = process.env.VITE_VAPID_PUBLIC_KEY || value("VITE_VAPID_PUBLIC_KEY");
if (viteVapid) {
  mark(viteVapid === value("VAPID_PUBLIC_KEY"), "GitHub/browser VAPID public key matches Supabase", "VITE_VAPID_PUBLIC_KEY");
}

console.log(`${app.name} push secret preflight\n`);
for (const check of checks) {
  console.log(`${check.passed ? "✓" : "!"} ${check.label}${check.detail ? ` - ${check.detail}` : ""}`);
}

const failures = checks.filter((check) => !check.passed);
if (failures.length > 0) {
  console.log(`\n${failures.length} push secret blockers found. No secret values were printed.`);
  process.exitCode = 1;
} else {
  console.log("\nREADY: push secret shapes are valid. No secret values were printed.");
}
