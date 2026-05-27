/**
 * CarRentalReportsSection — fleet utilization, top vehicles, no-show rate.
 */
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3, Loader2, AlertTriangle, Car, TrendingUp, Star, AlertOctagon, CalendarRange, XCircle, GitBranch, Trophy, Clock, UserCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props { storeId: string }

interface VehicleLite { id: string; label: string }
interface HeatRes { vehicle_id: string | null; pickup_at: string; dropoff_at: string; status: string }
interface TopRenter { customer_id: string; display_name: string; spend: number; rentals: number }
interface ReactivationCandidate { id: string; display_name: string; last_rental_at: string | null; total_rentals: number; daysSince: number }

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  const [heatVehicles, setHeatVehicles] = useState<VehicleLite[]>([]);
  const [heatRes, setHeatRes] = useState<HeatRes[]>([]);
  const [topRenters, setTopRenters] = useState<TopRenter[]>([]);
  const [reactivation, setReactivation] = useState<ReactivationCandidate[]>([]);
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

  // 14-day heatmap data: active vehicles + reservations overlapping the window.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6); // start ~1 week ago
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);   // through ~1 week ahead
      const [vehsR, resR] = await Promise.all([
        supabase.from("car_rental_vehicles")
          .select("id, make, model, year")
          .eq("store_id", storeId)
          .eq("is_active", true)
          .order("make", { ascending: true })
          .limit(20),
        supabase.from("car_rental_reservations")
          .select("vehicle_id, pickup_at, dropoff_at, status")
          .eq("store_id", storeId)
          .in("status", ["confirmed", "picked_up", "returned"])
          .lt("pickup_at", end.toISOString())
          .gt("dropoff_at", start.toISOString())
          .limit(500),
      ]);
      if (cancelled) return;
      setHeatVehicles(((vehsR.data ?? []) as Array<{ id: string; make: string; model: string; year: number | null }>)
        .map((v) => ({ id: v.id, label: `${v.year ? `${v.year} ` : ""}${v.make} ${v.model}` })));
      setHeatRes((resR.data ?? []) as unknown as HeatRes[]);
    })();
    return () => { cancelled = true; };
  }, [storeId]);

  // Reactivation candidates: customers with prior rentals whose most recent booking
  // is older than 60 days. Useful for win-back outreach.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("car_rental_customers")
        .select("id, display_name, last_rental_at, total_rentals, is_blocked")
        .eq("store_id", storeId)
        .gt("total_rentals", 0)
        .lt("last_rental_at", cutoff)
        .eq("is_blocked", false)
        .not("last_rental_at", "is", null)
        .order("last_rental_at", { ascending: false })
        .limit(5);
      if (cancelled) return;
      const now = Date.now();
      setReactivation(((data ?? []) as Array<{ id: string; display_name: string; last_rental_at: string | null; total_rentals: number }>)
        .map((c) => ({
          id: c.id,
          display_name: c.display_name,
          last_rental_at: c.last_rental_at,
          total_rentals: c.total_rentals,
          daysSince: c.last_rental_at ? Math.floor((now - new Date(c.last_rental_at).getTime()) / (24 * 60 * 60 * 1000)) : 0,
        })));
    })();
    return () => { cancelled = true; };
  }, [storeId]);

  // Top renters by lifetime spend within the selected period.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cutoff = periodToCutoff(period);
      let q = supabase.from("car_rental_reservations")
        .select("customer_id, customer_name, total_cents, status")
        .eq("store_id", storeId)
        .in("status", ["returned", "picked_up"])
        .not("customer_id", "is", null);
      if (cutoff) q = q.gte("pickup_at", cutoff);
      const { data } = await q.limit(1000);
      if (cancelled) return;
      const m = new Map<string, TopRenter>();
      for (const r of (data ?? []) as Array<{ customer_id: string; customer_name: string; total_cents: number }>) {
        const cur = m.get(r.customer_id) ?? { customer_id: r.customer_id, display_name: r.customer_name, spend: 0, rentals: 0 };
        cur.spend += r.total_cents;
        cur.rentals += 1;
        m.set(r.customer_id, cur);
      }
      setTopRenters(Array.from(m.values()).sort((a, b) => b.spend - a.spend).slice(0, 5));
    })();
    return () => { cancelled = true; };
  }, [storeId, period]);

  const stats = useMemo(() => {
    let returned = 0, noShow = 0, cancelled = 0, totalDays = 0, totalRevenue = 0;
    const byVehicle = new Map<string, { label: string; days: number; revenue: number; rentals: number }>();
    const dowRevenue = [0, 0, 0, 0, 0, 0, 0]; // Sun..Sat
    let leadTimeSumMs = 0;
    let leadTimeN = 0;
    for (const r of rows) {
      if (r.status === "returned") {
        returned++;
        totalDays += r.rental_days;
        totalRevenue += r.total_cents;
        const dow = new Date(r.pickup_at).getDay();
        dowRevenue[dow] += r.total_cents;
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
      // Lead time: created_at -> pickup_at for all non-cancelled bookings
      if (r.status !== "cancelled" && r.status !== "no_show") {
        const lead = new Date(r.pickup_at).getTime() - new Date(r.created_at).getTime();
        if (lead > 0) {
          leadTimeSumMs += lead;
          leadTimeN += 1;
        }
      }
    }
    const avgLeadDays = leadTimeN > 0 ? (leadTimeSumMs / leadTimeN) / (24 * 60 * 60 * 1000) : 0;
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

    // Booking funnel — what % made it through each stage
    let pendingOrBetter = 0, confirmedOrBetter = 0, pickedUpOrBetter = 0, returnedTotal = 0;
    for (const r of rows) {
      const isLive = r.status !== "cancelled";
      if (isLive) pendingOrBetter++;
      if (r.status === "confirmed" || r.status === "picked_up" || r.status === "returned") confirmedOrBetter++;
      if (r.status === "picked_up" || r.status === "returned") pickedUpOrBetter++;
      if (r.status === "returned") returnedTotal++;
    }
    const funnel = {
      total: rows.length,
      pendingOrBetter,
      confirmedOrBetter,
      pickedUpOrBetter,
      returnedTotal,
    };

    return { returned, noShow, cancelled, totalDays, totalRevenue, utilization, topVehicles, avgLength, noShowRate, cancelRate, reasonsList, avgTimeToCancelHours, funnel, dowRevenue, avgLeadDays };
  }, [rows, period, vehicleCount]);

  const maxRev = stats.topVehicles[0]?.revenue ?? 1;

  // Build the 14-day grid (7 past · today · 7 future). Each row is one vehicle, each
  // cell tells whether that vehicle has an overlapping reservation on that day.
  const heatmap = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;
    const today = new Date();
    const baseDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6).getTime();
    const days: { ts: number; label: string; isToday: boolean }[] = Array.from({ length: 14 }, (_, i) => {
      const ts = baseDay + i * dayMs;
      const d = new Date(ts);
      return {
        ts,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        isToday: i === 6,
      };
    });
    const byVehicle = new Map<string, { booked: boolean[] }>();
    for (const v of heatVehicles) byVehicle.set(v.id, { booked: new Array(14).fill(false) });
    for (const r of heatRes) {
      if (!r.vehicle_id) continue;
      const row = byVehicle.get(r.vehicle_id);
      if (!row) continue;
      const start = new Date(r.pickup_at).getTime();
      const end = new Date(r.dropoff_at).getTime();
      for (let i = 0; i < days.length; i++) {
        const dStart = days[i].ts;
        const dEnd = dStart + dayMs;
        if (start < dEnd && end > dStart) row.booked[i] = true;
      }
    }
    const rowsView = heatVehicles.map((v) => ({ id: v.id, label: v.label, booked: byVehicle.get(v.id)?.booked ?? new Array(14).fill(false) }));
    const totalCells = rowsView.length * 14;
    const bookedCells = rowsView.reduce((s, r) => s + r.booked.filter(Boolean).length, 0);
    const utilPct = totalCells > 0 ? Math.round((bookedCells / totalCells) * 100) : 0;
    return { days, rows: rowsView, utilPct };
  }, [heatVehicles, heatRes]);

  const maxRenterSpend = topRenters[0]?.spend ?? 1;

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
                    <GitBranch className="h-4 w-4 text-primary" /> Booking funnel
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.funnel.total === 0 ? (
                    <p className="text-xs text-muted-foreground">No bookings yet in this period.</p>
                  ) : (
                    <ul className="space-y-2">
                      {[
                        { label: "All bookings", value: stats.funnel.total, base: stats.funnel.total },
                        { label: "Not cancelled", value: stats.funnel.pendingOrBetter, base: stats.funnel.total },
                        { label: "Confirmed+", value: stats.funnel.confirmedOrBetter, base: stats.funnel.total },
                        { label: "Picked up", value: stats.funnel.pickedUpOrBetter, base: stats.funnel.total },
                        { label: "Completed", value: stats.funnel.returnedTotal, base: stats.funnel.total },
                      ].map((s, i) => {
                        const pct = s.base > 0 ? Math.round((s.value / s.base) * 100) : 0;
                        const isLast = i === 4;
                        return (
                          <li key={s.label}>
                            <div className="mb-0.5 flex items-baseline justify-between text-xs">
                              <span className="font-medium text-foreground">{s.label}</span>
                              <span className="font-mono text-muted-foreground">{s.value} ({pct}%)</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn("h-full", isLast ? "bg-emerald-500" : "bg-primary/70")}
                                style={{ width: `${Math.max(2, pct)}%` }}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {stats.funnel.total > 0 && (
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      Completion rate: <span className="font-bold text-foreground">{Math.round((stats.funnel.returnedTotal / stats.funnel.total) * 100)}%</span> of bookings became completed rentals
                    </p>
                  )}
                </CardContent>
              </Card>

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
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <CalendarRange className="h-4 w-4 text-primary" /> Utilization heatmap
                    </span>
                    <span className="text-[10px] font-normal text-muted-foreground">last 7d + next 7d · {heatmap.utilPct}% booked</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {heatmap.rows.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No active vehicles yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr>
                            <th className="text-left font-normal text-muted-foreground pr-2 pb-1">Vehicle</th>
                            {heatmap.days.map((d, i) => (
                              <th key={i} className={cn(
                                "px-0.5 pb-1 text-center font-normal",
                                d.isToday ? "text-primary font-bold" : "text-muted-foreground"
                              )}>
                                {d.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {heatmap.rows.map((row) => (
                            <tr key={row.id}>
                              <td className="pr-2 py-0.5 text-foreground truncate max-w-[120px]">{row.label}</td>
                              {row.booked.map((b, i) => (
                                <td key={i} className="px-px py-0.5">
                                  <div
                                    title={`${row.label} · ${heatmap.days[i].label}${b ? " · booked" : " · free"}`}
                                    className={cn(
                                      "h-4 rounded-sm border",
                                      b
                                        ? "bg-emerald-500/70 border-emerald-500/30"
                                        : "bg-muted/40 border-border",
                                      heatmap.days[i].isToday && "ring-1 ring-primary/40",
                                    )}
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-xl border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Trophy className="h-4 w-4 text-amber-500" /> Top renters this period
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {topRenters.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No completed rentals from registered renters yet.</p>
                  ) : (
                    <ol className="space-y-1.5">
                      {topRenters.map((r, i) => (
                        <li key={r.customer_id} className="space-y-1">
                          <div className="flex items-baseline justify-between text-xs gap-2">
                            <span className="font-medium text-foreground truncate inline-flex items-center gap-1.5">
                              <span className={cn(
                                "inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold",
                                i === 0 ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                : i === 1 ? "bg-muted text-foreground/80"
                                : i === 2 ? "bg-orange-500/15 text-orange-700 dark:text-orange-300"
                                : "bg-muted/60 text-muted-foreground"
                              )}>{i + 1}</span>
                              {r.display_name}
                            </span>
                            <span className="font-mono text-muted-foreground shrink-0">{formatMoney(r.spend)}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div className="h-full bg-amber-500/70" style={{ width: `${Math.max(4, Math.round((r.spend / maxRenterSpend) * 100))}%` }} />
                          </div>
                          <p className="text-[10px] text-muted-foreground">{r.rentals} rental{r.rentals === 1 ? "" : "s"} · avg {formatMoney(Math.round(r.spend / r.rentals))}/rental</p>
                        </li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-xl border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <BarChart3 className="h-4 w-4 text-primary" /> Revenue by day of week
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const maxDow = Math.max(1, ...stats.dowRevenue);
                    const totalDow = stats.dowRevenue.reduce((a, b) => a + b, 0);
                    if (totalDow === 0) {
                      return <p className="text-xs text-muted-foreground">No returned rentals in this period.</p>;
                    }
                    return (
                      <ul className="space-y-1">
                        {stats.dowRevenue.map((rev, i) => {
                          const pct = Math.round((rev / maxDow) * 100);
                          const isWeekend = i === 0 || i === 6;
                          return (
                            <li key={i} className="grid grid-cols-[36px_1fr_auto] gap-2 items-center text-xs">
                              <span className={cn(
                                "font-bold uppercase tracking-wider text-[10px]",
                                isWeekend ? "text-primary" : "text-muted-foreground"
                              )}>{DOW_LABELS[i]}</span>
                              <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <div className={cn(
                                  "h-full",
                                  isWeekend ? "bg-primary/80" : "bg-primary/50"
                                )} style={{ width: `${Math.max(2, pct)}%` }} />
                              </div>
                              <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                                {rev > 0 ? formatMoney(rev) : "—"}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    );
                  })()}
                </CardContent>
              </Card>

              <Card className="rounded-xl border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-primary" /> Booking patterns
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    <MiniMetric
                      label="Avg lead time"
                      value={stats.avgLeadDays > 0
                        ? (stats.avgLeadDays < 1
                          ? `${Math.round(stats.avgLeadDays * 24)}h`
                          : `${stats.avgLeadDays.toFixed(1)}d`)
                        : "—"}
                    />
                    <MiniMetric
                      label="Avg rental length"
                      value={stats.avgLength > 0 ? `${stats.avgLength.toFixed(1)}d` : "—"}
                    />
                  </div>
                  {stats.avgLeadDays > 0 && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {stats.avgLeadDays < 1 ? "Most bookings are same-day or last-minute." :
                       stats.avgLeadDays < 3 ? "Customers tend to book a couple days ahead." :
                       stats.avgLeadDays < 14 ? "Customers plan about a week or two ahead." :
                       "Customers plan well ahead — consider early-bird pricing."}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-xl border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <UserCheck className="h-4 w-4 text-amber-600" /> Reactivation candidates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reactivation.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No inactive customers — every prior renter has booked within the last 60 days.
                    </p>
                  ) : (
                    <>
                      <p className="mb-2 text-[11px] text-muted-foreground">
                        Customers who haven't booked in 60+ days. Consider a win-back offer.
                      </p>
                      <ul className="space-y-1.5">
                        {reactivation.map((c) => (
                          <li key={c.id} className="flex items-baseline justify-between gap-2 text-xs rounded-lg border border-border bg-card px-2.5 py-1.5">
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold text-foreground">{c.display_name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {c.total_rentals} prior rental{c.total_rentals === 1 ? "" : "s"}
                                {c.last_rental_at && ` · last seen ${new Date(c.last_rental_at).toLocaleDateString()}`}
                              </p>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 shrink-0">
                              {c.daysSince}d ago
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
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
