/**
 * useMyStoryViews — single source of truth for "which story IDs has the
 * current user already viewed". Used by the Feed, Profile, and Chat
 * carousels to drive the seen/unseen ring color.
 *
 * Behaviors:
 *  • Pulls `story_views` rows for the signed-in viewer.
 *  • Subscribes to realtime INSERTs on `story_views` filtered by the viewer
 *    so the ring desaturates immediately if the same account opens a story
 *    on another device.
 *  • Clears its cache when the user_id changes (sign-out / account switch)
 *    so the next account never sees a stale "seen" set.
 */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const STORY_VIEWS_KEY = "my-story-views";

export function useMyStoryViews() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id ?? null;

  const query = useQuery({
    queryKey: [STORY_VIEWS_KEY, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("story_views")
        .select("story_id")
        .eq("viewer_id", userId!);
      return new Set(((data as any[]) || []).map((v) => v.story_id as string));
    },
  });

  // Clear caches scoped to other users on user change.
  useEffect(() => {
    return () => {
      // On unmount or user change, drop foreign caches so a different
      // account never inherits this one's seen-set.
      qc.removeQueries({ queryKey: [STORY_VIEWS_KEY], exact: false });
    };
  }, [userId, qc]);

  // Realtime: keep the seen-set fresh across devices.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`story_views:${userId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "story_views",
          filter: `viewer_id=eq.${userId}`,
        },
        (payload: any) => {
          const id = payload?.new?.story_id;
          if (!id) return;
          qc.setQueryData<Set<string>>([STORY_VIEWS_KEY, userId], (prev) => {
            const next = new Set(prev ?? []);
            next.add(id);
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  return {
    viewedIds: query.data ?? new Set<string>(),
    isLoading: query.isLoading,
  };
}
