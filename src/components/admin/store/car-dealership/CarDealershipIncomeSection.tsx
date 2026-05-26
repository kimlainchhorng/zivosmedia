/**
 * Dealership income / revenue dashboard — reads sales + expenses.
 * Includes a 6-month P&L area chart and per-deal economics.
 */
import { memo, useMemo } from "react";
import { DollarSign, TrendingUp, Receipt, Loader2, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { useDealershipSales } from "@/hooks/car-dealership/useDealershipSales";
import { useDealershipExpenses } from "@/hooks/car-dealership/useDealershipExpenses";
import { useDealershipInventory } from "@/hooks/car-dealership/useDealershipInventory";

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmtPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);

const fmtShort = (cents: number) => {
  if (cents >= 1_000_000_00) return `$${(cents / 1_000_000_00).toFixed(1)}M`;
  if (cents >= 1_000_00) return `$${(cents / 1_000_00).toFixed(0)}K`;
  return fmtPrice(cents);
};

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function last6Months() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_ABBR[d.getMonth()] };
  });
}

// ─── component ───────────────────────────────────────────────────────────────

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
      .filter((s) => s.sold_at && new Date(s.sold_at) >= startOfMonth)
      .reduce((sum, s) => sum + s.total_cents, 0);
    const ytdRevenue = closed
      .filter((s) => s.sold_at && new Date(s.sold_at) >= startOfYear)
      .reduce((sum, s) => sum + s.total_cents, 0);

    const monthExpenses = expenses
      .filter((e) => new Date(e.paid_at) >= startOfMonth)
      .reduce((sum, e) => sum + e.amount_cents, 0);
    const ytdExpenses = expenses
      .filter((e) => new Date(e.paid_at) >= startOfYear)
      .reduce((sum, e) => sum + e.amount_cents, 0);

    const monthProfit = monthRevenue - monthExpenses;
    const ytdProfit = ytdRevenue - ytdExpenses;

    // Per-vehicle gross
    const vehicleCostMap = new Map(vehicles.map((v) => [v.id, v.cost_cents]));
    let totalFrontEnd = 0;
    for (const s of closed) {
      if (!s.vehicle_id) continue;
      const cost = vehicleCostMap.get(s.vehicle_id) ?? 0;
      if (cost > 0) totalFrontEnd += s.sale_price_cents - cost;
    }

    let totalBackEnd = 0;
    for (const s of closed) {
      totalBackEnd += s.doc_fee_cents + s.registration_fee_cents + s.title_fee_cents
        + s.other_fees_cents + s.warranty_cents + s.gap_insurance_cents - s.rebate_cents;
    }

    // 6-month P&L chart
    const months = last6Months();
    const monthlyMap = new Map(
      months.map(({ key, label }) => [key, { label, revenue: 0, expenses: 0, profit: 0 }]),
    );

    for (const s of closed) {
      const d = s.sold_at ? new Date(s.sold_at) : new Date(s.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const b = monthlyMap.get(key);
      if (b) b.revenue += s.total_cents;
    }
    for (const e of expenses) {
      const d = new Date(e.paid_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const b = monthlyMap.get(key);
      if (b) b.expenses += e.amount_cents;
    }
    for (const b of monthlyMap.values()) {
      b.profit = b.revenue - b.expenses;
    }
    const monthlyData = months.map(({ key }) => monthlyMap.get(key)!);

    return {
      totalRevenue, monthRevenue, ytdRevenue,
      monthExpenses, ytdExpenses, monthProfit, ytdProfit,
      closedCount: closed.length,
      avgDeal: closed.length > 0 ? Math.round(totalRevenue / closed.length) : 0,
      frontEnd: totalFrontEnd, backEnd: totalBackEnd,
      monthlyData,
    };
  }, [sales, expenses, vehicles]);

  if (sLoading || eLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── header ── */}
      <div>
        <h2 className="text-xl font-bold">Income & Revenue</h2>
        <p className="text-sm text-muted-foreground">Sales revenue, expenses, and per-deal economics.</p>
      </div>

      {/* ── KPI tiles ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "This month revenue", value: fmtPrice(stats.monthRevenue), icon: DollarSign, accent: "bg-emerald-500/10 text-emerald-600" },
          { label: "Year to date", value: fmtPrice(stats.ytdRevenue), icon: TrendingUp, accent: "bg-blue-500/10 text-blue-600" },
          { label: "All time revenue", value: fmtPrice(stats.totalRevenue), icon: DollarSign, accent: "bg-violet-500/10 text-violet-600" },
          { label: "Units sold", value: String(stats.closedCount), icon: Receipt, accent: "bg-amber-500/10 text-amber-600" },
        ].map((t) => (
          <Card key={t.label} className="p-4">
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${t.accent}`}>
              <t.icon className="h-4 w-4" />
            </div>
            <p className="mt-3 text-2xl font-bold">{t.value}</p>
            <p className="text-xs text-muted-foreground">{t.label}</p>
          </Card>
        ))}
      </div>

      {/* ── 6-month P&L chart ── */}
      <Card className="p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-4">
          6-month revenue vs expenses
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={stats.monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revGradIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expGradIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={(v: number) => fmtShort(v)}
              width={56}
            />
            <Tooltip
              formatter={(v: number, name: string) => [fmtPrice(v), name]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="#10b981"
              fill="url(#revGradIncome)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="expenses"
              name="Expenses"
              stroke="#ef4444"
              fill="url(#expGradIncome)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* ── deal economics + monthly P&L ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Per-deal economics */}
        <div className="space-y-3">
          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Average deal size</p>
            <p className="mt-2 text-3xl font-bold">{fmtPrice(stats.avgDeal)}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Front-end gross (cumulative)</p>
            <p className={`mt-2 text-3xl font-bold ${stats.frontEnd >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {fmtPrice(stats.frontEnd)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Sale price minus vehicle acquisition cost</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Back-end gross (cumulative)</p>
            <p className="mt-2 text-3xl font-bold text-blue-700">{fmtPrice(stats.backEnd)}</p>
            <p className="text-xs text-muted-foreground mt-1">Fees + warranty + GAP − rebates</p>
          </Card>
        </div>

        {/* Monthly P&L breakdown */}
        <Card className="p-5 flex flex-col gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
              This month — P&amp;L
            </p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Revenue</span>
                <span className="font-medium">{fmtPrice(stats.monthRevenue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expenses</span>
                <span className="font-medium text-red-700">−{fmtPrice(stats.monthExpenses)}</span>
              </div>
              <div className={`flex justify-between text-base font-bold pt-1.5 border-t ${stats.monthProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                <span className="flex items-center gap-1">
                  {stats.monthProfit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  Net
                </span>
                <span>{fmtPrice(stats.monthProfit)}</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
              Year to date — P&amp;L
            </p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Revenue</span>
                <span className="font-medium">{fmtPrice(stats.ytdRevenue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expenses</span>
                <span className="font-medium text-red-700">−{fmtPrice(stats.ytdExpenses)}</span>
              </div>
              <div className={`flex justify-between text-base font-bold pt-1.5 border-t ${stats.ytdProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                <span className="flex items-center gap-1">
                  {stats.ytdProfit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  Net
                </span>
                <span>{fmtPrice(stats.ytdProfit)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

const CarDealershipIncomeSection = memo(CarDealershipIncomeSectionInner);
export default CarDealershipIncomeSection;
