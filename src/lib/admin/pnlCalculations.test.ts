/**
 * Contract tests for the Auto Repair P&L helpers. These power every
 * money number on the salon/auto-repair P&L dashboard — silent math
 * bugs here translate directly into wrong revenue, gross margin, or AR
 * aging shown to store owners.
 *
 * Helpers that depend on `today` (presetRange) are not tested here —
 * those need a fake-timer setup. Everything pure-input-to-pure-output is
 * covered.
 */
import { describe, it, expect } from "vitest";
import {
  isCogs,
  safeDiv,
  fmtPct,
  fmtMoney,
  computeKpis,
  compareDelta,
  groupSeries,
  groupBy,
  topN,
  computeAging,
  comparePreviousRange,
  type PaymentRow,
  type ExpenseRow,
  type InvoiceRow,
} from "./pnlCalculations";

describe("isCogs", () => {
  it("matches the canonical COGS category list, case-insensitive", () => {
    expect(isCogs("parts")).toBe(true);
    expect(isCogs("PARTS")).toBe(true);
    expect(isCogs("Supplies")).toBe(true);
    expect(isCogs("materials")).toBe(true);
    expect(isCogs("inventory")).toBe(true);
  });

  it("returns false for non-COGS or missing categories", () => {
    expect(isCogs("rent")).toBe(false);
    expect(isCogs("payroll")).toBe(false);
    expect(isCogs("")).toBe(false);
    expect(isCogs(null)).toBe(false);
    expect(isCogs(undefined)).toBe(false);
  });
});

describe("safeDiv", () => {
  it("returns 0 when the denominator is 0 (no division-by-zero crashes in margins)", () => {
    expect(safeDiv(10, 0)).toBe(0);
    expect(safeDiv(0, 0)).toBe(0);
  });

  it("performs normal division otherwise", () => {
    expect(safeDiv(10, 2)).toBe(5);
    expect(safeDiv(-10, 2)).toBe(-5);
  });
});

describe("fmtPct", () => {
  it("formats with 1 decimal by default and the % suffix", () => {
    expect(fmtPct(12.345)).toBe("12.3%");
    expect(fmtPct(0)).toBe("0.0%");
  });

  it("honors the digits argument", () => {
    expect(fmtPct(12.345, 2)).toBe("12.35%");
    expect(fmtPct(12.345, 0)).toBe("12%");
  });

  it("falls back to 0 for non-finite inputs (NaN/Infinity)", () => {
    expect(fmtPct(NaN)).toBe("0.0%");
    expect(fmtPct(Infinity)).toBe("0.0%");
  });
});

describe("fmtMoney", () => {
  it("converts cents to a dollar string with 2 decimals", () => {
    expect(fmtMoney(12345)).toMatch(/\$123\.45$/);
    expect(fmtMoney(0)).toMatch(/\$0\.00$/);
  });

  it("treats null-ish cents as 0", () => {
    expect(fmtMoney(null as unknown as number)).toMatch(/\$0\.00$/);
    expect(fmtMoney(undefined as unknown as number)).toMatch(/\$0\.00$/);
  });
});

describe("computeKpis", () => {
  const payments: PaymentRow[] = [
    { amount_cents: 10000, paid_at: "2026-05-01T00:00:00Z", method: "card" },
    { amount_cents: 5000, paid_at: "2026-05-02T00:00:00Z", method: "cash" },
  ];
  const expenses: ExpenseRow[] = [
    { amount_cents: 3000, category: "parts", vendor: null, payment_method: null, expense_date: "2026-05-01" },
    { amount_cents: 2000, category: "rent", vendor: null, payment_method: null, expense_date: "2026-05-01" },
  ];
  const invoices: InvoiceRow[] = [
    { id: "i1", total_cents: 20000, amount_paid_cents: 15000, subtotal_cents: 18000, tax_cents: 2000, status: "partially_paid", due_at: null, paid_at: null, created_at: "2026-05-01", customer_name: "Acme", items: [] },
    { id: "i2", total_cents: 8000, amount_paid_cents: 8000, subtotal_cents: 7000, tax_cents: 1000, status: "paid", due_at: null, paid_at: "2026-05-03", created_at: "2026-05-02", customer_name: "Beta", items: [] },
  ];

  it("sums revenue from payments and splits COGS vs OpEx by category", () => {
    const kpis = computeKpis(payments, expenses, invoices);
    expect(kpis.revenue).toBe(15000);
    expect(kpis.cogs).toBe(3000);
    expect(kpis.opex).toBe(2000);
    expect(kpis.grossProfit).toBe(12000);
    expect(kpis.net).toBe(10000);
  });

  it("only counts tax from invoices that have been paid", () => {
    // Invoice i2 is paid (tax 1000), i1 is partial (tax 2000 excluded).
    const kpis = computeKpis(payments, expenses, invoices);
    expect(kpis.taxes).toBe(1000);
  });

  it("computes the outstanding invoiced amount", () => {
    // i1 outstanding = 20000 - 15000 = 5000, i2 paid in full = 0
    const kpis = computeKpis(payments, expenses, invoices);
    expect(kpis.invoiced).toBe(5000);
  });

  it("guards margin math when revenue is 0", () => {
    const kpis = computeKpis([], expenses, []);
    expect(kpis.grossMargin).toBe(0);
    expect(kpis.netMargin).toBe(0);
  });
});

describe("compareDelta", () => {
  it("reports 'flat' when both periods are 0", () => {
    expect(compareDelta(0, 0)).toEqual({ pct: 0, direction: "flat" });
  });

  it("returns +100% / up when previous was 0 but current grew", () => {
    expect(compareDelta(50, 0)).toEqual({ pct: 100, direction: "up" });
  });

  it("classifies direction with a tiny dead-zone around 0", () => {
    expect(compareDelta(101, 100).direction).toBe("up");
    expect(compareDelta(99, 100).direction).toBe("down");
    // Within ±0.5% -> flat
    expect(compareDelta(100.4, 100).direction).toBe("flat");
    expect(compareDelta(99.6, 100).direction).toBe("flat");
  });

  it("handles a negative previous value by using abs(previous) for the denominator", () => {
    // current 0, previous -100 → (0 - -100) / 100 = 100 → up
    expect(compareDelta(0, -100).pct).toBe(100);
    expect(compareDelta(0, -100).direction).toBe("up");
  });
});

describe("groupSeries", () => {
  const payments: PaymentRow[] = [
    { amount_cents: 100, paid_at: "2026-05-01T10:00:00Z", method: null },
    { amount_cents: 200, paid_at: "2026-05-01T20:00:00Z", method: null },
    { amount_cents: 300, paid_at: "2026-05-02T10:00:00Z", method: null },
    { amount_cents: 400, paid_at: "2026-06-15T10:00:00Z", method: null },
  ];
  const expenses: ExpenseRow[] = [
    { amount_cents: 50, category: null, vendor: null, payment_method: null, expense_date: "2026-05-01" },
    { amount_cents: 80, category: null, vendor: null, payment_method: null, expense_date: "2026-06-15" },
  ];

  it("buckets by day and sums revenue/expenses/net per bucket", () => {
    const series = groupSeries(payments, expenses, "day");
    const may1 = series.find((p) => p.date === "2026-05-01")!;
    expect(may1.revenue).toBe(300);
    expect(may1.expenses).toBe(50);
    expect(may1.net).toBe(250);
  });

  it("buckets by month using YYYY-MM keys", () => {
    const series = groupSeries(payments, expenses, "month");
    const may = series.find((p) => p.date === "2026-05")!;
    const jun = series.find((p) => p.date === "2026-06")!;
    expect(may.revenue).toBe(600);
    expect(jun.revenue).toBe(400);
    expect(jun.expenses).toBe(80);
    expect(jun.net).toBe(320);
  });

  it("returns the series sorted ascending by date key", () => {
    const series = groupSeries(payments, expenses, "day");
    const keys = series.map((s) => s.date);
    expect(keys).toEqual([...keys].sort());
  });
});

describe("groupBy + topN", () => {
  it("aggregates values by key and falls back to 'Uncategorized'", () => {
    const rows = [
      { cat: "a", v: 10 },
      { cat: "a", v: 5 },
      { cat: "b", v: 7 },
      { cat: null as string | null, v: 3 },
    ];
    const out = groupBy(rows, (r) => (r.cat as string) || "", (r) => r.v);
    expect(out["a"]).toBe(15);
    expect(out["b"]).toBe(7);
    expect(out["Uncategorized"]).toBe(3);
  });

  it("topN returns the largest entries sorted descending", () => {
    const map = { a: 5, b: 20, c: 10, d: 15 };
    expect(topN(map, 2)).toEqual([
      { key: "b", value: 20 },
      { key: "d", value: 15 },
    ]);
  });

  it("topN defaults to 5 and tolerates smaller maps", () => {
    expect(topN({ a: 1, b: 2 })).toEqual([
      { key: "b", value: 2 },
      { key: "a", value: 1 },
    ]);
  });
});

describe("computeAging", () => {
  // Build a synthetic "now" by working backwards from a fixed reference: any
  // due_at in the future is current, otherwise bucket by days overdue.
  const now = Date.now();
  const daysAgo = (n: number) => new Date(now - n * 86400000).toISOString();
  const mkInvoice = (id: string, total: number, paid: number, dueDaysAgo: number, status = "open"): InvoiceRow => ({
    id, total_cents: total, amount_paid_cents: paid, subtotal_cents: total, tax_cents: 0, status,
    due_at: daysAgo(dueDaysAgo), paid_at: null, created_at: daysAgo(dueDaysAgo + 10),
    customer_name: `c${id}`, items: [],
  });

  it("excludes fully paid invoices from aging", () => {
    const aging = computeAging([
      mkInvoice("i1", 1000, 1000, 45, "paid"),
    ]);
    expect(aging.total).toBe(0);
    expect(aging.topUnpaid).toEqual([]);
  });

  it("places not-yet-due invoices in 'current'", () => {
    // Due in the future = negative daysOverdue → current bucket.
    const aging = computeAging([mkInvoice("i1", 500, 0, -10)]);
    expect(aging.current).toBe(500);
    expect(aging.d30).toBe(0);
    expect(aging.total).toBe(500);
  });

  it("buckets by days overdue: 30 / 60 / 90 / 90+", () => {
    const aging = computeAging([
      mkInvoice("i1", 100, 0, 15),  // d30
      mkInvoice("i2", 200, 0, 45),  // d60
      mkInvoice("i3", 400, 0, 75),  // d90
      mkInvoice("i4", 800, 0, 150), // d90Plus
    ]);
    expect(aging.d30).toBe(100);
    expect(aging.d60).toBe(200);
    expect(aging.d90).toBe(400);
    expect(aging.d90Plus).toBe(800);
    expect(aging.total).toBe(1500);
  });

  it("returns top 5 unpaid invoices sorted by outstanding amount desc", () => {
    const invoices = Array.from({ length: 7 }, (_, i) =>
      mkInvoice(`i${i}`, (i + 1) * 100, 0, 30),
    );
    const aging = computeAging(invoices);
    expect(aging.topUnpaid).toHaveLength(5);
    expect(aging.topUnpaid[0].outstanding).toBe(700);
    expect(aging.topUnpaid[4].outstanding).toBe(300);
  });
});

describe("comparePreviousRange", () => {
  it("returns null when mode='none'", () => {
    expect(comparePreviousRange("2026-05-01", "2026-05-31", "none")).toBeNull();
  });

  it("shifts the range by one year for mode='previous_year'", () => {
    const range = comparePreviousRange("2026-05-01", "2026-05-31", "previous_year");
    expect(range).toEqual({ from: "2025-05-01", to: "2025-05-31" });
  });

  it("for 'previous_period', the new 'to' is one day before the original 'from'", () => {
    // 7-day range 2026-05-08..2026-05-14 → previous: 2026-05-01..2026-05-07
    const range = comparePreviousRange("2026-05-08", "2026-05-14", "previous_period");
    expect(range).toEqual({ from: "2026-05-01", to: "2026-05-07" });
  });

  it("for a single day range, the previous period is just the day before", () => {
    const range = comparePreviousRange("2026-05-10", "2026-05-10", "previous_period");
    expect(range).toEqual({ from: "2026-05-09", to: "2026-05-09" });
  });
});
