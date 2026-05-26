/**
 * ARFiltersPage — Browse and apply AR effects in stories, reels, and live streams.
 * Mock catalog (no live AR engine yet) — pattern matches a future
 * `ar_effects` table 1:1.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Star, Wand2, Smile, Sun, Snowflake, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { cn } from "@/lib/utils";

type Category = "Trending" | "Beauty" | "Vintage" | "Effects" | "Fun";

interface Filter {
  id: string;
  name: string;
  creator: string;
  cover: string;
  uses: number;
  category: Category;
  icon: typeof Sparkles;
}

const FILTERS: Filter[] = [
  { id: "f1", name: "Golden Hour", creator: "ZIVO Studio", cover: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400", uses: 142000, category: "Trending", icon: Sun },
  { id: "f2", name: "Soft Glow", creator: "Lina Park", cover: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400", uses: 89200, category: "Beauty", icon: Sparkles },
  { id: "f3", name: "Film Grain '92", creator: "Retro Lab", cover: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=400", uses: 67000, category: "Vintage", icon: Star },
  { id: "f4", name: "Cinematic Blur", creator: "ZIVO Studio", cover: "https://images.unsplash.com/photo-1517483000871-1dbf64a6e1c6?w=400", uses: 54300, category: "Effects", icon: Wand2 },
  { id: "f5", name: "Soft Snow", creator: "Hayden West", cover: "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=400", uses: 42800, category: "Effects", icon: Snowflake },
  { id: "f6", name: "Studio Smile", creator: "ZIVO Studio", cover: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400", uses: 38100, category: "Beauty", icon: Smile },
  { id: "f7", name: "Heart Confetti", creator: "Aya Tanaka", cover: "https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?w=400", uses: 29900, category: "Fun", icon: Heart },
  { id: "f8", name: "Sun Flare", creator: "Marcus Ferrell", cover: "https://images.unsplash.com/photo-1502780402662-acc01917c4e3?w=400", uses: 25400, category: "Trending", icon: Sun },
];

const CATEGORIES: Category[] = ["Trending", "Beauty", "Vintage", "Effects", "Fun"];

function formatUses(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function ARFiltersPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState<Category>("Trending");
  const [savedId, setSavedId] = useState<string | null>(null);

  const filtered = FILTERS.filter((f) => f.category === active);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="AR Filters · ZIVO" description="Browse and apply AR effects in stories, reels, and live streams." />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Wand2 className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">AR Filters</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto pb-12">
        {/* Hero banner */}
        <div className="px-4 pt-5">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
          >
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Featured</p>
            <p className="text-2xl font-bold leading-tight mt-1">{FILTERS.length}+ AR filters ready</p>
            <p className="text-sm text-white/80 mt-1">Tap any filter to save it to your camera tray.</p>
          </motion.div>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-4">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActive(c)}
              className={cn(
                "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                active === c
                  ? "bg-ig-gradient text-white shadow-sm"
                  : "bg-secondary text-foreground hover:bg-muted",
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-4">
          {filtered.map((f, idx) => {
            const Icon = f.icon;
            const isSaved = savedId === f.id;
            return (
              <motion.button
                key={f.id}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setSavedId(isSaved ? null : f.id)}
                className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted shadow-sm text-left active:opacity-90"
                aria-pressed={isSaved}
              >
	                <img src={f.cover} alt={f.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute top-2 left-2 inline-flex items-center gap-1 bg-white/95 text-foreground text-[10px] font-bold rounded-full px-2 py-0.5">
                  <Icon className="h-2.5 w-2.5" />
                  {f.category}
                </div>
                {isSaved && (
                  <div className="absolute top-2 right-2 inline-flex items-center gap-1 bg-ig-gradient text-white text-[10px] font-bold rounded-full px-2 py-0.5 shadow-sm">
                    Saved
                  </div>
                )}
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <p className="text-sm font-bold leading-tight">{f.name}</p>
                  <p className="text-[11px] text-white/80 mt-0.5 line-clamp-1">{f.creator}</p>
                  <p className="text-[10px] text-white/65 mt-0.5">{formatUses(f.uses)} uses</p>
                </div>
              </motion.button>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground text-center px-6 pt-8">
          Saved filters open in the camera tray. Live AR rendering rolls out in beta.
        </p>
      </div>
    </SwipeBackContainer>
  );
}
