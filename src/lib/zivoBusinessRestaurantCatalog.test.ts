import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchZivoBusinessRestaurants,
  restaurantOrderUrlForZivos,
} from "./zivoBusinessRestaurantCatalog";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Zivo Business restaurant catalog", () => {
  it("keeps only trusted restaurants that have a live menu", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      merchants: [
        {
          id: "mee-pok",
          kind: "restaurant",
          name_en: "ផ្ទះ មីប៉ក់ - Mee Pok House",
          name_km: "ផ្ទះ មីប៉ក់ - Mee Pok House",
          address: "Phnom Penh",
          prep_minutes: 18,
          order_url: "https://zivo-business.myzivo.workers.dev/order/restaurant/mee-pok-house",
        },
        {
          id: "evil",
          kind: "restaurant",
          name_en: "Unsafe",
          name_km: "Unsafe",
          order_url: "https://example.com/order/restaurant/unsafe",
        },
        {
          id: "empty",
          kind: "restaurant",
          name_en: "No menu",
          name_km: "No menu",
          order_url: "https://zivo-business.myzivo.workers.dev/order/restaurant/no-menu",
        },
      ],
      products: [
        { id: "noodles", merchant_id: "mee-pok", category: "restaurant" },
        { id: "unsafe", merchant_id: "evil", category: "restaurant" },
      ],
    }), { status: 200, headers: { "Content-Type": "application/json" } })));

    await expect(fetchZivoBusinessRestaurants()).resolves.toEqual({
      ok: true,
      restaurants: [{
        id: "mee-pok",
        nameEn: "ផ្ទះ មីប៉ក់ - Mee Pok House",
        nameKm: "ផ្ទះ មីប៉ក់ - Mee Pok House",
        address: "Phnom Penh",
        addressKm: "Phnom Penh",
        prepMinutes: 18,
        orderUrl: "https://zivo-business.myzivo.workers.dev/order/restaurant/mee-pok-house",
      }],
    });
  });

  it("adds only ZIVOS language/source context to a trusted order link", () => {
    expect(restaurantOrderUrlForZivos(
      "https://zivo-business.myzivo.workers.dev/order/restaurant/mee-pok-house",
      "km",
    )).toBe("https://zivo-business.myzivo.workers.dev/order/restaurant/mee-pok-house?source=zivos&lang=km");
    expect(restaurantOrderUrlForZivos("javascript:alert(1)", "en")).toBeNull();
  });

  it("reports unavailable and malformed responses instead of calling them empty", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 503 })));
    await expect(fetchZivoBusinessRestaurants()).resolves.toEqual({ ok: false, code: "request_failed" });

    vi.stubGlobal("fetch", vi.fn(async () => new Response("not json", { status: 200 })));
    await expect(fetchZivoBusinessRestaurants()).resolves.toEqual({ ok: false, code: "invalid_response" });
  });
});
