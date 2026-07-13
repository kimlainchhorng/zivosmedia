/**
 * Contract tests for the pure exports of formatCount.ts — formatCount and
 * commentsLinkLabel.
 *
 * Expected values are grounded by an independent oracle that does NOT import the
 * module: a clean-room reimplementation re-derived from the documented thresholds
 * (0/null -> null; <1000 floored; 1k..9.9k one-decimal with a trailing ".0"
 * stripped; 10k..999k floored "k"; 1M..9.9M one-decimal "M"; 10M+ floored "M").
 * Number.isFinite / Math.floor / Number.prototype.toFixed / String / RegExp are
 * shared JS primitives; this vitest run against the real module is the cross-check.
 *
 * LOAD-BEARING, non-obvious contracts pinned:
 *   - 0 / null / undefined / negative / NaN / Infinity -> null;
 *   - <1000 is FLOORED (999.9 -> "999"), never rounded;
 *   - the k/M one-decimal branches strip a trailing ".0", so 1000 -> "1k"
 *     (not "1.0k"), and toFixed(1) ROUNDS: 1990 -> "2k";
 *   - the rounding runs on the IEEE-754 double, so 9950/1000 = 9.9499... ->
 *     "9.9k" (NOT "10k"), whereas 9999 -> "10k" and 9_999_999 -> "10M";
 *   - the floored k/M branches truncate: 999999 -> "999k", 123_456_789 -> "123M";
 *   - commentsLinkLabel uses a singular for exactly 1 and "" for <= 0.
 */
import { describe, it, expect } from "vitest";
import { formatCount, commentsLinkLabel } from "./formatCount";

describe("formatCount — falsy / invalid inputs", () => {
  it("returns null for 0, null, undefined, negative, NaN, Infinity", () => {
    expect(formatCount(0)).toBeNull();
    expect(formatCount(null)).toBeNull();
    expect(formatCount(undefined)).toBeNull();
    expect(formatCount(-5)).toBeNull();
    expect(formatCount(NaN)).toBeNull();
    expect(formatCount(Infinity)).toBeNull();
  });
});

describe("formatCount — under 1000 is floored", () => {
  it("renders the integer part", () => {
    expect(formatCount(1)).toBe("1");
    expect(formatCount(999)).toBe("999");
    expect(formatCount(999.9)).toBe("999");
  });
});

describe("formatCount — thousands (one-decimal, .0 stripped)", () => {
  it("strips a trailing .0 (1000 -> '1k', not '1.0k')", () => {
    expect(formatCount(1000)).toBe("1k");
  });

  it("keeps one decimal", () => {
    expect(formatCount(1200)).toBe("1.2k");
  });

  it("rounds via toFixed (1990 -> '2k')", () => {
    expect(formatCount(1990)).toBe("2k");
  });

  it("floors on the float representation (9950 -> '9.9k', NOT '10k')", () => {
    expect(formatCount(9950)).toBe("9.9k");
  });

  it("rounds up to the k-boundary (9999 -> '10k')", () => {
    expect(formatCount(9999)).toBe("10k");
  });
});

describe("formatCount — ten-thousands to under a million (floored k)", () => {
  it("truncates to whole k", () => {
    expect(formatCount(10_000)).toBe("10k");
    expect(formatCount(12_000)).toBe("12k");
    expect(formatCount(999_999)).toBe("999k");
  });
});

describe("formatCount — millions (one-decimal, .0 stripped)", () => {
  it("strips a trailing .0 (1_000_000 -> '1M')", () => {
    expect(formatCount(1_000_000)).toBe("1M");
  });

  it("keeps one decimal", () => {
    expect(formatCount(1_200_000)).toBe("1.2M");
  });

  it("rounds up to the M-boundary (9_999_999 -> '10M')", () => {
    expect(formatCount(9_999_999)).toBe("10M");
  });
});

describe("formatCount — ten-million and up (floored M)", () => {
  it("truncates to whole M", () => {
    expect(formatCount(10_000_000)).toBe("10M");
    expect(formatCount(12_000_000)).toBe("12M");
    expect(formatCount(123_456_789)).toBe("123M");
  });
});

describe("commentsLinkLabel", () => {
  it("returns '' for 0 or negative", () => {
    expect(commentsLinkLabel(0)).toBe("");
    expect(commentsLinkLabel(-1)).toBe("");
  });

  it("uses the singular for exactly 1", () => {
    expect(commentsLinkLabel(1)).toBe("View 1 comment");
  });

  it("uses the plural with a formatted count above 1", () => {
    expect(commentsLinkLabel(2)).toBe("View all 2 comments");
    expect(commentsLinkLabel(1200)).toBe("View all 1.2k comments");
    expect(commentsLinkLabel(1_000_000)).toBe("View all 1M comments");
  });
});
