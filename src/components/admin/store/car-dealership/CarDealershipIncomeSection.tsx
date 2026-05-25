/**
 * Dealership income / revenue dashboard — reads sales + expenses.
 */
import { memo, useMemo } from "react";
import { DollarSign, TrendingUp, Receipt, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useDealershipSales } from "@/hooks/car-dealership/useDealershipSales";
import { useDealershipExpenses } from "@/hooks/car-dealership/useDealershipExpenses";
import { useDealershipInventory } from "@/hooks/car-dealership/useDealershipInventory";

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

interface Props { storeId: string; }

function CarDealershipIncomeSectionInner({ storeId }: Props) {
  const { sales, loading: sLoading } = useDealershipSales(storeId);
  const { expenses, loading: eLoading } = useDealershipExpenses(storeId);
  const { vehicles } = useDealershipInventory(storeId);

  const stats = useMemo(() => {
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const startOfYear = new Date(); startOfYear.setMonth(0, 1); startOfYear.setHours(0, 0, 0, 0);

    const closed = sales.filter((s) => ["completed", "delivered"].includes(s.status));
    const totalRevenue = closed.reduce((sum, s) => sum + s.total_cents, 0);

    const monthRevenue = closed
      .filter((s) => s.sold_at && new Date(s.sold_at).getTime() >= startOfMonth.getTime())
      .reduce((sum, s) => sum + s.total_cents, 0);
    const ytdRevenue = closed
      .filter((s) => s.sold_at && new Date(s.sold_at).getTime() >= startOfYear.getTime())
      .reduce((sum, s) => sum + s.total_cents, 0);

    const monthExpenses = expenses
      .filter((e) => new Date(e.paid_at).getTime() >= startOfMonth.getTime())
      .reduce((sum, e) => sum + e.amount_cents, 0);

    const monthProfit = monthRevenue - monthExpenses;

    // Front-end gross = sale_price - cost (from vehicle if known)
    const vehicleCostMap = new Map(vehicles.map((v) => [v.id, v.cost_cents]));
    let totalFrontEnd = 0;
    for (const s of closed) {
      if (!s.vehicle_id) continue;
      const cost = vehicleCostMap.get(s.vehicle_id) ?? 0;
      totalFrontEnd += s.sale_price_cents - cost;
    }

    // Back-end = fees + warranty + GAP - rebates
    let totalBackEnd = 0;
    for (const s of closed) {
      totalBackEnd += s.doc_fee_cents + s.registration_fee_cents + s.title_fee_cents
        + s.other_fees_cents + s.warranty_cents + s.gap_insurance_cents - s.rebate_cents;
    }

    return {
      totalRevenue,
      monthRevenue,
      ytdRevenue,
      monthExpenses,
      monthProfit,
      closedCount: closed.length,
      avgDeal: closed.length > 0 ? Math.round(totalRevenue / closed.length) : 0,
      frontEnd: totalFrontEnd,
      backEnd: totalBackEnd,
    };
  }, [sales, expenses, vehicles]);

  if (sLoading || eLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const tiles: Array<{ label: string; value: string; icon: typeof DollarSign; accent: string; }> = [
    { label: "This month", value: formatPrice(stats.monthRevenue), icon: DollarSign, accent: "bg-emerald-500/10 text-emerald-600" },
    { label: "Year to date", value: formatPrice(stats.ytdRevenue), icon: TrendingUp, accent: "bg-blue-500/10 text-blue-600" },
    { label: "All time", value: formatPrice(stats.totalRevenue), icon: DollarSign, accent: "bg-violet-500/10 text-violet-600" },
    { label: "Units sold", value: String(stats.closedCount), icon: Receipt, accent: "bg-amber-500/10 text-amber-600" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Income & Revenue</h2>
        <p className="text-sm text-muted-foreground">Sales revenue and per-deal economics.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${t.accent}`}>
              <t.icon className="h-4 w-4" />
            </div>
            <p className="mt-3 text-2xl font-bold">{t.value}</p>
            <p className="text-xs text-muted-foreground">{t.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Average deal</p>
          <p className="mt-2 text-3xl font-bold">{formatPrice(stats.avgDeal)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Front-end gross</p>
          <p className="mt-2 text-3xl font-bold">{formatPrice(stats.frontEnd)}</p>
          <p className="text-xs text-muted-foreground mt-1">Sale price minus cost</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Back-end gross</p>
          <p className="mt-2 text-3xl font-bold">{formatPrice(stats.backEnd)}</p>
          <p className="text-xs text-muted-foreground mt-1">Fees + warranty + GAP − rebates</p>
        </Card>
      </div>

      <Card className="p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">This month — P&amp;L</p>
        <div className="mt-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Revenue</span>
            <span className="font-medium">{formatPrice(stats.monthRevenue)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Expenses</span>
            <span className="font-medium text-red-700">−{formatPrice(stats.monthExpenses)}</span>
          </div>
          <div className="flex justify-between text-base font-bold pt-1.5 border-t">
            <span>Net</span>
            <span className={stats.monthProfit >= 0 ? "text-emerald-700" : "text-red-700"}>
              {formatPrice(stats.monthProfit)}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

const CarDealershipIncomeSection = memo(CarDealershipIncomeSectionInner);
export default CarDealershipIncomeSection;
