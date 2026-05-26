/**
 * HeartedDestinationsRail — one-tap drop-off chips made of the user's
 * favorite restaurants and hotels in the ZIVO network.
 *
 * Drops a `?destination=<name>` into /rides/hub so the current booking funnel
 * picks the destination up. Hidden when the user has no favorites yet —
 * shows a small "Browse the network" hint instead.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Heart from "lucide-react/dist/esm/icons/heart";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import BedDouble from "lucide-react/dist/esm/icons/bed-double";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import { useNetworkFavorites } from "@/hooks/useNetworkFavorites";
import { supabase } from "@/integrations/supabase/client";

interface PlaceRow {
  id: string;
  kind: "restaurant" | "hotel";
  name: string;
  detail: string | null;
  cover: string | null;
}

const FALLBACK_R =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=60&w=320";
const FALLBACK_H =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=60&w=320";

export default function HeartedDestinationsRail() {
  const navigate = useNavigate();
  const restaurantFavs = useNetworkFavorites("restaurant");
  const hotelFavs = useNetworkFavorites("hotel");
  const restaurantIds = useMemo(
    () => Array.from(restaurantFavs.favorites),
    [restaurantFavs.favorites],
  );
  const hotelIds = useMemo(() => Array.from(hotelFavs.favorites), [hotelFavs.favorites]);
  const [places, setPlaces] = useState<PlaceRow[]>([]);
  const total = restaurantIds.length + hotelIds.length;

  useEffect(() => {
    if (!total) {
      setPlaces([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const [r, h] = await Promise.all([
        restaurantIds.length
          ? supabase
              .from("restaurants")
              .select("id,name,cuisine_type,cover_image_url,logo_url")
              .in("id", restaurantIds)
          : Promise.resolve({ data: [] as any[] }),
        hotelIds.length
          ? supabase.from("hotels").select("id,name,city,cover_image_url").in("id", hotelIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      if (cancelled) return;
      const merged: PlaceRow[] = [];
      ((r as any).data ?? []).forEach((row: any) =>
        merged.push({
          id: row.id,
          kind: "restaurant",
          name: row.name,
          detail: row.cuisine_type ?? null,
          cover: row.cover_image_url ?? row.logo_url ?? null,
        }),
      );
      ((h as any).data ?? []).forEach((row: any) =>
        merged.push({
          id: row.id,
          kind: "hotel",
          name: row.name,
          detail: row.city ?? null,
          cover: row.cover_image_url ?? null,
        }),
      );
      setPlaces(merged);
    })().catch(() => {
      if (!cancelled) setPlaces([]);
    });
    return () => {
      cancelled = true;
    };
  }, [restaurantIds, hotelIds, total]);

  if (!total) {
    return (
      <button type="button"
        onClick={() => navigate("/network")}
        className="w-full mx-auto max-w-screen-md flex items-center gap-3 rounded-2xl border border-dashed border-border/50 bg-card/60 p-3 text-left active:scale-[0.99] transition-transform touch-manipulation"
      >
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Heart className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-bold text-foreground">Save places to ride to</div>
          <div className="text-[11px] text-muted-foreground">
            Heart restaurants & hotels — they'll show up here for one-tap drop-off.
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div>
      <div className="px-1 mb-2 flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Heart className="w-3 h-3 text-red-500 fill-red-500" /> Saved drop-offs
        </div>
        <div className="flex items-center gap-2">
          <button type="button"
            onClick={() => navigate("/rides/multi-stop")}
            className="text-[11px] text-primary font-bold flex items-center gap-0.5"
          >
            Multi-stop <ChevronRight className="w-3 h-3" />
          </button>
          <span className="text-muted-foreground/40 text-[11px]">·</span>
          <button type="button"
            onClick={() => navigate("/network/saved")}
            className="text-[11px] text-primary font-bold flex items-center gap-0.5"
          >
            See all <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div
        className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {places.map((p, i) => (
          <motion.button
            key={`${p.kind}-${p.id}`}
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => navigate(`/rides/hub?destination=${encodeURIComponent(p.name)}`)}
            className="shrink-0 w-[180px] rounded-2xl overflow-hidden border border-border/40 bg-card text-left active:scale-[0.99] transition-transform touch-manipulation"
          >
            <div className="relative h-[80px] w-full overflow-hidden">
              <img
                src={p.cover ?? (p.kind === "restaurant" ? FALLBACK_R : FALLBACK_H)}
	                alt={p.name}
	                className="w-full h-full object-cover"
	                loading="lazy"
	                decoding="async"
	              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
              <div className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-black/55 backdrop-blur px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                {p.kind === "restaurant" ? (
                  <UtensilsCrossed className="w-2.5 h-2.5" />
                ) : (
                  <BedDouble className="w-2.5 h-2.5" />
                )}
                {p.kind === "restaurant" ? "Restaurant" : "Hotel"}
              </div>
              <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/55 flex items-center justify-center">
                <Heart className="w-3 h-3 text-red-500 fill-red-500" />
              </div>
            </div>
            <div className="p-2">
              <div className="text-[12px] font-bold text-foreground truncate">{p.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">
                {p.detail ?? "Tap to set drop-off"}
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
