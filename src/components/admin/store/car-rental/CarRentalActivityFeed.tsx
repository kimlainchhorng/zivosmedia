/**
 * Activity feed for the car-rental dashboard. Pulls last ~30 events from
 * reservations, reviews, maintenance, and expenses, merges them into a single
 * timeline, and re-fetches on realtime changes.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Activity, Loader2, Calendar, Star, Wrench, Wallet, KeyRound, ClipboardCheck, XCircle, AlertOctagon, ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props { storeId: string; onJumpToTab?: (tab: string) => void }

interface FeedEvent {
  id: string;
  kind: "booking" | "pickup" | "return" | "cancelled" | "no_show" | "review" | "maintenance" | "expense";
  title: string;
  detail: string;
  at: string;
  tab?: string;
}

const ago = (iso: string) => {
  const sec = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`;
  return `${Math.round(sec / 86400)}d ago`;
};
const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function CarRentalActivityFeed({ storeId, onJumpToTab }: Props) {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [res, rev, maint, exp] = await Promise.all([
      supabase.from("car_rental_reservations")
        .select("id, customer_name, vehicle_label, status, total_cents, created_at, picked_up_at, returned_at, cancelled_at, source")
        .eq("store_id", storeId).gte("created_at", cutoff).order("created_at", { ascending: false }).limit(30),
      supabase.from("car_rental_reviews")
        .select("id, customer_name, rating, created_at").eq("store_id", storeId).gte("created_at", cutoff)
        .order("created_at", { ascending: false }).limit(15),
      supabase.from("car_rental_maintenance")
        .select("id, description, cost_cents, created_at").eq("store_id", storeId).gte("created_at", cutoff)
        .order("created_at", { ascending: false }).limit(10),
      supabase.from("car_rental_expenses")
        .select("id, description, amount_cents, category, created_at").eq("store_id", storeId).gte("created_at", cutoff)
        .order("created_at", { ascending: false }).limit(10),
    ]);

    const out: FeedEvent[] = [];
    for (const r of (res.data ?? []) as any[]) {
      // Booking
      out.push({
        id: `book-${r.id}`, kind: "booking",
        title: r.source === "app" ? "New online booking" : "Reservation created",
        detail: `${r.customer_name} · ${r.vehicle_label} · ${formatMoney(r.total_cents)}`,
        at: r.created_at, tab: "car-rental-reservations",
      });
      // Pickup
      if (r.picked_up_at) out.push({
        id: `pickup-${r.id}`, kind: "pickup",
        title: "Keys handed over",
        detail: `${r.customer_name} · ${r.vehicle_label}`,
        at: r.picked_up_at, tab: "car-rental-returns",
      });
      // Return
      if (r.returned_at) out.push({
        id: `return-${r.id}`, kind: "return",
        title: "Vehicle returned",
        detail: `${r.customer_name} · ${r.vehicle_label} · ${formatMoney(r.total_cents)}`,
        at: r.returned_at, tab: "car-rental-income",
      });
      if (r.cancelled_at) out.push({
        id: `cancel-${r.id}`, kind: "cancelled",
        title: "Reservation cancelled",
        detail: `${r.customer_name} · ${r.vehicle_label}`,
        at: r.cancelled_at, tab: "car-rental-reservations",
      });
      if (r.status === "no_show") out.push({
        id: `noshow-${r.id}`, kind: "no_show",
        title: "No-show",
        detail: `${r.customer_name} · ${r.vehicle_label}`,
        at: r.created_at, tab: "car-rental-reservations",
      });
    }
    for (const v of (rev.data ?? []) as any[]) {
      out.push({
        id: `rev-${v.id}`, kind: "review",
        title: `${v.rating}-star review`,
        detail: v.customer_name,
        at: v.created_at, tab: "car-rental-reviews",
      });
    }
    for (const m of (maint.data ?? []) as any[]) {
      out.push({
        id: `maint-${m.id}`, kind: "maintenance",
        title: "Maintenance logged",
        detail: `${m.description} · ${formatMoney(m.cost_cents)}`,
        at: m.created_at, tab: "car-rental-maintenance",
      });
    }
    for (const e of (exp.data ?? []) as any[]) {
      out.push({
        id: `exp-${e.id}`, kind: "expense",
        title: "Expense recorded",
        detail: `${e.description} · ${formatMoney(e.amount_cents)} · ${e.category}`,
        at: e.created_at, tab: "car-rental-expenses",
      });
    }

    out.sort((a, b) => b.at.localeCompare(a.at));
    setEvents(out.slice(0, 30));
    setLoading(false);
  };

  useEffect(() => { void load(); }, [storeId]);

  useEffect(() => {
    const ch = supabase
      .channel(`car-rental-activity:${storeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "car_rental_reservations", filter: `store_id=eq.${storeId}` }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "car_rental_reviews", filter: `store_id=eq.${storeId}` }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const iconFor = (k: FeedEvent["kind"]) =>
    k === "booking" ? Calendar
    : k === "pickup" ? KeyRound
    : k === "return" ? ClipboardCheck
    : k === "cancelled" ? XCircle
    : k === "no_show" ? AlertOctagon
    : k === "review" ? Star
    : k === "maintenance" ? Wrench
    : Wallet;
  const toneFor = (k: FeedEvent["kind"]) =>
    k === "booking" ? "text-primary bg-primary/10"
    : k === "pickup" ? "text-emerald-600 bg-emerald-500/10"
    : k === "return" ? "text-emerald-600 bg-emerald-500/10"
    : k === "cancelled" ? "text-muted-foreground bg-muted"
    : k === "no_show" ? "text-amber-700 dark:text-amber-300 bg-amber-500/10"
    : k === "review" ? "text-amber-700 dark:text-amber-300 bg-amber-500/10"
    : k === "maintenance" ? "text-orange-600 bg-orange-500/10"
    : "text-rose-600 bg-rose-500/10";

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-5 w-5 text-primary" /> Recent activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : events.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Nothing happening yet. Bookings, returns, reviews and expenses will appear here.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {events.map((e) => {
              const Icon = iconFor(e.kind);
              return (
                <li key={e.id} className="flex items-start gap-3 p-3">
                  <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", toneFor(e.kind))}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{e.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{e.detail}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground self-center">{ago(e.at)}</span>
                  {e.tab && onJumpToTab && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onJumpToTab(e.tab!)}>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
