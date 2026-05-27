/**
 * PlacesPage — Foursquare-style place directory.
 * Backed by the real `places` table.
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Star, Search, ShieldCheck, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface PlaceRow {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  cover_url: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  review_count: number | null;
  is_verified: boolean | null;
}

export default function PlacesPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const { data: places = [], isLoading } = useQuery({
    queryKey: ["places-catalog"],
    queryFn: async () => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            order: (k: string, opts: { ascending: boolean; nullsFirst?: boolean }) => Promise<{ data: PlaceRow[] | null }>;
          };
        };
      };
      const { data } = await sb
        .from("places")
        .select("id, name, description, category, cover_url, address, lat, lng, rating, review_count, is_verified")
        .order("rating", { ascending: false, nullsFirst: false });
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    places.forEach((p) => { if (p.category) set.add(p.category); });
    return Array.from(set);
  }, [places]);

  const filtered = useMemo(() => {
    let out = places;
    if (activeCategory !== "All") out = out.filter((p) => p.category === activeCategory);
    const q = query.trim().toLowerCase();
    if (q) {
      out = out.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false) ||
        (p.address?.toLowerCase().includes(q) ?? false),
      );
    }
    return out;
  }, [places, query, activeCategory]);

  const verifiedCount = places.filter((p) => p.is_verified).length;

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Places · ZIVO" description="Discover venues and locations near you." />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <MapPin className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Places</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Directory</p>
          <p className="text-3xl font-bold mt-1">{places.length} places</p>
          <p className="text-sm text-white/80 mt-1 inline-flex items-center gap-1">
            <ShieldCheck className="h-4 w-4" /> {verifiedCount} verified
          </p>
        </motion.div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Search places by name or address"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-11 pl-9 pr-3 rounded-xl bg-card border border-border text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/30"
          />
        </div>

        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setActiveCategory(c)}
                className={cn(
                  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize",
                  activeCategory === c ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && places.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <MapPin className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No places yet</p>
            <p className="text-xs text-muted-foreground">Venues will appear here as they're added.</p>
          </div>
        )}

        {!isLoading && places.length > 0 && filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No places match your search.</p>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((p, idx) => (
              <motion.button
                key={p.id}
                type="button"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => navigate(`/places/${p.id}`)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left"
              >
                <div className="shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-muted">
                  {p.cover_url ? (
                    <img src={p.cover_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-ig-gradient flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-white/85" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-foreground line-clamp-1">{p.name}</p>
                    {p.is_verified && (
                      <ShieldCheck className="h-3 w-3 text-ig-gradient shrink-0" aria-label="Verified" />
                    )}
                  </div>
                  {p.category && (
                    <p className="text-[11px] text-muted-foreground capitalize line-clamp-1">{p.category}</p>
                  )}
                  {p.address && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1 inline-flex items-center gap-0.5 mt-0.5">
                      <MapPin className="h-2.5 w-2.5" /> {p.address}
                    </p>
                  )}
                  {p.rating != null && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      <span className="text-[11px] font-bold text-foreground">{p.rating.toFixed(1)}</span>
                      {p.review_count != null && (
                        <span className="text-[10px] text-muted-foreground">({p.review_count})</span>
                      )}
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
