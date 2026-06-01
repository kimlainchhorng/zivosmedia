/**
 * usePostReactions — track and toggle multi-emoji reactions on feed posts.
 *
 * Single hook instance manages all reactions for the current user. The map is
 * `${source}:${postId}` → `ReactionEmoji`. Toggling the same emoji removes it;
 * a different emoji updates in place (one reaction per user per post).
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ReactionEmoji } from "@/lib/social/reactions";
import type { PostSource } from "@/hooks/usePostActions";
import { setPostReaction } from "@/lib/social/postReactionManage";

const POST_REACTIONS_ENABLED = import.meta.env.VITE_ENABLE_POST_REACTIONS === "true";

export function usePostReactions(userId: string | null) {
  const [reactions, setReactions] = useState<Map<string, ReactionEmoji>>(new Map());

  // Hydrate the user's existing reactions on mount
  useEffect(() => {
    if (!POST_REACTIONS_ENABLED) return;
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("post_reactions")
        .select("post_id, source, emoji")
        .eq("user_id", userId);
      if (cancelled || error || !data) return;
      const m = new Map<string, ReactionEmoji>();
      for (const r of data) m.set(`${r.source}:${r.post_id}`, r.emoji as ReactionEmoji);
      setReactions(m);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const reactionFor = useCallback(
    (postId: string, source: PostSource): ReactionEmoji | null =>
      reactions.get(`${source}:${postId}`) ?? null,
    [reactions]
  );

  const setReaction = useCallback(async (
    postId: string,
    source: PostSource,
    emoji: ReactionEmoji,
  ) => {
    if (!POST_REACTIONS_ENABLED) return;
    if (!userId) return;
    const key = `${source}:${postId}`;
    const current = reactions.get(key) ?? null;
    const next = current === emoji ? null : emoji;

    // Optimistic update
    setReactions((prev) => {
      const m = new Map(prev);
      if (next == null) m.delete(key);
      else m.set(key, next);
      return m;
    });

    try {
      const { error } = await setPostReaction({ post_id: postId, source, emoji: next });
      if (error) throw error;
    } catch {
      // Roll back
      setReactions((prev) => {
        const m = new Map(prev);
        if (current == null) m.delete(key);
        else m.set(key, current);
        return m;
      });
    }
  }, [userId, reactions]);

  return { reactionFor, setReaction };
}
