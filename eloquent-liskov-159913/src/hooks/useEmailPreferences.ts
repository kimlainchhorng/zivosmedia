import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { UserEmailPreferences, UpdateEmailPreferencesInput } from "@/types/travelers";

export const useEmailPreferences = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["emailPreferences", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("user_email_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      // Return default preferences if none exist
      if (!data) {
        return {
          marketing_emails: true,
          price_alerts: true,
          booking_updates: true,
          newsletter: true,
        } as Partial<UserEmailPreferences>;
      }

      return data as UserEmailPreferences;
    },
    enabled: !!user?.id,
  });
};

export const useUpdateEmailPreferences = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: UpdateEmailPreferencesInput) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Check if preferences exist
      const { data: existing } = await supabase
        .from("user_email_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from("user_email_preferences")
          .update(updates)
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) throw error;
        return data as UserEmailPreferences;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("user_email_preferences")
          .insert({
            user_id: user.id,
            ...updates,
          })
          .select()
          .single();

        if (error) throw error;
        return data as UserEmailPreferences;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailPreferences", user?.id] });
      toast.success("Email preferences updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update preferences: " + error.message);
    },
  });
};
