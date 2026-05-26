import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldAlert, RefreshCw, Loader2, ExternalLink, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

type BlockedAttempt = {
  id: string;
  user_id: string | null;
  endpoint: string;
  urls: string[];
  content_preview: string | null;
  ip_hash: string | null;
  created_at: string;
};

const WINDOWS = [
  { id: "24h", label: "Last 24 hours", hours: 24 },
  { id: "7d", label: "Last 7 days", hours: 24 * 7 },
  { id: "30d", label: "Last 30 days", hours: 24 * 30 },
  { id: "all", label: "All time", hours: null as number | null },
];

export default function AdminBlockedLinksPage() {
  const [window, setWindow] = useState<string>("7d");
  const [endpointFilter, setEndpointFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string | null>(null);

  const cutoff = useMemo(() => {
    const w = WINDOWS.find((x) => x.id === window);
    if (!w?.hours) return null;
    return new Date(Date.now() - w.hours * 3600 * 1000).toISOString();
  }, [window]);

  const list = useQuery({
    queryKey: ["blocked-link-attempts", cutoff],
    queryFn: async () => {
      let q = (supabase as any)
        .from("blocked_link_attempts")
        .select("id, user_id, endpoint, urls, content_preview, ip_hash, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (cutoff) q = q.gte("created_at", cutoff);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as BlockedAttempt[];
    },
  });

  const rows = list.data || [];
  const filtered = rows.filter((r) => {
    if (endpointFilter !== "all" && r.endpoint !== endpointFilter) return false;
    if (userFilter && r.user_id !== userFilter) return false;
    return true;
  });

  const stats = useMemo(() => {
    const byEndpoint = new Map<string, number>();
    const byUser = new Map<string, number>();
    for (const r of rows) {
      byEndpoint.set(r.endpoint, (byEndpoint.get(r.endpoint) ?? 0) + 1);
      if (r.user_id) byUser.set(r.user_id, (byUser.get(r.user_id) ?? 0) + 1);
    }
    return {
      total: rows.length,
      uniqueUsers: byUser.size,
      uniqueEndpoints: byEndpoint.size,
      byEndpoint: [...byEndpoint.entries()].sort((a, b) => b[1] - a[1]),
      repeatOffenders: [...byUser.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]),
    };
  }, [rows]);

  return (
    <main className="mx-auto max-w-5xl space-y-3 p-3 pb-24 sm:space-y-4 sm:p-4 lg:p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Badge variant="secondary" className="gap-1 mb-1">
            <ShieldAlert className="h-3.5 w-3.5" /> Security
          </Badge>
          <h1 className="text-xl font-bold sm:text-2xl">Blocked link attempts</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Server-side rejections from <code className="rounded bg-muted px-1">scanContentForLinks</code>. 200 most recent.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={window} onValueChange={setWindow}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {WINDOWS.map((w) => <SelectItem key={w.id} value={w.id}>{w.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => list.refetch()} disabled={list.isFetching}>
            {list.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Unique users" value={stats.uniqueUsers} />
        <StatCard label="Endpoints hit" value={stats.uniqueEndpoints} />
      </div>

      {stats.byEndpoint.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Most-attacked endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {stats.byEndpoint.map(([ep, n]) => (
                <button type="button"
                  key={ep}
                  onClick={() => setEndpointFilter(ep === endpointFilter ? "all" : ep)}
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition ${
                    endpointFilter === ep
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-card text-foreground/80 hover:border-primary/30"
                  }`}
                >
                  {ep} <span className="ml-1 opacity-70">{n}</span>
                </button>
              ))}
              {endpointFilter !== "all" && (
                <button type="button"
                  onClick={() => setEndpointFilter("all")}
                  className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-semibold text-muted-foreground"
                >
                  Clear filter
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {stats.repeatOffenders.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-700 dark:text-amber-400">Repeat offenders (3+ attempts)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {stats.repeatOffenders.slice(0, 10).map(([uid, n]) => (
              <div key={uid} className="flex items-center justify-between text-xs">
                <code className="rounded bg-background px-1.5 py-0.5">{uid}</code>
                <span className="font-semibold text-amber-700 dark:text-amber-400">{n} attempts</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>
              Recent rejections
              {endpointFilter !== "all" && <span className="ml-1 text-muted-foreground">— {endpointFilter}</span>}
              {userFilter && <span className="ml-1 text-muted-foreground">— user {userFilter.slice(0, 8)}…</span>}
            </span>
            {userFilter && (
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setUserFilter(null)}>
                Clear user filter
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {list.isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {!list.isLoading && filtered.length === 0 && (
            <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
              {(endpointFilter !== "all" || userFilter)
                ? "No matches for the current filter. Clear filters to see all attempts in this window."
                : "No blocked attempts in this window. The protections are doing their job — every recent submission was clean."}
            </p>
          )}
          {filtered.map((row) => (
            <div key={row.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="outline" className="text-[10px]">{row.endpoint}</Badge>
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                </span>
              </div>
              <div className="mt-1.5 space-y-1">
                {(row.urls || []).map((u, i) => (
                  <code key={i} className="block break-all rounded bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive">{u}</code>
                ))}
              </div>
              {row.content_preview && (
                <p className="mt-1.5 line-clamp-2 break-words text-[11px] italic text-muted-foreground">
                  "{row.content_preview}"
                </p>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                {row.user_id && (
                  <span className="inline-flex items-center gap-1">
                    user: <code className="rounded bg-muted px-1">{row.user_id.slice(0, 8)}…</code>
                    <Link
                      to={`/user/${row.user_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-primary hover:border-primary/40 hover:bg-primary/5"
                      title="Open profile in new tab"
                    >
                      <User className="h-3 w-3" /> profile
                      <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                    <button type="button"
                      onClick={() => setUserFilter(row.user_id)}
                      className="rounded border border-border bg-background px-1.5 py-0.5 text-primary hover:border-primary/40 hover:bg-primary/5"
                      title="Show only this user's attempts"
                    >
                      filter by user
                    </button>
                  </span>
                )}
                {row.ip_hash && <span>ip-hash: <code className="rounded bg-muted px-1">{row.ip_hash.slice(0, 12)}…</code></span>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold text-foreground sm:text-2xl">{value.toLocaleString()}</p>
    </div>
  );
}
