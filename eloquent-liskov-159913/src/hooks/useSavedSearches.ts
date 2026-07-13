/**
 * useSavedSearches Hook
 * CRUD operations for user saved searches with price alerts
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface SavedSearch {
  id: string;
  user_id: string;
  service_type: string;
  title: string;
  search_params: Record<string, unknown>;
  price_alert_enabled: boolean;
  target_price: number | null;
  current_price: number | null;
  last_price_check_at: string | null;
  notification_email: boolean;
  notification_push: boolean;
  created_at: string;
  updated_at: string;
}

export function useSavedSearches() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["saved-searches", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_saved_searches")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SavedSearch[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (input: {
      title: string;
      service_type: string;
      search_params: Record<string, unknown>;
      price_alert_enabled?: boolean;
      target_price?: number | null;
      current_price?: number | null;
      notification_email?: boolean;
      notification_push?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("user_saved_searches")
        .insert({ ...input, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data as SavedSearch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
      toast.success("Search saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SavedSearch> & { id: string }) => {
      const { error } = await supabase
        .from("user_saved_searches")
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
      toast.success("Search updated");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_saved_searches")
        .delete()
        .eq("id", id)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
      toast.success("Search removed");
    },
  });

  const toggleAlertMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("user_saved_searches")
        .update({ price_alert_enabled: enabled, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
      toast.success("Alert updated");
    },
  });

  return {
    searches: query.data || [],
    isLoading: query.isLoading,
    saveSearch: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    updateSearch: updateMutation.mutate,
    deleteSearch: deleteMutation.mutate,
    toggleAlert: toggleAlertMutation.mutate,
  };
}
