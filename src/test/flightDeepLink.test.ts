import { describe, expect, it } from "vitest";

import {
  buildFlightResultsSearch,
  isAirportSeedSafeForAutoRun,
  parseFlightDeepLinkInitial,
  resolveAirportSeed,
  shouldSkipFlightDeepLinkAutoRun,
} from "@/lib/flightDeepLink";

describe("flight deep links", () => {
  it("resolves embedded IATA labels from Zivo Travel links", () => {
    expect(resolveAirportSeed("New York, JFK")).toBe("JFK");
    expect(resolveAirportSeed("Paris, CDG")).toBe("CDG");
    expect(resolveAirportSeed("Los Angeles LAX")).toBe("LAX");
  });

  it("resolves city names and retired airport aliases", () => {
    expect(resolveAirportSeed("Los-Angeles")).toBe("LAX");
    expect(resolveAirportSeed("Phnom Penh")).toBe("KTI");
    expect(resolveAirportSeed("PNH")).toBe("KTI");
    expect(resolveAirportSeed("Bangkok")).toBe("BKK");
  });

  it("builds a results search when a deep link has route and date", () => {
    const params = new URLSearchParams(
      "from=New%20York%2C%20JFK&to=Paris%2C%20CDG&start=2026-07-10&end=2026-07-17&travelers=2&utm_source=zivo-travel",
    );
    const initial = parseFlightDeepLinkInitial(params);
    const results = buildFlightResultsSearch(initial, params);

    expect(results?.get("origin")).toBe("JFK");
    expect(results?.get("dest")).toBe("CDG");
    expect(results?.get("depart")).toBe("2026-07-10");
    expect(results?.get("return")).toBe("2026-07-17");
    expect(results?.get("passengers")).toBe("2");
    expect(results?.get("utm_source")).toBe("zivo-travel");
  });

  it("does not auto-run ambiguous city-only airport labels", () => {
    expect(resolveAirportSeed("Paris")).toBe("CDG");
    expect(isAirportSeedSafeForAutoRun("Paris")).toBe(false);
    expect(isAirportSeedSafeForAutoRun("Paris, CDG")).toBe(true);

    const ambiguous = new URLSearchParams("from=Portland&to=Paris&start=2026-07-10");
    expect(buildFlightResultsSearch(parseFlightDeepLinkInitial(ambiguous), ambiguous)).toBeNull();
  });

  it("keeps one-way handoffs one-way when auto-run is disabled", () => {
    const params = new URLSearchParams("from=Phnom%20Penh&to=Bangkok&start=2026-07-10&manual=1");
    const initial = parseFlightDeepLinkInitial(params);

    expect(initial.initialFrom).toBe("KTI");
    expect(initial.initialTo).toBe("BKK");
    expect(initial.initialTripType).toBe("oneway");
    expect(shouldSkipFlightDeepLinkAutoRun(params)).toBe(true);
    expect(buildFlightResultsSearch(initial, params)).toBeNull();
  });

  it("does not auto-run incomplete or manually disabled deep links", () => {
    const missingDate = new URLSearchParams("from=JFK&to=CDG");
    expect(buildFlightResultsSearch(parseFlightDeepLinkInitial(missingDate), missingDate)).toBeNull();

    const autoDisabled = new URLSearchParams("from=JFK&to=CDG&start=2026-07-10&auto=0");
    expect(shouldSkipFlightDeepLinkAutoRun(autoDisabled)).toBe(true);
    expect(buildFlightResultsSearch(parseFlightDeepLinkInitial(autoDisabled), autoDisabled)).toBeNull();

    const manual = new URLSearchParams("from=JFK&to=CDG&start=2026-07-10&manual=1");
    expect(shouldSkipFlightDeepLinkAutoRun(manual)).toBe(true);
    expect(buildFlightResultsSearch(parseFlightDeepLinkInitial(manual), manual)).toBeNull();
  });
});
