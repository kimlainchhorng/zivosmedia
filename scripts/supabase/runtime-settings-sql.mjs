#!/usr/bin/env node
/**
 * Render SQL for Supabase database-side runtime settings.
 *
 * Defaults are intentionally redacted so this command can be used in CI logs and
 * readiness reports. Pass --emit-secrets only when writing directly to a local,
 * protected file or pasting into the Supabase SQL editor.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { config as loadDotenv } from "dotenv";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const emitSecrets = args.has("--emit-secrets");
const strict = args.has("--strict");

for (const file of [".env", ".env.local", ".env.deploy"]) {
  const envPath = path.join(root, file);
  if (existsSync(envPath)) loadDotenv({ path: envPath, override: false, quiet: true });
}

function argValue(name) {
  const prefix = `${name}=`;
  const inline = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(name);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];
  return "";
}

function isServiceRoleJwt(value) {
  if (!value.startsWith("eyJ")) return false;
  const [, payload] = value.split(".");
  if (!payload) return false;

  try {
    const json = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64url").toString("utf8");
    return JSON.parse(json)?.role === "service_role";
  } catch {
    return false;
  }
}

function isSupabaseManagementToken(value) {
  return value.startsWith("sbp_");
}

function sqlLiteral(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

const projectRef = argValue("--project-ref") || process.env.SUPABASE_PROJECT_REF || "";
const suppliedUrl = argValue("--url")
  || (projectRef ? "" : process.env.SUPABASE_URL)
  || (strict || projectRef ? "" : process.env.VITE_SUPABASE_URL)
  || "";
const anonKey = argValue("--anon-key")
  || process.env.SUPABASE_ANON_KEY
  || (strict ? "" : process.env.VITE_SUPABASE_PUBLISHABLE_KEY)
  || "";

const supabaseUrl = suppliedUrl || (projectRef ? `https://${projectRef}.supabase.co` : "");
const errors = [];

if (!supabaseUrl) {
  errors.push("Missing Supabase URL. Set SUPABASE_URL or pass --url/--project-ref. See docs/supabase-deploy-env-setup.md.");
} else if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl)) {
  errors.push("Supabase URL must look like https://<project-ref>.supabase.co.");
}

if (!anonKey) {
  errors.push("Missing anon key. Set SUPABASE_ANON_KEY or pass --anon-key. See docs/supabase-deploy-env-setup.md.");
}

if (anonKey.startsWith("sb_secret_") || isServiceRoleJwt(anonKey)) {
  errors.push("Refusing to use a Supabase secret/service_role key for app.settings.supabase_anon_key.");
} else if (isSupabaseManagementToken(anonKey)) {
  errors.push("Refusing to use a Supabase management access token for app.settings.supabase_anon_key.");
} else if (strict && anonKey.startsWith("sb_publishable_")) {
  errors.push("Strict mode requires a legacy anon JWT or compatible function auth key, not an sb_publishable key.");
}

if (errors.length) {
  for (const error of errors) console.error(`runtime-settings-sql: ${error}`);
  process.exit(1);
}

const anonKeyValue = emitSecrets ? anonKey : "<redacted: set SUPABASE_ANON_KEY and rerun with --emit-secrets>";

console.log("-- Supabase runtime settings for database-side Edge Function calls");
console.log("-- Review before running in the Supabase SQL editor.");
if (!strict && !process.env.SUPABASE_ANON_KEY && process.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  console.log("-- Preview mode used VITE_SUPABASE_PUBLISHABLE_KEY; use SUPABASE_ANON_KEY with --strict for production cron auth.");
}
console.log(`alter database postgres set "app.settings.supabase_url" = ${sqlLiteral(supabaseUrl)};`);
console.log(`alter database postgres set "app.settings.supabase_anon_key" = ${sqlLiteral(anonKeyValue)};`);
console.log("select pg_reload_conf();");
