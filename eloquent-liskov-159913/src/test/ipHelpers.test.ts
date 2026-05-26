/**
 * Tests for the IP-hash + header-parsing helpers used by the abuse-threshold
 * gate. These are pure-ish (only depend on Web Crypto + Headers, both
 * available in vitest/jsdom).
 */
import { describe, it, expect } from "vitest";
import {
  hashIp,
  getRequestIpHash,
} from "../../supabase/functions/_shared/contentLinkValidation";

describe("hashIp", () => {
  it("returns null for null/undefined/empty", async () => {
    expect(await hashIp(null)).toBe(null);
    expect(await hashIp(undefined)).toBe(null);
    expect(await hashIp("")).toBe(null);
  });

  it("returns 64-char hex SHA-256 for an IPv4", async () => {
    const h = await hashIp("203.0.113.42");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns 64-char hex SHA-256 for an IPv6", async () => {
    const h = await hashIp("2001:0db8:85a3::8a2e:0370:7334");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic — same input → same hash", async () => {
    const a = await hashIp("203.0.113.42");
    const b = await hashIp("203.0.113.42");
    expect(a).toBe(b);
  });

  it("different IPs produce different hashes", async () => {
    const a = await hashIp("203.0.113.42");
    const b = await hashIp("203.0.113.43");
    expect(a).not.toBe(b);
  });

  it("does not leak the raw IP in the output", async () => {
    const h = await hashIp("203.0.113.42");
    expect(h).not.toContain("203");
    expect(h).not.toContain("113");
  });
});

const requestWith = (headers: Record<string, string>): Request => {
  return new Request("https://example.com/api/test", { headers });
};

describe("getRequestIpHash", () => {
  it("returns null when no IP headers are present", async () => {
    const r = requestWith({});
    expect(await getRequestIpHash(r)).toBe(null);
  });

  it("prefers cf-connecting-ip over the others", async () => {
    const r = requestWith({
      "cf-connecting-ip": "1.2.3.4",
      "x-forwarded-for": "5.6.7.8",
      "x-real-ip": "9.10.11.12",
    });
    const expected = await hashIp("1.2.3.4");
    expect(await getRequestIpHash(r)).toBe(expected);
  });

  it("falls back to x-forwarded-for first IP when cf-connecting-ip is missing", async () => {
    const r = requestWith({
      "x-forwarded-for": "5.6.7.8, 10.0.0.1, 192.168.1.1",
      "x-real-ip": "9.10.11.12",
    });
    const expected = await hashIp("5.6.7.8");
    expect(await getRequestIpHash(r)).toBe(expected);
  });

  it("trims whitespace from x-forwarded-for client IP", async () => {
    const r = requestWith({ "x-forwarded-for": "  5.6.7.8 , 10.0.0.1" });
    const expected = await hashIp("5.6.7.8");
    expect(await getRequestIpHash(r)).toBe(expected);
  });

  it("falls back to x-real-ip last", async () => {
    const r = requestWith({ "x-real-ip": "9.10.11.12" });
    const expected = await hashIp("9.10.11.12");
    expect(await getRequestIpHash(r)).toBe(expected);
  });
});
