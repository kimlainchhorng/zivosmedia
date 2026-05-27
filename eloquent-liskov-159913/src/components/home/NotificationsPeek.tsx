/**
 * NotificationsPeek — horizontal rail of recent cross-service signals.
 * Pulls the freshest 5 events across rides + food orders + flights + hotel
 * bookings + reservations and shows them as snackable mini-cards.
 *
 * Tapping a card jumps to the relevant tracking/detail page.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Bell from "lucide-react/dist/esm/icons/bell";
import Car from "lucide-react/dist/esm/icons/car";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import Plane from "lucide-react/dist/esm/icons/plane";
import BedDouble from "lucide-react/dist/esm/icons/bed-double";
import CalendarClock from "lucide-react/dist/esm/icons/calendar-clock";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type Kind = "ride" | "eats" | "flight" | "hotel" | "reservation";

interface Peek {
  id: string;
  kind: Kind;
  title: string;
  subtitle: string;
  ago: string;
  href: string;
}

const META: Record<Kind, { icon: LucideIcon; tone: string }> = {
  ride: { icon: Car, tone: "bg-emerald-500/15 text-emerald-600" },
  eats: { icon: UtensilsCrossed, tone: "bg-orange-500/15 text-orange-600" },
  flight: { icon: Plane, tone: "bg-sky-500/15 text-sky-600" },
  hotel: { icon: BedDouble, tone: "bg-violet-500/15 text-violet-600" },
  reservation: { icon: CalendarClock, tone: "bg-orange-500/15 text-orange-600" },
};

export default function NotificationsPeek() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Peek[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const trigger = () => {
      if (!cancelled) load().catch(() => {});
    };
    const load = async () => {
      const collected: { p: Peek; ts: number }[] = [];
      const sb = supabase as any;
      const [rides, orders, flights, hotels, reservations] = await Promise.all([
        sb
          .from("trips")
          .select("id,status,dropoff_address,updated_at,created_at")
          .eq("rider_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(3),
        sb
          .from("food_orders")
          .select("id,status,delivery_address,updated_at,created_at,restaurant_id")
          .eq("customer_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(3),
        sb
          .from("flight_bookings")
          .select("id,origin,destination,booking_reference,updated_at,created_at,departure_date")
          .eq("customer_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(2),
        sb
          .from("hotel_bookings")
          .select("id,hotel_name,city,check_in_date,updated_at,created_at")
          .eq("customer_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(2),
        sb
          .from("restaurant_reservations")
          .select("id,reservation_date,reservation_time,party_size,restaurant_id,updated_at,created_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(2),
      ]);

      const restaurantIds = (orders.data ?? [])
        .map((o: any) => o.restaurant_id)
        .concat((reservations.data ?? []).map((r: any) => r.restaurant_id))
        .filter(Boolean);
      const restaurantNameById = new Map<string, string>();
      if (restaurantIds.length) {
        const { data } = await supabase
          .from("restaurants")
          .select("id,name")
          .in("id", restaurantIds);
        (data ?? []).forEach((r: any) => restaurantNameById.set(r.id, r.name));
      }

      const push = (p: Peek, iso: string | null | undefined) => {
        const ts = iso ? new Date(iso).getTime() : 0;
        collected.push({ p, ts });
      };

      rides.data?.forEach((r: any) =>
        push(
          {
            id: `ride-${r.id}`,
            kind: "ride",
            title: humanizeRide(r.status),
            subtitle: r.dropoff_address ? shorten(r.dropoff_address) : "Ride update",
            ago: timeAgo(r.updated_at ?? r.created_at),
            href: `/rides/track/${r.id}`,
          },
          r.updated_at ?? r.created_at,
        ),
      );

      orders.data?.forEach((o: any) =>
        push(
          {
            id: `eats-${o.id}`,
            kind: "eats",
            title: humanizeOrder(o.status),
            subtitle: restaurantNameById.get(o.restaurant_id) ?? "Food order",
            ago: timeAgo(o.updated_at ?? o.created_at),
            href: `/eats/track/${o.id}`,
          },
          o.updated_at ?? o.created_at,
        ),
      );

      flights.data?.forEach((f: any) =>
        push(
          {
            id: `flt-${f.id}`,
            kind: "flight",
            title: `${f.origin} → ${f.destination}`,
            subtitle: f.booking_reference ?? "Flight",
            ago: timeAgo(f.updated_at ?? f.created_at),
            href: `/flights/confirmation/${f.id}`,
          },
          f.updated_at ?? f.created_at,
        ),
      );

      hotels.data?.forEach((h: any) =>
        push(
          {
            id: `htl-${h.id}`,
            kind: "hotel",
            title: h.hotel_name ?? "Hotel",
            subtitle: h.city ?? "Stay",
            ago: timeAgo(h.updated_at ?? h.created_at),
            href: "/trips",
          },
          h.updated_at ?? h.created_at,
        ),
      );

      reservations.data?.forEach((r: any) =>
        push(
          {
            id: `res-${r.id}`,
            kind: "reservation",
            title: `Table for ${r.party_size ?? 2}`,
            subtitle: restaurantNameById.get(r.restaurant_id) ?? "Reservation",
            ago: timeAgo(r.updated_at ?? r.created_at),
            href: r.restaurant_id ? `/eats/restaurant/${r.restaurant_id}` : "/eats",
          },
          r.updated_at ?? r.created_at,
        ),
      );

      collected.sort((a, b) => b.ts - a.ts);
      if (!cancelled) setItems(collected.slice(0, 6).map((x) => x.p));
    };

    load().catch(() => {
      if (!cancelled) setItems([]);
    });

    const channel = supabase
      .channel(`peek:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "trips", filter: `rider_id=eq.${user.id}` }, trigger)
      .on("postgres_changes", { event: "*", schema: "public", table: "food_orders", filter: `customer_id=eq.${user.id}` }, trigger)
      .on("postgres_changes", { event: "*", schema: "public", table: "flight_bookings", filter: `customer_id=eq.${user.id}` }, trigger)
      .on("postgres_changes", { event: "*", schema: "public", table: "hotel_bookings", filter: `customer_id=eq.${user.id}` }, trigger)
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_reservations", filter: `user_id=eq.${user.id}` }, trigger)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  if (!items.length) return null;

  return (
    <div className="pb-3">
      <div className="px-5 mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" /> Recent activity
        </h2>
        <button type="button"
          onClick={() => navigate("/activity")}
          className="text-[11px] text-primary font-bold flex items-center gap-0.5"
        >
          See all <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <div
        className="flex gap-2 overflow-x-auto scrollbar-hide px-5"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {items.map((p, i) => {
          const meta = META[p.kind];
          const Icon = meta.icon;
          return (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => navigate(p.href)}
              className="shrink-0 w-[220px] flex items-center gap-2.5 rounded-2xl border border-border/40 bg-card p-3 text-left active:scale-[0.99] transition-transform touch-manipulation"
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.tone}`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-bold text-foreground truncate">{p.title}</div>
                <div className="text-[10px] text-muted-foreground truncate">{p.subtitle}</div>
                <div className="text-[10px] text-muted-foreground/70">{p.ago}</div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function humanizeRide(status: string | null | undefined): string {
  switch (status) {
    case "accepted":
      return "Driver assigned";
    case "en_route":
      return "Driver on the way";
    case "arriving":
      return "Driver arriving";
    case "in_progress":
      return "Ride in progress";
    case "completed":
      return "Ride completed";
    case "cancelled":
      return "Ride cancelled";
    default:
      return status ? `Ride · ${status}` : "Ride";
  }
}

function humanizeOrder(status: string | null | undefined): string {
  switch (status) {
    case "confirmed":
      return "Order confirmed";
    case "preparing":
      return "Order preparing";
    case "ready":
      return "Ready for pickup";
    case "out_for_delivery":
      return "Out for delivery";
    case "delivered":
      return "Order delivered";
    case "cancelled":
      return "Order cancelled";
    default:
      return status ? `Order · ${status}` : "Order";
  }
}

function shorten(s: string, n = 32): string {
  if (!s) return "";
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000) return "just now";
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
