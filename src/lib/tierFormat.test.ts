/**
 * Contract tests for tierFormat — the money-facing helpers that render a creator
 * subscription tier's price. formatTierPrice is the load-bearing one: it picks the
 * billing-interval suffix (/mo, /3mo, /6mo, /yr, " one-time"), formats cents to a
 * 2-dp dollar string, and applies precedence rules — is_free short-circuits to "Free"
 * (even when a price is present), a missing/null billing_interval defaults to month,
 * and is_custom_price switches the prefix to "From $". monthlyEquivalent renders the
 * blended per-month price for multi-month plans and returns null where it'd be
 * meaningless (monthly or lifetime).
 *
 * The dollar formatting was cross-checked by an independent oracle: an integer-cents
 * reference (floor(cents/100) "." pad(cents%100)) was shown to agree with the module's
 * (cents/100).toFixed(2) float path across a wide range, so rounding isn't validated
 * against itself. toFixed is locale-independent, so these assertions are stable.
 */
import { describe, it, expect } from "vitest";
import { formatTierPrice, monthlyEquivalent } from "./tierFormat";

describe("formatTierPrice", () => {
  it("short-circuits to Free when is_free, even with a price set", () => {
    expect(formatTierPrice({ is_free: true })).toBe("Free");
    expect(formatTierPrice({ is_free: true, price_cents: 999 })).toBe("Free");
  });

  it("formats cents with the interval-specific suffix", () => {
    expect(formatTierPrice({ price_cents: 999, billing_interval: "month" })).toBe("$9.99/mo");
    expect(formatTierPrice({ price_cents: 2499, billing_interval: "year" })).toBe("$24.99/yr");
    expect(formatTierPrice({ price_cents: 5000, billing_interval: "6_months" })).toBe("$50.00/6mo");
    expect(formatTierPrice({ price_cents: 10000, billing_interval: "lifetime" })).toBe("$100.00 one-time");
  });

  it("uses the 'From $' prefix for custom pricing", () => {
    expect(formatTierPrice({ price_cents: 1500, is_custom_price: true })).toBe("From $15.00/mo");
  });

  it("defaults a missing/null interval to month and a missing price to $0.00", () => {
    expect(formatTierPrice({ price_cents: 999 })).toBe("$9.99/mo");
    expect(formatTierPrice({ price_cents: 999, billing_interval: null })).toBe("$9.99/mo");
    expect(formatTierPrice({})).toBe("$0.00/mo");
  });
});

describe("monthlyEquivalent", () => {
  it("computes the blended per-month price for multi-month plans", () => {
    expect(monthlyEquivalent(2400, "year")).toBe("≈ $2.00/mo");
    expect(monthlyEquivalent(3000, "3_months")).toBe("≈ $10.00/mo");
    expect(monthlyEquivalent(6000, "6_months")).toBe("≈ $10.00/mo");
    expect(monthlyEquivalent(1000, "3_months")).toBe("≈ $3.33/mo"); // rounds to 2dp
  });

  it("returns null where a per-month figure is meaningless", () => {
    expect(monthlyEquivalent(999, "month")).toBeNull();
    expect(monthlyEquivalent(10000, "lifetime")).toBeNull();
  });
});
