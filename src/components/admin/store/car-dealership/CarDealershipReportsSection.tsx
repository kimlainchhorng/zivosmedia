/**
 * Dealership reports — inventory turn, lead conversion, top makes/models.
 */
import { memo, useMemo } from "react";
import { BarChart3, Car, Clock, TrendingUp, Loader2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useDealershipSales } from "@/hooks/car-dealership/useDealershipSales";
import { useDealershipInventory } from "@/hooks/car-dealership/useDealershipInventory";
import { useDealershipLeads } from "@/hooks/car-dealership/useDealershipLeads";

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

interface Props { storeId: string; }

function CarDealershipReportsSectionInner({ storeId }: Props) {
  const { sales, loading: sLoading } = useDealershipSales(storeId);
  const { vehicles, loading: vLoading } = useDealershipInventory(storeId);
  const { leads, loading: lLoading } = useDealershipLeads(storeId);

  const stats = useMemo(() => {
    const closed = sales.filter((s) => ["completed", "delivered"].includes(s.status));
    const active = vehicles.filter((v) => v.is_active && v.status !== "retired");
    const available = active.filter((v) => v.status === "available");

    // Top makes/models by sale revenue
    const makeRevenue = new Map<string, { count: number; revenue: number }>();
    for (const s of closed) {
      const parts = s.vehicle_label.split(" ").filter(Boolean);
      const make = parts[1] || s.vehicle_label;
      const cur = makeRevenue.get(make) ?? { count: 0, revenue: 0 };
      cur.count++;
      cur.revenue += s.total_cents;
      makeRevenue.set(make, cur);
    }
    const topMakes = Array.from(makeRevenue.entries())
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 5);

    // Lead conversion
    const totalLeads = leads.length;
    const wonLeads = leads.filter((l) => l.status === "won").length;
    const lostLeads = leads.filter((l) => l.status === "lost").length;
    const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

    // Lead source breakdown
    const sourceCount = new Map<string, number>();
    for (const l of leads) sourceCount.set(l.source, (sourceCount.get(l.source) ?? 0) + 1);
    const topSources = Array.from(sourceCount.entries()).sort(([, a], [, b]) => b - a).slice(0, 5);

    // Inventory aging
    const avgAge = available.length > 0
      ? Math.round(available.reduce((sum, v) => sum + v.days_on_lot, 0) / available.length)
      : 0;
    const aging60 = available.filter((v) => v.days_on_lot >= 60).length;
    const aging90 = available.filter((v) => v.days_on_lot >= 90).length;

    // Inventory turn (rough): closed deals in last 90 days / current available
    const ninety = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const recentClosed = closed.filter((s) => s.sold_at && new Date(s.sold_at).getTime() >= ninety).length;
    const turnRate = available.length > 0 ? (recentClosed / available.length).toFixed(2) : "0.00";

    return {
      topMakes, topSources, totalLeads, wonLeads, lostLeads, conversionRate,
      avgAge, aging60, aging90, turnRate, availableCount: available.length, closedCount: closed.length,
    };
  }, [sales, vehicles, leads]);

  if (sLoading || vLoading || lLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Reports & Analytics</h2>
        <p className="text-sm text-muted-foreground">Inventory health, lead conversion, top performers.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
            <Car className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-bold">{stats.availableCount}</p>
          <p className="text-xs text-muted-foreground">Available units</p>
        </Card>
        <Card className="p-4">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
            <Clock className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-bold">{stats.avgAge}d</p>
          <p className="text-xs text-muted-foreground">Avg days on lot</p>
        </Card>
        <Card className="p-4">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
            <TrendingUp className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-bold">{stats.turnRate}x</p>
          <p className="text-xs text-muted-foreground">Inventory turn (90d)</p>
        </Card>
        <Card className="p-4">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
            <BarChart3 className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-bold">{stats.conversionRate}%</p>
          <p className="text-xs text-muted-foreground">Lead conversion</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Top makes by revenue</p>
          {stats.topMakes.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No closed deals yet.</p>
          ) : (
            <div className="space-y-2">
              {stats.topMakes.map(([make, info]) => (
                <div key={make} className="flex items-center justify-between text-sm">
                  <span>{make} ({info.count})</span>
                  <span className="font-medium">{formatPrice(info.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Lead sources</p>
          {stats.topSources.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No leads yet.</p>
          ) : (
            <div className="space-y-2">
              {stats.topSources.map(([source, count]) => (
                <div key={source} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{source.replace(/_/g, " ")}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Aging report</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Avg days on lot</span>
              <span className="font-medium">{stats.avgAge}d</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-amber-600" /> 60+ days
              </span>
              <span className="font-medium text-amber-700">{stats.aging60}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-red-600" /> 90+ days
              </span>
              <span className="font-medium text-red-700">{stats.aging90}</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Pipeline funnel</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Total leads</span>
              <span className="font-medium">{stats.totalLeads}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Won</span>
              <span className="font-medium text-emerald-700">{stats.wonLeads}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Lost</span>
              <span className="font-medium text-red-700">{stats.lostLeads}</span>
            </div>
            <div className="flex items-center justify-between font-bold pt-1.5 border-t">
              <span>Conversion</span>
              <span>{stats.conversionRate}%</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

const CarDealershipReportsSection = memo(CarDealershipReportsSectionInner);
export default CarDealershipReportsSection;
