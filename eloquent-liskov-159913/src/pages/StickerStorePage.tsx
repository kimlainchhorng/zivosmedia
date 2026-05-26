/**
 * StickerStorePage — Browse sticker packs from the catalog.
 * Backed by the real `sticker_store_packs` table (catalog, not per-user).
 * Tap a pack to preview its stickers in a sheet.
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Sparkles, Search, X, Smile, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PackRow {
  id: string;
  name: string;
  category: string | null;
  gradient_color: string;
  preview_emoji: string;
  sticker_count: number;
  stickers: unknown;
  is_active: boolean | null;
}

function gradientStyle(value: string | null): React.CSSProperties {
  // Schema stores gradient_color as a hex pair or single color. Accept both.
  if (!value) return { backgroundImage: "var(--ig-gradient)" };
  // If it looks like a JSON array or comma-separated, treat as gradient stops.
  const parts = value.includes(",") ? value.split(",").map((s) => s.trim()) : [value];
  if (parts.length >= 2) {
    return { backgroundImage: `linear-gradient(135deg, ${parts.join(", ")})` };
  }
  return { backgroundColor: parts[0] };
}

function stickersOf(pack: PackRow): string[] {
  if (Array.isArray(pack.stickers)) {
    return (pack.stickers as unknown[]).filter((s): s is string => typeof s === "string");
  }
  // If stickers is object form like {items:["😀",...]}.
  if (pack.stickers && typeof pack.stickers === "object" && "items" in (pack.stickers as Record<string, unknown>)) {
    const items = (pack.stickers as Record<string, unknown>).items;
    if (Array.isArray(items)) return items.filter((s): s is string => typeof s === "string");
  }
  return [];
}

export default function StickerStorePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [openPackId, setOpenPackId] = useState<string | null>(null);

  const { data: packs = [], isLoading } = useQuery({
    queryKey: ["sticker-store-packs"],
    queryFn: async () => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: boolean) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: PackRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("sticker_store_packs")
        .select("id, name, category, gradient_color, preview_emoji, sticker_count, stickers, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    packs.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [packs]);

  const filtered = useMemo(() => {
    let out = packs;
    if (activeCategory !== "All") out = out.filter((p) => p.category === activeCategory);
    const q = query.trim().toLowerCase();
    if (q) out = out.filter((p) => p.name.toLowerCase().includes(q));
    return out;
  }, [packs, activeCategory, query]);

  const openPack = packs.find((p) => p.id === openPackId);

  const handleAddSticker = (emoji: string) => {
    navigator.clipboard?.writeText(emoji).catch(() => { /* clipboard may be blocked */ });
    toast.success(`${emoji} copied — paste into a story or message.`);
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Sticker Store · ZIVO" description="Browse sticker packs for your stories and reels." />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Smile className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Sticker Store</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Catalog</p>
          <p className="text-3xl font-bold mt-1">{packs.length} {packs.length === 1 ? "pack" : "packs"}</p>
          <p className="text-sm text-white/80 mt-1">
            Free for stories, reels, and messages.
          </p>
        </motion.div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Search packs"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-11 pl-9 pr-3 rounded-xl bg-card border border-border text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/30"
          />
        </div>

        {/* Category chips */}
        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setActiveCategory(c)}
                className={cn(
                  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize",
                  activeCategory === c
                    ? "bg-ig-gradient text-white shadow-sm"
                    : "bg-secondary text-foreground hover:bg-muted",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Pack grid */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && packs.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Smile className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No sticker packs yet</p>
            <p className="text-xs text-muted-foreground">Packs will appear here as the catalog publishes.</p>
          </div>
        )}

        {!isLoading && packs.length > 0 && filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-10">No packs match your search.</p>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((p, idx) => (
              <motion.button
                key={p.id}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setOpenPackId(p.id)}
                className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-md text-left"
                style={gradientStyle(p.gradient_color)}
                aria-label={`Open pack ${p.name}`}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                <div className="absolute top-3 left-3 text-4xl drop-shadow-md select-none">{p.preview_emoji}</div>
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <p className="text-sm font-bold line-clamp-1 drop-shadow-md">{p.name}</p>
                  <p className="text-[10px] text-white/85">{p.sticker_count} stickers{p.category ? ` · ${p.category}` : ""}</p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Pack preview sheet */}
      <AnimatePresence>
        {openPack && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpenPackId(null)}
            className="fixed inset-0 z-[1600] bg-background/95 backdrop-blur-xl flex items-end sm:items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl bg-card border border-border shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div
                className="relative p-5 text-white"
                style={gradientStyle(openPack.gradient_color)}
              >
                <div className="absolute inset-0 bg-black/15" />
                <div className="relative z-10 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-white/95 flex items-center justify-center text-3xl">{openPack.preview_emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold drop-shadow-md">{openPack.name}</p>
                    <p className="text-[11px] text-white/85">{openPack.sticker_count} stickers{openPack.category ? ` · ${openPack.category}` : ""}</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={() => setOpenPackId(null)}
                    className="h-9 w-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Sticker grid */}
              <div className="p-4 max-h-[55vh] overflow-y-auto">
                {(() => {
                  const items = stickersOf(openPack);
                  if (items.length === 0) {
                    return (
                      <p className="text-xs text-muted-foreground text-center py-6">
                        This pack ships as visual asset URLs — no inline emoji preview available.
                      </p>
                    );
                  }
                  return (
                    <div className="grid grid-cols-5 gap-2">
                      {items.map((emoji, i) => (
                        <motion.button
                          key={`${openPack.id}-${i}`}
                          type="button"
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleAddSticker(emoji)}
                          className="aspect-square rounded-xl bg-secondary hover:bg-muted active:scale-95 flex items-center justify-center text-3xl transition-all"
                          aria-label={`Copy ${emoji}`}
                        >
                          {emoji}
                        </motion.button>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div className="p-3 border-t border-border bg-card flex items-center gap-2">
                <Button
                  onClick={() => { setOpenPackId(null); navigate("/feed/new"); }}
                  className="flex-1 bg-ig-gradient text-white font-bold rounded-xl h-10 hover:opacity-90 border-0 gap-2"
                >
                  <Plus className="h-4 w-4" strokeWidth={3} /> Use in a story
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SwipeBackContainer>
  );
}
