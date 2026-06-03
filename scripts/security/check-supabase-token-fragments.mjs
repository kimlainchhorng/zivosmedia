#!/usr/bin/env node
/**
 * Supabase token-fragment sweep for rotation closeout.
 *
 * This complements check-secrets.mjs with a narrow Supabase-only pass that
 * mirrors the manual runbook grep without printing token material.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const includeLocalEnv = args.has("--include-local-env");

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "dist-ssr", "build",
  "android/build", "ios/build", "ios/Pods",
  "android/app/src/main/assets/public", "ios/App/App/public",
  "supabase/.branches", "supabase/.temp",
]);
const SKIP_FILES = new Set([
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb",
  ".env.example", "check-supabase-token-fragments.mjs",
]);
const ALLOWED_DOT_DIRS = new Set([".github"]);
const SCAN_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".json", ".toml", ".yml", ".yaml", ".env", ".sh", ".md", ".sql",
]);
const TOKEN_FRAGMENT_RE = /sb_publishable_[A-Za-z0-9_-]+|sb_secret_[A-Za-z0-9_-]+|sbp_[A-Za-z0-9]+/g;

let findings = 0;

function isEnvFile(name) {
  return name === ".env" || name.startsWith(".env.");
}

function isLocalEnvFile(name) {
  return name === ".env.local" || (name.startsWith(".env.") && name.endsWith(".local"));
}

function redactedSummary(value) {
  const prefix = value.match(/^(sb_publishable_|sb_secret_|sbp_)/)?.[1] ?? "";
  return `${prefix}[redacted ${value.length} chars]`;
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = full.slice(ROOT.length + 1).replace(/\\/g, "/");
    let stats;
    try { stats = statSync(full); } catch { continue; }

    if (stats.isDirectory()) {
      if (SKIP_DIRS.has(name) || SKIP_DIRS.has(rel)) continue;
      if (name.startsWith(".") && !ALLOWED_DOT_DIRS.has(name)) continue;
      walk(full);
      continue;
    }

    if (name.startsWith(".") && !isEnvFile(name)) continue;
    if (SKIP_FILES.has(name)) continue;
    if (!includeLocalEnv && isLocalEnvFile(name)) continue;

    const ext = extname(name).toLowerCase();
    const isEnv = isEnvFile(name);
    if (!isEnv && !SCAN_EXTENSIONS.has(ext)) continue;

    let content;
    try {
      if (stats.size > 2 * 1024 * 1024) continue;
      content = readFileSync(full, "utf8");
    } catch {
      continue;
    }

    for (const match of content.matchAll(TOKEN_FRAGMENT_RE)) {
      if (rel.endsWith(".env.example")) continue;
      const lineNo = content.slice(0, match.index).split("\n").length;
      console.error(`✖  Supabase token fragment in ${rel}:${lineNo}`);
      console.error(`   ${redactedSummary(match[0])}`);
      findings += 1;
    }
  }
}

walk(ROOT);

if (findings > 0) {
  console.error(`\n${findings} Supabase token fragment(s) detected. Rotate and remove before release.\n`);
  process.exit(1);
}

console.log("✓ No Supabase token fragments detected.");
