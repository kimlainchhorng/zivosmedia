/**
 * MultiStopRideBuilder — chain up to 4 stops in a single ride.
 *
 * The builder lives at /rides/multi-stop and is intentionally separated from
 * the existing booking funnel: it composes a sequence (pickup + 1–3 drops),
 * persists it in the URL (`?stops=a|b|c|d`) so it's shareable, then forwards
 * the user into the legacy booking flow with the first leg pre-filled and
 * the remaining stops carried as a `multi` querystring.
 *
 * For now the per-leg booking is sequential — the user finishes leg 1, then
 * the next stop is offered. A future iteration can fan all legs out into a
 * single ride request once the backend supports it.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import Plus from "lucide-react/dist/esm/icons/plus";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import GripVertical from "lucide-react/dist/esm/icons/grip-vertical";
import Navigation from "lucide-react/dist/esm/icons/navigation";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useNetworkFavorites } from "@/hooks/useNetworkFavorites";
import { useMultiLegQueue } from "@/hooks/useMultiLegQueue";
import { supabase } from "@/integrations/supabase/client";

const MAX_STOPS = 4;
const SEPARATOR = "|";

// Rough fare model — calibrated to feel right for a major US metro at off-peak.
// Real pricing comes from the booking page once a vehicle class is picked.
const BASE_FARE_USD = 4.5;
const PER_LEG_USD = 7.25;
const MULTI_STOP_DISCOUNT = 0.1; // 10% off when 3+ legs

function estimateFare(legs: number): { low: number; high: number } | null {
  if (legs < 1) return null;
  const raw = BASE_FARE_USD + legs * PER_LEG_USD;
  const discount = legs >= 3 ? raw * MULTI_STOP_DISCOUNT : 0;
  const center = raw - discount;
  return { low: Math.round((center * 0.85 + Number.EPSILON) * 100) / 100, high: Math.round((center * 1.15 + Number.EPSILON) * 100) / 100 };
}

interface FavoritePlace {
  id: string;
  name: string;
  kind: "restaurant" | "hotel";
}

export default function MultiStopRideBuilder() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [pickup, setPickup] = useState<string>(params.get("from") ?? "");
  const [stops, setStops] = useState<string[]>(() => parseStops(params.get("stops")));

  // Sync URL ↔ state so the builder is shareable.
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (pickup) next.set("from", pickup);
    else next.delete("from");
    if (stops.some(Boolean)) next.set("stops", stops.filter(Boolean).join(SEPARATOR));
    else next.delete("stops");
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, stops]);

  // Pull favorites for the quick-pick row.
  const restaurantFavs = useNetworkFavorites("restaurant");
  const hotelFavs = useNetworkFavorites("hotel");
  const restaurantIds = useMemo(
    () => Array.from(restaurantFavs.favorites),
    [restaurantFavs.favorites],
  );
  const hotelIds = useMemo(() => Array.from(hotelFavs.favorites), [hotelFavs.favorites]);
  const [favorites, setFavorites] = useState<FavoritePlace[]>([]);

  useEffect(() => {
    if (!restaurantIds.length && !hotelIds.length) {
      setFavorites([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const [r, h] = await Promise.all([
        restaurantIds.length
          ? supabase.from("restaurants").select("id,name").in("id", restaurantIds)
          : Promise.resolve({ data: [] as any[] }),
        hotelIds.length
          ? supabase.from("hotels").select("id,name").in("id", hotelIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      if (cancelled) return;
      const merged: FavoritePlace[] = [];
      ((r as any).data ?? []).forEach((row: any) =>
        merged.push({ id: row.id, name: row.name, kind: "restaurant" }),
      );
      ((h as any).data ?? []).forEach((row: any) =>
        merged.push({ id: row.id, name: row.name, kind: "hotel" }),
      );
      setFavorites(merged);
    })().catch(() => setFavorites([]));
    return () => {
      cancelled = true;
    };
  }, [restaurantIds, hotelIds]);

  const setStopAt = (index: number, value: string) =>
    setStops((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });

  const addStop = () => {
    if (stops.length >= MAX_STOPS - 1) return;
    setStops((prev) => [...prev, ""]);
  };

  const removeStop = (index: number) =>
    setStops((prev) => prev.filter((_, i) => i !== index));

  const moveStop = (from: number, to: number) =>
    setStops((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });

  const populated = stops.filter((s) => s.trim().length > 0);
  const canBook = pickup.trim().length > 0 && populated.length >= 1;
  const totalLegs = populated.length;

  const { start: startQueue } = useMultiLegQueue();

  const startBooking = () => {
    if (!canBook) return;
    // Seed the persistent queue so RideTrackingPage can offer "Book next leg"
    // when each leg completes — even after navigating away to other tabs.
    startQueue(populated[0], populated.slice(1));
    const sp = new URLSearchParams();
    sp.set("pickup", pickup.trim());
    sp.set("destination", populated[0]);
    if (populated.length > 1) sp.set("multi", populated.slice(1).join(SEPARATOR));
    navigate(`/rides/hub?${sp.toString()}`);
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border/40 pt-safe">
        <div className="max-w-screen-md mx-auto px-4 py-3 flex items-center gap-3">
          <button type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary" /> Multi-stop
            </div>
            <div className="text-lg font-extrabold text-foreground">Build your route</div>
          </div>
          <span className="text-[11px] font-bold text-muted-foreground">
            {totalLegs} leg{totalLegs === 1 ? "" : "s"}
          </span>
        </div>
      </header>

      <main className="max-w-screen-md mx-auto px-4 pt-5 space-y-4">
        {/* Pickup */}
        <section className="rounded-3xl border border-emerald-500/20 bg-card p-4 shadow-sm">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5 mb-2">
            <Navigation className="w-3.5 h-3.5" /> Pickup
          </Label>
          <Input
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            placeholder="Where should the driver start?"
            className="h-12 text-base rounded-xl"
          />
        </section>

        {/* Stops */}
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-foreground" /> Stops
            </Label>
            <span className="text-[11px] text-muted-foreground">
              up to {MAX_STOPS - 1}
            </span>
          </div>

          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {stops.map((value, i) => (
                <motion.div
                  key={i}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="rounded-2xl border border-border/50 bg-card p-3 flex items-center gap-2 shadow-sm"
                >
                  <button type="button"
                    onClick={() => moveStop(i, i - 1)}
                    disabled={i === 0}
                    className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-[11px] font-bold disabled:opacity-40"
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button type="button"
                    onClick={() => moveStop(i, i + 1)}
                    disabled={i === stops.length - 1}
                    className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-[11px] font-bold disabled:opacity-40"
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-foreground text-[10px] font-bold">
                      {i + 1}
                    </span>
                    <Input
                      value={value}
                      onChange={(e) => setStopAt(i, e.target.value)}
                      placeholder={i === 0 ? "First stop" : `Stop ${i + 1}`}
                      className="h-11 text-base rounded-xl flex-1"
                    />
                  </div>
                  {stops.length > 1 && (
                    <button type="button"
                      onClick={() => removeStop(i)}
                      className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center"
                      aria-label="Remove stop"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <Button
            variant="outline"
            onClick={addStop}
            disabled={stops.length >= MAX_STOPS - 1}
            className="w-full h-11 mt-2 rounded-xl gap-2"
          >
            <Plus className="w-4 h-4" /> Add a stop
          </Button>
        </section>

        {/* Quick picks from favorites */}
        {favorites.length > 0 && (
          <section>
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1 block">
              Quick picks from your saved places
            </Label>
            <div className="flex flex-wrap gap-2">
              {favorites.slice(0, 8).map((p) => (
                <button type="button"
                  key={`${p.kind}-${p.id}`}
                  onClick={() => {
                    const firstEmpty = stops.findIndex((s) => !s.trim());
                    if (firstEmpty === -1 && stops.length < MAX_STOPS - 1) {
                      setStops((prev) => [...prev, p.name]);
                    } else if (firstEmpty !== -1) {
                      setStopAt(firstEmpty, p.name);
                    }
                  }}
                  className="rounded-full border border-border/50 bg-card hover:bg-muted/40 px-3 py-1.5 text-[11px] font-bold text-foreground transition-colors"
                >
                  {p.kind === "restaurant" ? "🍽️" : "🛏️"} {p.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Summary */}
        {pickup && totalLegs > 0 && (() => {
          const fare = estimateFare(totalLegs);
          const discount = totalLegs >= 3;
          return (
            <motion.section
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-primary/20 bg-primary/5 p-4"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                Route preview
              </div>
              <div className="text-sm font-bold text-foreground leading-snug">
                {[pickup, ...populated].join(" → ")}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                We'll book this as {totalLegs === 1 ? "1 ride" : `${totalLegs} sequential rides`} —
                you can confirm each leg as it goes.
              </div>

              {fare && (
                <div className="mt-3 pt-3 border-t border-primary/10 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Est. total
                    </div>
                    <div className="text-base font-extrabold text-foreground">
                      ${fare.low.toFixed(2)} – ${fare.high.toFixed(2)}
                    </div>
                    {discount && (
                      <div className="text-[10px] font-bold text-emerald-600 mt-0.5">
                        Multi-stop bundle · 10% off applied
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground text-right max-w-[150px] leading-snug">
                    Final fare confirmed when you pick a vehicle class on the next screen.
                  </div>
                </div>
              )}
            </motion.section>
          );
        })()}
      </main>

      {/* Sticky CTA */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed bottom-0 left-0 right-0 px-4 pb-[calc(var(--zivo-safe-bottom,0px)+12px)] pt-3 bg-gradient-to-t from-background via-background/95 to-background/0"
      >
        <Button
          disabled={!canBook}
          onClick={startBooking}
          className="w-full h-14 text-base font-bold rounded-2xl shadow-lg"
        >
          {canBook
            ? `Start route · ${totalLegs + 1} stops`
            : "Add a pickup and at least one stop"}
        </Button>
      </motion.div>
    </div>
  );
}

function parseStops(raw: string | null): string[] {
  if (!raw) return [""];
  const parts = raw.split(SEPARATOR).map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : [""];
}
