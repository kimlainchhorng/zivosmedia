/**
 * Favorites Hook
 * Manages user favorite items (hotels, activities, etc.)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { UserFavorite, AddFavoriteInput, FavoriteItemType } from "@/types/personalization";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

const QUERY_KEY = "user-favorites";

export function useFavorites(itemType?: FavoriteItemType) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch favorites
  const { data: favorites = [], isLoading } = useQuery({
    queryKey: [QUERY_KEY, user?.id, itemType],
    queryFn: async (): Promise<UserFavorite[]> => {
      if (!user?.id) return [];

      let query = supabase
        .from("user_favorites")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (itemType) {
        query = query.eq("item_type", itemType);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching favorites:", error);
        return [];
      }

      return (data || []).map((item) => ({
        id: item.id,
        user_id: item.user_id,
        item_type: item.item_type as FavoriteItemType,
        item_id: item.item_id,
        item_data: item.item_data as UserFavorite["item_data"],
        created_at: item.created_at,
      }));
    },
    enabled: !!user?.id,
  });

  // Add to favorites
  const addFavorite = useMutation({
    mutationFn: async (input: AddFavoriteInput) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase.from("user_favorites").insert({
        user_id: user.id,
        item_type: input.item_type,
        item_id: input.item_id,
        item_data: input.item_data as unknown as Json,
      });

      if (error) {
        // Handle duplicate
        if (error.code === "23505") {
          throw new Error("Already in favorites");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Added to favorites");
    },
    onError: (error) => {
      if (error.message === "Already in favorites") {
        toast.info("Already in favorites");
      } else {
        console.error("Failed to add favorite:", error);
        toast.error("Failed to add favorite");
      }
    },
  });

  // Remove from favorites
  const removeFavorite = useMutation({
    mutationFn: async ({ itemType, itemId }: { itemType: FavoriteItemType; itemId: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("item_type", itemType)
        .eq("item_id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Removed from favorites");
    },
    onError: (error) => {
      console.error("Failed to remove favorite:", error);
      toast.error("Failed to remove favorite");
    },
  });

  // Toggle favorite
  const toggleFavorite = useMutation({
    mutationFn: async (input: AddFavoriteInput) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Check if already favorited
      const { data: existing } = await supabase
        .from("user_favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("item_type", input.item_type)
        .eq("item_id", input.item_id)
        .maybeSingle();

      if (existing) {
        // Remove
        const { error } = await supabase
          .from("user_favorites")
          .delete()
          .eq("id", existing.id);

        if (error) throw error;
        return { action: "removed" as const };
      } else {
        // Add
        const { error } = await supabase.from("user_favorites").insert({
          user_id: user.id,
          item_type: input.item_type,
          item_id: input.item_id,
          item_data: input.item_data as unknown as Json,
        });

        if (error) throw error;
        return { action: "added" as const };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(result.action === "added" ? "Added to favorites" : "Removed from favorites");
    },
    onError: (error) => {
      console.error("Failed to toggle favorite:", error);
      toast.error("Failed to update favorite");
    },
  });

  // Check if item is favorited
  const isFavorited = (itemType: FavoriteItemType, itemId: string): boolean => {
    return favorites.some((f) => f.item_type === itemType && f.item_id === itemId);
  };

  return {
    favorites,
    isLoading,
    addFavorite: addFavorite.mutate,
    removeFavorite: removeFavorite.mutate,
    toggleFavorite: toggleFavorite.mutate,
    isToggling: toggleFavorite.isPending,
    isFavorited,
  };
}
