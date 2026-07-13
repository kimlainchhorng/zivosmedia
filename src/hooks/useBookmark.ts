/**
 * useBookmark — Hook for saving/unsaving items (posts, flights, restaurants)
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useCallback } from "react";

export function useBookmark(itemType: string, itemId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: isBookmarked = false } = useQuery({
    queryKey: ["bookmark-check", user?.id, itemType, itemId],
    queryFn: async () => {
      if (!user || !itemId) return false;
      const { data } = await (supabase as any)
        .from("bookmarks")
        .select("id")
        .eq("user_id", user.id)
        .eq("item_type", itemType)
        .eq("item_id", itemId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!itemId,
  });

  const toggle = useCallback(async () => {
    if (!user || !itemId) return;
    if (isBookmarked) {
      await (supabase as any)
        .from("bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("item_type", itemType)
        .eq("item_id", itemId);
      toast.success("Removed from saved");
    } else {
      await (supabase as any)
        .from("bookmarks")
        .insert({ user_id: user.id, item_type: itemType, item_id: itemId });
      toast.success("Saved!");
    }
    queryClient.invalidateQueries({ queryKey: ["bookmark-check", user.id, itemType, itemId] });
    queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
  }, [user, itemId, itemType, isBookmarked, queryClient]);

  return { isBookmarked, toggle };
}
