/**
 * useStoryRealtime — Subscribes to live changes on the active story's
 * reactions, comments, and views. Any INSERT / UPDATE / DELETE event
 * invalidates the matching React Query caches so the owner (and viewers)
 * see new emoji counts and threaded replies without refreshing.
 */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToPooledPostgresChanges } from "@/services/chatRealtimePool";

export function useStoryRealtime(storyId: string | null | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!storyId) return;

    const unsubscribe = subscribeToPooledPostgresChanges(
      {
        poolKey: `story-live:${storyId}`,
        event: "*",
        schema: "public",
        table: "story_reactions",
        filter: `story_id=eq.${storyId}`,
      },
      () => {
        queryClient.invalidateQueries({ queryKey: ["story-reactions-list", storyId] });
        queryClient.invalidateQueries({ queryKey: ["story-my-reaction", storyId] });
      }
    );

    const unsubscribeComments = subscribeToPooledPostgresChanges(
      {
        poolKey: `story-live:${storyId}`,
        event: "*",
        schema: "public",
        table: "story_comments",
        filter: `story_id=eq.${storyId}`,
      },
      () => {
        queryClient.invalidateQueries({ queryKey: ["story-comments", storyId] });
      }
    );

    const unsubscribeViews = subscribeToPooledPostgresChanges(
      {
        poolKey: `story-live:${storyId}`,
        event: "INSERT",
        schema: "public",
        table: "story_views",
        filter: `story_id=eq.${storyId}`,
      },
      () => {
        queryClient.invalidateQueries({ queryKey: ["story-viewers", storyId] });
      }
    );

    return () => {
      unsubscribe();
      unsubscribeComments();
      unsubscribeViews();
    };
  }, [storyId, queryClient]);
}
