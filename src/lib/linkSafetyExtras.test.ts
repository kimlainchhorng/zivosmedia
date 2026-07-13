/**
 * Contract tests for stripTrackingParams in linkSafetyExtras.ts — the pure half of
 * the module (logBlockedLinkAttempt is console/window-coupled and out of scope). It
 * removes a fixed allowlist of tracking params (utm_*, fbclid, gclid, igshid, etc.)
 * while preserving the remaining query in order. Two load-bearing edge behaviors:
 * when NO tracking param is present it returns the ORIGINAL string verbatim (it does
 * NOT round-trip through URL.toString(), so an unnormalized clean URL is left as-is),
 * and on parse failure — including relative URLs — it returns the input untouched.
 *
 * Ground truth is an independent reimplementation of that contract (param list +
 * changed-flag passthrough + parse-failure passthrough); WHATWG URL is used only as
 * a shared spec primitive, and vectors are pre-normalized absolute URLs so URL
 * normalization is a no-op and the only observable change is param removal.
 */
import { describe, it, expect } from "vitest";
import { stripTrackingParams } from "./linkSafetyExtras";

describe("stripTrackingParams", () => {
  it("removes tracking params while keeping the rest of the query (and its order)", () => {
    expect(stripTrackingParams("https://example.com/path?utm_source=x&id=42")).toBe(
      "https://example.com/path?id=42"
    );
    expect(stripTrackingParams("https://example.com/p?a=1&fbclid=abc&b=2")).toBe(
      "https://example.com/p?a=1&b=2"
    );
    expect(stripTrackingParams("https://shop.example.com/x?igshid=1&q=shoes&mc_cid=9")).toBe(
      "https://shop.example.com/x?q=shoes"
    );
  });

  it("drops the query entirely when every param was tracking", () => {
    expect(stripTrackingParams("https://example.com/p?utm_source=x&gclid=y")).toBe(
      "https://example.com/p"
    );
  });

  it("returns the original string verbatim when nothing changed (no URL normalization)", () => {
    expect(stripTrackingParams("https://example.com/p?id=42")).toBe("https://example.com/p?id=42");
    // Unnormalized but tracking-free: proves it does NOT round-trip through toString().
    expect(stripTrackingParams("HTTPS://Example.com/p?id=1")).toBe("HTTPS://Example.com/p?id=1");
  });

  it("passes through unparseable and relative URLs untouched", () => {
    expect(stripTrackingParams("not a url at all")).toBe("not a url at all");
    expect(stripTrackingParams("/foo?utm_source=x")).toBe("/foo?utm_source=x");
    expect(stripTrackingParams("")).toBe("");
  });
});
