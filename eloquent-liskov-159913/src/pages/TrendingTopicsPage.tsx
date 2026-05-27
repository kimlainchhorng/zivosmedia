/**
 * TrendingTopicsPage — Twitter/X Trending-style topic discovery.
 * Backed by the real `trending_topics` table.
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, TrendingUp, Hash, Globe, Image as ImageIcon, Film, Sparkles, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface TopicRow {
  id: string;
  topic: string;
  category: string | null;
  region: string | null;
  period: string | null;
  score: number | null;
  post_count: number | null;
  reel_count: number | null;
  started_trending_at: string | null;
  updated_at: string | null;
}

function formatCount(n: number | null): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export default function TrendingTopicsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeRegion, setActiveRegion] = useState<string>("All");
  const [activePeriod, setActivePeriod] = useState<string>("All");

  const { data: topics = [], isLoading } = useQuery({
    queryKey: ["trending-topics"],
    queryFn: async () => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            order: (k: string, opts: { ascending: boolean }) => {
              limit: (n: number) => Promise<{ data: TopicRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("trending_topics")
        .select("id, topic, category, region, period, score, post_count, reel_count, started_trending_at, updated_at")
        .order("score", { ascending: false })
        .limit(100);
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const regions = useMemo(() => {
    const set = new Set<string>(["All"]);
    topics.forEach((t) => { if (t.region) set.add(t.region); });
    return Array.from(set);
  }, [topics]);

  const periods = useMemo(() => {
    const set = new Set<string>(["All"]);
    topics.forEach((t) => { if (t.period) set.add(t.period); });
    return Array.from(set);
  }, [topics]);

  const filtered = useMemo(() => {
    let out = topics;
    if (activeRegion !== "All") out = out.filter((t) => t.region === activeRegion);
    if (activePeriod !== "All") out = out.filter((t) => t.period === activePeriod);
    const q = query.trim().toLowerCase();
    if (q) out = out.filter((t) => t.topic.toLowerCase().includes(q));
    return out;
  }, [topics, query, activeRegion, activePeriod]);

  const handleOpen = (topic: string) => {
    const slug = topic.replace(/^#/, "").toLowerCase();
    navigate(`/tag/${encodeURIComponent(slug)}`);
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Trending · ZIVO" description="What people are talking about right now." />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Trending</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Right now</p>
          <p className="text-3xl font-bold mt-1">{topics.length} topics</p>
          <p className="text-sm text-white/80 mt-1">across {regions.length - 1 || 0} region{regions.length - 1 === 1 ? "" : "s"}</p>
        </motion.div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Search topics"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-11 pl-9 pr-3 rounded-xl bg-card border border-border text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/30"
          />
        </div>

        {regions.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {regions.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setActiveRegion(r)}
                className={cn(
                  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5 capitalize",
                  activeRegion === r ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
                )}
              >
                <Globe className="h-3 w-3" />
                {r}
              </button>
            ))}
          </div>
        )}

        {periods.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {periods.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setActivePeriod(p)}
                className={cn(
                  "shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-all capitalize",
                  activePeriod === p ? "bg-foreground text-background" : "border border-border text-muted-foreground hover:bg-secondary",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="space-y-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        )}

        {!isLoading && topics.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <TrendingUp className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No trends yet</p>
            <p className="text-xs text-muted-foreground">Topics will surface here as activity picks up.</p>
          </div>
        )}

        {!isLoading && topics.length > 0 && filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No topics match your filter.</p>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-1.5">
            {filtered.map((t, idx) => (
              <motion.button
                key={t.id}
                type="button"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx, 12) * 0.02 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => handleOpen(t.topic)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left"
              >
                <div className={cn(
                  "shrink-0 h-9 w-9 rounded-lg flex items-center justify-center text-sm font-extrabold",
                  idx < 3 ? "bg-ig-gradient text-white" : "bg-secondary text-foreground",
                )}>
                  #{idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Hash className="h-3 w-3 text-ig-gradient shrink-0" />
                    <p className="text-sm font-bold text-foreground line-clamp-1">{t.topic.replace(/^#/, "")}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                    {t.category && <span className="capitalize">{t.category}</span>}
                    {t.category && (t.post_count || t.reel_count) ? <span>·</span> : null}
                    {t.post_count ? (
                      <span className="inline-flex items-center gap-0.5">
                        <ImageIcon className="h-2.5 w-2.5" /> {formatCount(t.post_count)}
                      </span>
                    ) : null}
                    {t.reel_count ? (
                      <span className="inline-flex items-center gap-0.5">
                        <Film className="h-2.5 w-2.5" /> {formatCount(t.reel_count)}
                      </span>
                    ) : null}
                    {t.region && <span className="ml-auto inline-flex items-center gap-0.5"><Globe className="h-2.5 w-2.5" /> {t.region}</span>}
                  </div>
                </div>
                {t.score != null && (
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] font-bold text-ig-gradient inline-flex items-center gap-0.5">
                      <TrendingUp className="h-3 w-3" /> {formatCount(t.score)}
                    </p>
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
