import { describe, expect, it, vi } from "vitest";

import { openInZivoMap, zivoRouteUrl } from "./openInZivoMap";

describe("openInZivoMap canonical Ride URLs", () => {
  it("builds direct canonical Ride booking links without retired RideHub tabs", () => {
    const url = zivoRouteUrl({
      label: "Central Market",
      lat: 11.5694,
      lng: 104.921,
      pickup: {
        name: "Hotel ZIVO",
        lat: 11.5564,
        lng: 104.9282,
      },
    });

    const parsed = new URL(url, "https://zivosmedia.com");
    expect(parsed.pathname).toBe("/rides/hub");
    expect(parsed.searchParams.get("tab")).toBeNull();
    expect(parsed.searchParams.get("destination")).toBe("Central Market");
    expect(parsed.searchParams.get("destLat")).toBe("11.5694");
    expect(parsed.searchParams.get("destLng")).toBe("104.921");
    expect(parsed.searchParams.get("pickup")).toBe("Hotel ZIVO");
    expect(parsed.searchParams.get("pickupLat")).toBe("11.5564");
    expect(parsed.searchParams.get("pickupLng")).toBe("104.9282");
  });

  it("keeps store-map focus links outside the Ride iframe", () => {
    expect(zivoRouteUrl({ storeId: "hotel-123", label: "Ignored" }))
      .toBe("/store-map?focus=hotel-123");
  });

  it("navigates through the same canonical URL builder", () => {
    const navigate = vi.fn();

    openInZivoMap(navigate, { address: "Russian Market" });

    expect(navigate).toHaveBeenCalledWith("/rides/hub?destination=Russian+Market");
  });
});
