/**
 * HashtagsDirectoryPage — Popular hashtag directory.
 * Backed by the real `hashtags` table (orphan — directory of all known tags).
 * Tap a tag → /tag/:name route (existing HashtagPage).
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Hash, Search, TrendingUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface HashtagRow {
  id: string;
  name: string;
  post_count: number | null;
  created_at: string | null;
}

function formatCount(n: number | null): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export default function HashtagsDirectoryPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ["hashtags-directory"],
    queryFn: async () => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            order: (k: string, opts: { ascending: boolean }) => {
              limit: (n: number) => Promise<{ data: HashtagRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("hashtags")
        .select("id, name, post_count, created_at")
        .order("post_count", { ascending: false })
        .limit(500);
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, "");
    if (!q) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [tags, query]);

  const totalPosts = tags.reduce((s, t) => s + (t.post_count ?? 0), 0);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Hashtags · ZIVO" description="Browse popular hashtags." />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Hash className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Hashtags</h1>
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
          <p className="text-3xl font-bold mt-1">{tags.length.toLocaleString()} hashtags</p>
          <p className="text-sm text-white/80 mt-1">{formatCount(totalPosts)} posts across all tags</p>
        </motion.div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Hash className="absolute left-9 top-1/2 -translate-y-1/2 h-3 w-3 text-ig-gradient pointer-events-none" />
          <input
            type="search"
            placeholder="Search hashtags"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-11 pl-12 pr-3 rounded-xl bg-card border border-border text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/30"
          />
        </div>

        {isLoading && (
          <div className="space-y-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        )}

        {!isLoading && tags.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Hash className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No hashtags yet</p>
            <p className="text-xs text-muted-foreground">Tags will appear here as posts use them.</p>
          </div>
        )}

        {!isLoading && tags.length > 0 && filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No hashtags match your search.</p>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-1.5">
            {filtered.map((t, idx) => (
              <motion.button
                key={t.id}
                type="button"
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx, 12) * 0.015 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => navigate(`/tag/${encodeURIComponent(t.name.replace(/^#/, ""))}`)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left"
              >
                <div className={cn(
                  "shrink-0 h-9 w-9 rounded-lg flex items-center justify-center font-bold",
                  idx < 3 ? "bg-ig-gradient text-white" : "bg-secondary text-foreground",
                )}>
                  {idx < 3 ? `#${idx + 1}` : <Hash className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground line-clamp-1">#{t.name.replace(/^#/, "")}</p>
                  <p className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5">
                    <TrendingUp className="h-2.5 w-2.5" />
                    {formatCount(t.post_count)} post{t.post_count === 1 ? "" : "s"}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
