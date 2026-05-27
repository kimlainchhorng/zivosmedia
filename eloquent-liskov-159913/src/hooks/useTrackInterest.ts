/**
 * Hook to track user content interest for the AI recommendation engine.
 * Call this when a user views a Reel, clicks a Map pin, or visits a shop.
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useTrackInterest() {
  const { user } = useAuth();

  const trackInterest = useCallback(
    async (category: string, source: "view" | "click" | "purchase" = "view", weight = 1) => {
      if (!user?.id || !category) return;
      try {
        await supabase.rpc("track_user_interest", {
          p_user_id: user.id,
          p_category: category,
          p_source: source,
          p_weight: weight,
        });
      } catch {
        // Silent — non-critical analytics
      }
    },
    [user?.id]
  );

  return { trackInterest };
}
