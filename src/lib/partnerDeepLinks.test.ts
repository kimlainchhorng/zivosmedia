// Contract tests for the partner/affiliate deep-link builders. Pins only the
// input-deterministic, config-independent functions, verified against an
// independent clean-room oracle. Intentionally excludes appendTrackingParams
// (non-deterministic subid via getSearchSessionId) and the config-dependent
// partner selectors. The buildOutRedirectUrl cases also decode the packed
// `url=` param back to its original value, proving the destination URL is
// safely percent-encoded into a single query param (no breakout).
import { describe, it, expect } from "vitest";
import {
  buildBookingDeepLink,
  buildHotelsComDeepLink,
  buildExpediaDeepLink,
  buildPricelineCarDeepLink,
  buildOutRedirectUrl,
} from "./partnerDeepLinks";

describe("buildBookingDeepLink", () => {
  it("builds the affiliate URL with tracking label and aid", () => {
    expect(
      buildBookingDeepLink({
        destination: "Paris",
        checkIn: "2026-07-01",
        checkOut: "2026-07-05",
        adults: 2,
        rooms: 1,
      }),
    ).toBe(
      "https://www.booking.com/searchresults.html?ss=Paris&checkin=2026-07-01&checkout=2026-07-05&group_adults=2&no_rooms=1&aid=618730&label=hizovo_travel",
    );
  });

  it("appends group_children when children is provided", () => {
    expect(
      buildBookingDeepLink({
        destination: "Paris",
        checkIn: "2026-07-01",
        checkOut: "2026-07-05",
        adults: 2,
        rooms: 1,
        children: 3,
      }),
    ).toBe(
      "https://www.booking.com/searchresults.html?ss=Paris&checkin=2026-07-01&checkout=2026-07-05&group_adults=2&no_rooms=1&aid=618730&label=hizovo_travel&group_children=3",
    );
  });

  it("omits group_children when children is 0", () => {
    const result = buildBookingDeepLink({
      destination: "Paris",
      checkIn: "2026-07-01",
      checkOut: "2026-07-05",
      adults: 2,
      rooms: 1,
      children: 0,
    });
    expect(result).not.toContain("group_children");
    expect(result).toBe(
      "https://www.booking.com/searchresults.html?ss=Paris&checkin=2026-07-01&checkout=2026-07-05&group_adults=2&no_rooms=1&aid=618730&label=hizovo_travel",
    );
  });

  it("percent-encodes reserved characters in the destination", () => {
    expect(
      buildBookingDeepLink({
        destination: "Rio & Sao",
        checkIn: "2026-07-01",
        checkOut: "2026-07-05",
        adults: 2,
        rooms: 1,
      }),
    ).toBe(
      "https://www.booking.com/searchresults.html?ss=Rio+%26+Sao&checkin=2026-07-01&checkout=2026-07-05&group_adults=2&no_rooms=1&aid=618730&label=hizovo_travel",
    );
  });
});

describe("buildHotelsComDeepLink", () => {
  it("builds the search URL with hotels.com param names", () => {
    expect(
      buildHotelsComDeepLink({
        destination: "Tokyo",
        checkIn: "2026-09-01",
        checkOut: "2026-09-04",
        adults: 3,
        rooms: 2,
      }),
    ).toBe(
      "https://www.hotels.com/search.do?q-destination=Tokyo&q-check-in=2026-09-01&q-check-out=2026-09-04&q-room-0-adults=3&q-rooms=2",
    );
  });
});

describe("buildExpediaDeepLink", () => {
  it("builds the hotel-search URL with expedia param names", () => {
    expect(
      buildExpediaDeepLink({
        destination: "Rome",
        checkIn: "2026-10-01",
        checkOut: "2026-10-03",
        adults: 2,
        rooms: 1,
      }),
    ).toBe(
      "https://www.expedia.com/Hotel-Search?destination=Rome&startDate=2026-10-01&endDate=2026-10-03&adults=2&rooms=1",
    );
  });
});

describe("buildPricelineCarDeepLink", () => {
  it("builds the car URL, encoding the time colons", () => {
    expect(
      buildPricelineCarDeepLink({
        pickupLocation: "LAX",
        pickupDate: "2026-07-01",
        pickupTime: "10:00",
        dropoffDate: "2026-07-05",
        dropoffTime: "12:30",
      }),
    ).toBe(
      "https://www.priceline.com/cars/?pickup_location=LAX&pickup_date=2026-07-01&pickup_time=10%3A00&dropoff_date=2026-07-05&dropoff_time=12%3A30",
    );
  });

  it("appends driver_age when driverAge is provided", () => {
    expect(
      buildPricelineCarDeepLink({
        pickupLocation: "LAX",
        pickupDate: "2026-07-01",
        pickupTime: "10:00",
        dropoffDate: "2026-07-05",
        dropoffTime: "12:30",
        driverAge: 25,
      }),
    ).toBe(
      "https://www.priceline.com/cars/?pickup_location=LAX&pickup_date=2026-07-01&pickup_time=10%3A00&dropoff_date=2026-07-05&dropoff_time=12%3A30&driver_age=25",
    );
  });

  it("omits driver_age when driverAge is 0", () => {
    const result = buildPricelineCarDeepLink({
      pickupLocation: "LAX",
      pickupDate: "2026-07-01",
      pickupTime: "10:00",
      dropoffDate: "2026-07-05",
      dropoffTime: "12:30",
      driverAge: 0,
    });
    expect(result).not.toContain("driver_age");
    expect(result).toBe(
      "https://www.priceline.com/cars/?pickup_location=LAX&pickup_date=2026-07-01&pickup_time=10%3A00&dropoff_date=2026-07-05&dropoff_time=12%3A30",
    );
  });
});

describe("buildOutRedirectUrl", () => {
  it("packs the destination URL into a single safely-encoded url param", () => {
    const result = buildOutRedirectUrl(
      "booking",
      "Booking.com",
      "hotels",
      "hotel-search",
      "https://www.booking.com/x?a=1&b=2",
    );
    const url = new URL(result, "https://base.test");
    expect(url.pathname).toBe("/out");
    expect(url.searchParams.get("partner")).toBe("booking");
    expect(url.searchParams.get("name")).toBe("Booking.com");
    expect(url.searchParams.get("product")).toBe("hotels");
    expect(url.searchParams.get("page")).toBe("hotel-search");
    // Decodes back to the exact original — proves no query breakout.
    expect(url.searchParams.get("url")).toBe("https://www.booking.com/x?a=1&b=2");
    expect(result).toBe(
      "/out?partner=booking&name=Booking.com&product=hotels&page=hotel-search&url=https%3A%2F%2Fwww.booking.com%2Fx%3Fa%3D1%26b%3D2",
    );
  });

  it("merges extra params after the standard ones", () => {
    const result = buildOutRedirectUrl(
      "qeeq",
      "QEEQ",
      "cars",
      "car-page",
      "https://qeeq.com/r",
      { subid: "SS_1", currency: "USD" },
    );
    const url = new URL(result, "https://base.test");
    expect(url.searchParams.get("subid")).toBe("SS_1");
    expect(url.searchParams.get("currency")).toBe("USD");
    expect(url.searchParams.get("url")).toBe("https://qeeq.com/r");
    expect(result).toBe(
      "/out?partner=qeeq&name=QEEQ&product=cars&page=car-page&url=https%3A%2F%2Fqeeq.com%2Fr&subid=SS_1&currency=USD",
    );
  });
});
