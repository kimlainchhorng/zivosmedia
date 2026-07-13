/**
 * Contract tests for the PURE phone helpers in phone.ts. normalizePhoneDigits is
 * the load-bearing one: it must reduce any human-entered phone string to just its
 * digits, including converting fullwidth digits (U+FF10..U+FF19, common from
 * Japanese/CJK IMEs) to ASCII and dropping every separator, letter and symbol.
 * normalizePhoneE164 prepends "+" only when at least one digit survives (never a
 * bare "+"), and buildPhoneE164 normalizes a dial code and a local number
 * independently then concatenates them behind a single "+".
 *
 * Ground truth is the human reading of "which digit characters are present, in
 * order" — derived by an independent oracle that extracts digits via an explicit
 * fullwidth->ASCII lookup table + ASCII passthrough, NOT via the module's
 * NFKD/regex path. Vectors are restricted to ASCII separators + standard fullwidth
 * digits, where naive extraction and NFKD provably agree; exotic compatibility
 * glyphs (circled/superscript digits) are intentionally excluded.
 */
import { describe, it, expect } from "vitest";
import { normalizePhoneDigits, normalizePhoneE164, buildPhoneE164 } from "./phone";

// Build fullwidth-digit input (U+FF10 + n) so this source file stays pure ASCII;
// the asserted expectations below are independent hard-coded ground truth.
const fw = (s: string) => s.replace(/[0-9]/g, (d) => String.fromCharCode(0xff10 + Number(d)));

describe("normalizePhoneDigits", () => {
  it("strips separators, spaces and punctuation down to digits", () => {
    expect(normalizePhoneDigits("+1 (800) 555-1234")).toBe("18005551234");
    expect(normalizePhoneDigits("hello world!")).toBe("");
  });

  it("drops embedded letters but keeps the digits in order", () => {
    expect(normalizePhoneDigits("abc123def")).toBe("123");
  });

  it("converts fullwidth digits to ASCII (mixed with ASCII separators too)", () => {
    expect(normalizePhoneDigits(fw("819012345678"))).toBe("819012345678");
    expect(normalizePhoneDigits(fw("81") + " 90-" + fw("12"))).toBe("819012");
  });

  it("returns empty string for empty input", () => {
    expect(normalizePhoneDigits("")).toBe("");
  });
});

describe("normalizePhoneE164", () => {
  it("prefixes '+' when digits are present", () => {
    expect(normalizePhoneE164("+1 (800) 555-1234")).toBe("+18005551234");
    expect(normalizePhoneE164(fw("8190"))).toBe("+8190");
  });

  it("returns empty string (never a bare '+') when no digits survive", () => {
    expect(normalizePhoneE164("---")).toBe("");
    expect(normalizePhoneE164("")).toBe("");
  });
});

describe("buildPhoneE164", () => {
  it("normalizes dial code and local number independently then joins behind one '+'", () => {
    expect(buildPhoneE164("+1", "800-555")).toBe("+1800555");
    expect(buildPhoneE164(fw("44"), "20 7946")).toBe("+44207946");
  });

  it("keeps whichever side has digits when the other is empty/non-digit", () => {
    expect(buildPhoneE164("", "5551234")).toBe("+5551234");
    expect(buildPhoneE164("+1", "")).toBe("+1");
    expect(buildPhoneE164("  ", "800")).toBe("+800");
  });

  it("returns empty string when neither side has a digit", () => {
    expect(buildPhoneE164("", "")).toBe("");
  });
});
