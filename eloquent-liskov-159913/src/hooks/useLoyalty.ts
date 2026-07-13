/**
 * Loyalty Hooks — reads from loyalty_points, loyalty_rewards tables
 * Returns any-typed data for backward compat with consumer pages
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function usePointsHistory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["loyalty-history", user?.id],
    queryFn: async (): Promise<any[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("loyalty_points")
        .select("id, user_id, points_balance, tier, lifetime_points, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Map to camelCase for consumer pages
      return (data || []).map(d => ({
        id: d.id,
        pointsAmount: d.points_balance,
        transactionType: "earn",
        description: `${d.tier} tier — ${d.lifetime_points} lifetime points`,
        createdAt: d.created_at,
        ...d,
      }));
    },
    enabled: !!user,
  });
}

export function useLoyaltySettings() {
  return useQuery({
    queryKey: ["loyalty-settings"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("loyalty_settings")
        .select("id, points_per_dollar, min_redeem_points, expiry_days, is_active")
        .limit(1)
        .maybeSingle();
      return (data || {}) as any;
    },
  });
}

export function useAvailableRewards() {
  return useQuery({
    queryKey: ["loyalty-rewards"],
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await supabase
        .from("loyalty_rewards")
        .select("id, name, description, points_required, reward_type, reward_value, is_active")
        .eq("is_active", true)
        .order("points_required");
      if (error) throw error;
      // Map to camelCase for consumer pages
      return (data || []).map(d => ({
        ...d,
        pointsRequired: d.points_required,
        rewardType: d.reward_type,
        rewardValue: d.reward_value,
      }));
    },
  });
}

export function useUserRedemptions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["loyalty-redemptions", user?.id],
    queryFn: async (): Promise<any[]> => {
      if (!user) return [];
      const { data } = await (supabase as any)
        .from("loyalty_redemptions")
        .select("id, user_id, reward_id, points_spent, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!user,
  });
}

export function useRedeemReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: any) => {
      const data = typeof input === "string" ? { reward_id: input, points_spent: 0 } : { reward_id: input.reward_id, points_spent: input.points || 0 };
      const { error } = await (supabase as any)
        .from("loyalty_redemptions")
        .insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-history"] });
      queryClient.invalidateQueries({ queryKey: ["loyalty-redemptions"] });
      queryClient.invalidateQueries({ queryKey: ["user-rewards"] });
      toast.success("Reward redeemed!");
    },
    onError: () => {
      toast.error("Failed to redeem reward");
    },
  });
}
