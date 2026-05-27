/**
 * AdminLodgingWebhookEventsPage
 * Admin viewer for the most recent processed Stripe webhook events on lodging
 * reservations. Supports filtering by event_type, processing_status, and
 * reservation id (free-text). Linked from the wiring-check page.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, RefreshCw, Webhook, AlertCircle, CheckCircle2, Clock, SkipForward, XCircle, Download,
} from "lucide-react";
import { toast } from "sonner";
import { downloadWebhookEventsCsv } from "@/lib/admin/webhookEventsCsv";

interface WebhookEvent {
  id: string;
  stripe_event_id: string;
  event_type: string;
  event_created_at: string | null;
  received_at: string;
  reservation_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_session_id: string | null;
  processing_status: "received" | "applied" | "skipped" | "error";
  error_message: string | null;
}

const statusConfig: Record<string, { tone: string; icon: typeof Clock; label: string }> = {
  received: { tone: "bg-amber-500/10 text-amber-600 border-amber-500/30", icon: Clock, label: "received" },
  applied: { tone: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", icon: CheckCircle2, label: "applied" },
  skipped: { tone: "bg-muted text-muted-foreground border-border", icon: SkipForward, label: "skipped" },
  error: { tone: "bg-destructive/10 text-destructive border-destructive/30", icon: XCircle, label: "error" },
};

export default function AdminLodgingWebhookEventsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [eventType, setEventType] = useState<string>(searchParams.get("type") || "");
  const [status, setStatus] = useState<string>(searchParams.get("status") || "");
  const [resId, setResId] = useState<string>(searchParams.get("reservation_id") || "");
  const [eventId, setEventId] = useState<string>(searchParams.get("event_id") || "");

  // Persist filters to query string
  useEffect(() => {
    const next = new URLSearchParams();
    if (eventType) next.set("type", eventType);
    if (status) next.set("status", status);
    if (resId) next.set("reservation_id", resId);
    if (eventId) next.set("event_id", eventId);
    setSearchParams(next, { replace: true });
  }, [eventType, status, resId, eventId, setSearchParams]);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["lodging-webhook-events", eventType, status, resId, eventId],
    queryFn: async () => {
      let q = (supabase as any)
        .from("lodging_stripe_webhook_events")
        .select("id, stripe_event_id, event_type, event_created_at, received_at, reservation_id, stripe_payment_intent_id, stripe_session_id, processing_status, error_message")
        .order("received_at", { ascending: false })
        .limit(200);
      if (eventType) q = q.eq("event_type", eventType);
      if (status) q = q.eq("processing_status", status);
      if (resId) q = q.eq("reservation_id", resId);
      if (eventId) q = q.eq("stripe_event_id", eventId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as WebhookEvent[];
    },
  });

  const handleExportCsv = () => {
    if (!data || data.length === 0) return;
    downloadWebhookEventsCsv(data);
    toast.success(`Exported ${data.length} event${data.length === 1 ? "" : "s"}`);
  };

  const eventTypes = useMemo(() => {
    const set = new Set<string>();
    (data || []).forEach((e) => set.add(e.event_type));
    return Array.from(set).sort();
  }, [data]);

  const totals = useMemo(() => {
    const out = { received: 0, applied: 0, skipped: 0, error: 0 };
    (data || []).forEach((e) => { (out as any)[e.processing_status]++; });
    return out;
  }, [data]);

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button aria-label="Back" variant="outline" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-ig-gradient flex items-center gap-2">
              <Webhook className="h-5 w-5 text-primary" /> Lodging webhook events
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Last 200 Stripe webhook events received for lodging reservations.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/lodging/wiring-check"
            className="text-[11px] text-primary hover:underline"
          >
            ← Wiring check
          </Link>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            disabled={!data || data.length === 0}
            className="rounded-xl"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching} className="rounded-xl">
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {(["applied", "received", "skipped", "error"] as const).map((k) => {
          const cfg = statusConfig[k];
          const Icon = cfg.icon;
          return (
            <Card key={k} className="rounded-2xl border-border/60">
              <CardContent className="p-3 flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{cfg.label}</p>
                  <p className="text-base font-bold text-foreground">{totals[k]}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="rounded-2xl border-border/60">
        <CardContent className="p-3 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Event type</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full h-8 rounded-xl border border-border bg-background text-[12px] px-2"
              >
                <option value="">All types</option>
                {eventTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-8 rounded-xl border border-border bg-background text-[12px] px-2"
              >
                <option value="">All statuses</option>
                <option value="received">received</option>
                <option value="applied">applied</option>
                <option value="skipped">skipped</option>
                <option value="error">error</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Reservation ID</label>
              <Input
                value={resId}
                onChange={(e) => setResId(e.target.value.trim())}
                placeholder="uuid"
                className="h-8 rounded-xl text-[12px]"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Stripe event ID</label>
              <Input
                value={eventId}
                onChange={(e) => setEventId(e.target.value.trim())}
                placeholder="evt_…"
                className="h-8 rounded-xl text-[12px] font-mono"
              />
            </div>
          </div>
          {(eventType || status || resId || eventId) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setEventType(""); setStatus(""); setResId(""); setEventId(""); }}
              className="text-[11px] h-7 rounded-lg"
            >
              Clear filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Events table */}
      <Card className="rounded-2xl border-border/60">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-[13px] font-semibold flex items-center gap-2">
            <Webhook className="h-3.5 w-3.5 text-muted-foreground" />
            Events ({data?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isFetching && !data ? (
            <p className="p-4 text-[12px] text-muted-foreground">Loading…</p>
          ) : !data || data.length === 0 ? (
            <p className="p-4 text-[12px] text-muted-foreground">No events match these filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Received</th>
                    <th className="text-left px-3 py-2 font-medium">Type</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                    <th className="text-left px-3 py-2 font-medium">Reservation</th>
                    <th className="text-left px-3 py-2 font-medium">PI</th>
                    <th className="text-left px-3 py-2 font-medium">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((e) => {
                    const cfg = statusConfig[e.processing_status] || statusConfig.received;
                    const Icon = cfg.icon;
                    return (
                      <tr key={e.id} className="border-t border-border/40 hover:bg-muted/30">
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                          {new Date(e.received_at).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px]">{e.event_type}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className={`rounded-full text-[10px] ${cfg.tone}`}>
                            <Icon className="h-2.5 w-2.5 mr-1" />
                            {cfg.label}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px]">
                          {e.reservation_id ? (
                            <button type="button"
                              onClick={() => setResId(e.reservation_id!)}
                              className="text-primary hover:underline"
                              title="Filter by this reservation"
                            >
                              {e.reservation_id.slice(0, 8)}…
                            </button>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                          {e.stripe_payment_intent_id ? `${e.stripe_payment_intent_id.slice(0, 14)}…` : "—"}
                        </td>
                        <td className="px-3 py-2 text-destructive max-w-[220px] truncate" title={e.error_message || ""}>
                          {e.error_message ? (
                            <span className="inline-flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> {e.error_message}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
