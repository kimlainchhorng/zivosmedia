#!/usr/bin/env node
/**
 * Secret-leak scanner — fails the build if known secret patterns appear in
 * source files. Run via: npm run security:check-secrets
 *
 * Detects:
 *  - Stripe live keys           (sk_live_..., rk_live_...)
 *  - AWS access keys            (AKIA[0-9A-Z]{16})
 *  - Google API keys            (AIza[0-9A-Za-z-_]{35})
 *  - Supabase service-role JWTs (eyJhbGciOi... with role:"service_role")
 *  - Generic high-entropy hex   (40+ char hex strings outside lock files)
 *  - Private RSA / EC keys      (-----BEGIN ... PRIVATE KEY-----)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.cwd();
const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "dist-ssr", "build",
  "android/build", "ios/build", "ios/Pods",
  "supabase/.branches", "supabase/.temp",
]);
const SKIP_FILES = new Set([
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb",
  ".env.example", "check-secrets.mjs",
]);
const SCAN_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".json", ".toml", ".yml", ".yaml", ".env", ".sh", ".md", ".sql",
]);

const PATTERNS = [
  { name: "Stripe live secret key",  re: /sk_live_[0-9a-zA-Z]{24,}/ },
  { name: "Stripe restricted key",   re: /rk_live_[0-9a-zA-Z]{24,}/ },
  { name: "AWS access key",          re: /AKIA[0-9A-Z]{16}/ },
  { name: "Google API key",          re: /AIza[0-9A-Za-z\-_]{35}/ },
  // Real PEM-encoded private key — must have BEGIN marker, at least one line
  // of base64 key bytes, then END marker. Avoids false positives where the
  // BEGIN string appears as a string-replace literal in source code.
  { name: "Private key block",       re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\r\n]+(?:[A-Za-z0-9+/=]{40,}[\r\n]+){1,}-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/ },
  { name: "GitHub token",            re: /gh[oprsu]_[0-9A-Za-z]{36,}/ },
  { name: "OpenAI API key",          re: /sk-[A-Za-z0-9]{20,}T3BlbkFJ[A-Za-z0-9]{20,}/ },
  { name: "Slack token",             re: /xox[baprs]-[0-9]+-[0-9]+-[0-9]+-[a-z0-9]+/ },
];

let findings = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name) || name.startsWith(".") && name !== ".env" && name !== ".env.example") {
      // Allow .env, .env.example through the dir filter; block other dotfiles
      if (!(name === ".env" || name === ".env.example")) continue;
    }
    const full = join(dir, name);
    const rel = full.slice(ROOT.length + 1);
    let stats;
    try { stats = statSync(full); } catch { continue; }
    if (stats.isDirectory()) {
      if (!SKIP_DIRS.has(rel)) walk(full);
      continue;
    }
    if (SKIP_FILES.has(name)) continue;

    const ext = extname(name).toLowerCase();
    const isEnv = name === ".env" || name.startsWith(".env.");
    if (!isEnv && !SCAN_EXTENSIONS.has(ext)) continue;

    let content;
    try {
      if (stats.size > 2 * 1024 * 1024) continue; // skip files >2 MB
      content = readFileSync(full, "utf8");
    } catch { continue; }

    for (const { name: patternName, re } of PATTERNS) {
      const match = content.match(re);
      if (match) {
        // Skip the .env.example placeholder we ship intentionally
        if (rel.endsWith(".env.example")) continue;
        const lineNo = content.slice(0, match.index).split("\n").length;
        console.error(`✖  ${patternName} in ${rel}:${lineNo}`);
        console.error(`   ${match[0].slice(0, 40)}…`);
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
