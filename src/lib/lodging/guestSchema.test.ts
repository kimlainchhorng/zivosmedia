/**
 * Contract tests for the pure export of guestSchema.ts — validateGuest, the
 * zod-backed validator for the lodging booking guest step.
 *
 * Expected verdicts are grounded by an independent oracle that imports NEITHER
 * the module NOR zod: a clean-room reimplementation of the field rules. The
 * exact {valid, errors} objects pinned here were first captured from the
 * installed zod in Node v22, then cross-checked by both the oracle and this
 * vitest run against the real module.
 *
 * LOAD-BEARING, non-obvious contracts pinned:
 *   - name is TRIMMED before the min(2) check, so "  Jo  " passes while "   "
 *     (trims to "") fails;
 *   - phone validity is ">= 7 digits AFTER stripping non-digits", and FULLWIDTH
 *     digits normalize to ASCII, so "５５５１２３４" is valid; "555-1234" (7) is
 *     the passing boundary and "555-123" (6) fails;
 *   - validateGuest keeps only the FIRST issue per field;
 *   - the messages are the app's CUSTOM messages, not zod defaults.
 */
import { describe, it, expect } from "vitest";
import { validateGuest } from "./guestSchema";

describe("validateGuest — fully valid guest", () => {
  it("returns valid:true and empty errors", () => {
    expect(validateGuest({ name: "Jane Doe", phone: "+1 650 555 1234", email: "jane@example.com" }))
      .toEqual({ valid: true, errors: {} });
  });
});

describe("validateGuest — name rules", () => {
  it("rejects a too-short name", () => {
    expect(validateGuest({ name: "J", phone: "5551234", email: "jane@example.com" }))
      .toEqual({ valid: false, errors: { name: "Please enter your full name" } });
  });

  it("accepts a name that trims to exactly 2 chars", () => {
    expect(validateGuest({ name: "  Jo  ", phone: "5551234", email: "jane@example.com" }))
      .toEqual({ valid: true, errors: {} });
  });

  it("rejects an all-whitespace name (trims to empty)", () => {
    expect(validateGuest({ name: "   ", phone: "5551234", email: "jane@example.com" }))
      .toEqual({ valid: false, errors: { name: "Please enter your full name" } });
  });
});

describe("validateGuest — phone rules", () => {
  it("accepts the 7-digit boundary", () => {
    expect(validateGuest({ name: "Jane", phone: "555-1234", email: "jane@example.com" }))
      .toEqual({ valid: true, errors: {} });
  });

  it("rejects 6 digits", () => {
    expect(validateGuest({ name: "Jane", phone: "555-123", email: "jane@example.com" }))
      .toEqual({ valid: false, errors: { phone: "Enter a valid phone number" } });
  });

  it("accepts fullwidth digits that normalize to ASCII", () => {
    expect(validateGuest({ name: "Jane", phone: "５５５１２３４", email: "jane@example.com" }))
      .toEqual({ valid: true, errors: {} });
  });
});

describe("validateGuest — email rule", () => {
  it("rejects an invalid email", () => {
    expect(validateGuest({ name: "Jane", phone: "5551234", email: "not-an-email" }))
      .toEqual({ valid: false, errors: { email: "Enter a valid email" } });
  });
});

describe("validateGuest — combined", () => {
  it("returns one error per failing field", () => {
    expect(validateGuest({ name: " ", phone: "x", email: "bad" }))
      .toEqual({
        valid: false,
        errors: {
          name: "Please enter your full name",
          phone: "Enter a valid phone number",
          email: "Enter a valid email",
        },
      });
  });
});
