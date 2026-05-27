/**
 * Contract tests for the currency utility. These ship in every price
 * surface (PPV, tips, store checkout, lodging), so silent regressions
 * here turn into wrong totals across the app.
 *
 * Intl.NumberFormat output varies subtly by runtime locale data, so
 * formatPrice / formatPriceParts assertions focus on what we control
 * (presence of the right components) rather than exact glyph output.
 */
import { describe, it, expect } from "vitest";
import {
  formatPrice,
  formatPriceParts,
  convertPrice,
  formatConvertedPrice,
  getPriceDisplay,
  parsePrice,
} from "./currency";

const RATES = { USD: 1, EUR: 0.5, JPY: 100, GBP: 2 };

describe("convertPrice", () => {
  it("is a no-op when source and target currencies match", () => {
    expect(convertPrice(123.45, "USD", "USD", RATES)).toBeCloseTo(123.45);
    expect(convertPrice(0, "EUR", "EUR", RATES)).toBe(0);
  });

  it("routes through USD: amount / fromRate * toRate", () => {
    // 10 EUR @ 0.5 -> 20 USD -> 2000 JPY @ 100
    expect(convertPrice(10, "EUR", "JPY", RATES)).toBeCloseTo(2000);
    // 200 JPY @ 100 -> 2 USD -> 1 EUR @ 0.5
    expect(convertPrice(200, "JPY", "EUR", RATES)).toBeCloseTo(1);
  });

  it("preserves the amount when an unknown currency falls back to rate=1", () => {
    // Unknown currency on either side defaults to 1, so 100 XYZ -> 100 USD.
    expect(convertPrice(100, "XYZ", "USD", RATES)).toBeCloseTo(100);
    expect(convertPrice(100, "USD", "XYZ", RATES)).toBeCloseTo(100);
  });

  it("handles zero amount without dividing by zero", () => {
    expect(convertPrice(0, "EUR", "JPY", RATES)).toBe(0);
  });
});

describe("parsePrice", () => {
  it("parses plain integers and decimals", () => {
    expect(parsePrice("42")).toBe(42);
    expect(parsePrice("3.14")).toBe(3.14);
  });

  it("handles US format with thousand separators", () => {
    expect(parsePrice("$1,234.56")).toBeCloseTo(1234.56);
    expect(parsePrice("1,000,000.00")).toBeCloseTo(1000000);
  });

  it("handles European format (1.234,56) when comma comes after dot", () => {
    expect(parsePrice("1.234,56")).toBeCloseTo(1234.56);
    expect(parsePrice("€1.234,56")).toBeCloseTo(1234.56);
  });

  it("distinguishes US thousands vs European decimal by position", () => {
    // "1,234" — could be ambiguous; treated as US thousands
    expect(parsePrice("1,234")).toBe(1234);
    // "12,34" — 2 digits after comma → European decimal
    expect(parsePrice("12,34")).toBeCloseTo(12.34);
  });

  it("strips currency symbols and whitespace", () => {
    expect(parsePrice(" $99.99 ")).toBeCloseTo(99.99);
    expect(parsePrice("¥1500")).toBe(1500);
  });

  it("returns 0 for unparseable input", () => {
    expect(parsePrice("")).toBe(0);
    expect(parsePrice("abc")).toBe(0);
  });
});

describe("formatPrice", () => {
  it("returns a non-empty string containing the digits", () => {
    expect(formatPrice(42.5, "USD")).toMatch(/42/);
    expect(formatPrice(1000, "EUR")).toMatch(/1.?000/); // either 1,000 or 1.000
  });

  it("renders zero as a valid formatted value", () => {
    expect(formatPrice(0, "USD")).toMatch(/0/);
  });

  it("defaults to USD when no currency code is provided", () => {
    expect(formatPrice(100)).toEqual(formatPrice(100, "USD"));
  });
});

describe("formatPriceParts", () => {
  it("returns symbol, amount, and formatted fields", () => {
    const parts = formatPriceParts(99.5, "USD");
    expect(parts.symbol.length).toBeGreaterThan(0);
    expect(parts.amount).toMatch(/99/);
    expect(parts.formatted.length).toBeGreaterThan(0);
  });

  it("formatted field round-trips through formatPrice", () => {
    expect(formatPriceParts(123.45, "USD").formatted).toBe(formatPrice(123.45, "USD"));
  });
});

describe("getPriceDisplay", () => {
  it("flags wasConverted when base and display currencies differ", () => {
    const r = getPriceDisplay(10, "EUR", "JPY", RATES);
    expect(r.wasConverted).toBe(true);
    expect(r.originalCurrency).toBe("EUR");
  });

  it("does not convert when base and display match", () => {
    const r = getPriceDisplay(10, "USD", "USD", RATES);
    expect(r.wasConverted).toBe(false);
    expect(r.formatted).toBe(formatPrice(10, "USD"));
  });

  it("converts before formatting using the supplied rates", () => {
    const converted = convertPrice(10, "EUR", "JPY", RATES);
    expect(getPriceDisplay(10, "EUR", "JPY", RATES).formatted).toBe(
      formatPrice(converted, "JPY"),
    );
  });
});

describe("formatConvertedPrice", () => {
  it("is equivalent to convert + format", () => {
    const a = formatConvertedPrice(50, "EUR", "USD", RATES);
    const b = formatPrice(convertPrice(50, "EUR", "USD", RATES), "USD");
    expect(a).toBe(b);
  });
});
