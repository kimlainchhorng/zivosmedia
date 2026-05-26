import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldAlert, RefreshCw, Filter, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type SecurityEvent = {
  id: string;
  event_type: string;
  severity: "info" | "warn" | "error" | "critical" | string;
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  event_data: Record<string, unknown> | null;
  is_blocked: boolean;
  created_at: string;
};

const WINDOWS = [
  { id: "1h",  label: "Last hour",     hours: 1 },
  { id: "24h", label: "Last 24 hours", hours: 24 },
  { id: "7d",  label: "Last 7 days",   hours: 24 * 7 },
  { id: "30d", label: "Last 30 days",  hours: 24 * 30 },
];

const SEVERITY_BADGES: Record<string, string> = {
  critical: "bg-red-500/15 text-red-700 border-red-400/40",
  error:    "bg-orange-500/15 text-orange-700 border-orange-400/40",
  warn:     "bg-yellow-500/15 text-yellow-700 border-yellow-400/40",
  info:     "bg-blue-500/10 text-blue-700 border-blue-400/30",
};

const QUICK_FILTERS = [
  { id: "all",         label: "All" },
  { id: "admin.",      label: "Admin actions" },
  { id: "ip_blocklist", label: "IP blocklist" },
  { id: "user_blocklist", label: "User blocklist" },
  { id: "bot.",        label: "Bot blocks" },
  { id: "waf.",        label: "WAF" },
  { id: "rate_limit.", label: "Rate limit" },
  { id: "scanner.",    label: "Scanners" },
  { id: "brute_force.", label: "Brute force" },
];

export default function AdminSecurityAuditPage() {
  const [windowId, setWindowId]       = useState("24h");
  const [quickFilter, setQuickFilter] = useState("all");
  const [textFilter, setTextFilter]   = useState("");
  const [onlyBlocked, setOnlyBlocked] = useState(false);

  const cutoff = useMemo(() => {
    const w = WINDOWS.find((x) => x.id === windowId)!;
    return new Date(Date.now() - w.hours * 3600 * 1000).toISOString();
  }, [windowId]);

  const list = useQuery({
    queryKey: ["security-audit", cutoff, quickFilter, onlyBlocked],
    queryFn: async () => {
      let q = (supabase as any)
        .from("security_events")
        .select("id, event_type, severity, user_id, ip_address, user_agent, event_data, is_blocked, created_at")
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(500);
      if (quickFilter !== "all") q = q.like("event_type", `${quickFilter}%`);
      if (onlyBlocked) q = q.eq("is_blocked", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as SecurityEvent[];
    },
  });

  const rows = list.data || [];
  const filtered = textFilter.trim()
    ? rows.filter((r) =>
        r.event_type.includes(textFilter) ||
        r.user_id?.includes(textFilter) ||
        r.ip_address?.includes(textFilter) ||
        JSON.stringify(r.event_data ?? {}).includes(textFilter))
    : rows;

  const stats = useMemo(() => {
    const byType = new Map<string, number>();
    const bySeverity = new Map<string, number>();
    let blockedCount = 0;
    for (const r of rows) {
      byType.set(r.event_type, (byType.get(r.event_type) ?? 0) + 1);
      bySeverity.set(r.severity, (bySeverity.get(r.severity) ?? 0) + 1);
      if (r.is_blocked) blockedCount++;
    }
    return {
      total: rows.length,
      blocked: blockedCount,
      types: [...byType.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
      severities: [...bySeverity.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [rows]);

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-3 pb-24 sm:p-4 lg:p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-orange-600" />
          <div>
            <h1 className="text-lg font-semibold">Security audit log</h1>
            <p className="text-sm text-muted-foreground">
              Every event from <code className="font-mono">recordSecurityEvent</code> — admin actions, blocklist hits, WAF blocks, brute-force lockouts.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => list.refetch()} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${list.isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Total in window</p>
          <p className="text-2xl font-semibold">{stats.total}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Blocked</p>
          <p className="text-2xl font-semibold text-red-600">{stats.blocked}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Distinct event types</p>
          <p className="text-2xl font-semibold">{stats.types.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <Select value={windowId} onValueChange={setWindowId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {WINDOWS.map((w) => <SelectItem key={w.id} value={w.id}>{w.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Filter className="h-4 w-4" /> Filters</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {QUICK_FILTERS.map((f) => (
              <Button
                key={f.id}
                size="sm"
                variant={quickFilter === f.id ? "default" : "outline"}
                onClick={() => setQuickFilter(f.id)}
              >
                {f.label}
              </Button>
            ))}
            <Button
              size="sm"
              variant={onlyBlocked ? "default" : "outline"}
              onClick={() => setOnlyBlocked((v) => !v)}
            >
              Only blocked
            </Button>
          </div>
          <Input
            placeholder="Free-text search (event_type, user_id, ip, payload JSON)"
            value={textFilter}
            onChange={(e) => setTextFilter(e.target.value)}
          />
        </CardContent>
      </Card>

      {stats.types.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Top event types</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {stats.types.map(([type, n]) => (
              <div key={type} className="flex items-center justify-between text-sm">
                <button type="button"
                  className="font-mono text-xs hover:underline"
                  onClick={() => { setQuickFilter("all"); setTextFilter(type); }}
                >
                  {type}
                </button>
                <Badge variant="outline">{n}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4" /> Events ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {list.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!list.isLoading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">No events match.</p>
          )}
          {filtered.map((r) => (
            <div key={r.id} className="rounded-md border bg-card p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs">{r.event_type}</span>
                <Badge className={SEVERITY_BADGES[r.severity] ?? "bg-muted"}>{r.severity}</Badge>
                {r.is_blocked && <Badge className={SEVERITY_BADGES.warn}>blocked</Badge>}
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                </span>
              </div>
              <div className="mt-1 grid grid-cols-1 gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
                {r.user_id   && <span className="font-mono truncate" title={r.user_id}>user: {r.user_id.slice(0, 12)}…</span>}
                {r.ip_address && <span className="font-mono truncate" title={r.ip_address}>ip: {r.ip_address}</span>}
                {r.user_agent && <span className="font-mono truncate sm:col-span-2" title={r.user_agent}>ua: {r.user_agent.slice(0, 100)}{r.user_agent.length > 100 ? "…" : ""}</span>}
              </div>
              {r.event_data && Object.keys(r.event_data).length > 0 && (
                <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted/50 p-2 text-[11px]">
                  {JSON.stringify(r.event_data, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
