/**
 * SpendTrackerWidget — month-to-date spend across rides, eats, flights,
 * and hotels. Reads completed/confirmed records from supabase, renders a
 * compact summary with a 4-color stacked bar.
 *
 * Hidden when the total is $0 (no noise on a fresh account).
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Wallet from "lucide-react/dist/esm/icons/wallet";
import Car from "lucide-react/dist/esm/icons/car";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import Plane from "lucide-react/dist/esm/icons/plane";
import BedDouble from "lucide-react/dist/esm/icons/bed-double";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type Bucket = "rides" | "eats" | "flights" | "hotels";

interface BucketMeta {
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

const META: Record<Bucket, BucketMeta> = {
  rides: { label: "Rides", icon: Car, color: "bg-emerald-500", bg: "bg-emerald-500/10 text-emerald-600" },
  eats: { label: "Eats", icon: UtensilsCrossed, color: "bg-orange-500", bg: "bg-orange-500/10 text-orange-600" },
  flights: { label: "Flights", icon: Plane, color: "bg-sky-500", bg: "bg-sky-500/10 text-sky-600" },
  hotels: { label: "Hotels", icon: BedDouble, color: "bg-violet-500", bg: "bg-violet-500/10 text-violet-600" },
};

export default function SpendTrackerWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [totals, setTotals] = useState<Record<Bucket, number>>({
    rides: 0,
    eats: 0,
    flights: 0,
    hotels: 0,
  });

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const start = startOfMonthISO();

      const [rides, orders, flights, hotels] = await Promise.all([
        supabase
          .from("trips")
          .select("fare_cents,total_amount,fare,price")
          .eq("rider_id", user.id)
          .eq("status", "completed")
          .gte("created_at", start),
        supabase
          .from("food_orders")
          .select("total_amount")
          .eq("customer_id", user.id)
          .eq("status", "delivered")
          .gte("created_at", start),
        (supabase as any)
          .from("flight_bookings")
          .select("total_amount,passengers")
          .eq("user_id", user.id)
          .gte("created_at", start),
        (supabase as any)
          .from("hotel_bookings")
          .select("total_amount")
          .eq("user_id", user.id)
          .gte("created_at", start),
      ]);

      if (cancelled) return;

      const next: Record<Bucket, number> = {
        rides: sumDollars(rides.data ?? [], (r: any) =>
          dollarsFromCents(r.fare_cents) ?? toDollars(r.total_amount ?? r.fare ?? r.price),
        ),
        eats: sumDollars(orders.data ?? [], (o: any) => toDollars(o.total_amount)),
        flights: sumDollars(flights.data ?? [], (f: any) =>
          toDollars(f.total_amount) * Math.max(1, Number(f.passengers ?? 1)),
        ),
        hotels: sumDollars(hotels.data ?? [], (h: any) => toDollars(h.total_amount)),
      };
      setTotals(next);
    })().catch(() => {
      if (!cancelled) setTotals({ rides: 0, eats: 0, flights: 0, hotels: 0 });
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const total = totals.rides + totals.eats + totals.flights + totals.hotels;
  const segments = useMemo(
    () =>
      (Object.keys(totals) as Bucket[]).map((key) => ({
        key,
        amount: totals[key],
        pct: total > 0 ? (totals[key] / total) * 100 : 0,
      })),
    [totals, total],
  );

  if (total <= 0) return null;

  return (
    <div className="px-4 pb-3">
      <motion.button
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => navigate("/trips")}
        className="w-full rounded-3xl border border-border/50 bg-card p-4 text-left shadow-sm active:scale-[0.99] transition-transform touch-manipulation"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {monthLabel()}
            </div>
            <div className="text-sm font-bold text-foreground">Spend across services</div>
          </div>
          <div className="text-right">
            <div className="text-base font-extrabold text-foreground tabular-nums">
              ${total.toFixed(2)}
            </div>
            <div className="text-[10px] text-muted-foreground">this month</div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>

        {/* Stacked bar */}
        <div className="h-2 w-full rounded-full overflow-hidden flex bg-muted">
          {segments.map((s) =>
            s.pct > 0 ? (
              <span
                key={s.key}
                className={`${META[s.key].color} h-full`}
                style={{ width: `${s.pct}%` }}
              />
            ) : null,
          )}
        </div>

        {/* Per-bucket chips */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {segments
            .filter((s) => s.amount > 0)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 4)
            .map((s) => {
              const meta = META[s.key];
              const Icon = meta.icon;
              return (
                <div key={s.key} className="flex items-center gap-2 min-w-0">
                  <div className={`w-7 h-7 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-foreground truncate">{meta.label}</div>
                    <div className="text-[10px] text-muted-foreground tabular-nums">
                      ${s.amount.toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </motion.button>
    </div>
  );
}

function startOfMonthISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function monthLabel(): string {
  return new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function dollarsFromCents(v: any): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n / 100;
}

function toDollars(v: any): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  // Heuristic: anything ≥ 1000 with no decimals is probably already cents.
  if (n > 1000 && Math.abs(n - Math.round(n)) < 0.001) return n / 100;
  return n;
}

function sumDollars<T>(rows: T[], extract: (row: T) => number): number {
  return rows.reduce((acc, row) => acc + (extract(row) || 0), 0);
}