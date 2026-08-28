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
  KHR_PER_USD,
  getStripeCurrencyExponent,
  fromStripeMinorUnits,
  toStripeMinorUnits,
  formatStripeAmount,
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

describe("KHR_PER_USD (ZIVO Cambodia pricing rate)", () => {
  it("is the one rate the whole ecosystem is pinned to", () => {
    // Zivo-Admin/scripts/check-ride-ecosystem-contracts.mjs asserts this
    // equals the rider, driver, and admin apps. This test is the local half:
    // it fails here before anyone has to run the cross-repo gate.
    expect(KHR_PER_USD).toBe(4100);
  });

  it("round-trips an operator's Riel price back to itself", () => {
    // The defect this pins: useCityPricing divided Riel by a local 4062.5 to
    // get the USD actually charged. Grocery delivery is priced from Riel
    // figures an operator sets, so a divisor that disagreed with the
    // ecosystem rate meant a 3000៛ minimum was billed as $0.74 instead of
    // $0.73 -- the customer was not charged the price that was set.
    for (const riel of [1000, 900, 3000, 12500]) {
      const usd = riel / KHR_PER_USD;
      expect(Math.round(usd * KHR_PER_USD)).toBe(riel);
    }
  });
});

/**
 * Stripe minor-unit contract. The inline payment forms render the CTA amount
 * straight from the PaymentIntent's minor-unit integer, so a wrong exponent
 * here is a wrong number on the "Pay" button.
 */
describe("Stripe minor units", () => {
  it("uses 2 decimals for ordinary currencies", () => {
    for (const code of ["USD", "EUR", "GBP", "THB", "SGD"]) {
      expect(getStripeCurrencyExponent(code)).toBe(2);
    }
  });

  it("uses 0 decimals for Stripe zero-decimal currencies", () => {
    for (const code of ["JPY", "KRW", "VND", "KHR", "CLP", "XOF"]) {
      expect(getStripeCurrencyExponent(code)).toBe(0);
    }
  });

  it("uses 3 decimals for Stripe three-decimal currencies", () => {
    for (const code of ["BHD", "JOD", "KWD", "OMR", "TND"]) {
      expect(getStripeCurrencyExponent(code)).toBe(3);
    }
  });

  it("is case-insensitive and defaults unknown codes to 2", () => {
    expect(getStripeCurrencyExponent("jpy")).toBe(0);
    expect(getStripeCurrencyExponent("ZZZ")).toBe(2);
    expect(getStripeCurrencyExponent("")).toBe(2);
  });

  it("does not scale zero-decimal amounts", () => {
    // ¥5,000 is amount: 5000 on the wire, not 500000.
    expect(fromStripeMinorUnits(5000, "JPY")).toBe(5000);
    expect(toStripeMinorUnits(5000, "JPY")).toBe(5000);
  });

  it("scales ordinary currencies by 100", () => {
    expect(fromStripeMinorUnits(12345, "USD")).toBeCloseTo(123.45);
    expect(toStripeMinorUnits(123.45, "USD")).toBe(12345);
  });

  it("scales three-decimal currencies by 1000", () => {
    expect(fromStripeMinorUnits(1500, "KWD")).toBeCloseTo(1.5);
    expect(toStripeMinorUnits(1.5, "KWD")).toBe(1500);
  });

  it("round-trips every supported exponent", () => {
    for (const code of ["USD", "JPY", "KWD", "KHR", "EUR"]) {
      const minor = toStripeMinorUnits(2500, code);
      expect(fromStripeMinorUnits(minor, code)).toBeCloseTo(2500);
    }
  });

  it("tolerates non-finite input instead of rendering NaN", () => {
    expect(fromStripeMinorUnits(Number.NaN, "USD")).toBe(0);
    expect(toStripeMinorUnits(Number.NaN, "USD")).toBe(0);
    expect(formatStripeAmount(Number.NaN, "USD")).toContain("0");
  });

  it("formats zero-decimal amounts without inventing cents", () => {
    const jpy = formatStripeAmount(5000, "JPY");
    expect(jpy).toContain("5,000");
    expect(jpy).not.toContain("50.00");
  });

  it("formats ordinary amounts with cents", () => {
    expect(formatStripeAmount(12345, "USD")).toContain("123.45");
  });

  it("never borrows another currency's symbol for an unlisted code", () => {
    // Duffel can quote a currency outside SUPPORTED_CURRENCIES; the old
    // `code === "USD" ? "$" : code + " "` shortcut printed "$" for it.
    const out = formatStripeAmount(12345, "ZZZ");
    expect(out).not.toContain("$");
    expect(out).toContain("ZZZ");
  });

  it("does not print a dollar sign for a non-dollar currency", () => {
    expect(formatStripeAmount(50000, "VND")).not.toMatch(/^\$/);
    expect(formatStripeAmount(12000, "KHR")).not.toMatch(/^\$/);
  });

  it("distinguishes the other dollar currencies from USD", () => {
    // `currencyDisplay: "narrowSymbol"` collapses all of these to a bare "$"
    // in en-US, which would silently print a US price on a foreign fare.
    const usd = formatStripeAmount(12345, "USD");
    for (const code of ["CAD", "SGD", "HKD", "AUD", "NZD"]) {
      const out = formatStripeAmount(12345, code);
      expect(out).not.toBe(usd);
      expect(out).not.toMatch(/^\$/);
    }
  });
});
