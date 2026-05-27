/**
 * Safe-area CSS expression evaluator.
 *
 * Mirrors the browser's resolution of `max(...)`, `min(...)`, `calc(...)`,
 * `env(safe-area-inset-*)`, and `px` / `rem` units, so we can verify that
 * inline `style={{ ... }}` rules in our sheets/headers always clear the
 * device's safe-area inset on notched / cutout / tablet profiles.
 *
 * Used by:
 *  - Vitest suite (`SwipeableSheet.safeArea.test.tsx`) — true in-component
 *    assertions on real DOM nodes.
 *  - Static QA script (`scripts/qa/safe-area-check.mjs`) — CI guard that
 *    scans for stale expressions across the codebase.
 */

export interface DeviceProfile {
  name: string;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** Notched / cutout / tablet profiles we guarantee clearance on. */
export const NOTCHED_DEVICES: DeviceProfile[] = [
  { name: "iPhone 15 Pro", top: 59, bottom: 34, left: 0, right: 0 },
  { name: "iPhone 14 Pro Max", top: 59, bottom: 34, left: 0, right: 0 },
  { name: "Pixel 8 Pro", top: 32, bottom: 24, left: 0, right: 0 },
  { name: "Galaxy S24 Ultra", top: 36, bottom: 18, left: 0, right: 0 },
  {
    name: "iPad Pro 11 landscape",
    top: 24,
    bottom: 20,
    left: 20,
    right: 20,
  },
];

const REM_PX = 16;

/** Convert a single token like "12px", "0.75rem", "0px" → number (px). */
function parseUnit(token: string): number {
  const t = token.trim();
  if (t === "" || t === "0") return 0;
  if (t.endsWith("px")) return parseFloat(t);
  if (t.endsWith("rem")) return parseFloat(t) * REM_PX;
  if (/^-?\d+(\.\d+)?$/.test(t)) return parseFloat(t);
  throw new Error(`Cannot parse CSS unit: "${token}"`);
}

/**
 * Resolve known `--zivo-safe-top-*` design tokens to the underlying CSS
 * expression they represent in `src/index.css`. Keep this map in sync with
 * the `:root` declarations in that file.
 */
const ZIVO_SAFE_TOKENS: Record<string, string> = {
  "--zivo-safe-top": "env(safe-area-inset-top, 0px)",
  "--zivo-safe-bottom": "env(safe-area-inset-bottom, 0px)",
  "--zivo-safe-top-overlay": "max(env(safe-area-inset-top, 0px), 60px)",
  "--zivo-safe-top-sheet": "max(env(safe-area-inset-top, 0px), 44px)",
  "--zivo-safe-top-sticky":
    "max(calc(env(safe-area-inset-top, 0px) + 0.625rem), 48px)",
};

function substituteVars(expr: string): string {
  return expr.replace(/var\(\s*(--[a-z0-9-]+)(?:\s*,\s*[^)]+)?\s*\)/gi, (_m, name) => {
    const repl = ZIVO_SAFE_TOKENS[name];
    return repl != null ? repl : "0px";
  });
}

/** Substitute every env(safe-area-inset-*) in expr with the device's value. */
function substituteEnv(expr: string, device: DeviceProfile): string {
  return expr.replace(
    /env\(\s*safe-area-inset-(top|bottom|left|right)(?:\s*,\s*[^)]+)?\s*\)/g,
    (_match, side: keyof Omit<DeviceProfile, "name">) =>
      `${device[side]}px`,
  );
}

/** Split string by separator at top level (skip parenthesised groups). */
function splitTopLevel(str: string, sep: string): string[] {
  const out: string[] = [];
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

interface ArithPart {
  op: "+" | "-" | "*" | "/";
  value: string;
}

/** Split by + - (or * /) at top level, returning [{op, value}]. */
function splitTopLevelArith(
  str: string,
  ops: Array<"+" | "-" | "*" | "/"> = ["+", "-"],
): ArithPart[] {
  const out: ArithPart[] = [];
  let depth = 0;
  let cur = "";
  let curOp: ArithPart["op"] = "+";
  for (let i = 0; i < str.length; i++) {
    const ch = str[i] as ArithPart["op"];
    if (ch === ("(" as never)) depth++;
    else if (ch === (")" as never)) depth--;
    if (
      depth === 0 &&
      (ops as string[]).includes(ch) &&
      i > 0 &&
      // Skip "-" that's actually a sign (after operator/whitespace/paren)
      !(ch === "-" && /[\s+\-*/(]/.test(str[i - 1] || ""))
    ) {
      out.push({ op: curOp, value: cur });
      curOp = ch;
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push({ op: curOp, value: cur });
  return out;
}

/** Evaluate a CSS length expression against a device profile → px number. */
export function evaluateCssExpression(
  rawExpr: string,
  device: DeviceProfile,
): number {
  const withVars = substituteVars(rawExpr);
  const expr = substituteEnv(withVars, device).trim();
  return evalInner(expr);
}

function evalInner(expr: string): number {
  const trimmed = expr.trim();

  // max(...) / min(...) / calc(...)
  const fnMatch = trimmed.match(/^(max|min|calc)\s*\(([\s\S]*)\)$/i);
  if (fnMatch) {
    const fn = fnMatch[1].toLowerCase();
    const inner = fnMatch[2];
    const args = splitTopLevel(inner, ",").map((a) => evalInner(a));
    if (fn === "max") return Math.max(...args);
    if (fn === "min") return Math.min(...args);
    if (fn === "calc") return args[0];
  }

  // Arithmetic: + / -
  const addParts = splitTopLevelArith(trimmed);
  if (addParts.length > 1) {
    let total = evalInner(addParts[0].value);
    for (let i = 1; i < addParts.length; i++) {
      const v = evalInner(addParts[i].value);
      total = addParts[i].op === "+" ? total + v : total - v;
    }
    return total;
  }

  // Multiplication / division
  const mdParts = splitTopLevelArith(trimmed, ["*", "/"]);
  if (mdParts.length > 1) {
    let total = evalInner(mdParts[0].value);
    for (let i = 1; i < mdParts.length; i++) {
      const v = evalInner(mdParts[i].value);
      total = mdParts[i].op === "*" ? total * v : total / v;
    }
    return total;
  }

  return parseUnit(trimmed);
}
