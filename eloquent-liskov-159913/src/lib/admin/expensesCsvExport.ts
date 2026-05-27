/**
 * Expenses CSV export.
 */
import {
  fmtMoney,
  type ExpensesKpis,
  type ExpenseRowLite,
  type CategoryTotal,
  type VendorTotal,
  type ExpensesSeriesPoint,
} from "./expensesCalculations";

const escape = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const buildCsv = (rows: (string | number)[][]): string =>
  rows.map((r) => r.map(escape).join(",")).join("\n");

export interface ExpensesExportPayload {
  storeName?: string;
  from: string;
  to: string;
  kpis: ExpensesKpis;
  prev?: ExpensesKpis | null;
  series: ExpensesSeriesPoint[];
  byCategory: CategoryTotal[];
  byVendor: VendorTotal[];
  expenses: ExpenseRowLite[];
}

export function exportExpensesCsv(p: ExpensesExportPayload): string {
  const rows: (string | number)[][] = [];
  rows.push(["ZIVO Auto Repair — Expenses & Bills"]);
  rows.push(["Store", p.storeName ?? ""]);
  rows.push(["Period", `${p.from} to ${p.to}`]);
  rows.push([]);
  rows.push(["Summary"]);
  rows.push(["Metric", "Current", ...(p.prev ? ["Previous"] : [])]);
  const k = p.kpis; const pk = p.prev;
  const row = (label: string, cur: number, prev?: number, fn = fmtMoney) =>
    rows.push([label, fn(cur), ...(pk ? [fn(prev ?? 0)] : [])]);
  row("Total spent", k.total, pk?.total);
  row("COGS", k.cogs, pk?.cogs);
  row("OpEx", k.opex, pk?.opex);
  rows.push(["Expense count", k.count, ...(pk ? [pk.count] : [])]);
  row("Avg expense", k.avg, pk?.avg);
  rows.push(["Vendor count", k.vendorCount, ...(pk ? [pk.vendorCount] : [])]);
  rows.push([]);
  rows.push(["Series"]);
  rows.push(["Date", "Spent", "Cumulative"]);
  p.series.forEach((s) => rows.push([s.date, fmtMoney(s.spent), fmtMoney(s.cumulative)]));
  rows.push([]);
  rows.push(["By category"]);
  rows.push(["Category", "Amount", "Count"]);
  p.byCategory.forEach((c) => rows.push([c.category, fmtMoney(c.amount), c.count]));
  rows.push([]);
  rows.push(["By vendor"]);
  rows.push(["Vendor", "Amount", "Count"]);
  p.byVendor.forEach((v) => rows.push([v.vendor, fmtMoney(v.amount), v.count]));
  rows.push([]);
  rows.push(["Expenses in period"]);
  rows.push(["Date", "Vendor", "Category", "Method", "Description", "Amount"]);
  p.expenses.forEach((e) => rows.push([
    e.expense_date, e.vendor ?? "", e.category ?? "", e.payment_method ?? "", e.description ?? "", fmtMoney(e.amount_cents),
  ]));
  return buildCsv(rows);
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
