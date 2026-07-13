/**
 * StoryHighlights — Pinned story highlight circles on profile
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BookmarkPlus, Check, ImagePlus, Layers3, Plus, Sparkles, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useHaptic } from "@/hooks/useHaptic";

interface StoryHighlightsProps {
  userId: string;
  isOwnProfile?: boolean;
}

export default function StoryHighlights({ userId, isOwnProfile }: StoryHighlightsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const haptic = useHaptic();

  const { data: highlights = [] } = useQuery({
    queryKey: ["story-highlights", userId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("story_highlights")
        .select("id, title, cover_url, sort_order")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true });
      return data || [];
    },
  });

  const createHighlight = async () => {
    if (!user || !newTitle.trim()) return;
    haptic("medium");
    await (supabase as any).from("story_highlights").insert({
      user_id: user.id,
      title: newTitle.trim(),
    });
    queryClient.invalidateQueries({ queryKey: ["story-highlights"] });
    setNewTitle("");
    setShowCreate(false);
    toast.success("Highlight created");
  };

  if (highlights.length === 0 && !isOwnProfile) return null;
  const coveredCount = highlights.filter((highlight: any) => Boolean(highlight.cover_url)).length;
  const titleReady = newTitle.trim().length > 0;
  const featuredHighlight = highlights[0] ?? null;
  const coverShare = highlights.length > 0 ? Math.round((coveredCount / highlights.length) * 100) : 0;
  const highlightSignal =
    highlights.length === 0
      ? { label: "Start a set", detail: "Create your first highlight", width: "18%" }
      : coverShare >= 70
        ? { label: "Profile shelf", detail: `${coverShare}% with covers`, width: `${coverShare}%` }
        : { label: "Needs covers", detail: `${coveredCount}/${highlights.length} highlights covered`, width: `${Math.max(28, coverShare)}%` };

  return (
    <div className="py-3">
      <div className="zivo-social-highlight-rail mx-2 overflow-hidden rounded-[1.25rem] px-3 py-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="zivo-social-share-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-primary">
              <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-[13px] font-extrabold text-foreground">Story highlights</h3>
              <p className="truncate text-[11px] font-medium text-muted-foreground">Pinned moments worth revisiting</p>
            </div>
          </div>
          <span className="zivo-social-chip shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold text-primary">
            {highlights.length}
          </span>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-2">
          <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-black tabular-nums text-foreground">{highlights.length}</span>
              <span className="block truncate text-[10px] font-semibold text-muted-foreground">Collections</span>
            </span>
          </div>
          <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-black tabular-nums text-foreground">{coveredCount}</span>
              <span className="block truncate text-[10px] font-semibold text-muted-foreground">Covers</span>
            </span>
          </div>
          <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-500">
              <Layers3 className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-black text-foreground">{isOwnProfile ? "Edit" : "View"}</span>
              <span className="block truncate text-[10px] font-semibold text-muted-foreground">Mode</span>
            </span>
          </div>
        </div>
        {featuredHighlight && (
          <button
            type="button"
            className="zivo-social-share-preview mb-3 flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left transition-transform active:scale-[0.99]"
            aria-label={`Open featured story highlight ${featuredHighlight.title || "highlight"}`}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-primary">
                {featuredHighlight.cover_url ? (
                  <img src={featuredHighlight.cover_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground">
                  Featured highlight
                </span>
                <span className="block truncate text-sm font-bold text-foreground">
                  {featuredHighlight.title || "Saved moment"}
                </span>
              </span>
            </span>
            <span className="zivo-social-chip-active shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black">
              View
            </span>
          </button>
        )}

        <div className="zivo-social-module-tile mb-3 rounded-2xl px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="zivo-social-share-orb flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl text-primary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-foreground">{highlightSignal.label}</span>
                <span className="block truncate text-[11px] font-semibold text-muted-foreground">{highlightSignal.detail}</span>
              </span>
            </span>
            <span className="rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase text-primary">
              Shelf
            </span>
          </div>
          <div className="zivo-social-chip mt-2 h-1.5 overflow-hidden rounded-full p-0">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary via-fuchsia-500 to-emerald-400 transition-[width] duration-300"
              style={{ width: highlightSignal.width }}
            />
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
        {/* Add new */}
        {isOwnProfile && (
          <button type="button"
            onClick={() => {
              haptic("light");
              setShowCreate(true);
            }}
            className="group flex shrink-0 flex-col items-center gap-1 rounded-2xl px-1 py-1 transition-transform active:scale-95"
            aria-label="Create a new story highlight"
          >
            <div className="zivo-social-highlight-add relative flex h-16 w-16 items-center justify-center rounded-full transition-transform group-hover:-translate-y-0.5">
              <Plus className="h-5 w-5 text-primary" aria-hidden="true" />
              <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-primary-foreground shadow-lg">
                New
              </span>
            </div>
            <span className="text-[10px] font-bold text-primary">New</span>
          </button>
        )}

        {highlights.map((h: any) => (
          <button type="button"
            key={h.id}
            className="group flex shrink-0 flex-col items-center gap-1 rounded-2xl px-1 py-1 transition-transform active:scale-95"
            aria-label={`Open ${h.title || "story highlight"} highlight`}
          >
            <div className="zivo-social-highlight-ring relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full transition-transform group-hover:-translate-y-0.5">
              {h.cover_url ? (
                <img src={h.cover_url} alt={h.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
              ) : (
                <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
              )}
              <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]" aria-hidden="true" />
            </div>
            <span className="max-w-[64px] truncate text-[10px] font-bold text-foreground">{h.title}</span>
          </button>
        ))}
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="zivo-social-sheet-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCreate(false)}
        >
          <div className="zivo-social-composer-panel w-full max-w-sm rounded-[1.5rem] p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="zivo-social-share-orb flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-primary">
                  <ImagePlus className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-extrabold text-foreground">New highlight</h3>
                  <p className="truncate text-xs font-medium text-muted-foreground">Save stories into a profile collection</p>
                </div>
              </div>
              <button type="button" aria-label="Close highlight creator" className="zivo-social-icon-button flex h-8 w-8 shrink-0 items-center justify-center rounded-full" onClick={() => setShowCreate(false)}><X className="h-4 w-4" aria-hidden="true" /></button>
            </div>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Highlight name..."
              className="zivo-social-sheet-input mb-3 w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />
            <div className="mb-3 grid grid-cols-2 gap-2">
              <span className={`zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2 text-[11px] font-bold ${titleReady ? "text-emerald-600" : "text-muted-foreground"}`}>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${titleReady ? "bg-emerald-500 text-white" : "zivo-social-chip text-primary"}`}>
                  {titleReady ? <Check className="h-3 w-3" aria-hidden="true" /> : <Sparkles className="h-3 w-3" aria-hidden="true" />}
                </span>
                <span className="truncate">{titleReady ? "Name ready" : "Add name"}</span>
              </span>
              <span className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2 text-[11px] font-bold text-muted-foreground">
                <span className="zivo-social-chip flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-primary">
                  <Layers3 className="h-3 w-3" aria-hidden="true" />
                </span>
                <span className="truncate">{highlights.length + 1} total</span>
              </span>
            </div>
            <button type="button"
              onClick={createHighlight}
              disabled={!titleReady}
              className="zivo-social-chip-active flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-55"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
