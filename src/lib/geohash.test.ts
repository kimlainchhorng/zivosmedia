/**
 * Contract tests for the proximity primitives used in "nearby" matching.
 * encodeGeohash must follow the world-standard geohash algorithm (base32
 * "0123456789bcdefghjkmnpqrstuvwxyz", longitude-first bit interleaving) so that
 * a hash computed here buckets to the same cell as any other standard geohash
 * implementation — a silent change to the alphabet, the lng/lat ordering, or the
 * 5-bit grouping would silently mis-bucket every location and break matching.
 * The two anchor vectors below ("ezs42", "u4pruydqqvj") are the canonical
 * published geohash examples; the rest were derived by an independent clean-room
 * reimplementation of the standard algorithm (not by calling this module), and
 * the haversine distances were cross-checked against published real-world values.
 */
import { describe, it, expect } from "vitest";
import { encodeGeohash, haversineMeters } from "./geohash";

describe("encodeGeohash — standard geohash vectors", () => {
  it("matches the canonical published anchor vectors", () => {
    // Wikipedia's worked example.
    expect(encodeGeohash(42.6, -5.6, 5)).toBe("ezs42");
    // The classic Jutland reference point at full precision.
    expect(encodeGeohash(57.64911, 10.40744, 11)).toBe("u4pruydqqvj");
  });

  it("defaults to precision 7", () => {
    expect(encodeGeohash(42.6, -5.6)).toBe("ezs42e4");
    expect(encodeGeohash(42.6, -5.6)).toHaveLength(7);
  });

  it("is prefix-stable: a lower precision is a prefix of a higher one", () => {
    const full = encodeGeohash(57.64911, 10.40744, 11);
    expect(encodeGeohash(57.64911, 10.40744, 7)).toBe("u4pruyd");
    expect(full.startsWith(encodeGeohash(57.64911, 10.40744, 7))).toBe(true);
  });

  it("encodes the origin and the four extreme corners", () => {
    expect(encodeGeohash(0, 0, 7)).toBe("s000000");
    expect(encodeGeohash(90, 180, 7)).toBe("zzzzzzz");
    expect(encodeGeohash(-90, -180, 7)).toBe("0000000");
  });

  it("encodes representative real cities", () => {
    expect(encodeGeohash(37.7749, -122.4194, 7)).toBe("9q8yyk8"); // San Francisco
    expect(encodeGeohash(11.5564, 104.9282, 7)).toBe("w649exy"); // Phnom Penh
  });

  it("honors a custom precision length", () => {
    expect(encodeGeohash(57.64911, 10.40744, 8)).toHaveLength(8);
    expect(encodeGeohash(57.64911, 10.40744, 1)).toBe("u");
  });
});

describe("haversineMeters", () => {
  it("matches a published real-world distance (London -> Paris)", () => {
    const d = haversineMeters({ lat: 51.5074, lng: -0.1278 }, { lat: 48.8566, lng: 2.3522 });
    expect(d).toBeCloseTo(343556.06, 1); // ~343.5 km
  });

  it("returns 0 for identical points", () => {
    expect(haversineMeters({ lat: 10, lng: 20 }, { lat: 10, lng: 20 })).toBe(0);
  });

  it("is symmetric in its arguments", () => {
    const a = { lat: 51.5074, lng: -0.1278 };
    const b = { lat: 48.8566, lng: 2.3522 };
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
  });

  it("measures one degree of latitude at the equator as ~111.19 km", () => {
    expect(haversineMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111194.93, 1);
  });
});
