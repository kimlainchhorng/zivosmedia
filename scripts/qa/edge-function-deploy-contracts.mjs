#!/usr/bin/env node
/**
 * Edge Function deployment contract check.
 *
 * Keeps high-risk browser-invoked functions visible in supabase/config.toml so
 * release deploys do not ship frontend calls to undeclared/missing functions.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

const criticalFunctions = [
  { slug: "analytics-event-track", verifyJwt: false, why: "anonymous browser analytics queues" },
  { slug: "notification-manage", verifyJwt: true, why: "user notification read/delete/snooze" },
  { slug: "social-notification-manage", verifyJwt: true, why: "social notification create/read state" },
  { slug: "push-device-manage", verifyJwt: true, why: "push subscription revoke" },
  { slug: "talent-invite-notification", verifyJwt: true, why: "job invite notification creation" },
  { slug: "admin-broadcast-notification", verifyJwt: true, why: "admin broadcast notification creation" },
];

function source(relativePath) {
  const file = path.join(root, relativePath);
  if (!existsSync(file)) {
    failures.push(`missing file: ${relativePath}`);
    return "";
  }
  // Normalize CRLF -> LF so multiline assertions are line-ending agnostic
  // (Windows/OneDrive checkouts with core.autocrlf=true yield CRLF files).
  return readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function requireContains(id, text, needle, relativePath) {
  if (!text.includes(needle)) {
    failures.push(`${id}: ${relativePath} missing ${JSON.stringify(needle)}`);
  }
}

function requireMatch(id, text, pattern, relativePath) {
  if (!pattern.test(text)) {
    failures.push(`${id}: ${relativePath} must match ${pattern}`);
  }
}

function requireUserAuth(id, text, relativePath) {
  if (!/auth\.getUser\((?:token)?\)/.test(text)) {
    failures.push(`${id}: ${relativePath} must validate the bearer token with auth.getUser`);
  }
}

const configPath = "supabase/config.toml";
const config = source(configPath);

for (const item of criticalFunctions) {
  const id = `edge-function-config:${item.slug}`;
  const fnPath = `supabase/functions/${item.slug}/index.ts`;
  const fn = source(fnPath);
  requireContains(id, config, `[functions.${item.slug}]`, configPath);
  requireMatch(
    id,
    config,
    new RegExp(`\\[functions\\.${item.slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]\\s+verify_jwt = ${item.verifyJwt ? "true" : "false"}`),
    configPath,
  );
  requireContains(id, fn, `withSecurity("${item.slug}"`, fnPath);
  requireContains(id, fn, 'allowedMethods: ["POST"]', fnPath);
  if (item.verifyJwt) requireUserAuth(id, fn, fnPath);
}

const report = {
  generated: new Date().toISOString(),
  counts: {
    functions: criticalFunctions.length,
    failures: failures.length,
  },
  functions: criticalFunctions,
  failures,
};

console.log(JSON.stringify(report, null, 2));

if (failures.length) process.exit(1);
