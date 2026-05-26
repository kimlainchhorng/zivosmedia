/**
 * Pure helpers for the Auto Repair Payments Received dashboard.
 * No React, no Supabase — easy to unit-test.
 */

export type GroupBy = "day" | "week" | "month";

export interface PaymentRowFull {
  id: string;
  amount_cents: number;
  method: string | null;
  reference: string | null;
  notes: string | null;
  paid_at: string;
  invoice_id: string | null;
}

export interface PaymentInvoiceLite {
  id: string;
  number: string | null;
  customer_name: string | null;
  vehicle_label: string | null;
  total_cents: number;
  amount_paid_cents: number;
  status: string;
  created_at: string;
  due_at: string | null;
}

// ─── Money helpers ─────────────────────────────────────────
export const fmtMoney = (cents: number) =>
  `$${((cents ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const safeDiv = (n: number, d: number) => (d === 0 ? 0 : n / d);

// ─── KPIs ──────────────────────────────────────────────────
export interface PaymentsKpis {
  totalReceived: number;
  count: number;
  avg: number;
  largest: number;
  uniqueCustomers: number;
  refunds: number; // sum of negative amounts (absolute value, positive cents)
}

export function computePaymentsKpis(payments: PaymentRowFull[], invoices: PaymentInvoiceLite[]): PaymentsKpis {
  const positives = payments.filter((p) => (p.amount_cents ?? 0) > 0);
  const negatives = payments.filter((p) => (p.amount_cents ?? 0) < 0);
  const totalReceived = positives.reduce((s, p) => s + (p.amount_cents ?? 0), 0);
  const refunds = negatives.reduce((s, p) => s + Math.abs(p.amount_cents ?? 0), 0);
  const invoiceMap = new Map(invoices.map((i) => [i.id, i]));
  const customerSet = new Set<string>();
  positives.forEach((p) => {
    const inv = p.invoice_id ? invoiceMap.get(p.invoice_id) : null;
    customerSet.add((inv?.customer_name || "Unknown").trim());
  });
  return {
    totalReceived,
    count: positives.length,
    avg: positives.length ? Math.round(totalReceived / positives.length) : 0,
    largest: positives.reduce((m, p) => Math.max(m, p.amount_cents ?? 0), 0),
    uniqueCustomers: customerSet.size,
    refunds,
  };
}

export interface DeltaResult { pct: number; direction: "up" | "down" | "flat" }
export function compareDelta(current: number, previous: number): DeltaResult {
  if (previous === 0 && current === 0) return { pct: 0, direction: "flat" };
  if (previous === 0) return { pct: 100, direction: "up" };
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return { pct, direction: pct > 0.5 ? "up" : pct < -0.5 ? "down" : "flat" };
}

// ─── Time series ───────────────────────────────────────────
function bucketKey(dateIso: string, group: GroupBy): string {
  const d = new Date(dateIso);
  if (group === "day") return d.toISOString().slice(0, 10);
  if (group === "month") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (tmp.getUTCDay() + 6) % 7;
  tmp.setUTCDate(tmp.getUTCDate() - dayNum);
  return tmp.toISOString().slice(0, 10);
}

export interface PaymentsSeriesPoint { date: string; received: number; cumulative: number }
export function groupPaymentsSeries(payments: PaymentRowFull[], group: GroupBy): PaymentsSeriesPoint[] {
  const map: Record<string, number> = {};
  payments.filter((p) => p.amount_cents > 0).forEach((p) => {
    const k = bucketKey(p.paid_at, group);
    map[k] = (map[k] || 0) + (p.amount_cents ?? 0);
  });
  let running = 0;
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, received]) => {
      running += received;
      return { date, received, cumulative: running };
    });
}

// ─── Method breakdown ──────────────────────────────────────
export interface MethodStat { method: string; amount: number; count: number }
export function methodBreakdown(payments: PaymentRowFull[]): MethodStat[] {
  const map = new Map<string, MethodStat>();
  payments.filter((p) => p.amount_cents > 0).forEach((p) => {
    const k = (p.method || "other").toLowerCase();
    const existing = map.get(k) ?? { method: k, amount: 0, count: 0 };
    existing.amount += p.amount_cents ?? 0;
    existing.count += 1;
    map.set(k, existing);
  });
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
}

// ─── Outstanding invoices ──────────────────────────────────
export interface OutstandingInvoice {
  id: string;
  number: string | null;
  customer: string;
  vehicle: string;
  balance: number;
  daysOutstanding: number;
}
export function outstandingInvoices(invoices: PaymentInvoiceLite[]): OutstandingInvoice[] {
  const now = Date.now();
  return invoices
    .filter((i) => i.status !== "paid" && i.status !== "void" && (i.total_cents - i.amount_paid_cents) > 0)
    .map((i) => {
      const ref = i.due_at ? new Date(i.due_at).getTime() : new Date(i.created_at).getTime();
      return {
        id: i.id,
        number: i.number,
        customer: i.customer_name || "Unknown",
        vehicle: i.vehicle_label || "—",
        balance: i.total_cents - i.amount_paid_cents,
        daysOutstanding: Math.max(0, Math.floor((now - ref) / 86400000)),
      };
    })
    .sort((a, b) => b.daysOutstanding - a.daysOutstanding);
}

// ─── Date presets ──────────────────────────────────────────
export type PaymentsPreset = "today" | "week" | "month" | "quarter" | "this_month" | "last_month" | "ytd" | "custom";

export function paymentsPresetRange(preset: PaymentsPreset): { from: string; to: string } {
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

export function previousPaymentsRange(from: string, to: string): { from: string; to: string } {
  const f = new Date(from); const t = new Date(to);
  const days = Math.max(1, Math.round((t.getTime() - f.getTime()) / 86400000) + 1);
  const t2 = new Date(f); t2.setDate(t2.getDate() - 1);
  const f2 = new Date(t2); f2.setDate(f2.getDate() - (days - 1));
  return { from: f2.toISOString().slice(0, 10), to: t2.toISOString().slice(0, 10) };
}

export const PAYMENT_METHODS = ["cash", "card", "check", "aba", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
