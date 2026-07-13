/**
 * Contract tests for the performance-report CSV builder. Merchant-controlled
 * strings (campaign names) flow into this exporter, so the CWE-1236 formula
 * neutralization (apostrophe-prefixing cells that start with = + - @ tab or CR)
 * and the RFC-4180 quoting are security load-bearing — a regression would let a
 * crafted campaign name execute as a formula in Excel/Sheets, or corrupt the
 * file. The numeric carve-out must NOT neutralize legitimate negative numbers.
 * Outputs were ground-truthed by an independent reimplementation of the rules.
 */
import { describe, it, expect } from "vitest";
import { buildCsv } from "./performanceCsvExport";

// escapeCell isn't exported; exercise it through a single-cell row.
const cell = (v: string | number) => buildCsv([[v]]);

describe("CSV formula-injection neutralization (CWE-1236)", () => {
  it("prefixes an apostrophe to cells beginning with a formula trigger", () => {
    expect(cell("=SUM(A1:A2)")).toBe("'=SUM(A1:A2)");
    expect(cell("+1234")).toBe("'+1234");
    expect(cell("@cmd")).toBe("'@cmd");
    expect(cell("\tTabbed")).toBe("'\tTabbed");
    expect(cell("\rCarriage")).toBe("'\rCarriage");
  });

  it("does NOT neutralize legitimate numbers, including negatives", () => {
    expect(cell("-5.00")).toBe("-5.00");
    expect(cell(-5)).toBe("-5");
    expect(cell(1234)).toBe("1234");
    expect(cell("-")).toBe("'-"); // a lone dash is not a number -> neutralized
    expect(cell("+5")).toBe("'+5"); // leading + is a trigger, not a numeric literal
  });

  it("only triggers on the FIRST character", () => {
    expect(cell("a=b")).toBe("a=b");
    expect(cell("Campaign A")).toBe("Campaign A");
  });
});

describe("RFC-4180 quoting", () => {
  it("quotes cells containing comma, quote, or newline (doubling embedded quotes)", () => {
    expect(cell("a,b")).toBe('"a,b"');
    expect(cell('say "hi"')).toBe('"say ""hi"""');
    expect(cell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("neutralizes a formula trigger AND THEN quotes when both apply", () => {
    expect(cell("=1,2")).toBe('"\'=1,2"');
  });
});

describe("buildCsv structure", () => {
  it("joins cells with commas and rows with newlines", () => {
    expect(buildCsv([["a", "b"], ["c", "d"]])).toBe("a,b\nc,d");
  });

  it("renders null/undefined as empty cells", () => {
    expect(buildCsv([[null as unknown as string, undefined as unknown as string]])).toBe(",");
  });

  it("produces an empty line for an empty row and empty string for no rows", () => {
    expect(buildCsv([[]])).toBe("");
    expect(buildCsv([])).toBe("");
  });

  it("escapes a realistic header + injected campaign row", () => {
    expect(buildCsv([["Name", "Rev"], ["=evil", 1234]])).toBe("Name,Rev\n'=evil,1234");
  });
});
