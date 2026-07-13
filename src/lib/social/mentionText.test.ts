/**
 * Contract tests for the pure exports of mentionText.ts — detectMention and
 * applyMention, the @-mention autocomplete helpers.
 *
 * Expected values are grounded by an independent oracle that does NOT import the
 * module: a clean-room reimplementation re-derived from the documented rules
 * (backward scan from the caret, a 30-char lookback window, "@" valid only at
 * index 0 or after whitespace, and the apply replace-or-append fallback).
 * String.slice / RegExp `\s` / template strings are shared JS primitives; this
 * vitest run against the real module is the cross-check.
 *
 * LOAD-BEARING, non-obvious contracts pinned:
 *   - a lone "@" yields an EMPTY-string query, not null;
 *   - the 30-char lookback window: "@"+29 chars is reachable at caret 30, but
 *     "@"+30 chars is one past it (null at caret 31);
 *   - detectMention REJECTS a mid-word "@" ("a@b" -> null) while applyMention
 *     REPLACES from a mid-word "@" ("x@y" -> "x@bob ");
 *   - applyMention preserves after-caret text (so "hi @b world" gains a DOUBLE
 *     space) and the append fallback adds NO separator ("hello" -> "hello@bob ");
 *   - the returned caret sits right after the inserted "@handle ".
 */
import { describe, it, expect } from "vitest";
import { detectMention, applyMention } from "./mentionText";

describe("detectMention — valid prefixes", () => {
  it("treats a lone '@' as an empty-string query", () => {
    expect(detectMention("@", 1)).toBe("");
  });

  it("returns the full query at end of text", () => {
    expect(detectMention("@bob", 4)).toBe("bob");
  });

  it("returns only the partial query up to the caret", () => {
    expect(detectMention("@bob", 2)).toBe("b");
  });

  it("accepts an '@' preceded by a space", () => {
    expect(detectMention("hi @bob", 7)).toBe("bob");
  });

  it("accepts an '@' preceded by a tab", () => {
    expect(detectMention("\t@bob", 5)).toBe("bob");
  });
});

describe("detectMention — rejections", () => {
  it("returns null when the caret is at or before 0", () => {
    expect(detectMention("", 0)).toBeNull();
    expect(detectMention("@", 0)).toBeNull();
  });

  it("rejects a mid-word '@' (preceded by a non-space)", () => {
    expect(detectMention("a@b", 3)).toBeNull();
  });

  it("returns null when whitespace is hit before any '@'", () => {
    expect(detectMention("hi bob", 6)).toBeNull();
  });

  it("returns null when the caret is past the end of text", () => {
    expect(detectMention("@bob", 5)).toBeNull();
  });
});

describe("detectMention — 30-char lookback window", () => {
  it("reaches an '@' exactly 29 chars back (index 0, caret 30)", () => {
    expect(detectMention("@" + "a".repeat(29), 30)).toBe("a".repeat(29));
  });

  it("cannot reach an '@' one position past the window (caret 31)", () => {
    expect(detectMention("@" + "a".repeat(30), 31)).toBeNull();
  });
});

describe("applyMention — replace at the mention", () => {
  it("replaces a partial mention and lands the caret after the trailing space", () => {
    expect(applyMention("hi @bo", 6, "bob")).toEqual({ value: "hi @bob ", caret: 8 });
  });

  it("replaces from a lone '@'", () => {
    expect(applyMention("@", 1, "bob")).toEqual({ value: "@bob ", caret: 5 });
  });

  it("replaces from a mid-word '@' (unlike detectMention)", () => {
    expect(applyMention("x@y", 3, "bob")).toEqual({ value: "x@bob ", caret: 6 });
  });

  it("preserves text after the caret, producing a double space", () => {
    expect(applyMention("hi @b world", 5, "bob")).toEqual({ value: "hi @bob  world", caret: 8 });
  });
});

describe("applyMention — append fallback", () => {
  it("appends to empty text", () => {
    expect(applyMention("", 0, "bob")).toEqual({ value: "@bob ", caret: 5 });
  });

  it("appends after a trailing space (whitespace breaks the scan)", () => {
    expect(applyMention("hi ", 3, "bob")).toEqual({ value: "hi @bob ", caret: 8 });
  });

  it("appends with NO separator when there is no '@' and no space", () => {
    expect(applyMention("hello", 5, "bob")).toEqual({ value: "hello@bob ", caret: 10 });
  });
});
