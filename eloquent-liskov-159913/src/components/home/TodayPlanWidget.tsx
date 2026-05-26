/**
 * TodayPlanWidget — at-a-glance "what's on today" card on AppHome.
 * Pulls scheduled items from today across the 4 verticals (reservation,
 * flight, hotel check-in, scheduled ride) and lays them out in a compact
 * timeline.
 *
 * Each row carries a "time-aware" CTA: e.g. when a 7pm reservation is in <2h
 * and there's no scheduled ride yet, surface "Get a ride now" so the user
 * makes it on time.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import CalendarClock from "lucide-react/dist/esm/icons/calendar-clock";
import Car from "lucide-react/dist/esm/icons/car";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import Plane from "lucide-react/dist/esm/icons/plane";
import BedDouble from "lucide-react/dist/esm/icons/bed-double";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type Kind = "reservation" | "ride" | "flight" | "hotel";

interface PlanEntry {
  id: string;
  kind: Kind;
  title: string;
  detail: string;
  /** Local time HH:MM, used for sorting and the time pill. */
  time: string | null;
  href: string;
  /** Minutes until the event. Used to show urgency. */
  minutesUntil: number | null;
  /** Drop-off / venue context for the ride CTA. */
  venue?: string | null;
}

const META: Record<Kind, { icon: LucideIcon; tone: string }> = {
  reservation: { icon: UtensilsCrossed, tone: "bg-orange-500/15 text-orange-600" },
  ride: { icon: Car, tone: "bg-emerald-500/15 text-emerald-600" },
  flight: { icon: Plane, tone: "bg-sky-500/15 text-sky-600" },
  hotel: { icon: BedDouble, tone: "bg-violet-500/15 text-violet-600" },
};

export default function TodayPlanWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<PlanEntry[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const load = async () => {
      const todayISO = new Date().toISOString().slice(0, 10);
      const next: PlanEntry[] = [];

      const sb = supabase as any;
      const [reservations, flights, hotels] = await Promise.all([
        sb
          .from("restaurant_reservations")
          .select("id,reservation_date,reservation_time,party_size,restaurant_id")
          .eq("user_id", user.id)
          .eq("reservation_date", todayISO),
        sb
          .from("flight_bookings")
          .select("id,origin,destination,departure_date,booking_reference")
          .eq("customer_id", user.id)
          .eq("departure_date", todayISO),
        sb
          .from("hotel_bookings")
          .select("id,hotel_name,city,check_in_date")
          .eq("customer_id", user.id)
          .eq("check_in_date", todayISO),
      ]);

      const restaurantIds = (reservations.data ?? []).map((r: any) => r.restaurant_id).filter(Boolean);
      const restaurantNameById = new Map<string, string>();
      if (restaurantIds.length) {
        const { data } = await supabase
          .from("restaurants")
          .select("id,name")
          .in("id", restaurantIds);
        (data ?? []).forEach((r: any) => restaurantNameById.set(r.id, r.name));
      }

      reservations.data?.forEach((r: any) => {
        const venue = restaurantNameById.get(r.restaurant_id) ?? "Restaurant";
        next.push({
          id: `res-${r.id}`,
          kind: "reservation",
          title: `Table at ${venue}`,
          detail: `${r.party_size ?? 2} guest${(r.party_size ?? 2) === 1 ? "" : "s"}`,
          time: trimTime(r.reservation_time),
          minutesUntil: minutesUntil(r.reservation_date, r.reservation_time),
          venue,
          href: `/eats/restaurant/${r.restaurant_id ?? ""}`,
        });
      });

      flights.data?.forEach((f: any) => {
        next.push({
          id: `flt-${f.id}`,
          kind: "flight",
          title: `${f.origin} → ${f.destination}`,
          detail: f.booking_reference ? `Ref ${f.booking_reference}` : "Departure today",
          time: null,
          minutesUntil: null,
          venue: f.origin,
          href: `/flights/confirmation/${f.id}`,
        });
      });

      hotels.data?.forEach((h: any) => {
        next.push({
          id: `htl-${h.id}`,
          kind: "hotel",
          title: `Check-in: ${h.hotel_name ?? "Hotel"}`,
          detail: h.city ?? "Today",
          time: null,
          minutesUntil: null,
          venue: h.hotel_name,
          href: "/trips",
        });
      });

      next.sort((a, b) => sortValue(a) - sortValue(b));
      if (!cancelled) setEntries(next);
    };
    load().catch(() => {
      if (!cancelled) setEntries([]);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const urgentReservation = useMemo(
    () =>
      entries.find(
        (e) => e.kind === "reservation" && e.minutesUntil != null && e.minutesUntil > 0 && e.minutesUntil <= 120,
      ),
    [entries],
  );

  if (!entries.length) return null;

  return (
    <div className="px-4 pb-3">
      <div className="rounded-3xl border border-border/50 bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <CalendarClock className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Today's plan</h2>
          <span className="ml-auto text-[11px] text-muted-foreground">
            {entries.length} item{entries.length === 1 ? "" : "s"}
          </span>
        </div>

        {urgentReservation && (
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() =>
              navigate(`/rides/hub?destination=${encodeURIComponent(urgentReservation.venue ?? "")}`)
            }
            className="w-full mb-3 flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-left active:scale-[0.99] transition-transform touch-manipulation"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
              <Car className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                In {urgentReservation.minutesUntil} min
              </div>
              <div className="text-sm font-bold text-foreground truncate">
                Get a ride now to make {urgentReservation.venue}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-700" />
          </motion.button>
        )}

        <div className="space-y-1">
          {entries.map((e) => {
            const m = META[e.kind];
            const Icon = m.icon;
            return (
              <button type="button"
                key={e.id}
                onClick={() => navigate(e.href)}
                className="w-full flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted/40 transition-colors text-left touch-manipulation"
              >
                <div
                  className={`w-9 h-9 rounded-xl ${m.tone} flex items-center justify-center shrink-0`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-foreground truncate">{e.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{e.detail}</div>
                </div>
                {e.time && (
                  <div className="text-[11px] font-bold text-foreground tabular-nums shrink-0">
                    {e.time}
                  </div>
                )}
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function trimTime(t: string | null | undefined): string | null {
  if (!t) return null;
  const m = String(t).match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : null;
}

function minutesUntil(date: string | null | undefined, time: string | null | undefined): number | null {
  if (!date) return null;
  const t = trimTime(time) ?? "12:00";
  try {
    const target = new Date(`${date}T${t}:00`);
    const diff = (target.getTime() - Date.now()) / 60_000;
    return Math.round(diff);
  } catch {
    return null;
  }
}

function sortValue(e: PlanEntry): number {
  if (e.minutesUntil != null) return e.minutesUntil;
  if (e.time) return parseInt(e.time.replace(":", ""), 10);
  return 9999;
}
