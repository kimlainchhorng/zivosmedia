/**
 * Tests for the server-side bot-detection helper.
 * The helper lives in supabase/functions/_shared/ but its only deps are
 * Web standards (Headers, RegExp), so we can import it directly into
 * vitest without Deno's runtime.
 */
import { describe, it, expect } from "vitest";
import {
  detectBot,
  isLikelyMaliciousBot,
} from "../../supabase/functions/_shared/botDetection";

const browserHeaders = (overrides: Record<string, string> = {}) => {
  const h = new Headers();
  h.set(
    "user-agent",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  );
  h.set("accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8");
  h.set("accept-language", "en-US,en;q=0.5");
  for (const [k, v] of Object.entries(overrides)) h.set(k, v);
  return h;
};

describe("detectBot", () => {
  it("passes a real Chrome user-agent", () => {
    const r = detectBot(browserHeaders());
    expect(r.isBot).toBe(false);
    expect(r.reason).toBe(null);
  });

  it("flags missing user-agent", () => {
    const h = new Headers();
    h.set("accept", "text/html");
    expect(detectBot(h).reason).toBe("missing_ua");
  });

  it("flags curl", () => {
    const h = new Headers();
    h.set("user-agent", "curl/8.4.0");
    h.set("accept", "*/*");
    expect(detectBot(h).reason).toBe("scraper");
  });

  it("flags wget", () => {
    const h = new Headers();
    h.set("user-agent", "Wget/1.21.4");
    expect(detectBot(h).reason).toBe("scraper");
  });

  it("flags python-requests", () => {
    const h = new Headers();
    h.set("user-agent", "python-requests/2.31.0");
    expect(detectBot(h).reason).toBe("scraper");
  });

  it("flags scrapy", () => {
    const h = new Headers();
    h.set("user-agent", "Scrapy/2.11.0 (+https://scrapy.org)");
    expect(detectBot(h).reason).toBe("scraper");
  });

  it("flags sqlmap as scanner", () => {
    const h = new Headers();
    h.set("user-agent", "sqlmap/1.7.11#stable (https://sqlmap.org)");
    expect(detectBot(h).reason).toBe("scanner");
  });

  it("flags nikto as scanner", () => {
    const h = new Headers();
    h.set("user-agent", "Mozilla/5.0 (Nikto/2.5.0)");
    expect(detectBot(h).reason).toBe("scanner");
  });

  it("flags HeadlessChrome", () => {
    const h = new Headers();
    h.set("user-agent", "Mozilla/5.0 HeadlessChrome/120.0.0.0 Safari/537.36");
    expect(detectBot(h).reason).toBe("scraper");
  });

  it("flags missing accept header on otherwise normal browser UA", () => {
    const h = new Headers();
    h.set("user-agent", "Mozilla/5.0 ...");
    expect(detectBot(h).reason).toBe("missing_accept");
  });

  it("flags accept */* as missing_accept", () => {
    const h = new Headers();
    h.set("user-agent", "Mozilla/5.0 ...");
    h.set("accept", "*/*");
    expect(detectBot(h).reason).toBe("missing_accept");
  });

  it("accepts a plain object as headers input", () => {
    expect(
      detectBot({ "user-agent": "curl/8.0", accept: "*/*" }).reason,
    ).toBe("scraper");
  });
});

describe("isLikelyMaliciousBot (strict)", () => {
  it("returns true for scanners", () => {
    const h = new Headers();
    h.set("user-agent", "nikto/2.5");
    expect(isLikelyMaliciousBot(h)).toBe(true);
  });

  it("returns true for scrapers", () => {
    const h = new Headers();
    h.set("user-agent", "python-requests/2.31");
    expect(isLikelyMaliciousBot(h)).toBe(true);
  });

  it("returns true for missing UA", () => {
    expect(isLikelyMaliciousBot(new Headers())).toBe(true);
  });

  it("does NOT return true for missing-accept alone", () => {
    const h = new Headers();
    h.set("user-agent", "Mozilla/5.0 (X11; Linux) Firefox/120.0");
    // missing accept — strict variant should let this through
    expect(isLikelyMaliciousBot(h)).toBe(false);
  });

  it("does NOT return true for real browsers", () => {
    expect(isLikelyMaliciousBot(browserHeaders())).toBe(false);
  });
});
