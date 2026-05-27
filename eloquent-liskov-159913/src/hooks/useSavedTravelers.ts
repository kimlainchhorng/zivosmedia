import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { SavedTraveler, CreateSavedTravelerInput, UpdateSavedTravelerInput } from "@/types/travelers";

export const useSavedTravelers = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["savedTravelers", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("saved_travelers")
        .select("*")
        .eq("user_id", user.id)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SavedTraveler[];
    },
    enabled: !!user?.id,
  });
};

export const usePrimaryTraveler = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["primaryTraveler", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("saved_travelers")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_primary", true)
        .maybeSingle();

      if (error) throw error;
      return data as SavedTraveler | null;
    },
    enabled: !!user?.id,
  });
};

export const useCreateSavedTraveler = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateSavedTravelerInput) => {
      if (!user?.id) throw new Error("Not authenticated");

      // If this is being set as primary, unset any existing primary
      if (input.is_primary) {
        await supabase
          .from("saved_travelers")
          .update({ is_primary: false })
          .eq("user_id", user.id)
          .eq("is_primary", true);
      }

      const { data, error } = await supabase
        .from("saved_travelers")
        .insert({
          user_id: user.id,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;
      return data as SavedTraveler;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedTravelers", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["primaryTraveler", user?.id] });
      toast.success("Traveler saved successfully");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.error("A traveler with these details already exists");
      } else {
        toast.error("Failed to save traveler: " + error.message);
      }
    },
  });
};

export const useUpdateSavedTraveler = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateSavedTravelerInput) => {
      if (!user?.id) throw new Error("Not authenticated");

      // If setting as primary, unset any existing primary
      if (updates.is_primary) {
        await supabase
          .from("saved_travelers")
          .update({ is_primary: false })
          .eq("user_id", user.id)
          .eq("is_primary", true);
      }

      const { data, error } = await supabase
        .from("saved_travelers")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data as SavedTraveler;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedTravelers", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["primaryTraveler", user?.id] });
      toast.success("Traveler updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update traveler: " + error.message);
    },
  });
};

export const useDeleteSavedTraveler = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("saved_travelers")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedTravelers", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["primaryTraveler", user?.id] });
      toast.success("Traveler removed");
    },
    onError: (error: Error) => {
      toast.error("Failed to remove traveler: " + error.message);
    },
  });
};

export const useSetPrimaryTraveler = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      // First unset all primary
      await supabase
        .from("saved_travelers")
        .update({ is_primary: false })
        .eq("user_id", user.id);

      // Then set the new primary
      const { error } = await supabase
        .from("saved_travelers")
        .update({ is_primary: true })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedTravelers", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["primaryTraveler", user?.id] });
      toast.success("Primary traveler updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update primary traveler: " + error.message);
    },
  });
};
