/**
 * Contract tests for the Auto Repair Payments-Received helpers. These
 * power every number on the payments dashboard — KPIs, method
 * breakdowns, AR aging, running totals. Silent regressions here surface
 * as wrong "received today" / "outstanding" figures in shop owners'
 * UIs.
 *
 * paymentsPresetRange depends on `today` and is not covered here.
 */
import { describe, it, expect } from "vitest";
import {
  computePaymentsKpis,
  compareDelta,
  groupPaymentsSeries,
  methodBreakdown,
  outstandingInvoices,
  previousPaymentsRange,
  type PaymentRowFull,
  type PaymentInvoiceLite,
} from "./paymentsCalculations";

const mkPayment = (over: Partial<PaymentRowFull> = {}): PaymentRowFull => ({
  id: "p", amount_cents: 0, method: null, reference: null, notes: null,
  paid_at: "2026-05-01T10:00:00Z", invoice_id: null, ...over,
});
const mkInvoice = (over: Partial<PaymentInvoiceLite> = {}): PaymentInvoiceLite => ({
  id: "i", number: null, customer_name: null, vehicle_label: null,
  total_cents: 0, amount_paid_cents: 0, status: "open",
  created_at: "2026-05-01T00:00:00Z", due_at: null, ...over,
});

describe("computePaymentsKpis", () => {
  it("sums positives into totalReceived and treats negatives as refunds (abs)", () => {
    const payments = [
      mkPayment({ id: "p1", amount_cents: 10000 }),
      mkPayment({ id: "p2", amount_cents: 5000 }),
      mkPayment({ id: "p3", amount_cents: -2000 }), // refund
    ];
    const kpis = computePaymentsKpis(payments, []);
    expect(kpis.totalReceived).toBe(15000);
    expect(kpis.refunds).toBe(2000);
    expect(kpis.count).toBe(2);
  });

  it("computes avg as rounded total / count of positives only", () => {
    const payments = [
      mkPayment({ amount_cents: 100 }),
      mkPayment({ amount_cents: 201 }), // 301 / 2 = 150.5 → 151
      mkPayment({ amount_cents: -50 }), // refund — excluded from avg
    ];
    expect(computePaymentsKpis(payments, []).avg).toBe(151);
  });

  it("largest is 0 when no positive payments exist", () => {
    expect(computePaymentsKpis([], []).largest).toBe(0);
    expect(computePaymentsKpis([mkPayment({ amount_cents: -100 })], []).largest).toBe(0);
  });

  it("counts unique customers via invoice lookup, falling back to 'Unknown'", () => {
    const invoices = [
      mkInvoice({ id: "i1", customer_name: "Alice" }),
      mkInvoice({ id: "i2", customer_name: "Bob" }),
      mkInvoice({ id: "i3", customer_name: "Alice" }), // duplicate customer
    ];
    const payments = [
      mkPayment({ id: "p1", amount_cents: 100, invoice_id: "i1" }),
      mkPayment({ id: "p2", amount_cents: 100, invoice_id: "i2" }),
      mkPayment({ id: "p3", amount_cents: 100, invoice_id: "i3" }),
      mkPayment({ id: "p4", amount_cents: 100, invoice_id: null }), // no invoice → "Unknown"
      mkPayment({ id: "p5", amount_cents: 100, invoice_id: "missing" }), // dangling fk → "Unknown"
    ];
    expect(computePaymentsKpis(payments, invoices).uniqueCustomers).toBe(3); // Alice, Bob, Unknown
  });
});

describe("compareDelta (payments)", () => {
  it("treats 0→0 as flat and 0→x as +100% up", () => {
    expect(compareDelta(0, 0)).toEqual({ pct: 0, direction: "flat" });
    expect(compareDelta(50, 0)).toEqual({ pct: 100, direction: "up" });
  });

  it("applies ±0.5% dead-zone around 0 for direction", () => {
    expect(compareDelta(100.4, 100).direction).toBe("flat");
    expect(compareDelta(101, 100).direction).toBe("up");
    expect(compareDelta(99, 100).direction).toBe("down");
  });
});

describe("groupPaymentsSeries", () => {
  const payments = [
    mkPayment({ amount_cents: 100, paid_at: "2026-05-01T10:00:00Z" }),
    mkPayment({ amount_cents: 200, paid_at: "2026-05-02T10:00:00Z" }),
    mkPayment({ amount_cents: 400, paid_at: "2026-05-03T10:00:00Z" }),
    mkPayment({ amount_cents: -50, paid_at: "2026-05-02T10:00:00Z" }), // refund — excluded
  ];

  it("buckets by day and excludes refunds from the running total", () => {
    const series = groupPaymentsSeries(payments, "day");
    expect(series.map((s) => s.date)).toEqual(["2026-05-01", "2026-05-02", "2026-05-03"]);
    expect(series.map((s) => s.received)).toEqual([100, 200, 400]);
  });

  it("computes a strictly non-decreasing cumulative running total", () => {
    const series = groupPaymentsSeries(payments, "day");
    expect(series.map((s) => s.cumulative)).toEqual([100, 300, 700]);
  });

  it("sorts dates ascending even when input is shuffled", () => {
    // Noon UTC keeps the local calendar day stable across CI and Cambodia
    // offsets (the day bucket keys off the local day), so this exercises sort
    // order — not timezone bucketing, which is pinned separately below.
    const shuffled = [
      mkPayment({ amount_cents: 50, paid_at: "2026-05-10T12:00:00Z" }),
      mkPayment({ amount_cents: 50, paid_at: "2026-05-01T12:00:00Z" }),
      mkPayment({ amount_cents: 50, paid_at: "2026-05-05T12:00:00Z" }),
    ];
    const dates = groupPaymentsSeries(shuffled, "day").map((s) => s.date);
    expect(dates).toEqual(["2026-05-01", "2026-05-05", "2026-05-10"]);
  });
});

describe("groupPaymentsSeries — local-day bucketing", () => {
  // The day bucket must key off the LOCAL calendar day, like the week/month
  // buckets — not the UTC day. A payment late in the UTC day falls on the next
  // local day east of UTC (e.g. Cambodia UTC+7), so a UTC-sliced day key would
  // disagree with the local month/week keys across midnight. Re-derive the local
  // formula here so the assertion is deterministic regardless of the test
  // machine's timezone.
  const localYmd = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  it("buckets a late-UTC payment on its local day, consistent with the month bucket", () => {
    const paidAt = "2026-05-31T22:00:00Z"; // already 2026-06-01 in any UTC+ zone
    const payment = mkPayment({ amount_cents: 100, paid_at: paidAt });
    const day = groupPaymentsSeries([payment], "day");
    const month = groupPaymentsSeries([payment], "month");
    expect(day[0].date).toBe(localYmd(paidAt));
    expect(day[0].date.slice(0, 7)).toBe(month[0].date);
  });
});

describe("methodBreakdown", () => {
  it("groups by lowercased method, sums amount + count, and sorts desc by amount", () => {
    const breakdown = methodBreakdown([
      mkPayment({ amount_cents: 100, method: "Cash" }),
      mkPayment({ amount_cents: 50, method: "cash" }),
      mkPayment({ amount_cents: 500, method: "card" }),
    ]);
    expect(breakdown).toEqual([
      { method: "card", amount: 500, count: 1 },
      { method: "cash", amount: 150, count: 2 },
    ]);
  });

  it("maps null method to 'other'", () => {
    const breakdown = methodBreakdown([mkPayment({ amount_cents: 100, method: null })]);
    expect(breakdown[0].method).toBe("other");
  });

  it("excludes refunds (negative amounts) from method totals", () => {
    const breakdown = methodBreakdown([
      mkPayment({ amount_cents: 100, method: "cash" }),
      mkPayment({ amount_cents: -100, method: "cash" }),
    ]);
    expect(breakdown[0]).toEqual({ method: "cash", amount: 100, count: 1 });
  });
});

describe("outstandingInvoices", () => {
  const now = Date.now();
  const daysAgo = (n: number) => new Date(now - n * 86400000).toISOString();

  it("excludes paid and void invoices", () => {
    const result = outstandingInvoices([
      mkInvoice({ id: "i1", status: "paid", total_cents: 100 }),
      mkInvoice({ id: "i2", status: "void", total_cents: 100 }),
    ]);
    expect(result).toEqual([]);
  });

  it("excludes invoices with no remaining balance", () => {
    const result = outstandingInvoices([
      mkInvoice({ id: "i1", status: "partial", total_cents: 100, amount_paid_cents: 100 }),
    ]);
    expect(result).toEqual([]);
  });

  it("computes balance and falls back to 'Unknown' / '—' for missing names", () => {
    const result = outstandingInvoices([
      mkInvoice({ id: "i1", total_cents: 500, amount_paid_cents: 200, customer_name: null, vehicle_label: null }),
    ]);
    expect(result[0].balance).toBe(300);
    expect(result[0].customer).toBe("Unknown");
    expect(result[0].vehicle).toBe("—");
  });

  it("sorts results by daysOutstanding desc and floors days at 0", () => {
    const result = outstandingInvoices([
      mkInvoice({ id: "i1", total_cents: 100, due_at: daysAgo(10) }),
      mkInvoice({ id: "i2", total_cents: 100, due_at: daysAgo(60) }),
      mkInvoice({ id: "i3", total_cents: 100, due_at: daysAgo(-5) }), // due in future → clamped to 0
    ]);
    expect(result.map((r) => r.id)).toEqual(["i2", "i1", "i3"]);
    expect(result[2].daysOutstanding).toBe(0);
  });
});

describe("previousPaymentsRange", () => {
  it("returns the period immediately before the input, same length", () => {
    // 7-day range 2026-05-08..2026-05-14 → previous: 2026-05-01..2026-05-07
    expect(previousPaymentsRange("2026-05-08", "2026-05-14")).toEqual({
      from: "2026-05-01",
      to: "2026-05-07",
    });
  });

  it("single-day input maps to the day before", () => {
    expect(previousPaymentsRange("2026-05-10", "2026-05-10")).toEqual({
      from: "2026-05-09",
      to: "2026-05-09",
    });
  });

  it("handles 1-day previous when the input range is degenerate (to < from)", () => {
    // Math.max(1, ...) guard means we always return at least one day.
    const r = previousPaymentsRange("2026-05-10", "2026-05-09");
    expect(r.to).toBe("2026-05-09");
    expect(r.from).toBe("2026-05-09");
  });
});
