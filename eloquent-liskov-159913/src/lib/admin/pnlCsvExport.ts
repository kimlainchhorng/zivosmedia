/**
 * Extended P&L CSV export — KPIs + series + breakdowns + AR aging + tax.
 */
import { fmtMoney, type PnLKpis, type SeriesPoint, type ArAging } from "./pnlCalculations";

const escape = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const buildCsv = (rows: (string | number)[][]): string =>
  rows.map((r) => r.map(escape).join(",")).join("\n");

export interface PnlExportPayload {
  storeName?: string;
  from: string;
  to: string;
  kpis: PnLKpis;
  prevKpis?: PnLKpis | null;
  series: SeriesPoint[];
  expensesByCategory: Record<string, number>;
  expensesByVendor: Record<string, number>;
  incomeByMethod: Record<string, number>;
  aging: ArAging;
}

export function exportPnlCsv(p: PnlExportPayload): string {
  const rows: (string | number)[][] = [];
  rows.push(["ZIVO Auto Repair — Profit & Loss"]);
  rows.push(["Store", p.storeName ?? ""]);
  rows.push(["Period", `${p.from} to ${p.to}`]);
  rows.push([]);

  rows.push(["Summary"]);
  rows.push(["Metric", "Current", ...(p.prevKpis ? ["Previous"] : [])]);
  const k = p.kpis; const pk = p.prevKpis;
  const row = (label: string, cur: number, prev?: number) => rows.push([label, fmtMoney(cur), ...(pk ? [fmtMoney(prev ?? 0)] : [])]);
  row("Revenue (paid)", k.revenue, pk?.revenue);
  row("Outstanding invoices", k.invoiced, pk?.invoiced);
  row("COGS", k.cogs, pk?.cogs);
  row("Gross profit", k.grossProfit, pk?.grossProfit);
  rows.push(["Gross margin %", `${k.grossMargin.toFixed(1)}%`, ...(pk ? [`${pk.grossMargin.toFixed(1)}%`] : [])]);
  row("Operating expenses", k.opex, pk?.opex);
  row("Sales tax collected", k.taxes, pk?.taxes);
  row("NET PROFIT", k.net, pk?.net);
  rows.push(["Net margin %", `${k.netMargin.toFixed(1)}%`, ...(pk ? [`${pk.netMargin.toFixed(1)}%`] : [])]);
  rows.push([]);

  rows.push(["Daily / Period series"]);
  rows.push(["Date", "Revenue", "Expenses", "Net"]);
  p.series.forEach((s) => rows.push([s.date, fmtMoney(s.revenue), fmtMoney(s.expenses), fmtMoney(s.net)]));
  rows.push([]);

  rows.push(["Income by payment method"]);
  rows.push(["Method", "Amount"]);
  Object.entries(p.incomeByMethod).sort(([, a], [, b]) => b - a).forEach(([m, v]) => rows.push([m, fmtMoney(v)]));
  rows.push([]);

  rows.push(["Expenses by category"]);
  rows.push(["Category", "Amount"]);
  Object.entries(p.expensesByCategory).sort(([, a], [, b]) => b - a).forEach(([c, v]) => rows.push([c, fmtMoney(v)]));
  rows.push([]);

  rows.push(["Expenses by vendor"]);
  rows.push(["Vendor", "Amount"]);
  Object.entries(p.expensesByVendor).sort(([, a], [, b]) => b - a).forEach(([v, amt]) => rows.push([v, fmtMoney(amt)]));
  rows.push([]);

  rows.push(["Accounts Receivable aging"]);
  rows.push(["Bucket", "Amount"]);
  rows.push(["Current", fmtMoney(p.aging.current)]);
  rows.push(["1-30 days", fmtMoney(p.aging.d30)]);
  rows.push(["31-60 days", fmtMoney(p.aging.d60)]);
  rows.push(["61-90 days", fmtMoney(p.aging.d90)]);
  rows.push(["90+ days", fmtMoney(p.aging.d90Plus)]);
  rows.push(["Total outstanding", fmtMoney(p.aging.total)]);

  return buildCsv(rows);
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
