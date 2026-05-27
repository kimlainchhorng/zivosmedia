/**
 * Contract tests for parseToHSL. Brand themes flow from the database
 * as either hex, hsl(), or already-CSS-variable formatted strings; the
 * runtime theme applier feeds them into Tailwind HSL CSS variables, so
 * any format we miss here breaks white-labeling for the affected
 * tenant.
 */
import { describe, it, expect } from "vitest";
import { parseToHSL } from "./brandTheme";

describe("parseToHSL — pass-through format", () => {
  it("returns CSS-variable formatted strings unchanged", () => {
    expect(parseToHSL("221 83% 53%")).toBe("221 83% 53%");
  });

  it("trims surrounding whitespace before testing for the CSS-var format", () => {
    expect(parseToHSL("  221 83% 53%  ")).toBe("221 83% 53%");
  });
});

describe("parseToHSL — hex format", () => {
  it("converts a #rrggbb hex to the H S% L% CSS-variable form", () => {
    // #3B82F6 is the canonical Tailwind blue-500.
    expect(parseToHSL("#3B82F6")).toBe("217 91% 60%");
  });

  it("accepts hex without the leading #", () => {
    expect(parseToHSL("3B82F6")).toBe("217 91% 60%");
  });

  it("renders pure black as 0/0%/0%", () => {
    expect(parseToHSL("#000000")).toBe("0 0% 0%");
  });

  it("renders pure white as 0/0%/100%", () => {
    expect(parseToHSL("#FFFFFF")).toBe("0 0% 100%");
  });

  it("computes saturated red around hue 0", () => {
    const r = parseToHSL("#FF0000");
    expect(r).toMatch(/^0 100% 50%$/);
  });

  it("computes saturated green around hue 120", () => {
    expect(parseToHSL("#00FF00")).toBe("120 100% 50%");
  });

  it("computes saturated blue around hue 240", () => {
    expect(parseToHSL("#0000FF")).toBe("240 100% 50%");
  });

  it("treats hex letters as case-insensitive", () => {
    expect(parseToHSL("#abcdef")).toBe(parseToHSL("#ABCDEF"));
  });
});

describe("parseToHSL — hsl() function format", () => {
  it("strips the hsl(...) wrapping and returns the CSS-variable form", () => {
    expect(parseToHSL("hsl(221, 83%, 53%)")).toBe("221 83% 53%");
  });

  it("tolerates extra whitespace inside the hsl() form", () => {
    expect(parseToHSL("hsl( 221 ,  83% ,  53% )")).toBe("221 83% 53%");
  });

  it("is case-insensitive about the 'hsl' prefix", () => {
    expect(parseToHSL("HSL(221, 83%, 53%)")).toBe("221 83% 53%");
  });
});

describe("parseToHSL — unknown format fallback", () => {
  it("returns the input as-is when nothing matches (defensive)", () => {
    expect(parseToHSL("rebeccapurple")).toBe("rebeccapurple");
    expect(parseToHSL("rgb(0, 0, 0)")).toBe("rgb(0, 0, 0)");
    expect(parseToHSL("")).toBe("");
  });
});
