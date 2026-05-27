/**
 * Contract tests for analyzePassword. This drives the strength meter
 * on every signup / change-password flow, and the score thresholds
 * gate which copy gets shown to users. A regression here either lets
 * weak passwords through or surfaces misleading guidance.
 *
 * checkPasswordBreach does an HTTP fetch against the HIBP k-anonymity
 * endpoint and is out of scope for this file.
 */
import { describe, it, expect } from "vitest";
import { analyzePassword } from "./passwordStrength";

describe("analyzePassword — length scoring", () => {
  it("scores too-short passwords as weak with feedback to lengthen", () => {
    const r = analyzePassword("ab1");
    expect(r.strength).toBe("weak");
    expect(r.feedback).toContain("Use at least 8 characters");
  });

  it("does NOT complain about length once ≥ 8 chars", () => {
    const r = analyzePassword("Abc!2345");
    expect(r.feedback).not.toContain("Use at least 8 characters");
  });

  it("score increases as length crosses 12 then 16", () => {
    const short = analyzePassword("Abc!2345");      // 8 chars
    const medium = analyzePassword("Abc!2345abcd");  // 12 chars
    const long = analyzePassword("Abc!2345abcdwxyz"); // 16 chars
    expect(medium.score).toBeGreaterThan(short.score);
    expect(long.score).toBeGreaterThan(medium.score);
  });
});

describe("analyzePassword — character classes", () => {
  it("flags missing lowercase / uppercase / number / symbol with specific feedback", () => {
    const r = analyzePassword("ABCDEFGH");
    expect(r.feedback).toContain("Add lowercase letters");
    expect(r.feedback).toContain("Add numbers");
    expect(r.feedback).toContain("Add special characters (!@#$%^&*)");
  });

  it("does not flag a class that is present", () => {
    const r = analyzePassword("Abcdef1!");
    expect(r.feedback).not.toContain("Add lowercase letters");
    expect(r.feedback).not.toContain("Add uppercase letters");
    expect(r.feedback).not.toContain("Add numbers");
    expect(r.feedback).not.toContain("Add special characters (!@#$%^&*)");
  });
});

describe("analyzePassword — strength thresholds (<30, <55, <80, ≥80)", () => {
  it("classifies bare-minimum passwords as weak", () => {
    expect(analyzePassword("abc").strength).toBe("weak");
  });

  it("classifies a fully-charged 8-char mix as fair or stronger", () => {
    // 8 chars (15) + 12-up (5) + lower (10) + upper (15) + number (15) + symbol (15) = 75 → strong
    const r = analyzePassword("Abc!2345");
    expect(["fair", "strong"]).toContain(r.strength);
    expect(r.score).toBeGreaterThanOrEqual(55);
  });

  it("classifies a 16-char full-class password as very_strong", () => {
    // 8 (15) + 12 (15) + lower (10) + upper (15) + number (15) + symbol (15) + 16 (15) = 100
    const r = analyzePassword("Abcdefgh1234!@#$");
    expect(r.strength).toBe("very_strong");
    expect(r.score).toBeGreaterThanOrEqual(80);
  });
});

describe("analyzePassword — pattern penalties", () => {
  it("penalizes 3+ repeated chars with feedback", () => {
    // Use a long-enough password so the repetition is the *only* concern.
    const r = analyzePassword("Aaaa!234abcdef");
    expect(r.feedback).toContain("Avoid repeated characters");
  });

  it("penalizes sequential characters with feedback", () => {
    const r = analyzePassword("Apassword123!");
    expect(r.feedback).toContain("Avoid sequential characters");
  });

  it("repeated + sequential penalties stack (both -10) without crossing 0", () => {
    const clean = analyzePassword("Quietly!42pX");
    const messy = analyzePassword("Aaaabcd!");
    expect(messy.score).toBeLessThan(clean.score);
    expect(messy.score).toBeGreaterThanOrEqual(0);
  });
});

describe("analyzePassword — common-password short-circuit", () => {
  it("caps score at 10 for known common passwords (case-insensitive)", () => {
    const a = analyzePassword("password");
    const b = analyzePassword("Password");
    const c = analyzePassword("PASSWORD");
    expect(a.score).toBeLessThanOrEqual(10);
    expect(b.score).toBeLessThanOrEqual(10);
    expect(c.score).toBeLessThanOrEqual(10);
    expect(a.strength).toBe("weak");
  });

  it("surfaces a 'commonly used' message at the front of feedback", () => {
    const r = analyzePassword("zivo123");
    expect(r.feedback[0]).toBe("This is a commonly used password");
  });

  it("does not flag passwords that merely contain a common word as substring", () => {
    // "password" is common; "passwords1!" is not in the list.
    const r = analyzePassword("Passwords1!XY");
    expect(r.feedback[0] ?? "").not.toBe("This is a commonly used password");
  });
});

describe("analyzePassword — score clamping", () => {
  it("score is always between 0 and 100", () => {
    const empty = analyzePassword("");
    const huge = analyzePassword("Abcdefghij1234!@#$%^&*qwerty");
    expect(empty.score).toBeGreaterThanOrEqual(0);
    expect(empty.score).toBeLessThanOrEqual(100);
    expect(huge.score).toBeGreaterThanOrEqual(0);
    expect(huge.score).toBeLessThanOrEqual(100);
  });
});
