import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BarChart3, TrendingUp, DollarSign, ShoppingBag, Package, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays, startOfDay } from "date-fns";

interface DayRevenue { date: string; revenue: number; orders: number; }

interface StatusCount { status: string; count: number; }

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-500",
  confirmed: "text-blue-500",
  picked_up: "text-purple-500",
  delivered: "text-green-500",
  cancelled: "text-red-500",
};

export default function ShopAnalyticsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [revenue7d, setRevenue7d] = useState<DayRevenue[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, totalOrders: 0, avgOrder: 0, topDay: "" });

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data: store } = await supabase.from("store_profiles").select("id").eq("owner_id", user.id).maybeSingle();
    const sid = store?.id ?? null;
    setStoreId(sid);
    if (!sid) { setLoading(false); return; }

    const since = subDays(new Date(), 7).toISOString();
    const { data: orders } = await supabase
      .from("store_orders")
      .select("id, total_cents, status, created_at")
      .eq("store_id", sid)
      .gte("created_at", since);

    if (orders) {
      // Build last-7-days array
      const days: DayRevenue[] = Array.from({ length: 7 }).map((_, i) => {
        const d = subDays(new Date(), 6 - i);
        const dayStr = format(d, "yyyy-MM-dd");
        const dayOrders = orders.filter(o => o.created_at?.startsWith(dayStr));
        return {
          date: format(d, "MMM d"),
          revenue: dayOrders.filter(o => o.status === "delivered").reduce((sum, o) => sum + (o.total_cents ?? 0) / 100, 0),
          orders: dayOrders.length,
        };
      });
      setRevenue7d(days);

      const statusMap: Record<string, number> = {};
      orders.forEach(o => { statusMap[o.status] = (statusMap[o.status] ?? 0) + 1; });
      setStatusCounts(Object.entries(statusMap).map(([status, count]) => ({ status, count })));

      const deliveredOrders = orders.filter(o => o.status === "delivered");
      const totalRev = deliveredOrders.reduce((sum, o) => sum + (o.total_cents ?? 0) / 100, 0);
      const topDay = days.reduce((max, d) => d.revenue > max.revenue ? d : max, days[0]);
      setSummary({
        totalRevenue: totalRev,
        totalOrders: orders.length,
        avgOrder: deliveredOrders.length > 0 ? totalRev / deliveredOrders.length : 0,
        topDay: topDay?.date ?? "—",
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const maxRevenue = Math.max(...revenue7d.map(d => d.revenue), 1);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 safe-area-top z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4">
        <div className="flex items-center gap-2">
          <Button aria-label="Back" variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <BarChart3 className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Analytics</h1>
          <Badge variant="outline" className="text-xs ml-1">Last 7 days</Badge>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: DollarSign, label: "Revenue", value: `$${summary.totalRevenue.toFixed(0)}`, color: "text-green-500 bg-green-500/10" },
              { icon: ShoppingBag, label: "Orders", value: summary.totalOrders.toString(), color: "text-blue-500 bg-blue-500/10" },
              { icon: TrendingUp, label: "Avg Order", value: `$${summary.avgOrder.toFixed(2)}`, color: "text-purple-500 bg-purple-500/10" },
              { icon: Package, label: "Best Day", value: summary.topDay, color: "text-amber-500 bg-amber-500/10" },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="p-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center mb-2 ${stat.color}`}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold text-foreground">{stat.value}</p>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Revenue chart */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Revenue (7 days)
            </h3>
            {revenue7d.every(d => d.revenue === 0) ? (
              <p className="text-xs text-muted-foreground text-center py-4">No delivered orders in the last 7 days</p>
            ) : (
              <div className="flex items-end gap-1 h-32">
                {revenue7d.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-primary/80 rounded-t-sm transition-all"
                      style={{ height: `${Math.max(4, (day.revenue / maxRevenue) * 100)}%` }}
                    />
                    <span className="text-[9px] text-muted-foreground">{day.date.split(" ")[1]}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Orders by day */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Orders by Day</h3>
            <div className="space-y-2">
              {revenue7d.map((day, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground w-14">{day.date}</span>
                  <div className="flex-1 mx-2 bg-muted rounded-full h-1.5">
                    <div className="bg-primary h-1.5 rounded-full" style={{ width: `${(day.orders / Math.max(...revenue7d.map(d => d.orders), 1)) * 100}%` }} />
                  </div>
                  <span className="text-foreground font-medium w-8 text-right">{day.orders}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Order status breakdown */}
          {statusCounts.length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Order Status</h3>
              <div className="space-y-2">
                {statusCounts.map(({ status, count }) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className={`text-sm capitalize ${STATUS_COLORS[status] ?? "text-muted-foreground"}`}>{status.replace("_", " ")}</span>
                    <Badge variant="outline" className="text-xs">{count}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
