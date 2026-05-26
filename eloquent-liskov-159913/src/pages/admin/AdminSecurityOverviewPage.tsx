import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, ShieldAlert, Ban, History as HistoryIcon, Mail, Activity,
  AlertTriangle, FileText, ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const since = (hours: number) => new Date(Date.now() - hours * 3600 * 1000).toISOString();

export default function AdminSecurityOverviewPage() {
  // Pull lightweight aggregates in parallel.
  const ipBlocks = useQuery({
    queryKey: ["overview-ip-blocks"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ip_blocklist").select("id, expires_at").limit(1000);
      if (error) throw error;
      const now = Date.now();
      const active = (data || []).filter((r: any) => !r.expires_at || new Date(r.expires_at).getTime() > now);
      return { total: (data || []).length, active: active.length };
    },
  });

  const userBlocks = useQuery({
    queryKey: ["overview-user-blocks"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_blocklist").select("id, expires_at").limit(1000);
      if (error) throw error;
      const now = Date.now();
      const active = (data || []).filter((r: any) => !r.expires_at || new Date(r.expires_at).getTime() > now);
      return { total: (data || []).length, active: active.length };
    },
  });

  const recent24h = useQuery({
    queryKey: ["overview-events-24h"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("security_events")
        .select("event_type, severity, is_blocked, created_at")
        .gte("created_at", since(24));
      if (error) throw error;
      return (data || []) as Array<{
        event_type: string; severity: string; is_blocked: boolean; created_at: string;
      }>;
    },
  });

  const recentIncidents = useQuery({
    queryKey: ["overview-incidents"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("security_incidents")
        .select("id, source, severity, summary, acknowledged, created_at")
        .gte("created_at", since(24 * 7))
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as Array<{
        id: string; source: string; severity: string; summary: string;
        acknowledged: boolean; created_at: string;
      }>;
    },
  });

  const queueStats = useQuery({
    queryKey: ["overview-notif-queue"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("security_notification_queue")
        .select("status").limit(2000);
      if (error) throw error;
      const counts: Record<string, number> = { pending: 0, in_flight: 0, sent: 0, failed: 0 };
      for (const r of (data || [])) counts[r.status] = (counts[r.status] ?? 0) + 1;
      return counts;
    },
  });

  const blockedLinks24h = useQuery({
    queryKey: ["overview-blocked-links"],
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("blocked_link_attempts")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since(24));
      if (error) throw error;
      return count ?? 0;
    },
  });

  const cspViolations24h = useQuery({
    queryKey: ["overview-csp-24h"],
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("csp_violations")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since(24));
      if (error) throw error;
      return count ?? 0;
    },
  });

  const eventStats = useMemo(() => {
    const rows = recent24h.data || [];
    const byCategory: Record<string, number> = {
      blocked: 0, waf: 0, bot: 0, brute_force: 0, ip_blocklist: 0,
      user_blocklist: 0, rate_limit: 0, admin: 0, auth: 0,
    };
    for (const r of rows) {
      if (r.is_blocked) byCategory.blocked++;
      const t = r.event_type;
      if (t.startsWith("waf."))            byCategory.waf++;
      if (t.startsWith("bot."))            byCategory.bot++;
      if (t.startsWith("brute_force."))    byCategory.brute_force++;
      if (t.startsWith("ip_blocklist."))   byCategory.ip_blocklist++;
      if (t.startsWith("user_blocklist.")) byCategory.user_blocklist++;
      if (t.startsWith("rate_limit."))     byCategory.rate_limit++;
      if (t.startsWith("admin."))          byCategory.admin++;
      if (t.startsWith("auth."))           byCategory.auth++;
    }
    return { total: rows.length, ...byCategory } as { total: number } & Record<string, number>;
  }, [recent24h.data]);

  const sevBadge = (s: string) =>
    s === "critical" ? "bg-red-500/15 text-red-700 border-red-400/40" :
    s === "high" || s === "error" ? "bg-orange-500/15 text-orange-700 border-orange-400/40" :
    s === "medium" || s === "warn" ? "bg-yellow-500/15 text-yellow-700 border-yellow-400/40" :
    "bg-muted";

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-3 pb-24 sm:p-4 lg:p-6">
      <header className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-emerald-600" />
        <div>
          <h1 className="text-lg font-semibold">Security overview</h1>
          <p className="text-sm text-muted-foreground">
            Last 24 hours unless noted. Click any card to drill in.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Link to="/admin/security/threat-history">
          <Card className="transition hover:shadow-md"><CardContent className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Active IP blocks</p>
              <Ban className="h-4 w-4 text-red-600" />
            </div>
            <p className="text-2xl font-semibold">{ipBlocks.data?.active ?? "—"}</p>
            <p className="text-[11px] text-muted-foreground">{ipBlocks.data?.total ?? 0} total</p>
          </CardContent></Card>
        </Link>
        <Link to="/admin/security/threat-history">
          <Card className="transition hover:shadow-md"><CardContent className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Active user blocks</p>
              <Ban className="h-4 w-4 text-red-600" />
            </div>
            <p className="text-2xl font-semibold">{userBlocks.data?.active ?? "—"}</p>
            <p className="text-[11px] text-muted-foreground">{userBlocks.data?.total ?? 0} total</p>
          </CardContent></Card>
        </Link>
        <Link to="/admin/security/blocked-links">
          <Card className="transition hover:shadow-md"><CardContent className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Blocked links 24h</p>
              <ExternalLink className="h-4 w-4 text-orange-600" />
            </div>
            <p className="text-2xl font-semibold">{blockedLinks24h.data ?? "—"}</p>
          </CardContent></Card>
        </Link>
        <Link to="/admin/security/csp-violations">
          <Card className="transition hover:shadow-md"><CardContent className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">CSP violations 24h</p>
              <ShieldAlert className="h-4 w-4 text-orange-600" />
            </div>
            <p className="text-2xl font-semibold">{cspViolations24h.data ?? "—"}</p>
          </CardContent></Card>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4" /> Security events — last 24h
          </CardTitle>
          <Link to="/admin/security/audit">
            <Badge variant="outline" className="cursor-pointer">{eventStats.total} total →</Badge>
          </Link>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Blocked"          value={eventStats.blocked}        emphasis />
          <Stat label="WAF"              value={eventStats.waf} />
          <Stat label="Bot UA"           value={eventStats.bot} />
          <Stat label="Brute force"      value={eventStats.brute_force} />
          <Stat label="IP blocklist"     value={eventStats.ip_blocklist} />
          <Stat label="User blocklist"   value={eventStats.user_blocklist} />
          <Stat label="Rate limit"       value={eventStats.rate_limit} />
          <Stat label="Admin actions"    value={eventStats.admin} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4" /> Notifications queue
          </CardTitle>
          <Link to="/admin/security/notifications">
            <Badge variant="outline" className="cursor-pointer">manage →</Badge>
          </Link>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Pending"   value={queueStats.data?.pending ?? 0} />
          <Stat label="In flight" value={queueStats.data?.in_flight ?? 0} />
          <Stat label="Sent"      value={queueStats.data?.sent ?? 0} />
          <Stat label="Failed"    value={queueStats.data?.failed ?? 0} emphasis={!!queueStats.data?.failed} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-orange-600" /> Recent incidents — last 7 days
          </CardTitle>
          <Link to="/admin/security-sentinel">
            <Badge variant="outline" className="cursor-pointer">sentinel →</Badge>
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentIncidents.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!recentIncidents.isLoading && (recentIncidents.data?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">No incidents. ✅</p>
          )}
          {(recentIncidents.data ?? []).map((i) => (
            <div key={i.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm">
              <Badge className={sevBadge(i.severity)}>{i.severity}</Badge>
              <span className="font-mono text-xs">{i.source}</span>
              {!i.acknowledged && <Badge variant="outline" className="text-yellow-700">unacked</Badge>}
              <span className="flex-1 truncate" title={i.summary}>{i.summary}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(i.created_at), { addSuffix: true })}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4" /> Quick links</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <NavLink to="/admin/security/threat-history" label="Threat history & blocklists" icon={<HistoryIcon className="h-4 w-4" />} />
          <NavLink to="/admin/security/audit"          label="Security audit log"           icon={<Activity className="h-4 w-4" />} />
          <NavLink to="/admin/security/blocked-links"  label="Blocked phishing links"       icon={<ExternalLink className="h-4 w-4" />} />
          <NavLink to="/admin/security/csp-violations" label="CSP violations"               icon={<ShieldAlert className="h-4 w-4" />} />
          <NavLink to="/admin/security/notifications"  label="Notifications queue"          icon={<Mail className="h-4 w-4" />} />
          <NavLink to="/admin/security-sentinel"       label="Security sentinel (incidents)" icon={<AlertTriangle className="h-4 w-4" />} />
        </CardContent>
      </Card>
    </main>
  );
}

function Stat({ label, value, emphasis }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold ${emphasis && value > 0 ? "text-red-600" : ""}`}>{value}</p>
    </div>
  );
}

function NavLink({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <Link to={to} className="flex items-center gap-2 rounded-md border p-2 text-sm transition hover:bg-muted">
      {icon}
      <span>{label}</span>
    </Link>
  );
}
