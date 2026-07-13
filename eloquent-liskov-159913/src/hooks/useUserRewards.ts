/** User rewards — reads from loyalty_points table */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useUserRewards(..._args: any[]) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["user-rewards", user?.id],
    queryFn: async () => {
      if (!user) return { points: 0, tier: "bronze", active: [] };
      const { data, error } = await supabase
        .from("loyalty_points")
        .select("points_balance, tier, lifetime_points")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      
      // Fetch active rewards
      const { data: rewards } = await supabase
        .from("loyalty_rewards")
        .select("id, name, description, points_required, reward_type, reward_value")
        .eq("is_active", true)
        .order("points_required");

      return {
        points: data?.points_balance || 0,
        tier: data?.tier || "bronze",
        active: rewards || [],
      };
    },
    enabled: !!user,
  });

  return {
    points: query.data?.points || 0,
    tier: query.data?.tier || "bronze",
    isLoading: query.isLoading,
    active: query.data?.active || [],
  };
}
