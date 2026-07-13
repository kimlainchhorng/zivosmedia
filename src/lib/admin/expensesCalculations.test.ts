/**
 * Contract tests for the Auto Repair expenses analytics math. These functions
 * decide the COGS-vs-OPEX split, period-over-period deltas, and the
 * category/vendor/time aggregations a shop owner reads off the dashboard — a
 * silent change to the COGS category set, the delta thresholds, the avg
 * rounding, or a grouping key would quietly misstate money. Every expected
 * value below was ground-truthed by an independent reimplementation of the
 * documented rules (not by calling the module under test), and all dated inputs
 * are chosen to be timezone- and DST-stable.
 */
import { describe, it, expect } from "vitest";
import {
  isCogs,
  fmtMoney,
  computeExpensesKpis,
  compareDelta,
  expensesByCategory,
  expensesByVendor,
  groupExpensesSeries,
  previousExpensesRange,
  type ExpenseRowLite,
} from "./expensesCalculations";

const row = (over: Partial<ExpenseRowLite>): ExpenseRowLite => ({
  id: "x",
  amount_cents: 0,
  category: null,
  vendor: null,
  expense_date: "2026-03-10",
  payment_method: null,
  description: null,
  ...over,
});

const ROWS: ExpenseRowLite[] = [
  row({ id: "1", amount_cents: 10000, category: "Parts", vendor: "NAPA", expense_date: "2026-03-10" }),
  row({ id: "2", amount_cents: 5000, category: "labor", vendor: "NAPA", expense_date: "2026-03-10" }),
  row({ id: "3", amount_cents: 2500, category: "supplies", vendor: "O'Reilly", expense_date: "2026-03-12" }),
  row({ id: "4", amount_cents: 3000, category: null, vendor: null, expense_date: "2026-03-20" }),
];

describe("isCogs", () => {
  it("matches the COGS category set case-insensitively", () => {
    expect(isCogs("Parts")).toBe(true);
    expect(isCogs("INVENTORY")).toBe(true);
    expect(isCogs("supplies")).toBe(true);
    expect(isCogs("materials")).toBe(true);
  });

  it("treats labor / null / empty as non-COGS (OPEX)", () => {
    expect(isCogs("labor")).toBe(false);
    expect(isCogs(null)).toBe(false);
    expect(isCogs(undefined)).toBe(false);
    expect(isCogs("")).toBe(false);
  });
});

describe("fmtMoney", () => {
  it("formats cents as dollars with exactly two decimals", () => {
    expect(fmtMoney(0)).toBe("$0.00");
    expect(fmtMoney(5)).toBe("$0.05");
    expect(fmtMoney(99)).toBe("$0.99");
    expect(fmtMoney(12345)).toBe("$123.45");
  });

  it("guards null/undefined to $0.00 and preserves sign for negatives", () => {
    expect(fmtMoney(null as unknown as number)).toBe("$0.00");
    expect(fmtMoney(-12345)).toBe("$-123.45");
  });
});

describe("computeExpensesKpis", () => {
  it("splits total into COGS/OPEX, rounds the average, and counts distinct vendors", () => {
    expect(computeExpensesKpis(ROWS)).toEqual({
      total: 20500,
      cogs: 12500, // Parts 10000 + supplies 2500
      opex: 8000, // labor 5000 + uncategorized 3000
      count: 4,
      avg: 5125, // round(20500 / 4)
      vendorCount: 3, // NAPA, O'Reilly, Unknown(null)
    });
  });

  it("returns all-zero KPIs for an empty list (no divide-by-zero)", () => {
    expect(computeExpensesKpis([])).toEqual({
      total: 0, cogs: 0, opex: 0, count: 0, avg: 0, vendorCount: 0,
    });
  });
});

describe("compareDelta", () => {
  it("reports flat when both periods are zero", () => {
    expect(compareDelta(0, 0)).toEqual({ pct: 0, direction: "flat" });
  });

  it("reports +100% up when the previous period was zero", () => {
    expect(compareDelta(50, 0)).toEqual({ pct: 100, direction: "up" });
  });

  it("computes signed percentage change against the previous period", () => {
    expect(compareDelta(150, 100)).toEqual({ pct: 50, direction: "up" });
    expect(compareDelta(50, 100)).toEqual({ pct: -50, direction: "down" });
    expect(compareDelta(100, 100)).toEqual({ pct: 0, direction: "flat" });
  });

  it("uses a ±0.5% dead-band around flat", () => {
    const small = compareDelta(100.4, 100); // +0.4% -> flat
    expect(small.pct).toBeCloseTo(0.4, 10);
    expect(small.direction).toBe("flat");
    expect(compareDelta(101, 100)).toEqual({ pct: 1, direction: "up" });
  });
});

describe("expensesByCategory", () => {
  it("aggregates by lower-cased category (null -> uncategorized), sorted by amount desc", () => {
    expect(expensesByCategory(ROWS)).toEqual([
      { category: "parts", amount: 10000, count: 1 },
      { category: "labor", amount: 5000, count: 1 },
      { category: "uncategorized", amount: 3000, count: 1 },
      { category: "supplies", amount: 2500, count: 1 },
    ]);
  });

  it("folds different-cased categories into one bucket", () => {
    const out = expensesByCategory([
      row({ amount_cents: 100, category: "Parts" }),
      row({ amount_cents: 200, category: "parts" }),
    ]);
    expect(out).toEqual([{ category: "parts", amount: 300, count: 2 }]);
  });
});

describe("expensesByVendor", () => {
  it("aggregates by vendor, mapping null and whitespace-only names to Unknown", () => {
    const rows = [...ROWS, row({ id: "5", amount_cents: 700, category: "parts", vendor: "   ", expense_date: "2026-03-21" })];
    expect(expensesByVendor(rows)).toEqual([
      { vendor: "NAPA", amount: 15000, count: 2 },
      { vendor: "Unknown", amount: 3700, count: 2 }, // null (3000) + whitespace (700)
      { vendor: "O'Reilly", amount: 2500, count: 1 },
    ]);
  });
});

describe("groupExpensesSeries", () => {
  it("buckets by day, sorts ascending, and carries a running cumulative", () => {
    expect(groupExpensesSeries(ROWS, "day")).toEqual([
      { date: "2026-03-10", spent: 15000, cumulative: 15000 },
      { date: "2026-03-12", spent: 2500, cumulative: 17500 },
      { date: "2026-03-20", spent: 3000, cumulative: 20500 },
    ]);
  });

  it("preserves the grand total in the final cumulative for any grouping", () => {
    for (const g of ["day", "week", "month"] as const) {
      const series = groupExpensesSeries(ROWS, g);
      const sumSpent = series.reduce((s, p) => s + p.spent, 0);
      expect(sumSpent).toBe(20500);
      expect(series[series.length - 1].cumulative).toBe(20500);
    }
  });
});

describe("previousExpensesRange", () => {
  it("returns the equal-length window immediately preceding the input range", () => {
    expect(previousExpensesRange("2026-05-10", "2026-05-16")).toEqual({
      from: "2026-05-03",
      to: "2026-05-09",
    });
  });

  it("handles a single-day range (previous = the day before)", () => {
    expect(previousExpensesRange("2026-05-10", "2026-05-10")).toEqual({
      from: "2026-05-09",
      to: "2026-05-09",
    });
  });
});
