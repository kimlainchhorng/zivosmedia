/**
 * PlaylistsPage — Music/video playlist manager.
 * Backed by `playlists` + `playlist_items` (both orphan).
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Music, Plus, Pencil, Trash2, X, Lock, Globe, Sparkles, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PlaylistRow {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  is_public: boolean | null;
  track_count: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export default function PlaylistsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const { data: playlists = [], isLoading } = useQuery({
    queryKey: ["playlists", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as PlaylistRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: PlaylistRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("playlists")
        .select("id, title, description, cover_url, is_public, track_count, created_at, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Sign in first");
      if (!title.trim()) throw new Error("Add a title");
      const sb = supabase as unknown as {
        from: (t: string) => {
          insert: (payload: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
        };
      };
      const { error } = await sb.from("playlists").insert({
        user_id: user.id,
        title: title.trim().slice(0, 100),
        description: description.trim().slice(0, 280) || null,
        is_public: isPublic,
        track_count: 0,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Playlist created");
      qc.invalidateQueries({ queryKey: ["playlists", user?.id] });
      setCreating(false);
      setTitle("");
      setDescription("");
      setIsPublic(true);
    },
    onError: (e: Error) => toast.error(e.message || "Could not create"),
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
      const { error } = await sb.from("playlists").update({ title: newTitle.slice(0, 100), updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["playlists", user?.id] });
      setEditingId(null);
    },
    onError: (e: Error) => toast.error(e.message || "Could not rename"),
  });

  const togglePublicMutation = useMutation({
    mutationFn: async ({ id, makePublic }: { id: string; makePublic: boolean }) => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          update: (payload: Record<string, unknown>) => {
            eq: (k: string, v: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
      const { error } = await sb.from("playlists").update({ is_public: makePublic, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.makePublic ? "Now public" : "Now private");
      qc.invalidateQueries({ queryKey: ["playlists", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not update"),
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
      const itemsClient = supabase as unknown as {
        from: (t: string) => {
          delete: () => {
            eq: (k: string, v: string) => Promise<{ error: unknown }>;
          };
        };
      };
      await itemsClient.from("playlist_items").delete().eq("playlist_id", id);
      const { error } = await sb.from("playlists").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Playlist deleted");
      qc.invalidateQueries({ queryKey: ["playlists", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not delete"),
  });

  const totalTracks = useMemo(() => playlists.reduce((s, p) => s + (p.track_count ?? 0), 0), [playlists]);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Playlists · ZIVO" description="Your music and reel playlists." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Music className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Playlists</h1>
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
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Your library</p>
          <p className="text-3xl font-bold mt-1">{playlists.length} {playlists.length === 1 ? "playlist" : "playlists"}</p>
          <p className="text-sm text-white/80 mt-1">{totalTracks} track{totalTracks === 1 ? "" : "s"} across all playlists</p>
        </motion.div>

        {/* Create form */}
        <AnimatePresence>
          {creating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-2xl bg-card border border-border p-4 space-y-3 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">New playlist</p>
                <button
                  type="button"
                  aria-label="Cancel"
                  onClick={() => setCreating(false)}
                  className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Title"
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              />
              <textarea
                placeholder="Description (optional)"
                maxLength={280}
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 resize-none"
              />
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="text-xs text-foreground inline-flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Public — anyone can find it
                </span>
              </label>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!title.trim() || createMutation.isPending}
                className="w-full bg-ig-gradient text-white font-bold rounded-xl h-10 hover:opacity-90 border-0 disabled:opacity-40"
              >
                {createMutation.isPending ? "Saving…" : "Create"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-square bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && playlists.length === 0 && !creating && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Music className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No playlists yet</p>
            <p className="text-xs text-muted-foreground mb-4">Start a playlist of your favorite sounds, reels, or songs.</p>
            <Button
              onClick={() => setCreating(true)}
              className="bg-ig-gradient text-white font-bold rounded-full h-10 px-5 hover:opacity-90 border-0"
            >
              <Plus className="h-4 w-4 mr-1.5" strokeWidth={3} /> Create your first playlist
            </Button>
          </div>
        )}

        {!isLoading && playlists.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {playlists.map((p, idx) => {
              const isEditing = editingId === p.id;
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="relative rounded-2xl overflow-hidden bg-card border border-border"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/sounds?playlist=${p.id}`)}
                    className="w-full aspect-square relative active:opacity-80 transition-opacity"
                    aria-label={`Open playlist ${p.title}`}
                  >
                    {p.cover_url ? (
                      <img src={p.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-ig-gradient flex items-center justify-center">
                        <Music className="h-10 w-10 text-white/85" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 text-left">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editTitle}
                          autoFocus
                          maxLength={100}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter") renameMutation.mutate({ id: p.id, newTitle: editTitle.trim() || p.title });
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="w-full h-7 px-2 rounded-md bg-white/95 text-foreground text-xs font-bold focus:outline-none"
                        />
                      ) : (
                        <>
                          <p className="text-sm font-bold text-white line-clamp-1 drop-shadow-md">{p.title}</p>
                          <p className="text-[10px] text-white/80">{p.track_count ?? 0} track{p.track_count === 1 ? "" : "s"}</p>
                        </>
                      )}
                    </div>
                    {/* Play overlay */}
                    <div className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-white/95 flex items-center justify-center shadow-md">
                      <Play className="h-4 w-4 text-foreground ml-0.5" fill="currentColor" />
                    </div>
                    <span className={cn(
                      "absolute top-2 left-2 inline-flex items-center gap-0.5 backdrop-blur-sm text-[10px] font-bold rounded-full px-1.5 py-0.5",
                      p.is_public ? "bg-black/40 text-white" : "bg-black/55 text-white",
                    )}>
                      {p.is_public ? <><Globe className="h-2.5 w-2.5" /> Public</> : <><Lock className="h-2.5 w-2.5" /> Private</>}
                    </span>
                  </button>
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      type="button"
                      aria-label={`Rename ${p.title}`}
                      onClick={(e) => { e.stopPropagation(); setEditingId(p.id); setEditTitle(p.title); }}
                      className="h-7 w-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 active:scale-90 transition-all"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      aria-label={p.is_public ? "Make private" : "Make public"}
                      onClick={(e) => { e.stopPropagation(); togglePublicMutation.mutate({ id: p.id, makePublic: !p.is_public }); }}
                      className="h-7 w-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 active:scale-90 transition-all"
                    >
                      {p.is_public ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${p.title}`}
                      onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${p.title}"?`)) deleteMutation.mutate(p.id); }}
                      className="h-7 w-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-destructive/80 active:scale-90 transition-all"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
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
