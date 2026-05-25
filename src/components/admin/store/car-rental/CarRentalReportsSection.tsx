/**
 * CarRentalReportsSection — fleet utilization, top vehicles, no-show rate.
 */
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3, Loader2, AlertTriangle, Car, TrendingUp, Star, AlertOctagon, CalendarRange, XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props { storeId: string }

type Period = "30d" | "90d" | "ytd" | "all";

interface AnalyticsRow {
  id: string;
  vehicle_id: string | null;
  vehicle_label: string;
  rental_days: number;
  total_cents: number;
  status: string;
  returned_at: string | null;
  pickup_at: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
}

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const periodToCutoff = (p: Period) => {
  const now = new Date();
  switch (p) {
    case "30d": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    case "90d": return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    case "ytd": return new Date(now.getFullYear(), 0, 1).toISOString();
    case "all": return null;
  }
};
const periodDays = (p: Period) => {
  switch (p) {
    case "30d": return 30;
    case "90d": return 90;
    case "ytd": return Math.ceil((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (24 * 60 * 60 * 1000));
    case "all": return null;
  }
};

export default function CarRentalReportsSection({ storeId }: Props) {
  const [period, setPeriod] = useState<Period>("90d");
  const [rows, setRows] = useState<AnalyticsRow[]>([]);
  const [vehicleCount, setVehicleCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const cutoff = periodToCutoff(period);
      let reservationsQuery = supabase
        .from("car_rental_reservations")
        .select("id, vehicle_id, vehicle_label, rental_days, total_cents, status, returned_at, pickup_at, cancelled_at, cancellation_reason, created_at")
        .eq("store_id", storeId);
      if (cutoff) reservationsQuery = reservationsQuery.gte("pickup_at", cutoff);

      const [resR, vehsR] = await Promise.all([
        reservationsQuery,
        supabase.from("car_rental_vehicles").select("id", { count: "exact", head: true }).eq("store_id", storeId).eq("is_active", true),
      ]);
      if (cancelled) return;
      if (resR.error) {
        setError("Couldn't load analytics.");
        setLoading(false);
        return;
      }
      setRows((resR.data ?? []) as unknown as AnalyticsRow[]);
      setVehicleCount(vehsR.count ?? 0);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [storeId, period]);

  const stats = useMemo(() => {
    let returned = 0, noShow = 0, cancelled = 0, totalDays = 0, totalRevenue = 0;
    const byVehicle = new Map<string, { label: string; days: number; revenue: number; rentals: number }>();
    for (const r of rows) {
      if (r.status === "returned") {
        returned++;
        totalDays += r.rental_days;
        totalRevenue += r.total_cents;
      }
      if (r.status === "no_show") noShow++;
      if (r.status === "cancelled") cancelled++;
      if (r.status === "returned" || r.status === "picked_up") {
        const k = r.vehicle_id ?? "unknown";
        const cur = byVehicle.get(k) ?? { label: r.vehicle_label, days: 0, revenue: 0, rentals: 0 };
        cur.days += r.rental_days;
        cur.revenue += r.total_cents;
        cur.rentals += 1;
        byVehicle.set(k, cur);
      }
    }
    const days = periodDays(period);
    const fleetDayCapacity = days && vehicleCount ? days * vehicleCount : null;
    const utilization = fleetDayCapacity ? Math.min(100, Math.round((totalDays / fleetDayCapacity) * 100)) : null;
    const topVehicles = Array.from(byVehicle.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
    const avgLength = returned > 0 ? totalDays / returned : 0;
    const allActive = returned + noShow + cancelled;
    const noShowRate = allActive > 0 ? Math.round((noShow / allActive) * 100) : 0;
    const cancelRate = allActive > 0 ? Math.round((cancelled / allActive) * 100) : 0;

    // Cancellation reason tally — bucket free-form reasons by their leading "label —" prefix.
    const reasonCounts = new Map<string, number>();
    let totalTimeToCancelMs = 0;
    let timeToCancelN = 0;
    for (const r of rows) {
      if (r.status === "cancelled" && r.cancellation_reason) {
        const label = r.cancellation_reason.split("—")[0]?.trim() || r.cancellation_reason.trim();
        reasonCounts.set(label, (reasonCounts.get(label) ?? 0) + 1);
        if (r.cancelled_at && r.created_at) {
          totalTimeToCancelMs += new Date(r.cancelled_at).getTime() - new Date(r.created_at).getTime();
          timeToCancelN++;
        }
      } else if (r.status === "cancelled") {
        reasonCounts.set("Unspecified", (reasonCounts.get("Unspecified") ?? 0) + 1);
      }
    }
    const reasonsList = Array.from(reasonCounts, ([k, v]) => ({ label: k, count: v })).sort((a, b) => b.count - a.count);
    const avgTimeToCancelHours = timeToCancelN > 0 ? totalTimeToCancelMs / timeToCancelN / (60 * 60 * 1000) : 0;

    return { returned, noShow, cancelled, totalDays, totalRevenue, utilization, topVehicles, avgLength, noShowRate, cancelRate, reasonsList, avgTimeToCancelHours };
  }, [rows, period, vehicleCount]);

  const maxRev = stats.topVehicles[0]?.revenue ?? 1;

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-primary" /> Reports & analytics
          </CardTitle>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
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
                <Stat icon={TrendingUp} label="Fleet utilization" value={stats.utilization !== null ? `${stats.utilization}%` : "—"} sub={`${stats.totalDays} rental days`} />
                <Stat icon={CalendarRange} label="Avg rental length" value={stats.avgLength > 0 ? `${stats.avgLength.toFixed(1)} d` : "—"} sub={`${stats.returned} completed`} />
                <Stat icon={AlertOctagon} label="No-show rate" value={`${stats.noShowRate}%`} sub={`${stats.noShow} of ${stats.returned + stats.noShow + stats.cancelled}`} tone={stats.noShowRate > 10 ? "warn" : "neutral"} />
                <Stat icon={Star} label="Revenue (period)" value={formatMoney(stats.totalRevenue)} sub={`${stats.returned} rentals`} />
              </div>

              <Card className="rounded-xl border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Car className="h-4 w-4 text-primary" /> Top vehicles by revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.topVehicles.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No data yet in this period.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {stats.topVehicles.map((v) => (
                        <li key={v.label} className="space-y-1">
                          <div className="flex items-baseline justify-between text-xs">
                            <span className="font-medium text-foreground truncate">{v.label}</span>
                            <span className="font-mono text-muted-foreground shrink-0 ml-2">{formatMoney(v.revenue)}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div className="h-full bg-primary/70" style={{ width: `${Math.max(4, Math.round((v.revenue / maxRev) * 100))}%` }} />
                          </div>
                          <p className="text-[10px] text-muted-foreground">{v.rentals} rental{v.rentals === 1 ? "" : "s"} · {v.days} day{v.days === 1 ? "" : "s"}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-xl border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-destructive" /> Cancellations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <MiniMetric label="Cancel rate" value={`${stats.cancelRate}%`} />
                    <MiniMetric label="No-show rate" value={`${stats.noShowRate}%`} />
                    <MiniMetric label="Avg time to cancel" value={stats.avgTimeToCancelHours > 0 ? (stats.avgTimeToCancelHours < 24 ? `${stats.avgTimeToCancelHours.toFixed(1)}h` : `${(stats.avgTimeToCancelHours / 24).toFixed(1)}d`) : "—"} />
                  </div>
                  {stats.reasonsList.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No cancellations in this period — great retention.</p>
                  ) : (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Top reasons</p>
                      <ul className="space-y-1.5">
                        {stats.reasonsList.slice(0, 6).map((r) => {
                          const maxCount = stats.reasonsList[0]?.count ?? 1;
                          return (
                            <li key={r.label} className="space-y-1">
                              <div className="flex items-baseline justify-between text-xs">
                                <span className="font-medium text-foreground truncate">{r.label}</span>
                                <span className="font-mono text-muted-foreground shrink-0 ml-2">{r.count}</span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                <div className="h-full bg-destructive/60" style={{ width: `${Math.max(4, Math.round((r.count / maxCount) * 100))}%` }} />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
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

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-2 text-center">
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, tone = "neutral" }: {
  icon: typeof BarChart3; label: string; value: string; sub?: string; tone?: "warn" | "neutral";
}) {
  return (
    <div className={cn(
      "rounded-2xl border border-border bg-card p-4",
      tone === "warn" && "border-amber-500/30 bg-amber-500/5"
    )}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-[11px] font-bold uppercase tracking-wider">{label}</p>
      </div>
      <p className="mt-1.5 text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
