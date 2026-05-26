/**
 * FeaturedHotelsSection — Live hotel stores from Supabase.
 * Renders nothing if there are no real hotel stores yet — no placeholder
 * cards, so users never see fabricated properties.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Star from "lucide-react/dist/esm/icons/star";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import Heart from "lucide-react/dist/esm/icons/heart";
import Share2 from "lucide-react/dist/esm/icons/share-2";
import Wifi from "lucide-react/dist/esm/icons/wifi";
import Waves from "lucide-react/dist/esm/icons/waves";
import Dumbbell from "lucide-react/dist/esm/icons/dumbbell";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { optimizeAvatar } from "@/utils/optimizeAvatar";
import { openShareToChat } from "@/components/chat/ShareToChatSheet";
import { SmartImage } from "@/components/shared/SmartImage";

const HOTEL_CATEGORIES = ["hotel", "resort", "lodging", "accommodation", "guesthouse", "hostel", "motel", "villa"];

const amenityIcons: Record<string, typeof Wifi> = { wifi: Wifi, pool: Waves, gym: Dumbbell };

export default function FeaturedHotelsSection() {
  const navigate = useNavigate();
  const [savedHotels, setSavedHotels] = useState<Set<string>>(new Set());

  const { data: liveStores = [] } = useQuery({
    queryKey: ["featured-hotels-stores"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("store_profiles")
        .select("id, name, address, rating, logo_url, banner_url, slug, price_per_night, category, is_verified, amenities")
        .in("category", HOTEL_CATEGORIES)
        .eq("is_active", true)
        .order("rating", { ascending: false })
        .limit(8);
      return data || [];
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

  if (liveStores.length === 0) return null;

  const toggleSave = (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSavedHotels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast("Removed from saved", { duration: 1500 });
      } else {
        next.add(id);
        toast.success("Saved to favorites!", { duration: 1500 });
      }
      return next;
    });
  };

  return (
    <section className="py-16 sm:py-20" aria-label="Featured hotels">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10"
        >
          <div>
            <span className="inline-block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "hsl(var(--hotels))" }}>Handpicked stays</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
              Featured <span className="text-primary">Hotels</span>
            </h2>
            <p className="text-muted-foreground">
              {`${liveStores.length} properties near you`}
            </p>
          </div>
          <Link to="/hotels" className="text-primary font-semibold text-sm inline-flex items-center gap-1 hover:gap-2 transition-all">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {liveStores.map((store: any, i: number) => (
              <motion.div
                key={store.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <div
                  onClick={() => navigate(store.slug ? `/store/${store.slug}` : `/hotels`)}
                  className="group block rounded-2xl bg-card border border-border/50 overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1.5 transition-all duration-300 touch-manipulation active:scale-[0.99] cursor-pointer"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {store.banner_url || store.logo_url ? (
                      <SmartImage
                        src={optimizeAvatar(store.banner_url || store.logo_url, 500) || store.banner_url || store.logo_url}
                        alt={store.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        size={500}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-amber-500/10 to-primary/5">
                        🏨
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />
                    {store.price_per_night != null && (
                      <div className="absolute top-3 right-3 bg-primary text-primary-foreground px-3 py-1.5 rounded-xl text-sm font-bold shadow-lg">
                        ${store.price_per_night}<span className="text-xs font-normal opacity-80">/night</span>
                      </div>
                    )}
                    <button type="button"
                      onClick={(e) => toggleSave(e, store.id, store.name)}
                      className="absolute top-3 left-3 w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 hover:bg-card active:scale-90 touch-manipulation"
                      aria-label={`Save ${store.name}`}
                    >
                      <Heart className={`w-4 h-4 transition-colors ${savedHotels.has(store.id) ? "text-destructive fill-current" : "text-foreground"}`} />
                    </button>
                    <button type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); openShareToChat({ kind: "hotel", title: store.name, subtitle: store.address || store.category, meta: store.price_per_night != null ? `$${store.price_per_night}/night` : undefined, image: store.banner_url || store.logo_url || null, deepLink: store.slug ? `/store/${store.slug}` : "/hotels" }); }}
                      className="absolute top-3 right-3 w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 hover:bg-card active:scale-90 touch-manipulation"
                      aria-label={`Share ${store.name}`}
                    >
                      <Share2 className="w-4 h-4 text-foreground" />
                    </button>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-base mb-1.5 truncate">{store.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3 truncate">
                      <MapPin className="w-3.5 h-3.5 shrink-0" /> {store.address || store.category}
                    </p>
                    <div className="flex items-center justify-between mb-3">
                      {store.rating != null && (
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <Star key={j} className={`w-3.5 h-3.5 ${j < Math.floor(Number(store.rating)) ? "text-[hsl(var(--hotels))] fill-current" : "text-muted-foreground/30"}`} />
                          ))}
                          <span className="text-xs font-semibold ml-1">{Number(store.rating).toFixed(1)}</span>
                        </div>
                      )}
                      {Array.isArray(store.amenities) && store.amenities.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          {store.amenities.slice(0, 3).map((a: string) => {
                            const Icon = amenityIcons[a.toLowerCase()];
                            return Icon ? <Icon key={a} className="w-3.5 h-3.5 text-muted-foreground/50" /> : null;
                          })}
                        </div>
                      )}
                    </div>
                    <span className="text-primary text-sm font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                      Book Now <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
        </div>
      </div>
    </section>
  );
}
