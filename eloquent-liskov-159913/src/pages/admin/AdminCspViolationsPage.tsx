import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldAlert, RefreshCw, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type CspRow = {
  id: string;
  document_uri: string | null;
  violated_directive: string | null;
  blocked_uri: string | null;
  source_file: string | null;
  line_number: number | null;
  user_agent: string | null;
  created_at: string;
};

const WINDOWS = [
  { id: "1h",  label: "Last hour",     hours: 1 },
  { id: "24h", label: "Last 24 hours", hours: 24 },
  { id: "7d",  label: "Last 7 days",   hours: 24 * 7 },
  { id: "30d", label: "Last 30 days",  hours: 24 * 30 },
];

export default function AdminCspViolationsPage() {
  const [windowId, setWindowId] = useState("24h");
  const [directiveFilter, setDirectiveFilter] = useState<string>("all");

  const cutoff = useMemo(() => {
    const w = WINDOWS.find((x) => x.id === windowId)!;
    return new Date(Date.now() - w.hours * 3600 * 1000).toISOString();
  }, [windowId]);

  const list = useQuery({
    queryKey: ["csp-violations", cutoff],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("csp_violations")
        .select("id, document_uri, violated_directive, blocked_uri, source_file, line_number, user_agent, created_at")
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as CspRow[];
    },
  });

  const rows = list.data || [];

  const stats = useMemo(() => {
    const byDirective = new Map<string, number>();
    const byHost = new Map<string, number>();
    for (const r of rows) {
      const dir = r.violated_directive || "unknown";
      byDirective.set(dir, (byDirective.get(dir) ?? 0) + 1);
      try {
        if (r.blocked_uri) {
          const host = new URL(r.blocked_uri).host || r.blocked_uri;
          byHost.set(host, (byHost.get(host) ?? 0) + 1);
        }
      } catch { /* not a URL */ }
    }
    return {
      total: rows.length,
      directives: [...byDirective.entries()].sort((a, b) => b[1] - a[1]),
      hosts: [...byHost.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10),
    };
  }, [rows]);

  const filtered = directiveFilter === "all"
    ? rows
    : rows.filter((r) => (r.violated_directive || "unknown") === directiveFilter);

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-3 pb-24 sm:p-4 lg:p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-orange-600" />
          <div>
            <h1 className="text-lg font-semibold">CSP violations</h1>
            <p className="text-sm text-muted-foreground">
              Browser-reported Content-Security-Policy blocks. Tune <code className="font-mono">public/_headers</code> only after verifying these aren&apos;t legitimate XSS attempts.
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
          <p className="text-xs text-muted-foreground">Directives</p>
          <p className="text-2xl font-semibold">{stats.directives.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Distinct hosts blocked</p>
          <p className="text-2xl font-semibold">{stats.hosts.length}</p>
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

      {stats.directives.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">By directive</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={directiveFilter === "all" ? "default" : "outline"}
              onClick={() => setDirectiveFilter("all")}
            >
              all ({stats.total})
            </Button>
            {stats.directives.map(([dir, n]) => (
              <Button
                key={dir}
                size="sm"
                variant={directiveFilter === dir ? "default" : "outline"}
                onClick={() => setDirectiveFilter(dir)}
              >
                {dir} ({n})
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {stats.hosts.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Top blocked hosts</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {stats.hosts.map(([host, n]) => (
              <div key={host} className="flex items-center justify-between text-sm">
                <span className="font-mono text-xs">{host}</span>
                <Badge variant="outline">{n}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" /> Recent ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {list.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!list.isLoading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">No violations in window. CSP is happy.</p>
          )}
          {filtered.map((r) => (
            <div key={r.id} className="rounded-md border bg-card p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{r.violated_directive ?? "unknown"}</Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                </span>
              </div>
              {r.blocked_uri && (
                <p className="mt-1 break-all font-mono text-[11px]">
                  blocked: <span className="text-red-600">{r.blocked_uri}</span>
                </p>
              )}
              {r.document_uri && (
                <p className="break-all font-mono text-[11px] text-muted-foreground">
                  document: {r.document_uri}
                </p>
              )}
              {(r.source_file || r.line_number) && (
                <p className="font-mono text-[11px] text-muted-foreground">
                  source: {r.source_file ?? "—"}{r.line_number ? `:${r.line_number}` : ""}
                </p>
              )}
              {r.user_agent && (
                <p className="truncate font-mono text-[11px] text-muted-foreground/70" title={r.user_agent}>
                  ua: {r.user_agent}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
