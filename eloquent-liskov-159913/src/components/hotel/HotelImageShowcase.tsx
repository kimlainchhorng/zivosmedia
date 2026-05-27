import { Star, MapPin, Heart, ArrowRight, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { optimizeAvatar } from "@/utils/optimizeAvatar";

/**
 * HotelImageShowcase — Premium visual grid backed by live store_profiles.
 * Renders nothing if there are no real lodging stores yet, so users never
 * see fabricated property listings.
 */

const HOTEL_CATEGORIES = ["hotel", "resort", "lodging", "accommodation", "guesthouse", "hostel", "motel", "villa"];

interface HotelImageShowcaseProps {
  onSelect?: (hotelName: string) => void;
  className?: string;
}

export default function HotelImageShowcase({ onSelect, className }: HotelImageShowcaseProps) {
  const { data: stores = [] } = useQuery({
    queryKey: ["hotel-showcase-stores"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("store_profiles")
        .select("id, name, address, rating, banner_url, logo_url, slug, price_per_night, category, is_verified")
        .in("category", HOTEL_CATEGORIES)
        .eq("is_active", true)
        .order("rating", { ascending: false })
        .limit(6);
      return data || [];
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

  if (stores.length === 0) return null;

  return (
    <section className={cn("py-12 sm:py-16 lg:py-20 relative overflow-hidden", className)}>
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-orange-500/5" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium mb-4">
            <Crown className="w-4 h-4" />
            Hand-Picked Selection
          </div>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
            Featured <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">Properties</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Stays from verified hosts with strong guest ratings
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {(stores as any[]).map((s, index) => {
            const featured = index === 0;
            const img = s.banner_url || s.logo_url;
            return (
              <div
                key={s.id}
                className={cn(
                  "group relative overflow-hidden rounded-2xl sm:rounded-3xl cursor-pointer",
                  "transition-all duration-500 hover:-translate-y-1",
                  featured && "sm:col-span-2 lg:col-span-1 lg:row-span-2",
                  featured ? "h-80 sm:h-96 lg:h-full" : "h-64 sm:h-72",
                )}
                onClick={() => onSelect?.(s.name)}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {img ? (
                  <img
                    src={optimizeAvatar(img, 800) || img}
	                    alt={s.name}
	                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
	                    loading="lazy"
	                    decoding="async"
	                  />
                ) : (
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br from-amber-500/20 to-orange-500/10">
                    🏨
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                {s.is_verified && (
                  <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-primary-foreground border-0 shadow-lg">
                      Verified
                    </Badge>
                    <button type="button" className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition-all duration-200 group/heart">
                      <Heart className="w-5 h-5 text-primary-foreground group-hover/heart:text-red-400 group-hover/heart:fill-red-400 transition-all duration-200" />
                    </button>
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  {s.category && (
                    <span className="text-xs font-medium text-amber-400 uppercase tracking-wider mb-2 block">
                      {s.category}
                    </span>
                  )}

                  <h3 className="font-display text-xl sm:text-2xl font-bold text-primary-foreground mb-1 group-hover:text-amber-200 transition-all duration-200">
                    {s.name}
                  </h3>
                  {s.address && (
                    <div className="flex items-center gap-1 text-primary-foreground/80 text-sm mb-3">
                      <MapPin className="w-3.5 h-3.5" />
                      {s.address}
                    </div>
                  )}

                  {s.rating != null && (
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="font-bold text-primary-foreground text-sm">{Number(s.rating).toFixed(1)}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    {s.price_per_night != null && (
                      <div>
                        <span className="text-2xl sm:text-3xl font-bold text-primary-foreground">${s.price_per_night}</span>
                        <span className="text-primary-foreground/60 text-sm">/night</span>
                      </div>
                    )}
                    <Button
                      size="sm"
                      className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-primary-foreground border-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                    >
                      View <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="absolute inset-0 rounded-2xl sm:rounded-3xl ring-2 ring-transparent group-hover:ring-amber-500/50 transition-all duration-200" />
              </div>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <Button
            size="lg"
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-primary-foreground shadow-lg shadow-amber-500/30 gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Explore All Properties
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
