import { describe, expect, it } from "vitest";

import { buildFlightResultsSearch, parseFlightDeepLinkInitial } from "@/lib/flightDeepLink";
import { buildFlightSearchUrl, parseFlightSearchParams } from "@/lib/flightSearchParams";

describe("flight search params", () => {
  it("parses auto-run results params back into the edit search form", () => {
    const deepLink = new URLSearchParams(
      "from=New%20York%2C%20JFK&to=Paris%2C%20CDG&start=2026-07-10&end=2026-07-17&travelers=2",
    );
    const results = buildFlightResultsSearch(parseFlightDeepLinkInitial(deepLink), deepLink);

    expect(results).not.toBeNull();
    const parsed = parseFlightSearchParams(results!);

    expect(parsed.originIata).toBe("JFK");
    expect(parsed.destinationIata).toBe("CDG");
    expect(parsed.departureDate).toBe("2026-07-10");
    expect(parsed.returnDate).toBe("2026-07-17");
    expect(parsed.passengers).toBe(2);
    expect(parsed.tripType).toBe("roundtrip");
    expect(parsed.isValid).toBe(true);
  });

  it("keeps one-way results one-way when no return date is present", () => {
    const deepLink = new URLSearchParams("from=Phnom%20Penh%2C%20KTI&to=Bangkok%2C%20BKK&start=2026-07-10");
    const results = buildFlightResultsSearch(parseFlightDeepLinkInitial(deepLink), deepLink);

    expect(results?.get("tripType")).toBe("oneway");
    const parsed = parseFlightSearchParams(results!);

    expect(parsed.originIata).toBe("KTI");
    expect(parsed.destinationIata).toBe("BKK");
    expect(parsed.departureDate).toBe("2026-07-10");
    expect(parsed.returnDate).toBeNull();
    expect(parsed.tripType).toBe("oneway");
  });

  it("builds URLs with the live results reader parameter names", () => {
    const url = buildFlightSearchUrl({
      originIata: "JFK",
      destinationIata: "CDG",
      departureDate: "2026-07-10",
      passengers: 2,
      cabinClass: "business",
      tripType: "oneway",
    });

    expect(url).toBe("/flights/results?origin=JFK&dest=CDG&depart=2026-07-10&passengers=2&cabin=business&tripType=oneway");
  });
});
