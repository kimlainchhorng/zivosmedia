/**
 * Direct contract tests for the safe-area CSS evaluator. The
 * SwipeableSheet suite uses this as a tool to assert DOM clearance, but
 * the evaluator's own semantics — calc/max/min, env() substitution,
 * design-token var() resolution, px / rem / negative numbers,
 * top-level arithmetic — weren't pinned anywhere. Regressions here
 * would silently let safe-area-clearing styles compute to the wrong
 * pixel value across notched devices.
 */
import { describe, it, expect } from "vitest";
import {
  evaluateCssExpression,
  NOTCHED_DEVICES,
  type DeviceProfile,
} from "./safeAreaEval";

const iPhone15Pro = NOTCHED_DEVICES.find((d) => d.name === "iPhone 15 Pro")!;
const iPad = NOTCHED_DEVICES.find((d) => d.name === "iPad Pro 11 landscape")!;
const zero: DeviceProfile = { name: "no-insets", top: 0, bottom: 0, left: 0, right: 0 };

describe("NOTCHED_DEVICES", () => {
  it("ships the canonical profiles the CI safe-area check guards against", () => {
    const names = NOTCHED_DEVICES.map((d) => d.name);
    expect(names).toContain("iPhone 15 Pro");
    expect(names).toContain("iPad Pro 11 landscape");
    expect(names.length).toBeGreaterThanOrEqual(5);
  });
});

describe("evaluateCssExpression — units", () => {
  it("parses bare numbers + px + rem (16px per rem)", () => {
    expect(evaluateCssExpression("0", zero)).toBe(0);
    expect(evaluateCssExpression("0px", zero)).toBe(0);
    expect(evaluateCssExpression("32px", zero)).toBe(32);
    expect(evaluateCssExpression("1rem", zero)).toBe(16);
    expect(evaluateCssExpression("0.5rem", zero)).toBe(8);
  });

  it("throws on unknown CSS units rather than silently coercing", () => {
    expect(() => evaluateCssExpression("10vh", zero)).toThrow(/Cannot parse CSS unit/);
  });
});

describe("evaluateCssExpression — env(safe-area-inset-*)", () => {
  it("substitutes each side from the device profile", () => {
    expect(evaluateCssExpression("env(safe-area-inset-top)", iPhone15Pro)).toBe(59);
    expect(evaluateCssExpression("env(safe-area-inset-bottom)", iPhone15Pro)).toBe(34);
    expect(evaluateCssExpression("env(safe-area-inset-left)", iPad)).toBe(20);
    expect(evaluateCssExpression("env(safe-area-inset-right)", iPad)).toBe(20);
  });

  it("uses the device value (not the fallback) when both are present", () => {
    // env(... , 0px) — fallback should be ignored when the device exposes a value.
    expect(evaluateCssExpression("env(safe-area-inset-top, 0px)", iPhone15Pro)).toBe(59);
  });
});

describe("evaluateCssExpression — max / min / calc", () => {
  it("max(env, fixed) returns the larger value", () => {
    // 60 > 59 → 60
    expect(evaluateCssExpression("max(env(safe-area-inset-top, 0px), 60px)", iPhone15Pro)).toBe(60);
    // 34 > 20 → 34
    expect(evaluateCssExpression("max(env(safe-area-inset-bottom, 0px), 20px)", iPhone15Pro)).toBe(34);
  });

  it("min(...) returns the smaller value", () => {
    expect(evaluateCssExpression("min(env(safe-area-inset-top, 0px), 30px)", iPhone15Pro)).toBe(30);
  });

  it("calc(env + rem) sums the env value with a rem unit", () => {
    // 59 + 0.625 * 16 = 59 + 10 = 69
    expect(
      evaluateCssExpression("calc(env(safe-area-inset-top, 0px) + 0.625rem)", iPhone15Pro),
    ).toBe(69);
  });

  it("handles the nested 'sticky' design pattern (max(calc(...), 48px))", () => {
    // calc(59 + 10) = 69, max(69, 48) → 69
    const onNotch = evaluateCssExpression(
      "max(calc(env(safe-area-inset-top, 0px) + 0.625rem), 48px)",
      iPhone15Pro,
    );
    expect(onNotch).toBe(69);
    // On a device with no inset: calc(0 + 10) = 10, max(10, 48) → 48
    const onZero = evaluateCssExpression(
      "max(calc(env(safe-area-inset-top, 0px) + 0.625rem), 48px)",
      zero,
    );
    expect(onZero).toBe(48);
  });
});

describe("evaluateCssExpression — arithmetic", () => {
  it("evaluates addition at the top level", () => {
    expect(evaluateCssExpression("10px + 5px", zero)).toBe(15);
    expect(evaluateCssExpression("calc(8px + 4px + 4px)", zero)).toBe(16);
  });

  it("evaluates */ at the top level", () => {
    expect(evaluateCssExpression("calc(8px * 2)", zero)).toBe(16);
    expect(evaluateCssExpression("calc(16px / 2)", zero)).toBe(8);
  });

  // Note: subtraction with whitespace (e.g. "10px - 5px") is NOT split as a
  // top-level operator because the parser treats "-" after whitespace as a
  // sign prefix. Safe-area tokens never use subtraction, so this is fine —
  // but a sibling expression evaluator with arbitrary calc() inputs would
  // need to relax that rule. Documented here so a future change is loud.
});

describe("evaluateCssExpression — var() design tokens", () => {
  it("resolves --zivo-safe-top to env(safe-area-inset-top)", () => {
    expect(evaluateCssExpression("var(--zivo-safe-top)", iPhone15Pro)).toBe(59);
  });

  it("resolves --zivo-safe-top-overlay (max env, 60px)", () => {
    // env=59 vs floor=60 → 60
    expect(evaluateCssExpression("var(--zivo-safe-top-overlay)", iPhone15Pro)).toBe(60);
    // On zero device: floor wins outright
    expect(evaluateCssExpression("var(--zivo-safe-top-overlay)", zero)).toBe(60);
  });

  it("resolves --zivo-safe-top-sticky (max(calc(env + 0.125rem), 64px))", () => {
    // Current design token: max(calc(env + 0.125rem), 64px).
    // iPhone 15 Pro: calc(59 + 2) = 61, floor wins → 64.
    expect(evaluateCssExpression("var(--zivo-safe-top-sticky)", iPhone15Pro)).toBe(64);
    expect(evaluateCssExpression("var(--zivo-safe-top-sticky)", zero)).toBe(64);
  });

  it("unknown vars resolve to 0px (defensive fallback)", () => {
    expect(evaluateCssExpression("var(--zivo-totally-not-a-real-token)", iPhone15Pro)).toBe(0);
    expect(evaluateCssExpression("calc(var(--nope) + 24px)", iPhone15Pro)).toBe(24);
  });
});
