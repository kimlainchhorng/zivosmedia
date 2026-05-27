/**
 * HighlightsPage — Instagram-style Story Highlights manager.
 * Backed by the real `story_highlights` table. Lets users create named
 * collections of archived stories and pin them as bubble-style highlights.
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Star, Pencil, Trash2, Check, X, Sparkles, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Highlight {
  id: string;
  title: string;
  cover_url: string | null;
  story_ids: string[] | null;
  sort_order: number | null;
  created_at: string;
}

interface ArchivedStoryThumb {
  id: string;
  media_url: string;
  media_type: string;
}

export default function HighlightsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedStories, setSelectedStories] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const { data: highlights = [], isLoading } = useQuery({
    queryKey: ["story-highlights", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as Highlight[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: Highlight[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("story_highlights")
        .select("id, title, cover_url, story_ids, sort_order, created_at")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true });
      return (data ?? []).map((h) => ({
        ...h,
        story_ids: Array.isArray(h.story_ids) ? (h.story_ids as unknown as string[]) : [],
      }));
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // Pull archived stories so user can pick which to bundle into a highlight.
  const { data: archivedStories = [] } = useQuery({
    queryKey: ["highlights-archive-picker", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as ArchivedStoryThumb[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              lt: (k: string, v: string) => {
                order: (k: string, opts: { ascending: boolean }) => {
                  limit: (n: number) => Promise<{ data: ArchivedStoryThumb[] | null }>;
                };
              };
            };
          };
        };
      };
      const { data } = await sb
        .from("stories")
        .select("id, media_url, media_type")
        .eq("user_id", user.id)
        .lt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!user?.id && creating,
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !title.trim() || selectedStories.size === 0) throw new Error("missing fields");
      const storyIds = Array.from(selectedStories);
      const cover = archivedStories.find((s) => s.id === storyIds[0])?.media_url ?? null;
      const sb = supabase as unknown as {
        from: (t: string) => {
          insert: (payload: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
        };
      };
      const { error } = await sb.from("story_highlights").insert({
        user_id: user.id,
        title: title.trim().slice(0, 32),
        cover_url: cover,
        story_ids: storyIds,
        sort_order: highlights.length,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Highlight created");
      qc.invalidateQueries({ queryKey: ["story-highlights", user?.id] });
      setCreating(false);
      setTitle("");
      setSelectedStories(new Set());
    },
    onError: (e: Error) => toast.error(e.message || "Could not save"),
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, newTitle }: { id: string; newTitle: string }) => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          update: (payload: Record<string, unknown>) => {
            eq: (k: string, v: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
      const { error } = await sb.from("story_highlights").update({ title: newTitle.slice(0, 32) }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Renamed");
      qc.invalidateQueries({ queryKey: ["story-highlights", user?.id] });
      setEditingId(null);
    },
    onError: (e: Error) => toast.error(e.message || "Could not rename"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          delete: () => {
            eq: (k: string, v: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
      const { error } = await sb.from("story_highlights").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Highlight removed");
      qc.invalidateQueries({ queryKey: ["story-highlights", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not delete"),
  });

  const toggleStorySelect = (id: string) => {
    setSelectedStories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalStoriesPinned = useMemo(
    () => highlights.reduce((sum, h) => sum + (h.story_ids?.length ?? 0), 0),
    [highlights],
  );

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Highlights · ZIVO" description="Pin your best stories to your profile." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Star className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Highlights</h1>
          </div>
          {!creating && (
            <Button
              size="sm"
              onClick={() => setCreating(true)}
              className="bg-ig-gradient text-white font-bold rounded-full h-9 px-3 hover:opacity-90 border-0"
            >
              <Plus className="h-4 w-4 mr-1" strokeWidth={3} />
              New
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Banner */}
        {!isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
          >
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Pinned</p>
            <p className="text-3xl font-bold mt-1">{highlights.length} {highlights.length === 1 ? "highlight" : "highlights"}</p>
            <p className="text-sm text-white/80 mt-1">{totalStoriesPinned} stor{totalStoriesPinned === 1 ? "y" : "ies"} saved across your highlights</p>
          </motion.div>
        )}

        {/* Create flow */}
        <AnimatePresence>
          {creating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-2xl bg-card border border-border p-4 space-y-3 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">New highlight</p>
                <button
                  type="button"
                  aria-label="Cancel"
                  onClick={() => { setCreating(false); setTitle(""); setSelectedStories(new Set()); }}
                  className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Title (e.g. Tokyo, Recipes, Travel 2026)"
                maxLength={32}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              />
              {archivedStories.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No archived stories to pin yet. Share a story first, then revisit when it expires.
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">Pick stories to include ({selectedStories.size} selected)</p>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-72 overflow-y-auto">
                    {archivedStories.map((s) => {
                      const isVideo = s.media_type?.startsWith("video");
                      const sel = selectedStories.has(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleStorySelect(s.id)}
                          className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted active:opacity-80 transition-opacity"
                          aria-pressed={sel}
                          aria-label={`Toggle story ${s.id}`}
                        >
                          {sel && <div className="absolute inset-0 bg-ig-gradient p-[2px] rounded-lg z-10" aria-hidden />}
                          <div className="absolute inset-[2px] rounded-[6px] overflow-hidden bg-muted">
                            {isVideo ? (
                              <video src={s.media_url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                            ) : (
                              <img src={s.media_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                            )}
                          </div>
                          {sel && (
                            <div className="absolute top-1 left-1 z-20 h-5 w-5 rounded-full bg-white flex items-center justify-center shadow">
                              <Check className="h-3 w-3 text-foreground" strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!title.trim() || selectedStories.size === 0 || createMutation.isPending}
                className="w-full bg-ig-gradient text-white font-bold rounded-xl h-10 hover:opacity-90 border-0 disabled:opacity-40"
              >
                {createMutation.isPending ? "Saving…" : `Pin ${selectedStories.size || ""} stor${selectedStories.size === 1 ? "y" : "ies"}`.trim()}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Highlights bubble row */}
        {isLoading && (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[72px] h-[100px] bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && highlights.length === 0 && !creating && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Star className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No highlights yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              Pin your favorite stories to your profile so people can see them after they expire.
            </p>
            <Button
              onClick={() => setCreating(true)}
              className="bg-ig-gradient text-white font-bold rounded-full h-10 px-5 hover:opacity-90 border-0"
            >
              <Plus className="h-4 w-4 mr-1.5" strokeWidth={3} /> Create your first highlight
            </Button>
          </div>
        )}

        {!isLoading && highlights.length > 0 && (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">As shown on profile</p>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 px-1">
              {highlights.map((h) => (
                <div key={h.id} className="shrink-0 w-[72px] text-center">
                  <button
                    type="button"
                    className="block w-[72px] h-[72px] rounded-full bg-ig-gradient p-[3px] mx-auto active:scale-95 transition-transform"
                    aria-label={`Open highlight ${h.title}`}
                  >
                    <div className="w-full h-full rounded-full overflow-hidden bg-card ring-2 ring-background">
                      {h.cover_url ? (
                        <img src={h.cover_url} alt={h.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-secondary">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </button>
                  <p className="mt-1.5 text-[11px] font-medium text-foreground truncate">{h.title}</p>
                </div>
              ))}
            </div>

            {/* Full list with manage actions */}
            <div className="space-y-2 pt-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Manage</p>
              {highlights.map((h) => (
                <motion.div
                  key={h.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border"
                >
                  <div className="shrink-0 h-12 w-12 rounded-full bg-ig-gradient p-[2px]">
                    <div className="w-full h-full rounded-full overflow-hidden bg-card">
                      {h.cover_url ? (
                        <img src={h.cover_url} alt={h.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-secondary">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingId === h.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editTitle}
                          maxLength={32}
                          autoFocus
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") renameMutation.mutate({ id: h.id, newTitle: editTitle.trim() || h.title });
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="flex-1 h-8 px-2 rounded-md bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                        />
                        <button
                          type="button"
                          aria-label="Save"
                          onClick={() => renameMutation.mutate({ id: h.id, newTitle: editTitle.trim() || h.title })}
                          className="h-8 w-8 rounded-full bg-ig-gradient text-white flex items-center justify-center"
                        >
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-foreground truncate">{h.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {h.story_ids?.length ?? 0} stor{(h.story_ids?.length ?? 0) === 1 ? "y" : "ies"}
                        </p>
                      </>
                    )}
                  </div>
                  {editingId !== h.id && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        aria-label={`Rename ${h.title}`}
                        onClick={() => { setEditingId(h.id); setEditTitle(h.title); }}
                        className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${h.title}`}
                        onClick={() => deleteMutation.mutate(h.id)}
                        className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </SwipeBackContainer>
  );
}
