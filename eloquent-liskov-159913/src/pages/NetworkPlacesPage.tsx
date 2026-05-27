/**
 * NetworkPlacesPage — directory of places in the ZIVO network.
 * Shows partner restaurants (book table or order delivery) and partner
 * hotels (reserve a stay) on one screen with a search and category chips.
 *
 * Mounted at /network. Each card carries the PartnerBadge so the user knows
 * everything here is a verified partner with in-app booking.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import Search from "lucide-react/dist/esm/icons/search";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import BedDouble from "lucide-react/dist/esm/icons/bed-double";
import Star from "lucide-react/dist/esm/icons/star";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import Store from "lucide-react/dist/esm/icons/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import PartnerBadge from "@/components/shared/PartnerBadge";

type Tab = "all" | "restaurants" | "hotels";

interface RestaurantRow {
  id: string;
  name: string;
  cuisine_type: string | null;
  cover_image_url: string | null;
  logo_url: string | null;
  rating: number | null;
  city: string | null;
  is_open?: boolean | null;
}
interface HotelRow {
  id: string;
  name: string;
  city: string | null;
  cover_image_url: string | null;
  rating: number | null;
  starting_price_cents: number | null;
}

const FALLBACK_RESTAURANT =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800";
const FALLBACK_HOTEL =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800";
const ENABLE_PUBLIC_NETWORK_PLACES =
  (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_ENABLE_PUBLIC_NETWORK_PLACES ===
  "true";

export default function NetworkPlacesPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const initialTab = (params.get("tab") as Tab) || "all";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState("");
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [hotels, setHotels] = useState<HotelRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (!ENABLE_PUBLIC_NETWORK_PLACES) {
        setRestaurants([]);
        setHotels([]);
        setLoading(false);
        return;
      }
      const [r, h] = await Promise.all([
        supabase
          .from("restaurants")
          .select("id,name,cuisine_type,cover_image_url,logo_url,rating,city,is_open")
          .order("rating", { ascending: false, nullsFirst: false })
          .limit(40),
        supabase
          .from("hotels")
          .select("id,name,city,cover_image_url,rating,starting_price_cents")
          .order("rating", { ascending: false, nullsFirst: false })
          .limit(40),
      ]);
      if (cancelled) return;
      if (r.data) setRestaurants(r.data as unknown as RestaurantRow[]);
      if (h.data) setHotels(h.data as unknown as HotelRow[]);
      setLoading(false);
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onTab = (t: Tab) => {
    setTab(t);
    const next = new URLSearchParams(params);
    if (t === "all") next.delete("tab");
    else next.set("tab", t);
    setParams(next, { replace: true });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchR = (r: RestaurantRow) =>
      !q ||
      r.name.toLowerCase().includes(q) ||
      (r.cuisine_type ?? "").toLowerCase().includes(q) ||
      (r.city ?? "").toLowerCase().includes(q);
    const matchH = (h: HotelRow) =>
      !q ||
      h.name.toLowerCase().includes(q) ||
      (h.city ?? "").toLowerCase().includes(q);
    return {
      r: tab === "hotels" ? [] : restaurants.filter(matchR),
      h: tab === "restaurants" ? [] : hotels.filter(matchH),
    };
  }, [tab, query, restaurants, hotels]);

  const totalCount = filtered.r.length + filtered.h.length;
  const hasQuery = query.trim().length > 0;
  const countLabel = loading
    ? "Loading..."
    : totalCount > 0
      ? `${totalCount} partner${totalCount === 1 ? "" : "s"}`
      : hasQuery
        ? "0 matches"
        : "Opening soon";

  return (
    <div className="min-h-[100dvh] bg-background pb-16">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border/40 pt-safe">
        <div className="px-4 pt-3 pb-3 max-w-screen-md mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <button type="button"
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                ZIVO network
              </div>
              <div className="text-lg font-extrabold text-foreground">Places we book for you</div>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search restaurants, hotels, cuisines, cities..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-11 rounded-xl"
            />
          </div>

          <div className="flex gap-2 mt-3">
            {(["all", "restaurants", "hotels"] as Tab[]).map((t) => (
              <button type="button"
                key={t}
                onClick={() => onTab(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-colors ${
                  tab === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
            <span className="ml-auto self-center text-[11px] text-muted-foreground">
              {countLabel}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-screen-md mx-auto px-4 pt-5 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {filtered.r.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <UtensilsCrossed className="w-4 h-4 text-orange-500" />
                  <h2 className="text-sm font-bold text-foreground">Restaurants</h2>
                  <span className="text-[11px] text-muted-foreground">
                    ({filtered.r.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filtered.r.map((r, i) => (
                    <RestaurantCard key={r.id} r={r} delay={i * 0.02} navigate={navigate} />
                  ))}
                </div>
              </section>
            )}

            {filtered.h.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <BedDouble className="w-4 h-4 text-foreground" />
                  <h2 className="text-sm font-bold text-foreground">Hotels & stays</h2>
                  <span className="text-[11px] text-muted-foreground">
                    ({filtered.h.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filtered.h.map((h, i) => (
                    <HotelCard key={h.id} h={h} delay={i * 0.02} navigate={navigate} />
                  ))}
                </div>
              </section>
            )}

            {totalCount === 0 && (
              <NetworkEmptyState
                hasQuery={hasQuery}
                tab={tab}
                onClearSearch={() => setQuery("")}
                onBrowseEats={() => navigate("/eats")}
                onBrowseHotels={() => navigate("/hotels")}
                onAddBusiness={() => navigate("/become-partner")}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function NetworkEmptyState({
  hasQuery,
  tab,
  onClearSearch,
  onBrowseEats,
  onBrowseHotels,
  onAddBusiness,
}: {
  hasQuery: boolean;
  tab: Tab;
  onClearSearch: () => void;
  onBrowseEats: () => void;
  onBrowseHotels: () => void;
  onAddBusiness: () => void;
}) {
  const title = hasQuery
    ? "No matching partners"
    : "Partner network is opening soon in your area";
  const body = hasQuery
    ? "Try a different search term or switch categories to find restaurants and stays."
    : "As local restaurants, hotels, and shops join ZIVO, they will appear here with direct booking actions.";
  const showEats = tab !== "hotels";
  const showHotels = tab !== "restaurants";

  return (
    <section className="py-10 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {hasQuery ? <Search className="h-5 w-5" /> : <Store className="h-5 w-5" />}
      </div>
      <h2 className="text-base font-extrabold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{body}</p>

      {!hasQuery && (
        <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-2 text-left">
          <div className="rounded-xl border border-border/50 bg-card p-3">
            <UtensilsCrossed className="mb-2 h-4 w-4 text-orange-500" />
            <p className="text-[11px] font-bold text-foreground">Restaurants</p>
            <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">Order and reserve</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-3">
            <BedDouble className="mb-2 h-4 w-4 text-foreground" />
            <p className="text-[11px] font-bold text-foreground">Hotels</p>
            <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">Rooms and rates</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-3">
            <Store className="mb-2 h-4 w-4 text-emerald-600" />
            <p className="text-[11px] font-bold text-foreground">Local shops</p>
            <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">Pickup and service</p>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {hasQuery ? (
          <Button type="button" variant="outline" className="rounded-xl" onClick={onClearSearch}>
            Clear search
          </Button>
        ) : (
          <>
            {showEats && (
              <Button type="button" className="rounded-xl" onClick={onBrowseEats}>
                Browse Eats
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {showHotels && (
              <Button type="button" variant="outline" className="rounded-xl" onClick={onBrowseHotels}>
                Browse Hotels
              </Button>
            )}
          </>
        )}
        <Button type="button" variant="ghost" className="rounded-xl" onClick={onAddBusiness}>
          Add your business
        </Button>
      </div>
    </section>
  );
}

function RestaurantCard({
  r,
  delay,
  navigate,
}: {
  r: RestaurantRow;
  delay: number;
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <PartnerBadge size="xs" className="absolute top-2 left-2 shadow-sm" />
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
      <div className="px-3 pb-3 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 rounded-lg text-xs"
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
          className="flex-1 rounded-lg text-xs"
          onClick={() => navigate(`/eats/restaurant/${r.id}`)}
        >
          Order
        </Button>
      </div>
    </motion.div>
  );
}

function HotelCard({
  h,
  delay,
  navigate,
}: {
  h: HotelRow;
  delay: number;
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
          {h.starting_price_cents != null && h.starting_price_cents > 0 && (
            <div className="text-[11px] text-foreground mt-1">
              From <span className="font-bold">${(h.starting_price_cents / 100).toFixed(0)}</span>
              <span className="text-muted-foreground"> / night</span>
            </div>
          )}
        </div>
      </button>
      <div className="px-3 pb-3">
        <Button
          size="sm"
          className="w-full rounded-lg text-xs"
          onClick={() => navigate(`/hotels?hotelId=${h.id}`)}
        >
          View rooms
        </Button>
      </div>
    </motion.div>
  );
}
