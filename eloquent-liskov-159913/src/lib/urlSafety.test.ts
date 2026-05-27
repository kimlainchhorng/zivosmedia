import { describe, it, expect } from "vitest";
import {
  isSafeProtocol,
  isPunycodeHost,
  hasSuspiciousTld,
  hasEmbeddedCredentials,
  isUrlShortener,
  isZivoTyposquat,
  isAllowedPartnerUrl,
  sanitizePathSegment,
} from "./urlSafety";

describe("isSafeProtocol", () => {
  it("rejects javascript:", () => {
    expect(isSafeProtocol("javascript:alert(1)")).toBe(false);
  });
  it("rejects data:", () => {
    expect(isSafeProtocol("data:text/html,<script>")).toBe(false);
  });
  it("rejects vbscript:", () => {
    expect(isSafeProtocol("vbscript:msgbox(1)")).toBe(false);
  });
  it("rejects file:", () => {
    expect(isSafeProtocol("file:///etc/passwd")).toBe(false);
  });
  it("accepts https://", () => {
    expect(isSafeProtocol("https://example.com")).toBe(true);
  });
  it("accepts http://", () => {
    expect(isSafeProtocol("http://example.com")).toBe(true);
  });
  it("is case-insensitive", () => {
    expect(isSafeProtocol("JavaScript:alert(1)")).toBe(false);
  });
});

describe("isPunycodeHost", () => {
  it("flags xn-- prefix", () => {
    expect(isPunycodeHost("https://xn--pple-43d.com")).toBe(true);
  });
  it("does not flag plain ASCII", () => {
    expect(isPunycodeHost("https://apple.com")).toBe(false);
  });
});

describe("hasSuspiciousTld", () => {
  it("flags .zip", () => {
    expect(hasSuspiciousTld("https://login.zip/")).toBe(true);
  });
  it("flags .tk", () => {
    expect(hasSuspiciousTld("https://promo.tk/free")).toBe(true);
  });
  it("does not flag .com", () => {
    expect(hasSuspiciousTld("https://example.com")).toBe(false);
  });
});

describe("hasEmbeddedCredentials", () => {
  it("flags user:pass@host", () => {
    expect(hasEmbeddedCredentials("https://admin:hunter2@evil.com")).toBe(true);
  });
  it("flags user-only", () => {
    expect(hasEmbeddedCredentials("https://admin@evil.com")).toBe(true);
  });
  it("does not flag clean URL", () => {
    expect(hasEmbeddedCredentials("https://hizivo.com/login")).toBe(false);
  });
});

describe("isUrlShortener", () => {
  it("flags bit.ly", () => {
    expect(isUrlShortener("https://bit.ly/abc")).toBe(true);
  });
  it("flags t.co", () => {
    expect(isUrlShortener("https://t.co/abc")).toBe(true);
  });
  it("flags tinyurl.com", () => {
    expect(isUrlShortener("https://tinyurl.com/abc")).toBe(true);
  });
  it("does not flag normal hosts", () => {
    expect(isUrlShortener("https://hizivo.com/abc")).toBe(false);
  });
  it("returns false on invalid URL", () => {
    expect(isUrlShortener("not-a-url")).toBe(false);
  });
});

describe("isZivoTyposquat", () => {
  it("flags h1zivo.com (1-char digit swap)", () => {
    expect(isZivoTyposquat("https://h1zivo.com/login")).toBe(true);
  });
  it("flags hizovo.com (transpose)", () => {
    expect(isZivoTyposquat("https://hizovo.com")).toBe(true);
  });
  it("flags hizvo.com (1-char drop)", () => {
    expect(isZivoTyposquat("https://hizvo.com")).toBe(true);
  });
  it("does NOT flag the real hizivo.com", () => {
    expect(isZivoTyposquat("https://hizivo.com")).toBe(false);
  });
  it("does NOT flag a subdomain of the real domain", () => {
    expect(isZivoTyposquat("https://app.hizivo.com")).toBe(false);
  });
  it("does NOT flag wildly different domains", () => {
    expect(isZivoTyposquat("https://google.com")).toBe(false);
  });
});

describe("isAllowedPartnerUrl", () => {
  it("accepts booking.com", () => {
    expect(isAllowedPartnerUrl("https://booking.com/hotel")).toBe(true);
  });
  it("accepts subdomain of booking.com", () => {
    expect(isAllowedPartnerUrl("https://www.booking.com/hotel")).toBe(true);
  });
  it("rejects evil.com", () => {
    expect(isAllowedPartnerUrl("https://evil.com")).toBe(false);
  });
});

describe("sanitizePathSegment", () => {
  it("accepts a UUID", () => {
    expect(sanitizePathSegment("123e4567-e89b-12d3-a456-426614174000"))
      .toBe("123e4567-e89b-12d3-a456-426614174000");
  });
  it("rejects path traversal", () => {
    expect(sanitizePathSegment("../../etc/passwd")).toBeNull();
  });
  it("rejects slashes", () => {
    expect(sanitizePathSegment("a/b")).toBeNull();
  });
  it("rejects empty", () => {
    expect(sanitizePathSegment("")).toBeNull();
  });
  it("rejects oversized", () => {
    expect(sanitizePathSegment("a".repeat(200))).toBeNull();
  });
});
