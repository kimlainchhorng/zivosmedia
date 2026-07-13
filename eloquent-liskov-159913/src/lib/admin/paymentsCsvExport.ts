/**
 * Payments Received CSV export.
 */
import {
  fmtMoney,
  type PaymentsKpis,
  type PaymentRowFull,
  type PaymentInvoiceLite,
  type MethodStat,
  type PaymentsSeriesPoint,
} from "./paymentsCalculations";

const escape = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const buildCsv = (rows: (string | number)[][]): string =>
  rows.map((r) => r.map(escape).join(",")).join("\n");

export interface PaymentsExportPayload {
  storeName?: string;
  from: string;
  to: string;
  kpis: PaymentsKpis;
  prev?: PaymentsKpis | null;
  series: PaymentsSeriesPoint[];
  methods: MethodStat[];
  payments: PaymentRowFull[];
  invoices: PaymentInvoiceLite[];
}

export function exportPaymentsCsv(p: PaymentsExportPayload): string {
  const rows: (string | number)[][] = [];
  rows.push(["ZIVO Auto Repair — Payments Received"]);
  rows.push(["Store", p.storeName ?? ""]);
  rows.push(["Period", `${p.from} to ${p.to}`]);
  rows.push([]);
  rows.push(["Summary"]);
  rows.push(["Metric", "Current", ...(p.prev ? ["Previous"] : [])]);
  const k = p.kpis; const pk = p.prev;
  const row = (label: string, cur: number, prev?: number, fn = fmtMoney) =>
    rows.push([label, fn(cur), ...(pk ? [fn(prev ?? 0)] : [])]);
  row("Total received", k.totalReceived, pk?.totalReceived);
  rows.push(["Payment count", k.count, ...(pk ? [pk.count] : [])]);
  row("Avg payment", k.avg, pk?.avg);
  row("Largest payment", k.largest, pk?.largest);
  rows.push(["Unique customers", k.uniqueCustomers, ...(pk ? [pk.uniqueCustomers] : [])]);
  row("Refunds issued", k.refunds, pk?.refunds);
  rows.push([]);
  rows.push(["Series"]);
  rows.push(["Date", "Received", "Cumulative"]);
  p.series.forEach((s) => rows.push([s.date, fmtMoney(s.received), fmtMoney(s.cumulative)]));
  rows.push([]);
  rows.push(["Method breakdown"]);
  rows.push(["Method", "Amount", "Count"]);
  p.methods.forEach((m) => rows.push([m.method, fmtMoney(m.amount), m.count]));
  rows.push([]);
  rows.push(["Payments in period"]);
  rows.push(["Date", "Method", "Invoice", "Customer", "Reference", "Amount"]);
  const invMap = new Map(p.invoices.map((i) => [i.id, i]));
  p.payments.forEach((py) => {
    const inv = py.invoice_id ? invMap.get(py.invoice_id) : null;
    rows.push([
      py.paid_at.slice(0, 16).replace("T", " "),
      (py.method ?? "").toUpperCase(),
      inv?.number ?? "",
      inv?.customer_name ?? "",
      py.reference ?? "",
      fmtMoney(py.amount_cents),
    ]);
  });
  return buildCsv(rows);
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
