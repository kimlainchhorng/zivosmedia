/**
 * Auto Repair — Reports & Analytics
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BarChart3, FileDown, TrendingUp, Timer, AlertOctagon, CheckCheck } from "lucide-react";

interface Props { storeId: string }

const fmt = (cents: number) =>
  `$${((cents ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const presets: Record<string, () => { from: string; to: string }> = {
  "Today": () => {
    const d = new Date().toISOString().slice(0, 10);
    return { from: d, to: d };
  },
  "Last 7d": () => {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
    return { from, to };
  },
  "Last 30d": () => {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
    return { from, to };
  },
  "YTD": () => {
    const now = new Date();
    return { from: `${now.getFullYear()}-01-01`, to: now.toISOString().slice(0, 10) };
  },
};

export default function AutoRepairReportsSection({ storeId }: Props) {
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const { data: orders = [] } = useQuery({
    queryKey: ["ar-reports-orders", storeId, from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_work_orders" as any)
        .select("id,number,status,labor_hours,total_cents,is_comeback,technician_id,created_at,completed_at,customer_name,vehicle_label")
        .eq("store_id", storeId)
        .gte("created_at", from)
        .lte("created_at", `${to}T23:59:59`);
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: estimates = [] } = useQuery({
    queryKey: ["ar-reports-estimates", storeId, from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_estimates" as any)
        .select("id,number,status,total_cents,created_at,customer_name")
        .eq("store_id", storeId)
        .gte("created_at", from)
        .lte("created_at", `${to}T23:59:59`);
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: techs = [] } = useQuery({
    queryKey: ["ar-technicians", storeId],
    queryFn: async () => {
      const { data, error } = await supabase.from("ar_technicians" as any).select("id,name").eq("store_id", storeId);
      if (error) throw error;
      return data as any[];
    },
  });

  const stats = useMemo(() => {
    const closed = orders.filter((o: any) => o.status === "done");
    const revenue = closed.reduce((s: number, o: any) => s + (o.total_cents ?? 0), 0);
    const laborHours = orders.reduce((s: number, o: any) => s + Number(o.labor_hours ?? 0), 0);
    const avg = closed.length ? revenue / closed.length : 0;
    const comebacks = orders.filter((o: any) => o.is_comeback).length;
    const cbRate = orders.length ? (comebacks / orders.length) * 100 : 0;

    // Estimate conversion rate
    const approvedEst = estimates.filter((e: any) => e.status === "approved" || e.converted_workorder_id).length;
    const convRate = estimates.length ? (approvedEst / estimates.length) * 100 : 0;

    // Avg days to close
    const daysToClose = closed
      .filter((o: any) => o.completed_at)
      .map((o: any) => (new Date(o.completed_at).getTime() - new Date(o.created_at).getTime()) / 86400000);
    const avgDays = daysToClose.length ? daysToClose.reduce((a: number, b: number) => a + b, 0) / daysToClose.length : 0;

    // By status
    const byStatus: Record<string, number> = {};
    orders.forEach((o: any) => { byStatus[o.status] = (byStatus[o.status] ?? 0) + 1; });

    // By tech
    const byTech: Record<string, { ros: number; revenue: number; hours: number }> = {};
    closed.forEach((o: any) => {
      const k = o.technician_id ?? "_unassigned";
      byTech[k] = byTech[k] ?? { ros: 0, revenue: 0, hours: 0 };
      byTech[k].ros++;
      byTech[k].revenue += o.total_cents ?? 0;
      byTech[k].hours += Number(o.labor_hours ?? 0);
    });

    return { revenue, closedCount: closed.length, laborHours, avg, cbRate, convRate, avgDays, byStatus, byTech };
  }, [orders, estimates]);

  const exportCsv = () => {
    const header = ["RO Number", "Customer", "Vehicle", "Status", "Comeback", "Labor Hrs", "Total", "Created", "Completed"];
    const rows = orders.map((o: any) => [
      o.number,
      o.customer_name ?? "",
      o.vehicle_label ?? "",
      o.status,
      o.is_comeback ? "Yes" : "No",
      o.labor_hours ?? "",
      `$${((o.total_cents ?? 0) / 100).toFixed(2)}`,
      o.created_at ? new Date(o.created_at).toLocaleDateString() : "",
      o.completed_at ? new Date(o.completed_at).toLocaleDateString() : "",
    ]);
    const csv = [header, ...rows].map((r) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `ar-report-${from}-to-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const maxRevenue = Math.max(...Object.values(stats.byTech).map((t) => t.revenue), 1);

  return (
    <div className="space-y-4">
      {/* Date controls */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Reports & Analytics</CardTitle>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={exportCsv}>
            <FileDown className="w-3.5 h-3.5" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {Object.keys(presets).map((key) => (
              <Button key={key} size="sm" variant="outline"
                onClick={() => { const r = presets[key](); setFrom(r.from); setTo(r.to); }}>
                {key}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-36" />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-36" />
            </div>
            <Badge variant="secondary" className="text-xs">{orders.length} work orders in range</Badge>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card><CardContent className="p-3">
          <div className="flex items-center gap-1.5 mb-1 text-muted-foreground"><TrendingUp className="w-3.5 h-3.5" /><span className="text-[11px] uppercase tracking-wide">Revenue</span></div>
          <p className="text-xl font-bold tabular-nums">{fmt(stats.revenue)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="flex items-center gap-1.5 mb-1 text-muted-foreground"><CheckCheck className="w-3.5 h-3.5" /><span className="text-[11px] uppercase tracking-wide">ROs Closed</span></div>
          <p className="text-xl font-bold">{stats.closedCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="flex items-center gap-1.5 mb-1 text-muted-foreground"><Timer className="w-3.5 h-3.5" /><span className="text-[11px] uppercase tracking-wide">Labor Hours</span></div>
          <p className="text-xl font-bold">{stats.laborHours.toFixed(1)}h</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="flex items-center gap-1.5 mb-1 text-muted-foreground"><AlertOctagon className="w-3.5 h-3.5" /><span className="text-[11px] uppercase tracking-wide">Comeback %</span></div>
          <p className="text-xl font-bold">{stats.cbRate.toFixed(1)}%</p>
        </CardContent></Card>
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-3 gap-2">
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{fmt(stats.avg)}</p>
          <p className="text-[10px] uppercase text-muted-foreground">Avg ticket</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{stats.avgDays.toFixed(1)}d</p>
          <p className="text-[10px] uppercase text-muted-foreground">Avg days to close</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{stats.convRate.toFixed(0)}%</p>
          <p className="text-[10px] uppercase text-muted-foreground">Est. approval rate</p>
        </CardContent></Card>
      </div>

      {/* Status breakdown */}
      {Object.keys(stats.byStatus).length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Work Orders by Status</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.byStatus).map(([status, count]) => {
              const pct = orders.length ? (count / orders.length) * 100 : 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="text-xs w-24 capitalize text-muted-foreground">{status.replace("_", " ")}</span>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-medium w-6 text-right">{count}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Tech leaderboard */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Technician Leaderboard</CardTitle></CardHeader>
        <CardContent>
          {Object.keys(stats.byTech).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No closed work orders in this period.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(stats.byTech)
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .map(([tid, s]) => {
                  const name = techs.find((t: any) => t.id === tid)?.name ?? "Unassigned";
                  const pct = (s.revenue / maxRevenue) * 100;
                  return (
                    <div key={tid}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium">{name}</span>
                        <span className="text-muted-foreground text-xs">{s.ros} ROs · {s.hours.toFixed(1)}h · {fmt(s.revenue)}</span>
                      </div>
                      <div className="bg-muted rounded-full h-1.5">
                        <div className="bg-emerald-500 rounded-full h-1.5 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
