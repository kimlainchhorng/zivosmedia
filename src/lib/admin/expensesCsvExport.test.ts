// Contract tests for exportExpensesCsv — pins the CSV formula-injection defense
// (CWE-1236) and RFC-4180 quoting, driven through the REAL exported function and
// verified against an independent clean-room oracle. Only locale-independent
// free-text cells (store name, vendor) are asserted; money cells go through
// fmtMoney (toLocaleString) and are deliberately never pinned. The header-row
// indices are stable: line 0 = title, line 1 = Store, line 2 = Period.
import { describe, it, expect } from "vitest";
import { exportExpensesCsv, type ExpensesExportPayload } from "./expensesCsvExport";

function makePayload(over: Partial<ExpensesExportPayload> = {}): ExpensesExportPayload {
  return {
    storeName: "ZIVO",
    from: "2026-01-01",
    to: "2026-01-31",
    kpis: { total: 0, cogs: 0, opex: 0, count: 0, avg: 0, vendorCount: 0 },
    series: [],
    byCategory: [],
    byVendor: [],
    expenses: [],
    ...over,
  };
}

// The escaped Store cell lives on line index 1 (no embedded newline in inputs
// here, so splitting on "\n" is unambiguous for these cases).
const storeLine = (storeName: string): string =>
  exportExpensesCsv(makePayload({ storeName })).split("\n")[1];

describe("exportExpensesCsv — header rows", () => {
  it("emits title, store and period rows in order", () => {
    const lines = exportExpensesCsv(makePayload({ storeName: "ZIVO Auto" })).split("\n");
    expect(lines[0]).toBe("ZIVO Auto Repair — Expenses & Bills");
    expect(lines[1]).toBe("Store,ZIVO Auto");
    expect(lines[2]).toBe("Period,2026-01-01 to 2026-01-31");
  });

  it("renders an empty store cell when storeName is omitted", () => {
    const lines = exportExpensesCsv(makePayload({ storeName: undefined })).split("\n");
    expect(lines[1]).toBe("Store,");
  });
});

describe("exportExpensesCsv — formula-injection neutralization (CWE-1236)", () => {
  it("prefixes a leading = with an apostrophe", () => {
    expect(storeLine("=SUM(A1)")).toBe("Store,'=SUM(A1)");
  });

  it("prefixes leading +, @, and non-numeric -", () => {
    expect(storeLine("+1234567890")).toBe("Store,'+1234567890");
    expect(storeLine("@import")).toBe("Store,'@import");
    expect(storeLine("-5+3")).toBe("Store,'-5+3");
  });

  it("catches a formula hidden behind leading whitespace", () => {
    expect(storeLine(" =cmd")).toBe("Store,' =cmd");
  });

  it("prefixes a leading tab without quoting it", () => {
    expect(storeLine("\tx")).toBe("Store,'\tx");
  });

  it("leaves a legit negative money value untouched", () => {
    expect(storeLine("-5.00")).toBe("Store,-5.00");
    expect(storeLine("-1")).toBe("Store,-1");
  });

  it("does not treat scientific notation as a safe number", () => {
    expect(storeLine("-5e9")).toBe("Store,'-5e9");
  });
});

describe("exportExpensesCsv — RFC-4180 quoting", () => {
  it("quotes a value containing a comma", () => {
    expect(storeLine("Joe's Garage, Inc")).toBe('Store,"Joe\'s Garage, Inc"');
  });

  it("doubles embedded double-quotes", () => {
    expect(storeLine('Say "Hi"')).toBe('Store,"Say ""Hi"""');
  });

  it("places the apostrophe inside the quotes for a formula+comma value", () => {
    expect(storeLine("=cmd,evil")).toBe('Store,"\'=cmd,evil"');
  });

  it("quotes a value containing a lone carriage return", () => {
    expect(storeLine("hello\rworld")).toBe('Store,"hello\rworld"');
    expect(storeLine("\rx")).toBe('Store,"\'\rx"');
  });

  it("quotes a value containing an embedded newline", () => {
    const out = exportExpensesCsv(makePayload({ storeName: "line1\nline2" }));
    expect(out).toContain('Store,"line1\nline2"');
  });
});

describe("exportExpensesCsv — data-section free text", () => {
  it("escapes a malicious vendor name in the By vendor section", () => {
    const out = exportExpensesCsv(
      makePayload({ byVendor: [{ vendor: "=cmd", amount: 100, count: 2 }] }),
    );
    const vendorRow = out.split("\n").find((l) => l.startsWith("'=cmd"));
    expect(vendorRow).toBeDefined();
    expect(vendorRow?.startsWith("'=cmd,")).toBe(true);
  });
});
