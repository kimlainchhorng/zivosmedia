#!/usr/bin/env node
/**
 * Decides whether a completed CI commit should trigger production deploy gates.
 *
 * Reads newline-delimited changed paths from stdin. In GitHub Actions, pass
 * --github-output "$GITHUB_OUTPUT" to write the relevant=true/false output.
 */
import { appendFileSync, readFileSync } from "node:fs";

const RELEVANT_PATHS = [
  /^src\//,
  /^public\//,
  /^cloudflare\//,
  /^supabase\//,
  /^scripts\/deploy\//,
  /^scripts\/security\//,
  /^scripts\/supabase\//,
  /^docs\/production-deploy-secrets\.md$/,
  /^docs\/supabase-deploy-env-setup\.md$/,
  /^docs\/supabase-migration-auth-setup\.md$/,
  /^docs\/platform-upgrade-workflow\.md$/,
  /^docs\/end-to-end-platform-readiness\.md$/,
  /^netlify\.toml$/,
  /^wrangler\.toml$/,
  /^package\.json$/,
  /^package-lock\.json$/,
  /^vite\.config\.ts$/,
  /^index\.html$/,
  /^capacitor\.config\.ts$/,
  /^\.github\/workflows\//,
];

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];
  return "";
}

function normalizePath(file) {
  return file.trim().replace(/^\.?\//, "");
}

if (process.argv.includes("--help")) {
  console.log(`Usage: node scripts/deploy/production-deploy-relevance.mjs [--github-output <path>]

Reads newline-delimited changed paths from stdin and prints relevant=true or relevant=false.
`);
  process.exit(0);
}

const changed = readFileSync(0, "utf8")
  .split(/\r?\n/)
  .map(normalizePath)
  .filter(Boolean);
const relevant = changed.some((file) => RELEVANT_PATHS.some((pattern) => pattern.test(file)));
const output = `relevant=${relevant ? "true" : "false"}`;
const githubOutput = argValue("--github-output");

console.log("Changed files:");
for (const file of changed) console.log(file);
console.log(output);

if (githubOutput) appendFileSync(githubOutput, `${output}\n`, "utf8");
