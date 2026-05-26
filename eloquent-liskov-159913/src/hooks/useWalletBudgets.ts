/**
 * Budget settings hook - real data from zivo_budget_settings
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface BudgetSetting {
  id: string;
  category: string;
  budget_amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = "wallet-budgets";

export function useWalletBudgets() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [QUERY_KEY, user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("zivo_budget_settings")
        .select("*")
        .eq("user_id", user!.id)
        .order("category");

      if (error) throw error;
      return (data || []) as BudgetSetting[];
    },
    enabled: !!user,
  });
}

export function useUpsertBudget() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ category, budget_amount }: { category: string; budget_amount: number }) => {
      const { error } = await (supabase as any)
        .from("zivo_budget_settings")
        .upsert(
          { user_id: user!.id, category, budget_amount, updated_at: new Date().toISOString() },
          { onConflict: "user_id,category" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Budget updated");
    },
    onError: () => toast.error("Failed to update budget"),
  });
}
