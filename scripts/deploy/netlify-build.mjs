#!/usr/bin/env node
/**
 * Netlify build entrypoint.
 *
 * Direct Netlify deploy previews do not always receive production Supabase
 * deploy secrets. Keep production builds gated by the local preflight, but let
 * preview/branch deploys run the security scan and production build.
 */
import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "cmd.exe" : "npm";
const npmPrefix = process.platform === "win32" ? ["/d", "/s", "/c", "npm"] : [];

function run(label, args) {
  console.log(`\n[netlify-build] ${label}`);
  const result = spawnSync(npmCommand, [...npmPrefix, ...args], {
    cwd: process.cwd(),
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const context = process.env.CONTEXT || "";
const isNetlifyPreview =
  process.env.NETLIFY === "true" &&
  context &&
  context !== "production";

run("Security scan", ["run", "security:scan"]);

if (isNetlifyPreview) {
  console.log(
    `\n[netlify-build] ${context} deploy detected; skipping production Supabase preflight because deploy previews may not receive production secrets.`,
  );
  run("Production build", ["run", "build"]);
} else {
  run("Local deploy preflight", ["run", "deploy:preflight:local"]);
}
