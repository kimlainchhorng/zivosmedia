/**
 * Loyalty Points Hook
 * Manages user loyalty points, tiers, and transactions
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  LOYALTY_TIERS,
  POINTS_PER_DOLLAR,
  POINTS_TO_DOLLAR,
  MIN_REDEMPTION_POINTS,
} from "@/types/personalization";
import type {
  LoyaltyPoints,
  LoyaltyTransaction,
  LoyaltyTier,
} from "@/types/personalization";
import { toast } from "sonner";

const POINTS_KEY = "loyalty-points";
const TRANSACTIONS_KEY = "loyalty-transactions-new";

export function useLoyaltyPoints() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch points balance
  const { data: points, isLoading: isLoadingPoints } = useQuery({
    queryKey: [POINTS_KEY, user?.id],
    queryFn: async (): Promise<LoyaltyPoints | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("loyalty_points")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching loyalty points:", error);
        return null;
      }

      if (!data) return null;

      return {
        id: data.id,
        user_id: data.user_id,
        points_balance: data.points_balance,
        lifetime_points: data.lifetime_points,
        tier: data.tier as LoyaltyTier,
        tier_updated_at: data.tier_updated_at,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    },
    enabled: !!user?.id,
  });

  // Fetch loyalty transactions from customer_wallet_transactions (loyalty-related)
  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["loyalty-transactions", user?.id],
    queryFn: async (): Promise<LoyaltyTransaction[]> => {
      if (!user?.id) return [];
      // Query wallet transactions where type indicates loyalty activity
      const { data, error } = await supabase
        .from("customer_wallet_transactions")
        .select("id, amount_cents, type, description, created_at, order_id")
        .eq("user_id", user.id)
        .in("type", ["loyalty_earn", "loyalty_redeem", "bonus", "referral_bonus", "payment"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        console.error("[LoyaltyPoints] Transactions fetch error:", error);
        return [];
      }
      return (data || []).map((t: any) => ({
        id: t.id,
        user_id: user.id,
        points_amount: Math.abs(t.amount_cents),
        transaction_type: t.type === "loyalty_redeem" ? "redeem" as const : "earn" as const,
        reference_type: t.type,
        reference_id: t.order_id || t.id,
        description: t.description || t.type,
        balance_after: 0, // Not tracked per-transaction in this table
        created_at: t.created_at,
      }));
    },
    enabled: !!user?.id,
  });

  // Determine tier from points
  const getTierFromPoints = (lifetimePoints: number): LoyaltyTier => {
    if (lifetimePoints >= LOYALTY_TIERS.gold.min) return "gold";
    if (lifetimePoints >= LOYALTY_TIERS.silver.min) return "silver";
    if (lifetimePoints >= LOYALTY_TIERS.bronze.min) return "bronze";
    return "standard";
  };

  // Initialize points for new user
  const initializePoints = async (): Promise<LoyaltyPoints | null> => {
    if (!user?.id) return null;

    const { data, error } = await supabase
      .from("loyalty_points")
      .insert({
        user_id: user.id,
        points_balance: 0,
        lifetime_points: 0,
        tier: "standard",
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to initialize points:", error);
      return null;
    }

    return {
      id: data.id,
      user_id: data.user_id,
      points_balance: data.points_balance,
      lifetime_points: data.lifetime_points,
      tier: data.tier as LoyaltyTier,
      tier_updated_at: data.tier_updated_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  };

  // Earn points (simplified - updates points table only)
  const earnPoints = useMutation({
    mutationFn: async ({
      amountSpent,
      description,
      bonusPoints = 0,
    }: {
      amountSpent: number;
      referenceType: string;
      referenceId: string;
      description: string;
      bonusPoints?: number;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      let currentPoints = points;
      if (!currentPoints) {
        currentPoints = await initializePoints();
        if (!currentPoints) throw new Error("Failed to initialize points");
      }

      const tierBonus = LOYALTY_TIERS[currentPoints.tier].bonus;
      const basePoints = Math.floor(amountSpent * POINTS_PER_DOLLAR);
      const bonusFromTier = Math.floor(basePoints * tierBonus);
      const totalEarned = basePoints + bonusFromTier + bonusPoints;

      const newBalance = currentPoints.points_balance + totalEarned;
      const newLifetime = currentPoints.lifetime_points + totalEarned;
      const newTier = getTierFromPoints(newLifetime);

      const { error: updateError } = await supabase
        .from("loyalty_points")
        .update({
          points_balance: newBalance,
          lifetime_points: newLifetime,
          tier: newTier,
          tier_updated_at: newTier !== currentPoints.tier ? new Date().toISOString() : currentPoints.tier_updated_at,
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      return { earned: totalEarned, newBalance, newTier };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [POINTS_KEY] });
      toast.success(`Earned ${result.earned} points!`);
    },
    onError: (error) => {
      console.error("Failed to earn points:", error);
      toast.error("Failed to earn points");
    },
  });

  // Redeem points
  const redeemPoints = useMutation({
    mutationFn: async ({
      pointsToRedeem,
    }: {
      pointsToRedeem: number;
      referenceType: string;
      referenceId: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      if (!points) throw new Error("No points balance");
      if (pointsToRedeem < MIN_REDEMPTION_POINTS) {
        throw new Error(`Minimum redemption is ${MIN_REDEMPTION_POINTS} points`);
      }
      if (pointsToRedeem > points.points_balance) {
        throw new Error("Insufficient points");
      }

      const newBalance = points.points_balance - pointsToRedeem;
      const discountValue = pointsToRedeem / POINTS_TO_DOLLAR;

      const { error: updateError } = await supabase
        .from("loyalty_points")
        .update({ points_balance: newBalance })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      return { redeemed: pointsToRedeem, discountValue, newBalance };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [POINTS_KEY] });
      toast.success(`Redeemed ${result.redeemed} points for $${result.discountValue.toFixed(2)} off!`);
    },
    onError: (error) => {
      console.error("Failed to redeem points:", error);
      toast.error(error instanceof Error ? error.message : "Failed to redeem points");
    },
  });

  const getNextTierProgress = () => {
    if (!points) return { nextTier: "bronze" as LoyaltyTier, progress: 0, pointsNeeded: 1000 };

    const currentTier = points.tier;
    const lifetimePoints = points.lifetime_points;

    if (currentTier === "gold") {
      return { nextTier: "gold" as LoyaltyTier, progress: 100, pointsNeeded: 0 };
    }

    const tiers: LoyaltyTier[] = ["standard", "bronze", "silver", "gold"];
    const currentIndex = tiers.indexOf(currentTier);
    const nextTier = tiers[currentIndex + 1];
    const nextTierMin = LOYALTY_TIERS[nextTier].min;
    const currentTierMin = LOYALTY_TIERS[currentTier].min;
    const range = nextTierMin - currentTierMin;
    const progress = ((lifetimePoints - currentTierMin) / range) * 100;
    const pointsNeeded = nextTierMin - lifetimePoints;

    return { nextTier, progress: Math.min(progress, 100), pointsNeeded };
  };

  const pointsToValue = (pts: number) => pts / POINTS_TO_DOLLAR;

  return {
    points: points || {
      id: "",
      user_id: user?.id || "",
      points_balance: 0,
      lifetime_points: 0,
      tier: "standard" as LoyaltyTier,
      tier_updated_at: null,
      created_at: "",
      updated_at: "",
    },
    transactions,
    isLoading: isLoadingPoints || isLoadingTransactions,
    earnPoints: earnPoints.mutate,
    isEarning: earnPoints.isPending,
    redeemPoints: redeemPoints.mutate,
    isRedeeming: redeemPoints.isPending,
    getNextTierProgress,
    pointsToValue,
    LOYALTY_TIERS,
    MIN_REDEMPTION_POINTS,
  };
}
