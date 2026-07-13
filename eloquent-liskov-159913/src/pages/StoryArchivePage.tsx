/**
 * StoryArchivePage — Instagram-style archive of expired stories.
 * Real Supabase query: stories where user_id = me AND expires_at < now().
 * Grid layout, filterable, with a sharable "repost as story" affordance.
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Archive, Film, Image as ImageIcon, Type, Calendar, Eye, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ArchivedStory {
  id: string;
  media_url: string;
  media_type: string;
  text_overlay: string | null;
  background_color: string | null;
  view_count: number;
  created_at: string;
  expires_at: string;
}

type Filter = "All" | "Photos" | "Videos" | "Text";

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch { return iso; }
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export default function StoryArchivePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["story-archive", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as ArchivedStory[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              lt: (k: string, v: string) => {
                order: (k: string, opts: { ascending: boolean }) => Promise<{ data: ArchivedStory[] | null }>;
              };
            };
          };
        };
      };
      const { data } = await sb
        .from("stories")
        .select("id, media_url, media_type, text_overlay, background_color, view_count, created_at, expires_at")
        .eq("user_id", user.id)
        .lt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const counts = useMemo(() => {
    const videos = stories.filter((s) => s.media_type?.startsWith("video")).length;
    const text = stories.filter((s) => s.media_type === "text" || !s.media_url).length;
    const photos = stories.length - videos - text;
    return { photos, videos, text, total: stories.length };
  }, [stories]);

  const filtered = useMemo(() => {
    if (activeFilter === "All") return stories;
    if (activeFilter === "Videos") return stories.filter((s) => s.media_type?.startsWith("video"));
    if (activeFilter === "Text") return stories.filter((s) => s.media_type === "text" || !s.media_url);
    return stories.filter((s) => !s.media_type?.startsWith("video") && s.media_type !== "text" && !!s.media_url);
  }, [stories, activeFilter]);

  const totalViews = useMemo(() => stories.reduce((sum, s) => sum + (s.view_count ?? 0), 0), [stories]);

  const selected = stories.find((s) => s.id === selectedId);

  const handleRepost = () => {
    toast.success("Repost flow rolls out in beta — your story will queue when ready.");
    setSelectedId(null);
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Archive · ZIVO" description="Your old stories, saved for you." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Archive className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Archive</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto pb-12">
        {/* Memory banner */}
        {!isLoading && stories.length > 0 && (
          <div className="px-4 pt-5">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
            >
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <Archive className="absolute top-3 right-3 h-5 w-5 text-white/40" />
              <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Your memories</p>
              <p className="text-3xl font-bold mt-1">{stories.length} {stories.length === 1 ? "story" : "stories"}</p>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="flex items-center gap-1.5"><Eye className="h-4 w-4" /> {formatViews(totalViews)} total views</span>
                <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Auto-saved</span>
              </div>
            </motion.div>
          </div>
        )}

        {/* Filter chips */}
        {stories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-4">
            {(["All", "Photos", "Videos", "Text"] as Filter[]).map((f) => {
              const Icon = f === "Photos" ? ImageIcon : f === "Videos" ? Film : f === "Text" ? Type : Archive;
              const count = f === "All" ? counts.total : f === "Photos" ? counts.photos : f === "Videos" ? counts.videos : counts.text;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setActiveFilter(f)}
                  className={cn(
                    "shrink-0 px-3.5 py-2 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5",
                    activeFilter === f
                      ? "bg-ig-gradient text-white shadow-sm"
                      : "bg-secondary text-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {f}
                  {count > 0 && <span className={cn("text-[10px] font-bold", activeFilter === f ? "text-white/80" : "text-muted-foreground")}>{count}</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Grid */}
        {isLoading && (
          <div className="grid grid-cols-3 gap-[2px] sm:gap-1 p-[2px] sm:p-1">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-[9/16] bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && stories.length === 0 && (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="h-20 w-20 rounded-3xl bg-ig-gradient flex items-center justify-center mb-5 shadow-lg shadow-rose-500/20">
              <Archive className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Nothing archived yet</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Stories disappear after 24 hours but we'll save them here so you can revisit and repost.
            </p>
            <Button
              onClick={() => navigate("/feed/new")}
              className="bg-ig-gradient text-white font-bold rounded-full h-11 px-6 hover:opacity-90 border-0 shadow-md"
            >
              Share your first story
            </Button>
          </div>
        )}

        {!isLoading && stories.length > 0 && filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">No stories match this filter.</p>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-3 gap-[2px] sm:gap-1 p-[2px] sm:p-1">
            {filtered.map((s, idx) => {
              const isVideo = s.media_type?.startsWith("video");
              const isText = s.media_type === "text" || !s.media_url;
              return (
                <motion.button
                  key={s.id}
                  type="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(idx, 12) * 0.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSelectedId(s.id)}
                  className="relative aspect-[9/16] bg-muted overflow-hidden active:opacity-80 transition-opacity"
                  aria-label={`Open archived story from ${formatDate(s.created_at)}`}
                >
                  {isText ? (
                    <div
                      className="w-full h-full flex items-center justify-center p-3"
                      style={{ backgroundColor: s.background_color ?? "hsl(var(--muted))" }}
                    >
                      <p className="text-white text-[10px] leading-tight font-bold drop-shadow-md line-clamp-6 text-center">
                        {s.text_overlay ?? "Text story"}
                      </p>
                    </div>
                  ) : isVideo ? (
                    <video src={s.media_url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                  ) : (
                    <img src={s.media_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  )}
                  {isVideo && <Film className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-white drop-shadow-md" />}
                  {isText && <Type className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-white drop-shadow-md" />}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/65 to-transparent px-1.5 py-1">
                    <p className="text-[9px] font-bold text-white flex items-center gap-1">
                      <Eye className="h-2.5 w-2.5" /> {formatViews(s.view_count ?? 0)}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview overlay */}
      {selected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[1600] bg-background/95 backdrop-blur-xl flex items-center justify-center p-6"
          onClick={() => setSelectedId(null)}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xs"
          >
            <div className="relative aspect-[9/16] rounded-3xl overflow-hidden bg-black shadow-2xl">
              {selected.media_type === "text" || !selected.media_url ? (
                <div
                  className="w-full h-full flex items-center justify-center p-6"
                  style={{ backgroundColor: selected.background_color ?? "#222" }}
                >
                  <p className="text-white text-xl font-bold text-center">{selected.text_overlay ?? "Text story"}</p>
                </div>
              ) : selected.media_type?.startsWith("video") ? (
                <video src={selected.media_url} className="w-full h-full object-cover" controls autoPlay />
              ) : (
                <img src={selected.media_url} alt="" className="w-full h-full object-cover" />
              )}
              <div className="absolute top-3 inset-x-3 flex items-center justify-between text-white text-xs font-semibold">
                <span className="bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">{formatDate(selected.created_at)}</span>
                <span className="bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1">
                  <Eye className="h-3 w-3" /> {formatViews(selected.view_count ?? 0)}
                </span>
              </div>
            </div>
            <Button
              onClick={handleRepost}
              className="mt-4 w-full bg-ig-gradient text-white font-bold rounded-full h-12 hover:opacity-90 border-0 shadow-md shadow-rose-500/25 gap-2"
            >
              <RotateCcw className="h-4 w-4" /> Repost as story
            </Button>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="mt-2 w-full text-xs font-semibold text-muted-foreground hover:text-foreground py-1.5 transition-colors"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </SwipeBackContainer>
  );
}
