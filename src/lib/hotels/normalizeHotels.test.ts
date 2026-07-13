/**
 * Contract tests for the hotel-result normalizer + match-stats helper.
 * normalizeHotels merges two supplier feeds (Hotelbeds / RateHawk),
 * deduplicates by name+coordinates, and tracks the cheaper price plus
 * the loser's price for the "save vs X" UI. A regression here either
 * shows duplicate rows from both suppliers or hides the cheapest
 * price.
 */
import { describe, it, expect } from "vitest";
import {
  normalizeHotels,
  sortUnifiedHotels,
  getMatchStats,
  type UnifiedHotel,
} from "./normalizeHotels";
import type { NormalizedHotel } from "@/types/hotels";

const mk = (over: Partial<NormalizedHotel>): NormalizedHotel =>
  ({
    id: over.id ?? "id",
    supplierCode: (over.supplierCode ?? "HB") as NormalizedHotel["supplierCode"],
    supplierHotelId: over.supplierHotelId ?? "x",
    name: over.name ?? "Hotel",
    stars: over.stars ?? 4,
    destination: over.destination ?? "NYC",
    imageUrl: over.imageUrl ?? "img.jpg",
    minPrice: over.minPrice ?? 100,
    latitude: over.latitude ?? 40.0,
    longitude: over.longitude ?? -74.0,
    reviewScore: over.reviewScore,
    ...over,
  }) as NormalizedHotel;

describe("normalizeHotels — deduplication", () => {
  it("collapses two suppliers' identical-name/identical-coords entries into one row", () => {
    const hb = [mk({ id: "hb1", supplierCode: "HB" as any, name: "Ritz Carlton", minPrice: 200 })];
    const rh = [mk({ id: "rh1", supplierCode: "RH" as any, name: "Ritz Carlton", minPrice: 180 })];
    const out = normalizeHotels(hb, rh);
    expect(out).toHaveLength(1);
  });

  it("deduplicates within a single supplier list (same name + coords)", () => {
    const hb = [
      mk({ id: "a", name: "Same Spot", minPrice: 150 }),
      mk({ id: "b", name: "Same Spot", minPrice: 120 }),
    ];
    expect(normalizeHotels(hb, [])).toHaveLength(1);
  });

  it("ignores case and punctuation in the matching key", () => {
    // "Ritz-Carlton" and "Ritz Carlton" should dedupe.
    const hb = [mk({ id: "hb", name: "Ritz-Carlton", minPrice: 200 })];
    const rh = [mk({ id: "rh", name: "Ritz Carlton", minPrice: 180 })];
    expect(normalizeHotels(hb, rh)).toHaveLength(1);
  });

  it("treats hotels in different coordinate buckets as distinct rows", () => {
    // ~111m apart at the 3rd decimal — different match keys.
    const hb = [mk({ id: "a", name: "Hilton", latitude: 40.001, longitude: -74.001 })];
    const rh = [mk({ id: "b", name: "Hilton", latitude: 40.005, longitude: -74.005 })];
    expect(normalizeHotels(hb, rh)).toHaveLength(2);
  });
});

describe("normalizeHotels — price comparison wiring", () => {
  it("keeps the cheaper supplier as primary and records the loser as secondaryPrice", () => {
    const hb = [mk({ id: "hb1", supplierCode: "HB" as any, name: "Same", minPrice: 200 })];
    const rh = [mk({ id: "rh1", supplierCode: "RH" as any, name: "Same", minPrice: 150 })];
    const out = normalizeHotels(hb, rh);
    expect(out[0].minPrice).toBe(150);
    expect(out[0].secondaryPrice).toBe(200);
  });

  it("populates savings and savingsPercent vs the loser's price", () => {
    // hb 200 → rh 150 means savings = 50 = 25% off the 200 baseline.
    const hb = [mk({ id: "hb1", name: "Same", minPrice: 200, supplierCode: "HB" as any })];
    const rh = [mk({ id: "rh1", name: "Same", minPrice: 150, supplierCode: "RH" as any })];
    const out = normalizeHotels(hb, rh);
    expect(out[0].savings).toBe(50);
    expect(out[0].savingsPercent).toBe(25);
  });

  it("records the loser's supplier code as fallbackSupplier when the new entry wins", () => {
    const hb = [mk({ id: "hb1", supplierCode: "HB" as any, name: "Same", minPrice: 200 })];
    const rh = [mk({ id: "rh1", supplierCode: "RH" as any, name: "Same", minPrice: 150 })];
    expect(normalizeHotels(hb, rh)[0].fallbackSupplier).toBe("HB");
  });

  it("leaves secondaryPrice null when no other supplier matches", () => {
    const hb = [mk({ id: "hb1", name: "Solo", minPrice: 100 })];
    const out = normalizeHotels(hb, []);
    expect(out[0].secondaryPrice).toBeNull();
  });
});

describe("sortUnifiedHotels", () => {
  const a = mk({ id: "a", name: "Aplaza", minPrice: 100, reviewScore: 8 }) as UnifiedHotel;
  const b = mk({ id: "b", name: "Belmonte", minPrice: 200, reviewScore: 9.5 }) as UnifiedHotel;
  const c = mk({ id: "c", name: "Casa", minPrice: 50, reviewScore: 7 }) as UnifiedHotel;
  a.secondaryPrice = null; a.savings = 0;
  b.secondaryPrice = 220; b.savings = 20;
  c.secondaryPrice = 60; c.savings = 10;

  it("sorts by price ascending (default)", () => {
    expect(sortUnifiedHotels([a, b, c]).map((h) => h.id)).toEqual(["c", "a", "b"]);
  });

  it("sorts by savings descending", () => {
    expect(sortUnifiedHotels([a, b, c], "savings").map((h) => h.id)).toEqual(["b", "c", "a"]);
  });

  it("sorts by rating descending", () => {
    expect(sortUnifiedHotels([a, b, c], "rating").map((h) => h.id)).toEqual(["b", "a", "c"]);
  });

  it("sorts by name with locale-aware comparison", () => {
    expect(sortUnifiedHotels([b, c, a], "name").map((h) => h.id)).toEqual(["a", "b", "c"]);
  });

  it("returns a new array — doesn't mutate the input", () => {
    const input = [a, b, c];
    sortUnifiedHotels(input);
    expect(input.map((h) => h.id)).toEqual(["a", "b", "c"]);
  });
});

describe("getMatchStats", () => {
  it("reports total/matched/avgSavings/maxSavings for a mixed list", () => {
    const matched1 = mk({ minPrice: 100 }) as UnifiedHotel;
    matched1.secondaryPrice = 130; matched1.savings = 30;
    const matched2 = mk({ minPrice: 150 }) as UnifiedHotel;
    matched2.secondaryPrice = 200; matched2.savings = 50;
    const unmatched = mk({ minPrice: 80 }) as UnifiedHotel;
    unmatched.secondaryPrice = null;

    const stats = getMatchStats([matched1, matched2, unmatched]);
    expect(stats.total).toBe(3);
    expect(stats.matchedCount).toBe(2);
    expect(stats.matchRate).toBe(67); // round(2/3 * 100)
    expect(stats.avgSavings).toBe(40); // (30 + 50) / 2
    expect(stats.maxSavings).toBe(50);
  });

  it("returns avgSavings=0 when nothing matched", () => {
    const unmatched = mk({}) as UnifiedHotel;
    unmatched.secondaryPrice = null;
    const stats = getMatchStats([unmatched]);
    expect(stats.matchedCount).toBe(0);
    expect(stats.avgSavings).toBe(0);
  });
});
