/**
 * SalonActivityFeed — a 7-day rolling feed of meaningful events:
 *   - new bookings (with source: public site vs. owner-created)
 *   - completed checkouts (with revenue)
 *   - cancellations / no-shows
 *   - new reviews
 * Pure read from existing tables; no new schema.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Activity, Loader2, AlertCircle, CalendarPlus, CheckCircle2,
  XCircle, AlarmClockOff, Star, ExternalLink, Sparkles, Globe,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";

interface ActivityEvent {
  id: string;
  ts: number; // epoch ms
  kind: "booked" | "public_booked" | "completed" | "cancelled" | "no_show" | "review";
  title: string;
  detail?: string;
  amountCents?: number;
  rating?: number;
}

interface SalonActivityFeedProps {
  storeId: string;
  onJumpToTab?: (tab: string) => void;
}

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const friendlyAge = (ts: number) => {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(ts).toLocaleDateString();
};

const ICON: Record<ActivityEvent["kind"], { Icon: typeof Activity; tone: string }> = {
  booked: { Icon: CalendarPlus, tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  public_booked: { Icon: Globe, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  completed: { Icon: CheckCircle2, tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  cancelled: { Icon: XCircle, tone: "bg-muted text-muted-foreground" },
  no_show: { Icon: AlarmClockOff, tone: "bg-destructive/15 text-destructive" },
  review: { Icon: Star, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
};

export default function SalonActivityFeed({ storeId, onJumpToTab }: SalonActivityFeedProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [bookingsRes, reviewsRes] = await Promise.all([
        supabase.from("salon_bookings")
          .select("id, client_name, service_name, source, status, price_cents, addons_total_cents, tip_cents, created_at, updated_at, cancelled_at, start_at")
          .eq("store_id", storeId)
          .gte("updated_at", sevenDaysAgo)
          .order("updated_at", { ascending: false })
          .limit(30),
        supabase.from("salon_reviews")
          .select("id, client_name, rating_stars, comment, created_at")
          .eq("store_id", storeId)
          .gte("created_at", sevenDaysAgo)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      if (cancelled) return;
      if (bookingsRes.error || reviewsRes.error) {
        console.error(bookingsRes.error || reviewsRes.error);
        setError("Couldn't load activity.");
        setLoading(false);
        return;
      }

      const evts: ActivityEvent[] = [];
      for (const b of (bookingsRes.data ?? []) as any[]) {
        const status = b.status as BookingStatus;
        if (status === "completed") {
          evts.push({
            id: `${b.id}-completed`,
            ts: new Date(b.updated_at).getTime(),
            kind: "completed",
            title: `${b.client_name} checked out`,
            detail: b.service_name,
            amountCents: b.price_cents + (b.addons_total_cents ?? 0) + (b.tip_cents ?? 0),
          });
        } else if (status === "cancelled") {
          evts.push({
            id: `${b.id}-cancelled`,
            ts: new Date(b.cancelled_at ?? b.updated_at).getTime(),
            kind: "cancelled",
            title: `${b.client_name} cancelled`,
            detail: b.service_name,
          });
        } else if (status === "no_show") {
          evts.push({
            id: `${b.id}-noshow`,
            ts: new Date(b.updated_at).getTime(),
            kind: "no_show",
            title: `${b.client_name} marked no-show`,
            detail: b.service_name,
          });
        } else {
          // pending or confirmed → treat as a "booked" event using created_at
          evts.push({
            id: `${b.id}-booked`,
            ts: new Date(b.created_at).getTime(),
            kind: b.source === "app" ? "public_booked" : "booked",
            title: b.source === "app" ? `Public request: ${b.client_name}` : `${b.client_name} booked`,
            detail: `${b.service_name} · ${new Date(b.start_at).toLocaleDateString()}`,
          });
        }
      }
      for (const r of (reviewsRes.data ?? []) as any[]) {
        evts.push({
          id: `review-${r.id}`,
          ts: new Date(r.created_at).getTime(),
          kind: "review",
          title: `${r.client_name} left a ${r.rating_stars}★ review`,
          detail: r.comment ? `"${(r.comment as string).slice(0, 80)}${(r.comment as string).length > 80 ? "…" : ""}"` : undefined,
          rating: r.rating_stars,
        });
      }
      evts.sort((a, b) => b.ts - a.ts);
      setEvents(evts.slice(0, 15));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [storeId]);

  const counts = useMemo(() => {
    const c = { public: 0, completed: 0, cancelled: 0, reviews: 0 };
    for (const e of events) {
      if (e.kind === "public_booked") c.public++;
      else if (e.kind === "completed") c.completed++;
      else if (e.kind === "cancelled" || e.kind === "no_show") c.cancelled++;
      else if (e.kind === "review") c.reviews++;
    }
    return c;
  }, [events]);

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-5 w-5 text-primary" /> Recent activity
        </CardTitle>
        <span className="text-[11px] text-muted-foreground">last 7 days</span>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 p-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            <Sparkles className="mx-auto mb-2 h-5 w-5 text-muted-foreground/70" />
            Nothing happening yet — once you start taking bookings, the feed will fill up.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
              <Pill label="Public requests" value={counts.public} active={counts.public > 0} onClick={() => onJumpToTab?.("salon-bookings")} />
              <Pill label="Completed" value={counts.completed} />
              <Pill label="Cancelled" value={counts.cancelled} />
              <Pill label="Reviews" value={counts.reviews} onClick={() => onJumpToTab?.("salon-reviews")} />
            </div>

            <ul className="divide-y divide-border rounded-xl border border-border">
              {events.map((e) => {
                const meta = ICON[e.kind];
                return (
                  <li key={e.id} className="flex items-center gap-3 p-3">
                    <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", meta.tone)}>
                      <meta.Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{e.title}</p>
                      {e.detail && <p className="truncate text-xs text-muted-foreground">{e.detail}</p>}
                    </div>
                    <div className="shrink-0 text-right text-[11px]">
                      {e.amountCents != null && <p className="font-semibold text-foreground">{formatPrice(e.amountCents)}</p>}
                      <p className="text-muted-foreground">{friendlyAge(e.ts)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>

            {onJumpToTab && (
              <Button variant="ghost" size="sm" className="w-full gap-1.5" onClick={() => onJumpToTab("salon-bookings")}>
                Open Bookings <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Pill({ label, value, active, onClick }: { label: string; value: number; active?: boolean; onClick?: () => void }) {
  const inner = (
    <div className={cn(
      "rounded-lg border px-2 py-1.5 text-center",
      active ? "border-primary/30 bg-primary/8" : "border-border bg-card"
    )}>
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
  if (onClick && value > 0) {
    return <button type="button" onClick={onClick} className="text-left">{inner}</button>;
  }
  return inner;
}
