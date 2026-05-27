/**
 * usePostReposts — track and toggle reposts (with optional quote) on feed posts.
 *
 * Optimistic — reposts the user has made are stored in an in-memory set keyed
 * by `${source}:${postId}`. Calling `toggleRepost(...)` flips the set and writes
 * to the `toggle_post_repost` RPC.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PostSource } from "@/hooks/usePostActions";

export function usePostReposts(userId: string | null) {
  const [reposted, setReposted] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) {
      setReposted(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("post_reposts")
        .select("post_id, source")
        .eq("user_id", userId);
      if (cancelled || error || !data) return;
      setReposted(new Set(data.map((r: any) => `${r.source}:${r.post_id}`)));
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const isReposted = useCallback(
    (postId: string, source: PostSource): boolean => reposted.has(`${source}:${postId}`),
    [reposted]
  );

  const toggleRepost = useCallback(async (
    postId: string,
    source: PostSource,
    quoteText?: string,
  ): Promise<boolean> => {
    if (!userId) return false;
    const key = `${source}:${postId}`;
    const was = reposted.has(key);

    setReposted(prev => {
      const next = new Set(prev);
      if (was) next.delete(key);
      else next.add(key);
      return next;
    });

    try {
      const { error } = await (supabase as any).rpc("toggle_post_repost", {
        _post_id: postId,
        _source: source,
        _quote_text: quoteText ?? null,
      });
      if (error) throw error;
      return !was;
    } catch {
      // Roll back on failure
      setReposted(prev => {
        const next = new Set(prev);
        if (was) next.add(key);
        else next.delete(key);
        return next;
      });
      return was;
    }
  }, [userId, reposted]);

  return { isReposted, toggleRepost };
}
