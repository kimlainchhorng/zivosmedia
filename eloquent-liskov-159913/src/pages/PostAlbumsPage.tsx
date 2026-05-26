/**
 * PostAlbumsPage — Creator portfolio albums.
 * Lets a user curate posts into named albums (like a photo book of their own
 * content). Backed by `post_albums` + `post_album_items` — schema present,
 * no UI before this.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BookImage, Plus, Pencil, Trash2, X, ImageIcon, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AlbumRow {
  id: string;
  name: string;
  cover_url: string | null;
  created_at: string;
}

interface AlbumItem {
  album_id: string;
  post_id: string;
}

interface UserPostThumb {
  id: string;
  media_url: string | null;
  media_urls: string[] | null;
  media_type: string | null;
}

function firstMediaUrl(p: UserPostThumb): string | null {
  if (p.media_url) return p.media_url;
  if (p.media_urls && p.media_urls.length > 0) return p.media_urls[0];
  return null;
}

export default function PostAlbumsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // 1. Albums for this user.
  const { data: albums = [], isLoading } = useQuery({
    queryKey: ["post-albums", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as AlbumRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: AlbumRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("post_albums")
        .select("id, name, cover_url, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // 2. Counts per album.
  const { data: itemRows = [] } = useQuery({
    queryKey: ["post-album-items", albums.map((a) => a.id).join(",")],
    queryFn: async () => {
      if (albums.length === 0) return [] as AlbumItem[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            in: (k: string, v: string[]) => Promise<{ data: AlbumItem[] | null }>;
          };
        };
      };
      const { data } = await sb
        .from("post_album_items")
        .select("album_id, post_id")
        .in("album_id", albums.map((a) => a.id));
      return data ?? [];
    },
    enabled: albums.length > 0,
    staleTime: 30_000,
  });

  const itemsByAlbum = new Map<string, number>();
  itemRows.forEach((r) => itemsByAlbum.set(r.album_id, (itemsByAlbum.get(r.album_id) ?? 0) + 1));

  // 3. User's posts for the picker (only when creating).
  const { data: posts = [] } = useQuery({
    queryKey: ["album-picker-posts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as UserPostThumb[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: UserPostThumb[] | null }>;
              };
            };
          };
        };
      };
      const { data } = await sb
        .from("user_posts")
        .select("id, media_url, media_urls, media_type")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(60);
      return data ?? [];
    },
    enabled: !!user?.id && creating,
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !name.trim()) throw new Error("Add a name");
      const ids = Array.from(selectedPostIds);
      const cover = posts.find((p) => p.id === ids[0])?.media_url ?? null;
      const sb = supabase as unknown as {
        from: (t: string) => {
          insert: (payload: Record<string, unknown>) => {
            select: (s: string) => {
              single: () => Promise<{ data: AlbumRow | null; error: { message: string } | null }>;
            };
          };
        };
      };
      const { data: newAlbum, error } = await sb
        .from("post_albums")
        .insert({ user_id: user.id, name: name.trim().slice(0, 50), cover_url: cover })
        .select("id, name, cover_url, created_at")
        .single();
      if (error || !newAlbum) throw new Error(error?.message ?? "insert failed");
      if (ids.length > 0) {
        const sbItems = supabase as unknown as {
          from: (t: string) => {
            insert: (rows: Record<string, unknown>[]) => Promise<{ error: { message: string } | null }>;
          };
        };
        const { error: e2 } = await sbItems
          .from("post_album_items")
          .insert(ids.map((post_id) => ({ album_id: newAlbum.id, post_id })));
        if (e2) throw new Error(e2.message);
      }
    },
    onSuccess: () => {
      toast.success("Album created");
      qc.invalidateQueries({ queryKey: ["post-albums", user?.id] });
      qc.invalidateQueries({ queryKey: ["post-album-items"] });
      setCreating(false);
      setName("");
      setSelectedPostIds(new Set());
    },
    onError: (e: Error) => toast.error(e.message || "Could not save"),
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, newName }: { id: string; newName: string }) => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          update: (payload: Record<string, unknown>) => {
            eq: (k: string, v: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
      const { error } = await sb.from("post_albums").update({ name: newName.slice(0, 50) }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["post-albums", user?.id] });
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
      // Items will cascade or remain orphaned depending on FK setup — we'll
      // try to clean items first, ignore failure (table might cascade).
      const itemsClient = supabase as unknown as {
        from: (t: string) => {
          delete: () => {
            eq: (k: string, v: string) => Promise<{ error: unknown }>;
          };
        };
      };
      await itemsClient.from("post_album_items").delete().eq("album_id", id);
      const { error } = await sb.from("post_albums").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Album deleted");
      qc.invalidateQueries({ queryKey: ["post-albums", user?.id] });
      qc.invalidateQueries({ queryKey: ["post-album-items"] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not delete"),
  });

  const togglePostSelect = (id: string) => {
    setSelectedPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalItems = Array.from(itemsByAlbum.values()).reduce((s, n) => s + n, 0);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Albums · ZIVO" description="Curate your posts into named albums." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <BookImage className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Albums</h1>
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
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <BookImage className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Portfolio</p>
          <p className="text-3xl font-bold mt-1">{albums.length} {albums.length === 1 ? "album" : "albums"}</p>
          <p className="text-sm text-white/80 mt-1">{totalItems} post{totalItems === 1 ? "" : "s"} curated across albums</p>
        </motion.div>

        {/* Create */}
        <AnimatePresence>
          {creating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-2xl bg-card border border-border p-4 space-y-3 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">New album</p>
                <button
                  type="button"
                  aria-label="Cancel"
                  onClick={() => { setCreating(false); setName(""); setSelectedPostIds(new Set()); }}
                  className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Album name (e.g. Tokyo 2026, Sunsets, Best of last year)"
                maxLength={50}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              />
              {posts.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Share a post first, then return to curate an album.
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">Pick posts to include ({selectedPostIds.size} selected)</p>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-72 overflow-y-auto">
                    {posts.map((p) => {
                      const url = firstMediaUrl(p);
                      const isVideo = p.media_type?.startsWith("video");
                      const sel = selectedPostIds.has(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => togglePostSelect(p.id)}
                          className="relative aspect-square rounded-lg overflow-hidden bg-muted active:opacity-80 transition-opacity"
                          aria-pressed={sel}
                        >
                          {sel && <div className="absolute inset-0 bg-ig-gradient p-[2px] rounded-lg z-10" aria-hidden />}
                          <div className="absolute inset-[2px] rounded-[6px] overflow-hidden bg-muted">
                            {url ? (
                              isVideo ? (
                                <video src={url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                              ) : (
                                <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                              )
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>
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
                disabled={!name.trim() || createMutation.isPending}
                className="w-full bg-ig-gradient text-white font-bold rounded-xl h-10 hover:opacity-90 border-0 disabled:opacity-40"
              >
                {createMutation.isPending ? "Saving…" : `Create album${selectedPostIds.size > 0 ? ` with ${selectedPostIds.size} post${selectedPostIds.size === 1 ? "" : "s"}` : ""}`}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-square bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && albums.length === 0 && !creating && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <BookImage className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No albums yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              Group your posts into named albums to showcase the best of your content.
            </p>
            <Button
              onClick={() => setCreating(true)}
              className="bg-ig-gradient text-white font-bold rounded-full h-10 px-5 hover:opacity-90 border-0"
            >
              <Plus className="h-4 w-4 mr-1.5" strokeWidth={3} /> Create your first album
            </Button>
          </div>
        )}

        {!isLoading && albums.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {albums.map((a, idx) => {
              const count = itemsByAlbum.get(a.id) ?? 0;
              const isEditing = editingId === a.id;
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="relative rounded-2xl overflow-hidden bg-card border border-border"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/feed?album=${a.id}`)}
                    className="w-full aspect-square relative active:opacity-80 transition-opacity"
                    aria-label={`Open album ${a.name}`}
                  >
                    {a.cover_url ? (
                      <img src={a.cover_url} alt={a.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className={cn("w-full h-full flex items-center justify-center bg-ig-gradient")}>
                        <BookImage className="h-10 w-10 text-white/85" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2 text-left">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          autoFocus
                          maxLength={50}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter") renameMutation.mutate({ id: a.id, newName: editName.trim() || a.name });
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="w-full h-7 px-2 rounded-md bg-white/95 text-foreground text-xs font-bold focus:outline-none"
                        />
                      ) : (
                        <>
                          <p className="text-sm font-bold text-white line-clamp-1 drop-shadow-md">{a.name}</p>
                          <p className="text-[10px] text-white/80">{count} post{count === 1 ? "" : "s"}</p>
                        </>
                      )}
                    </div>
                  </button>
                  <div className="absolute top-2 left-2 flex gap-1">
                    <button
                      type="button"
                      aria-label={`Rename ${a.name}`}
                      onClick={(e) => { e.stopPropagation(); setEditingId(a.id); setEditName(a.name); }}
                      className="h-7 w-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 active:scale-90 transition-all"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${a.name}`}
                      onClick={(e) => { e.stopPropagation(); if (confirm(`Delete album "${a.name}"?`)) deleteMutation.mutate(a.id); }}
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

        {!isLoading && albums.length > 0 && (
          <p className="text-[11px] text-muted-foreground text-center pt-2 flex items-center justify-center gap-1.5">
            <Lock className="h-3 w-3" />
            Only you see edit controls. Albums you share appear on your profile.
          </p>
        )}
      </div>
    </SwipeBackContainer>
  );
}
