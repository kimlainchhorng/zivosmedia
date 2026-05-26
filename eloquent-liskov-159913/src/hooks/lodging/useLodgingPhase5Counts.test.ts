import { describe, it, expect } from "vitest";
import { countActive, countAwaitingReply } from "./useLodgingPhase5Counts";

describe("countActive", () => {
  it("returns 0 for null/undefined", () => {
    expect(countActive(null)).toBe(0);
    expect(countActive(undefined)).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(countActive([])).toBe(0);
  });

  it("counts rows with active === true", () => {
    expect(countActive([{ active: true }, { active: true }])).toBe(2);
  });

  it("counts rows where active is missing as active (default true)", () => {
    expect(countActive([{}, {}, {}])).toBe(3);
  });

  it("excludes rows with active === false", () => {
    expect(countActive([{ active: true }, { active: false }, { active: true }])).toBe(2);
  });

  it("treats undefined active as active", () => {
    expect(countActive([{ active: undefined }, { active: true }])).toBe(2);
  });
});

describe("countAwaitingReply", () => {
  it("returns 0 for null/undefined", () => {
    expect(countAwaitingReply(null)).toBe(0);
    expect(countAwaitingReply(undefined)).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(countAwaitingReply([])).toBe(0);
  });

  it("counts rows where reply is null", () => {
    expect(countAwaitingReply([{ reply: null }, { reply: null }])).toBe(2);
  });

  it("counts rows where reply is missing", () => {
    expect(countAwaitingReply([{}, {}])).toBe(2);
  });

  it("counts rows where reply is empty string (falsy)", () => {
    expect(countAwaitingReply([{ reply: "" }])).toBe(1);
  });

  it("excludes rows with a non-empty reply", () => {
    expect(countAwaitingReply([
      { reply: "Thanks for staying!" },
      { reply: null },
      { reply: "We'll do better." },
    ])).toBe(1);
  });

  it("handles mixed inputs", () => {
    expect(countAwaitingReply([
      { reply: "yes" },
      { reply: null },
      {},
      { reply: "" },
      { reply: "no" },
    ])).toBe(3);
  });
});
