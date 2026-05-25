/**
 * SalonReportsSection — analytics overview for a salon owner. Read-only.
 * Pulls from salon_bookings (and indirectly stylists/services via snapshots).
 */
import { useEffect, useMemo, useState } from "react";
import { BarChart3, Loader2, AlertCircle, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SalonBooking } from "@/hooks/salon/useSalonBookings";

interface SalonReportsSectionProps {
  storeId: string;
}

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const daysAgoIso = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function SalonReportsSection({ storeId }: SalonReportsSectionProps) {
  const [from, setFrom] = useState(daysAgoIso(30));
  const [to, setTo] = useState(todayIso());
  const [rows, setRows] = useState<SalonBooking[]>([]);
  const [priorRows, setPriorRows] = useState<SalonBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const fromDate = new Date(`${from}T00:00:00`);
      const toDate = new Date(`${to}T23:59:59.999`);
      // Equivalent prior period: same length, immediately before.
      const periodMs = toDate.getTime() - fromDate.getTime() + 1;
      const priorTo = new Date(fromDate.getTime() - 1);
      const priorFrom = new Date(priorTo.getTime() - periodMs + 1);
      const [curr, prev] = await Promise.all([
        supabase.from("salon_bookings").select("*").eq("store_id", storeId)
          .gte("start_at", fromDate.toISOString()).lte("start_at", toDate.toISOString()).limit(1000),
        supabase.from("salon_bookings").select("*").eq("store_id", storeId)
          .gte("start_at", priorFrom.toISOString()).lte("start_at", priorTo.toISOString()).limit(1000),
      ]);
      if (cancelled) return;
      if (curr.error || prev.error) {
        console.error("[SalonReports] load failed", curr.error || prev.error);
        setError("Couldn't load report data.");
        setLoading(false);
        return;
      }
      setRows((curr.data ?? []) as unknown as SalonBooking[]);
      setPriorRows((prev.data ?? []) as unknown as SalonBooking[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [storeId, from, to]);

  const summary = useMemo(() => {
    let total = rows.length;
    let completed = 0, cancelled = 0, noShow = 0;
    let revenue = 0, tips = 0;
    const byService = new Map<string, { count: number; revenue: number }>();
    const byStylist = new Map<string, { count: number; revenue: number }>();
    const byDay = new Map<string, { revenue: number; count: number }>();
    for (const r of rows) {
      if (r.status === "completed") {
        completed++;
        // Total service revenue = base + add-ons (trigger rollup).
        const totalServiceCents = r.price_cents + (r.addons_total_cents ?? 0);
        revenue += totalServiceCents;
        tips += r.tip_cents;
        // Top services & top stylists are still keyed by the base service —
        // add-ons are tracked separately and would skew the leaderboard if
        // mixed in — but the revenue figure each row shows is the total the
        // stylist actually delivered.
        const svc = byService.get(r.service_name) ?? { count: 0, revenue: 0 };
        svc.count++; svc.revenue += totalServiceCents;
        byService.set(r.service_name, svc);
        const styName = r.stylist_name ?? "Unassigned";
        const st = byStylist.get(styName) ?? { count: 0, revenue: 0 };
        st.count++; st.revenue += totalServiceCents;
        byStylist.set(styName, st);
        // Local-time day key so the daily trend chart bucketizes evening
        // bookings under the day the customer actually showed up, not the
        // UTC date (which would shift bookings in negative-offset timezones).
        const dt = new Date(r.start_at);
        const dayKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
        const d = byDay.get(dayKey) ?? { revenue: 0, count: 0 };
        d.revenue += totalServiceCents; d.count++;
        byDay.set(dayKey, d);
      }
      if (r.status === "cancelled") cancelled++;
      if (r.status === "no_show") noShow++;
    }
    const noShowRate = (noShow + cancelled) > 0 || completed > 0
      ? (noShow / Math.max(1, completed + noShow + cancelled)) * 100
      : 0;
    const topServices = Array.from(byService.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    const topStylists = Array.from(byStylist.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    const trend = Array.from(byDay.entries())
      .map(([day, v]) => ({ day, ...v }))
      .sort((a, b) => a.day.localeCompare(b.day));
    const maxDayRevenue = Math.max(1, ...trend.map((t) => t.revenue));
    return { total, completed, cancelled, noShow, revenue, tips, noShowRate, topServices, topStylists, trend, maxDayRevenue };
  }, [rows]);

  const priorSummary = useMemo(() => {
    let total = priorRows.length;
    let completed = 0, cancelled = 0, noShow = 0;
    let revenue = 0;
    for (const r of priorRows) {
      if (r.status === "completed") {
        completed++;
        revenue += r.price_cents + (r.addons_total_cents ?? 0);
      }
      else if (r.status === "cancelled") cancelled++;
      else if (r.status === "no_show") noShow++;
    }
    return { total, completed, cancelled, noShow, revenue };
  }, [priorRows]);

  /** Returns a friendly "+X% / -X%" string or null when prior is zero. */
  const deltaPct = (curr: number, prev: number): { pct: number; positive: boolean } | null => {
    if (!prev) return null;
    const pct = ((curr - prev) / prev) * 100;
    return { pct, positive: pct >= 0 };
  };

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
            <BarChart3 className="h-5 w-5 text-primary" /> Reports & Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="repFrom">From</Label>
              {/* Bind the range so the owner can't construct an inverted
                  window. Same fix as the Expenses + Income sections. */}
              <Input id="repFrom" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="repTo">To</Label>
              <Input id="repTo" type="date" value={to} min={from} max={todayIso()} onChange={(e) => setTo(e.target.value)} className="h-9" />
            </div>
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={() => { setFrom(daysAgoIso(7)); setTo(todayIso()); }} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">Last 7d</button>
              <button type="button" onClick={() => { setFrom(daysAgoIso(30)); setTo(todayIso()); }} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">30d</button>
              <button type="button" onClick={() => { setFrom(daysAgoIso(90)); setTo(todayIso()); }} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">90d</button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                <Stat label="Bookings" value={String(summary.total)} sub={`${summary.completed} completed`} delta={deltaPct(summary.total, priorSummary.total)} betterIsHigher />
                <Stat label="Service revenue" value={formatPrice(summary.revenue)} sub={`${formatPrice(summary.tips)} in tips`} delta={deltaPct(summary.revenue, priorSummary.revenue)} betterIsHigher />
                <Stat label="No-shows" value={String(summary.noShow)} sub={`${summary.noShowRate.toFixed(1)}% no-show rate`} tone={summary.noShowRate > 10 ? "warn" : "neutral"} delta={deltaPct(summary.noShow, priorSummary.noShow)} betterIsHigher={false} />
                <Stat label="Cancelled" value={String(summary.cancelled)} sub={summary.cancelled === 0 ? "Nothing cancelled" : `Of ${summary.total} bookings`} delta={deltaPct(summary.cancelled, priorSummary.cancelled)} betterIsHigher={false} />
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <ListPanel title="Top services" Icon={TrendingUp} rows={summary.topServices.map((s) => ({ label: s.name, primary: formatPrice(s.revenue), secondary: `${s.count} done` }))} emptyText="No completed services yet." />
                <ListPanel title="Top stylists" Icon={TrendingUp} rows={summary.topStylists.map((s) => ({ label: s.name, primary: formatPrice(s.revenue), secondary: `${s.count} services` }))} emptyText="No completed services yet." />
              </div>

              <div className="rounded-xl border border-border p-4">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Daily revenue</p>
                {summary.trend.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No completed bookings in this window.</p>
                ) : (
                  <div className="flex h-32 items-end gap-1">
                    {summary.trend.map((t) => {
                      const h = Math.max(4, Math.round((t.revenue / summary.maxDayRevenue) * 100));
                      return (
                        <div key={t.day} className="flex flex-1 flex-col items-center gap-1" title={`${t.day}: ${formatPrice(t.revenue)} (${t.count} done)`}>
                          <div className="w-full rounded-t bg-primary/80" style={{ height: `${h}%` }} />
                          <span className="text-[9px] text-muted-foreground">{t.day.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, sub, tone = "neutral", delta, betterIsHigher = true }: {
  label: string;
  value: string;
  sub?: string;
  tone?: "warn" | "neutral";
  /** Period-over-period delta; null when the prior period was 0. */
  delta?: { pct: number; positive: boolean } | null;
  /** If true (default), positive delta is "good" (green). Set false for things like no-shows where lower is better. */
  betterIsHigher?: boolean;
}) {
  let deltaLabel: string | null = null;
  let deltaClass = "text-muted-foreground";
  if (delta) {
    const sign = delta.pct >= 0 ? "+" : "";
    deltaLabel = `${sign}${delta.pct.toFixed(0)}% vs prior`;
    const isGood = betterIsHigher ? delta.positive : !delta.positive;
    deltaClass = isGood ? "text-emerald-700 dark:text-emerald-300" : "text-destructive";
  }
  return (
    <div className={`rounded-xl border p-3 ${tone === "warn" ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-card"}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      {deltaLabel && <p className={`mt-0.5 text-[10px] font-semibold ${deltaClass}`}>{deltaLabel}</p>}
    </div>
  );
}

interface ListPanelProps {
  title: string;
  Icon: typeof TrendingUp;
  rows: { label: string; primary: string; secondary?: string }[];
  emptyText: string;
}

function ListPanel({ title, Icon, rows, emptyText }: ListPanelProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {title}
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between gap-2 py-1.5 text-sm">
              <span className="truncate text-foreground">{r.label}</span>
              <span className="shrink-0 text-right">
                <span className="font-semibold text-foreground">{r.primary}</span>
                {r.secondary && <span className="ml-2 text-[11px] text-muted-foreground">{r.secondary}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
