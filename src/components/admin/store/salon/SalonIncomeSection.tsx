/**
 * SalonIncomeSection — cash-flow view: gross income from completed
 * bookings + tips + tax minus expenses, with date-range scrub.
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

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const todayIso = () => new Date().toISOString().slice(0, 10);
const daysAgoIso = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export default function SalonIncomeSection({ storeId }: SalonIncomeSectionProps) {
  const [from, setFrom] = useState(daysAgoIso(30));
  const [to, setTo] = useState(todayIso());
  const [bookings, setBookings] = useState<SalonBooking[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const fromIso = new Date(`${from}T00:00:00`).toISOString();
      const toIso = new Date(`${to}T23:59:59.999`).toISOString();
      const [bookingsRes, expensesRes] = await Promise.all([
        supabase.from("salon_bookings").select("*").eq("store_id", storeId)
          .eq("status", "completed").gte("start_at", fromIso).lte("start_at", toIso).limit(1000),
        supabase.from("salon_expenses").select("id, amount_cents, category, expense_date")
          .eq("store_id", storeId).gte("expense_date", from).lte("expense_date", to).limit(1000),
      ]);
      if (cancelled) return;
      if (bookingsRes.error || expensesRes.error) {
        console.error(bookingsRes.error || expensesRes.error);
        setError("Couldn't load financial data.");
        setLoading(false);
        return;
      }
      setBookings((bookingsRes.data ?? []) as unknown as SalonBooking[]);
      setExpenses((expensesRes.data ?? []) as unknown as ExpenseRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [storeId, from, to]);

  const summary = useMemo(() => {
    let serviceRevenue = 0, tips = 0, tax = 0;
    const sourceCount = { walk_in: 0, phone: 0, app: 0, admin: 0 };
    for (const b of bookings) {
      serviceRevenue += b.price_cents;
      tips += b.tip_cents;
      tax += b.tax_cents;
      if (b.source in sourceCount) sourceCount[b.source as keyof typeof sourceCount]++;
    }
    let expenseTotal = 0;
    const expenseByCat = new Map<string, number>();
    for (const e of expenses) {
      expenseTotal += e.amount_cents;
      expenseByCat.set(e.category, (expenseByCat.get(e.category) ?? 0) + e.amount_cents);
    }
    const grossIncome = serviceRevenue + tips + tax;
    const netIncome = grossIncome - expenseTotal;
    const expenseBreakdown = Array.from(expenseByCat.entries())
      .map(([category, cents]) => ({ category, cents }))
      .sort((a, b) => b.cents - a.cents);
    return { serviceRevenue, tips, tax, grossIncome, expenseTotal, netIncome, expenseBreakdown, sourceCount, bookingCount: bookings.length };
  }, [bookings, expenses]);

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
              <Input id="incFrom" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="incTo">To</Label>
              <Input id="incTo" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
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
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    <TrendingUp className="h-3 w-3" /> Gross income
                  </p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{formatPrice(summary.grossIncome)}</p>
                  <p className="text-[11px] text-muted-foreground">{summary.bookingCount} completed bookings</p>
                </div>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    <ArrowDownRight className="h-3 w-3" /> Expenses
                  </p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{formatPrice(summary.expenseTotal)}</p>
                  <p className="text-[11px] text-muted-foreground">{expenses.length} entries</p>
                </div>
                <div className={cn(
                  "rounded-xl border p-4",
                  summary.netIncome >= 0
                    ? "border-sky-500/30 bg-sky-500/5"
                    : "border-destructive/30 bg-destructive/8"
                )}>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Net</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{formatPrice(summary.netIncome)}</p>
                  <p className="text-[11px] text-muted-foreground">After expenses</p>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Income breakdown</p>
                  <ul className="divide-y divide-border text-sm">
                    <Row label="Services" value={formatPrice(summary.serviceRevenue)} />
                    <Row label="Tips" value={formatPrice(summary.tips)} />
                    <Row label="Tax collected" value={formatPrice(summary.tax)} sub="Pass-through" />
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

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <li className="flex items-center justify-between py-1.5">
      <span className="text-foreground">{label}{sub && <span className="ml-1 text-[11px] text-muted-foreground">· {sub}</span>}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </li>
  );
}
