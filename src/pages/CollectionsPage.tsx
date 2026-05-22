/**
 * CollectionsPage — Instagram-style "Saved → Collections."
 * Lets users group their saved posts into named, color-tagged collections.
 * Backed by the real `saved_collections` table.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FolderHeart, Plus, Pencil, Trash2, Check, X, Lock, ChevronRight, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Collection {
  id: string;
  name: string;
  color: string | null;
  cover_url: string | null;
  is_private: boolean | null;
  item_count: number | null;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
}

const COLOR_PALETTE = [
  { id: "rose", name: "Rose", from: "from-rose-400", to: "to-fuchsia-500" },
  { id: "amber", name: "Amber", from: "from-amber-400", to: "to-orange-500" },
  { id: "emerald", name: "Emerald", from: "from-emerald-400", to: "to-teal-500" },
  { id: "sky", name: "Sky", from: "from-sky-400", to: "to-indigo-500" },
  { id: "violet", name: "Violet", from: "from-violet-400", to: "to-purple-500" },
  { id: "slate", name: "Slate", from: "from-slate-500", to: "to-slate-700" },
] as const;

function colorClass(id: string | null): string {
  const c = COLOR_PALETTE.find((p) => p.id === id) ?? COLOR_PALETTE[0];
  return `bg-gradient-to-br ${c.from} ${c.to}`;
}

export default function CollectionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(COLOR_PALETTE[0].id);
  const [isPrivate, setIsPrivate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ["saved-collections", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as Collection[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: Collection[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("saved_collections")
        .select("id, name, color, cover_url, is_private, item_count, sort_order, created_at, updated_at")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !name.trim()) throw new Error("missing fields");
      const sb = supabase as unknown as {
        from: (t: string) => {
          insert: (payload: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
        };
      };
      const { error } = await sb.from("saved_collections").insert({
        user_id: user.id,
        name: name.trim().slice(0, 50),
        color,
        is_private: isPrivate,
        sort_order: collections.length,
        item_count: 0,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Collection created");
      qc.invalidateQueries({ queryKey: ["saved-collections", user?.id] });
      setCreating(false);
      setName("");
      setColor(COLOR_PALETTE[0].id);
      setIsPrivate(false);
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
      const { error } = await sb.from("saved_collections").update({ name: newName.slice(0, 50) }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-collections", user?.id] });
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
      const { error } = await sb.from("saved_collections").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Collection removed");
      qc.invalidateQueries({ queryKey: ["saved-collections", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not delete"),
  });

  const totalItems = collections.reduce((sum, c) => sum + (c.item_count ?? 0), 0);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Collections · ZIVO" description="Organize your saved posts into named collections." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <FolderHeart className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Collections</h1>
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
            <FolderHeart className="absolute top-3 right-3 h-5 w-5 text-white/40" />
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Saved</p>
            <p className="text-3xl font-bold mt-1">{collections.length} {collections.length === 1 ? "collection" : "collections"}</p>
            <p className="text-sm text-white/80 mt-1">{totalItems} saved item{totalItems === 1 ? "" : "s"} organized</p>
          </motion.div>
        )}

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
                <p className="text-sm font-bold text-foreground">New collection</p>
                <button
                  type="button"
                  aria-label="Cancel"
                  onClick={() => { setCreating(false); setName(""); }}
                  className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Name (e.g. Tokyo trips, Recipes, Bucket list)"
                maxLength={50}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              />
              <div>
                <p className="text-xs text-muted-foreground mb-2">Color</p>
                <div className="flex gap-2">
                  {COLOR_PALETTE.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      aria-label={`Pick ${p.name}`}
                      onClick={() => setColor(p.id)}
                      className={cn(
                        "h-9 w-9 rounded-full bg-gradient-to-br active:scale-90 transition-transform",
                        p.from, p.to,
                        color === p.id ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "",
                      )}
                    />
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="text-xs text-foreground inline-flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Private (only you can see this)
                </span>
              </label>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!name.trim() || createMutation.isPending}
                className="w-full bg-ig-gradient text-white font-bold rounded-xl h-10 hover:opacity-90 border-0 disabled:opacity-40"
              >
                {createMutation.isPending ? "Saving…" : "Create"}
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

        {!isLoading && collections.length === 0 && !creating && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <FolderHeart className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No collections yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              Organize your saved posts into named, color-tagged folders.
            </p>
            <Button
              onClick={() => setCreating(true)}
              className="bg-ig-gradient text-white font-bold rounded-full h-10 px-5 hover:opacity-90 border-0"
            >
              <Plus className="h-4 w-4 mr-1.5" strokeWidth={3} /> Create your first collection
            </Button>
          </div>
        )}

        {!isLoading && collections.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {collections.map((c, idx) => {
              const isEditing = editingId === c.id;
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="relative rounded-2xl overflow-hidden bg-card border border-border group"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/saved?collection=${c.id}`)}
                    className="w-full aspect-square relative active:opacity-80 transition-opacity"
                    aria-label={`Open collection ${c.name}`}
                  >
                    {c.cover_url ? (
	                      <img src={c.cover_url} alt={c.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <div className={cn("w-full h-full flex items-center justify-center", colorClass(c.color))}>
                        <FolderHeart className="h-10 w-10 text-white/85" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                    {c.is_private && (
                      <span className="absolute top-2 right-2 inline-flex items-center gap-0.5 bg-black/40 backdrop-blur-sm rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white">
                        <Lock className="h-2.5 w-2.5" /> Private
                      </span>
                    )}
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
                            if (e.key === "Enter") renameMutation.mutate({ id: c.id, newName: editName.trim() || c.name });
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="w-full h-7 px-2 rounded-md bg-white/95 text-foreground text-xs font-bold focus:outline-none"
                        />
                      ) : (
                        <>
                          <p className="text-sm font-bold text-white line-clamp-1 drop-shadow-md">{c.name}</p>
                          <p className="text-[10px] text-white/80">{c.item_count ?? 0} item{c.item_count === 1 ? "" : "s"}</p>
                        </>
                      )}
                    </div>
                  </button>
                  {/* Hover/touch actions */}
                  <div className="absolute top-2 left-2 flex gap-1">
                    <button
                      type="button"
                      aria-label={`Rename ${c.name}`}
                      onClick={(e) => { e.stopPropagation(); setEditingId(c.id); setEditName(c.name); }}
                      className="h-7 w-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 active:scale-90 transition-all"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${c.name}`}
                      onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${c.name}"?`)) deleteMutation.mutate(c.id); }}
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

        {!isLoading && collections.length > 0 && (
          <p className="text-[11px] text-muted-foreground text-center pt-2">
            Tap a collection to see its saved posts. Edit with the pencil; delete with the trash icon.
          </p>
        )}
      </div>
    </SwipeBackContainer>
  );
}
