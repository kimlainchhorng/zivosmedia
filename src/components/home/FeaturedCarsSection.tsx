/**
 * FeaturedCarsSection — Live car rental stores from Supabase.
 * Renders nothing if there are no real stores yet — no placeholder
 * vehicles, so users never see fabricated rental listings.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Star from "lucide-react/dist/esm/icons/star";
import Users from "lucide-react/dist/esm/icons/users";
import Fuel from "lucide-react/dist/esm/icons/fuel";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import Share2 from "lucide-react/dist/esm/icons/share-2";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { optimizeAvatar } from "@/utils/optimizeAvatar";
import { openShareToChat } from "@/components/chat/ShareToChatSheet";

const CAR_CATEGORIES = ["car-rental", "rent-car", "auto-dealership", "car-hire", "vehicle-rental"];

export default function FeaturedCarsSection() {
  const navigate = useNavigate();
  const [active, setActive] = useState("All");

  const { data: liveStores = [] } = useQuery({
    queryKey: ["featured-cars-stores"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("store_profiles")
        .select("id, name, address, rating, logo_url, banner_url, slug, price_per_day, category, vehicle_type, seats, fuel_type, is_verified")
        .in("category", CAR_CATEGORIES)
        .eq("is_active", true)
        .order("rating", { ascending: false })
        .limit(8);
      return data || [];
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

  if (liveStores.length === 0) return null;

  const types: string[] = [
    "All",
    ...Array.from(
      new Set(
        liveStores.map((s: any) => {
          const t = (s.vehicle_type as string | null) || "Other";
          return t.charAt(0).toUpperCase() + t.slice(1);
        }),
      ),
    ) as string[],
  ];

  const displayItems =
    active === "All"
      ? liveStores
      : liveStores.filter((s: any) => s.vehicle_type?.toLowerCase() === active.toLowerCase());

  return (
    <section className="py-16 sm:py-20 bg-muted/30" aria-label="Featured car rentals">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10"
        >
          <div>
            <span className="inline-block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "hsl(var(--cars))" }}>Best deals</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
              Popular <span className="text-primary">Car Rentals</span>
            </h2>
            <p className="text-muted-foreground">{`${liveStores.length} vehicles available`}</p>
          </div>
          <Link to="/rent-car" className="text-primary font-semibold text-sm inline-flex items-center gap-1 hover:gap-2 transition-all">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        <div className="flex gap-2 mb-8 overflow-x-auto scrollbar-hide pb-1">
          {types.map(f => (
            <button type="button"
              key={f}
              onClick={() => setActive(f)}
              className={cn(active === f ? "chip-active" : "chip-inactive", "whitespace-nowrap hover:-translate-y-0.5 active:scale-95 transition-all touch-manipulation min-h-[36px]")}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {(displayItems as any[]).map((store, i) => (
            <motion.div
              key={store.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <div
                onClick={() => navigate(store.slug ? `/store/${store.slug}` : `/rent-car`)}
                className="group block rounded-2xl bg-card border border-border/50 overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1.5 transition-all duration-300 touch-manipulation active:scale-[0.99] cursor-pointer"
              >
                <div className="relative aspect-video overflow-hidden bg-muted/50">
                  {store.banner_url || store.logo_url ? (
                    <img
                      src={optimizeAvatar(store.banner_url || store.logo_url, 400) || store.banner_url || store.logo_url}
	                      alt={store.name}
	                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
	                      loading="lazy"
	                      decoding="async"
	                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-teal-500/10 to-primary/5">
                      🚗
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent opacity-50 group-hover:opacity-30 transition-opacity duration-500" />
                  {store.is_verified && (
                    <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary text-primary-foreground shadow-sm">
                      Verified
                    </span>
                  )}
                  <button type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openShareToChat({ kind: "ride", title: store.name, subtitle: store.address || store.vehicle_type || "Car rental", meta: store.price_per_day != null ? `$${store.price_per_day}/day` : undefined, image: store.banner_url || store.logo_url || null, deepLink: store.slug ? `/store/${store.slug}` : "/rent-car" }); }}
                    className="absolute top-3 right-3 w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 hover:bg-card active:scale-90 touch-manipulation"
                    aria-label={`Share ${store.name}`}
                  >
                    <Share2 className="w-4 h-4 text-foreground" />
                  </button>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-base truncate flex-1">{store.name}</h3>
                    {store.rating != null && (
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Star className="w-3.5 h-3.5 text-[hsl(var(--hotels))] fill-current" />
                        <span className="text-xs font-semibold">{Number(store.rating).toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                    {store.seats && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {store.seats}</span>}
                    {store.fuel_type && <span className="flex items-center gap-1"><Fuel className="w-3.5 h-3.5" /> {store.fuel_type}</span>}
                    {store.vehicle_type && <span className="px-2 py-0.5 rounded-full bg-muted text-xs">{store.vehicle_type}</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    {store.price_per_day != null && (
                      <p className="text-lg font-bold">
                        <span className="gradient-text-primary">${store.price_per_day}</span>
                        <span className="text-sm font-normal text-muted-foreground">/day</span>
                      </p>
                    )}
                    <span className="text-primary text-sm font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all ml-auto">
                      Rent Now <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
