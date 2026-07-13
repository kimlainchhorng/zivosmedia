/**
 * Recently Viewed Hook
 * Tracks and displays recently viewed items
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { RecentlyViewedItem, TrackViewInput, RecentlyViewedItemType } from "@/types/personalization";
import { usePersonalizationSettings } from "./usePersonalizationSettings";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

const QUERY_KEY = "recently-viewed";
const MAX_ITEMS = 20; // Keep last 20 items

export function useRecentlyViewed(itemType?: RecentlyViewedItemType) {
  const { user } = useAuth();
  const { settings } = usePersonalizationSettings();
  const queryClient = useQueryClient();

  // Fetch recently viewed
  const { data: items = [], isLoading } = useQuery({
    queryKey: [QUERY_KEY, user?.id, itemType],
    queryFn: async (): Promise<RecentlyViewedItem[]> => {
      if (!user?.id) return [];

      let query = supabase
        .from("user_recently_viewed")
        .select("*")
        .eq("user_id", user.id)
        .order("viewed_at", { ascending: false })
        .limit(MAX_ITEMS);

      if (itemType) {
        query = query.eq("item_type", itemType);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching recently viewed:", error);
        return [];
      }

      return (data || []).map((item) => ({
        id: item.id,
        user_id: item.user_id,
        item_type: item.item_type as RecentlyViewedItemType,
        item_id: item.item_id,
        item_data: item.item_data as RecentlyViewedItem["item_data"],
        viewed_at: item.viewed_at,
      }));
    },
    enabled: !!user?.id,
  });

  // Track a view
  const trackView = useMutation({
    mutationFn: async (input: TrackViewInput) => {
      if (!user?.id) return;
      if (!settings.allow_recently_viewed) return;

      // First, check if this item was recently viewed (within last 5 mins)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data: existing } = await supabase
        .from("user_recently_viewed")
        .select("id")
        .eq("user_id", user.id)
        .eq("item_type", input.item_type)
        .eq("item_id", input.item_id)
        .gte("viewed_at", fiveMinutesAgo)
        .maybeSingle();

      if (existing) {
        // Update timestamp
        await supabase
          .from("user_recently_viewed")
          .update({ 
            viewed_at: new Date().toISOString(), 
            item_data: input.item_data as unknown as Json,
          })
          .eq("id", existing.id);
      } else {
        // Insert new
        await supabase.from("user_recently_viewed").insert({
          user_id: user.id,
          item_type: input.item_type,
          item_id: input.item_id,
          item_data: input.item_data as unknown as Json,
        });

        // Clean up old entries (keep only MAX_ITEMS)
        const { data: allItems } = await supabase
          .from("user_recently_viewed")
          .select("id")
          .eq("user_id", user.id)
          .order("viewed_at", { ascending: false });

        if (allItems && allItems.length > MAX_ITEMS) {
          const idsToDelete = allItems.slice(MAX_ITEMS).map((i) => i.id);
          await supabase
            .from("user_recently_viewed")
            .delete()
            .in("id", idsToDelete);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  // Clear all recently viewed
  const clearAll = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_recently_viewed")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Cleared recently viewed");
    },
    onError: (error) => {
      console.error("Failed to clear:", error);
      toast.error("Failed to clear history");
    },
  });

  return {
    items,
    isLoading,
    trackView: trackView.mutate,
    clearAll: clearAll.mutate,
    isClearing: clearAll.isPending,
  };
}
