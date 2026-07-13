/**
 * Contract tests for the social hashtag helpers. HASHTAG_RE is what turns a caption
 * into the clickable/searchable tags a post is indexed under, and postHasHashtag is
 * the membership check behind "does this post carry tag X" (feed filters, tag pages).
 * Both are correctness- AND security-load-bearing: the extraction bounds (2..30
 * unicode word chars, terminated by any non-word char) decide what becomes a tag,
 * and postHasHashtag builds a RegExp from the caller-supplied `tag`, so it MUST
 * escape regex metacharacters — otherwise a tag like ".." would match any two
 * characters (a regex-injection / false-match bug). Expected values were produced by
 * an independent re-derivation of the documented semantics and cross-checked against
 * JS unicode `\p{L}\p{N}` / `\b` behavior, not by importing the module.
 */
import { describe, it, expect } from "vitest";
import { HASHTAG_RE, postHasHashtag } from "./hashtags";

// Fresh matcher per call: HASHTAG_RE is a global regex (stateful lastIndex).
const extract = (s: string): string[] =>
  [...s.matchAll(new RegExp(HASHTAG_RE.source, HASHTAG_RE.flags))].map((m) => m[1]);

describe("HASHTAG_RE extraction", () => {
  it("captures 2..30 unicode word-char tags and stops at the first non-word char", () => {
    // "#x" dropped (1 char < min 2); "#foo-bar" yields "foo" (hyphen terminates);
    // unicode letters (é) and digits are word chars and pass through.
    expect(extract("Loving #SF and #café_2 today #x #foo-bar #123")).toEqual([
      "SF",
      "café_2",
      "foo",
      "123",
    ]);
  });

  it("enforces the 2-char minimum", () => {
    expect(extract("#a #ab")).toEqual(["ab"]);
  });

  it("caps a tag at 30 characters", () => {
    expect(extract("#" + "a".repeat(31))).toEqual(["a".repeat(30)]);
  });

  it("returns nothing when there is no '#tag' pattern", () => {
    expect(extract("no tags here")).toEqual([]);
  });
});

describe("postHasHashtag", () => {
  it("returns false for empty/missing captions", () => {
    expect(postHasHashtag(null, "foo")).toBe(false);
    expect(postHasHashtag(undefined, "foo")).toBe(false);
    expect(postHasHashtag("", "foo")).toBe(false);
  });

  it("matches a present tag and is case-insensitive on both caption and tag", () => {
    expect(postHasHashtag("love #foo here", "foo")).toBe(true);
    expect(postHasHashtag("love #Foo here", "foo")).toBe(true);
    expect(postHasHashtag("love #foo here", "FOO")).toBe(true);
  });

  it("matches whole tags only (a word boundary follows the tag)", () => {
    expect(postHasHashtag("#foobar", "foo")).toBe(false);
    expect(postHasHashtag("text #foo, end", "foo")).toBe(true); // punctuation is a boundary
  });

  it("requires the leading '#'", () => {
    expect(postHasHashtag("just foo here", "foo")).toBe(false);
  });

  it("escapes regex metacharacters in the tag (no regex-injection false match)", () => {
    // If ".." were used unescaped it would match the two literal chars of "#ab".
    // Because the tag is escaped, it is treated as the literal string "..".
    expect(postHasHashtag("#ab", "..")).toBe(false);
  });
});
