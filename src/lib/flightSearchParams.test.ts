/**
 * Contract tests for the pure flight-search param validators. These functions
 * sanitize URL-supplied query params before a flight search runs, so their
 * clamping/whitelisting is correctness-load-bearing: a regression could let an
 * out-of-range passenger count, an unknown cabin, or a malformed date through to
 * the results page. Expected values were ground-truthed against the documented
 * rules and an independent node probe of V8's Date / URLSearchParams behavior
 * (not by calling the module). NOTE on validateDateString: it enforces the
 * YYYY-MM-DD shape and rejects out-of-range months, but V8's Date rolls
 * overflowing days over (Feb 30 -> valid), so it is NOT a strict calendar check.
 * That boundary is pinned below intentionally; tightening it is a separate,
 * owner-visible change.
 *
 * (extractIataCode / parseFlightSearchParams depend on the airport DB and the
 * deep-link resolver and are out of scope for this pure-logic suite.)
 */
import { describe, it, expect } from "vitest";
import {
  validateDateString,
  validatePassengers,
  validateCabinClass,
  validateTripType,
  buildFlightSearchUrl,
} from "./flightSearchParams";

describe("validateDateString", () => {
  it("returns null for null and for shape mismatches", () => {
    expect(validateDateString(null)).toBeNull();
    expect(validateDateString("2026-7-1")).toBeNull(); // single digits
    expect(validateDateString("2026/07/01")).toBeNull(); // slashes
    expect(validateDateString("20260701")).toBeNull();
    expect(validateDateString("")).toBeNull();
  });

  it("passes a well-formed in-range date through unchanged", () => {
    expect(validateDateString("2026-07-01")).toBe("2026-07-01");
    expect(validateDateString("2024-02-29")).toBe("2024-02-29"); // leap day
  });

  it("rejects an out-of-range month", () => {
    expect(validateDateString("2026-13-01")).toBeNull();
    expect(validateDateString("2026-00-10")).toBeNull();
  });

  it("tolerates an overflowing day (documented V8 rollover, not strict calendar)", () => {
    expect(validateDateString("2026-02-30")).toBe("2026-02-30");
    expect(validateDateString("2026-04-31")).toBe("2026-04-31");
  });
});

describe("validatePassengers (clamp to 1-9, default 1)", () => {
  it("defaults empty/invalid input to 1", () => {
    expect(validatePassengers(null)).toBe(1);
    expect(validatePassengers("")).toBe(1);
    expect(validatePassengers("abc")).toBe(1);
    expect(validatePassengers("0")).toBe(1); // below range
    expect(validatePassengers("10")).toBe(1); // above range
    expect(validatePassengers("-3")).toBe(1);
  });

  it("accepts an in-range count and truncates a leading integer", () => {
    expect(validatePassengers("5")).toBe(5);
    expect(validatePassengers("9")).toBe(9);
    expect(validatePassengers("3.9")).toBe(3); // parseInt truncation
  });
});

describe("validateCabinClass (whitelist, default economy)", () => {
  it("lower-cases and accepts a known cabin", () => {
    expect(validateCabinClass("business")).toBe("business");
    expect(validateCabinClass("BUSINESS")).toBe("business");
    expect(validateCabinClass("Premium")).toBe("premium");
    expect(validateCabinClass("first")).toBe("first");
  });

  it("falls back to economy for null/empty/unknown", () => {
    expect(validateCabinClass(null)).toBe("economy");
    expect(validateCabinClass("")).toBe("economy");
    expect(validateCabinClass("luxury")).toBe("economy");
  });
});

describe("validateTripType (default roundtrip)", () => {
  it("normalizes separators and casing to oneway/roundtrip", () => {
    expect(validateTripType("oneway")).toBe("oneway");
    expect(validateTripType("one-way")).toBe("oneway");
    expect(validateTripType("one_way")).toBe("oneway");
    expect(validateTripType("ONEWAY")).toBe("oneway");
    expect(validateTripType("round-trip")).toBe("roundtrip");
  });

  it("falls back to roundtrip for null/empty/unknown", () => {
    expect(validateTripType(null)).toBe("roundtrip");
    expect(validateTripType("")).toBe("roundtrip");
    expect(validateTripType("garbage")).toBe("roundtrip");
  });
});

describe("buildFlightSearchUrl", () => {
  it("builds the minimal URL with defaults and no return leg", () => {
    expect(buildFlightSearchUrl({ originIata: "JFK", destinationIata: "LAX", departureDate: "2026-07-01" }))
      .toBe("/flights/results?origin=JFK&dest=LAX&depart=2026-07-01&passengers=1&cabin=economy&tripType=roundtrip");
  });

  it("includes the return leg and all custom fields in order", () => {
    expect(buildFlightSearchUrl({
      originIata: "JFK", destinationIata: "LAX", departureDate: "2026-07-01",
      returnDate: "2026-07-10", passengers: 3, cabinClass: "business", tripType: "oneway",
    })).toBe("/flights/results?origin=JFK&dest=LAX&depart=2026-07-01&return=2026-07-10&passengers=3&cabin=business&tripType=oneway");
  });
});
