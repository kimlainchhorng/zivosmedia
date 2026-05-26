/**
 * Admin Flight Price Alerts - View and manage customer price alerts
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, Bell, BellOff, DollarSign, TrendingDown } from "lucide-react";
import { format } from "date-fns";

type PriceAlert = {
  id: string;
  user_id: string | null;
  origin_iata: string | null;
  destination_iata: string | null;
  departure_date: string | null;
  return_date: string | null;
  passengers: number | null;
  cabin_class: string | null;
  target_price: number | null;
  lowest_seen_price: number | null;
  current_price: number | null;
  last_checked_at: string | null;
  alert_triggered: boolean | null;
  is_active: boolean | null;
  created_at: string;
  // joined
  customer_email?: string | null;
};

export default function AdminFlightPriceAlerts() {
  const [search, setSearch] = useState("");

  const { data: alerts, isLoading, refetch } = useQuery({
    queryKey: ["admin-flight-price-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_price_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = (data || []) as unknown as PriceAlert[];

      // Resolve customer emails via admin RPC (PII no longer exposed via direct table read).
      const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
      if (userIds.length > 0) {
        const emailMap = new Map<string, string | null>();
        await Promise.all(
          userIds.map(async (uid) => {
            const { data } = await (supabase.rpc as any)("admin_get_profile", { _user_id: uid });
            const row: any = Array.isArray(data) ? data[0] : data;
            emailMap.set(uid, row?.email ?? null);
          })
        );
        rows.forEach((r) => { r.customer_email = r.user_id ? emailMap.get(r.user_id) || null : null; });
      }
      return rows;
    },
  });

  const filtered = useMemo(() => {
    if (!alerts) return [];
    if (!search) return alerts;
    const q = search.toLowerCase();
    return alerts.filter((a) =>
      a.origin_iata?.toLowerCase().includes(q) ||
      a.destination_iata?.toLowerCase().includes(q) ||
      a.customer_email?.toLowerCase().includes(q)
    );
  }, [alerts, search]);

  const stats = useMemo(() => {
    if (!alerts?.length) return { total: 0, active: 0, triggered: 0, avgTarget: 0 };
    return {
      total: alerts.length,
      active: alerts.filter((a) => a.is_active).length,
      triggered: alerts.filter((a) => a.alert_triggered).length,
      avgTarget: Math.round(alerts.filter((a) => a.target_price).reduce((s, a) => s + (a.target_price || 0), 0) / (alerts.filter((a) => a.target_price).length || 1)),
    };
  }, [alerts]);

  return (
    <AdminLayout title="Price Alerts Management">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by route, email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 rounded-xl" />
        </div>
        <Button variant="outline" size="sm" className="h-10 rounded-xl gap-2" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Alerts", value: stats.total, icon: Bell, color: "text-blue-600" },
          { label: "Active", value: stats.active, icon: Bell, color: "text-emerald-600" },
          { label: "Triggered", value: stats.triggered, icon: TrendingDown, color: "text-orange-600" },
          { label: "Avg Target Price", value: `$${stats.avgTarget}`, icon: DollarSign, color: "text-purple-600" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
            <p className="text-xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading price alerts…</div>
      ) : !filtered?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <BellOff className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No price alerts found
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Route</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Dates</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Target</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Current</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Lowest</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((alert) => (
                <tr key={alert.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-foreground text-xs">
                    {format(new Date(alert.created_at), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3 text-foreground truncate max-w-[160px]">{alert.customer_email || "—"}</td>
                  <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                    {alert.origin_iata && alert.destination_iata ? `${alert.origin_iata} → ${alert.destination_iata}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {alert.departure_date || "—"}{alert.return_date ? ` / ${alert.return_date}` : ""}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-foreground">${alert.target_price ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{alert.current_price ? `$${alert.current_price}` : "—"}</td>
                  <td className="px-4 py-3 text-right text-emerald-600 font-medium">{alert.lowest_seen_price ? `$${alert.lowest_seen_price}` : "—"}</td>
                  <td className="px-4 py-3 text-center">
                    {alert.alert_triggered ? (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">triggered</Badge>
                    ) : alert.is_active ? (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">active</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-muted text-muted-foreground">inactive</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
