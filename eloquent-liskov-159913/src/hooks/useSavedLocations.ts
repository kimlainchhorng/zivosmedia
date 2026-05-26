import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SavedLocation = {
  id: string;
  user_id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  icon: string;
  created_at: string;
  updated_at: string;
};

export type SavedLocationInput = {
  label: string;
  address: string;
  lat: number;
  lng: number;
  icon?: string;
};

export const useSavedLocations = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["saved-locations", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("saved_locations")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as SavedLocation[];
    },
    enabled: !!userId,
  });
};

export const useAddSavedLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (location: SavedLocationInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("saved_locations")
        .insert({
          user_id: user.id,
          label: location.label,
          address: location.address,
          lat: location.lat,
          lng: location.lng,
          icon: location.icon || "pin",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-locations"] });
      toast.success("Location saved!");
    },
    onError: (error) => {
      toast.error("Failed to save location: " + error.message);
    },
  });
};

export const useUpdateSavedLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SavedLocationInput> & { id: string }) => {
      const { error } = await supabase
        .from("saved_locations")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-locations"] });
      toast.success("Location updated!");
    },
    onError: (error) => {
      toast.error("Failed to update location: " + error.message);
    },
  });
};

export const useDeleteSavedLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("saved_locations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-locations"] });
      toast.success("Location removed");
    },
    onError: (error) => {
      toast.error("Failed to delete location: " + error.message);
    },
  });
};
