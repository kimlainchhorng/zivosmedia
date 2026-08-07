/**
 * Fail the build on an in-app link that goes nowhere.
 *
 * The router has a catch-all, so a wrong path never throws — it silently lands
 * the user somewhere useless. That makes this class of bug invisible to types,
 * to tests, and to anyone not clicking the exact button.
 *
 * Real examples this caught:
 *   - five "create a post" buttons navigating to /feed/new when the route is
 *     /feed-new, including the empty state that prompts a new user to post
 *   - "Payment Documentation" on the Enterprise Trust page pointing at
 *     /legal/payment-transparency, a page that has never existed, on a page
 *     inviting review by payment processors
 *   - a repo file path rendered as a <Link>, so it routed instead of opening
 *
 * Dynamic segments (:id) and the catch-all are resolved, so only genuinely
 * unroutable targets are reported.
 *
 * USAGE
 *   node scripts/qa/check-dead-links.mjs
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.argv[2] || process.cwd();
const appFile = process.argv[3] || "src/App.tsx";
const app = readFileSync(path.join(root, appFile), "utf8");

// Routes the router actually serves.
const routes = [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);
const staticRoutes = new Set(routes.filter((r) => !r.includes(":") && !r.includes("*")));
const dynamicRoutes = routes
  .filter((r) => r.includes(":"))
  .map((r) => new RegExp("^" + r.replace(/:[^/]+/g, "[^/]+").replace(/\//g, "\\/") + "$"));
const hasCatchAll = routes.some((r) => r === "*" || r.includes("*"));

function files(dir) {
  const out = [];
  for (const e of readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...files(rel));
    else if (/\.tsx?$/.test(e.name) && !e.name.includes(".test.")) out.push(rel);
  }
  return out;
}

const resolves = (target) => {
  if (staticRoutes.has(target)) return true;
  return dynamicRoutes.some((re) => re.test(target));
};

const dead = new Map();
for (const f of files("src")) {
  if (f.endsWith(appFile.split("/").pop())) continue;
  const src = readFileSync(path.join(root, f), "utf8");
  const targets = [
    ...[...src.matchAll(/(?:to|href)="(\/[^"#?]*)"/g)].map((m) => m[1]),
    ...[...src.matchAll(/navigate\(\s*"(\/[^"#?]*)"/g)].map((m) => m[1]),
  ];
  for (const t of new Set(targets)) {
    const clean = t.replace(/\/$/, "") || "/";
    if (!resolves(clean) && !resolves(t)) {
      if (!dead.has(clean)) dead.set(clean, new Set());
      dead.get(clean).add(f);
    }
  }
}

console.log(`routes: ${staticRoutes.size} static, ${dynamicRoutes.length} dynamic, catch-all: ${hasCatchAll}`);
if (dead.size === 0) { console.log("✓ every in-app link resolves to a route"); process.exit(0); }
console.log(`\n✗ ${dead.size} link target(s) with no matching route:\n`);
for (const [target, fileSet] of [...dead].sort()) {
  console.log(`  ${target}`);
  // Every file, not a sample: a truncated list made this look like three
  // broken buttons when there were five, and the two it hid stayed broken.
  for (const f of [...fileSet].sort()) console.log(`      ${f}`);
}
console.log("\nFix the path, or add the missing route. The router's catch-all means");
console.log("a wrong path never errors — it just quietly goes nowhere.");
// Exit non-zero. Without this the check printed its findings and reported
// success, which is worse than not having it: a gate that cannot fail gives
// false confidence to everyone who sees it pass.
process.exit(1);
