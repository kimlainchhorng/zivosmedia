import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ShieldAlert, Search, Ban, History, Loader2, ShieldCheck, Trash2, LogOut } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { scoreThreatHistory, type ThreatHistoryRow } from "@/lib/security/threatScoring";

type ThreatRow = ThreatHistoryRow;

const WINDOWS = [
  { id: "24h", label: "Last 24 hours", hours: 24 },
  { id: "7d",  label: "Last 7 days",   hours: 24 * 7 },
  { id: "30d", label: "Last 30 days",  hours: 24 * 30 },
];

const BLOCK_DURATIONS = [
  { id: "24h",  label: "24 hours", hours: 24 },
  { id: "7d",   label: "7 days",   hours: 24 * 7 },
  { id: "30d",  label: "30 days",  hours: 24 * 30 },
  { id: "perm", label: "Permanent", hours: null },
];

async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function severityBadge(s: string | null): string {
  switch (s) {
    case "critical": return "bg-red-500/15 text-red-700 border-red-400/40";
    case "high":
    case "error":    return "bg-orange-500/15 text-orange-700 border-orange-400/40";
    case "medium":
    case "warn":     return "bg-yellow-500/15 text-yellow-700 border-yellow-400/40";
    default:         return "bg-muted text-muted-foreground";
  }
}

export default function AdminThreatHistoryPage() {
  const queryClient = useQueryClient();

  const [rawIp, setRawIp]     = useState("");
  const [ipHash, setIpHash]   = useState("");
  const [userId, setUserId]   = useState("");
  const [windowId, setWindowId] = useState("7d");

  const [submitted, setSubmitted] = useState<{
    ip: string | null; hash: string | null; userId: string | null; hours: number;
  } | null>(null);

  const [blockDuration, setBlockDuration] = useState("7d");
  const [blockReason, setBlockReason]     = useState("");
  const [blockNotes, setBlockNotes]       = useState("");

  const onSearch = async () => {
    const ip   = rawIp.trim()   || null;
    const hash = ipHash.trim()  || (ip ? await sha256Hex(ip) : null);
    const uid  = userId.trim()  || null;

    if (!ip && !hash && !uid) {
      toast.error("Enter an IP, IP hash, or user ID");
      return;
    }
    const w = WINDOWS.find((x) => x.id === windowId)!;
    setSubmitted({ ip, hash, userId: uid, hours: w.hours });
  };

  const history = useQuery({
    enabled: submitted !== null,
    queryKey: ["threat-history", submitted],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_threat_history", {
        _ip_address: submitted!.ip,
        _ip_hash:    submitted!.hash,
        _user_id:    submitted!.userId,
        _hours:      submitted!.hours,
      });
      if (error) throw error;
      return (data || []) as ThreatRow[];
    },
  });

  const rows = history.data || [];
  const score = useMemo(() => scoreThreatHistory(rows), [rows]);

  const blockMutation = useMutation({
    mutationFn: async () => {
      if (!submitted?.hash) throw new Error("No IP hash to block");
      if (!blockReason.trim()) throw new Error("Reason is required");
      const dur = BLOCK_DURATIONS.find((d) => d.id === blockDuration)!;
      const expires_at = dur.hours ? new Date(Date.now() + dur.hours * 3600 * 1000).toISOString() : null;
      const { error } = await (supabase as any).from("ip_blocklist").insert({
        ip_hash: submitted.hash,
        reason: blockReason.trim(),
        notes: blockNotes.trim() || null,
        expires_at,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("IP added to blocklist");
      setBlockReason("");
      setBlockNotes("");
      queryClient.invalidateQueries({ queryKey: ["threat-history"] });
      queryClient.invalidateQueries({ queryKey: ["ip-blocklist"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to block IP"),
  });

  // Current blocklist
  const blocklist = useQuery({
    queryKey: ["ip-blocklist"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ip_blocklist")
        .select("id, ip_hash, reason, notes, created_at, expires_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as Array<{
        id: string; ip_hash: string; reason: string; notes: string | null;
        created_at: string; expires_at: string | null;
      }>;
    },
  });

  const unblockMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("ip_blocklist").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("IP unblocked");
      queryClient.invalidateQueries({ queryKey: ["ip-blocklist"] });
      queryClient.invalidateQueries({ queryKey: ["threat-history"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to unblock"),
  });

  const isExpired = (expiresAt: string | null) =>
    expiresAt !== null && new Date(expiresAt).getTime() <= Date.now();

  // ── User-account blocklist ───────────────────────────────────────────────
  const userBlocklist = useQuery({
    queryKey: ["user-blocklist"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_blocklist")
        .select("id, user_id, reason, notes, created_at, expires_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as Array<{
        id: string; user_id: string; reason: string; notes: string | null;
        created_at: string; expires_at: string | null;
      }>;
    },
  });

  const blockUserMutation = useMutation({
    mutationFn: async () => {
      if (!submitted?.userId) throw new Error("No user_id to block");
      if (!blockReason.trim()) throw new Error("Reason is required");
      const dur = BLOCK_DURATIONS.find((d) => d.id === blockDuration)!;
      const expires_at = dur.hours ? new Date(Date.now() + dur.hours * 3600 * 1000).toISOString() : null;
      const { error } = await (supabase as any).from("user_blocklist").upsert({
        user_id: submitted.userId,
        reason: blockReason.trim(),
        notes: blockNotes.trim() || null,
        expires_at,
      }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User account blocked");
      setBlockReason("");
      setBlockNotes("");
      queryClient.invalidateQueries({ queryKey: ["user-blocklist"] });
      queryClient.invalidateQueries({ queryKey: ["threat-history"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to block user"),
  });

  const unblockUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("user_blocklist").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User unblocked");
      queryClient.invalidateQueries({ queryKey: ["user-blocklist"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to unblock user"),
  });

  const forceLogoutMutation = useMutation({
    mutationFn: async (uid: string) => {
      const { data, error } = await (supabase as any)
        .rpc("admin_force_logout_user", { _user_id: uid });
      if (error) throw error;
      return (data ?? 0) as number;
    },
    onSuccess: (count) => {
      toast.success(`${count} session${count === 1 ? "" : "s"} revoked`);
    },
    onError: (e: any) => toast.error(e?.message || "Failed to force logout"),
  });

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-3 pb-24 sm:p-4 lg:p-6">
      <header className="flex items-center gap-3">
        <ShieldAlert className="h-6 w-6 text-orange-600" />
        <div>
          <h1 className="text-lg font-semibold">Threat history</h1>
          <p className="text-sm text-muted-foreground">
            Look up an IP or user&apos;s complete attacker history before deciding to block.
          </p>
        </div>
      </header>

      <Card>
        <CardHeader><CardTitle className="text-sm">Lookup</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="rawIp">Raw IP (will be hashed client-side)</Label>
            <Input id="rawIp" value={rawIp} onChange={(e) => setRawIp(e.target.value)} placeholder="203.0.113.42" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ipHash">…or IP hash (SHA-256 hex)</Label>
            <Input id="ipHash" value={ipHash} onChange={(e) => setIpHash(e.target.value)} placeholder="abc123…" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="userId">User ID (UUID)</Label>
            <Input id="userId" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="00000000-…" />
          </div>
          <div className="space-y-1">
            <Label>Window</Label>
            <Select value={windowId} onValueChange={setWindowId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WINDOWS.map((w) => <SelectItem key={w.id} value={w.id}>{w.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Button onClick={onSearch} disabled={history.isFetching} className="gap-2">
              {history.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Look up history
            </Button>
          </div>
        </CardContent>
      </Card>

      {submitted && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <History className="h-4 w-4" /> Aggregated signals
            </CardTitle>
            <Badge className={severityBadge(score >= 70 ? "critical" : score >= 30 ? "high" : score >= 10 ? "medium" : null)}>
              Threat score: {score}/100
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {history.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!history.isLoading && rows.length === 0 && (
              <p className="text-sm text-muted-foreground">No signals in window. Subject is clean.</p>
            )}
            {rows.map((r) => (
              <div key={r.source} className="rounded-md border bg-card p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs">{r.source}</span>
                  <div className="flex items-center gap-2">
                    {r.max_severity && <Badge className={severityBadge(r.max_severity)}>{r.max_severity}</Badge>}
                    <Badge variant="outline">{r.total_count} total</Badge>
                    <Badge variant="outline">{r.blocked_count} blocked</Badge>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Last seen {formatDistanceToNow(new Date(r.last_seen), { addSuffix: true })}
                </p>
                {Array.isArray(r.sample) && r.sample.length > 0 && (
                  <pre className="mt-2 max-h-48 overflow-auto rounded bg-muted/50 p-2 text-[11px]">
                    {JSON.stringify(r.sample, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {(submitted?.hash || submitted?.userId) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Ban className="h-4 w-4 text-red-600" /> Block subject
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Duration</Label>
                <Select value={blockDuration} onValueChange={setBlockDuration}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BLOCK_DURATIONS.map((d) => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="reason">Reason (required)</Label>
                <Input id="reason" value={blockReason} onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="credential_stuffing / phishing / scraper / …" />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea id="notes" value={blockNotes} onChange={(e) => setBlockNotes(e.target.value)}
                placeholder="Cross-ref: incident #1234, ticket Z-9876, …" rows={3} />
            </div>
            <div className="flex flex-wrap gap-2">
              {submitted?.hash && (
                <Button
                  variant="destructive"
                  className="gap-2"
                  disabled={blockMutation.isPending || !blockReason.trim()}
                  onClick={() => blockMutation.mutate()}
                >
                  {blockMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                  Block this IP
                </Button>
              )}
              {submitted?.userId && (
                <>
                  <Button
                    variant="destructive"
                    className="gap-2"
                    disabled={blockUserMutation.isPending || !blockReason.trim()}
                    onClick={() => blockUserMutation.mutate()}
                  >
                    {blockUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                    Block this user
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    disabled={forceLogoutMutation.isPending || !submitted.userId}
                    onClick={() => forceLogoutMutation.mutate(submitted.userId!)}
                  >
                    {forceLogoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                    Force logout
                  </Button>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              IP blocks: enforced by <code className="font-mono">withSecurity</code> on every edge function (~60s cache).
              User blocks: enforced by <code className="font-mono">enforceUserBlocklist()</code> in auth-aware handlers.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4" /> Active user blocklist
          </CardTitle>
          <Badge variant="outline">
            {userBlocklist.data ? userBlocklist.data.filter((b) => !isExpired(b.expires_at)).length : "—"} active
          </Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          {userBlocklist.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!userBlocklist.isLoading && (userBlocklist.data?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">No user accounts blocked.</p>
          )}
          {(userBlocklist.data ?? []).map((b) => {
            const expired = isExpired(b.expires_at);
            return (
              <div key={b.id}
                className={`flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm ${expired ? "opacity-60" : ""}`}>
                <span className="font-mono text-[11px]" title={b.user_id}>
                  {b.user_id.slice(0, 8)}…
                </span>
                <Badge className={severityBadge("high")}>{b.reason}</Badge>
                <span className="text-xs text-muted-foreground">
                  added {formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}
                </span>
                <span className="text-xs text-muted-foreground">
                  {b.expires_at
                    ? expired
                      ? `expired ${formatDistanceToNow(new Date(b.expires_at), { addSuffix: true })}`
                      : `expires ${formatDistanceToNow(new Date(b.expires_at), { addSuffix: true })}`
                    : "permanent"}
                </span>
                {b.notes && (
                  <span className="text-xs text-muted-foreground" title={b.notes}>
                    · {b.notes.length > 60 ? `${b.notes.slice(0, 60)}…` : b.notes}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setUserId(b.user_id);
                      setRawIp("");
                      setIpHash("");
                      setSubmitted({ ip: null, hash: null, userId: b.user_id,
                        hours: WINDOWS.find((w) => w.id === windowId)!.hours });
                    }}
                  >
                    History
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                    disabled={unblockUserMutation.isPending}
                    onClick={() => unblockUserMutation.mutate(b.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Unblock
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4" /> Active IP blocklist
          </CardTitle>
          <Badge variant="outline">
            {blocklist.data ? blocklist.data.filter((b) => !isExpired(b.expires_at)).length : "—"} active
          </Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          {blocklist.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!blocklist.isLoading && (blocklist.data?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">No IPs blocked.</p>
          )}
          {(blocklist.data ?? []).map((b) => {
            const expired = isExpired(b.expires_at);
            return (
              <div key={b.id}
                className={`flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm ${expired ? "opacity-60" : ""}`}>
                <span className="font-mono text-[11px]" title={b.ip_hash}>
                  {b.ip_hash.slice(0, 12)}…
                </span>
                <Badge className={severityBadge("high")}>{b.reason}</Badge>
                <span className="text-xs text-muted-foreground">
                  added {formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}
                </span>
                <span className="text-xs text-muted-foreground">
                  {b.expires_at
                    ? expired
                      ? `expired ${formatDistanceToNow(new Date(b.expires_at), { addSuffix: true })}`
                      : `expires ${formatDistanceToNow(new Date(b.expires_at), { addSuffix: true })}`
                    : "permanent"}
                </span>
                {b.notes && (
                  <span className="text-xs text-muted-foreground" title={b.notes}>
                    · {b.notes.length > 60 ? `${b.notes.slice(0, 60)}…` : b.notes}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIpHash(b.ip_hash);
                      setRawIp("");
                      setUserId("");
                      setSubmitted({ ip: null, hash: b.ip_hash, userId: null,
                        hours: WINDOWS.find((w) => w.id === windowId)!.hours });
                    }}
                  >
                    History
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                    disabled={unblockMutation.isPending}
                    onClick={() => unblockMutation.mutate(b.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Unblock
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </main>
  );
}
