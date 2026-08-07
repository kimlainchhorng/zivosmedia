import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { csvFilename, escapeCsvCell, toCsv } from "./csvExport";

describe("escapeCsvCell", () => {
  it("quotes a value containing a comma", () => {
    // The bug this module exists to fix. "Smith, John" in the first column
    // split into two fields and shifted every column after it — silently, so a
    // store owner reconciling the file blames their own records.
    expect(escapeCsvCell("Smith, John")).toBe('"Smith, John"');
  });

  it("doubles embedded quotes", () => {
    expect(escapeCsvCell('He said "hi"')).toBe('"He said ""hi"""');
  });

  it("quotes values containing newlines", () => {
    // An address field with a line break otherwise ends the CSV row early.
    expect(escapeCsvCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
    expect(escapeCsvCell("Line 1\r\nLine 2")).toBe('"Line 1\r\nLine 2"');
  });

  it("leaves ordinary values unquoted", () => {
    expect(escapeCsvCell("Sokha")).toBe("Sokha");
    expect(escapeCsvCell(42)).toBe("42");
    expect(escapeCsvCell(true)).toBe("true");
  });

  it("renders absent values as blank, not as the word null", () => {
    // A column of missing phone numbers printed as "null" looks populated.
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });

  it("does not quote a value that merely contains a space or symbol", () => {
    expect(escapeCsvCell("$12.50")).toBe("$12.50");
    expect(escapeCsvCell("Phnom Penh")).toBe("Phnom Penh");
  });
});

describe("toCsv", () => {
  it("keeps every row the same width even with dirty values", () => {
    // The actual failure mode: a comma in one cell must not change how many
    // fields the row has.
    const csv = toCsv(
      ["Name", "Phone", "Orders"],
      [["Smith, John", "012 345 678", 4], ["Sokha", null, 2]],
    );
    const rows = csv.split("\r\n");
    expect(rows).toHaveLength(3);

    // Field count is only safe to check on the unquoted row; the quoted one is
    // verified by shape above.
    expect(rows[0].split(",")).toHaveLength(3);
    expect(rows[2].split(",")).toHaveLength(3);
    expect(rows[1]).toBe('"Smith, John",012 345 678,4');
    expect(rows[2]).toBe("Sokha,,2");
  });

  it("uses CRLF, as the spec requires", () => {
    expect(toCsv(["A"], [["b"]])).toBe("A\r\nb");
  });

  it("emits headers alone when there are no rows", () => {
    expect(toCsv(["A", "B"], [])).toBe("A,B");
  });
});

describe("csvFilename", () => {
  it("stamps the date so repeat exports do not collide", () => {
    // Two payroll exports in a week otherwise become payroll.csv and
    // payroll (1).csv with no way to tell them apart.
    expect(csvFilename("payroll", new Date(2026, 7, 6))).toBe("payroll-2026-08-06.csv");
  });

  it("sanitises a base that came from user-entered text", () => {
    expect(csvFilename("Sokha's Store / Payroll", new Date(2026, 0, 2)))
      .toBe("sokha-s-store-payroll-2026-01-02.csv");
  });

  it("never produces a nameless file", () => {
    expect(csvFilename("///", new Date(2026, 0, 2))).toBe("export-2026-01-02.csv");
  });

  it("does not put the string NaN in a filename", () => {
    expect(csvFilename("payroll", new Date("nonsense"))).toBe("payroll-unknown-date.csv");
  });
});

describe("every store Export button uses the shared writer", () => {
  const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
  /**
   * Scan the code, not the prose about it.
   *
   * StoreCustomersSection's comment quotes the removed `row.join(",")` to
   * explain why it went. A naive scan flags that sentence and the only way to
   * pass is to delete the explanation — throwing away the reason the rule
   * exists. This is the third time this pattern has bitten in this codebase.
   */
  const stripComments = (source: string) =>
    source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  const SECTIONS = [
    "src/components/admin/StoreCustomersSection.tsx",
    "src/components/admin/store/StoreEmployeesSection.tsx",
    "src/components/admin/store/StorePayrollSection.tsx",
    "src/components/admin/store/StoreScheduleSection.tsx",
    "src/components/admin/store/StoreAttendanceSection.tsx",
    "src/components/admin/store/StoreTimeClockSection.tsx",
  ];

  it("wires an onClick to every Export button", () => {
    // Three of these rendered a button that did nothing. A control that looks
    // interactive and is not costs more trust than a missing feature.
    for (const file of SECTIONS) {
      const source = read(file);
      const buttons = source.match(/<Button[^>]*>[\s\S]{0,120}?Export[\s\S]{0,20}?<\/Button>/g) ?? [];
      expect(buttons.length, `${file} should render an Export button`).toBeGreaterThan(0);
      for (const button of buttons) {
        expect(button, `${file} has an Export button with no handler`).toMatch(/onClick=/);
      }
    }
  });

  it("never hand-rolls the comma joining again", () => {
    // The original bug: row.join(",") with a customer name in column one.
    // "Smith, John" split into two fields and shifted every column after it.
    for (const file of SECTIONS) {
      const source = stripComments(read(file));
      // Any comma-join at all: the shared writer does the joining, so a
      // `join(",")` here means somebody is assembling CSV by hand again.
      // (An earlier version of this assertion used a .map(...).join(",")
      // pattern that could not span the nested paren in
      // `rows.map(r => r.join(",")).join("\n")` — it would not have caught the
      // original bug it was written for.)
      expect(source, `${file} must not build CSV rows by hand`).not.toMatch(/join\(","\)/);
      expect(source, `${file} must not create its own CSV blob`).not.toMatch(/new Blob\(\[[^\]]*csv/i);
      expect(source).toContain("downloadCsv");
    }
  });
});
