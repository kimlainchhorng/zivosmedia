/**
 * useMembershipSavings - Track monthly membership savings
 * Aggregates discount amounts from food_orders for the current month
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MembershipSavingsData {
  thisMonthCents: number;
  thisMonthDollars: number;
  orderCount: number;
  lastOrderDate: string | null;
}

export function useMembershipSavings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["membership-savings", user?.id],
    queryFn: async (): Promise<MembershipSavingsData> => {
      if (!user?.id) {
        return {
          thisMonthCents: 0,
          thisMonthDollars: 0,
          orderCount: 0,
          lastOrderDate: null,
        };
      }

      // Get start of current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("food_orders")
        .select("membership_discount_cents, created_at")
        .eq("customer_id", user.id)
        .eq("membership_applied", true)
        .gte("created_at", startOfMonth.toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching membership savings:", error);
        throw error;
      }

      const totalCents = data?.reduce(
        (sum, order) => sum + (order.membership_discount_cents || 0),
        0
      ) || 0;

      return {
        thisMonthCents: totalCents,
        thisMonthDollars: totalCents / 100,
        orderCount: data?.length || 0,
        lastOrderDate: data?.[0]?.created_at || null,
      };
    },
    enabled: !!user?.id,
    staleTime: 60000, // 1 minute
  });
}
