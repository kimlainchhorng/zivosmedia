/**
 * Savings Goals hook - real data from zivo_savings_goals
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface SavingsGoal {
  id: string;
  name: string;
  emoji: string;
  target_amount: number;
  saved_amount: number;
  currency: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = "savings-goals";

export function useSavingsGoals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [QUERY_KEY, user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("zivo_savings_goals")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_completed", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as SavingsGoal[];
    },
    enabled: !!user,
  });
}

export function useCreateSavingsGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, emoji, target_amount }: { name: string; emoji: string; target_amount: number }) => {
      const { error } = await (supabase as any)
        .from("zivo_savings_goals")
        .insert({ user_id: user!.id, name, emoji, target_amount });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Savings goal created");
    },
    onError: () => toast.error("Failed to create goal"),
  });
}

export function useUpdateSavingsGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, saved_amount }: { id: string; saved_amount: number }) => {
      const { error } = await (supabase as any)
        .from("zivo_savings_goals")
        .update({ saved_amount, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Goal updated");
    },
    onError: () => toast.error("Failed to update goal"),
  });
}

export function useDeleteSavingsGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("zivo_savings_goals")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Goal removed");
    },
    onError: () => toast.error("Failed to remove goal"),
  });
}
