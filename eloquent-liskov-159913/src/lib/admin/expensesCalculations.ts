/**
 * Pure helpers for the Auto Repair Expenses & Bills analytics layer.
 */

export type GroupBy = "day" | "week" | "month";

export interface ExpenseRowLite {
  id: string;
  amount_cents: number;
  category: string | null;
  vendor: string | null;
  expense_date: string;
  payment_method: string | null;
  description: string | null;
  receipt_url?: string | null;
}

const COGS_CATEGORIES = ["parts", "supplies", "materials", "inventory"];
export function isCogs(category: string | null | undefined): boolean {
  if (!category) return false;
  return COGS_CATEGORIES.includes(category.toLowerCase());
}

export const fmtMoney = (cents: number) =>
  `$${((cents ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export interface ExpensesKpis {
  total: number;
  cogs: number;
  opex: number;
  count: number;
  avg: number;
  vendorCount: number;
}

export function computeExpensesKpis(rows: ExpenseRowLite[]): ExpensesKpis {
  const total = rows.reduce((s, r) => s + (r.amount_cents ?? 0), 0);
  const cogs = rows.filter((r) => isCogs(r.category)).reduce((s, r) => s + (r.amount_cents ?? 0), 0);
  const opex = total - cogs;
  const vendors = new Set(rows.map((r) => (r.vendor || "Unknown").trim()));
  return {
    total, cogs, opex,
    count: rows.length,
    avg: rows.length ? Math.round(total / rows.length) : 0,
    vendorCount: vendors.size,
  };
}

export interface DeltaResult { pct: number; direction: "up" | "down" | "flat" }
export function compareDelta(current: number, previous: number): DeltaResult {
  if (previous === 0 && current === 0) return { pct: 0, direction: "flat" };
  if (previous === 0) return { pct: 100, direction: "up" };
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return { pct, direction: pct > 0.5 ? "up" : pct < -0.5 ? "down" : "flat" };
}

function bucketKey(dateIso: string, group: GroupBy): string {
  const d = new Date(dateIso);
  if (group === "day") return d.toISOString().slice(0, 10);
  if (group === "month") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (tmp.getUTCDay() + 6) % 7;
  tmp.setUTCDate(tmp.getUTCDate() - dayNum);
  return tmp.toISOString().slice(0, 10);
}

export interface ExpensesSeriesPoint { date: string; spent: number; cumulative: number }
export function groupExpensesSeries(rows: ExpenseRowLite[], group: GroupBy): ExpensesSeriesPoint[] {
  const map: Record<string, number> = {};
  rows.forEach((r) => {
    const k = bucketKey(r.expense_date, group);
    map[k] = (map[k] || 0) + (r.amount_cents ?? 0);
  });
  let running = 0;
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, spent]) => {
      running += spent;
      return { date, spent, cumulative: running };
    });
}

export interface CategoryTotal { category: string; amount: number; count: number }
export function expensesByCategory(rows: ExpenseRowLite[]): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>();
  rows.forEach((r) => {
    const k = (r.category || "uncategorized").toLowerCase();
    const existing = map.get(k) ?? { category: k, amount: 0, count: 0 };
    existing.amount += r.amount_cents ?? 0;
    existing.count += 1;
    map.set(k, existing);
  });
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
}

export interface VendorTotal { vendor: string; amount: number; count: number }
export function expensesByVendor(rows: ExpenseRowLite[]): VendorTotal[] {
  const map = new Map<string, VendorTotal>();
  rows.forEach((r) => {
    const k = (r.vendor || "Unknown").trim() || "Unknown";
    const existing = map.get(k) ?? { vendor: k, amount: 0, count: 0 };
    existing.amount += r.amount_cents ?? 0;
    existing.count += 1;
    map.set(k, existing);
  });
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
}

// Re-use the same preset family the other dashboards use
export type ExpensesPreset = "today" | "week" | "month" | "quarter" | "this_month" | "last_month" | "ytd" | "custom";

export function expensesPresetRange(preset: ExpensesPreset): { from: string; to: string } {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const to = iso(now);
  switch (preset) {
    case "today": return { from: to, to };
    case "week": { const d = new Date(now); d.setDate(d.getDate() - 6); return { from: iso(d), to }; }
    case "month": { const d = new Date(now); d.setDate(d.getDate() - 29); return { from: iso(d), to }; }
    case "quarter": { const d = new Date(now); d.setDate(d.getDate() - 89); return { from: iso(d), to }; }
    case "this_month": return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to };
    case "last_month": {
      const f = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const t = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: iso(f), to: iso(t) };
    }
    case "ytd": return { from: iso(new Date(now.getFullYear(), 0, 1)), to };
    default: { const d = new Date(now); d.setDate(d.getDate() - 29); return { from: iso(d), to }; }
  }
}

export function previousExpensesRange(from: string, to: string): { from: string; to: string } {
  const f = new Date(from); const t = new Date(to);
  const days = Math.max(1, Math.round((t.getTime() - f.getTime()) / 86400000) + 1);
  const t2 = new Date(f); t2.setDate(t2.getDate() - 1);
  const f2 = new Date(t2); f2.setDate(f2.getDate() - (days - 1));
  return { from: f2.toISOString().slice(0, 10), to: t2.toISOString().slice(0, 10) };
}
