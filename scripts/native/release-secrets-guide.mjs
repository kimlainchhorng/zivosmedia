#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(new URL("../..", import.meta.url).pathname);
const app = {
  name: "Zivosmedia",
  bundleId: "com.hizovo.app",
  teamId: "9KWY67J6LX",
};

const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const placeholderPattern = /<[^>]+>|\b(owner-controlled|todo|replace|changeme)\b/i;

function parseProperties(text) {
  const values = new Map();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    values.set(trimmed.slice(0, index).trim(), trimmed.slice(index + 1).trim());
  }
  return values;
}

function commandExists(command) {
  try {
    execFileSync("command", ["-v", command], { stdio: "ignore", shell: true });
    return true;
  } catch {
    return false;
  }
}

function resolveInputPath(value) {
  if (!value) return "";
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return path.isAbsolute(value) ? value : path.join(root, value);
}

const checks = [];
const mark = (passed, label, detail = "") => checks.push({ passed, label, detail });
const hasSupabaseCli = commandExists("supabase");
const hasNpx = commandExists("npx");

mark(exists("android/app/release.keystore"), "Android upload keystore file", "android/app/release.keystore");
mark(exists("android/keystore.properties"), "Android keystore properties", "android/keystore.properties");
mark(exists("android/app/google-services.json"), "Android Firebase config", "android/app/google-services.json");

if (exists("android/keystore.properties")) {
  const properties = parseProperties(read("android/keystore.properties"));
  for (const key of ["storePassword", "keyAlias", "keyPassword"]) {
    const value = properties.get(key) || "";
    mark(Boolean(value) && !placeholderPattern.test(value), `Android ${key} ready`, "value present and not a placeholder");
  }
}

const iosP12Path = resolveInputPath(process.env.IOS_P12_PATH || "");
const iosProfilePath = resolveInputPath(process.env.IOS_PROVISIONING_PROFILE_PATH || "");
mark(Boolean(iosP12Path && fs.existsSync(iosP12Path)), "iOS Distribution .p12 path", "set IOS_P12_PATH=/path/to/cert.p12");
mark(Boolean(iosProfilePath && fs.existsSync(iosProfilePath)), "iOS App Store profile path", "set IOS_PROVISIONING_PROFILE_PATH=/path/to/profile.mobileprovision");
mark(commandExists("gh"), "GitHub CLI available", "gh");
mark(hasSupabaseCli || hasNpx, "Supabase CLI or npx available", hasSupabaseCli ? "supabase" : "npx supabase");

console.log(`${app.name} release secret setup guide\n`);
for (const check of checks) {
  console.log(`${check.passed ? "✓" : "!"} ${check.label}${check.detail ? ` - ${check.detail}` : ""}`);
}

console.log(`
Safe GitHub secret commands

Run these from the repo root after the real owner files exist. They pipe private
file contents into GitHub and do not print secret values.

Android:
  node -e 'process.stdout.write(require("fs").readFileSync("android/app/release.keystore").toString("base64"))' | gh secret set ANDROID_KEYSTORE_BASE64
  gh secret set ANDROID_KEYSTORE_PASSWORD
  gh secret set ANDROID_KEY_ALIAS
  gh secret set ANDROID_KEY_PASSWORD
  node -e 'process.stdout.write(require("fs").readFileSync("android/app/google-services.json").toString("base64"))' | gh secret set GOOGLE_SERVICES_JSON_BASE64
  gh secret set VITE_VAPID_PUBLIC_KEY

iOS:
  export IOS_P12_PATH="/absolute/path/to/apple-distribution.p12"
  export IOS_PROVISIONING_PROFILE_PATH="/absolute/path/to/${app.bundleId}.mobileprovision"
  node -e 'process.stdout.write(require("fs").readFileSync(process.env.IOS_P12_PATH).toString("base64"))' | gh secret set IOS_P12_BASE64
  gh secret set IOS_P12_PASSWORD
  node -e 'process.stdout.write(require("fs").readFileSync(process.env.IOS_PROVISIONING_PROFILE_PATH).toString("base64"))' | gh secret set IOS_PROVISIONING_PROFILE_B64
  printf '${app.teamId}' | gh secret set IOS_TEAM_ID

Supabase Edge push delivery secrets:
  # Create this local file. It is ignored by Git because .env.* is ignored.
  $EDITOR .env.push.production.local

  # Required keys inside .env.push.production.local:
  FCM_SERVICE_ACCOUNT_JSON=<full Firebase service-account JSON from the same Firebase project as android/app/google-services.json>
  APNS_KEY_ID=<Apple push key id>
  APNS_TEAM_ID=${app.teamId}
  APNS_PRIVATE_KEY=<full Apple .p8 private key, with newlines escaped as \\n if kept on one line>
  APNS_BUNDLE_ID=${app.bundleId}
  APNS_ENV=production
  VAPID_PUBLIC_KEY=<same value used for VITE_VAPID_PUBLIC_KEY>
  VAPID_PRIVATE_KEY=<web-push private key>
  VAPID_SUBJECT=mailto:<owner-email>

  npm run native:push-secrets:preflight
  supabase secrets set --env-file .env.push.production.local
  # If supabase is not installed globally:
  npx supabase secrets set --env-file .env.push.production.local

After secrets are set:
  npm run native:store-signing:preflight
`);
