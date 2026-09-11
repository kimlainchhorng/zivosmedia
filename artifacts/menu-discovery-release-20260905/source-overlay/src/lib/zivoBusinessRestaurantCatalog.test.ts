import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchZivoBusinessRestaurants,
  restaurantMenuUrlForZivos,
  restaurantOrderUrlForZivos,
} from "./zivoBusinessRestaurantCatalog";

const catalogUrl = "https://catalog.example.test/restaurants";
const menuUrl = "https://zivobusiness.com/order/restaurant/phkachan?view=menu";
const orderUrl = "https://zivobusiness.com/order/restaurant/phkachan";
const restaurant = { id: "phkachan", kind: "restaurant", name_en: "Phkachan", name_km: "ផ្កាចន្ទន៍", menu_url: menuUrl, is_open: false };
const products = [{ id: "dish", merchant_id: "phkachan", category: "restaurant" }];
function respond(merchants: unknown[], rows: unknown[] = []) {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ merchants, products: rows }), { status: 200 }));
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

beforeEach(() => vi.stubEnv("VITE_ZIVO_BUSINESS_CATALOG_URL", catalogUrl));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Zivo Business restaurant catalog", () => {
  it("shows a published menu without products, ordering, or invented preparation/address", async () => {
    const fetcher = respond([{ ...restaurant, prep_minutes: 20, order_url: null }]);
    const controller = new AbortController();
    await expect(fetchZivoBusinessRestaurants(controller.signal)).resolves.toEqual({
      ok: true,
      restaurants: [{ id: "phkachan", nameEn: "Phkachan", nameKm: "ផ្កាចន្ទន៍", address: "", addressKm: "", prepMinutes: null, menuUrl, orderUrl: null }],
    });
    expect(fetcher).toHaveBeenCalledWith(catalogUrl, { headers: { Accept: "application/json" }, credentials: "omit", signal: controller.signal });
  });

  it("keeps ordering only with a trusted order link, product rows, and no explicit closed state", async () => {
    respond([{ ...restaurant, is_open: true, order_url: orderUrl, prep_minutes: 18 }], products);
    expect(await fetchZivoBusinessRestaurants()).toMatchObject({ ok: true, restaurants: [{ orderUrl, prepMinutes: 18 }] });
    respond([{ ...restaurant, order_url: orderUrl, prep_minutes: 18 }], products);
    expect(await fetchZivoBusinessRestaurants()).toMatchObject({ ok: true, restaurants: [{ orderUrl: null, prepMinutes: null }] });
    respond([{ ...restaurant, is_open: true, order_url: orderUrl }]);
    expect(await fetchZivoBusinessRestaurants()).toMatchObject({ ok: true, restaurants: [{ orderUrl: null }] });
  });

  it("preserves legacy eligible ordering rows without creating a public menu URL", async () => {
    respond([{ ...restaurant, menu_url: null, is_open: undefined, order_url: orderUrl, prep_minutes: 12 }], products);
    expect(await fetchZivoBusinessRestaurants()).toMatchObject({ ok: true, restaurants: [{ menuUrl: null, orderUrl, prepMinutes: 12 }] });
  });

  it("requires an explicit trusted menu link and drops wrong kinds, invalid rows and duplicates", async () => {
    respond([
      { ...restaurant, menu_url: undefined },
      { ...restaurant, kind: "grocery" },
      { ...restaurant, name_en: "" },
      null,
      restaurant,
      restaurant,
    ]);
    expect(await fetchZivoBusinessRestaurants()).toMatchObject({ ok: true, restaurants: [{ id: "phkachan" }] });
  });

  it.each([
    "", "   ", "/catalog", "http://catalog.example.test/", "https://user:secret@catalog.example.test/", "https://catalog.example.test/#secret",
  ])("does not fetch missing or invalid catalog configuration: %s", async (value) => {
    vi.stubEnv("VITE_ZIVO_BUSINESS_CATALOG_URL", value);
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(fetchZivoBusinessRestaurants()).resolves.toEqual({ ok: false, code: "not_configured" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    "http://zivobusiness.com/order/restaurant/phkachan?view=menu",
    "https://zivobusiness.com.evil.test/order/restaurant/phkachan?view=menu",
    "https://user:secret@zivobusiness.com/order/restaurant/phkachan?view=menu",
    "https://zivobusiness.com:444/order/restaurant/phkachan?view=menu",
    "https://zivobusiness.com:443/order/restaurant/phkachan?view=menu",
    "https://zivobusiness.com/order/restaurant/phkachan?view=checkout",
    "https://zivobusiness.com/order/restaurant/phkachan?view=menu&view=checkout",
    "https://zivobusiness.com/order/restaurant/phkachan",
    "https://zivobusiness.com/account?view=menu",
    "javascript:alert(1)",
  ])("rejects an unsafe or non-menu link: %s", async (value) => {
    expect(restaurantMenuUrlForZivos(value, "en")).toBeNull();
    respond([{ ...restaurant, menu_url: value }]);
    expect(await fetchZivoBusinessRestaurants()).toEqual({ ok: true, restaurants: [] });
  });

  it("preserves menu view while setting language/source and removing hash data", () => {
    const url = new URL(restaurantMenuUrlForZivos(`${menuUrl}&lang=en&source=old#token`, "km")!);
    expect(url.origin + url.pathname).toBe(orderUrl);
    expect(Object.fromEntries(url.searchParams)).toEqual({ view: "menu", lang: "km", source: "zivos" });
    expect(url.hash).toBe("");
    expect(restaurantOrderUrlForZivos(orderUrl, "en")).toBe(`${orderUrl}?source=zivos&lang=en`);
    expect(restaurantOrderUrlForZivos(menuUrl, "en")).toBeNull();
  });

  it.each([403, 404, 503])("distinguishes unavailable configuration from request failure for HTTP %i", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status })));
    await expect(fetchZivoBusinessRestaurants()).resolves.toEqual({ ok: false, code: status === 503 ? "request_failed" : "not_configured" });
  });

  it("reports malformed responses separately from an empty catalog", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not json", { status: 200 })));
    expect(await fetchZivoBusinessRestaurants()).toEqual({ ok: false, code: "invalid_response" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"merchants":[]}', { status: 200 })));
    expect(await fetchZivoBusinessRestaurants()).toEqual({ ok: false, code: "invalid_response" });
    respond([]);
    expect(await fetchZivoBusinessRestaurants()).toEqual({ ok: true, restaurants: [] });
  });

  it("retains abort semantics and reports ordinary transport failure", async () => {
    const controller = new AbortController();
    controller.abort();
    const aborted = new DOMException("Aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(aborted));
    await expect(fetchZivoBusinessRestaurants(controller.signal)).rejects.toBe(aborted);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network failed")));
    expect(await fetchZivoBusinessRestaurants()).toEqual({ ok: false, code: "request_failed" });
  });
});
