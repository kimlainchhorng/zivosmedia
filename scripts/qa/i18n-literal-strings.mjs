#!/usr/bin/env node
/**
 * Untranslated user-facing literal ratchet.
 *
 * The logged-out homepage is fully Khmer; the signed-in app is not. With the
 * browser in km-KH the feed rendered 33 Khmer text nodes out of 698 and the
 * rest came out English, because the strings are typed straight into JSX
 * instead of going through the i18n catalogue.
 *
 * A key-parity check cannot see this. Both catalogues are already at parity —
 * the untranslated copy never reached a catalogue at all. So this scans the
 * rendered literals themselves: JSX text children and the four attributes a
 * user actually reads (placeholder, aria-label, title, alt). Anything wrapped
 * in braces is an expression — `{t("…")}`, `{km ? "…" : "…"}` — and already
 * routed through code, so it is not counted.
 *
 * Scope is the seven surfaces the app-Khmer work covers, in the order they are
 * being paid down: Feed, composer and Stories, Eats, Wallet, Hotels, Flights,
 * Account. Fixing all of them at once is a large mechanical sweep, so this is a
 * ratchet rather than a pass/fail gate: it records the current count per file
 * and fails when a file gains a new untranslated string. New code therefore has
 * to be translatable, and the backlog can be paid down file by file.
 *
 * Run:      node scripts/qa/i18n-literal-strings.mjs
 * NPM:      npm run qa:i18n-literal-strings
 * List:     npm run qa:i18n-literal-strings -- --list
 * Rebaseline after fixing (never to silence a regression):
 *           npm run qa:i18n-literal-strings -- --update-baseline
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const BASELINE_PATH = resolve(__dirname, "i18n-literal-strings.baseline.json");

const args = process.argv.slice(2);
const LIST = args.includes("--list");
const UPDATE = args.includes("--update-baseline");

/** The seven surfaces, in the order the Khmer sweep works through them. */
const SURFACES = [
  { name: "Feed", match: (f) => f.startsWith("src/components/feed/") || /^src\/pages\/(Feed|SocialFeed|ActivityFeed)Page\.tsx$/.test(f) },
  { name: "Stories", match: (f) => f.startsWith("src/components/stories/") || /^src\/pages\/Story[A-Za-z]*Page\.tsx$/.test(f) },
  { name: "Eats", match: (f) => f.startsWith("src/components/eats/") || /^src\/pages\/Eats[A-Za-z]*\.tsx$/.test(f) },
  { name: "Wallet", match: (f) => f.startsWith("src/components/wallet/") || /^src\/pages\/[A-Za-z]*Wallet[A-Za-z]*\.tsx$/.test(f) },
  { name: "Hotels", match: (f) => f.startsWith("src/components/hotel/") || f.startsWith("src/components/hotels/") || /^src\/pages\/(Hotel[A-Za-z]*|MyHotelTripPage)\.tsx$/.test(f) },
  { name: "Flights", match: (f) => f.startsWith("src/components/flight/") || f === "src/components/search/FlightSearchFormPro.tsx" || /^src\/pages\/(Flight[A-Za-z]*|MyFlightTripPage)\.tsx$/.test(f) },
  { name: "Account", match: (f) => f.startsWith("src/components/account/") || f.startsWith("src/pages/account/") },
];

const surfaceOf = (file) => SURFACES.find((s) => s.match(file))?.name;

function sourceFiles() {
  // `--others --exclude-standard` matters: without it `git ls-files` returns
  // only tracked files, so a brand new component — exactly the code most
  // likely to introduce a regression — would never be scanned.
  const out = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "--", "src"],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  return [
    ...new Set(
      out
        .split("\n")
        .map((f) => f.trim())
        .filter((f) => f.endsWith(".tsx"))
        .filter((f) => !/\.(test|spec)\.tsx$/.test(f))
        .filter((f) => surfaceOf(f)),
    ),
  ].sort();
}

/**
 * JSX text children: `>Some words<`, with no braces (an expression) inside and
 * no newline. The lookbehind keeps TypeScript out: `=>`, `->`, `!==`, `<<`, and
 * generics like `useState<Foo>(…)` all end in a `>` that is not a closing tag.
 */
const JSX_TEXT = /(?<![=\-!<>])>([^<>{}\n]+)</g;
/**
 * The attributes a user actually reads. `className` and friends are not copy.
 * No spaces around `=`: JSX attributes are written `title="…"`, while
 * `let title = "No posts yet"` is a local variable, not a rendered attribute.
 */
const READABLE_ATTR = /\b(?:placeholder|aria-label|title|alt)="([^"]*)"/g;

/**
 * Is this string copy a reader would see, rather than markup noise?
 * Requires two lowercase-containing words, which drops codes ("USD"), single
 * glyphs, numbers, URLs, and stray punctuation without dropping real UI copy.
 */
function isUserFacing(raw) {
  const value = raw.trim();
  if (value.length < 3) return false;
  if (!/[a-z]/.test(value)) return false;
  if (/^(https?:|\/|#|\.|@|\d)/.test(value)) return false;
  // Already Khmer — the sweep's goal, not a finding.
  if (/[ក-៿]/.test(value)) return false;
  // Source code that slipped past the tag heuristic. Prose does not carry
  // these; a straight apostrophe in JSX is written &apos; or a typographic ’.
  if (/[;=()[\]"'`|&!]/.test(value)) return false;
  // Identifiers and single tokens ("px-4", "onClick", "aria") are not copy.
  return /[A-Za-z]{2,}\s+\S/.test(value);
}

/**
 * How many strings in a file already go through the catalogue. Together with the
 * untranslated count this gives a real coverage ratio per surface, so the sweep
 * cannot quietly stall at 13% while the gate stays green -- a ratchet only ever
 * says "no worse than before".
 */
function translatedCount(file) {
  const source = readFileSync(resolve(ROOT, file), "utf8");
  return [...source.matchAll(/\bt\(\s*["'`]/g)].length;
}

function countFile(file) {
  const source = readFileSync(resolve(ROOT, file), "utf8");
  const findings = [];
  for (const match of source.matchAll(JSX_TEXT)) {
    if (isUserFacing(match[1])) findings.push(match[1].trim());
  }
  for (const match of source.matchAll(READABLE_ATTR)) {
    if (isUserFacing(match[1])) findings.push(match[1].trim());
  }
  return findings;
}

const files = sourceFiles();
const counts = {};
const samples = {};
let total = 0;
for (const file of files) {
  const findings = countFile(file);
  if (!findings.length) continue;
  counts[file] = findings.length;
  samples[file] = findings.slice(0, 3);
  total += findings.length;
}

if (LIST) {
  const bySurface = {};
  for (const [file, count] of Object.entries(counts)) {
    const surface = surfaceOf(file);
    (bySurface[surface] ||= []).push([file, count]);
  }
  for (const surface of SURFACES.map((s) => s.name)) {
    const rows = (bySurface[surface] || []).sort((a, b) => b[1] - a[1]);
    const surfaceTotal = rows.reduce((sum, [, count]) => sum + count, 0);
    const surfaceFiles = files.filter((file) => surfaceOf(file) === surface);
    const surfaceTranslated = surfaceFiles.reduce((sum, file) => sum + translatedCount(file), 0);
    const denom = surfaceTotal + surfaceTranslated;
    const coverage = denom ? Math.round((surfaceTranslated / denom) * 100) : 100;
    console.log(`\n${surface} — ${coverage}% translated (${surfaceTranslated} routed, ${surfaceTotal} untranslated in ${rows.length} file(s))`);
    for (const [file, count] of rows.slice(0, 10)) {
      console.log(`  ${String(count).padStart(4)}  ${file}`);
      for (const sample of samples[file]) console.log(`        "${sample.slice(0, 64)}"`);
    }
  }
  console.log(`\nTotal: ${total} across ${Object.keys(counts).length} file(s).`);
  process.exit(0);
}

if (UPDATE) {
  writeFileSync(BASELINE_PATH, `${JSON.stringify({ total, files: counts }, null, 2)}\n`);
  console.log(`Baseline updated: ${total} untranslated literal(s) across ${Object.keys(counts).length} file(s).`);
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  console.error(`Missing baseline. Create it with:\n  npm run qa:i18n-literal-strings -- --update-baseline`);
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
const regressions = [];
for (const [file, count] of Object.entries(counts)) {
  const allowed = baseline.files[file] ?? 0;
  if (count > allowed) regressions.push({ file, count, allowed, samples: samples[file] });
}

if (regressions.length) {
  console.error("Untranslated user-facing strings increased:\n");
  for (const row of regressions) {
    console.error(`  ${row.file}: ${row.allowed} → ${row.count}`);
    for (const sample of row.samples) console.error(`      "${sample.slice(0, 72)}"`);
  }
  console.error(
    "\nRoute this copy through the i18n catalogue so it can ship in Khmer as well as English.\n" +
      "If you removed strings elsewhere and this count is genuinely lower overall, rebaseline with:\n" +
      "  npm run qa:i18n-literal-strings -- --update-baseline",
  );
  process.exit(1);
}

const improved = Object.entries(baseline.files).filter(([file, allowed]) => (counts[file] ?? 0) < allowed);
{
  // Every scanned file, not just the ones that still have literals -- otherwise a
  // fully translated file is excluded from both halves and coverage reads low.
  const routed = files.reduce((sum, file) => sum + translatedCount(file), 0);
  const denom = total + routed;
  console.log(`i18n coverage: ${denom ? Math.round((routed / denom) * 100) : 100}% of user-facing strings routed through the catalogue (${routed} routed, ${total} not).`);
  console.log(`Per-surface breakdown: npm run qa:i18n-literal-strings -- --list`);
}
console.log(`i18n literal ratchet: ${total} untranslated string(s) across ${Object.keys(counts).length} file(s) in ${SURFACES.length} surfaces (baseline ${baseline.total}).`);
if (improved.length) {
  console.log(`${improved.length} file(s) improved since the baseline — rebaseline to lock the gain in.`);
}
