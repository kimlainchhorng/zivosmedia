#!/usr/bin/env node
/**
 * Icon-button accessible-name ratchet.
 *
 * An icon-only control (`size="icon"`) renders a glyph and nothing else, so
 * unless it carries an `aria-label`, an `aria-labelledby`, a `title`, or an
 * `sr-only` child, a screen reader announces it as an unnamed "button" and the
 * user has no way to know what it does. ZIVO ships hundreds of these across
 * checkout, chat, admin, and the creator tools.
 *
 * Fixing every one at once is a large mechanical sweep across ~80 files, so
 * this is a ratchet rather than a pass/fail gate: it records the current count
 * per file and fails when a file gains a new unnamed icon button. New code
 * therefore has to be accessible, and the backlog can be paid down file by
 * file without blocking anything.
 *
 * Run:      node scripts/qa/button-accessible-names.mjs
 * NPM:      npm run qa:button-accessible-names
 * List:     npm run qa:button-accessible-names -- --list
 * Rebaseline after fixing (never to silence a regression):
 *           npm run qa:button-accessible-names -- --update-baseline
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const BASELINE_PATH = resolve(__dirname, "button-accessible-names.baseline.json");

const args = process.argv.slice(2);
const LIST = args.includes("--list");
const UPDATE = args.includes("--update-baseline");

/** Attributes that give a control an accessible name on their own. */
const NAMING_ATTRS = /\b(aria-label|aria-labelledby|title)\s*=/;

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
        .filter((f) => !/\.(test|spec)\.tsx$/.test(f)),
    ),
  ].sort();
}

/**
 * Walk forward from the end of an opening tag to its matching close tag,
 * tracking nesting so a nested <span> does not end the search early.
 */
function elementChildren(src, tagName, openTagEnd) {
  const open = new RegExp(`<${tagName}[\\s>]`, "g");
  const close = new RegExp(`</${tagName}>`, "g");
  open.lastIndex = openTagEnd;
  close.lastIndex = openTagEnd;

  let depth = 1;
  let cursor = openTagEnd;
  for (let guard = 0; guard < 500; guard += 1) {
    open.lastIndex = cursor;
    close.lastIndex = cursor;
    const nextOpen = open.exec(src);
    const nextClose = close.exec(src);
    if (!nextClose) return src.slice(openTagEnd, openTagEnd + 600);
    if (nextOpen && nextOpen.index < nextClose.index) {
      depth += 1;
      cursor = nextOpen.index + nextOpen[0].length;
      continue;
    }
    depth -= 1;
    if (depth === 0) return src.slice(openTagEnd, nextClose.index);
    cursor = nextClose.index + nextClose[0].length;
  }
  return src.slice(openTagEnd, openTagEnd + 600);
}

/** Visible, non-icon text between the tags (JSX text or a string literal child). */
function hasVisibleText(children) {
  const withoutTags = children.replace(/<[^>]*>/g, " ");
  const withoutExpressions = withoutTags.replace(/\{[^}]*\}/g, " ");
  return /[A-Za-z]{2,}/.test(withoutExpressions);
}

/**
 * Locate the opening tag that contains `index`, by scanning outward rather
 * than with a nested-alternation regex (which backtracks catastrophically on
 * JSX attribute soup).
 */
function enclosingTag(src, index) {
  let start = -1;
  for (let i = index; i >= 0; i -= 1) {
    const ch = src[i];
    if (ch === ">") return null; // not inside a tag
    if (ch === "<") {
      start = i;
      break;
    }
  }
  if (start === -1) return null;

  const nameMatch = /^<([A-Z][\w.]*)/.exec(src.slice(start, start + 60));
  if (!nameMatch) return null;

  let depth = 0;
  let quote = null;
  for (let i = start + 1; i < src.length; i += 1) {
    const ch = src[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") depth -= 1;
    else if (ch === ">" && depth === 0) {
      return {
        tag: nameMatch[1],
        attrs: src.slice(start, i),
        end: i + 1,
        selfClosing: src[i - 1] === "/",
      };
    }
  }
  return null;
}

function scanFile(relPath) {
  const src = readFileSync(resolve(ROOT, relPath), "utf8");
  const offenders = [];
  const needle = /size=["']icon["']/g;
  const seen = new Set();

  let match;
  while ((match = needle.exec(src)) !== null) {
    const tag = enclosingTag(src, match.index);
    if (!tag || seen.has(tag.end)) continue;
    seen.add(tag.end);
    scannedIconButtons += 1;

    if (NAMING_ATTRS.test(tag.attrs)) continue;

    if (!tag.selfClosing) {
      const children = elementChildren(src, tag.tag, tag.end);
      if (/sr-only/.test(children) || hasVisibleText(children)) continue;
      // With `asChild` the component renders *as* its child, so a label on
      // that child (e.g. <Button asChild><Link aria-label="Go back">) is the
      // control's accessible name.
      if (/\basChild\b/.test(tag.attrs) && NAMING_ATTRS.test(children)) continue;
    }

    offenders.push({
      line: src.slice(0, match.index).split("\n").length,
      tag: tag.tag,
    });
  }
  return offenders;
}

/** Icon buttons seen across the whole scan, offending or not. */
let scannedIconButtons = 0;

const results = new Map();
let total = 0;
for (const file of sourceFiles()) {
  const offenders = scanFile(file);
  if (offenders.length > 0) {
    results.set(file, offenders);
    total += offenders.length;
  }
}

if (LIST) {
  for (const [file, offenders] of [...results].sort()) {
    for (const o of offenders) {
      console.log(`${file}:${o.line}  <${o.tag} size="icon"> has no accessible name`);
    }
  }
  console.log(`\n${total} unnamed icon buttons in ${results.size} files.`);
  process.exit(0);
}

const current = Object.fromEntries(
  [...results].map(([file, offenders]) => [file, offenders.length]).sort(),
);

if (UPDATE || !existsSync(BASELINE_PATH)) {
  writeFileSync(
    BASELINE_PATH,
    `${JSON.stringify({ total, files: current }, null, 2)}\n`,
    "utf8",
  );
  console.log(`Baseline written: ${total} unnamed icon buttons in ${results.size} files.`);
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));

// Now that the backlog is zero, "no offenders" and "the scanner broke and
// matched nothing" look identical. Assert the scan actually saw the icon
// buttons that exist (there are ~640) before trusting a clean result.
const MIN_EXPECTED_ICON_BUTTONS = 400;
if (scannedIconButtons < MIN_EXPECTED_ICON_BUTTONS) {
  console.error(
    `Scanner only found ${scannedIconButtons} icon buttons, expected at least ` +
      `${MIN_EXPECTED_ICON_BUTTONS}. It is probably broken rather than the app being clean.`,
  );
  process.exit(1);
}
const regressions = [];
for (const [file, count] of Object.entries(current)) {
  const allowed = baseline.files[file] ?? 0;
  if (count > allowed) {
    regressions.push(`${file}: ${count} unnamed icon buttons (baseline ${allowed})`);
  }
}

const improved = Object.entries(baseline.files).filter(
  ([file, count]) => (current[file] ?? 0) < count,
);

if (regressions.length > 0) {
  console.error("Icon buttons without an accessible name increased:\n");
  for (const r of regressions) console.error(`  ${r}`);
  console.error(
    "\nAdd aria-label (or an sr-only child) to the new icon buttons." +
      "\nList them with: npm run qa:button-accessible-names -- --list",
  );
  process.exit(1);
}

console.log(
  `OK — ${total} unnamed icon buttons across ${scannedIconButtons} scanned ` +
    `(baseline ${baseline.total}), no file regressed.`,
);
if (improved.length > 0) {
  console.log(
    `${improved.length} file(s) improved. Re-baseline with: ` +
      "npm run qa:button-accessible-names -- --update-baseline",
  );
}
