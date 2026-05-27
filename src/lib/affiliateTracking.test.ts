/**
 * Contract tests for affiliateTracking. Covers the pure URL builder
 * (Skyscanner / Kayak / Google Flights deeplink shapes and tracking-
 * param wiring), the session-id allocator, and the device-type
 * detector. The Supabase-side-effect functions (trackAffiliateClick,
 * trackPageView, getAffiliateClicks, getAffiliateAnalytics) need a
 * client mock and are out of scope here.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  buildAffiliateUrl,
  getSessionId,
  getDeviceType,
} from "./affiliateTracking";

beforeEach(() => {
  try { sessionStorage.clear(); } catch { /* ignore */ }
});

describe("getSessionId", () => {
  it("returns the same id within a session", () => {
    const a = getSessionId();
    const b = getSessionId();
    expect(a).toBe(b);
  });

  it("uses the sess_ prefix on a fresh session", () => {
    const id = getSessionId();
    expect(id.startsWith("sess_")).toBe(true);
  });

  it("persists into sessionStorage so reads across modules stay consistent", () => {
    const id = getSessionId();
    expect(sessionStorage.getItem("affiliate_session_id")).toBe(id);
  });
});

describe("getDeviceType", () => {
  it("returns a known device type bucket", () => {
    expect(["mobile", "tablet", "desktop"]).toContain(getDeviceType());
  });

  it("classifies by window.innerWidth boundaries", () => {
    const original = window.innerWidth;
    try {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: 500 });
      expect(getDeviceType()).toBe("mobile");
      Object.defineProperty(window, "innerWidth", { configurable: true, value: 800 });
      expect(getDeviceType()).toBe("tablet");
      Object.defineProperty(window, "innerWidth", { configurable: true, value: 1400 });
      expect(getDeviceType()).toBe("desktop");
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: original });
    }
  });
});

describe("buildAffiliateUrl — Skyscanner (default)", () => {
  it("produces a one-way deeplink with the date in YYMMDD form", () => {
    const url = buildAffiliateUrl({
      origin: "JFK",
      destination: "LAX",
      departDate: "2026-08-15",
      passengers: 2,
      cabinClass: "economy",
    });
    expect(url).toContain("/transport/flights/jfk/lax/260815/");
    expect(url).toContain("adultsv2=2");
    expect(url).toContain("cabinclass=economy");
  });

  it("appends the return date when provided", () => {
    const url = buildAffiliateUrl({
      origin: "JFK",
      destination: "LAX",
      departDate: "2026-08-15",
      returnDate: "2026-08-22",
      passengers: 1,
      cabinClass: "economy",
      partner: "skyscanner",
    });
    expect(url).toMatch(/\/jfk\/lax\/260815\/260822\//);
  });

  it("lowercases origin/destination airport codes in the path", () => {
    const url = buildAffiliateUrl({
      origin: "JFK", destination: "LAX",
      departDate: "2026-08-15", passengers: 1, cabinClass: "economy",
    });
    expect(url).not.toContain("/JFK/");
    expect(url).toContain("/jfk/");
  });

  it("includes the UTM tracking params with the session subid", () => {
    const id = getSessionId();
    const url = buildAffiliateUrl({
      origin: "JFK", destination: "LAX",
      departDate: "2026-08-15", passengers: 1, cabinClass: "economy",
    });
    expect(url).toContain("utm_source=hizovo");
    expect(url).toContain("utm_medium=affiliate");
    expect(url).toContain("utm_campaign=travel");
    expect(url).toContain(`subid=${id}`);
  });
});

describe("buildAffiliateUrl — alternate partners", () => {
  it("builds a Kayak URL with date-range-style path", () => {
    const url = buildAffiliateUrl({
      origin: "JFK", destination: "LAX",
      departDate: "2026-08-15", returnDate: "2026-08-22",
      passengers: 2, cabinClass: "economy",
      partner: "kayak",
    });
    expect(url).toContain("kayak.com/flights");
    expect(url).toContain("JFK-LAX");
    expect(url).toContain("/2026-08-15/2026-08-22/");
    expect(url).toContain("2adults");
  });

  it("builds a Google Flights search URL with encoded query", () => {
    const url = buildAffiliateUrl({
      origin: "JFK", destination: "LAX",
      departDate: "2026-08-15",
      passengers: 1, cabinClass: "economy",
      partner: "google_flights",
    });
    expect(url).toContain("google.com/travel/flights");
    expect(url).toContain("flights%20from%20JFK%20to%20LAX");
    expect(url).toContain("curr=USD");
  });

  it("falls back to a Skyscanner one-way URL for an unknown partner", () => {
    const url = buildAffiliateUrl({
      origin: "JFK", destination: "LAX",
      departDate: "2026-08-15",
      passengers: 1, cabinClass: "economy",
      partner: "wat" as unknown as "skyscanner",
    });
    expect(url).toContain("skyscanner.com");
    expect(url).toContain("/jfk/lax/260815/");
  });
});
