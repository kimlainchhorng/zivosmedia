/**
 * CommentHeartButton — single-tap heart on an individual comment.
 *
 * Optimistic state. Calls `toggle_comment_like` RPC. Hides the count when 0.
 * Theme-aware so it works on dark and light comment surfaces.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Heart from "lucide-react/dist/esm/icons/heart";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import { cn } from "@/lib/utils";
import { useHaptic } from "@/hooks/useHaptic";

interface Props {
  commentId: string;
  targetTable: "store_post_comments" | "user_post_comments";
  userId: string | null;
  /** Initial like count from the API; component re-syncs on mount */
  initialCount?: number;
  /** Pre-fetched liked state from parent batch query — skips per-comment DB calls. */
  initialLiked?: boolean;
  /** Light variant for use on light backgrounds; default = dark */
  variant?: "light" | "dark";
}

export default function CommentHeartButton({
  commentId, targetTable, userId, initialCount = 0, initialLiked, variant = "dark",
}: Props) {
  const [liked, setLiked] = useState(initialLiked ?? false);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const haptic = useHaptic();

  // Skip per-comment DB calls when the parent has already batch-fetched state.
  useEffect(() => {
    if (initialLiked !== undefined) return;
    let cancelled = false;
    (async () => {
      const [{ count: total }, { data: own }] = await Promise.all([
        (supabase as any)
          .from("comment_likes")
          .select("id", { count: "exact", head: true })
          .eq("comment_id", commentId)
          .eq("target_table", targetTable),
        userId
          ? (supabase as any)
              .from("comment_likes")
              .select("id")
              .eq("comment_id", commentId)
              .eq("target_table", targetTable)
              .eq("user_id", userId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (cancelled) return;
      if (typeof total === "number") setCount(total);
      setLiked(!!own?.id);
    })();
    return () => { cancelled = true; };
  }, [commentId, targetTable, userId, initialLiked]);

  async function handleToggle() {
    if (!userId || loading) return;
    setLoading(true);
    // Tactile feedback the moment the user taps; never wait on the network.
    haptic(liked ? "light" : "medium");
    // Optimistic
    const wasLiked = liked;
    setLiked(!wasLiked);
    setCount((c) => Math.max(c + (wasLiked ? -1 : 1), 0));
    try {
      const { data, error } = await (supabase as any).rpc("toggle_comment_like", {
        _comment_id: commentId,
        _target_table: targetTable,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        setLiked(!!row.liked);
        if (typeof row.total === "number") setCount(row.total);
      }
    } catch {
      // Roll back
      setLiked(wasLiked);
      setCount((c) => Math.max(c + (wasLiked ? 1 : -1), 0));
    } finally {
      setLoading(false);
    }
  }

  const isDark = variant === "dark";
  const countLabel = count === 1 ? "1 like" : `${count} likes`;
  const displayCount = count > 999 ? `${(count / 1000).toFixed(1)}k` : count;
  const isHotComment = count >= 10;

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading || !userId}
      className={cn(
        "group relative flex min-h-[38px] min-w-[38px] flex-col items-center justify-center gap-0.5 rounded-full border px-1.5 py-1 transition-all active:scale-90",
        isDark
          ? "border-white/10 bg-white/8 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md hover:bg-white/14"
          : "border-border/50 bg-white/60 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.74),0_8px_18px_rgba(15,23,42,0.06)] backdrop-blur-md hover:bg-white/80",
        liked && (isDark ? "border-rose-300/30 bg-rose-500/14" : "border-rose-200 bg-rose-50/80"),
        (loading || !userId) && "cursor-not-allowed opacity-60",
      )}
      aria-label={
        !userId
          ? "Sign in to like this comment"
          : liked
            ? `Unlike comment, ${countLabel}`
            : `Like comment, ${countLabel}`
      }
      aria-pressed={liked}
      title={!userId ? "Sign in to like" : liked ? "Unlike comment" : "Like comment"}
    >
      <span className="relative flex h-5 w-5 items-center justify-center">
        <Heart
          className={cn(
            "h-4 w-4 transition-all group-hover:scale-110",
            liked ? "fill-rose-500 text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.42)]" : isDark ? "text-white/72" : "text-muted-foreground",
            loading && "scale-90 opacity-30",
          )}
        />
        {loading && (
          <Loader2 className="absolute h-3.5 w-3.5 animate-spin text-rose-500" />
        )}
        {liked && !loading && (
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.58)]" />
        )}
        {isHotComment && !liked && !loading && (
          <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-white shadow-[0_0_10px_rgba(251,191,36,0.55)]">
            <Sparkles className="h-2 w-2" aria-hidden="true" />
          </span>
        )}
      </span>
      {count > 0 && (
        <span className={cn(
          "rounded-full px-1 text-[10px] font-black tabular-nums leading-none transition-colors",
          liked
            ? "text-rose-500"
            : isDark
              ? "text-white/82"
              : "text-muted-foreground",
        )}>
          {displayCount}
        </span>
      )}
      {!userId && (
        <span className="pointer-events-none absolute -bottom-1 -right-1 h-2 w-2 rounded-full bg-muted-foreground/70" aria-hidden="true" />
      )}
      <span className="sr-only">{countLabel}</span>
    </button>
  );
}
