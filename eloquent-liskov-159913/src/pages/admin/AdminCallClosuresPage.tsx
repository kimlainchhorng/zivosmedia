import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/app/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface AuditRow {
  id: string;
  ride_request_id: string | null;
  twilio_proxy_session_sid: string | null;
  closure_source: string;
  twilio_status: string;
  twilio_response_code: number | null;
  error_message: string | null;
  attempt_number: number;
  created_at: string;
}

const RANGES: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30 };

export default function AdminCallClosuresPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [range, setRange] = useState<string>("24h");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [retryingRide, setRetryingRide] = useState<string | null>(null);

  const sinceISO = useMemo(
    () => new Date(Date.now() - RANGES[range] * 86400_000).toISOString(),
    [range],
  );

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("call_session_closure_audit")
      .select("*")
      .gte("created_at", sinceISO)
      .order("created_at", { ascending: false })
      .limit(500);
    if (source !== "all") q = q.eq("closure_source", source);
    if (status === "success") q = q.in("twilio_status", ["closed", "not_found"]);
    if (status === "error") q = q.eq("twilio_status", "error");
    const { data } = await q;
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [source, status, range]);

  useEffect(() => {
    const ch = supabase
      .channel("call-closure-audit")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_session_closure_audit" }, (payload) => {
        setRows((prev) => [payload.new as AuditRow, ...prev].slice(0, 500));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const retryClose = async (rideId: string) => {
    setRetryingRide(rideId);
    const { error } = await supabase.functions.invoke("close-ride-call-session", {
      body: { ride_request_id: rideId, closure_source: "manual" },
    });
    setRetryingRide(null);
    if (error) toast.error("Retry failed");
    else { toast.success("Retry queued"); load(); }
  };

  const statusBadge = (s: string) => {
    if (s === "closed") return <Badge className="bg-emerald-500/15 text-emerald-600 border-0">closed</Badge>;
    if (s === "not_found") return <Badge className="bg-muted text-muted-foreground border-0">not found</Badge>;
    if (s === "error") return <Badge className="bg-destructive/15 text-destructive border-0">error</Badge>;
    return <Badge variant="outline">{s}</Badge>;
  };

  return (
    <AppLayout title="Call Closures Audit">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Masked-call session closures</h1>
          <p className="text-sm text-muted-foreground">Audit log of every Twilio Proxy session teardown attempt.</p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="trigger">Trigger (immediate)</SelectItem>
              <SelectItem value="cron">Cron (5-min)</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="terminal_status_guard">Terminal guard</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>

        {loading ? (
          <div className="p-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
        ) : rows.length === 0 ? (
          <Card className="p-12 text-center text-sm text-muted-foreground">No closures in this window.</Card>
        ) : (
          <div className="space-y-1.5">
            {rows.map((r) => {
              const isOpen = expanded === r.id;
              return (
                <Card key={r.id} className="p-3 text-sm">
                  <button type="button"
                    className="w-full flex items-center gap-3 text-left"
                    onClick={() => setExpanded(isOpen ? null : r.id)}
                  >
                    {isOpen ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                    <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">{r.ride_request_id?.slice(0, 8) || "—"}</span>
                    <span className="font-mono text-xs text-muted-foreground w-24 shrink-0 truncate">{r.twilio_proxy_session_sid?.slice(0, 12) || "—"}</span>
                    <Badge variant="outline" className="text-[10px]">{r.closure_source}</Badge>
                    {statusBadge(r.twilio_status)}
                    <span className="text-[11px] text-muted-foreground">attempt #{r.attempt_number}</span>
                    {r.twilio_response_code !== null && <span className="text-[11px] text-muted-foreground">HTTP {r.twilio_response_code}</span>}
                    <span className="ml-auto text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                  </button>
                  {isOpen && (
                    <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
                      {r.error_message && (
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground mb-1">Error</p>
                          <pre className="text-[11px] bg-muted/50 p-2 rounded whitespace-pre-wrap break-words">{r.error_message}</pre>
                        </div>
                      )}
                      <div className="text-[11px] text-muted-foreground space-y-0.5">
                        <div>Ride ID: <span className="font-mono">{r.ride_request_id}</span></div>
                        <div>Session SID: <span className="font-mono">{r.twilio_proxy_session_sid}</span></div>
                      </div>
                      {r.ride_request_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={retryingRide === r.ride_request_id}
                          onClick={() => retryClose(r.ride_request_id!)}
                          className="gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Manual close retry
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
