import { describe, it, expect } from "vitest";
import { computeDocTotals, normalizeTaxRate, lineNet } from "./taxCalc";

describe("normalizeTaxRate", () => {
  it("clamps to 0–100 and parses strings", () => {
    expect(normalizeTaxRate("8.25")).toBe(8.25);
    expect(normalizeTaxRate(-5)).toBe(0);
    expect(normalizeTaxRate(150)).toBe(100);
    expect(normalizeTaxRate("abc")).toBe(0);
    expect(normalizeTaxRate(null)).toBe(0);
  });
});

describe("computeDocTotals", () => {
  it("applies a flat tax to the post-discount subtotal", () => {
    const items = [
      { category: "labor", hours: 2, price: 100 },      // 200
      { category: "part", qty: 1, price: 50 },          // 50
    ];
    const t = computeDocTotals(items, 8);
    expect(t.subtotal).toBe(250);
    expect(t.discount).toBe(0);
    expect(t.preTax).toBe(250);
    expect(t.tax).toBeCloseTo(20, 5);   // 8% of 250
    expect(t.total).toBeCloseTo(270, 5);
  });

  it("taxes the amount AFTER discounts", () => {
    const items = [
      { category: "part", qty: 1, price: 100, discount: 10, discountType: "pct" as const }, // net 90
    ];
    const t = computeDocTotals(items, 10);
    expect(t.subtotal).toBe(100);
    expect(t.discount).toBe(10);
    expect(t.preTax).toBe(90);
    expect(t.tax).toBeCloseTo(9, 5);    // 10% of 90, not of 100
    expect(t.total).toBeCloseTo(99, 5);
  });

  it("rounds tax to whole cents", () => {
    const items = [{ category: "diagnosis", price: 33.33 }];
    const t = computeDocTotals(items, 8.25); // 33.33 * 8.25% = 2.749725 -> 2.75
    expect(t.tax).toBe(2.75);
    expect(Math.round(t.tax * 100)).toBe(275);
  });

  it("is zero tax when rate is 0", () => {
    const t = computeDocTotals([{ category: "part", qty: 2, price: 25 }], 0);
    expect(t.tax).toBe(0);
    expect(t.total).toBe(50);
  });

  it("lineNet never goes negative for over-discount", () => {
    expect(lineNet({ category: "part", qty: 1, price: 20, discount: 50, discountType: "amt" })).toBe(0);
  });
});
