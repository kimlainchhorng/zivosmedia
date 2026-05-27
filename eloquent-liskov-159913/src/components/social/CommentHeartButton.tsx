/**
 * CommentHeartButton — single-tap heart on an individual comment.
 *
 * Optimistic state. Calls `toggle_comment_like` RPC. Hides the count when 0.
 * Theme-aware so it works on dark and light comment surfaces.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Heart from "lucide-react/dist/esm/icons/heart";
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
  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading || !userId}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 rounded-full transition-transform active:scale-90 min-w-[36px] min-h-[36px] px-1.5 py-1",
        loading && "opacity-60",
      )}
      aria-label={liked ? "Unlike comment" : "Like comment"}
      aria-pressed={liked}
    >
      <Heart
        className={cn(
          "h-4 w-4",
          liked ? "text-red-500 fill-red-500" : isDark ? "text-white/70" : "text-muted-foreground",
        )}
      />
      {count > 0 && (
        <span className={cn(
          "text-[10px] font-semibold tabular-nums leading-none",
          isDark ? "text-white/80" : "text-muted-foreground",
        )}>
          {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
        </span>
      )}
    </button>
  );
}
