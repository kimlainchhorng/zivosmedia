/**
 * Personalization Settings Hook
 * Manages user personalization preferences
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { UserPersonalizationSettings } from "@/types/personalization";
import { toast } from "sonner";

const QUERY_KEY = "personalization-settings";

export function usePersonalizationSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch settings
  const { data: settings, isLoading } = useQuery({
    queryKey: [QUERY_KEY, user?.id],
    queryFn: async (): Promise<UserPersonalizationSettings | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("user_personalization_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching personalization settings:", error);
        return null;
      }

      return data as UserPersonalizationSettings | null;
    },
    enabled: !!user?.id,
  });

  // Create or update settings
  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<UserPersonalizationSettings>) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data: existing } = await supabase
        .from("user_personalization_settings")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("user_personalization_settings")
          .update(updates)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_personalization_settings")
          .insert({ user_id: user.id, ...updates });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Settings updated");
    },
    onError: (error) => {
      console.error("Failed to update settings:", error);
      toast.error("Failed to update settings");
    },
  });

  // Get default settings if none exist
  const effectiveSettings: UserPersonalizationSettings = settings || {
    id: "",
    user_id: user?.id || "",
    personalization_enabled: true,
    show_price_badges: true,
    show_urgency_indicators: true,
    allow_search_history: true,
    allow_recently_viewed: true,
    preferred_currency: "USD",
    preferred_language: "en",
    created_at: "",
    updated_at: "",
  };

  return {
    settings: effectiveSettings,
    isLoading,
    updateSettings: updateSettings.mutate,
    isUpdating: updateSettings.isPending,
  };
}
