/**
 * useTravelerProfiles Hook
 * CRUD operations for saved traveler profiles
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type TravelerProfile = {
  id: string;
  user_id: string;
  label: string;
  is_primary: boolean;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  passport_number: string | null;
  passport_expiry: string | null;
  passport_country: string | null;
  frequent_flyer_airline: string | null;
  frequent_flyer_number: string | null;
  tsa_precheck_number: string | null;
  known_traveler_number: string | null;
  redress_number: string | null;
  dietary_preferences: string[] | null;
  seat_preference: string | null;
  special_assistance: string | null;
  created_at: string;
  updated_at: string;
};

export type TravelerProfileInput = Omit<TravelerProfile, "id" | "user_id" | "created_at" | "updated_at">;

const QUERY_KEY = "travelerProfiles";

export function useTravelerProfiles() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("traveler_profiles")
        .select("*")
        .eq("user_id", user.id)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TravelerProfile[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateTravelerProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: TravelerProfileInput) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("traveler_profiles")
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as TravelerProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Traveler profile saved");
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useUpdateTravelerProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TravelerProfileInput> & { id: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("traveler_profiles")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Traveler profile updated");
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useDeleteTravelerProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("traveler_profiles")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Traveler profile deleted");
    },
    onError: (err) => toast.error(err.message),
  });
}
