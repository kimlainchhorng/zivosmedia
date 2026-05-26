/**
 * usePostViewTracking — increment a post's view count when it stays in view
 * for at least DWELL_MS. Each (post, user) is counted only once per session
 * to avoid inflating numbers from rapid scrolls.
 *
 * Increments are best-effort and fire-and-forget; failures don't surface to
 * the user.
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const DWELL_MS = 1500;

// Posts already counted this session — survives rerenders, resets on reload.
const sessionViewed = new Set<string>();

export function usePostViewTracking(
  postId: string,
  source: "store" | "user",
  isActive: boolean,
  viewerId?: string | null,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Store post view-count RPC is granted to authenticated users in the
    // current project; user-post views can still count anonymous traffic.
    const canTrack = source === "user" || Boolean(viewerId);

    if (!isActive || !canTrack) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      return;
    }

    const key = `${source}:${postId}`;
    if (sessionViewed.has(key)) return;

    timerRef.current = setTimeout(() => {
      sessionViewed.add(key);
      const rpcName = source === "user" ? "increment_user_post_view_count" : "increment_store_post_view_count";
      supabase.rpc(rpcName as any, { p_post_id: postId }).then(({ error }) => {
        if (error) {
          sessionViewed.delete(key);
        }
      }, () => {
        sessionViewed.delete(key);
      });
    }, DWELL_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [postId, source, isActive, viewerId]);
}
