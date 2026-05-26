/**
 * SavedFavoritesPage — list every restaurant & hotel the user has hearted.
 * Mounted at /network/saved (and /favorites/network alias).
 *
 * Reads ids from useNetworkFavorites then resolves the rows from supabase.
 * Each card has one-tap quick actions: re-order food / re-reserve / re-book
 * the hotel, plus an unfavorite button.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Heart from "lucide-react/dist/esm/icons/heart";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import BedDouble from "lucide-react/dist/esm/icons/bed-double";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Star from "lucide-react/dist/esm/icons/star";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Plus from "lucide-react/dist/esm/icons/plus";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNetworkFavorites } from "@/hooks/useNetworkFavorites";
import PartnerBadge from "@/components/shared/PartnerBadge";

interface RestaurantRow {
  id: string;
  name: string;
  cuisine_type: string | null;
  cover_image_url: string | null;
  logo_url: string | null;
  rating: number | null;
  city: string | null;
}
interface HotelRow {
  id: string;
  name: string;
  city: string | null;
  cover_image_url: string | null;
  rating: number | null;
}

const FALLBACK_RESTAURANT =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800";
const FALLBACK_HOTEL =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800";

export default function SavedFavoritesPage() {
  const navigate = useNavigate();
  const restaurantFavs = useNetworkFavorites("restaurant");
  const hotelFavs = useNetworkFavorites("hotel");

  const restaurantIds = useMemo(() => Array.from(restaurantFavs.favorites), [restaurantFavs.favorites]);
  const hotelIds = useMemo(() => Array.from(hotelFavs.favorites), [hotelFavs.favorites]);

  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [hotels, setHotels] = useState<HotelRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [r, h] = await Promise.all([
        restaurantIds.length
          ? supabase
              .from("restaurants")
              .select("id,name,cuisine_type,cover_image_url,logo_url,rating,city")
              .in("id", restaurantIds)
          : Promise.resolve({ data: [] as RestaurantRow[] }),
        hotelIds.length
          ? supabase
              .from("hotels")
              .select("id,name,city,cover_image_url,rating")
              .in("id", hotelIds)
          : Promise.resolve({ data: [] as HotelRow[] }),
      ]);
      if (cancelled) return;
      setRestaurants(((r as any).data ?? []) as RestaurantRow[]);
      setHotels(((h as any).data ?? []) as HotelRow[]);
      setLoading(false);
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [restaurantIds, hotelIds]);

  const total = restaurants.length + hotels.length;
  const empty = !loading && total === 0;

  return (
    <div className="min-h-[100dvh] bg-background pb-16">
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
            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
              Your favorites
            </div>
            <div className="text-lg font-extrabold text-foreground flex items-center gap-2">
              Saved places
              <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {total} place{total === 1 ? "" : "s"}
          </div>
        </div>
      </header>

      <main className="max-w-screen-md mx-auto px-4 pt-5 space-y-7">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : empty ? (
          <EmptyState onBrowse={() => navigate("/network")} />
        ) : (
          <>
            {restaurants.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <UtensilsCrossed className="w-4 h-4 text-orange-500" />
                  <h2 className="text-sm font-bold text-foreground">Restaurants</h2>
                  <span className="text-[11px] text-muted-foreground">({restaurants.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {restaurants.map((r, i) => (
                    <RestaurantCard
                      key={r.id}
                      r={r}
                      delay={i * 0.02}
                      onUnfavorite={() => restaurantFavs.remove(r.id)}
                      navigate={navigate}
                    />
                  ))}
                </div>
              </section>
            )}

            {hotels.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <BedDouble className="w-4 h-4 text-foreground" />
                  <h2 className="text-sm font-bold text-foreground">Hotels & stays</h2>
                  <span className="text-[11px] text-muted-foreground">({hotels.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {hotels.map((h, i) => (
                    <HotelCard
                      key={h.id}
                      h={h}
                      delay={i * 0.02}
                      onUnfavorite={() => hotelFavs.remove(h.id)}
                      navigate={navigate}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function EmptyState({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-border/50 p-10 text-center">
      <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
        <Heart className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-base font-bold text-foreground">Nothing saved yet</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
        Tap the heart on any partner restaurant or hotel and it'll show up here for one-tap reorder
        and rebook.
      </p>
      <Button onClick={onBrowse} className="mt-4 rounded-xl">
        <Plus className="w-4 h-4 mr-1" /> Browse the network
      </Button>
    </div>
  );
}

function RestaurantCard({
  r,
  delay,
  onUnfavorite,
  navigate,
}: {
  r: RestaurantRow;
  delay: number;
  onUnfavorite: () => void;
  navigate: (path: string) => void;
}) {
  const cover = r.cover_image_url || r.logo_url || FALLBACK_RESTAURANT;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="relative rounded-2xl overflow-hidden border border-border/40 bg-card shadow-sm"
    >
      <button type="button"
        onClick={() => navigate(`/eats/restaurant/${r.id}`)}
        className="block w-full text-left active:scale-[0.99] transition-transform touch-manipulation"
      >
        <div className="relative aspect-[16/10] overflow-hidden">
          <img src={cover} alt={r.name} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          <PartnerBadge size="xs" className="absolute top-2 left-2 shadow-sm" />
          <button type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUnfavorite();
            }}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/55 backdrop-blur flex items-center justify-center"
            aria-label="Remove from saved"
          >
            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
          </button>
          {r.rating ? (
            <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/55 backdrop-blur px-2 py-0.5 text-[10px] font-bold text-white">
              <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
              {r.rating.toFixed(1)}
            </div>
          ) : null}
        </div>
        <div className="p-3">
          <div className="text-sm font-bold text-foreground truncate">{r.name}</div>
          <div className="text-[11px] text-muted-foreground truncate">
            {[r.cuisine_type, r.city].filter(Boolean).join(" · ")}
          </div>
        </div>
      </button>
      <div className="px-3 pb-3 grid grid-cols-3 gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="rounded-lg text-[11px] px-2"
          onClick={() =>
            navigate(
              `/eats/reserve?restaurantId=${r.id}&restaurantName=${encodeURIComponent(r.name)}`,
            )
          }
        >
          Reserve
        </Button>
        <Button
          size="sm"
          className="rounded-lg text-[11px] px-2"
          onClick={() => navigate(`/eats/restaurant/${r.id}`)}
        >
          Reorder
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="rounded-lg text-[11px] px-2"
          onClick={() => navigate(`/rides/hub?destination=${encodeURIComponent(r.name)}`)}
        >
          Ride
        </Button>
      </div>
    </motion.div>
  );
}

function HotelCard({
  h,
  delay,
  onUnfavorite,
  navigate,
}: {
  h: HotelRow;
  delay: number;
  onUnfavorite: () => void;
  navigate: (path: string) => void;
}) {
  const cover = h.cover_image_url || FALLBACK_HOTEL;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="relative rounded-2xl overflow-hidden border border-border/40 bg-card shadow-sm"
    >
      <button type="button"
        onClick={() => navigate(`/hotels?hotelId=${h.id}`)}
        className="block w-full text-left active:scale-[0.99] transition-transform touch-manipulation"
      >
        <div className="relative aspect-[16/10] overflow-hidden">
          <img src={cover} alt={h.name} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          <PartnerBadge size="xs" className="absolute top-2 left-2 shadow-sm" />
          <button type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUnfavorite();
            }}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/55 backdrop-blur flex items-center justify-center"
            aria-label="Remove from saved"
          >
            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
          </button>
          {h.rating ? (
            <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/55 backdrop-blur px-2 py-0.5 text-[10px] font-bold text-white">
              <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
              {h.rating.toFixed(1)}
            </div>
          ) : null}
        </div>
        <div className="p-3">
          <div className="text-sm font-bold text-foreground truncate">{h.name}</div>
          <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {h.city ?? "—"}
          </div>
        </div>
      </button>
      <div className="px-3 pb-3 grid grid-cols-2 gap-1.5">
        <Button
          size="sm"
          className="rounded-lg text-[11px]"
          onClick={() => navigate(`/hotels?hotelId=${h.id}`)}
        >
          Book again
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="rounded-lg text-[11px]"
          onClick={() => navigate(`/rides/hub?destination=${encodeURIComponent(h.name)}`)}
        >
          Ride here
        </Button>
      </div>
    </motion.div>
  );
}
