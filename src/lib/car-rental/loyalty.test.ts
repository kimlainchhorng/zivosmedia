/**
 * Contract tests for getLoyaltyTier — the pure car-rental loyalty-tier resolver.
 *
 * Expected values are grounded by an independent oracle that does NOT import the
 * module: a clean-room reimplementation re-derived from the documented tier system
 * ("based purely on lifetime total_rentals", thresholds 0/1/5/15/30) and the JS
 * `Math.max(0, x | 0)` clamp/truncation (bitwise-OR-zero is a shared JS primitive
 * that truncates toward zero and clamps via Math.max).
 *
 * LOAD-BEARING, non-obvious contracts pinned:
 *   - tier boundaries are INCLUSIVE lower bounds (1 -> bronze, 5 -> silver,
 *     15 -> gold, 30 -> platinum); 0 -> none;
 *   - the input is TRUNCATED toward zero (14.9 -> silver, not gold) and CLAMPED at
 *     0 (negative / NaN -> none), never rounded up;
 *   - rentalsToNext counts up to the NEXT tier's min from the clamped value, and the
 *     top tier (platinum) has rentalsToNext === null and nextLabel === null.
 *
 * The presentational fields (className / emoji) are intentionally NOT pinned to
 * exact values — only their presence is smoke-checked — so badge restyling does not
 * churn this suite.
 */
import { describe, it, expect } from "vitest";
import { getLoyaltyTier } from "./loyalty";

const behavioral = (totalRentals: number) => {
  const r = getLoyaltyTier(totalRentals);
  return {
    tier: r.tier,
    label: r.label,
    rentalsToNext: r.rentalsToNext,
    nextLabel: r.nextLabel,
  };
};

describe("getLoyaltyTier — inclusive tier boundaries", () => {
  it("0 rentals is 'none' and needs 1 more for bronze", () => {
    expect(behavioral(0)).toEqual({ tier: "none", label: "New", rentalsToNext: 1, nextLabel: "Bronze" });
  });

  it("1 rental crosses into bronze (boundary)", () => {
    expect(behavioral(1)).toEqual({ tier: "bronze", label: "Bronze", rentalsToNext: 4, nextLabel: "Silver" });
  });

  it("4 rentals is still bronze (one short of silver)", () => {
    expect(behavioral(4)).toEqual({ tier: "bronze", label: "Bronze", rentalsToNext: 1, nextLabel: "Silver" });
  });

  it("5 rentals crosses into silver (boundary)", () => {
    expect(behavioral(5)).toEqual({ tier: "silver", label: "Silver", rentalsToNext: 10, nextLabel: "Gold" });
  });

  it("14 rentals is still silver (one short of gold)", () => {
    expect(behavioral(14)).toEqual({ tier: "silver", label: "Silver", rentalsToNext: 1, nextLabel: "Gold" });
  });

  it("15 rentals crosses into gold (boundary)", () => {
    expect(behavioral(15)).toEqual({ tier: "gold", label: "Gold", rentalsToNext: 15, nextLabel: "Platinum" });
  });

  it("29 rentals is still gold (one short of platinum)", () => {
    expect(behavioral(29)).toEqual({ tier: "gold", label: "Gold", rentalsToNext: 1, nextLabel: "Platinum" });
  });

  it("30 rentals is platinum — the top tier, no next", () => {
    expect(behavioral(30)).toEqual({ tier: "platinum", label: "Platinum", rentalsToNext: null, nextLabel: null });
  });

  it("100 rentals stays platinum (still the top tier)", () => {
    expect(behavioral(100)).toEqual({ tier: "platinum", label: "Platinum", rentalsToNext: null, nextLabel: null });
  });
});

describe("getLoyaltyTier — truncation toward zero (never rounds up)", () => {
  it("4.9 truncates to 4 -> bronze", () => {
    expect(behavioral(4.9)).toEqual({ tier: "bronze", label: "Bronze", rentalsToNext: 1, nextLabel: "Silver" });
  });

  it("14.9 truncates to 14 -> silver, NOT gold", () => {
    expect(behavioral(14.9)).toEqual({ tier: "silver", label: "Silver", rentalsToNext: 1, nextLabel: "Gold" });
  });

  it("0.9 truncates to 0 -> none", () => {
    expect(behavioral(0.9)).toEqual({ tier: "none", label: "New", rentalsToNext: 1, nextLabel: "Bronze" });
  });
});

describe("getLoyaltyTier — clamp at zero (negative / NaN -> none)", () => {
  it("-5 clamps to 0 -> none", () => {
    expect(behavioral(-5)).toEqual({ tier: "none", label: "New", rentalsToNext: 1, nextLabel: "Bronze" });
  });

  it("NaN coerces to 0 -> none", () => {
    expect(behavioral(NaN)).toEqual({ tier: "none", label: "New", rentalsToNext: 1, nextLabel: "Bronze" });
  });
});

describe("getLoyaltyTier — presentational fields present (not value-pinned)", () => {
  it("every tier carries a non-empty className and emoji", () => {
    for (const n of [0, 1, 5, 15, 30]) {
      const r = getLoyaltyTier(n);
      expect(typeof r.className).toBe("string");
      expect(r.className.length).toBeGreaterThan(0);
      expect(typeof r.emoji).toBe("string");
      expect(r.emoji.length).toBeGreaterThan(0);
    }
  });
});
