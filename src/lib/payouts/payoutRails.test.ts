/**
 * Contract tests for the multi-rail payout router. This decides HOW a host or
 * partner actually gets paid in each country — a regression (a country dropped
 * from a set, or the recommendedRail priority reordered) would silently
 * mis-route real money, so the routing matrix and priority order are pinned.
 */
import { describe, it, expect } from "vitest";
import {
  normalizeCountry,
  getAvailableRails,
  recommendedRail,
  RAIL_LABELS,
} from "./payoutRails";

describe("normalizeCountry", () => {
  it("upper-cases an existing 2-letter code", () => {
    expect(normalizeCountry("kh")).toBe("KH");
    expect(normalizeCountry("  us ")).toBe("US");
  });

  it("maps common typed country names to ISO codes", () => {
    expect(normalizeCountry("Cambodia")).toBe("KH");
    expect(normalizeCountry("USA")).toBe("US");
    expect(normalizeCountry("United States")).toBe("US");
    expect(normalizeCountry("Vietnam")).toBe("VN");
  });

  it("defaults unknown / empty input to US", () => {
    expect(normalizeCountry("Atlantis")).toBe("US");
    expect(normalizeCountry(undefined)).toBe("US");
    expect(normalizeCountry("")).toBe("US");
  });
});

describe("getAvailableRails", () => {
  it("US has every automated rail plus the always-on bank wire", () => {
    expect(getAvailableRails("US")).toEqual({
      stripe: true,
      aba: false,
      bank_wire: true,
      paypal: true,
      square: true,
      mercury: true,
    });
  });

  it("Cambodia routes to ABA/KHQR + bank wire only (no Stripe/PayPal)", () => {
    expect(getAvailableRails("KH")).toEqual({
      stripe: false,
      aba: true,
      bank_wire: true,
      paypal: false,
      square: false,
      mercury: false,
    });
  });

  it("Vietnam has PayPal as its only automated rail", () => {
    const vn = getAvailableRails("VN");
    expect(vn.paypal).toBe(true);
    expect(vn.stripe).toBe(false);
    expect(vn.aba).toBe(false);
    expect(vn.bank_wire).toBe(true);
  });

  it("bank wire is always available, even for an unknown country", () => {
    expect(getAvailableRails("ZZ").bank_wire).toBe(true);
  });
});

describe("recommendedRail", () => {
  it("prefers Stripe where supported", () => {
    expect(recommendedRail("US")).toBe("stripe");
    expect(recommendedRail("GB")).toBe("stripe");
  });

  it("uses ABA for Cambodia and PayPal for Vietnam", () => {
    expect(recommendedRail("KH")).toBe("aba");
    expect(recommendedRail("Cambodia")).toBe("aba");
    expect(recommendedRail("VN")).toBe("paypal");
  });

  it("falls back to bank wire for an unsupported country (e.g. Laos)", () => {
    expect(recommendedRail("LA")).toBe("bank_wire");
  });
});

describe("RAIL_LABELS", () => {
  it("labels the Cambodia rail as ABA / KHQR", () => {
    expect(RAIL_LABELS.aba).toBe("ABA / KHQR");
    expect(RAIL_LABELS.stripe).toBe("Stripe Connect");
  });
});
