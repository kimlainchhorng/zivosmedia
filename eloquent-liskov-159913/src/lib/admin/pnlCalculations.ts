/**
 * Pure helpers for the Auto Repair Profit & Loss dashboard.
 * No React, no Supabase — easy to unit-test.
 */

export type GroupBy = "day" | "week" | "month";
export type CompareMode = "none" | "previous_period" | "previous_year";

export interface PaymentRow { amount_cents: number; paid_at: string; method: string | null }
export interface ExpenseRow { amount_cents: number; category: string | null; vendor: string | null; payment_method: string | null; expense_date: string; description?: string | null; receipt_url?: string | null; id?: string }
export interface InvoiceRow { id: string; total_cents: number; amount_paid_cents: number; subtotal_cents: number; tax_cents: number; status: string; due_at: string | null; paid_at: string | null; created_at: string; customer_name: string | null; items: any }
export interface PayoutRow { amount_cents: number; payout_date: string; source: string | null }

// ─── Categorization ────────────────────────────────────────
const COGS_CATEGORIES = ["parts", "supplies", "materials", "inventory"];
export function isCogs(category: string | null | undefined): boolean {
  if (!category) return false;
  return COGS_CATEGORIES.includes(category.toLowerCase());
}

// ─── Money helpers ─────────────────────────────────────────
export const fmtMoney = (cents: number) =>
  `$${((cents ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtPct = (n: number, digits = 1) =>
  `${(Number.isFinite(n) ? n : 0).toFixed(digits)}%`;

export const safeDiv = (n: number, d: number) => (d === 0 ? 0 : n / d);

// ─── KPIs ──────────────────────────────────────────────────
export interface PnLKpis {
  revenue: number;        // paid revenue (cents)
  invoiced: number;       // outstanding invoiced (cents)
  cogs: number;
  grossProfit: number;
  grossMargin: number;    // %
  opex: number;
  taxes: number;          // sales tax collected
  net: number;
  netMargin: number;      // %
}

export function computeKpis(payments: PaymentRow[], expenses: ExpenseRow[], invoices: InvoiceRow[]): PnLKpis {
  const revenue = payments.reduce((s, p) => s + (p.amount_cents ?? 0), 0);
  const invoiced = invoices.reduce((s, i) => s + Math.max(0, (i.total_cents ?? 0) - (i.amount_paid_cents ?? 0)), 0);
  const cogs = expenses.filter((e) => isCogs(e.category)).reduce((s, e) => s + (e.amount_cents ?? 0), 0);
  const opex = expenses.filter((e) => !isCogs(e.category)).reduce((s, e) => s + (e.amount_cents ?? 0), 0);
  const taxes = invoices.filter((i) => i.paid_at).reduce((s, i) => s + (i.tax_cents ?? 0), 0);
  const grossProfit = revenue - cogs;
  const net = revenue - cogs - opex;
  return {
    revenue,
    invoiced,
    cogs,
    grossProfit,
    grossMargin: safeDiv(grossProfit, revenue) * 100,
    opex,
    taxes,
    net,
    netMargin: safeDiv(net, revenue) * 100,
  };
}

export interface DeltaResult { pct: number; direction: "up" | "down" | "flat" }
export function compareDelta(current: number, previous: number): DeltaResult {
  if (previous === 0 && current === 0) return { pct: 0, direction: "flat" };
  if (previous === 0) return { pct: 100, direction: "up" };
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return { pct, direction: pct > 0.5 ? "up" : pct < -0.5 ? "down" : "flat" };
}

// ─── Time series grouping ──────────────────────────────────
function bucketKey(dateIso: string, group: GroupBy): string {
  const d = new Date(dateIso);
  if (group === "day") return d.toISOString().slice(0, 10);
  if (group === "month") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  // week — ISO week starting Monday
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (tmp.getUTCDay() + 6) % 7;
  tmp.setUTCDate(tmp.getUTCDate() - dayNum);
  return tmp.toISOString().slice(0, 10);
}

export interface SeriesPoint { date: string; revenue: number; expenses: number; net: number }
export function groupSeries(payments: PaymentRow[], expenses: ExpenseRow[], group: GroupBy): SeriesPoint[] {
  const map: Record<string, SeriesPoint> = {};
  const ensure = (k: string) => (map[k] ||= { date: k, revenue: 0, expenses: 0, net: 0 });
  payments.forEach((p) => { ensure(bucketKey(p.paid_at, group)).revenue += p.amount_cents ?? 0; });
  expenses.forEach((e) => { ensure(bucketKey(e.expense_date, group)).expenses += e.amount_cents ?? 0; });
  const arr = Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  arr.forEach((p) => { p.net = p.revenue - p.expenses; });
  return arr;
}

// ─── Breakdowns ────────────────────────────────────────────
export function groupBy<T>(rows: T[], keyFn: (r: T) => string, valueFn: (r: T) => number): Record<string, number> {
  const out: Record<string, number> = {};
  rows.forEach((r) => {
    const k = keyFn(r) || "Uncategorized";
    out[k] = (out[k] || 0) + (valueFn(r) || 0);
  });
  return out;
}

export function topN(map: Record<string, number>, n = 5): { key: string; value: number }[] {
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([key, value]) => ({ key, value }));
}

// ─── AR aging ──────────────────────────────────────────────
export interface ArAging {
  current: number;
  d30: number;
  d60: number;
  d90: number;
  d90Plus: number;
  total: number;
  topUnpaid: { id: string; customer: string; outstanding: number; daysOverdue: number; due_at: string | null }[];
}

export function computeAging(invoices: InvoiceRow[]): ArAging {
  const now = Date.now();
  const buckets = { current: 0, d30: 0, d60: 0, d90: 0, d90Plus: 0 };
  const unpaid = invoices
    .filter((i) => i.status !== "paid" && (i.total_cents - i.amount_paid_cents) > 0)
    .map((i) => {
      const outstanding = i.total_cents - i.amount_paid_cents;
      const dueRef = i.due_at ? new Date(i.due_at).getTime() : new Date(i.created_at).getTime();
      const daysOverdue = Math.floor((now - dueRef) / 86400000);
      if (daysOverdue <= 0) buckets.current += outstanding;
      else if (daysOverdue <= 30) buckets.d30 += outstanding;
      else if (daysOverdue <= 60) buckets.d60 += outstanding;
      else if (daysOverdue <= 90) buckets.d90 += outstanding;
      else buckets.d90Plus += outstanding;
      return { id: i.id, customer: i.customer_name || "Unknown", outstanding, daysOverdue, due_at: i.due_at };
    })
    .sort((a, b) => b.outstanding - a.outstanding);
  const total = buckets.current + buckets.d30 + buckets.d60 + buckets.d90 + buckets.d90Plus;
  return { ...buckets, total, topUnpaid: unpaid.slice(0, 5) };
}

// ─── Date presets ──────────────────────────────────────────
export type Preset = "today" | "week" | "mtd" | "last_month" | "qtd" | "ytd" | "last_12m" | "custom";

export function presetRange(preset: Preset): { from: string; to: string } {
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const start = (d: Date) => { d.setHours(0,0,0,0); return d; };
  const to = iso(today);
  switch (preset) {
    case "today":      return { from: to, to };
    case "week": {
      const d = start(new Date()); d.setDate(d.getDate() - 6); return { from: iso(d), to };
    }
    case "mtd": {
      const d = new Date(today.getFullYear(), today.getMonth(), 1); return { from: iso(d), to };
    }
    case "last_month": {
      const f = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const t = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: iso(f), to: iso(t) };
    }
    case "qtd": {
      const q = Math.floor(today.getMonth() / 3) * 3;
      return { from: iso(new Date(today.getFullYear(), q, 1)), to };
    }
    case "ytd":  return { from: iso(new Date(today.getFullYear(), 0, 1)), to };
    case "last_12m": {
      const d = new Date(today); d.setMonth(d.getMonth() - 12); return { from: iso(d), to };
    }
    default:     return { from: iso(new Date(today.getTime() - 29 * 86400000)), to };
  }
}

export function comparePreviousRange(from: string, to: string, mode: CompareMode): { from: string; to: string } | null {
  if (mode === "none") return null;
  const f = new Date(from); const t = new Date(to);
  if (mode === "previous_year") {
    const f2 = new Date(f); f2.setFullYear(f2.getFullYear() - 1);
    const t2 = new Date(t); t2.setFullYear(t2.getFullYear() - 1);
    return { from: f2.toISOString().slice(0, 10), to: t2.toISOString().slice(0, 10) };
  }
  const days = Math.max(1, Math.round((t.getTime() - f.getTime()) / 86400000) + 1);
  const t2 = new Date(f); t2.setDate(t2.getDate() - 1);
  const f2 = new Date(t2); f2.setDate(f2.getDate() - (days - 1));
  return { from: f2.toISOString().slice(0, 10), to: t2.toISOString().slice(0, 10) };
}
