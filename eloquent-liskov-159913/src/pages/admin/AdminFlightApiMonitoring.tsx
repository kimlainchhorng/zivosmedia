/**
 * Admin Flight API Monitoring - Duffel API usage, limits, and incidents
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Activity, AlertTriangle, Server, Zap } from "lucide-react";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type ApiUsage = {
  id: string;
  date: string;
  searches_total: number;
  searches_cached: number;
  searches_live: number;
  bookings_total: number;
  avg_response_time_ms: number;
  errors_count: number;
};

type ApiLimits = {
  id: string;
  daily_search_cap: number;
  daily_booking_cap: number;
  alert_threshold_percent: number;
  cache_ttl_seconds: number;
  is_active: boolean;
};

type Incident = {
  id: string;
  incident_type: string;
  reason_code: string | null;
  description: string | null;
  started_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  affected_bookings_count: number | null;
  failure_count_trigger: number | null;
  created_at: string;
};

export default function AdminFlightApiMonitoring() {
  const { data: usage, refetch: refetchUsage } = useQuery({
    queryKey: ["admin-flight-api-usage"],
    queryFn: async () => {
      const { data, error } = await supabase.from("flight_api_usage").select("*").order("date", { ascending: false }).limit(30);
      if (error) throw error;
      return (data || []) as unknown as ApiUsage[];
    },
  });

  const { data: limits } = useQuery({
    queryKey: ["admin-flight-api-limits"],
    queryFn: async () => {
      const { data, error } = await supabase.from("flight_api_limits").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data as unknown as ApiLimits | null;
    },
  });

  const { data: incidents, refetch: refetchIncidents } = useQuery({
    queryKey: ["admin-flight-incidents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("flight_incident_logs").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return (data || []) as unknown as Incident[];
    },
  });

  const chartData = (usage || []).slice(0, 14).reverse().map((u) => ({
    date: format(new Date(u.date), "MM/dd"),
    live: u.searches_live,
    cached: u.searches_cached,
    errors: u.errors_count,
  }));

  const todayUsage = usage?.[0];
  const todaySearchPct = limits?.daily_search_cap && todayUsage
    ? ((todayUsage.searches_total / limits.daily_search_cap) * 100).toFixed(0)
    : "—";

  return (
    <AdminLayout title="Flight API Monitoring">
      <div className="flex justify-end mb-6">
        <Button variant="outline" size="sm" className="h-10 rounded-xl gap-2" onClick={() => { refetchUsage(); refetchIncidents(); }}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Today Searches", value: todayUsage?.searches_total ?? 0, icon: Activity, color: "text-blue-600" },
          { label: "Cache Hit Rate", value: todayUsage ? `${todayUsage.searches_cached && todayUsage.searches_total ? ((todayUsage.searches_cached / todayUsage.searches_total) * 100).toFixed(0) : 0}%` : "—", icon: Zap, color: "text-emerald-600" },
          { label: "API Quota Used", value: `${todaySearchPct}%`, icon: Server, color: "text-orange-600" },
          { label: "Active Incidents", value: incidents?.filter((i) => !i.resolved_at).length ?? 0, icon: AlertTriangle, color: "text-red-600" },
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

      {/* API Limits config */}
      {limits && (
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-foreground mb-3">Current API Limits</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div><span className="text-muted-foreground">Daily Search Cap:</span> <span className="font-medium text-foreground ml-1">{limits.daily_search_cap}</span></div>
            <div><span className="text-muted-foreground">Daily Booking Cap:</span> <span className="font-medium text-foreground ml-1">{limits.daily_booking_cap}</span></div>
            <div><span className="text-muted-foreground">Alert Threshold:</span> <span className="font-medium text-foreground ml-1">{limits.alert_threshold_percent}%</span></div>
            <div><span className="text-muted-foreground">Cache TTL:</span> <span className="font-medium text-foreground ml-1">{limits.cache_ttl_seconds}s</span></div>
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-foreground mb-3">Daily API Usage (14 days)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="live" stackId="a" fill="hsl(var(--primary))" name="Live" radius={[0, 0, 0, 0]} />
              <Bar dataKey="cached" stackId="a" fill="hsl(220, 70%, 75%)" name="Cached" radius={[4, 4, 0, 0]} />
              <Bar dataKey="errors" fill="hsl(0, 70%, 60%)" name="Errors" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Incidents */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-sm font-medium text-foreground mb-3">Incident History</p>
        {!incidents?.length ? (
          <p className="text-muted-foreground text-sm py-4 text-center">No incidents recorded</p>
        ) : (
          <div className="space-y-3">
            {incidents.map((inc) => (
              <div key={inc.id} className="border border-border rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={inc.resolved_at ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                        {inc.resolved_at ? "Resolved" : "Active"}
                      </Badge>
                      <span className="text-sm font-medium text-foreground capitalize">{inc.incident_type.replace(/_/g, " ")}</span>
                    </div>
                    {inc.description && <p className="text-xs text-muted-foreground mt-1">{inc.description}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(inc.started_at), "MMM d HH:mm")}</span>
                </div>
                {inc.affected_bookings_count != null && inc.affected_bookings_count > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Affected bookings: {inc.affected_bookings_count}</p>
                )}
                {inc.resolution_notes && <p className="text-xs text-muted-foreground mt-1 italic">{inc.resolution_notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
