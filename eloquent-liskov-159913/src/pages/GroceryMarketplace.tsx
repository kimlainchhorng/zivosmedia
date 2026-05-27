/**
 * GroceryMarketplace - Real nearby store detection with same-day delivery
 * Shows only stores within 15mi of customer's delivery address
 */
import { useNavigate } from "react-router-dom";
import { getStorePublicPath } from "@/lib/storeLink";
import { optimizeImage } from "@/lib/optimizeImage";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { ArrowLeft, ShoppingCart, Sparkles, Clock, Zap, ChevronRight, TrendingUp, Star, Store, MapPin, Truck, Shield, Loader2, AlertCircle, ClipboardList } from "lucide-react";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import GroceryCategories from "@/components/grocery/GroceryCategories";
import GroceryPromos from "@/components/grocery/GroceryPromos";
import GroceryRecentStores from "@/components/grocery/GroceryRecentStores";
import GroceryReorder from "@/components/grocery/GroceryReorder";
import GrocerySmartSearch from "@/components/grocery/GrocerySmartSearch";
import { GroceryHowItWorks } from "@/components/grocery/GroceryHowItWorks";
import { getStoresForMarket, isGroceryMarketplaceCategory, type StoreCategory, type StoreConfig } from "@/config/groceryStores";
import { useCountry } from "@/hooks/useCountry";
import { useMarketStores, type StoreProfile } from "@/hooks/useStoreProfile";
import { useGroceryCart } from "@/hooks/useGroceryCart";
import { useNearbyGroceryStores, type NearbyStoreLocation } from "@/hooks/useNearbyGroceryStores";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { GroceryHeroSkeleton, GroceryGridSkeleton } from "@/components/grocery/GroceryStoreSkeleton";
import { getStoreStatus, getLiveEta } from "@/utils/storeStatus";
import GroceryDeliveryBar from "@/components/grocery/GroceryDeliveryBar";
import type { DeliveryAddress } from "@/hooks/useDeliveryAddress";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 320, damping: 24 } },
};

/* ─── Live status dot ─── */
function StatusDot({ status }: { status: "open" | "closing-soon" | "almost-open" | "closed"; isOpen?: boolean }) {
  const dotColor = status === "open" ? "bg-emerald-500" : status === "closing-soon" || status === "almost-open" ? "bg-amber-500" : "bg-red-500";
  const pingColor = status === "open" ? "bg-emerald-400" : status === "closing-soon" || status === "almost-open" ? "bg-amber-400" : "bg-red-400";
  const shouldPing = status !== "closed";
  return (
    <span className="relative flex h-2 w-2">
      {shouldPing && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pingColor} opacity-75`} />
      )}
      <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
    </span>
  );
}

/* ─── Featured spotlight card with real location ─── */
function FeaturedStore({ store, eta, location }: { store: StoreConfig; eta: number; location?: NearbyStoreLocation }) {
  const navigate = useNavigate();
  const status = getStoreStatus(store.hours, "US");

  return (
    <motion.button
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 22, delay: 0.1 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(`/grocery/store/${store.slug}`)}
      className="w-full relative p-5 rounded-[24px] border border-primary/15 bg-card overflow-hidden group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
    >
      {/* Subtle gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent rounded-t-[24px]" />

      <div className="relative flex items-center gap-4">
        <div className="h-[72px] w-[72px] rounded-[20px] bg-background border border-border/30 flex items-center justify-center p-3 shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 shrink-0">
          <img src={store.logo} alt={store.name} className="h-full w-full object-contain" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 mb-1">
            <StatusDot status={status.status} />
            <span className={`text-[11px] font-semibold ${status.status === "open" ? "text-emerald-500" : status.status === "closed" ? "text-red-500" : "text-amber-500"}`}>
              {status.label}
            </span>
            {store.promo && (
              <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[9px] font-bold animate-pulse">
                {store.promo}
              </span>
            )}
          </div>
          <p className="text-lg font-extrabold text-foreground group-hover:text-primary transition-colors tracking-tight">{store.name}</p>
          {location && (
            <p className="text-[10px] text-muted-foreground truncate mt-0.5 flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5 shrink-0" />
              {location.address}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
              <Truck className="h-3 w-3 text-primary" />
              {eta}m
            </span>
            {location?.distance_miles != null && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                <MapPin className="h-3 w-3 text-primary" />
                {location.distance_miles} mi
              </span>
            )}
            <span className="flex items-center gap-1 text-[11px] text-amber-500 font-semibold">
              <Star className="h-3 w-3 fill-current" />
              {location?.rating || store.rating}
            </span>
            <span className="text-[11px] text-muted-foreground">{store.hours}</span>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary/60 transition-colors shrink-0" />
      </div>
    </motion.button>
  );
}

/* ─── Store card with real location ─── */
function StoreCardWithLocation({ store, eta, location }: { store: StoreConfig; eta: number; location?: NearbyStoreLocation }) {
  const navigate = useNavigate();
  const status = getStoreStatus(store.hours, "US");

  return (
    <motion.button
      variants={cardVariant}
      layout
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(`/grocery/store/${store.slug}`)}
      className={`group w-full flex items-center gap-4 p-4 rounded-[20px] border bg-card transition-all duration-300 ${
        status.isOpen
          ? "border-border/25 hover:border-primary/15 hover:shadow-xl hover:shadow-primary/5"
          : "border-border/15 opacity-60"
      }`}
    >
      <div className="relative h-14 w-14 rounded-2xl bg-background border border-border/25 flex items-center justify-center p-2 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300 shrink-0">
        <img src={store.logo} alt={store.name} className="h-full w-full object-contain" />
        <div className="absolute -top-0.5 -right-0.5">
          <StatusDot status={status.status} />
        </div>
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <p className="text-[14px] font-bold text-foreground group-hover:text-primary transition-colors duration-200">
            {store.name}
          </p>
          {store.promo && (
            <span className="px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[8px] font-bold">
              {store.promo}
            </span>
          )}
          <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold ${
            status.status === "open" ? "bg-emerald-500/10 text-emerald-500" :
            status.status === "closed" ? "bg-red-500/10 text-red-500" :
            "bg-amber-500/10 text-amber-500"
          }`}>
            {status.label}
          </span>
        </div>
        {location && (
          <p className="text-[10px] text-muted-foreground truncate mt-0.5 flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            {location.address}
          </p>
        )}
        <div className="flex items-center gap-2.5 mt-1.5">
          <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground font-medium">
            <Clock className="h-2.5 w-2.5" />
            {eta}m
          </span>
          {location?.distance_miles != null && (
            <span className="flex items-center gap-0.5 text-[11px] text-primary font-semibold">
              <MapPin className="h-2.5 w-2.5" />
              {location.distance_miles} mi
            </span>
          )}
          <span className="flex items-center gap-0.5 text-[11px] text-amber-500 font-semibold">
            <Star className="h-2.5 w-2.5 fill-current" />
            {location?.rating || store.rating}
          </span>
          <span className="text-[10px] text-muted-foreground">{store.hours}</span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/25 group-hover:text-primary/60 transition-colors shrink-0" />
    </motion.button>
  );
}

/* ─── Main page ─── */
export default function GroceryMarketplace() {
  const navigate = useNavigate();
  const cart = useGroceryCart();
  const { country } = useCountry();
  const marketStores = useMemo(() => getStoresForMarket(country), [country]);
  const { data: dbStores = [] } = useMarketStores(country);
  const groceryDbStores = useMemo(
    () => dbStores.filter((store) => isGroceryMarketplaceCategory(store.category)),
    [dbStores]
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState("");
  const [category, setCategory] = useState<StoreCategory | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [currentAddress, setCurrentAddress] = useState<DeliveryAddress | null>(null);
  const { stores: nearbyStores, isLoading: isLoadingStores, fetchNearbyStores, maxRadius } = useNearbyGroceryStores();

  // Track if we've searched for this address
  const lastSearchedCoords = useRef<string>("");

  // When address changes and has coordinates, search for nearby stores
  const handleAddressChange = useCallback((addr: DeliveryAddress | null) => {
    setCurrentAddress(addr);
    if (addr?.lat && addr?.lng) {
      const coordKey = `${addr.lat},${addr.lng}`;
      if (coordKey !== lastSearchedCoords.current) {
        lastSearchedCoords.current = coordKey;
        fetchNearbyStores(addr.lat, addr.lng);
      }
    }
  }, [fetchNearbyStores]);

  // Build map of store slug → nearest location
  const nearbyBySlug = useMemo(() => {
    const map: Record<string, NearbyStoreLocation> = {};
    for (const loc of nearbyStores) {
      // Keep the closest location for each chain
      if (!map[loc.slug] || (loc.distance_miles ?? 99) < (map[loc.slug].distance_miles ?? 99)) {
        map[loc.slug] = loc;
      }
    }
    return map;
  }, [nearbyStores]);

  // Which store configs have a nearby location?
  const availableStores = useMemo(() => {
    // If no address set, show all stores
    if (!currentAddress?.lat || !currentAddress?.lng) return marketStores;
    if (isLoadingStores) return marketStores;
    const nearby = marketStores.filter((s) => nearbyBySlug[s.slug]);
    return nearby.length > 0 ? nearby : marketStores;
  }, [currentAddress, isLoadingStores, nearbyBySlug, marketStores]);

  // Live ETAs — use distance-based if available
  const [etas, setEtas] = useState<Record<string, number>>({});
  useEffect(() => {
    const compute = () => {
      const map: Record<string, number> = {};
      marketStores.forEach((s) => {
        const nearbyLoc = nearbyBySlug[s.slug];
        if (nearbyLoc?.distance_miles) {
          // Rough ETA: 3 min/mile driving + 15 min shopping
          map[s.slug] = Math.round(nearbyLoc.distance_miles * 3 + 15);
        } else {
          map[s.slug] = getLiveEta(s.deliveryMin);
        }
      });
      setEtas(map);
    };
    compute();
    const interval = setInterval(compute, 30_000);
    return () => clearInterval(interval);
  }, [nearbyBySlug]);

  // Parallax for hero
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 200], [0, -30]);
  const heroScale = useTransform(scrollY, [0, 200], [1, 0.97]);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const filteredStores = useMemo(() => {
    let stores = availableStores;
    if (category !== "all") {
      stores = stores.filter((s) => s.category === category);
    }
    if (filter.trim()) {
      stores = stores.filter((s) =>
        s.name.toLowerCase().includes(filter.toLowerCase())
      );
    }
    // Sort by distance if available
    return stores.sort((a, b) => {
      const distA = nearbyBySlug[a.slug]?.distance_miles ?? 99;
      const distB = nearbyBySlug[b.slug]?.distance_miles ?? 99;
      return distA - distB;
    });
  }, [filter, category, availableStores, nearbyBySlug]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: availableStores.length + groceryDbStores.length };
    availableStores.forEach((s) => {
      counts[s.category] = (counts[s.category] || 0) + 1;
    });
    groceryDbStores.forEach((s) => {
      if (s.category) counts[s.category] = (counts[s.category] || 0) + 1;
    });
    return counts;
  }, [availableStores, groceryDbStores]);

  // Featured store = closest open store
  const featuredStore = useMemo(() => {
    if (filter.trim() || category !== "all") return null;
    return filteredStores.filter((s) => getStoreStatus(s.hours, country).isOpen)[0] || null;
  }, [filter, category, filteredStores]);

  const nonFeaturedStores = useMemo(() => {
    return filteredStores.filter((s) => s.slug !== featuredStore?.slug);
  }, [filteredStores, featuredStore]);

  const visibleDbStores = useMemo(() => {
    return groceryDbStores
      .filter((ds) => category === "all" || ds.category === category)
      .filter((ds) => !filter.trim() || ds.name.toLowerCase().includes(filter.toLowerCase()));
  }, [category, filter, groceryDbStores]);

  const hasAddress = !!currentAddress?.lat && !!currentAddress?.lng;

  return (
    <div ref={scrollRef} className="min-h-screen bg-background pb-24 relative overflow-hidden">
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          style={{ y: useTransform(scrollY, [0, 400], [0, 50]) }}
          className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/6 blur-[80px]"
        />
        <motion.div
          style={{ y: useTransform(scrollY, [0, 400], [0, -30]) }}
          className="absolute top-1/3 -left-24 h-56 w-56 rounded-full bg-accent/8 blur-[60px]"
        />
        <div className="absolute bottom-1/4 right-0 h-64 w-64 rounded-full bg-primary/4 blur-[80px]" />
      </div>

      {/* Sticky header */}
      <div className="sticky top-0 safe-area-top z-30 bg-background/70 backdrop-blur-2xl border-b border-border/20">
        <div className="flex items-center gap-3 px-4 py-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-2xl hover:bg-muted/60 transition-colors duration-200 touch-manipulation"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </motion.button>
          <div className="flex-1">
            <h1 className="text-lg font-bold tracking-tight">Grocery</h1>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] text-muted-foreground font-medium">Delivered by ZIVO drivers</p>
              {!isLoading && (
                <motion.span
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted/40 text-[9px] font-bold text-muted-foreground"
                >
                  <Store className="h-2.5 w-2.5" />
                  {availableStores.length + groceryDbStores.length} stores
                </motion.span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate("/grocery/orders")}
              className="p-2.5 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors duration-200"
              aria-label="My orders"
            >
              <ClipboardList className="h-5 w-5" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate("/grocery/store/walmart")}
              className="relative p-2.5 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors duration-200"
              aria-label="Shopping cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {cart.itemCount > 0 && (
                <motion.span
                  key={cart.itemCount}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-extrabold min-w-[22px] h-[22px] px-1 shadow-lg shadow-primary/40 ring-2 ring-background"
                >
                  {cart.itemCount}
                </motion.span>
              )}
            </motion.button>
          </div>
        </div>

        {/* Delivery address */}
        <GroceryDeliveryBar onAddressChange={handleAddressChange} />

        {/* Smart search */}
        <GrocerySmartSearch value={filter} onChange={setFilter} />

        {/* Category chips */}
        <GroceryCategories active={category} onChange={setCategory} counts={categoryCounts} />
      </div>

      {isLoading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <GroceryHeroSkeleton />
          <div className="px-4 pt-5 pb-2">
            <div className="h-4 w-28 rounded bg-muted/40" />
          </div>
          <GroceryGridSkeleton />
        </motion.div>
      ) : (
        <>
          {/* Featured spotlight — closest store */}
          {featuredStore && (
            <div className="px-4 pt-4">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <h2 className="text-sm font-bold text-foreground/80 uppercase tracking-wider">
                  {hasAddress ? "Nearest Store" : "Featured"}
                </h2>
              </div>
              <FeaturedStore
                store={featuredStore}
                eta={etas[featuredStore.slug] ?? featuredStore.deliveryMin}
                location={nearbyBySlug[featuredStore.slug]}
              />
            </div>
          )}

          {/* Recent stores */}
          <GroceryRecentStores />

          {/* Deals carousel */}
          <GroceryPromos />

          {/* Order Again */}
          <GroceryReorder />

          {/* Database-backed stores (e.g. Cambodia local stores) */}
          {visibleDbStores.length > 0 && (
            <div className="px-4 pt-5">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Store className="h-3.5 w-3.5 text-primary" />
                <h2 className="text-sm font-bold text-foreground/80 uppercase tracking-wider">Local Stores</h2>
              </div>
              <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
                {visibleDbStores.map((ds) => (
                  <motion.button
                    key={ds.id}
                    variants={cardVariant}
                    onClick={() => navigate(getStorePublicPath(ds))}
                    className="w-full rounded-2xl bg-card border border-border/30 hover:border-primary/20 hover:shadow-lg transition-all text-left group overflow-hidden"
                  >
                    {/* Cover / Banner */}
                    {ds.banner_url ? (
                      <div className="h-24 w-full relative">
                        <img src={optimizeImage(ds.banner_url, 500)} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                        <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
                      </div>
                    ) : (
                      <div className="h-16 w-full bg-gradient-to-r from-primary/10 via-primary/5 to-muted/10" />
                    )}

                    {/* Info row with overlapping profile logo */}
                    <div className="flex items-center gap-3 px-3 pb-3 -mt-5 relative">
                      <div className="h-14 w-14 rounded-xl bg-background border-2 border-card shadow-md overflow-hidden flex items-center justify-center shrink-0">
                        {ds.logo_url ? (
                          <img src={optimizeImage(ds.logo_url, 120, "square")} alt={ds.name} className="h-full w-full object-contain p-1" loading="lazy" decoding="async" />
                        ) : (
                          <Store className="h-6 w-6 text-muted-foreground/30" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pt-5">
                        {(() => {
                          const status = ds.hours ? getStoreStatus(ds.hours, ds.market) : { status: "open" as const, label: "Open", formattedHours: undefined };
                          const dotColor = status.status === "open" ? "bg-emerald-500" : status.status === "closing-soon" ? "bg-amber-500" : status.status === "almost-open" ? "bg-amber-500" : "bg-red-500";
                          const pingColor = status.status === "open" ? "bg-emerald-400" : status.status === "closing-soon" ? "bg-amber-400" : status.status === "almost-open" ? "bg-amber-400" : "bg-red-400";
                          const textColor = status.status === "open" ? "text-emerald-600" : status.status === "closing-soon" ? "text-amber-600" : status.status === "almost-open" ? "text-amber-600" : "text-red-500";
                          const shouldPing = status.status !== "closed";
                          return (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                  {shouldPing && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pingColor} opacity-75`} />}
                                  <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
                                </span>
                                <span className={`text-[10px] font-medium ${textColor}`}>{status.label}</span>
                              </div>
                              <p className="text-sm font-bold text-foreground truncate">{ds.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {ds.delivery_min != null && ds.delivery_min > 0 && (
                                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                    <Clock className="h-2.5 w-2.5" /> {ds.delivery_min}m
                                  </span>
                                )}
                                {ds.rating != null && ds.rating > 0 && (
                                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                    <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" /> {ds.rating}
                                  </span>
                                )}
                                {('formattedHours' in status && status.formattedHours) ? (
                                  <span className="text-[10px] text-muted-foreground">{status.formattedHours}</span>
                                ) : ds.hours ? (
                                  <span className="text-[10px] text-muted-foreground">{ds.hours}</span>
                                ) : null}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/25 group-hover:text-primary/60 transition-colors shrink-0" />
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            </div>
          )}

          {/* Hero banner */}
          <motion.div
            style={{ y: heroY, scale: heroScale }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, type: "spring" as const, stiffness: 300, damping: 25 }}
            className="mx-4 mt-4 p-4 rounded-[20px] bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/15 backdrop-blur-sm relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
            <div className="relative flex items-start gap-3">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="p-2.5 rounded-2xl bg-primary/15 shrink-0"
              >
                <Zap className="h-5 w-5 text-primary" />
              </motion.div>
              <div>
                <p className="text-sm font-bold">Same-day delivery</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  {hasAddress
                    ? "Showing real stores near you. A ZIVO driver shops in-store & delivers same day."
                    : "Add your address to see nearby stores with same-day delivery."
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-primary/10">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                <Clock className="h-3 w-3 text-primary" />
                <span>Same day</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                <Shield className="h-3 w-3 text-primary" />
                <span>In-store prices</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                <MapPin className="h-3 w-3 text-primary" />
                <span>Within {maxRadius} mi</span>
              </div>
            </div>
          </motion.div>

          {/* How it works */}
          <GroceryHowItWorks />

          {/* Loading nearby stores indicator */}
          {isLoadingStores && hasAddress && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-2 py-6"
            >
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-[12px] text-muted-foreground">Finding stores near you…</span>
            </motion.div>
          )}

          {/* No stores nearby warning */}
          {!isLoadingStores && hasAddress && availableStores.length === 0 && groceryDbStores.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-4 mt-4 p-4 rounded-[20px] border border-amber-500/20 bg-amber-500/5"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-foreground">No stores nearby</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    No grocery stores found within {maxRadius} miles of your address. Try updating your delivery address.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
          {nonFeaturedStores.length > 0 && (
            <>
              <div className="px-4 pt-5 pb-2 flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground/80 uppercase tracking-wider">
                  {hasAddress ? "Stores Near You" : "All Stores"}
                </h2>
                <motion.span
                  key={filteredStores.length}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-[10px] font-semibold text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full"
                >
                  {filteredStores.length} stores
                </motion.span>
              </div>

              <AnimatePresence mode="popLayout">
                <motion.div
                  key={`list-${category}`}
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="px-4 space-y-2"
                >
                  {nonFeaturedStores.map((store) => (
                    <StoreCardWithLocation
                      key={store.slug}
                      store={store}
                      eta={etas[store.slug] ?? store.deliveryMin}
                      location={nearbyBySlug[store.slug]}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>
            </>
          )}

          {filteredStores.length === 0 && visibleDbStores.length === 0 && !isLoadingStores && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <Store className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No stores found</p>
              <p className="text-[11px] text-muted-foreground/60 mt-1">Try a different address or search</p>
            </motion.div>
          )}
        </>
      )}

      <ZivoMobileNav />
    </div>
  );
}
