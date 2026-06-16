/**
 * Contract tests for flightPricing.ts — the all-pure flight fee calculator.
 *
 * Expected values are grounded by an independent oracle that does NOT import the module
 * and re-derives the documented fee structure clean-room (card processing 3.5%; ZIVO
 * booking fee = flat $10 below $100, else 5%; round-to-cent via parseFloat(toFixed(2))).
 * The LOAD-BEARING, non-obvious contract pinned here is the rounding-ORDER difference:
 *   - getAllInPrice rounds ONCE on the final sum;
 *   - calculateFlightPricing rounds each fee BEFORE summing,
 * so at $100.06 they disagree by a cent (108.57 vs 108.56).
 *
 * getStateTaxInfo is asserted only on behavior + externally-grounded facts (the default
 * fallback, case-insensitivity, and the four no-sales-tax states DE/MT/OR/NH at rate 0);
 * the per-state rate figures are module-owned data and deliberately left unpinned.
 */
import { describe, it, expect } from "vitest";
import {
  getStateTaxInfo,
  getAllInPrice,
  calculateFlightPricing,
  getStateOptions,
} from "./flightPricing";

describe("getAllInPrice (single final rounding)", () => {
  it("uses the flat $10 booking fee below $100", () => {
    expect(getAllInPrice(50)).toBe(61.75); // 50 + 1.75 card + 10 flat
    expect(getAllInPrice(99.99)).toBe(113.49);
  });

  it("uses the 5% booking fee at/above $100", () => {
    expect(getAllInPrice(100)).toBe(108.5); // 100 + 3.5 card + 5 fee
    expect(getAllInPrice(200)).toBe(217); // 200 + 7 card + 10? no -> 5% = 10
  });
});

describe("calculateFlightPricing (full breakdown)", () => {
  it("breaks down a sub-$100 fare with the flat fee", () => {
    expect(calculateFlightPricing(50, 1)).toEqual({
      baseFare: 50,
      taxesFeesCharges: 11.75,
      stateTax: 0,
      stateTaxRate: 0,
      stateTaxLabel: "",
      cardFee: 1.75,
      bookingFee: 10,
      totalPerPassenger: 61.75,
      totalAllPassengers: 61.75,
      passengers: 1,
      currency: "USD",
      duffelPrice: 50,
    });
  });

  it("breaks down a $100 fare with the 5% fee and multiplies by passengers", () => {
    expect(calculateFlightPricing(100, 2)).toEqual({
      baseFare: 100,
      taxesFeesCharges: 8.5,
      stateTax: 0,
      stateTaxRate: 0,
      stateTaxLabel: "",
      cardFee: 3.5,
      bookingFee: 5,
      totalPerPassenger: 108.5,
      totalAllPassengers: 217,
      passengers: 2,
      currency: "USD",
      duffelPrice: 100,
    });
  });

  it("defaults currency to USD and echoes a passed currency", () => {
    expect(calculateFlightPricing(200, 3).currency).toBe("USD");
    expect(calculateFlightPricing(200, 3).totalAllPassengers).toBe(651);
    expect(calculateFlightPricing(50, 1, "KHR").currency).toBe("KHR");
  });

  it("rounds each fee before summing, diverging from getAllInPrice by a cent at $100.06", () => {
    expect(calculateFlightPricing(100.06, 1).totalPerPassenger).toBe(108.56);
    expect(getAllInPrice(100.06)).toBe(108.57);
    expect(calculateFlightPricing(100.06, 1).totalPerPassenger).not.toBe(getAllInPrice(100.06));
  });
});

describe("getStateTaxInfo (behavior + real-world anchors)", () => {
  it("falls back to the estimated default for missing/unknown codes", () => {
    expect(getStateTaxInfo()).toEqual({ rate: 0.07, label: "Estimated" });
    expect(getStateTaxInfo("ZZ")).toEqual({ rate: 0.07, label: "Estimated" });
  });

  it("is case-insensitive", () => {
    expect(getStateTaxInfo("ca")).toEqual(getStateTaxInfo("CA"));
    expect(getStateTaxInfo("CA").label).toBe("California");
  });

  it("reports a 0 rate for the four no-sales-tax states", () => {
    expect(getStateTaxInfo("DE").rate).toBe(0);
    expect(getStateTaxInfo("MT").rate).toBe(0);
    expect(getStateTaxInfo("OR").rate).toBe(0);
    expect(getStateTaxInfo("NH").rate).toBe(0);
  });
});

describe("getStateOptions", () => {
  it("returns all 51 entries (50 states + DC), sorted by label", () => {
    const opts = getStateOptions();
    expect(opts).toHaveLength(51);
    expect(opts).toEqual([...opts].sort((a, b) => a.label.localeCompare(b.label)));
    expect(opts[0].label).toBe("Alabama");
    expect(opts[opts.length - 1].label).toBe("Wyoming");
    expect(opts.find((o) => o.code === "DC")?.label).toBe("Washington DC");
  });
});
