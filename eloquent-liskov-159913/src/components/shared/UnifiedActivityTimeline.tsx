/**
 * UnifiedActivityTimeline — single chronological feed mixing every vertical:
 * rides, eats orders, restaurant reservations, flights, hotel bookings.
 *
 * Each row shows: vertical icon + colored chip + title + when + status.
 * Tap routes back into the relevant tracking/detail page.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Car from "lucide-react/dist/esm/icons/car";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import Plane from "lucide-react/dist/esm/icons/plane";
import BedDouble from "lucide-react/dist/esm/icons/bed-double";
import CalendarClock from "lucide-react/dist/esm/icons/calendar-clock";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type Vertical = "ride" | "eats" | "reservation" | "flight" | "hotel";

interface ActivityItem {
  id: string;
  vertical: Vertical;
  title: string;
  subtitle?: string;
  status: string;
  occurredAt: string;
  href: string;
}

const META: Record<Vertical, { label: string; icon: LucideIcon; tone: string; ring: string }> = {
  ride: { label: "Ride", icon: Car, tone: "bg-emerald-500/15 text-emerald-600", ring: "ring-emerald-500/20" },
  eats: { label: "Order", icon: UtensilsCrossed, tone: "bg-orange-500/15 text-orange-600", ring: "ring-orange-500/20" },
  reservation: { label: "Reservation", icon: CalendarClock, tone: "bg-orange-500/15 text-orange-600", ring: "ring-orange-500/20" },
  flight: { label: "Flight", icon: Plane, tone: "bg-sky-500/15 text-sky-600", ring: "ring-sky-500/20" },
  hotel: { label: "Hotel", icon: BedDouble, tone: "bg-violet-500/15 text-violet-600", ring: "ring-violet-500/20" },
};

const FETCH_LIMIT = 8;

export default function UnifiedActivityTimeline() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const collected: ActivityItem[] = [];

      const sb = supabase as any;
      const [rides, orders, reservations, flights, hotels] = await Promise.all([
        sb
          .from("trips")
          .select("id,status,dropoff_address,pickup_address,created_at")
          .eq("rider_id", user.id)
          .order("created_at", { ascending: false })
          .limit(FETCH_LIMIT),
        sb
          .from("food_orders")
          .select("id,status,delivery_address,total_amount,created_at,restaurant_id")
          .eq("customer_id", user.id)
          .order("created_at", { ascending: false })
          .limit(FETCH_LIMIT),
        sb
          .from("restaurant_reservations")
          .select("id,status,reservation_date,reservation_time,party_size,restaurant_id,created_at")
          .eq("user_id", user.id)
          .order("reservation_date", { ascending: false })
          .limit(FETCH_LIMIT),
        sb
          .from("flight_bookings")
          .select("id,status:ticketing_status,origin,destination,departure_date,booking_reference,created_at")
          .eq("customer_id", user.id)
          .order("departure_date", { ascending: false })
          .limit(FETCH_LIMIT),
        sb
          .from("hotel_bookings")
          .select("id,status,hotel_name,city,check_in_date,check_out_date,created_at")
          .eq("customer_id", user.id)
          .order("check_in_date", { ascending: false })
          .limit(FETCH_LIMIT),
      ]);

      rides.data?.forEach((r: any) => {
        collected.push({
          id: `ride-${r.id}`,
          vertical: "ride",
          title: r.dropoff_address ? `To ${shorten(r.dropoff_address)}` : "Ride",
          subtitle: r.pickup_address ? `From ${shorten(r.pickup_address)}` : undefined,
          status: r.status,
          occurredAt: r.created_at,
          href: `/rides/track/${r.id}`,
        });
      });

      orders.data?.forEach((o: any) => {
        collected.push({
          id: `eats-${o.id}`,
          vertical: "eats",
          title: "Food order",
          subtitle: o.delivery_address ? shorten(o.delivery_address) : undefined,
          status: o.status,
          occurredAt: o.created_at,
          href: `/eats/track/${o.id}`,
        });
      });

      reservations.data?.forEach((res: any) => {
        const when =
          res.reservation_date && res.reservation_time
            ? `${res.reservation_date} ${res.reservation_time}`
            : res.created_at;
        collected.push({
          id: `res-${res.id}`,
          vertical: "reservation",
          title: `Table for ${res.party_size ?? 2}`,
          subtitle: res.reservation_date
            ? `${res.reservation_date} · ${res.reservation_time ?? ""}`
            : undefined,
          status: res.status ?? "confirmed",
          occurredAt: res.reservation_date
            ? new Date(`${res.reservation_date}T${res.reservation_time ?? "12:00"}:00`).toISOString()
            : res.created_at,
          href: res.restaurant_id
            ? `/eats/restaurant/${res.restaurant_id}`
            : "/eats",
        });
      });

      flights.data?.forEach((f: any) => {
        collected.push({
          id: `flt-${f.id}`,
          vertical: "flight",
          title: `${f.origin} → ${f.destination}`,
          subtitle: f.booking_reference ? `Ref ${f.booking_reference}` : undefined,
          status: f.status ?? "confirmed",
          occurredAt: f.departure_date ? `${f.departure_date}T00:00:00` : f.created_at,
          href: `/flights/confirmation/${f.id}`,
        });
      });

      hotels.data?.forEach((h: any) => {
        collected.push({
          id: `htl-${h.id}`,
          vertical: "hotel",
          title: h.hotel_name ?? "Hotel stay",
          subtitle: [h.city, h.check_in].filter(Boolean).join(" · "),
          status: h.status ?? "confirmed",
          occurredAt: h.check_in ? `${h.check_in}T00:00:00` : h.created_at,
          href: `/trips`,
        });
      });

      collected.sort(
        (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
      );

      if (!cancelled) {
        setItems(collected.slice(0, 20));
        setLoading(false);
      }
    };
    load().catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const grouped = useMemo(() => groupByDay(items), [items]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border/50 p-10 text-center">
        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
          <CalendarClock className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-bold text-foreground">No activity yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Book a ride, order food, or plan a trip to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {grouped.map(([day, rows]) => (
        <div key={day}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
            {day}
          </div>
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            {rows.map((it, i) => {
              const m = META[it.vertical];
              const Icon = m.icon;
              return (
                <motion.button
                  key={it.id}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => navigate(it.href)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors ${
                    i > 0 ? "border-t border-border/40" : ""
                  } touch-manipulation`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl ${m.tone} ring-1 ${m.ring} flex items-center justify-center shrink-0`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        {m.label}
                      </span>
                      <StatusPill status={it.status} />
                    </div>
                    <div className="text-sm font-bold text-foreground truncate">{it.title}</div>
                    {it.subtitle ? (
                      <div className="text-[11px] text-muted-foreground truncate">{it.subtitle}</div>
                    ) : null}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone = pillTone(status);
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${tone}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function pillTone(status: string): string {
  const s = status.toLowerCase();
  if (["delivered", "completed", "issued", "confirmed"].includes(s))
    return "bg-emerald-500/10 text-emerald-600";
  if (["cancelled", "failed", "refunded"].includes(s)) return "bg-red-500/10 text-red-600";
  if (
    ["pending", "preparing", "en_route", "out_for_delivery", "ready", "accepted", "arriving", "scheduled"].includes(s)
  )
    return "bg-amber-500/10 text-amber-600";
  return "bg-muted/50 text-muted-foreground";
}

function shorten(s: string, n = 36) {
  if (!s) return "";
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function groupByDay(items: ActivityItem[]): [string, ActivityItem[]][] {
  const buckets = new Map<string, ActivityItem[]>();
  for (const it of items) {
    const d = new Date(it.occurredAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const diffDays = Math.round((dayStart.getTime() - today.getTime()) / 86_400_000);
    let label: string;
    if (diffDays === 0) label = "Today";
    else if (diffDays === -1) label = "Yesterday";
    else if (diffDays === 1) label = "Tomorrow";
    else if (diffDays > 1) label = d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
    else label = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    const list = buckets.get(label) ?? [];
    list.push(it);
    buckets.set(label, list);
  }
  return Array.from(buckets.entries());
}
