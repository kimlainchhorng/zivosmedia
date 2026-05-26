/**
 * FeaturedEatsSection — Live restaurant/food stores from Supabase
 * Falls back to curated cards if no stores exist yet
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Star from "lucide-react/dist/esm/icons/star";
import Clock from "lucide-react/dist/esm/icons/clock";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import Truck from "lucide-react/dist/esm/icons/truck";
import ShoppingCart from "lucide-react/dist/esm/icons/shopping-cart";
import Share2 from "lucide-react/dist/esm/icons/share-2";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { optimizeAvatar } from "@/utils/optimizeAvatar";
import { openShareToChat } from "@/components/chat/ShareToChatSheet";

const FOOD_CATEGORIES = ["restaurant", "food", "coffee", "cafe", "bakery", "eats", "pizza", "sushi", "burger", "asian", "fastfood"];

const FALLBACK = [
  { id: "f1", name: "Classic Burger", storeName: "Joe's Grill", price: 12.99, rating: 4.7, time: "20-30 min", category: "American", freeDelivery: true, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=400", slug: null },
  { id: "f2", name: "Margherita Pizza", storeName: "Bella Napoli", price: 14.99, rating: 4.9, time: "25-35 min", category: "Italian", freeDelivery: false, image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&q=80&w=400", slug: null },
  { id: "f3", name: "Pad Thai", storeName: "Thai Palace", price: 13.50, rating: 4.6, time: "20-30 min", category: "Asian", freeDelivery: true, image: "https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&q=80&w=400", slug: null },
  { id: "f4", name: "Chicken Tacos", storeName: "El Azteca", price: 10.99, rating: 4.8, time: "15-25 min", category: "Mexican", freeDelivery: false, image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=400", slug: null },
];

export default function FeaturedEatsSection() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("All");

  const { data: liveStores = [] } = useQuery({
    queryKey: ["featured-eats-stores"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("store_profiles")
        .select("id, name, address, rating, logo_url, banner_url, slug, delivery_min, category, is_verified")
        .in("category", FOOD_CATEGORIES)
        .eq("is_active", true)
        .order("rating", { ascending: false })
        .limit(8);
      return data || [];
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

  const useLive = liveStores.length >= 2;

  const liveCategories = useLive
    ? ["All", ...Array.from(new Set(liveStores.map((s: any) => s.category as string)
        .map((c: string) => c.charAt(0).toUpperCase() + c.slice(1))))]
    : ["All", "American", "Italian", "Asian", "Mexican"];

  const displayStores = useLive
    ? (activeCategory === "All"
        ? liveStores
        : liveStores.filter((s: any) => s.category?.toLowerCase() === activeCategory.toLowerCase()))
    : (activeCategory === "All" ? FALLBACK : FALLBACK.filter((f) => f.category === activeCategory));

  const handleQuickOrder = (e: React.MouseEvent, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    toast.success(`Opening ${name}…`, { duration: 1500 });
  };

  return (
    <section className="py-16 sm:py-20 bg-muted/30" aria-label="Featured food delivery">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10"
        >
          <div>
            <span className="inline-block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "hsl(var(--eats))" }}>Local favorites</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
              Order <span className="text-primary">Food Delivery</span>
            </h2>
            <p className="text-muted-foreground">
              {useLive ? `${liveStores.length} restaurants near you` : "Delicious food from local restaurants, delivered fast."}
            </p>
          </div>
          <Link to="/eats" className="text-primary font-semibold text-sm inline-flex items-center gap-1 hover:gap-2 transition-all">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        <div className="flex gap-2 mb-8 overflow-x-auto scrollbar-hide pb-1">
          {(liveCategories as string[]).map((c) => (
            <button type="button"
              key={c}
              onClick={() => setActiveCategory(c)}
              className={cn(activeCategory === c ? "chip-active" : "chip-inactive", "whitespace-nowrap hover:-translate-y-0.5 active:scale-95 transition-all touch-manipulation min-h-[36px]")}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {useLive
            ? displayStores.map((store: any, i: number) => (
              <motion.div
                key={store.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <div
                  onClick={() => navigate(store.slug ? `/store/${store.slug}` : `/eats`)}
                  className="group block rounded-2xl bg-card border border-border/50 overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1.5 transition-all duration-300 touch-manipulation active:scale-[0.99] cursor-pointer"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    {store.banner_url || store.logo_url ? (
                      <img
                        src={optimizeAvatar(store.banner_url || store.logo_url, 400) || store.banner_url || store.logo_url}
	                        alt={store.name}
	                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
	                        loading="lazy"
	                        decoding="async"
	                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-orange-500/10 to-primary/5">
                        🍽️
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent opacity-50 group-hover:opacity-30 transition-opacity duration-500" />
                    {store.delivery_min === 0 && (
                      <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary text-primary-foreground shadow-sm flex items-center gap-1">
                        <Truck className="w-3 h-3" /> Free Delivery
                      </span>
                    )}
                    <button type="button"
                      onClick={(e) => handleQuickOrder(e, store.name)}
                      className="absolute bottom-3 right-3 w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-ig-gradient text-white flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 hover:scale-110 active:scale-90 shadow-lg shadow-rose-500/25 touch-manipulation"
                      aria-label={`Order from ${store.name}`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                    </button>
                    <button type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); openShareToChat({ kind: "eats", title: store.name, subtitle: store.address || store.category, meta: store.delivery_min != null ? `${store.delivery_min} min delivery` : undefined, image: store.banner_url || store.logo_url || null, deepLink: store.slug ? `/store/${store.slug}` : "/eats" }); }}
                      className="absolute top-3 right-3 w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 hover:bg-card active:scale-90 touch-manipulation"
                      aria-label={`Share ${store.name}`}
                    >
                      <Share2 className="w-4 h-4 text-foreground" />
                    </button>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-base mb-1 truncate">{store.name}</h3>
                    <p className="text-xs text-muted-foreground mb-3 truncate">{store.address || store.category}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {store.rating != null && (
                          <span className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-[hsl(var(--hotels))] fill-current" />
                            {Number(store.rating).toFixed(1)}
                          </span>
                        )}
                        {store.delivery_min != null && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {store.delivery_min} min
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="mt-3 text-primary text-sm font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                      Order Now <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
            : FALLBACK.filter(f => activeCategory === "All" || f.category === activeCategory).map((food, i) => (
              <motion.div
                key={food.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <Link
                  to="/eats"
                  className="group block rounded-2xl bg-card border border-border/50 overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1.5 transition-all duration-300 touch-manipulation active:scale-[0.99]"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
	                    <img src={food.image} alt={food.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" decoding="async" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent opacity-50 group-hover:opacity-30 transition-opacity duration-500" />
                    {food.freeDelivery && (
                      <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary text-primary-foreground shadow-sm flex items-center gap-1">
                        <Truck className="w-3 h-3" /> Free Delivery
                      </span>
                    )}
                    <button type="button"
                      onClick={(e) => handleQuickOrder(e, food.name)}
                      className="absolute bottom-3 right-3 w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-ig-gradient text-white flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 hover:scale-110 active:scale-90 shadow-lg shadow-rose-500/25 touch-manipulation"
                    >
                      <ShoppingCart className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-base mb-1">{food.name}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{food.storeName}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-[hsl(var(--hotels))] fill-current" /> {food.rating}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {food.time}</span>
                      </div>
                      <p className="font-bold text-base">${food.price}</p>
                    </div>
                    <span className="mt-3 text-primary text-sm font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                      Order Now <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))
          }
        </div>
      </div>
    </section>
  );
}
