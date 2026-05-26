/**
 * GifLibraryPage — Trending GIFs catalog + your saved favorites.
 * Backed by `gif_trending` (orphan catalog) + `gif_favorites` (orphan per-user).
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Image as ImageIcon, Heart, Sparkles, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TrendingGifRow {
  id: string;
  gif_url: string;
  label: string | null;
  category: string;
  source: string | null;
  is_active: boolean | null;
  sort_order: number | null;
}

interface FavoriteGifRow {
  id: string;
  gif_url: string;
  gif_id: string | null;
  source: string | null;
  created_at: string | null;
}

type Tab = "trending" | "favorites";

export default function GifLibraryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("trending");
  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: trending = [], isLoading: trendingLoading } = useQuery({
    queryKey: ["gif-trending"],
    queryFn: async () => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: boolean) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: TrendingGifRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("gif_trending")
        .select("id, gif_url, label, category, source, is_active, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ["gif-favorites", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as FavoriteGifRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: FavoriteGifRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("gif_favorites")
        .select("id, gif_url, gif_id, source, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const favoriteUrls = useMemo(() => new Set(favorites.map((f) => f.gif_url)), [favorites]);

  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    trending.forEach((t) => { if (t.category) set.add(t.category); });
    return Array.from(set);
  }, [trending]);

  const filteredTrending = useMemo(() => {
    let out = trending;
    if (activeCategory !== "All") out = out.filter((t) => t.category === activeCategory);
    const q = query.trim().toLowerCase();
    if (q) out = out.filter((t) => t.label?.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
    return out;
  }, [trending, query, activeCategory]);

  const filteredFavs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return favorites;
    return favorites.filter((f) => f.source?.toLowerCase().includes(q));
  }, [favorites, query]);

  const saveMutation = useMutation({
    mutationFn: async (g: TrendingGifRow) => {
      if (!user?.id) throw new Error("Sign in first");
      const sb = supabase as unknown as {
        from: (t: string) => {
          insert: (payload: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
        };
      };
      const { error } = await sb.from("gif_favorites").insert({
        user_id: user.id,
        gif_url: g.gif_url,
        gif_id: g.id,
        source: g.source ?? "internal",
      });
      if (error) throw new Error(error.message);
    },
    onMutate: (g) => setBusyId(g.id),
    onSettled: () => {
      setBusyId(null);
      qc.invalidateQueries({ queryKey: ["gif-favorites", user?.id] });
    },
    onSuccess: () => toast.success("Saved to favorites"),
    onError: (e: Error) => toast.error(e.message || "Could not save"),
  });

  const unsaveMutation = useMutation({
    mutationFn: async (favoriteId: string) => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          delete: () => {
            eq: (k: string, v: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
      const { error } = await sb.from("gif_favorites").delete().eq("id", favoriteId);
      if (error) throw new Error(error.message);
    },
    onMutate: (id) => setBusyId(id),
    onSettled: () => {
      setBusyId(null);
      qc.invalidateQueries({ queryKey: ["gif-favorites", user?.id] });
    },
    onSuccess: () => toast.success("Removed"),
    onError: (e: Error) => toast.error(e.message || "Could not remove"),
  });

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="GIFs · ZIVO" description="Trending GIFs and your saved favorites." />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <ImageIcon className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">GIFs</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Library</p>
          <p className="text-3xl font-bold mt-1">{trending.length} trending</p>
          <p className="text-sm text-white/80 mt-1">{favorites.length} saved by you</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2">
          {(["trending", "favorites"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize",
                tab === t ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
              )}
            >
              {t} {t === "favorites" && favorites.length > 0 ? `(${favorites.length})` : ""}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder={tab === "trending" ? "Search by label or category" : "Search saved GIFs"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-11 pl-9 pr-3 rounded-xl bg-card border border-border text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/30"
          />
        </div>

        {tab === "trending" && categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setActiveCategory(c)}
                className={cn(
                  "shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-all capitalize",
                  activeCategory === c ? "bg-foreground text-background" : "border border-border text-muted-foreground hover:bg-secondary",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Trending grid */}
        {tab === "trending" && (
          <>
            {trendingLoading && (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            )}
            {!trendingLoading && filteredTrending.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-10">
                {trending.length === 0 ? "No trending GIFs published yet." : "No GIFs match your filter."}
              </p>
            )}
            {!trendingLoading && filteredTrending.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {filteredTrending.map((g, idx) => {
                  const saved = favoriteUrls.has(g.gif_url);
                  const busy = busyId === g.id;
                  return (
                    <motion.div
                      key={g.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx, 12) * 0.02 }}
                      className="relative aspect-square rounded-xl overflow-hidden bg-muted"
                    >
                      <img src={g.gif_url} alt={g.label ?? "GIF"} className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent pointer-events-none" />
                      {g.label && (
                        <p className="absolute bottom-1.5 left-1.5 right-1.5 text-[10px] font-bold text-white drop-shadow-md line-clamp-1">
                          {g.label}
                        </p>
                      )}
                      <button
                        type="button"
                        aria-label={saved ? "Already saved" : "Save GIF"}
                        disabled={saved || busy}
                        onClick={() => saveMutation.mutate(g)}
                        className={cn(
                          "absolute top-1.5 right-1.5 h-7 w-7 rounded-full flex items-center justify-center transition-all active:scale-90",
                          saved ? "bg-ig-gradient text-white" : "bg-black/55 backdrop-blur-sm text-white hover:bg-black/70",
                        )}
                      >
                        <Heart className={cn("h-3.5 w-3.5", saved && "fill-white")} />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Favorites grid */}
        {tab === "favorites" && (
          <>
            {filteredFavs.length === 0 && (
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
                  <Heart className="h-7 w-7 text-white" />
                </div>
                <p className="text-base font-bold text-foreground mb-1">No saved GIFs</p>
                <p className="text-xs text-muted-foreground">Tap the heart on any trending GIF to save it here.</p>
              </div>
            )}
            {filteredFavs.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {filteredFavs.map((g, idx) => {
                  const busy = busyId === g.id;
                  return (
                    <motion.div
                      key={g.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx, 12) * 0.02 }}
                      className="relative aspect-square rounded-xl overflow-hidden bg-muted"
                    >
                      <img src={g.gif_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      <button
                        type="button"
                        aria-label="Remove from favorites"
                        disabled={busy}
                        onClick={() => unsaveMutation.mutate(g.id)}
                        className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/55 backdrop-blur-sm text-white flex items-center justify-center hover:bg-destructive/80 active:scale-90 transition-all"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </SwipeBackContainer>
  );
}
