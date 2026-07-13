/**
 * Admin Launch Dashboard — Total Installs vs Sales vs Meta Event Accuracy
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FeedIncidentSummaryCard } from "@/components/admin/FeedIncidentSummaryCard";
import {
  ArrowLeft, Download, DollarSign, Activity, TrendingUp,
  BarChart3, Loader2, Target, Zap, Users,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import SEOHead from "@/components/SEOHead";

interface DailyMetric {
  day: string;
  orders: number;
  revenue: number;
  meta_events: number;
}

export default function AdminLaunchDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [totalInstalls, setTotalInstalls] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalMetaEvents, setTotalMetaEvents] = useState(0);
  const [metaAccuracy, setMetaAccuracy] = useState(0);
  const [totalFees, setTotalFees] = useState(0);
  const [dailyData, setDailyData] = useState<DailyMetric[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      // Fetch installs (device tokens as proxy)
      const { count: installCount } = await supabase
        .from("device_tokens" as any)
        .select("*", { count: "exact", head: true });
      setTotalInstalls(installCount || 0);

      // Fetch total sales from analytics_daily
      const { data: dailyStats } = await (supabase as any)
        .from("analytics_daily")
        .select("day, orders_count, gmv, platform_revenue")
        .order("day", { ascending: true })
        .limit(30);

      if (dailyStats?.length) {
        const totOrders = dailyStats.reduce((s: number, d: any) => s + (d.orders_count || 0), 0);
        const totGmv = dailyStats.reduce((s: number, d: any) => s + (d.gmv || 0), 0);
        const totRev = dailyStats.reduce((s: number, d: any) => s + (d.platform_revenue || 0), 0);
        setTotalSales(totOrders);
        setTotalRevenue(totGmv);
        setTotalFees(totRev);
      }

      // Fetch Meta events count
      const { count: metaCount } = await (supabase as any)
        .from("analytics_events")
        .select("*", { count: "exact", head: true })
        .eq("event_name", "client_error")
        .is("meta", null); // Non-error events

      // Approximate: count CAPI events from analytics
      const { count: capiCount } = await (supabase as any)
        .from("analytics_events")
        .select("*", { count: "exact", head: true })
        .in("event_name", ["purchase_tracked", "meta_capi_purchase", "client_error"]);

      const metaEventsTotal = capiCount || 0;
      setTotalMetaEvents(metaEventsTotal);

      // Accuracy: (meta events / total sales) * 100, capped at 100
      const accuracy = totalSales > 0
        ? Math.min(100, Math.round((metaEventsTotal / (totalSales || 1)) * 100))
        : metaEventsTotal > 0 ? 100 : 0;
      setMetaAccuracy(accuracy);

      // Build daily chart data
      const chartData = (dailyStats || []).slice(-14).map((d: any) => ({
        day: new Date(d.day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        orders: d.orders_count || 0,
        revenue: Math.round((d.gmv || 0) / 100),
        meta_events: 0,
      }));
      setDailyData(chartData);

    } catch (err) {
      console.error("[LaunchDashboard]", err);
    }
    setLoading(false);
  };

  const stats = [
    {
      label: "App Installs",
      value: totalInstalls.toLocaleString(),
      icon: Download,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Total Sales",
      value: totalSales.toLocaleString(),
      icon: DollarSign,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "GMV",
      value: `$${(totalRevenue / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Meta Accuracy",
      value: `${metaAccuracy}%`,
      icon: Target,
      color: metaAccuracy >= 90 ? "text-emerald-500" : "text-amber-500",
      bg: metaAccuracy >= 90 ? "bg-emerald-500/10" : "bg-amber-500/10",
    },
    {
      label: "Platform Fees",
      value: `$${(totalFees / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      icon: Zap,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Meta Events",
      value: totalMetaEvents.toLocaleString(),
      icon: Activity,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      <SEOHead title="Launch Dashboard — ZIVO Admin" description="Admin overview of installs, sales, and Meta event accuracy." />

      <div className="sticky top-0 safe-area-top z-30 bg-background/95 backdrop-blur-md border-b border-border/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} aria-label="Go back" title="Go back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <BarChart3 className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold flex-1">Launch Dashboard</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-5 max-w-4xl mx-auto">
          <FeedIncidentSummaryCard range="24h" title="Feed Incident Command" compact />

          {/* KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {stats.map((s) => (
              <Card key={s.label} className="border-border/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`h-8 w-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                      <s.icon className={`h-4 w-4 ${s.color}`} />
                    </div>
                  </div>
                  <p className="text-xl font-black">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Revenue Chart */}
          {dailyData.length > 0 && (
            <Card className="border-border/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Revenue (Last 14 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dailyData}>
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Orders Trend */}
          {dailyData.length > 0 && (
            <Card className="border-border/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" /> Orders Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={dailyData}>
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="orders" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Meta CAPI Health */}
          <Card className="border-border/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" /> Meta CAPI Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Event Match Rate</span>
                <span className={`font-bold ${metaAccuracy >= 90 ? "text-emerald-500" : "text-amber-500"}`}>
                  {metaAccuracy}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${metaAccuracy >= 90 ? "bg-emerald-500" : "bg-amber-500"}`}
                  style={{ width: `${metaAccuracy}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {metaAccuracy >= 90
                  ? "✅ Excellent — Meta's AI is receiving high-quality data"
                  : "⚠️ Below target — check CAPI bridge logs for missing events"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
