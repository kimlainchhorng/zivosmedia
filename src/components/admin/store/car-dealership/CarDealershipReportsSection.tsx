/**
 * Dealership reports — inventory turn, lead conversion, top makes/models,
 * monthly deal volume + revenue charts.
 */
import { memo, useMemo } from "react";
import {
  BarChart3, Car, Clock, TrendingUp, Loader2, AlertCircle, Download,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useDealershipSales } from "@/hooks/car-dealership/useDealershipSales";
import { useDealershipInventory } from "@/hooks/car-dealership/useDealershipInventory";
import { useDealershipLeads } from "@/hooks/car-dealership/useDealershipLeads";
import { exportInventoryCsv } from "@/lib/car-dealership/inventoryCsvExport";

// ─── formatting ──────────────────────────────────────────────────────────────

const fmtPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);

const fmtPriceShort = (cents: number) => {
  if (cents >= 1_000_000_00) return `$${(cents / 1_000_000_00).toFixed(1)}M`;
  if (cents >= 1_000_00) return `$${(cents / 1_000_00).toFixed(0)}K`;
  return fmtPrice(cents);
};

// ─── colour palette ───────────────────────────────────────────────────────────

const PIE_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899",
];

const AGING_COLORS = {
  ok: "#10b981",     // < 30d
  warn: "#f59e0b",   // 30–60d
  alert: "#ef4444",  // 60+ d
};

// ─── helpers ─────────────────────────────────────────────────────────────────

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Last N calendar months starting from the oldest, each keyed YYYY-M. */
function last6Months() {
  const result: Array<{ key: string; label: string }> = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_ABBR[d.getMonth()] });
  }
  return result;
}

// ─── component ───────────────────────────────────────────────────────────────

interface Props { storeId: string; }

function CarDealershipReportsSectionInner({ storeId }: Props) {
  const { sales, loading: sLoading } = useDealershipSales(storeId);
  const { vehicles, loading: vLoading } = useDealershipInventory(storeId);
  const { leads, loading: lLoading } = useDealershipLeads(storeId);

  const stats = useMemo(() => {
    const closed = sales.filter((s) => ["completed", "delivered"].includes(s.status));
    const active = vehicles.filter((v) => v.is_active && v.status !== "retired");
    const available = active.filter((v) => v.status === "available");

    // ── monthly deal volume + revenue (last 6 months) ────────────────────────
    const months = last6Months();
    const monthlyMap = new Map(
      months.map(({ key, label }) => [key, { label, deals: 0, revenue: 0 }]),
    );
    for (const s of closed) {
      const d = s.sold_at ? new Date(s.sold_at) : new Date(s.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = monthlyMap.get(key);
      if (bucket) { bucket.deals++; bucket.revenue += s.total_cents; }
    }
    const monthlyData = months.map(({ key }) => monthlyMap.get(key)!);

    // ── top makes by revenue ─────────────────────────────────────────────────
    const makeMap = new Map<string, { count: number; revenue: number }>();
    for (const s of closed) {
      const parts = s.vehicle_label.split(" ").filter(Boolean);
      // label format: "YEAR MAKE MODEL TRIM" — make is index 1
      const make = parts[1] ?? s.vehicle_label;
      const cur = makeMap.get(make) ?? { count: 0, revenue: 0 };
      cur.count++;
      cur.revenue += s.total_cents;
      makeMap.set(make, cur);
    }
    const topMakes = Array.from(makeMap.entries())
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 6)
      .map(([make, info]) => ({ make, ...info }));

    // ── lead sources ─────────────────────────────────────────────────────────
    const sourceMap = new Map<string, number>();
    for (const l of leads) {
      const src = l.source.replace(/_/g, " ");
      sourceMap.set(src, (sourceMap.get(src) ?? 0) + 1);
    }
    const leadSources = Array.from(sourceMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 7)
      .map(([name, value]) => ({ name, value }));

    // ── lead conversion funnel ───────────────────────────────────────────────
    const totalLeads = leads.length;
    const wonLeads = leads.filter((l) => l.status === "won").length;
    const lostLeads = leads.filter((l) => l.status === "lost").length;
    const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

    // ── inventory aging ──────────────────────────────────────────────────────
    const avgAge = available.length > 0
      ? Math.round(available.reduce((sum, v) => sum + v.days_on_lot, 0) / available.length)
      : 0;
    const agingBuckets = [
      { label: "< 30d",  count: available.filter((v) => v.days_on_lot < 30).length, color: AGING_COLORS.ok },
      { label: "30–60d", count: available.filter((v) => v.days_on_lot >= 30 && v.days_on_lot < 60).length, color: AGING_COLORS.warn },
      { label: "60–90d", count: available.filter((v) => v.days_on_lot >= 60 && v.days_on_lot < 90).length, color: AGING_COLORS.alert },
      { label: "90d+",   count: available.filter((v) => v.days_on_lot >= 90).length, color: AGING_COLORS.alert },
    ];

    // ── inventory turn (90d) ─────────────────────────────────────────────────
    const ninety = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const recentClosed = closed.filter((s) => s.sold_at && new Date(s.sold_at).getTime() >= ninety).length;
    const turnRate = available.length > 0 ? (recentClosed / available.length).toFixed(2) : "0.00";

    // ── salesperson leaderboard ───────────────────────────────────────────────
    const vehicleCostMap = new Map(vehicles.map((v) => [v.id, v.cost_cents]));
    const spMap = new Map<string, { units: number; revenue: number; frontGross: number; frontGrossCount: number }>();
    for (const s of closed) {
      const name = s.salesperson_name?.trim() || "Unassigned";
      const cur = spMap.get(name) ?? { units: 0, revenue: 0, frontGross: 0, frontGrossCount: 0 };
      cur.units++;
      cur.revenue += s.total_cents;
      if (s.vehicle_id) {
        const cost = vehicleCostMap.get(s.vehicle_id) ?? 0;
        if (cost > 0) { cur.frontGross += s.sale_price_cents - cost; cur.frontGrossCount++; }
      }
      spMap.set(name, cur);
    }
    const salespersonRows = Array.from(spMap.entries())
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .map(([name, d]) => ({
        name,
        units: d.units,
        revenue: d.revenue,
        avgDeal: Math.round(d.revenue / d.units),
        frontGross: d.frontGrossCount > 0 ? d.frontGross : null,
      }));

    return {
      monthlyData, topMakes, leadSources, agingBuckets,
      totalLeads, wonLeads, lostLeads, conversionRate,
      avgAge, availableCount: available.length, closedCount: closed.length, turnRate,
      salespersonRows,
    };
  }, [sales, vehicles, leads]);

  const loading = sLoading || vLoading || lLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Reports & Analytics</h2>
          <p className="text-sm text-muted-foreground">Inventory health, lead conversion, sales performance.</p>
        </div>
        {vehicles.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => exportInventoryCsv(vehicles)}>
            <Download className="h-4 w-4 mr-1.5" />Export inventory CSV
          </Button>
        )}
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Car, label: "Available units", value: stats.availableCount, accent: "bg-blue-500/10 text-blue-600" },
          { icon: Clock, label: "Avg days on lot", value: `${stats.avgAge}d`, accent: "bg-amber-500/10 text-amber-600" },
          { icon: TrendingUp, label: "Inventory turn (90d)", value: `${stats.turnRate}×`, accent: "bg-emerald-500/10 text-emerald-600" },
          { icon: BarChart3, label: "Lead conversion", value: `${stats.conversionRate}%`, accent: "bg-violet-500/10 text-violet-600" },
        ].map(({ icon: Icon, label, value, accent }) => (
          <Card key={label} className="p-4">
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="mt-3 text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </Card>
        ))}
      </div>

      {/* ── monthly revenue + volume ── */}
      <Card className="p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-4">
          Monthly closed deals — last 6 months
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={stats.monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis
              yAxisId="rev"
              orientation="right"
              tick={{ fontSize: 10 }}
              tickFormatter={(v: number) => fmtPriceShort(v)}
              width={54}
            />
            <YAxis yAxisId="deals" orientation="left" tick={{ fontSize: 10 }} width={28} />
            <Tooltip
              formatter={(value: number, name: string) =>
                name === "Revenue" ? fmtPrice(value) : value
              }
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="deals" dataKey="deals" name="Units sold" fill="hsl(var(--primary))" radius={[3,3,0,0]} opacity={0.7} />
            <Area
              yAxisId="rev"
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="hsl(var(--primary))"
              fill="url(#revGrad)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* ── top makes + lead sources ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top makes by revenue */}
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-4">Top makes by revenue</p>
          {stats.topMakes.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No closed deals yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={stats.topMakes}
                layout="vertical"
                margin={{ top: 0, right: 56, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 9 }}
                  tickFormatter={(v: number) => fmtPriceShort(v)}
                />
                <YAxis type="category" dataKey="make" tick={{ fontSize: 10 }} width={64} />
                <Tooltip
                  formatter={(v: number, n: string) =>
                    n === "revenue" ? [fmtPrice(v), "Revenue"] : [v, "Units"]
                  }
                />
                <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[0,3,3,0]}>
                  {stats.topMakes.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Lead sources */}
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-4">Lead sources</p>
          {stats.leadSources.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No leads yet.</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={stats.leadSources}
                    innerRadius={36}
                    outerRadius={58}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {stats.leadSources.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, "leads"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 min-w-0">
                {stats.leadSources.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="truncate capitalize text-xs">{s.name}</span>
                    </div>
                    <span className="text-xs font-medium shrink-0">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── inventory aging + pipeline funnel ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Inventory aging */}
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-4">
            Inventory aging — {stats.availableCount} available units
          </p>
          {stats.availableCount === 0 ? (
            <p className="text-sm text-muted-foreground italic">No available inventory.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart
                  data={stats.agingBuckets}
                  margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={24} />
                  <Tooltip formatter={(v: number) => [v, "vehicles"]} />
                  <Bar dataKey="count" name="Vehicles" radius={[3,3,0,0]}>
                    {stats.agingBuckets.map((b, i) => (
                      <Cell key={i} fill={b.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span>Avg age: <strong className="text-foreground">{stats.avgAge}d</strong></span>
                {stats.agingBuckets[3].count > 0 && (
                  <span className="flex items-center gap-1 text-red-600 font-medium">
                    <AlertCircle className="h-3 w-3" />
                    {stats.agingBuckets[3].count} units 90d+
                  </span>
                )}
              </div>
            </>
          )}
        </Card>

        {/* Pipeline funnel */}
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-4">Pipeline funnel</p>
          <div className="space-y-2.5">
            {[
              { label: "Total leads", value: stats.totalLeads, bar: 1, color: "bg-slate-400" },
              { label: "Won", value: stats.wonLeads, bar: stats.totalLeads > 0 ? stats.wonLeads / stats.totalLeads : 0, color: "bg-emerald-500" },
              { label: "Lost", value: stats.lostLeads, bar: stats.totalLeads > 0 ? stats.lostLeads / stats.totalLeads : 0, color: "bg-red-500" },
              { label: "Closed deals", value: stats.closedCount, bar: stats.totalLeads > 0 ? stats.closedCount / stats.totalLeads : 0, color: "bg-blue-500" },
            ].map(({ label, value, bar, color }) => (
              <div key={label} className="space-y-0.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${color} transition-all duration-500`}
                    style={{ width: `${Math.round(bar * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="pt-2 border-t flex justify-between text-sm font-bold">
              <span>Conversion rate</span>
              <span className={stats.conversionRate >= 20 ? "text-emerald-700" : "text-amber-700"}>
                {stats.conversionRate}%
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Salesperson leaderboard ── */}
      {stats.salespersonRows.length > 0 && (
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-4">
            Salesperson leaderboard
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b">
                  <th className="text-left pb-2 font-medium w-6">#</th>
                  <th className="text-left pb-2 font-medium">Name</th>
                  <th className="text-right pb-2 font-medium">Units</th>
                  <th className="text-right pb-2 font-medium">Revenue</th>
                  <th className="text-right pb-2 font-medium">Avg deal</th>
                  <th className="text-right pb-2 font-medium">Front gross</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats.salespersonRows.map((sp, i) => {
                  const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                  // Revenue bar relative to top performer
                  const maxRev = stats.salespersonRows[0]?.revenue ?? 1;
                  const barPct = Math.round((sp.revenue / maxRev) * 100);
                  return (
                    <tr key={sp.name} className="group">
                      <td className="py-2.5 pr-2 text-muted-foreground text-xs">
                        {medal ?? <span className="text-muted-foreground/60">{i + 1}</span>}
                      </td>
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold grid place-items-center shrink-0"
                          >
                            {sp.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{sp.name}</p>
                            {/* Revenue progress bar */}
                            <div className="h-1 rounded-full bg-muted mt-0.5 w-24 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${barPct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 text-right font-medium">{sp.units}</td>
                      <td className="py-2.5 text-right font-medium">{fmtPrice(sp.revenue)}</td>
                      <td className="py-2.5 text-right text-muted-foreground">{fmtPrice(sp.avgDeal)}</td>
                      <td className="py-2.5 text-right">
                        {sp.frontGross != null ? (
                          <span className={sp.frontGross >= 0 ? "text-emerald-700 font-medium" : "text-red-700 font-medium"}>
                            {sp.frontGross >= 0 ? "+" : ""}{fmtPrice(sp.frontGross)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

const CarDealershipReportsSection = memo(CarDealershipReportsSectionInner);
export default CarDealershipReportsSection;
