/**
 * StoryInsightsPage — Per-story analytics.
 * Joins `stories` (the user's own) with `story_overlay_responses` to show
 * view count + interactive sticker engagement per story.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BarChart2, Eye, Sparkles, MessageSquareText, Film, Type as TypeIcon, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface StoryRow {
  id: string;
  media_url: string;
  media_type: string;
  text_overlay: string | null;
  background_color: string | null;
  view_count: number;
  created_at: string;
  expires_at: string;
}

interface ResponseRow {
  story_id: string;
  response_type: string;
}

export default function StoryInsightsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["story-insights", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as StoryRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: StoryRow[] | null }>;
              };
            };
          };
        };
      };
      const { data } = await sb
        .from("stories")
        .select("id, media_url, media_type, text_overlay, background_color, view_count, created_at, expires_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(40);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const { data: responses = [] } = useQuery({
    queryKey: ["story-overlay-responses", stories.map((s) => s.id).join(",")],
    queryFn: async () => {
      if (stories.length === 0) return [] as ResponseRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            in: (k: string, v: string[]) => Promise<{ data: ResponseRow[] | null }>;
          };
        };
      };
      const { data } = await sb
        .from("story_overlay_responses")
        .select("story_id, response_type")
        .in("story_id", stories.map((s) => s.id));
      return data ?? [];
    },
    enabled: stories.length > 0,
    staleTime: 60_000,
  });

  const responsesByStory = useMemo(() => {
    const map = new Map<string, ResponseRow[]>();
    for (const r of responses) {
      if (!map.has(r.story_id)) map.set(r.story_id, []);
      map.get(r.story_id)!.push(r);
    }
    return map;
  }, [responses]);

  const totals = useMemo(() => {
    const views = stories.reduce((s, x) => s + (x.view_count ?? 0), 0);
    const totalResponses = responses.length;
    const bestStory = stories
      .filter((s) => (s.view_count ?? 0) > 0)
      .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))[0];
    return { views, totalResponses, bestStory };
  }, [stories, responses]);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Story Insights · ZIVO" description="Per-story analytics." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <BarChart2 className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Story Insights</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Last 40 stories</p>
          <p className="text-3xl font-bold mt-1">{totals.views.toLocaleString()} views</p>
          <p className="text-sm text-white/80 mt-1">
            {totals.totalResponses} sticker interactions
            {totals.bestStory && <> · top story: {totals.bestStory.view_count} views</>}
          </p>
        </motion.div>

        {isLoading && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && stories.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <BarChart2 className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No stories to analyze</p>
            <p className="text-xs text-muted-foreground">Post a story; insights show up here once it gets views.</p>
          </div>
        )}

        {!isLoading && stories.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {stories.map((s, idx) => {
              const responsesForStory = responsesByStory.get(s.id) ?? [];
              const isVideo = s.media_type?.startsWith("video");
              const isText = s.media_type === "text" || !s.media_url;
              const responseSummary = new Map<string, number>();
              responsesForStory.forEach((r) => {
                responseSummary.set(r.response_type, (responseSummary.get(r.response_type) ?? 0) + 1);
              });
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="relative rounded-2xl overflow-hidden bg-card border border-border"
                >
                  <div className="relative aspect-[3/4] bg-muted">
                    {isText ? (
                      <div
                        className="w-full h-full flex items-center justify-center p-3"
                        style={{ backgroundColor: s.background_color ?? "hsl(var(--muted))" }}
                      >
                        <p className="text-white text-xs leading-tight font-bold line-clamp-4 text-center drop-shadow-md">
                          {s.text_overlay ?? "Text"}
                        </p>
                      </div>
                    ) : isVideo ? (
                      <video src={s.media_url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                    ) : (
                      <img src={s.media_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    )}
                    {isVideo && <Film className="absolute top-2 right-2 h-4 w-4 text-white drop-shadow-md" />}
                    {isText && <TypeIcon className="absolute top-2 right-2 h-4 w-4 text-white drop-shadow-md" />}
                    {!isVideo && !isText && <ImageIcon className="absolute top-2 right-2 h-4 w-4 text-white/70 drop-shadow-md" />}
                    {/* Views badge */}
                    <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold rounded-full px-2 py-0.5">
                      <Eye className="h-2.5 w-2.5" />
                      {(s.view_count ?? 0).toLocaleString()}
                    </div>
                  </div>
                  {/* Interactions */}
                  <div className="p-2.5">
                    {responsesForStory.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground text-center py-1.5">No sticker responses</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {Array.from(responseSummary.entries()).map(([type, count]) => (
                          <span
                            key={type}
                            className="text-[10px] font-bold inline-flex items-center gap-0.5 bg-ig-gradient/10 text-foreground border border-border rounded-full px-2 py-0.5"
                          >
                            <MessageSquareText className="h-2.5 w-2.5 text-ig-gradient" />
                            {count} {type}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
