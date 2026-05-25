/**
 * Live order status at /cafe/order/:orderId.
 * Polls the cafe_public_order_status RPC every 8s so customers can watch
 * the status flip from pending → accepted → preparing → ready → served.
 *
 * Anonymous-friendly: the RPC is SECURITY DEFINER, so the URL alone is
 * enough to view status. (Don't share it with people you don't trust to
 * see ticket numbers.)
 */
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Coffee, Loader2, AlertCircle, CheckCircle2, ChefHat, Bell, ClipboardCheck,
  Receipt as ReceiptIcon, Clock, Star,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface StatusRow {
  id: string;
  ticket_number: number;
  status: "pending" | "accepted" | "preparing" | "ready" | "served" | "completed" | "cancelled" | "refunded";
  channel: string;
  table_label: string | null;
  placed_at: string;
  ready_at: string | null;
  served_at: string | null;
  total_cents: number;
  est_minutes: number;
}

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const STEPS = [
  { key: "pending", label: "Placed", Icon: ClipboardCheck },
  { key: "accepted", label: "Accepted", Icon: Bell },
  { key: "preparing", label: "Making", Icon: ChefHat },
  { key: "ready", label: "Ready", Icon: CheckCircle2 },
  { key: "served", label: "Served", Icon: Coffee },
] as const;

const STATUS_ORDER: Record<StatusRow["status"], number> = {
  pending: 0, accepted: 1, preparing: 2, ready: 3, served: 4, completed: 5, cancelled: -1, refunded: -1,
};

const POLL_MS = 8000;

// One-shot chime so the customer's phone pings even from inside a pocket.
// Same WebAudio approach as the KDS chime — no external asset needed.
function playReadyChime() {
  try {
    const Ctx = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(1320, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.18);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.36);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.65);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.7);
    osc.onended = () => { void ctx.close().catch(() => {}); };
  } catch { /* best-effort */ }
}

export default function CafeOrderStatusPage() {
  const { orderId = "" } = useParams<{ orderId: string }>();
  const [data, setData] = useState<StatusRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Track the status we already saw a celebration for so polling doesn't
  // re-fire the chime / vibration every 8s.
  const celebratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      const res = await supabase.rpc("cafe_public_order_status" as never, { p_order_id: orderId } as never);
      if (cancelled) return;
      if (res.error) {
        console.error("[CafeOrderStatusPage]", res.error);
        setError("Couldn't load order status.");
      } else {
        const rows = (res.data ?? []) as unknown as StatusRow[];
        if (rows.length === 0) {
          setError("Order not found.");
        } else {
          setData(rows[0]);
          setError(null);
        }
      }
      setLoading(false);
    };
    void fetchOnce();
    const t = setInterval(fetchOnce, POLL_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, [orderId]);

  // Fire the celebration exactly once when the order first flips to ready.
  // navigator.vibrate is best-effort: ignored on iOS Safari, works on Android.
  useEffect(() => {
    if (data?.status !== "ready" || celebratedRef.current) return;
    celebratedRef.current = true;
    try { navigator.vibrate?.([180, 80, 180]); } catch { /* noop */ }
    playReadyChime();
  }, [data?.status]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-2">
            <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
            <p className="text-sm text-muted-foreground">{error || "Order unavailable."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isCancelled = data.status === "cancelled" || data.status === "refunded";
  const currentStep = STATUS_ORDER[data.status];
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(data.placed_at).getTime()) / 60_000));

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-500/5 to-background pb-16 px-4 pt-6">
      <Helmet>
        <title>{data.status === "ready" ? "🔔 READY · " : ""}Order #{data.ticket_number} · Status</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-md mx-auto space-y-4">
        <div className="text-center">
          <div className="inline-grid h-16 w-16 mx-auto place-items-center rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
            {isCancelled
              ? <AlertCircle className="h-8 w-8" />
              : data.status === "ready"
                ? <Bell className="h-8 w-8 animate-pulse" />
                : <Coffee className="h-8 w-8" />}
          </div>
          <h1 className="mt-3 text-2xl font-bold">Order #{data.ticket_number}</h1>
          <div className="mt-1 flex items-center justify-center gap-2">
            <Badge variant={isCancelled ? "destructive" : "secondary"} className="text-[10px] uppercase">
              {data.status}
            </Badge>
            {data.table_label && <Badge variant="outline" className="text-[10px]">Table {data.table_label}</Badge>}
          </div>
        </div>

        {data.status === "ready" && (
          <div className="rounded-2xl border-2 border-emerald-500/60 bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-emerald-500/5 p-5 text-center shadow-lg shadow-emerald-500/10 animate-in fade-in zoom-in-95">
            <div className="grid h-14 w-14 mx-auto place-items-center rounded-full bg-emerald-500 text-white animate-pulse">
              <Bell className="h-7 w-7" />
            </div>
            <h2 className="mt-3 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              Your order is ready!
            </h2>
            <p className="text-sm text-emerald-700/80 dark:text-emerald-300/80 mt-1">
              {data.table_label
                ? `We'll bring it to Table ${data.table_label}.`
                : "Pick it up at the counter."}
            </p>
          </div>
        )}

        {!isCancelled ? (
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="space-y-3">
                {STEPS.map((step, idx) => {
                  const reached = currentStep >= idx;
                  const active = currentStep === idx;
                  return (
                    <div key={step.key} className={cn("flex items-center gap-3", !reached && "opacity-40")}>
                      <div className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-full",
                        active ? "bg-amber-500 text-white animate-pulse" :
                        reached ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" :
                        "bg-muted text-muted-foreground",
                      )}>
                        <step.Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className={cn("font-medium text-sm", active && "text-amber-700 dark:text-amber-300")}>
                          {step.label}
                        </p>
                        {active && (
                          <p className="text-[11px] text-muted-foreground">
                            {step.key === "pending" ? "Cafe just got it" :
                             step.key === "accepted" ? "Confirmed" :
                             step.key === "preparing" ? "Behind the bar" :
                             step.key === "ready" ? "Pick it up at the counter!" :
                             "Enjoy"}
                          </p>
                        )}
                      </div>
                      {step.key === "ready" && data.ready_at && (
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {new Date(data.ready_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-5 pb-4 text-center space-y-1">
              <p className="text-sm text-muted-foreground">This order was cancelled.</p>
              <p className="text-[11px] text-muted-foreground">Contact the cafe if you think this is a mistake.</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-4 pb-4 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Placed {elapsed} min ago</span>
            </div>
            <span className="font-semibold tabular-nums">{fmt(data.total_cents)}</span>
          </CardContent>
          {!isCancelled
            && data.est_minutes > 0
            && data.status !== "ready"
            && data.status !== "served"
            && data.status !== "completed"
            && (() => {
              const remaining = Math.max(0, data.est_minutes - elapsed);
              return (
                <CardContent className="pt-0 pb-4 -mt-1">
                  <div className="rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-[12px] text-amber-700 dark:text-amber-300 text-center">
                    {remaining === 0
                      ? "Should be ready any moment ☕"
                      : <>Est. ready in <span className="font-bold tabular-nums">~{remaining}</span> min</>}
                  </div>
                </CardContent>
              );
            })()}
        </Card>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="flex-1">
            <a href={`/cafe/receipt/${data.id}`} target="_blank" rel="noopener noreferrer">
              <ReceiptIcon className="h-4 w-4 mr-1" /> Receipt
            </a>
          </Button>
          {(data.status === "ready" || data.status === "served" || data.status === "completed") && (
            <Button asChild className="flex-1">
              <a href={`/cafe/review/${data.id}`}>
                <Star className="h-4 w-4 mr-1" /> Leave a review
              </a>
            </Button>
          )}
        </div>

        <p className="text-center text-[11px] text-muted-foreground">
          Updates every few seconds — no need to refresh.
        </p>
      </div>
    </div>
  );
}
