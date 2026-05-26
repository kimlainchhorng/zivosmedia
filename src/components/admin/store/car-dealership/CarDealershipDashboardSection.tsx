/**
 * CarDealershipDashboardSection v2 — charts, activity feed, KPIs.
 */
import { memo, useMemo } from "react";
import {
  LayoutDashboard, Car, Calendar, DollarSign,
  ArrowRight, Loader2, ClipboardList, TrendingUp, AlertCircle,
  Users, Flame, Activity, ExternalLink,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDealershipInventory } from "@/hooks/car-dealership/useDealershipInventory";
import { useDealershipLeads } from "@/hooks/car-dealership/useDealershipLeads";
import { useDealershipSales } from "@/hooks/car-dealership/useDealershipSales";
import { useDealershipTestDrives } from "@/hooks/car-dealership/useDealershipTestDrives";

interface Props {
  storeId: string;
  storeSlug?: string | null;
  onJumpToTab?: (tab: string) => void;
}

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

const formatPriceShort = (cents: number) => {
  if (cents >= 100_000_00) return `$${(cents / 100_000_00).toFixed(1)}M`;
  if (cents >= 1_000_00) return `$${(cents / 1_000_00).toFixed(0)}K`;
  return formatPrice(cents);
};

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const LEAD_STATUS_COLORS: Record<string, string> = {
  new: "#3b82f6",
  contacted: "#6366f1",
  qualified: "#f59e0b",
  test_drive_scheduled: "#8b5cf6",
  negotiating: "#f97316",
  won: "#10b981",
  lost: "#6b7280",
};

const INVENTORY_STATUS_COLORS = ["#3b82f6","#f59e0b","#8b5cf6","#10b981","#ef4444","#6b7280"];
const INVENTORY_STATUS_LABELS: Record<string, string> = {
  available: "Available",
  reserved: "Reserved",
  pending_sale: "Pending Sale",
  sold: "Sold",
  in_transit: "In Transit",
  service: "Service",
};

function StatTile({ label, value, icon: Icon, accent, hint, tab, onJump }: {
  label: string; value: string | number; icon: any; accent: string;
  hint?: string; tab: string; onJump?: (tab: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onJump?.(tab)}
      className="group rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/30 hover:shadow-md"
    >
      <div className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg", accent)}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground/70">{hint}</p>}
    </button>
  );
}

function DealershipDashboardInner({ storeId, storeSlug, onJumpToTab }: Props) {
  const { vehicles, loading: vLoading } = useDealershipInventory(storeId);
  const { leads, loading: lLoading } = useDealershipLeads(storeId);
  const { sales, loading: sLoading } = useDealershipSales(storeId);
  const { drives } = useDealershipTestDrives(storeId);

  const stats = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);
    const startOfMonth = new Date(now); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

    // ── inventory ───────────────────────────────────────────────────────────
    const available = vehicles.filter((v) => v.status === "available" && v.is_active).length;
    const pendingSale = vehicles.filter((v) => ["pending_sale","reserved"].includes(v.status)).length;
    const totalInventoryValueCents = vehicles
      .filter((v) => v.is_active && v.status !== "sold")
      .reduce((sum, v) => sum + v.asking_price_cents, 0);

    // inventory status breakdown for pie
    const statusMap = new Map<string, number>();
    vehicles.filter((v) => v.is_active).forEach((v) => {
      statusMap.set(v.status, (statusMap.get(v.status) ?? 0) + 1);
    });
    const inventoryPie = Array.from(statusMap.entries()).map(([name, value]) => ({
      name: INVENTORY_STATUS_LABELS[name] ?? name, value,
    }));

    // ── leads ──────────────────────────────────────────────────────────────
    const newLeads = leads.filter((l) => l.status === "new").length;
    const activeLeads = leads.filter((l) => !["won","lost"].includes(l.status)).length;
    const followupOverdue = leads.filter((l) => {
      if (!l.next_followup_at || ["won","lost"].includes(l.status)) return false;
      return new Date(l.next_followup_at).getTime() < Date.now();
    }).length;
    // lead pipeline bar data
    const leadCounts: Record<string, number> = {
      new: 0, contacted: 0, qualified: 0, test_drive_scheduled: 0, negotiating: 0, won: 0, lost: 0,
    };
    leads.forEach((l) => { if (l.status in leadCounts) leadCounts[l.status]++; });
    const leadFunnel = Object.entries(leadCounts).map(([status, count]) => ({
      status: status.replace(/_/g, " "),
      count,
      fill: LEAD_STATUS_COLORS[status] ?? "#6b7280",
    }));

    // ── test drives ────────────────────────────────────────────────────────
    const todaysDrives = drives.filter((d) => {
      const t = new Date(d.scheduled_at).getTime();
      return t >= startOfDay.getTime() && t <= endOfDay.getTime()
        && ["scheduled","confirmed","in_progress"].includes(d.status);
    });

    // ── sales ──────────────────────────────────────────────────────────────
    const pendingDeals = sales.filter((s) => ["pending","deposit_paid","financing"].includes(s.status));
    const monthSold = sales.filter((s) => {
      if (!["completed","delivered"].includes(s.status)) return false;
      const ts = s.sold_at ? new Date(s.sold_at) : new Date(s.created_at);
      return ts.getTime() >= startOfMonth.getTime();
    });
    const monthRevenueCents = monthSold.reduce((sum, s) => sum + s.total_cents, 0);

    // 6-month revenue chart
    const revByMonth: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now); d.setMonth(d.getMonth() - i);
      revByMonth[`${d.getFullYear()}-${d.getMonth()}`] = 0;
    }
    sales.filter((s) => ["completed","delivered"].includes(s.status)).forEach((s) => {
      const d = s.sold_at ? new Date(s.sold_at) : new Date(s.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (key in revByMonth) revByMonth[key] += s.total_cents;
    });
    const revenueChart = Object.entries(revByMonth).map(([key, cents]) => {
      const [y, m] = key.split("-").map(Number);
      return { month: MONTH_LABELS[m], revenue: Math.round(cents / 100) };
    });

    // recent activity feed (last 6 sales + last 5 leads by created_at)
    const recentSales = [...sales]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 4);
    const recentLeads = [...leads]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 4);

    const hotUnits = vehicles
      .filter((v) => v.is_active && v.status === "available" && v.days_on_lot <= 7).slice(0, 5);
    const stale = vehicles
      .filter((v) => v.is_active && v.status === "available" && v.days_on_lot >= 60).slice(0, 5);

    return {
      available, pendingSale, totalInventoryValueCents, inventoryPie,
      newLeads, activeLeads, followupOverdue, leadFunnel,
      todaysDrives, pendingDeals,
      monthSoldCount: monthSold.length, monthRevenueCents,
      revenueChart, recentSales, recentLeads,
      hotUnits, stale,
    };
  }, [vehicles, leads, sales, drives]);

  if (vLoading || lLoading || sLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <LayoutDashboard className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold">Dealership Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        {storeSlug && (
          <a
            href={`/car-dealership/${storeSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background hover:bg-muted px-3 py-1.5 text-xs font-medium transition-colors"
            title="Open your public storefront in a new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View public listing
          </a>
        )}
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Available units" value={stats.available} icon={Car} accent="bg-blue-500/10 text-blue-600" tab="cd-inventory" onJump={onJumpToTab} hint={`${stats.pendingSale} pending sale`} />
        <StatTile label="New leads" value={stats.newLeads} icon={ClipboardList} accent="bg-emerald-500/10 text-emerald-600" tab="cd-leads" onJump={onJumpToTab} hint={`${stats.activeLeads} active`} />
        <StatTile label="Test drives today" value={stats.todaysDrives.length} icon={Calendar} accent="bg-amber-500/10 text-amber-600" tab="cd-test-drives" onJump={onJumpToTab} />
        <StatTile label="Pending deals" value={stats.pendingDeals.length} icon={DollarSign} accent="bg-purple-500/10 text-purple-600" tab="cd-sales" onJump={onJumpToTab} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Revenue area chart — spans 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold">Revenue — last 6 months</CardTitle>
            <span className="text-xs text-muted-foreground">
              MTD: {formatPrice(stats.monthRevenueCents)} · {stats.monthSoldCount} units
            </span>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={stats.revenueChart} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="cd-rev-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={(v) => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v}`}
                  tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={52}
                />
                <Tooltip
                  formatter={(v: number) => [formatPrice(v * 100), "Revenue"]}
                  labelStyle={{ fontSize: 12 }}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Area
                  type="monotone" dataKey="revenue"
                  stroke="hsl(var(--primary))" strokeWidth={2}
                  fill="url(#cd-rev-grad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Inventory status donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Inventory status</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.inventoryPie.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">No inventory yet.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie
                      data={stats.inventoryPie}
                      cx="50%" cy="50%"
                      innerRadius={38} outerRadius={58}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {stats.inventoryPie.map((_, i) => (
                        <Cell key={i} fill={INVENTORY_STATUS_COLORS[i % INVENTORY_STATUS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-1 space-y-0.5">
                  {stats.inventoryPie.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: INVENTORY_STATUS_COLORS[i % INVENTORY_STATUS_COLORS.length] }} />
                        {d.name}
                      </span>
                      <span className="font-medium">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lead funnel bar chart */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold">Lead pipeline</CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onJumpToTab?.("cd-leads")}>
            Manage <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={stats.leadFunnel} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 68 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis
                type="category" dataKey="status"
                tick={{ fontSize: 11, textTransform: "capitalize" }}
                tickLine={false} axisLine={false} width={68}
              />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={16}>
                {stats.leadFunnel.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {stats.followupOverdue > 0 && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span><strong>{stats.followupOverdue}</strong> leads overdue for follow-up</span>
              <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs text-red-700 hover:bg-red-500/10 px-2" onClick={() => onJumpToTab?.("cd-leads")}>
                Review
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Today's test drives */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
              <Calendar className="h-4 w-4 text-amber-600" /> Today's drives
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7" onClick={() => onJumpToTab?.("cd-test-drives")}>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {stats.todaysDrives.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">None today.</p>
            ) : (
              <div className="space-y-2">
                {stats.todaysDrives.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border bg-muted/30 px-2.5 py-1.5 text-xs">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{d.customer_name}</p>
                      <p className="truncate text-muted-foreground">{d.vehicle_label}</p>
                    </div>
                    <p className="ml-2 shrink-0 font-semibold">
                      {new Date(d.scheduled_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hot / stale inventory */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
              <Flame className="h-4 w-4 text-rose-500" /> Hot units (≤7 days)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {stats.hotUnits.length === 0 ? (
              <p className="text-xs text-muted-foreground">No fresh additions.</p>
            ) : stats.hotUnits.map((v) => (
              <div key={v.id} className="flex items-center justify-between text-xs">
                <span className="truncate">{v.year} {v.make} {v.model}</span>
                <Badge variant="secondary" className="text-[10px] shrink-0 ml-1">{v.days_on_lot}d</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
              <AlertCircle className="h-4 w-4 text-amber-600" /> Aging (≥60 days)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {stats.stale.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing stale. Great!</p>
            ) : stats.stale.map((v) => (
              <div key={v.id} className="flex items-center justify-between text-xs">
                <span className="truncate">{v.year} {v.make} {v.model}</span>
                <span className="text-xs font-bold text-amber-700 shrink-0 ml-1">{v.days_on_lot}d</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Activity feed */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
            <Activity className="h-4 w-4 text-primary" /> Recent activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5">
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Latest deals</p>
              {stats.recentSales.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No deals yet.</p>
              ) : stats.recentSales.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-1 border-b last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{s.customer_name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{s.vehicle_label}</p>
                  </div>
                  <div className="ml-2 text-right shrink-0">
                    <p className="text-xs font-bold">{formatPriceShort(s.total_cents)}</p>
                    <Badge variant="secondary" className="text-[9px] h-3.5 px-1">{s.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Latest leads</p>
              {stats.recentLeads.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No leads yet.</p>
              ) : stats.recentLeads.map((l) => (
                <div key={l.id} className="flex items-center justify-between py-1 border-b last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{l.display_name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{l.vehicle_label || l.source}</p>
                  </div>
                  <Badge
                    className="ml-2 text-[9px] h-3.5 px-1 border-0 shrink-0"
                    style={{ background: LEAD_STATUS_COLORS[l.status] + "22", color: LEAD_STATUS_COLORS[l.status] }}
                  >
                    {l.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const CarDealershipDashboardSection = memo(DealershipDashboardInner);
export default CarDealershipDashboardSection;
