// Contract tests for the two fully pure, data-independent exports of
// flightDeepLink.ts. The airport-resolution exports (resolveAirportSeed,
// isAirportSeedSafeForAutoRun, parseFlightDeepLinkInitial, buildFlightResultsSearch)
// are intentionally NOT pinned here — they depend on @/data/airports (a fuzzy
// search over a mutable data table), so asserting their output would couple the
// test to that data. These two functions take only their arguments and use
// standard JS, so they are deterministic. Verified against a clean-room oracle.
// Dates are asserted via LOCAL Y/M/D (timezone-safe: built from local midnight).
import { describe, it, expect } from "vitest";
import {
  parseFlightDeepLinkDate,
  shouldSkipFlightDeepLinkAutoRun,
} from "./flightDeepLink";

describe("parseFlightDeepLinkDate", () => {
  const expectYmd = (raw: string, y: number, monthIndex: number, d: number) => {
    const dt = parseFlightDeepLinkDate(raw);
    expect(dt).toBeInstanceOf(Date);
    expect(dt?.getFullYear()).toBe(y);
    expect(dt?.getMonth()).toBe(monthIndex);
    expect(dt?.getDate()).toBe(d);
  };

  it("parses a plain ISO date", () => {
    expectYmd("2026-07-01", 2026, 6, 1);
  });

  it("strips a time/zone suffix and keeps the calendar date", () => {
    expectYmd("2026-07-01T15:30:00Z", 2026, 6, 1);
  });

  it("trims surrounding whitespace", () => {
    expectYmd(" 2026-07-01 ", 2026, 6, 1);
  });

  it("parses an end-of-year date", () => {
    expectYmd("2026-12-31", 2026, 11, 31);
  });

  it("returns undefined for empty / nullish input", () => {
    expect(parseFlightDeepLinkDate("")).toBeUndefined();
    expect(parseFlightDeepLinkDate(null)).toBeUndefined();
    expect(parseFlightDeepLinkDate(undefined)).toBeUndefined();
  });

  it("returns undefined for non-date text", () => {
    expect(parseFlightDeepLinkDate("not-a-date")).toBeUndefined();
    expect(parseFlightDeepLinkDate("07/01/2026")).toBeUndefined();
  });

  it("returns undefined for out-of-range months", () => {
    expect(parseFlightDeepLinkDate("2026-13-45")).toBeUndefined();
    expect(parseFlightDeepLinkDate("2026-00-10")).toBeUndefined();
  });
});

describe("shouldSkipFlightDeepLinkAutoRun", () => {
  const skip = (q: string) => shouldSkipFlightDeepLinkAutoRun(new URLSearchParams(q));

  it("does not skip when no relevant params are present", () => {
    expect(skip("")).toBe(false);
    expect(skip("from=JFK&to=LAX")).toBe(false);
  });

  it("skips on autoRun opt-out values", () => {
    expect(skip("autoRun=0")).toBe(true);
    expect(skip("autoRun=false")).toBe(true);
    expect(skip("autoRun=manual")).toBe(true);
  });

  it("does not skip when autoRun is affirmatively on", () => {
    expect(skip("autoRun=1")).toBe(false);
    expect(skip("autoRun=true")).toBe(false);
  });

  it("honors the lowercase and short key fallbacks", () => {
    expect(skip("autorun=false")).toBe(true);
    expect(skip("auto=false")).toBe(true);
  });

  it("is case-insensitive and trims the value", () => {
    expect(skip("autoRun=FALSE")).toBe(true);
    expect(skip("autoRun=%20False%20")).toBe(true);
  });

  it("skips on manual opt-in values", () => {
    expect(skip("manual=1")).toBe(true);
    expect(skip("manual=true")).toBe(true);
    expect(skip("manual=yes")).toBe(true);
  });

  it("does not skip on manual negative values", () => {
    expect(skip("manual=0")).toBe(false);
    expect(skip("manual=no")).toBe(false);
  });

  it("lets a manual opt-in win even when autoRun looks affirmative", () => {
    expect(skip("autoRun=1&manual=yes")).toBe(true);
    expect(skip("autoRun=true&manual=0")).toBe(false);
  });
});
