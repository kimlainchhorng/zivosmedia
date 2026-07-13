/**
 * Contract tests for the UGC input sanitizer. These functions are the
 * defence-in-depth layer that runs before user content is stored or rendered,
 * so a regression here can reopen an XSS / injection hole. Each assertion below
 * is anchored to the sanitizer's observed output, not its implementation, so a
 * future rewrite that weakens a guard fails loudly.
 */
import { describe, it, expect } from "vitest";
import {
  encodeHtml,
  stripHtml,
  sanitizeText,
  sanitizeName,
  sanitizeUrl,
  sanitizeContent,
  detectInjection,
} from "./inputSanitizer";

describe("encodeHtml", () => {
  it("encodes every HTML-significant character", () => {
    // All eight mapped chars must be escaped — a single missed char (e.g. `=`
    // or backtick) is enough to break out of an attribute context.
    expect(encodeHtml("<a=\"x\">&'`/")).toBe(
      "&lt;a&#x3D;&quot;x&quot;&gt;&amp;&#x27;&#x60;&#x2F;"
    );
  });

  it("leaves safe text untouched", () => {
    expect(encodeHtml("Hello world 123")).toBe("Hello world 123");
  });
});

describe("stripHtml", () => {
  it("removes tags and decodes residual entities to spaces", () => {
    expect(stripHtml("<b>hi</b>&amp;&#65;")).toBe("hi");
  });

  it("leaves inert text (no reconstructed tag) for a nested-tag bypass attempt", () => {
    // Single-pass tag removal: the leftover has no `<`, so it cannot form a
    // live tag even though a naive strip might re-expose one.
    expect(stripHtml("<scr<script>ipt>alert(1)")).toBe("ipt>alert(1)");
  });
});

describe("sanitizeText", () => {
  it("strips tags then collapses all whitespace", () => {
    expect(sanitizeText("  <b>Hi</b>   there  ")).toBe("Hi there");
  });

  it("truncates to maxLength", () => {
    expect(sanitizeText("abcdefghij", 4)).toBe("abcd");
  });
});

describe("sanitizeName", () => {
  it("keeps unicode letters/marks and drops tags + symbols", () => {
    expect(sanitizeName("José <b>M.</b> O'Brien-7 @#$%")).toBe("José M. O'Brien-7");
  });

  it("truncates to maxLength", () => {
    expect(sanitizeName("aaaaaaaa", 3)).toBe("aaa");
  });
});

describe("sanitizeContent", () => {
  it("preserves newlines but collapses horizontal whitespace and strips HTML", () => {
    expect(sanitizeContent("line1<br>\n\tline2   end")).toBe("line1 \n line2 end");
  });
});

describe("sanitizeUrl", () => {
  it("passes http(s) URLs (normalized via URL.href)", () => {
    expect(sanitizeUrl("https://ok.com/x")).toBe("https://ok.com/x");
    expect(sanitizeUrl("http://a.b")).toBe("http://a.b/");
  });

  it("allows a root-relative path but blocks protocol-relative //host", () => {
    expect(sanitizeUrl("/rel/path")).toBe("/rel/path");
    expect(sanitizeUrl("//evil.com")).toBeNull();
  });

  it("blocks javascript: even with case tricks and embedded whitespace", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeUrl("JavaScript:alert(1)")).toBeNull();
    expect(sanitizeUrl("java\tscript:alert(1)")).toBeNull();
  });

  it("blocks other dangerous / non-web schemes", () => {
    expect(sanitizeUrl("data:text/html,<script>")).toBeNull();
    expect(sanitizeUrl("vbscript:msgbox")).toBeNull();
    expect(sanitizeUrl("ftp://x.com")).toBeNull();
    expect(sanitizeUrl("mailto:a@b.com")).toBeNull();
  });

  it("returns null for empty / unparseable input", () => {
    expect(sanitizeUrl("   ")).toBeNull();
    expect(sanitizeUrl("not a url")).toBeNull();
  });
});

describe("detectInjection", () => {
  it("flags each threat class", () => {
    expect(detectInjection("<script>x")).toEqual(["xss"]);
    expect(detectInjection("onerror=alert(1)")).toEqual(["xss"]);
    expect(detectInjection("1 UNION SELECT pw")).toEqual(["sqli"]);
    expect(detectInjection("{{7*7}}")).toEqual(["ssti"]);
    expect(detectInjection("${env}")).toEqual(["ssti"]);
    expect(detectInjection("__proto__[x]")).toEqual(["proto_pollution"]);
  });

  it("returns an empty array for clean input", () => {
    expect(detectInjection("hello world")).toEqual([]);
  });
});
