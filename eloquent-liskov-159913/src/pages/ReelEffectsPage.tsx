/**
 * ReelEffectsPage — Browse reel effects catalog.
 * Backed by `reel_effects` orphan schema.
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Wand2, TrendingUp, Lock, Plus, Sparkles, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EffectRow {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  preview_url: string | null;
  is_premium: boolean | null;
  usage_count: number | null;
}

function formatCount(n: number | null): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export default function ReelEffectsPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("All");

  const { data: effects = [], isLoading } = useQuery({
    queryKey: ["reel-effects"],
    queryFn: async () => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            order: (k: string, opts: { ascending: boolean }) => Promise<{ data: EffectRow[] | null }>;
          };
        };
      };
      const { data } = await sb
        .from("reel_effects")
        .select("id, name, description, category, preview_url, is_premium, usage_count")
        .order("usage_count", { ascending: false });
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    effects.forEach((e) => { if (e.category) set.add(e.category); });
    return Array.from(set);
  }, [effects]);

  const filtered = useMemo(() => {
    if (activeCategory === "All") return effects;
    return effects.filter((e) => e.category === activeCategory);
  }, [effects, activeCategory]);

  const handleUse = (e: EffectRow) => {
    if (e.is_premium) {
      toast.info("Premium effect — unlock with ZIVO+");
      return;
    }
    toast.success(`${e.name} ready — opens in Reels creator next.`);
    navigate("/feed/new");
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Reel Effects · ZIVO" description="Effects to use in your reels and stories." />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Wand2 className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Reel Effects</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Catalog</p>
          <p className="text-3xl font-bold mt-1">{effects.length} effects</p>
          <p className="text-sm text-white/80 mt-1">across {categories.length - 1} categories</p>
        </motion.div>

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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && effects.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Wand2 className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No effects yet</p>
            <p className="text-xs text-muted-foreground">The catalog will appear here as effects publish.</p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map((e, idx) => (
              <motion.button
                key={e.id}
                type="button"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleUse(e)}
                className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted shadow-sm text-left active:opacity-90"
              >
                {e.preview_url ? (
                  <img src={e.preview_url} alt={e.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full bg-ig-gradient flex items-center justify-center">
                    <Wand2 className="h-10 w-10 text-white/85" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />

                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {e.category && (
                    <span className="bg-white/95 text-foreground text-[10px] font-bold rounded-full px-2 py-0.5">{e.category}</span>
                  )}
                  {e.is_premium && (
                    <span className="bg-ig-gradient text-white text-[10px] font-bold rounded-full px-2 py-0.5 inline-flex items-center gap-0.5">
                      <Lock className="h-2.5 w-2.5" /> Premium
                    </span>
                  )}
                </div>

                {!e.is_premium && (
                  <div className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-white/95 flex items-center justify-center shadow-md">
                    <Play className="h-4 w-4 text-foreground ml-0.5" fill="currentColor" />
                  </div>
                )}

                <div className="absolute bottom-3 left-3 right-12 text-white">
                  <p className="text-sm font-bold drop-shadow-md line-clamp-1">{e.name}</p>
                  <div className="flex items-center gap-2 text-[10px] text-white/85 mt-0.5">
                    {e.usage_count != null && (
                      <span className="inline-flex items-center gap-0.5">
                        <TrendingUp className="h-2.5 w-2.5" /> {formatCount(e.usage_count)} uses
                      </span>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground text-center pt-2">
          <Plus className="h-3 w-3 inline" strokeWidth={3} /> Tap an effect to start a reel with it applied.
        </p>
      </div>
    </SwipeBackContainer>
  );
}
