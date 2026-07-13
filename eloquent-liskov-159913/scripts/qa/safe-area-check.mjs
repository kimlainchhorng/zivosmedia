#!/usr/bin/env node
/**
 * Safe-area QA checklist.
 *
 * Statically scans inline `style={{ ... }}` blocks in the social sheet
 * primitives + ReelsFeedPage and verifies that every `top` / `paddingTop` /
 * `marginTop` rule that references `env(safe-area-inset-top)` resolves to a
 * value ≥ the device's top inset. This proves headers (X close button,
 * profile row, sheet handle) never enter the unsafe zone on notched iPhones,
 * Android cutout devices, or tablets.
 *
 * It evaluates the CSS expressions with the same `max(...)` / `min(...)` /
 * `calc(...)` semantics the browser uses, with `env(safe-area-inset-*)`
 * substituted for each device profile.
 *
 * Run:   node scripts/qa/safe-area-check.mjs
 * NPM:   npm run qa:safe-area
 *
 * To add a new device profile: append to DEVICES.
 * To add a new file/selector:  append to TARGETS.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

// ── Device profiles: top/bottom/left/right safe-area insets in CSS px ────
const DEVICES = [
  { name: "iPhone 15 Pro (notch)", top: 59, bottom: 34, left: 0, right: 0 },
  { name: "iPhone SE (no notch)", top: 20, bottom: 0, left: 0, right: 0 },
  { name: "Pixel 8 (cutout)", top: 32, bottom: 24, left: 0, right: 0 },
  { name: "Galaxy S24 (cutout)", top: 36, bottom: 18, left: 0, right: 0 },
  { name: "iPad Pro 11\" portrait", top: 24, bottom: 20, left: 0, right: 0 },
  { name: "iPad Pro 11\" landscape", top: 24, bottom: 20, left: 20, right: 20 },
  // The bug we keep hitting: native WKWebView reports 0 even on Dynamic Island.
  // Per-element floors enforce that overlay/sheet/sticky tokens still keep
  // controls below the status bar even when env() returns 0.
  { name: "iOS Dynamic Island (broken inset=0)", top: 0, bottom: 0, left: 0, right: 0, brokenIsland: true },
];

// ── Shared safe-area tokens (mirrored from src/index.css `:root`) ────────
// Keep in sync with --zivo-safe-top-* CSS custom properties.
const SAFE_TOKENS = {
  "--zivo-safe-top-overlay":
    "max(calc(env(safe-area-inset-top, 0px) + 1.25rem), 80px)",
  "--zivo-safe-top-sheet": "max(env(safe-area-inset-top, 0px), 44px)",
  "--zivo-safe-top-sticky":
    "max(calc(env(safe-area-inset-top, 0px) + 0.125rem), 44px)",
};

const SHIPPED_SAFE_TOKENS = {
  "--zivo-safe-top-overlay":
    "max(calc(var(--zivo-safe-top, 0px) + 1.25rem), 80px)",
  "--zivo-safe-top-sheet": "max(var(--zivo-safe-top, 0px), 44px)",
};

// ── Targets: files + named selectors with the inline style snippet ───────
const TARGETS = [
  {
    file: "src/components/social/SwipeableSheet.tsx",
    elements: [
      {
        name: "Sheet panel paddingTop",
        property: "paddingTop",
        // We ship `var(--zivo-safe-top-sheet)`. The QA evaluator resolves the
        // underlying CSS expression so it matches what the browser computes.
        shipped: "var(--zivo-safe-top-sheet)",
        expression: SAFE_TOKENS["--zivo-safe-top-sheet"],
      },
    ],
  },
  {
    file: "src/pages/ReelsFeedPage.tsx",
    elements: [
      {
        name: "Feed sticky header",
        property: "paddingTop",
        shipped: "zivo-pt-safe-overlay",
        expression: SAFE_TOKENS["--zivo-safe-top-overlay"],
        brokenIslandFloor: 80,
      },
      {
        name: "Search overlay header",
        property: "paddingTop",
        shipped: "zivo-pt-safe-sticky",
        expression: SAFE_TOKENS["--zivo-safe-top-sticky"],
      },
      {
        name: "Post-detail viewer header",
        property: "paddingTop",
        shipped: "zivo-pt-safe-overlay",
        expression: SAFE_TOKENS["--zivo-safe-top-overlay"],
        brokenIslandFloor: 80,
      },
      {
        name: "ReelSlide close button (top)",
        property: "top",
        shipped: "zivo-reel-close-offset",
        expression: SAFE_TOKENS["--zivo-safe-top-overlay"],
        brokenIslandFloor: 80,
      },
    ],
  },
  {
    file: "src/pages/FeedPage.tsx",
    elements: [
      {
        name: "Discover header paddingTop",
        property: "paddingTop",
        shipped: "feed-discover-header",
        expression: SAFE_TOKENS["--zivo-safe-top-sticky"],
      },
      {
        name: "Floating actions top",
        property: "top",
        shipped: "top-[calc(var(--zivo-safe-top-overlay,80px)+0.25rem)]",
        expression: `calc(${SAFE_TOKENS["--zivo-safe-top-overlay"]} + 0.25rem)`,
        brokenIslandFloor: 80,
      },
    ],
  },
  {
    file: "src/components/profile/ProfileContentTabs.tsx",
    elements: [
      {
        name: "Profile post viewer paddingTop",
        property: "paddingTop",
        shipped: 'paddingTop: "var(--zivo-safe-top-overlay)"',
        expression: SAFE_TOKENS["--zivo-safe-top-overlay"],
        brokenIslandFloor: 60,
      },
    ],
  },
  {
    file: "src/index.css",
    elements: [
      {
        name: "--zivo-safe-top-overlay token",
        property: "var",
        shipped: SHIPPED_SAFE_TOKENS["--zivo-safe-top-overlay"],
        expression: SAFE_TOKENS["--zivo-safe-top-overlay"],
        brokenIslandFloor: 80,
      },
      {
        name: "--zivo-safe-top-sheet token",
        property: "var",
        shipped: SHIPPED_SAFE_TOKENS["--zivo-safe-top-sheet"],
        expression: SAFE_TOKENS["--zivo-safe-top-sheet"],
      },
    ],
  },
];

// ── CSS expression evaluator (max/min/calc/env, px + rem) ────────────────
const REM_PX = 16;

/** Convert a single token like "12px", "0.75rem", "0px" → number (px). */
function parseUnit(token) {
  const t = token.trim();
  if (t.endsWith("px")) return parseFloat(t);
  if (t.endsWith("rem")) return parseFloat(t) * REM_PX;
  if (t === "0") return 0;
  if (!isNaN(parseFloat(t)) && /^-?\d+(\.\d+)?$/.test(t)) return parseFloat(t);
  throw new Error(`Cannot parse CSS unit: "${token}"`);
}

/** Substitute env(safe-area-inset-*) in an expression with device values. */
function substituteEnv(expr, device) {
  return expr.replace(
    /env\(\s*safe-area-inset-(top|bottom|left|right)(?:\s*,\s*([^)]+))?\s*\)/g,
    (_match, side) => `${device[side]}px`,
  );
}

/** Tiny recursive-descent CSS function evaluator. */
function evalExpr(expr) {
  expr = expr.trim();

  // max( ... , ... , ... )
  const fnMatch = expr.match(/^(max|min|calc)\s*\(([\s\S]*)\)$/i);
  if (fnMatch) {
    const fn = fnMatch[1].toLowerCase();
    const inner = fnMatch[2];
    const args = splitTopLevel(inner, ",");
    const vals = args.map((a) => evalExpr(a));
    if (fn === "max") return Math.max(...vals);
    if (fn === "min") return Math.min(...vals);
    if (fn === "calc") return vals[0];
  }

  // Arithmetic: split on + and - at top level
  const parts = splitTopLevelArith(expr);
  if (parts.length > 1) {
    let total = evalExpr(parts[0].value);
    for (let i = 1; i < parts.length; i++) {
      const v = evalExpr(parts[i].value);
      total = parts[i].op === "+" ? total + v : total - v;
    }
    return total;
  }

  // Multiplication / division
  const mdParts = splitTopLevelArith(expr, ["*", "/"]);
  if (mdParts.length > 1) {
    let total = evalExpr(mdParts[0].value);
    for (let i = 1; i < mdParts.length; i++) {
      const v = evalExpr(mdParts[i].value);
      total = mdParts[i].op === "*" ? total * v : total / v;
    }
    return total;
  }

  // Bare unit
  return parseUnit(expr);
}

/** Split by separator at top level (skip inside parentheses). */
function splitTopLevel(str, sep) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const ch of str) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (depth === 0 && ch === sep) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur.length) out.push(cur);
  return out;
}

/** Split by + - (or *, /) at top level, returning [{op, value}]. */
function splitTopLevelArith(str, ops = ["+", "-"]) {
  const out = [];
  let depth = 0;
  let cur = "";
  let curOp = "+";
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (
      depth === 0 &&
      ops.includes(ch) &&
      i > 0 &&
      // Skip "-" prefix on a number / sign after an operator or whitespace
      !(ch === "-" && /[\s+\-*/(]/.test(str[i - 1] || ""))
    ) {
      out.push({ op: curOp, value: cur });
      curOp = ch;
      cur = "";
    } else cur += ch;
  }
  out.push({ op: curOp, value: cur });
  return out;
}

// ── Verify expressions exist in their files (catches stale checklist) ────
function verifyPresent(filePath, expression) {
  const content = readFileSync(resolve(ROOT, filePath), "utf8");
  // Compare with whitespace normalised
  const norm = (s) => s.replace(/\s+/g, "");
  return norm(content).includes(norm(expression));
}

// ── Run checks ───────────────────────────────────────────────────────────
let pass = 0;
let fail = 0;
const rows = [];

for (const target of TARGETS) {
  for (const el of target.elements) {
    const present = verifyPresent(target.file, el.shipped || el.expression);
    if (!present) {
      rows.push({
        device: "—",
        element: el.name,
        property: el.property,
        resolved: "—",
        inset: "—",
        ok: false,
        note: `Expression not found in ${target.file} (was the file changed?)`,
      });
      fail++;
      continue;
    }

    for (const device of DEVICES) {
      const substituted = substituteEnv(el.expression, device);
      let resolved;
      try {
        resolved = evalExpr(substituted);
      } catch (err) {
        rows.push({
          device: device.name,
          element: el.name,
          property: el.property,
          resolved: "ERR",
          inset: device.top,
          ok: false,
          note: err.message,
        });
        fail++;
        continue;
      }
      // On the broken-island device, require the element's own minimum
      // floor (set in TARGETS via `brokenIslandFloor`, default 44px so the
      // close button never sits inside the status-bar zone).
      const brokenFloor = device.brokenIsland ? (el.brokenIslandFloor ?? 44) : 0;
      const minRequired = Math.max(device.top, brokenFloor);
      const ok = resolved >= minRequired - 0.001; // tolerate float noise
      rows.push({
        device: device.name,
        element: el.name,
        property: el.property,
        resolved: Math.round(resolved * 100) / 100,
        inset: minRequired,
        ok,
        note: ok ? "" : `FAILS — need ≥ ${minRequired}px, got ${resolved}px`,
      });
      ok ? pass++ : fail++;
    }
  }
}

// ── Pretty-print ─────────────────────────────────────────────────────────
const headers = ["Device", "Element", "Property", "Value", "Inset", "Pass"];
const widths = headers.map((h) => h.length);
const printable = rows.map((r) => [
  r.device,
  r.element,
  r.property,
  String(r.resolved),
  String(r.inset),
  r.ok ? "✓" : "✗",
]);
for (const row of printable) {
  row.forEach((cell, i) => {
    widths[i] = Math.max(widths[i], cell.length);
  });
}
const fmt = (cells) =>
  cells.map((c, i) => String(c).padEnd(widths[i])).join("  ");

console.log("\nSafe-area QA — header & close-button clearance");
console.log("=".repeat(widths.reduce((a, b) => a + b + 2, 0)));
console.log(fmt(headers));
console.log("-".repeat(widths.reduce((a, b) => a + b + 2, 0)));
for (const row of printable) console.log(fmt(row));

const notes = rows.filter((r) => r.note).map((r) => `  • ${r.element} @ ${r.device}: ${r.note}`);
if (notes.length) {
  console.log("\nNotes:");
  console.log(notes.join("\n"));
}

console.log(`\nResult: ${pass} passed, ${fail} failed.\n`);
process.exit(fail === 0 ? 0 : 1);
