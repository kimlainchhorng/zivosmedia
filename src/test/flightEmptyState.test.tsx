import { describe, expect, it } from "vitest";

import { buildFlightEmptyStateSearchUrl } from "@/components/flight/FlightEmptyState";

const baseSearch = {
  origin: "LAX",
  destination: "BKK",
  departureDate: "2026-07-10",
  returnDate: "2026-07-17",
  adults: 1,
  children: 1,
  infants: 0,
  cabinClass: "business",
};

function readParams(url: string) {
  return new URL(url, "https://zivostravel.com").searchParams;
}

describe("FlightEmptyState suggestion URLs", () => {
  it("uses the live flight results parameter contract", () => {
    const params = readParams(buildFlightEmptyStateSearchUrl(baseSearch));

    expect(params.get("origin")).toBe("LAX");
    expect(params.get("dest")).toBe("BKK");
    expect(params.get("depart")).toBe("2026-07-10");
    expect(params.get("return")).toBe("2026-07-17");
    expect(params.get("adults")).toBe("1");
    expect(params.get("children")).toBe("1");
    expect(params.get("infants")).toBe("0");
    expect(params.get("passengers")).toBe("2");
    expect(params.get("cabin")).toBe("business");
    expect(params.get("tripType")).toBe("roundtrip");
  });

  it("updates nearby airport/date suggestions and can strip return date", () => {
    const params = readParams(
      buildFlightEmptyStateSearchUrl(baseSearch, {
        origin: "SFO",
        destination: "SIN",
        departureDate: "2026-07-11",
        returnDate: "",
      }),
    );

    expect(params.get("origin")).toBe("SFO");
    expect(params.get("dest")).toBe("SIN");
    expect(params.get("depart")).toBe("2026-07-11");
    expect(params.has("return")).toBe(false);
    expect(params.get("tripType")).toBe("oneway");
  });
});
