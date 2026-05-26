import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, RefreshCw, RotateCcw, Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

type QueueRow = {
  id: string;
  kind: string;
  identifier: string | null;
  user_id: string | null;
  payload: Record<string, unknown> | null;
  status: "pending" | "in_flight" | "sent" | "failed";
  attempts: number;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
  available_at: string;
};

const STATUS_BADGES: Record<QueueRow["status"], string> = {
  pending:   "bg-blue-500/10 text-blue-700 border-blue-400/30",
  in_flight: "bg-yellow-500/15 text-yellow-700 border-yellow-400/40",
  sent:      "bg-emerald-500/15 text-emerald-700 border-emerald-400/40",
  failed:    "bg-red-500/15 text-red-700 border-red-400/40",
};

const WINDOWS = [
  { id: "24h", label: "Last 24 hours", hours: 24 },
  { id: "7d",  label: "Last 7 days",   hours: 24 * 7 },
  { id: "30d", label: "Last 30 days",  hours: 24 * 30 },
];

export default function AdminSecurityNotificationsPage() {
  const queryClient = useQueryClient();
  const [windowId, setWindowId] = useState("24h");
  const [statusFilter, setStatusFilter] = useState<"all" | QueueRow["status"]>("all");

  const cutoff = useMemo(() => {
    const w = WINDOWS.find((x) => x.id === windowId)!;
    return new Date(Date.now() - w.hours * 3600 * 1000).toISOString();
  }, [windowId]);

  const list = useQuery({
    queryKey: ["security-notifications-queue", cutoff, statusFilter],
    queryFn: async () => {
      let q = (supabase as any)
        .from("security_notification_queue")
        .select("id, kind, identifier, user_id, payload, status, attempts, last_error, created_at, sent_at, available_at")
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(500);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as QueueRow[];
    },
  });

  const rows = list.data || [];

  const stats = useMemo(() => {
    const counts = { pending: 0, in_flight: 0, sent: 0, failed: 0 } as Record<QueueRow["status"], number>;
    for (const r of rows) counts[r.status]++;
    return counts;
  }, [rows]);

  // "Retry all failed" — flip them back to pending so the worker re-attempts.
  const retryAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("security_notification_queue")
        .update({ status: "pending", available_at: new Date().toISOString(), attempts: 0, last_error: null })
        .eq("status", "failed")
        .gte("created_at", cutoff);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Failed notifications requeued");
      queryClient.invalidateQueries({ queryKey: ["security-notifications-queue"] });
    },
    onError: (e: any) => toast.error(e?.message || "Retry failed"),
  });

  // Manual "drain now" — fires the worker once.
  const drainMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any).functions.invoke(
        "process-security-notifications",
        { body: { limit: 100 } },
      );
      if (error) throw error;
      return data as { sent: number; failed: number; attempted: number };
    },
    onSuccess: (data) => {
      toast.success(`Drain: ${data.sent} sent, ${data.failed} failed of ${data.attempted}`);
      queryClient.invalidateQueries({ queryKey: ["security-notifications-queue"] });
    },
    onError: (e: any) => toast.error(e?.message || "Drain failed"),
  });

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-3 pb-24 sm:p-4 lg:p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Mail className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-lg font-semibold">Security notifications queue</h1>
            <p className="text-sm text-muted-foreground">
              New-device login alerts and other queued security emails. Drained by <code className="font-mono">process-security-notifications</code>.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => list.refetch()} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${list.isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button
            variant="outline" size="sm"
            disabled={drainMutation.isPending}
            onClick={() => drainMutation.mutate()}
            className="gap-2"
          >
            <Play className="h-4 w-4" /> Drain now
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {(["pending", "in_flight", "sent", "failed"] as const).map((s) => (
          <Card key={s}><CardContent className="p-3">
            <p className="text-xs text-muted-foreground">{s.replace("_", " ")}</p>
            <p className={`text-2xl font-semibold ${s === "failed" ? "text-red-600" : s === "sent" ? "text-emerald-600" : ""}`}>
              {stats[s]}
            </p>
          </CardContent></Card>
        ))}
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
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm">Filter</CardTitle>
          {stats.failed > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={retryAllMutation.isPending}
              onClick={() => retryAllMutation.mutate()}
            >
              <RotateCcw className="h-4 w-4" /> Retry all failed ({stats.failed})
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(["all", "pending", "in_flight", "failed", "sent"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}
            >
              {s === "all" ? "all" : s.replace("_", " ")}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Recent ({rows.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {list.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!list.isLoading && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">Queue is empty.</p>
          )}
          {rows.map((r) => (
            <div key={r.id} className="rounded-md border bg-card p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs">{r.kind}</span>
                <Badge className={STATUS_BADGES[r.status]}>{r.status}</Badge>
                {r.attempts > 0 && <Badge variant="outline">{r.attempts} attempt{r.attempts === 1 ? "" : "s"}</Badge>}
                <span className="ml-auto text-xs text-muted-foreground">
                  created {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                </span>
              </div>
              {r.identifier && (
                <p className="mt-1 font-mono text-[11px]" title={r.identifier}>
                  to: {r.identifier}
                </p>
              )}
              {r.last_error && (
                <p className="mt-1 break-all rounded bg-red-500/10 p-1.5 text-[11px] text-red-700">
                  error: {r.last_error}
                </p>
              )}
              {r.payload && Object.keys(r.payload).length > 0 && (
                <pre className="mt-2 max-h-32 overflow-auto rounded bg-muted/50 p-2 text-[11px]">
                  {JSON.stringify(r.payload, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
