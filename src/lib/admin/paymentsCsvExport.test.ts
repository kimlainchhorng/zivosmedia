// Security/correctness pins for the Payments Received CSV export. The exercised
// surface is the pure `exportPaymentsCsv(payload) -> string`; the internal
// escape/buildCsv are reached through it via free-text cells (storeName,
// customer_name, reference, method) — the exact user-entered CWE-1236 surface
// the file's own comment names. Verified against an independent clean-room
// oracle. Load-bearing invariants:
//   1. A leading formula trigger (= + - @ \t \r) is neutralized with a leading
//      apostrophe, UNLESS the value is a plain numeric literal (so "-5.00" is
//      left intact and not mangled into "'-5.00").
//   2. Any cell containing , " \n OR \r is RFC-4180 quoted. The \r is the
//      load-bearing fix this slice landed: an embedded lone CR must be quoted so
//      it cannot split the record in parsers (older Excel/Mac, naive readers)
//      that treat a bare CR as a row separator.
// fmtMoney routes through toLocaleString(undefined, …) and is locale-dependent,
// so money-cell text is deliberately NOT asserted — only the structure around it.
import { describe, it, expect } from "vitest";
import { exportPaymentsCsv, type PaymentsExportPayload } from "./paymentsCsvExport";
import type { PaymentRowFull, PaymentInvoiceLite, PaymentsKpis } from "./paymentsCalculations";

const kpis = (): PaymentsKpis => ({
  totalReceived: 50000,
  count: 3,
  avg: 16667,
  largest: 30000,
  uniqueCustomers: 2,
  refunds: 0,
});

const invoice = (over: Partial<PaymentInvoiceLite> = {}): PaymentInvoiceLite => ({
  id: "inv1",
  number: "INV-1",
  customer_name: "Jane Doe",
  vehicle_label: "Sedan",
  total_cents: 10000,
  amount_paid_cents: 10000,
  status: "paid",
  created_at: "2026-06-01T00:00:00Z",
  due_at: null,
  ...over,
});

const payment = (over: Partial<PaymentRowFull> = {}): PaymentRowFull => ({
  id: "pay1",
  amount_cents: 10000,
  method: "card",
  reference: "REF-1",
  notes: null,
  paid_at: "2026-06-15T10:30:45Z",
  invoice_id: "inv1",
  ...over,
});

const base = (over: Partial<PaymentsExportPayload> = {}): PaymentsExportPayload => ({
  from: "2026-06-01",
  to: "2026-06-30",
  kpis: kpis(),
  series: [],
  methods: [],
  payments: [],
  invoices: [],
  ...over,
});

describe("exportPaymentsCsv — formula injection (CWE-1236)", () => {
  it("neutralizes a leading '=' in storeName with an apostrophe", () => {
    const csv = exportPaymentsCsv(base({ storeName: "=SUM(1)" }));
    expect(csv).toContain("Store,'=SUM(1)");
  });
  it("neutralizes a formula in method even after it is upper-cased", () => {
    const csv = exportPaymentsCsv(
      base({ payments: [payment({ method: "=x", invoice_id: null })] }),
    );
    // method is `.toUpperCase()`-d to "=X" BEFORE escaping, then prefixed.
    expect(csv).toContain(",'=X,");
  });
  it("quotes a formula value that also contains a comma (prefix stays inside)", () => {
    const csv = exportPaymentsCsv(
      base({ payments: [payment({ reference: "=SUM(A1,A2)", invoice_id: null })] }),
    );
    expect(csv).toContain('"\'=SUM(A1,A2)"');
  });
});

describe("exportPaymentsCsv — numeric-literal carve-out", () => {
  it("leaves a legit negative number intact (no apostrophe)", () => {
    const csv = exportPaymentsCsv(
      base({ payments: [payment({ reference: "-5.00", invoice_id: null })] }),
    );
    expect(csv).toContain(",-5.00,");
    expect(csv).not.toContain(",'-5.00,");
  });
});

describe("exportPaymentsCsv — RFC-4180 quoting", () => {
  it("quotes an embedded comma in a free-text cell", () => {
    const csv = exportPaymentsCsv(
      base({ payments: [payment()], invoices: [invoice({ customer_name: "Doe, Jane" })] }),
    );
    expect(csv).toContain('"Doe, Jane"');
  });
  it("doubles an embedded double-quote", () => {
    const csv = exportPaymentsCsv(
      base({ payments: [payment({ reference: 'a"b', invoice_id: null })] }),
    );
    expect(csv).toContain('"a""b"');
  });
  it("quotes an embedded lone CR so it cannot split the record (the fix)", () => {
    const csv = exportPaymentsCsv(
      base({ payments: [payment({ reference: "REF\rINJECT", invoice_id: null })] }),
    );
    expect(csv).toContain('"REF\rINJECT"');
    expect(csv).not.toContain(",REF\rINJECT,");
  });
});

describe("exportPaymentsCsv — structure", () => {
  it("starts with the report title", () => {
    expect(exportPaymentsCsv(base())).toMatch(/^ZIVO Auto Repair — Payments Received/);
  });
  it("renders an empty cell for an absent storeName", () => {
    expect(exportPaymentsCsv(base())).toContain("Store,\n");
  });
  it("omits the Previous column when prev is absent", () => {
    const csv = exportPaymentsCsv(base());
    expect(csv).toContain("Metric,Current");
    expect(csv).not.toContain("Metric,Current,Previous");
  });
  it("adds the Previous column when prev is present", () => {
    const csv = exportPaymentsCsv(base({ prev: kpis() }));
    expect(csv).toContain("Metric,Current,Previous");
  });
  it("formats paid_at as a space-separated minute stamp (pure string slice)", () => {
    const csv = exportPaymentsCsv(base({ payments: [payment()] }));
    expect(csv).toContain("2026-06-15 10:30");
  });
});
