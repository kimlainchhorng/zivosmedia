/**
 * ServicesHubGrid — Unified 4-service launcher (Rides / Eats / Flights / Hotels)
 * Each tile shows the user's current state for that vertical (active ride,
 * open order, upcoming flight, upcoming hotel) plus a clear primary CTA.
 *
 * Designed to feel like an Uber/Grab super-app front door: one glance, four
 * services, every workflow one tap away.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Car from "lucide-react/dist/esm/icons/car";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import Plane from "lucide-react/dist/esm/icons/plane";
import BedDouble from "lucide-react/dist/esm/icons/bed-double";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import CalendarClock from "lucide-react/dist/esm/icons/calendar-clock";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCountry } from "@/hooks/useCountry";

type ServiceKey = "rides" | "eats" | "flights" | "hotels";

interface ServiceState {
  status: string | null;
  href: string;
}

interface ServiceTile {
  key: ServiceKey;
  label: string;
  tagline: string;
  icon: LucideIcon;
  href: string;
}

const TILES: ServiceTile[] = [
  { key: "rides", label: "Rides", tagline: "Get a car in minutes", icon: Car, href: "/rides/hub" },
  { key: "eats", label: "Eats", tagline: "Order or reserve a table", icon: UtensilsCrossed, href: "/eats" },
  { key: "flights", label: "Flights", tagline: "Search & book worldwide", icon: Plane, href: "/flights" },
  { key: "hotels", label: "Hotels", tagline: "Stays in our network", icon: BedDouble, href: "/hotels" },
];

export default function ServicesHubGrid() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isCambodia } = useCountry();
  const visibleTiles = isCambodia ? TILES : TILES.filter((t) => t.key !== "rides");
  const [state, setState] = useState<Record<ServiceKey, ServiceState>>({
    rides: { status: null, href: "/rides/hub" },
    eats: { status: null, href: "/eats" },
    flights: { status: null, href: "/flights" },
    hotels: { status: null, href: "/hotels" },
  });

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const load = async () => {
      const next: Record<ServiceKey, ServiceState> = {
        rides: { status: null, href: "/rides/hub" },
        eats: { status: null, href: "/eats" },
        flights: { status: null, href: "/flights" },
        hotels: { status: null, href: "/hotels" },
      };

      const sb = supabase as any;
      const [ride, food, flight, hotel] = await Promise.all([
        sb
          .from("trips")
          .select("id,status")
          .eq("rider_id", user.id)
          .in("status", ["accepted", "en_route", "arriving"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        sb
          .from("food_orders")
          .select("id,status")
          .eq("customer_id", user.id)
          .in("status", ["confirmed", "preparing", "ready", "out_for_delivery"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        sb
          .from("flight_bookings")
          .select("id,departure_date")
          .eq("customer_id", user.id)
          .gte("departure_date", new Date().toISOString().slice(0, 10))
          .order("departure_date", { ascending: true })
          .limit(1)
          .maybeSingle(),
        sb
          .from("hotel_bookings")
          .select("id,check_in_date")
          .eq("customer_id", user.id)
          .gte("check_in_date", new Date().toISOString().slice(0, 10))
          .order("check_in_date", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

      if (ride?.data) {
        next.rides.status = "Live · tap to track";
        next.rides.href = `/rides/track/${ride.data.id}`;
      }
      if (food?.data) {
        next.eats.status = "Order in progress";
        next.eats.href = `/eats/track/${food.data.id}`;
      }
      if (flight?.data?.departure_date) {
        const days = daysUntil(flight.data.departure_date);
        next.flights.status = days <= 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;
        next.flights.href = "/trips";
      }
      if (hotel?.data?.check_in_date) {
        const days = daysUntil(hotel.data.check_in_date);
        next.hotels.status = days <= 0 ? "Check-in today" : days === 1 ? "Check-in tomorrow" : `Stay in ${days} days`;
        next.hotels.href = "/trips";
      }

      if (!cancelled) setState(next);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <div className="px-4 pb-3">
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CalendarClock className="w-4 h-4" /> Your services
        </h2>
        <button type="button"
          onClick={() => navigate("/services")}
          className="text-[11px] text-foreground font-semibold flex items-center gap-0.5 active:opacity-60 transition-opacity"
        >
          See all <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {visibleTiles.map((tile, i) => {
          const Icon = tile.icon;
          const s = state[tile.key];
          const live = Boolean(s.status);
          return (
            <motion.button
              key={tile.key}
              onClick={() => navigate(s.href)}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="relative overflow-hidden rounded-lg p-3.5 min-h-[96px] flex flex-col justify-between bg-card border border-border text-left touch-manipulation active:bg-muted/50 transition-colors"
              aria-label={`Open ${tile.label}${s.status ? ` — ${s.status}` : ""}`}
            >
              {live && (
                <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-destructive px-1.5 py-0.5 text-[9px] font-bold text-destructive-foreground">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive-foreground opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-destructive-foreground" />
                  </span>
                  LIVE
                </span>
              )}
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                  <Icon className="w-[18px] h-[18px] text-foreground" strokeWidth={1.8} />
                </div>
                <div className="text-[15px] font-semibold text-foreground">{tile.label}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground line-clamp-1">
                  {s.status ?? tile.tagline}
                </div>
                <div className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold text-foreground">
                  {s.status ? "Open" : "Start"} <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function daysUntil(iso: string): number {
  const d = new Date(iso);
  const now = new Date();
  d.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86_400_000);
}
