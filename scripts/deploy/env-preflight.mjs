#!/usr/bin/env node
/**
 * Validates deploy-time Supabase environment wiring without printing secrets.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { config as loadDotenv } from "dotenv";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const strict = args.has("--strict");
const requireSoftwareDomain = strict || args.has("--require-software-domain");
const ZIVO_SOFTWARE_PROJECT_REF = "ydxztoresbdeoeijhxww";
const ZIVO_SOFTWARE_PROJECT_URL = `https://${ZIVO_SOFTWARE_PROJECT_REF}.supabase.co`;

for (const file of [".env", ".env.local", ".env.deploy"]) {
  const envPath = path.join(root, file);
  if (existsSync(envPath)) loadDotenv({ path: envPath, override: false, quiet: true });
}

const findings = [];

function add(severity, id, message) {
  findings.push({ severity, id, message });
}

function readEnv(name) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function safeHostname(value) {
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
}

function isServiceRoleJwt(value) {
  const [, payload] = value.split(".");
  if (!payload) return false;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(Buffer.from(normalized, "base64").toString("utf8"));
    return json?.role === "service_role";
  } catch {
    return false;
  }
}

function jwtRole(value) {
  const [, payload] = value.split(".");
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(Buffer.from(normalized, "base64").toString("utf8"));
    return typeof json?.role === "string" ? json.role : null;
  } catch {
    return null;
  }
}

function isSupabaseSecret(value) {
  return value.startsWith("sb_secret_") || isServiceRoleJwt(value);
}

function isSupabaseManagementToken(value) {
  return value.startsWith("sbp_");
}

function validatePublishableKey(name, options = {}) {
  const value = readEnv(name);
  if (!value) {
    if (options.required) add("critical", `${name}-missing`, `Missing ${name}.`);
    return "";
  }

  if (isSupabaseSecret(value)) {
    add("critical", `${name}-secret`, `${name} contains a secret/service-role key.`);
  } else if (isSupabaseManagementToken(value)) {
    add("critical", `${name}-management-token`, `${name} contains a Supabase management access token.`);
  } else if (!value.startsWith("sb_publishable_") && !value.startsWith("eyJ")) {
    add("warning", `${name}-format`, `${name} should be an sb_publishable key or legacy anon JWT.`);
  } else if (value.startsWith("eyJ")) {
    add("warning", `${name}-legacy`, `${name} is a legacy JWT anon key; prefer sb_publishable.`);
  }

  return value;
}

function validateSupabaseUrl(name, options = {}) {
  const value = readEnv(name);
  if (!value) {
    if (options.required) add("critical", `${name}-missing`, `Missing ${name}.`);
    return "";
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    add("critical", `${name}-invalid`, `${name} must be a valid URL.`);
    return value;
  }

  if (url.protocol !== "https:") {
    add(strict ? "critical" : "warning", `${name}-not-https`, `${name} should use https in deploy environments.`);
  }

  if (!url.hostname.endsWith(".supabase.co") && !["localhost", "127.0.0.1"].includes(url.hostname)) {
    add("warning", `${name}-unexpected-host`, `${name} does not look like a Supabase project URL.`);
  }

  return value.replace(/\/+$/, "");
}

const viteSupabaseUrl = validateSupabaseUrl("VITE_SUPABASE_URL", { required: true });
const zivoSoftwareSupabaseUrl = validateSupabaseUrl("VITE_ZIVO_SOFTWARE_SUPABASE_URL", {
  required: requireSoftwareDomain,
});
const backendSupabaseUrl = validateSupabaseUrl("SUPABASE_URL");
const channelOgUrl = readEnv("CHANNEL_OG_FUNCTION_URL");

if (zivoSoftwareSupabaseUrl && zivoSoftwareSupabaseUrl !== ZIVO_SOFTWARE_PROJECT_URL) {
  add(
    "critical",
    "zivo-software-supabase-url-mismatch",
    `VITE_ZIVO_SOFTWARE_SUPABASE_URL must point to ${ZIVO_SOFTWARE_PROJECT_URL} for zivosoftware.com.`,
  );
}

if (strict && !backendSupabaseUrl) {
  add("critical", "backend-supabase-url-missing", "Missing SUPABASE_URL for backend cron/runtime settings. See docs/supabase-deploy-env-setup.md.");
}

if (viteSupabaseUrl && backendSupabaseUrl && viteSupabaseUrl !== backendSupabaseUrl) {
  add("critical", "supabase-url-mismatch", "VITE_SUPABASE_URL and SUPABASE_URL point to different projects.");
}

if (channelOgUrl) {
  try {
    const url = new URL(channelOgUrl);
    if (url.protocol !== "https:") add(strict ? "critical" : "warning", "channel-og-not-https", "CHANNEL_OG_FUNCTION_URL should use https.");
  } catch {
    add("critical", "channel-og-invalid", "CHANNEL_OG_FUNCTION_URL must be a valid URL when set.");
  }
} else if (!backendSupabaseUrl && !viteSupabaseUrl) {
  add("warning", "channel-og-unconfigured", "Channel share previews need SUPABASE_URL or CHANNEL_OG_FUNCTION_URL.");
}

const publishableKey = validatePublishableKey("VITE_SUPABASE_PUBLISHABLE_KEY", { required: true });
const zivoSoftwarePublishableKey = validatePublishableKey("VITE_ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY", {
  required: requireSoftwareDomain,
});

for (const [name, value] of Object.entries(process.env)) {
  if (!name.startsWith("VITE_")) continue;
  const stringValue = String(value || "");
  if (isSupabaseSecret(stringValue)) {
    add("critical", "vite-secret-leak", `${name} contains a Supabase secret/service-role key.`);
  }
  if (isSupabaseManagementToken(stringValue)) {
    add("critical", "vite-management-token-leak", `${name} contains a Supabase management access token.`);
  }
}

const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
if (serviceRoleKey && !isSupabaseSecret(serviceRoleKey)) {
  add("warning", "service-role-format", "SUPABASE_SERVICE_ROLE_KEY does not look like an sb_secret key or legacy service_role JWT.");
}

const supabaseAccessToken = readEnv("SUPABASE_ACCESS_TOKEN");
if (supabaseAccessToken) {
  if (supabaseAccessToken.length < 20) {
    add("warning", "supabase-access-token-format", "SUPABASE_ACCESS_TOKEN is configured but looks too short.");
  }
} else if (strict) {
  add("critical", "supabase-access-token-missing", "Missing SUPABASE_ACCESS_TOKEN for production migration-history verification. See docs/supabase-deploy-env-setup.md.");
}

const anonKey = readEnv("SUPABASE_ANON_KEY");
if (anonKey) {
  if (isSupabaseSecret(anonKey)) {
    add("critical", "anon-key-secret", "SUPABASE_ANON_KEY contains a secret/service-role key.");
  } else if (isSupabaseManagementToken(anonKey)) {
    add("critical", "anon-key-management-token", "SUPABASE_ANON_KEY contains a Supabase management access token.");
  } else if (anonKey.startsWith("sb_publishable_")) {
    add("warning", "anon-key-publishable-format", "SUPABASE_ANON_KEY is an sb_publishable key; Edge Function JWT verification and database cron auth may require the legacy anon JWT.");
  } else if (anonKey.startsWith("eyJ") && jwtRole(anonKey) !== "anon") {
    add("warning", "anon-key-jwt-role", "SUPABASE_ANON_KEY is a JWT but its role is not anon.");
  } else if (!anonKey.startsWith("eyJ")) {
    add("warning", "anon-key-format", "SUPABASE_ANON_KEY should be a legacy anon JWT when used for Edge Function JWT verification or database cron auth.");
  }
} else if (strict) {
  add("critical", "anon-key-missing", "Missing SUPABASE_ANON_KEY for Edge Function verification and database cron auth. See docs/supabase-deploy-env-setup.md.");
}

const projectId = readEnv("VITE_SUPABASE_PROJECT_ID");
const browserHost = safeHostname(viteSupabaseUrl);
if (projectId && browserHost && browserHost.endsWith(".supabase.co")) {
  const ref = browserHost.split(".")[0];
  if (projectId !== ref) {
    add("critical", "project-id-mismatch", "VITE_SUPABASE_PROJECT_ID does not match VITE_SUPABASE_URL.");
  }
}

const summary = {
  critical: findings.filter((finding) => finding.severity === "critical").length,
  warnings: findings.filter((finding) => finding.severity === "warning").length,
  checked: {
    viteSupabaseUrl: Boolean(viteSupabaseUrl),
    zivoSoftwareSupabaseUrl: Boolean(zivoSoftwareSupabaseUrl),
    zivoSoftwarePublishableKey: Boolean(zivoSoftwarePublishableKey),
    zivoSoftwareDomainRequired: requireSoftwareDomain,
    backendSupabaseUrl: Boolean(backendSupabaseUrl),
    publishableKey: Boolean(publishableKey),
    anonKey: Boolean(anonKey),
    runtimeSettingsSqlInputs: Boolean(backendSupabaseUrl && anonKey),
    serviceRoleKey: Boolean(serviceRoleKey),
    supabaseAccessToken: Boolean(supabaseAccessToken),
    channelOgUrl: Boolean(channelOgUrl),
  },
  findings,
};

console.log(JSON.stringify(summary, null, 2));

if (summary.critical > 0 || (strict && summary.warnings > 0)) {
  process.exitCode = 1;
}
