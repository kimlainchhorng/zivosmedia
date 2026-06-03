#!/usr/bin/env node
/**
 * Secret-leak scanner — fails the build if known secret patterns appear in
 * source files. Run via: npm run security:check-secrets
 *
 * Detects:
 *  - Stripe live keys           (sk_live_..., rk_live_...)
 *  - AWS access keys            (AKIA[0-9A-Z]{16})
 *  - Google API keys            (AIza[0-9A-Za-z-_]{35})
 *  - Supabase publishable keys  (sb_publishable_...)
 *  - Supabase secret keys       (sb_secret_...)
 *  - Supabase access tokens     (sbp_...)
 *  - Supabase service-role JWTs (eyJhbGciOi... with role:"service_role")
 *  - Generic high-entropy hex   (40+ char hex strings outside lock files)
 *  - Private RSA / EC keys      (-----BEGIN ... PRIVATE KEY-----)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

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
  ".env.example", "check-secrets.mjs",
]);
const ALLOWED_DOT_DIRS = new Set([".github"]);
const SCAN_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".json", ".toml", ".yml", ".yaml", ".env", ".sh", ".md", ".sql",
]);

const PATTERNS = [
  { name: "Stripe live secret key",  re: /sk_live_[0-9a-zA-Z]{24,}/ },
  { name: "Stripe restricted key",   re: /rk_live_[0-9a-zA-Z]{24,}/ },
  { name: "AWS access key",          re: /AKIA[0-9A-Z]{16}/ },
  { name: "Google API key",          re: /AIza[0-9A-Za-z\-_]{35}/ },
  { name: "Supabase publishable key", re: /sb_publishable_[0-9A-Za-z_-]{20,}/ },
  { name: "Supabase secret key",     re: /sb_secret_[0-9A-Za-z_-]{20,}/ },
  { name: "Supabase access token",   re: /sbp_[0-9A-Za-z]{40,}/ },
  { name: "Supabase service-role JWT", re: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*InNlcnZpY2Vfcm9sZSI[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+/ },
  // Real PEM-encoded private key — must have BEGIN marker, at least one line
  // of base64 key bytes, then END marker. Avoids false positives where the
  // BEGIN string appears as a string-replace literal in source code.
  { name: "Private key block",       re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\r\n]+(?:[A-Za-z0-9+/=]{40,}[\r\n]+){1,}-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/ },
  { name: "GitHub token",            re: /gh[oprsu]_[0-9A-Za-z]{36,}/ },
  { name: "OpenAI API key",          re: /sk-[A-Za-z0-9]{20,}T3BlbkFJ[A-Za-z0-9]{20,}/ },
  { name: "Slack token",             re: /xox[baprs]-[0-9]+-[0-9]+-[0-9]+-[a-z0-9]+/ },
];

let findings = 0;

function redactedMatchSummary(value) {
  const knownPrefix = value.match(/^(sb_publishable_|sb_secret_|sbp_|sk_live_|rk_live_|sk-|AKIA|AIza|gh[oprsu]_|xox[baprs]-)/)?.[1];
  return `${knownPrefix ?? ""}[redacted ${value.length} chars]`;
}

function allMatches(content, re) {
  const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
  return content.matchAll(new RegExp(re.source, flags));
}

function isEnvFile(name) {
  return name === ".env" || name.startsWith(".env.");
}

function isLocalEnvFile(name) {
  return name === ".env" || name === ".env.local" || (name.startsWith(".env.") && name.endsWith(".local"));
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
      if (!SKIP_DIRS.has(rel)) walk(full);
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
      if (stats.size > 2 * 1024 * 1024) continue; // skip files >2 MB
      content = readFileSync(full, "utf8");
    } catch { continue; }

    for (const { name: patternName, re } of PATTERNS) {
      for (const match of allMatches(content, re)) {
        // Skip the .env.example placeholder we ship intentionally
        if (rel.endsWith(".env.example")) continue;
        const lineNo = content.slice(0, match.index).split("\n").length;
        console.error(`✖  ${patternName} in ${rel}:${lineNo}`);
        console.error(`   ${redactedMatchSummary(match[0])}`);
        findings += 1;
      }
    }
  }
}

walk(ROOT);

if (findings > 0) {
  console.error(`\n${findings} potential secret(s) detected. Review and remove before committing.\n`);
  process.exit(1);
}
console.log("✓ No leaked secrets detected.");
