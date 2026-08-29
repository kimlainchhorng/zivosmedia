#!/usr/bin/env node
/**
 * Hardcoded-currency money rendering ratchet.
 *
 * Every money defect found in this codebase so far has the same shape: a
 * literal "$" glued to an interpolated amount, usually with a manual
 * `/ 100`. That renders the wrong symbol for any non-USD amount, and a
 * hundredth of the real figure for zero-decimal currencies (JPY, KRW, VND,
 * KHR — the last of which is Cambodia's own). It has produced a doubled
 * flight total, a fare that never rendered at all, notifications quoting the
 * wrong currency, and prices rounded to whole units on booking screens.
 *
 * The shared formatters in `src/lib/currency.ts` handle all of this:
 *   formatStripeAmount(minorUnits, currency)  — Stripe integer amounts
 *   formatCurrencyAmount(decimal, currency)   — stored decimal amounts
 *
 * The existing occurrences are a backlog, not an approval list. This is a
 * ratchet: it records the current count per file and fails when a file gains
 * a new one, so the class stops growing while the backlog is paid down.
 *
 * Run:   npm run qa:money-formatting
 * List:  npm run qa:money-formatting -- --list
 * Rebaseline after fixing (never to silence a regression):
 *        npm run qa:money-formatting -- --update-baseline
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const BASELINE_PATH = resolve(__dirname, "money-formatting.baseline.json");

const args = process.argv.slice(2);
const LIST = args.includes("--list");
const UPDATE = args.includes("--update-baseline");

/** A literal "$" immediately before a template interpolation. */
const HARDCODED_DOLLAR = /\$\$\{([^}]*)\}/g;

/** Only count interpolations that are actually rendering money. */
const MONEY_EXPR =
  /amount|price|cost|total|fee|cents|balance|fare|subtotal|payout|refund|earning|revenue|budget|\/\s*100|toFixed/i;

function sourceFiles() {
  const out = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "--", "src", "supabase/functions"],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  return [
    ...new Set(
      out
        .split("\n")
        .map((f) => f.trim())
        .filter((f) => /\.(ts|tsx)$/.test(f))
        .filter((f) => !/\.(test|spec)\.(ts|tsx)$/.test(f))
        .filter((f) => !f.includes("/types.ts")),
    ),
  ].sort();
}

let scannedInterpolations = 0;

function scanFile(relPath) {
  const src = readFileSync(resolve(ROOT, relPath), "utf8");
  const hits = [];
  let m;
  HARDCODED_DOLLAR.lastIndex = 0;
  while ((m = HARDCODED_DOLLAR.exec(src)) !== null) {
    scannedInterpolations += 1;
    const expr = m[1];
    if (!MONEY_EXPR.test(expr)) continue;
    hits.push({
      line: src.slice(0, m.index).split("\n").length,
      expr: expr.trim().slice(0, 70),
    });
  }
  return hits;
}

const results = new Map();
let total = 0;
for (const file of sourceFiles()) {
  const hits = scanFile(file);
  if (hits.length) {
    results.set(file, hits);
    total += hits.length;
  }
}

if (LIST) {
  for (const [file, hits] of [...results].sort()) {
    for (const h of hits) console.log(`${file}:${h.line}  $\${${h.expr}}`);
  }
  console.log(`\n${total} hardcoded-currency amounts in ${results.size} files.`);
  process.exit(0);
}

const current = Object.fromEntries(
  [...results].map(([file, hits]) => [file, hits.length]).sort(),
);

if (UPDATE || !existsSync(BASELINE_PATH)) {
  writeFileSync(BASELINE_PATH, `${JSON.stringify({ total, files: current }, null, 2)}\n`, "utf8");
  console.log(`Baseline written: ${total} hardcoded-currency amounts in ${results.size} files.`);
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));

// A scanner that silently matches nothing must not read as a clean result.
const MIN_EXPECTED_INTERPOLATIONS = 100;
if (scannedInterpolations < MIN_EXPECTED_INTERPOLATIONS) {
  console.error(
    `Scanner only saw ${scannedInterpolations} "$\${...}" interpolations, expected at least ` +
      `${MIN_EXPECTED_INTERPOLATIONS}. It is probably broken rather than the app being clean.`,
  );
  process.exit(1);
}

const regressions = [];
for (const [file, count] of Object.entries(current)) {
  const allowed = baseline.files[file] ?? 0;
  if (count > allowed) {
    regressions.push(`${file}: ${count} hardcoded-currency amounts (baseline ${allowed})`);
  }
}

if (regressions.length) {
  console.error("Money rendered with a hardcoded currency symbol increased:\n");
  for (const r of regressions) console.error(`  ${r}`);
  console.error(
    "\nUse the shared formatters instead:" +
      "\n  formatStripeAmount(minorUnits, currency)  — Stripe integer amounts" +
      "\n  formatCurrencyAmount(decimal, currency)   — stored decimal amounts" +
      "\nList them with: npm run qa:money-formatting -- --list",
  );
  process.exit(1);
}

console.log(
  `OK — ${total} hardcoded-currency amounts across ${scannedInterpolations} scanned ` +
    `(baseline ${baseline.total}), no file regressed.`,
);
