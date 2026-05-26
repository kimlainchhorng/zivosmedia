/**
 * InsightsCard — month-to-date "you saved $X by bundling" callout.
 *
 * Counts the user's flight + hotel + ride bookings this month and estimates
 * savings from any matched bundles (same-week flight + hotel, or
 * flight-day airport ride). Heuristic only — no precise pricing — meant to
 * make the bundle behavior feel rewarding.
 *
 * Hidden when there's not enough data to say anything meaningful.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";
import Plane from "lucide-react/dist/esm/icons/plane";
import BedDouble from "lucide-react/dist/esm/icons/bed-double";
import Car from "lucide-react/dist/esm/icons/car";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  bundles: number;
  airportRides: number;
  estSavings: number;
  flightCount: number;
  hotelCount: number;
}

const ZERO: Stats = { bundles: 0, airportRides: 0, estSavings: 0, flightCount: 0, hotelCount: 0 };

// Rough savings model for the heuristic. Real numbers come from the
// receipt; this just gives the user a cue that bundling pays.
const BUNDLE_DISCOUNT_USD = 28;
const AIRPORT_RIDE_DISCOUNT_USD = 6;

export default function InsightsCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>(ZERO);

  useEffect(() => {
    if (!user?.id) {
      setStats(ZERO);
      return;
    }
    let cancelled = false;
    (async () => {
      const monthStart = startOfMonthISO();
      const sb = supabase as any;
      const [flights, hotels, rides] = await Promise.all([
        sb
          .from("flight_bookings")
          .select("id,departure_date,destination,created_at")
          .eq("customer_id", user.id)
          .gte("created_at", monthStart),
        sb
          .from("hotel_bookings")
          .select("id,check_in_date,city,created_at")
          .eq("customer_id", user.id)
          .gte("created_at", monthStart),
        sb
          .from("trips")
          .select("id,dropoff_address,created_at,status")
          .eq("rider_id", user.id)
          .eq("status", "completed")
          .gte("created_at", monthStart),
      ]);

      if (cancelled) return;

      const flightRows = (flights.data ?? []) as any[];
      const hotelRows = (hotels.data ?? []) as any[];
      const rideRows = (rides.data ?? []) as any[];

      // Bundle count — flights with a matching same-week hotel by city/destination.
      const SEVEN_DAYS = 7 * 86_400_000;
      let bundles = 0;
      for (const f of flightRows) {
        const fDate = f.departure_date ? new Date(f.departure_date).getTime() : null;
        if (!fDate) continue;
        const matched = hotelRows.find((h) => {
          const hDate = h.check_in ? new Date(h.check_in).getTime() : null;
          if (!hDate) return false;
          const sameishCity =
            f.destination &&
            h.city &&
            String(f.destination).toLowerCase().slice(0, 3) ===
              String(h.city).toLowerCase().slice(0, 3);
          return sameishCity && Math.abs(hDate - fDate) <= SEVEN_DAYS;
        });
        if (matched) bundles += 1;
      }

      // Airport rides — completed rides on a flight day with an airport-y dropoff.
      let airportRides = 0;
      for (const r of rideRows) {
        const dropoff = String(r.dropoff_address ?? "").toLowerCase();
        const looksAirport = /airport|airpt|jfk|lga|lax|sfo|ord|dxb|hnd|cdg|fra|sin|hkg|nrt|icn/.test(
          dropoff,
        );
        if (!looksAirport) continue;
        const ts = new Date(r.created_at).getTime();
        const flightSameDay = flightRows.find((f) => {
          const fDate = f.departure_date ? new Date(f.departure_date).getTime() : null;
          if (!fDate) return false;
          return Math.abs(fDate - ts) <= 86_400_000;
        });
        if (flightSameDay) airportRides += 1;
      }

      const estSavings = bundles * BUNDLE_DISCOUNT_USD + airportRides * AIRPORT_RIDE_DISCOUNT_USD;

      setStats({
        bundles,
        airportRides,
        estSavings,
        flightCount: flightRows.length,
        hotelCount: hotelRows.length,
      });
    })().catch(() => {
      if (!cancelled) setStats(ZERO);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const total = stats.bundles + stats.airportRides;
  if (total === 0) return null;

  return (
    <div className="px-4 pb-3">
      <motion.button
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => navigate("/trips?tab=everything")}
        className="w-full rounded-lg border border-border bg-card p-4 text-left active:bg-muted/50 transition-colors touch-manipulation"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-full bg-muted text-foreground flex items-center justify-center">
            <TrendingUp className="w-4 h-4" strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ig-gradient flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Insight · {monthLabel()}
            </div>
            <div className="text-sm font-semibold text-foreground">
              You saved an estimated{" "}
              <span className="text-foreground font-bold">${stats.estSavings}</span> by bundling
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>

        <div className="grid grid-cols-3 gap-2 mt-2">
          <Stat icon={Plane} label="Flights" value={stats.flightCount} />
          <Stat icon={BedDouble} label="Hotels" value={stats.hotelCount} />
          <Stat icon={Car} label="Airport rides" value={stats.airportRides} />
        </div>

        {stats.bundles > 0 && (
          <div className="text-[11px] text-muted-foreground mt-3">
            {stats.bundles === 1 ? "1 bundle" : `${stats.bundles} bundles`} · keep it up — bigger
            packages unlock bigger discounts.
          </div>
        )}
      </motion.button>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-2 py-2">
      <div className="flex items-center gap-1.5 text-foreground">
        <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
        <span className="text-base font-bold tabular-nums leading-none">{value}</span>
      </div>
      <div className="text-[10px] text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function startOfMonthISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function monthLabel(): string {
  return new Date().toLocaleDateString(undefined, { month: "short" });
}
