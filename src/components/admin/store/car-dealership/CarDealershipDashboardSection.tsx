/**
 * CarDealershipDashboardSection — at-a-glance landing page.
 */
import { useMemo } from "react";
import {
  LayoutDashboard, Car, Users, Calendar, DollarSign,
  ArrowRight, Loader2, ClipboardList, TrendingUp, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDealershipInventory } from "@/hooks/car-dealership/useDealershipInventory";
import { useDealershipLeads } from "@/hooks/car-dealership/useDealershipLeads";
import { useDealershipSales } from "@/hooks/car-dealership/useDealershipSales";
import { useDealershipTestDrives } from "@/hooks/car-dealership/useDealershipTestDrives";

interface Props {
  storeId: string;
  onJumpToTab?: (tab: string) => void;
}

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    .format(cents / 100);

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export default function CarDealershipDashboardSection({ storeId, onJumpToTab }: Props) {
  const { vehicles, loading: vLoading } = useDealershipInventory(storeId);
  const { leads, loading: lLoading } = useDealershipLeads(storeId);
  const { sales, loading: sLoading } = useDealershipSales(storeId);
  const { drives } = useDealershipTestDrives(storeId);

  const stats = useMemo(() => {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

    const available = vehicles.filter((v) => v.status === "available" && v.is_active).length;
    const pendingSale = vehicles.filter((v) => v.status === "pending_sale" || v.status === "reserved").length;
    const sold = vehicles.filter((v) => v.status === "sold").length;
    const totalInventoryValueCents = vehicles
      .filter((v) => v.is_active && v.status !== "sold")
      .reduce((sum, v) => sum + v.asking_price_cents, 0);

    const newLeads = leads.filter((l) => l.status === "new").length;
    const activeLeads = leads.filter((l) => !["won", "lost"].includes(l.status)).length;
    const followupOverdue = leads.filter((l) => {
      if (!l.next_followup_at || ["won", "lost"].includes(l.status)) return false;
      return new Date(l.next_followup_at).getTime() < Date.now();
    }).length;

    const todaysDrives = drives.filter((d) => {
      const t = new Date(d.scheduled_at).getTime();
      return t >= startOfDay.getTime() && t <= endOfDay.getTime()
        && ["scheduled", "confirmed", "in_progress"].includes(d.status);
    });

    const pendingDeals = sales.filter((s) => ["pending", "deposit_paid", "financing"].includes(s.status));
    const monthSold = sales.filter((s) => {
      if (!s.sold_at) return false;
      return new Date(s.sold_at).getTime() >= startOfMonth.getTime()
        && ["completed", "delivered"].includes(s.status);
    });
    const monthRevenueCents = monthSold.reduce((sum, s) => sum + s.total_cents, 0);

    const hotUnits = vehicles
      .filter((v) => v.is_active && v.status === "available" && v.days_on_lot <= 7)
      .slice(0, 5);
    const stale = vehicles
      .filter((v) => v.is_active && v.status === "available" && v.days_on_lot >= 60)
      .slice(0, 5);

    return {
      available, pendingSale, sold, totalInventoryValueCents,
      newLeads, activeLeads, followupOverdue,
      todaysDrives, pendingDeals, monthSoldCount: monthSold.length, monthRevenueCents,
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

  const tiles: Array<{
    label: string; value: string | number; icon: typeof Car;
    accent: string; tab: string; hint?: string;
  }> = [
    { label: "Inventory available", value: stats.available, icon: Car, accent: "bg-blue-500/10 text-blue-600", tab: "cd-inventory" },
    { label: "New leads", value: stats.newLeads, icon: ClipboardList, accent: "bg-emerald-500/10 text-emerald-600", tab: "cd-leads", hint: `${stats.activeLeads} active` },
    { label: "Test drives today", value: stats.todaysDrives.length, icon: Calendar, accent: "bg-amber-500/10 text-amber-600", tab: "cd-test-drives" },
    { label: "Pending deals", value: stats.pendingDeals.length, icon: DollarSign, accent: "bg-purple-500/10 text-purple-600", tab: "cd-sales" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <LayoutDashboard className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Dealership Dashboard</h2>
          <p className="text-sm text-muted-foreground">Today at a glance</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => onJumpToTab?.(t.tab)}
            className="group rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/30 hover:shadow-md"
          >
            <div className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg", t.accent)}>
              <t.icon className="h-4 w-4" />
            </div>
            <p className="mt-3 text-2xl font-bold">{t.value}</p>
            <p className="text-xs text-muted-foreground">{t.label}</p>
            {t.hint && <p className="mt-0.5 text-[10px] text-muted-foreground/70">{t.hint}</p>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Today's test drives</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onJumpToTab?.("cd-test-drives")}>
              All <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {stats.todaysDrives.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No test drives scheduled today.</p>
            ) : (
              <div className="space-y-2">
                {stats.todaysDrives.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{d.customer_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{d.vehicle_label}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-semibold">{formatTime(d.scheduled_at)}</p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{d.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Month-to-date</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Units sold</span>
              <span className="text-lg font-bold">{stats.monthSoldCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Revenue</span>
              <span className="text-lg font-bold">{formatPrice(stats.monthRevenueCents)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Inventory value</span>
              <span className="text-lg font-bold">{formatPrice(stats.totalInventoryValueCents)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-emerald-600" /> Hot units (≤7d)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {stats.hotUnits.length === 0 ? (
              <p className="text-xs text-muted-foreground">No recent additions.</p>
            ) : stats.hotUnits.map((v) => (
              <div key={v.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{v.year} {v.make} {v.model}</span>
                <span className="text-xs font-medium">{formatPrice(v.asking_price_cents)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-amber-600" /> Aging (≥60d)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {stats.stale.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing stale.</p>
            ) : stats.stale.map((v) => (
              <div key={v.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{v.year} {v.make} {v.model}</span>
                <span className="text-xs font-medium text-amber-700">{v.days_on_lot}d</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" /> Follow-ups
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onJumpToTab?.("cd-leads")}>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.followupOverdue}</p>
            <p className="text-xs text-muted-foreground">leads overdue for follow-up</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
