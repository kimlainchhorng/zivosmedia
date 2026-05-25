/**
 * CarRentalIncomeSection — revenue analytics from returned reservations.
 */
import { useEffect, useMemo, useState } from "react";
import {
  DollarSign, Loader2, AlertTriangle, TrendingUp, CalendarRange,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props { storeId: string }

type Period = "7d" | "30d" | "90d" | "ytd" | "all";

interface RevenueRow {
  id: string;
  vehicle_label: string;
  vehicle_category: string | null;
  customer_name: string;
  rental_days: number;
  base_total_cents: number;
  addons_total_cents: number;
  fees_cents: number;
  total_cents: number;
  returned_at: string | null;
  pickup_at: string;
}

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const periodToCutoff = (p: Period) => {
  const now = new Date();
  switch (p) {
    case "7d": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case "30d": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    case "90d": return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    case "ytd": return new Date(now.getFullYear(), 0, 1).toISOString();
    case "all": return null;
  }
};

export default function CarRentalIncomeSection({ storeId }: Props) {
  const [period, setPeriod] = useState<Period>("30d");
  const [rows, setRows] = useState<RevenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const cutoff = periodToCutoff(period);
      let query = supabase
        .from("car_rental_reservations")
        .select("id, vehicle_label, vehicle_category, customer_name, rental_days, base_total_cents, addons_total_cents, fees_cents, total_cents, returned_at, pickup_at")
        .eq("store_id", storeId)
        .eq("status", "returned")
        .order("returned_at", { ascending: false });
      if (cutoff) query = query.gte("returned_at", cutoff);
      const { data, error: err } = await query;
      if (cancelled) return;
      if (err) {
        setError("Couldn't load revenue.");
        setLoading(false);
        return;
      }
      setRows((data ?? []) as unknown as RevenueRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [storeId, period]);

  const summary = useMemo(() => {
    let total = 0, base = 0, addons = 0, fees = 0, days = 0;
    for (const r of rows) {
      total += r.total_cents;
      base += r.base_total_cents;
      addons += r.addons_total_cents;
      fees += r.fees_cents;
      days += r.rental_days;
    }
    return { total, base, addons, fees, days, count: rows.length };
  }, [rows]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const k = r.vehicle_category ?? "uncategorized";
      map.set(k, (map.get(k) ?? 0) + r.total_cents);
    }
    return Array.from(map, ([cat, cents]) => ({ cat, cents })).sort((a, b) => b.cents - a.cents);
  }, [rows]);
  const maxCat = byCategory[0]?.cents ?? 1;

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-5 w-5 text-primary" /> Income
          </CardTitle>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="ytd">Year to date</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          )}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                <Stat icon={DollarSign} label="Revenue" value={formatMoney(summary.total)} sub={`${summary.count} rental${summary.count === 1 ? "" : "s"}`} />
                <Stat icon={CalendarRange} label="Rental days" value={String(summary.days)} sub={summary.count > 0 ? `Avg ${(summary.days / summary.count).toFixed(1)} days` : ""} />
                <Stat icon={TrendingUp} label="Add-ons" value={formatMoney(summary.addons)} sub="Extras revenue" />
                <Stat icon={DollarSign} label="Extra fees" value={formatMoney(summary.fees)} sub="Over-mileage, refuel, damage" />
              </div>

              <Card className="rounded-xl border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Revenue by category</CardTitle>
                </CardHeader>
                <CardContent>
                  {byCategory.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No returns in this period.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {byCategory.map((c) => (
                        <li key={c.cat} className="space-y-1">
                          <div className="flex items-baseline justify-between text-xs">
                            <span className="font-medium capitalize text-foreground">{c.cat}</span>
                            <span className="font-mono text-muted-foreground">{formatMoney(c.cents)}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div className="h-full bg-primary/70" style={{ width: `${Math.max(4, Math.round((c.cents / maxCat) * 100))}%` }} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-xl border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Recent returns</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {rows.length === 0 ? (
                    <p className="p-4 text-xs text-muted-foreground">No data.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {rows.slice(0, 25).map((r) => (
                        <li key={r.id} className="flex items-center gap-3 p-3 text-sm">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-foreground">{r.customer_name}</p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {r.vehicle_label} · {r.rental_days} day{r.rental_days === 1 ? "" : "s"} · returned {r.returned_at ? new Date(r.returned_at).toLocaleDateString() : "—"}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-foreground">{formatMoney(r.total_cents)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: typeof DollarSign; label: string; value: string; sub?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4")}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-[11px] font-bold uppercase tracking-wider">{label}</p>
      </div>
      <p className="mt-1.5 text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
