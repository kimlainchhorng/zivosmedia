/**
 * Admin Flight Search Analytics - View customer flight search patterns
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, TrendingUp, Clock, AlertTriangle, Plane } from "lucide-react";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

type SearchLog = {
  id: string;
  session_id: string | null;
  user_id: string | null;
  origin_iata: string | null;
  destination_iata: string | null;
  departure_date: string | null;
  return_date: string | null;
  passengers: number | null;
  cabin_class: string | null;
  duffel_status_code: number | null;
  duffel_error: string | null;
  offers_count: number | null;
  response_time_ms: number | null;
  created_at: string;
};

export default function AdminFlightSearchAnalytics() {
  const [search, setSearch] = useState("");

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["admin-flight-search-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_search_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as SearchLog[];
    },
  });

  const filtered = useMemo(() => {
    if (!logs) return [];
    if (!search) return logs;
    const q = search.toLowerCase();
    return logs.filter((l) =>
      l.origin_iata?.toLowerCase().includes(q) ||
      l.destination_iata?.toLowerCase().includes(q) ||
      l.cabin_class?.toLowerCase().includes(q)
    );
  }, [logs, search]);

  // Stats
  const stats = useMemo(() => {
    if (!logs?.length) return { total: 0, avgResponse: 0, errorRate: 0, avgOffers: 0 };
    const errors = logs.filter((l) => l.duffel_error || (l.duffel_status_code && l.duffel_status_code >= 400));
    const responseTimes = logs.filter((l) => l.response_time_ms).map((l) => l.response_time_ms!);
    const offerCounts = logs.filter((l) => l.offers_count != null).map((l) => l.offers_count!);
    return {
      total: logs.length,
      avgResponse: responseTimes.length ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0,
      errorRate: logs.length ? ((errors.length / logs.length) * 100).toFixed(1) : "0",
      avgOffers: offerCounts.length ? Math.round(offerCounts.reduce((a, b) => a + b, 0) / offerCounts.length) : 0,
    };
  }, [logs]);

  // Top routes
  const topRoutes = useMemo(() => {
    if (!logs?.length) return [];
    const routeMap = new Map<string, number>();
    logs.forEach((l) => {
      if (l.origin_iata && l.destination_iata) {
        const key = `${l.origin_iata}→${l.destination_iata}`;
        routeMap.set(key, (routeMap.get(key) || 0) + 1);
      }
    });
    return [...routeMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([route, count]) => ({ route, count }));
  }, [logs]);

  // Daily search volume chart
  const dailyVolume = useMemo(() => {
    if (!logs?.length) return [];
    const dayMap = new Map<string, number>();
    logs.forEach((l) => {
      const day = format(new Date(l.created_at), "MM/dd");
      dayMap.set(day, (dayMap.get(day) || 0) + 1);
    });
    return [...dayMap.entries()].reverse().map(([day, searches]) => ({ day, searches }));
  }, [logs]);

  return (
    <AdminLayout title="Flight Search Analytics">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Filter by route, cabin class…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 rounded-xl" />
        </div>
        <Button variant="outline" size="sm" className="h-10 rounded-xl gap-2" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Searches", value: stats.total, icon: Search, color: "text-blue-600" },
          { label: "Avg Response", value: `${stats.avgResponse}ms`, icon: Clock, color: "text-emerald-600" },
          { label: "Error Rate", value: `${stats.errorRate}%`, icon: AlertTriangle, color: "text-red-600" },
          { label: "Avg Offers", value: stats.avgOffers, icon: TrendingUp, color: "text-purple-600" },
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

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Daily volume */}
        {dailyVolume.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm font-medium text-foreground mb-3">Daily Search Volume</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyVolume}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="searches" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top routes */}
        {topRoutes.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm font-medium text-foreground mb-3">Top Searched Routes</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topRoutes} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis dataKey="route" type="category" width={90} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--accent-foreground))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading search logs…</div>
      ) : !filtered?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <Plane className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No search logs found
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Time</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Route</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Dates</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cabin</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Pax</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Offers</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Response</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.slice(0, 100).map((log) => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-foreground text-xs">
                    {format(new Date(log.created_at), "MMM d HH:mm")}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                    {log.origin_iata && log.destination_iata ? `${log.origin_iata} → ${log.destination_iata}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {log.departure_date || "—"}{log.return_date ? ` / ${log.return_date}` : ""}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{log.cabin_class || "—"}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{log.passengers || "—"}</td>
                  <td className="px-4 py-3 text-center text-foreground font-medium">{log.offers_count ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{log.response_time_ms ? `${log.response_time_ms}ms` : "—"}</td>
                  <td className="px-4 py-3">
                    {log.duffel_error ? (
                      <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs">error</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">ok</Badge>
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
