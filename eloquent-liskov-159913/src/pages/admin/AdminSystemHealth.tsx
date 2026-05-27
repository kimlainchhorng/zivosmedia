import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FeedIncidentSummaryCard } from "@/components/admin/FeedIncidentSummaryCard";
import {
  Activity, CheckCircle, AlertTriangle, XCircle, Server, Clock,
  ShieldAlert, RefreshCw, Database, Wifi, Zap, CreditCard,
  MessageSquare, BarChart3, Shield,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { cn } from "@/lib/utils";

interface ServiceCheck {
  name: string;
  key: string;
  icon: any;
  critical: boolean;
  status: "checking" | "ok" | "degraded" | "down";
  latency: number | null;
  lastChecked: Date | null;
}

const INITIAL_SERVICES: Omit<ServiceCheck, "status" | "latency" | "lastChecked">[] = [
  { name: "Database (Profiles)", key: "profiles", icon: Database, critical: true },
  { name: "Database (Orders)", key: "store_orders", icon: Database, critical: true },
  { name: "Auth / Sessions", key: "user_roles", icon: Shield, critical: true },
  { name: "Wallet Transactions", key: "customer_wallet_transactions", icon: CreditCard, critical: true },
  { name: "Analytics Events", key: "analytics_events", icon: BarChart3, critical: false },
  { name: "AI Conversations", key: "ai_conversations", icon: MessageSquare, critical: false },
  { name: "Travel Orders", key: "travel_orders", icon: Zap, critical: false },
  { name: "Notifications", key: "notifications", icon: Wifi, critical: false },
];

function latencyStatus(ms: number | null): "ok" | "degraded" | "down" {
  if (ms === null) return "down";
  if (ms < 400) return "ok";
  if (ms < 1500) return "degraded";
  return "down";
}

const statusConfig = {
  checking: { label: "Checking…", color: "bg-muted text-muted-foreground border-border", icon: Clock },
  ok: { label: "Operational", color: "bg-green-500/10 text-green-600 border-green-500/20", icon: CheckCircle },
  degraded: { label: "Degraded", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", icon: AlertTriangle },
  down: { label: "Down", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: XCircle },
};

export default function AdminSystemHealth() {
  const navigate = useNavigate();
  const [services, setServices] = useState<ServiceCheck[]>(
    INITIAL_SERVICES.map((s) => ({ ...s, status: "checking", latency: null, lastChecked: null }))
  );
  const [lastFullCheck, setLastFullCheck] = useState<Date | null>(null);
  const [checking, setChecking] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const runChecks = useCallback(async () => {
    setChecking(true);
    setServices((prev) => prev.map((s) => ({ ...s, status: "checking", latency: null })));

    const results = await Promise.all(
      INITIAL_SERVICES.map(async (svc) => {
        const start = performance.now();
        try {
          const { error } = await (supabase as any)
            .from(svc.key)
            .select("id", { count: "exact", head: true });
          const latency = Math.round(performance.now() - start);
          const status = error ? "down" : latencyStatus(latency);
          return { ...svc, status, latency, lastChecked: new Date() } as ServiceCheck;
        } catch {
          return { ...svc, status: "down" as const, latency: null, lastChecked: new Date() };
        }
      })
    );

    setServices(results);
    setLastFullCheck(new Date());
    setCountdown(30);
    setChecking(false);
  }, []);

  // Initial check + auto-refresh every 30s
  useEffect(() => {
    runChecks();
  }, [runChecks]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          runChecks();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [runChecks]);

  // Real security alerts
  const { data: securityAlerts } = useQuery({
    queryKey: ["system-health-alerts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("admin_security_alerts")
        .select("id, alert_type, severity, message, created_at, resolved_at")
        .is("resolved_at", null)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) return [];
      return data || [];
    },
    refetchInterval: 60_000,
  });

  // Real error events from analytics
  const { data: errorEvents } = useQuery({
    queryKey: ["system-health-errors"],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await (supabase as any)
        .from("analytics_events")
        .select("id, event_name, page, created_at")
        .ilike("event_name", "%error%")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) return [];
      return data || [];
    },
    refetchInterval: 60_000,
  });

  // Recent webhook activity
  const { data: webhookActivity } = useQuery({
    queryKey: ["system-health-webhooks"],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await (supabase as any)
        .from("customer_wallet_transactions")
        .select("id, type, status, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) return [];
      return data || [];
    },
    refetchInterval: 30_000,
  });

  const operationalCount = services.filter((s) => s.status === "ok").length;
  const degradedCount = services.filter((s) => s.status === "degraded").length;
  const downCount = services.filter((s) => s.status === "down").length;
  const avgLatency = services
    .filter((s) => s.latency !== null)
    .reduce((sum, s, _, arr) => sum + (s.latency! / arr.length), 0);

  const overallStatus =
    downCount > 0 ? "down" :
    degradedCount > 0 ? "degraded" : "ok";

  return (
    <AdminLayout title="System Health">
      <div className="max-w-5xl space-y-6">

        {/* Header status banner */}
        <div className={cn(
          "flex items-center justify-between p-4 rounded-2xl border",
          overallStatus === "ok" ? "bg-green-500/10 border-green-500/20" :
          overallStatus === "degraded" ? "bg-yellow-500/10 border-yellow-500/20" :
          "bg-red-500/10 border-red-500/20"
        )}>
          <div className="flex items-center gap-3">
            {overallStatus === "ok" ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : overallStatus === "degraded" ? (
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
            ) : (
              <XCircle className="w-6 h-6 text-red-500" />
            )}
            <div>
              <p className="font-semibold text-foreground">
                {overallStatus === "ok" ? "All Systems Operational" :
                 overallStatus === "degraded" ? "Some Services Degraded" :
                 "Service Disruption Detected"}
              </p>
              <p className="text-xs text-muted-foreground">
                Last checked: {lastFullCheck ? lastFullCheck.toLocaleTimeString() : "—"} · Next refresh in {countdown}s
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={runChecks}
            disabled={checking}
            className="gap-2"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", checking && "animate-spin")} />
            {checking ? "Checking…" : "Refresh Now"}
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Server className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{services.length}</p>
                <p className="text-xs text-muted-foreground">Services Monitored</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{operationalCount}</p>
                <p className="text-xs text-muted-foreground">Operational</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{degradedCount + downCount}</p>
                <p className="text-xs text-muted-foreground">Issues</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {checking ? "…" : avgLatency > 0 ? `${Math.round(avgLatency)}ms` : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Avg DB Latency</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <FeedIncidentSummaryCard range="24h" title="Feed Incident Health" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Service status list */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Live Service Checks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {services.map((svc) => {
                  const cfg = statusConfig[svc.status];
                  const Icon = cfg.icon;
                  return (
                    <div key={svc.key} className="flex items-center justify-between p-3 rounded-xl border bg-card">
                      <div className="flex items-center gap-3">
                        <svc.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{svc.name}</p>
                          {svc.critical && (
                            <p className="text-[10px] text-red-500 font-medium">CRITICAL</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {svc.latency !== null && (
                          <div className="text-right hidden sm:block">
                            <p className={cn(
                              "text-sm font-semibold",
                              svc.latency < 200 ? "text-green-500" :
                              svc.latency < 800 ? "text-yellow-500" : "text-red-500"
                            )}>
                              {svc.latency}ms
                            </p>
                            <div className="w-20">
                              <Progress
                                value={Math.max(0, 100 - (svc.latency / 20))}
                                className="h-1.5 mt-1"
                              />
                            </div>
                          </div>
                        )}
                        <Badge variant="outline" className={cn("text-xs", cfg.color)}>
                          <Icon className="w-3 h-3 mr-1" />
                          {cfg.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Error events (last 24h) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" /> Error Events (Last 24h)
                  </span>
                  <Badge variant="secondary">{(errorEvents || []).length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(errorEvents || []).length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(errorEvents as any[]).map((ev: any) => (
                      <div key={ev.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <p className="text-sm font-medium text-foreground">{ev.event_name}</p>
                          <p className="text-xs text-muted-foreground">{ev.page || "—"}</p>
                        </div>
                        <p className="text-xs text-muted-foreground shrink-0">
                          {new Date(ev.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-green-600 py-2 text-center">No error events in the last 24 hours ✓</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-4">

            {/* Open security alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-orange-500" /> Open Alerts
                  </span>
                  {(securityAlerts || []).length > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {(securityAlerts as any[]).length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(securityAlerts || []).length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {(securityAlerts as any[]).map((alert: any) => (
                      <div key={alert.id} className="p-3 rounded-xl border border-orange-500/20 bg-orange-500/5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-orange-600 uppercase">
                            {alert.alert_type || "Alert"}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {alert.severity || "medium"}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground">{alert.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(alert.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-green-600 py-2 text-center">No open security alerts ✓</p>
                )}
              </CardContent>
            </Card>

            {/* Recent payment activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Recent Wallet Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(webhookActivity || []).length > 0 ? (
                  <div className="space-y-2">
                    {(webhookActivity as any[]).map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                        <div>
                          <p className="text-sm font-medium text-foreground capitalize">{tx.type || "transaction"}</p>
                          <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleTimeString()}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            tx.status === "completed" ? "bg-green-500/10 text-green-600 border-green-500/20" :
                            tx.status === "pending" ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" :
                            "bg-muted text-muted-foreground"
                          )}
                        >
                          {tx.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-2 text-center">No recent activity</p>
                )}
              </CardContent>
            </Card>

            {/* Quick navigation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Security Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: "Chat Security Monitor", path: "/admin/chat-security", icon: MessageSquare },
                  { label: "Security Sentinel", path: "/admin/security-sentinel", icon: ShieldAlert },
                  { label: "Auth Shield Control", path: "/admin/auth-shield", icon: Shield },
                  { label: "Webhook Status", path: "/admin/payments/webhook-status", icon: Zap },
                ].map((link) => (
                  <button type="button"
                    key={link.path}
                    onClick={() => navigate(link.path)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border text-sm text-foreground hover:bg-muted transition-colors text-left"
                  >
                    <link.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    {link.label}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
