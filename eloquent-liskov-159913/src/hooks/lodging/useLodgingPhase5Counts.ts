import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLodgingCatalog } from "./useLodgingCatalog";
import { useLodgeHousekeeping } from "./useLodgeHousekeeping";

/**
 * Count rows that are active (default true). Pure function — exported for tests.
 */
export function countActive(rows: { active?: boolean }[] | undefined | null): number {
  return (rows || []).filter((r) => r.active !== false).length;
}

/**
 * Count reviews that haven't been replied to. Pure function — exported for tests.
 */
export function countAwaitingReply(rows: { reply?: string | null }[] | undefined | null): number {
  return (rows || []).filter((r) => !r.reply).length;
}

export interface LodgingPhase5Counts {
  mealPlansCount: number;
  staffCount: number;
  channelConnectionsCount: number;
  promotionsCount: number;
  housekeepingCount: number;
  reviewsAwaitingReply: number;
  isLoading: boolean;
}

export function useLodgingPhase5Counts(storeId: string): LodgingPhase5Counts {
  const enabled = Boolean(storeId);
  const mealPlans = useLodgingCatalog<{ id: string; active?: boolean }>("lodging_meal_plans", storeId);
  const promotions = useLodgingCatalog<{ id: string; active?: boolean }>("lodging_promotions", storeId);
  const channels = useLodgingCatalog<{ id: string; active?: boolean }>("lodging_channel_connections", storeId);
  const reviews = useLodgingCatalog<{ id: string; reply?: string | null }>("lodging_reviews", storeId);
  const housekeeping = useLodgeHousekeeping(storeId);

  const staff = useQuery({
    queryKey: ["lodging_staff_count", storeId],
    enabled,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("store_employees")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId);
      if (error) throw error;
      return count ?? 0;
    },
  });

  return {
    mealPlansCount: countActive(mealPlans.list.data),
    staffCount: staff.data ?? 0,
    channelConnectionsCount: countActive(channels.list.data),
    promotionsCount: countActive(promotions.list.data),
    housekeepingCount: (housekeeping.data || []).length,
    reviewsAwaitingReply: countAwaitingReply(reviews.list.data),
    isLoading:
      mealPlans.list.isLoading ||
      promotions.list.isLoading ||
      channels.list.isLoading ||
      reviews.list.isLoading ||
      staff.isLoading,
  };
}
