/**
 * useDriverDashboardData - Aggregated driver stats from Supabase
 * Replaces useTodayStats, useDailyGoal, useDriverRating from reference project
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TodayStats {
  todayEarnings: number;
  todayDeliveries: number;
  todayTips: number;
  weekEarnings: number;
  weekDeliveries: number;
  weekTips: number;
  hoursOnline: number;
  acceptanceRate: number;
  rating: number;
  dailyGoal: number;
}

const DEFAULT_STATS: TodayStats = {
  todayEarnings: 0,
  todayDeliveries: 0,
  todayTips: 0,
  weekEarnings: 0,
  weekDeliveries: 0,
  weekTips: 0,
  hoursOnline: 0,
  acceptanceRate: 100,
  rating: 5.0,
  dailyGoal: 150,
};

export function useDriverDashboardData() {
  const [stats, setStats] = useState<TodayStats>(DEFAULT_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [driverId, setDriverId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setDriverId(data.user?.id ?? null);
    });
  }, []);

  const fetchStats = useCallback(async () => {
    if (!driverId) return;
    setIsLoading(true);

    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      // Fetch driver profile
      const { data: driver } = await supabase
        .from("drivers")
        .select("rating, total_trips, acceptance_rate, completion_rate, daily_goal")
        .eq("id", driverId)
        .maybeSingle();

      // Fetch today's completed food orders
      const { data: todayOrders } = await supabase
        .from("food_orders")
        .select("delivery_fee, tip_amount, delivered_at")
        .eq("driver_id", driverId)
        .gte("delivered_at", todayStart.toISOString())
        .in("status", ["delivered"]);

      // Fetch week's completed food orders
      const { data: weekOrders } = await supabase
        .from("food_orders")
        .select("delivery_fee, tip_amount, delivered_at")
        .eq("driver_id", driverId)
        .gte("delivered_at", weekStart.toISOString())
        .in("status", ["delivered"]);

      // Fetch today's completed trips (ride-hailing)
      const { data: todayTrips } = await supabase
        .from("trips")
        .select("driver_payout_cents, completed_at")
        .eq("driver_id", driverId)
        .gte("completed_at", todayStart.toISOString())
        .eq("status", "completed");

      // Fetch week's completed trips
      const { data: weekTrips } = await supabase
        .from("trips")
        .select("driver_payout_cents, completed_at")
        .eq("driver_id", driverId)
        .gte("completed_at", weekStart.toISOString())
        .eq("status", "completed");

      const todayDeliveryEarnings = (todayOrders || []).reduce((sum, o) => sum + (o.delivery_fee || 0), 0);
      const todayTips = (todayOrders || []).reduce((sum, o) => sum + (o.tip_amount || 0), 0);
      const todayRideEarnings = (todayTrips || []).reduce((sum, t) => sum + (t.driver_payout_cents || 0) / 100, 0);
      const weekDeliveryEarnings = (weekOrders || []).reduce((sum, o) => sum + (o.delivery_fee || 0), 0);
      const weekTips = (weekOrders || []).reduce((sum, o) => sum + (o.tip_amount || 0), 0);
      const weekRideEarnings = (weekTrips || []).reduce((sum, t) => sum + (t.driver_payout_cents || 0) / 100, 0);

      setStats({
        todayEarnings: todayDeliveryEarnings + todayTips + todayRideEarnings,
        todayDeliveries: (todayOrders?.length || 0) + (todayTrips?.length || 0),
        todayTips,
        weekEarnings: weekDeliveryEarnings + weekTips + weekRideEarnings,
        weekDeliveries: (weekOrders?.length || 0) + (weekTrips?.length || 0),
        weekTips,
        hoursOnline: 0,
        acceptanceRate: driver?.acceptance_rate ?? 100,
        rating: driver?.rating ?? 5.0,
        dailyGoal: driver?.daily_goal ?? 150,
      });
    } catch (err) {
      console.error("Failed to fetch driver stats:", err);
    } finally {
      setIsLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, refetch: fetchStats, driverId };
}
