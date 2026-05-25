/**
 * SalonIncomeSection — cash-flow view: revenue from completed bookings
 * (services + retail + tips) minus expenses, with a date-range scrub.
 * Tax is shown separately as pass-through, NOT counted toward the owner's
 * gross or net.
 */
import { useEffect, useMemo, useState } from "react";
import { DollarSign, Loader2, AlertCircle, TrendingUp, ArrowDownRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { SalonBooking } from "@/hooks/salon/useSalonBookings";

interface SalonIncomeSectionProps {
  storeId: string;
}

interface ExpenseRow {
  id: string;
  amount_cents: number;
  category: string;
  expense_date: string;
}

interface RetailItemRow {
  booking_id: string;
  unit_price_cents: number;
  quantity: number;
}

/** "$1.00" / "-$1.00" — the sign goes outside the currency symbol so a
 *  negative net income reads cleanly instead of "$-1.00". */
const formatPrice = (cents: number) => {
  const abs = Math.abs(cents) / 100;
  return `${cents < 0 ? "-" : ""}$${abs.toFixed(2)}`;
};
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const daysAgoIso = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

interface PeriodTotals {
  serviceRevenue: number;
  tips: number;
  tax: number;
  retailRevenue: number;
  expenseTotal: number;
  bookingCount: number;
}

function totalsFor(
  bookings: SalonBooking[],
  retailItems: RetailItemRow[],
  expenses: ExpenseRow[],
): PeriodTotals {
  let serviceRevenue = 0, tips = 0, tax = 0;
  const completedIds = new Set<string>();
  for (const b of bookings) {
    // Base service + add-ons (rolled up by the salon_booking_addons trigger).
    serviceRevenue += b.price_cents + (b.addons_total_cents ?? 0);
    tips += b.tip_cents;
    tax += b.tax_cents;
    completedIds.add(b.id);
  }
  let retailRevenue = 0;
  for (const r of retailItems) {
    if (!completedIds.has(r.booking_id)) continue;
    retailRevenue += r.unit_price_cents * r.quantity;
  }
  let expenseTotal = 0;
  for (const e of expenses) expenseTotal += e.amount_cents;
  return {
    serviceRevenue,
    tips,
    tax,
    retailRevenue,
    expenseTotal,
    bookingCount: bookings.length,
  };
}

/** Same-length window immediately before [from..to]. */
function priorWindow(from: string, to: string): { from: string; to: string } {
  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T00:00:00`);
  const days = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) + 1);
  const priorToDate = new Date(fromDate);
  priorToDate.setDate(priorToDate.getDate() - 1);
  const priorFromDate = new Date(priorToDate);
  priorFromDate.setDate(priorFromDate.getDate() - (days - 1));
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: fmt(priorFromDate), to: fmt(priorToDate) };
}

async function loadWindow(storeId: string, from: string, to: string) {
  const fromIso = new Date(`${from}T00:00:00`).toISOString();
  const toIso = new Date(`${to}T23:59:59.999`).toISOString();
  const [bookingsRes, expensesRes] = await Promise.all([
    supabase.from("salon_bookings").select("*").eq("store_id", storeId)
      .eq("status", "completed").gte("start_at", fromIso).lte("start_at", toIso).limit(1000),
    supabase.from("salon_expenses").select("id, amount_cents, category, expense_date")
      .eq("store_id", storeId).gte("expense_date", from).lte("expense_date", to).limit(1000),
  ]);
  if (bookingsRes.error) throw bookingsRes.error;
  if (expensesRes.error) throw expensesRes.error;
  const bookings = (bookingsRes.data ?? []) as unknown as SalonBooking[];
  const expenses = (expensesRes.data ?? []) as unknown as ExpenseRow[];
  // Retail items per completed booking. Skip the query when there are no
  // bookings to look up.
  let retailItems: RetailItemRow[] = [];
  if (bookings.length > 0) {
    const retailRes = await supabase
      .from("salon_booking_retail_items")
      .select("booking_id, unit_price_cents, quantity")
      .in("booking_id", bookings.map((b) => b.id));
    if (retailRes.error) throw retailRes.error;
    retailItems = (retailRes.data ?? []) as unknown as RetailItemRow[];
  }
  return { bookings, retailItems, expenses };
}

export default function SalonIncomeSection({ storeId }: SalonIncomeSectionProps) {
  const [from, setFrom] = useState(daysAgoIso(30));
  const [to, setTo] = useState(todayIso());
  const [bookings, setBookings] = useState<SalonBooking[]>([]);
  const [retailItems, setRetailItems] = useState<RetailItemRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [priorTotals, setPriorTotals] = useState<PeriodTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const prior = priorWindow(from, to);
        const [curr, prev] = await Promise.all([
          loadWindow(storeId, from, to),
          loadWindow(storeId, prior.from, prior.to),
        ]);
        if (cancelled) return;
        setBookings(curr.bookings);
        setRetailItems(curr.retailItems);
        setExpenses(curr.expenses);
        setPriorTotals(totalsFor(prev.bookings, prev.retailItems, prev.expenses));
      } catch (e) {
        if (cancelled) return;
        console.error("[SalonIncome] load failed", e);
        setError("Couldn't load financial data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [storeId, from, to]);

  const summary = useMemo(() => {
    const t = totalsFor(bookings, retailItems, expenses);
    // Gross is what the owner actually earns: services + retail + tips.
    // Tax is pass-through (collected on behalf of the government), shown
    // separately so the net line below is the owner's real take-home.
    const grossIncome = t.serviceRevenue + t.retailRevenue + t.tips;
    const netIncome = grossIncome - t.expenseTotal;
    const expenseByCat = new Map<string, number>();
    for (const e of expenses) {
      expenseByCat.set(e.category, (expenseByCat.get(e.category) ?? 0) + e.amount_cents);
    }
    const sourceCount = { walk_in: 0, phone: 0, app: 0, admin: 0 };
    for (const b of bookings) {
      if (b.source in sourceCount) sourceCount[b.source as keyof typeof sourceCount]++;
    }
    const expenseBreakdown = Array.from(expenseByCat.entries())
      .map(([category, cents]) => ({ category, cents }))
      .sort((a, b) => b.cents - a.cents);
    return { ...t, grossIncome, netIncome, expenseBreakdown, sourceCount };
  }, [bookings, retailItems, expenses]);

  const priorGross = priorTotals
    ? priorTotals.serviceRevenue + priorTotals.retailRevenue + priorTotals.tips
    : null;
  const priorNet = priorTotals && priorGross !== null ? priorGross - priorTotals.expenseTotal : null;
  const grossDelta = deltaPct(summary.grossIncome, priorGross);
  const expenseDelta = deltaPct(summary.expenseTotal, priorTotals?.expenseTotal ?? null);
  const netDelta = deltaPct(summary.netIncome, priorNet);

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-5 w-5 text-primary" /> Income & Revenue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="incFrom">From</Label>
              {/* Bound the picker so the owner can't construct an inverted
                  range — from > to would silently zero out gross/net and
                  the period-over-period delta would compare against an
                  also-zero prior window. */}
              <Input id="incFrom" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="incTo">To</Label>
              <Input id="incTo" type="date" value={to} min={from} max={todayIso()} onChange={(e) => setTo(e.target.value)} className="h-9" />
            </div>
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={() => { setFrom(daysAgoIso(7)); setTo(todayIso()); }} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">7d</button>
              <button type="button" onClick={() => { setFrom(daysAgoIso(30)); setTo(todayIso()); }} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">30d</button>
              <button type="button" onClick={() => { setFrom(daysAgoIso(90)); setTo(todayIso()); }} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">90d</button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryCard
                  tone="positive"
                  Icon={TrendingUp}
                  label="Gross income"
                  value={formatPrice(summary.grossIncome)}
                  sub={`${summary.bookingCount} completed booking${summary.bookingCount === 1 ? "" : "s"}`}
                  delta={grossDelta}
                  betterIsHigher
                />
                <SummaryCard
                  tone="warn"
                  Icon={ArrowDownRight}
                  label="Expenses"
                  value={formatPrice(summary.expenseTotal)}
                  sub={`${expenses.length} entries`}
                  delta={expenseDelta}
                  betterIsHigher={false}
                />
                <SummaryCard
                  tone={summary.netIncome >= 0 ? "neutral" : "negative"}
                  label="Net"
                  value={formatPrice(summary.netIncome)}
                  sub="After expenses · tax excluded"
                  delta={netDelta}
                  betterIsHigher
                />
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Income breakdown</p>
                  <ul className="divide-y divide-border text-sm">
                    <Row label="Services" value={formatPrice(summary.serviceRevenue)} />
                    <Row label="Retail" value={formatPrice(summary.retailRevenue)} sub={summary.retailRevenue === 0 ? "Nothing sold" : undefined} />
                    <Row label="Tips" value={formatPrice(summary.tips)} />
                    <Row label="Tax collected" value={formatPrice(summary.tax)} sub="Pass-through · not income" />
                  </ul>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Expenses by category</p>
                  {summary.expenseBreakdown.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No expenses logged in this window.</p>
                  ) : (
                    <ul className="divide-y divide-border text-sm">
                      {summary.expenseBreakdown.slice(0, 6).map((e) => (
                        <Row key={e.category} label={e.category} value={formatPrice(e.cents)} />
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Booking sources</p>
                <div className="grid grid-cols-4 gap-3 text-sm">
                  {(["walk_in", "phone", "app", "admin"] as const).map((src) => (
                    <div key={src} className="rounded-lg border border-border p-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{src.replace("_", " ")}</p>
                      <p className="text-base font-bold text-foreground">{summary.sourceCount[src]}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function deltaPct(curr: number, prev: number | null): { pct: number; positive: boolean } | null {
  if (prev === null || prev === 0) return null;
  const pct = ((curr - prev) / prev) * 100;
  return { pct, positive: pct >= 0 };
}

interface SummaryCardProps {
  tone: "positive" | "warn" | "neutral" | "negative";
  Icon?: typeof TrendingUp;
  label: string;
  value: string;
  sub?: string;
  delta?: { pct: number; positive: boolean } | null;
  betterIsHigher?: boolean;
}

function SummaryCard({ tone, Icon, label, value, sub, delta, betterIsHigher = true }: SummaryCardProps) {
  const toneClass =
    tone === "positive" ? "border-emerald-500/30 bg-emerald-500/5" :
    tone === "warn" ? "border-amber-500/30 bg-amber-500/5" :
    tone === "negative" ? "border-destructive/30 bg-destructive/8" :
    "border-sky-500/30 bg-sky-500/5";
  const accentText =
    tone === "positive" ? "text-emerald-700 dark:text-emerald-300" :
    tone === "warn" ? "text-amber-700 dark:text-amber-300" :
    tone === "negative" ? "text-destructive" :
    "text-muted-foreground";
  let deltaLabel: string | null = null;
  let deltaClass = "text-muted-foreground";
  if (delta) {
    const sign = delta.pct >= 0 ? "+" : "";
    deltaLabel = `${sign}${delta.pct.toFixed(0)}% vs prior`;
    const isGood = betterIsHigher ? delta.positive : !delta.positive;
    deltaClass = isGood ? "text-emerald-700 dark:text-emerald-300" : "text-destructive";
  }
  return (
    <div className={cn("rounded-xl border p-4", toneClass)}>
      <p className={cn("inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider", accentText)}>
        {Icon && <Icon className="h-3 w-3" />} {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      {deltaLabel && <p className={cn("mt-0.5 text-[10px] font-semibold", deltaClass)}>{deltaLabel}</p>}
    </div>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <li className="flex items-center justify-between py-1.5">
      <span className="text-foreground">{label}{sub && <span className="ml-1 text-[11px] text-muted-foreground">· {sub}</span>}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </li>
  );
}
