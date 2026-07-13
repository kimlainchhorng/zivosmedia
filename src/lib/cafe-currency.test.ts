/**
 * Contract tests for cafe-currency.ts — the pure currency formatter. The DB stores
 * amounts in the smallest unit ("cents") plus an ISO-4217 code; formatCafeMoney turns
 * that into a display string and getCurrencyInfo resolves the symbol/decimals/placement.
 *
 * Load-bearing behaviors pinned here, anchored to an independent oracle that does NOT
 * import the module (and computes thousands-grouping by a manual loop rather than the
 * module's regex, so the two must agree): 2-decimal codes divide by 100 and group with
 * commas; zero-decimal codes (JPY/KHR/VND) take the smallest unit as 1 of the currency
 * with no division; KHR/VND render the symbol AFTER with a space; codes are matched
 * case-insensitively; and an unknown code falls back to "<CODE> " (uppercased, trailing
 * space) at 2 decimals. The dollar/cent expectations are external arithmetic facts.
 */
import { describe, it, expect } from "vitest";
import { formatCafeMoney, getCurrencyInfo, SUPPORTED_CURRENCY_CODES } from "./cafe-currency";

describe("formatCafeMoney — 2-decimal currencies", () => {
  it("divides by 100 and defaults to USD", () => {
    expect(formatCafeMoney(4500)).toBe("$45.00");
    expect(formatCafeMoney(4500, "USD")).toBe("$45.00");
    expect(formatCafeMoney(0, "USD")).toBe("$0.00");
    expect(formatCafeMoney(2550, "EUR")).toBe("€25.50");
  });

  it("inserts comma thousands separators", () => {
    expect(formatCafeMoney(100000, "USD")).toBe("$1,000.00");
    expect(formatCafeMoney(123456789, "USD")).toBe("$1,234,567.89");
  });
});

describe("formatCafeMoney — zero-decimal currencies", () => {
  it("treats the smallest unit as 1 of the currency (no division)", () => {
    expect(formatCafeMoney(4500, "JPY")).toBe("¥4,500");
  });

  it("renders KHR/VND symbol-after with a space", () => {
    expect(formatCafeMoney(4500, "KHR")).toBe("4,500 ៛");
    expect(formatCafeMoney(4500000, "KHR")).toBe("4,500,000 ៛");
    expect(formatCafeMoney(25000, "VND")).toBe("25,000 ₫");
  });
});

describe("formatCafeMoney — case-insensitivity and unknown codes", () => {
  it("matches codes case-insensitively", () => {
    expect(formatCafeMoney(1050, "usd")).toBe("$10.50");
  });

  it("falls back to an uppercased '<CODE> ' prefix at 2 decimals", () => {
    expect(formatCafeMoney(1050, "btc")).toBe("BTC 10.50");
  });
});

describe("getCurrencyInfo", () => {
  it("resolves known codes (case-insensitive) and an unknown fallback", () => {
    expect(getCurrencyInfo("usd")).toEqual({ symbol: "$", decimals: 2 });
    expect(getCurrencyInfo("KHR")).toEqual({ symbol: "៛", decimals: 0, symbolAfter: true });
    expect(getCurrencyInfo("XYZ")).toEqual({ symbol: "XYZ ", decimals: 2 });
  });

  it("exposes a stable supported-code list including USD and KHR", () => {
    expect(SUPPORTED_CURRENCY_CODES).toContain("USD");
    expect(SUPPORTED_CURRENCY_CODES).toContain("KHR");
    expect(SUPPORTED_CURRENCY_CODES.length).toBe(20);
  });
});
