import { describe, it, expect } from "vitest";
import {
  isSafeProtocol,
  isPunycodeHost,
  hasSuspiciousTld,
  hasEmbeddedCredentials,
  isUrlShortener,
  isZivoTyposquat,
  isAllowedPartnerUrl,
  isAllowedCheckoutUrl,
  isAllowedStripeConnectUrl,
  isAllowedPayPalCheckoutUrl,
  isAllowedSquareCheckoutUrl,
  validateExternalUrl,
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
  it("rejects schemes split by an embedded tab", () => {
    expect(isSafeProtocol("java" + String.fromCharCode(9) + "script:alert(1)")).toBe(false);
  });
  it("rejects schemes split by an embedded newline", () => {
    expect(isSafeProtocol("java" + String.fromCharCode(10) + "script:alert(1)")).toBe(false);
  });
  it("rejects a scheme hidden behind a leading control char", () => {
    expect(isSafeProtocol(String.fromCharCode(1) + "javascript:alert(1)")).toBe(false);
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
    expect(hasEmbeddedCredentials("https://zivosmedia.com/login")).toBe(false);
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
    expect(isUrlShortener("https://zivosmedia.com/abc")).toBe(false);
  });
  it("returns false on invalid URL", () => {
    expect(isUrlShortener("not-a-url")).toBe(false);
  });
});

describe("isZivoTyposquat", () => {
  it("flags z1vosmedia.com (1-char digit swap)", () => {
    expect(isZivoTyposquat("https://z1vosmedia.com/login")).toBe(true);
  });
  it("flags zivosmedai.com (transpose)", () => {
    expect(isZivoTyposquat("https://zivosmedai.com")).toBe(true);
  });
  it("flags zivosmeda.com (1-char drop)", () => {
    expect(isZivoTyposquat("https://zivosmeda.com")).toBe(true);
  });
  it("does NOT flag the real zivosmedia.com", () => {
    expect(isZivoTyposquat("https://zivosmedia.com")).toBe(false);
  });
  it("does NOT flag a subdomain of the real domain", () => {
    expect(isZivoTyposquat("https://app.zivosmedia.com")).toBe(false);
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
  it("rejects HTTP and credential-bearing partner URLs", () => {
    expect(isAllowedPartnerUrl("http://booking.com/hotel")).toBe(false);
    expect(isAllowedPartnerUrl("https://user:pass@booking.com/hotel")).toBe(false);
  });
});

describe("validateExternalUrl", () => {
  it("accepts HTTPS links and rejects custom protocols or credentials", () => {
    expect(validateExternalUrl("https://example.com/path")).toBe("https://example.com/path");
    expect(validateExternalUrl("javascript:alert(1)")).toBeNull();
    expect(validateExternalUrl("web+zivo://example.com")).toBeNull();
    expect(validateExternalUrl("https://user:pass@example.com/path")).toBeNull();
  });
});

describe("server-returned Stripe URLs", () => {
  it("accepts HTTPS Stripe Checkout URLs", () => {
    expect(isAllowedCheckoutUrl("https://checkout.stripe.com/c/pay/cs_test_123")).toBe(true);
  });

  it("rejects non-HTTPS or non-Stripe checkout URLs", () => {
    expect(isAllowedCheckoutUrl("http://checkout.stripe.com/c/pay/cs_test_123")).toBe(false);
    expect(isAllowedCheckoutUrl("https://checkout.stripe.com.evil.example/c/pay/cs_test_123")).toBe(false);
  });

  it("rejects checkout URLs with embedded credentials", () => {
    expect(isAllowedCheckoutUrl("https://attacker:secret@checkout.stripe.com/c/pay/cs_test_123")).toBe(false);
  });

  it("accepts Stripe Connect and rejects lookalike hosts", () => {
    expect(isAllowedStripeConnectUrl("https://connect.stripe.com/setup/s/acct_123")).toBe(true);
    expect(isAllowedStripeConnectUrl("https://stripe.com.evil.example/setup")).toBe(false);
    expect(isAllowedStripeConnectUrl("https://attacker:secret@connect.stripe.com/setup")).toBe(false);
  });
});

describe("server-returned hosted payment URLs", () => {
  it("accepts official PayPal and Square HTTPS hosts", () => {
    expect(isAllowedPayPalCheckoutUrl("https://www.sandbox.paypal.com/checkoutnow?token=abc")).toBe(true);
    expect(isAllowedSquareCheckoutUrl("https://square.link/u/example")).toBe(true);
  });

  it("rejects lookalike, insecure, and credential-bearing provider URLs", () => {
    expect(isAllowedPayPalCheckoutUrl("https://paypal.com.evil.example/checkoutnow")).toBe(false);
    expect(isAllowedPayPalCheckoutUrl("http://www.paypal.com/checkoutnow")).toBe(false);
    expect(isAllowedSquareCheckoutUrl("https://square.link.evil.example/u/example")).toBe(false);
    expect(isAllowedSquareCheckoutUrl("https://attacker:secret@square.link/u/example")).toBe(false);
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
