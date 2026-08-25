/**
 * useDriverDashboardData - Aggregated driver stats from Supabase
 * Replaces useTodayStats, useDailyGoal, useDriverRating from reference project
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KHR_PER_USD } from "@/lib/currency";

interface TodayStats {
  todayEarnings: number;
  todayDeliveries: number;
  todayTips: number;
  weekEarnings: number;
  weekDeliveries: number;
  weekTips: number;
  hoursOnline: number;
  /** null when no acceptance rate has been measured. Never 100 as a stand-in. */
  acceptanceRate: number | null;
  /** null when nobody has rated this driver. Never 5.0 as a stand-in. */
  rating: number | null;
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
  // The pre-load state is not a measurement either. Seeding 100% and 5.0 here
  // meant a driver saw a perfect scorecard for the moment before their real
  // data arrived — and forever, if it never did.
  acceptanceRate: null,
  rating: null,
  dailyGoal: 150,
};

function earningToUsd(row: { net_amount?: number | null; currency?: string | null }) {
  const amount = Number(row.net_amount || 0);
  return String(row.currency || "USD").toUpperCase() === "KHR" ? amount / KHR_PER_USD : amount;
}

function tipToUsd(row: { tip_amount?: number | null; currency?: string | null }) {
  const amount = Number(row.tip_amount || 0);
  return String(row.currency || "USD").toUpperCase() === "KHR" ? amount / KHR_PER_USD : amount;
}

export function useDriverDashboardData() {
  const [stats, setStats] = useState<TodayStats>(DEFAULT_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const userId = data.user?.id ?? null;
      setAuthUserId(userId);
      if (!userId) {
        setDriverId(null);
        setIsLoading(false);
        return;
      }

      const { data: driver } = await supabase
        .from("drivers")
        .select("id")
        .or(`id.eq.${userId},user_id.eq.${userId}`)
        .maybeSingle();
      setDriverId(driver?.id ?? userId);
    });
  }, []);

  const fetchStats = useCallback(async () => {
    if (!driverId) {
      setStats(DEFAULT_STATS);
      setIsLoading(false);
      return;
    }
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
        .select("rating, rating_count, total_trips, acceptance_rate, completion_rate, daily_goal")
        .eq("id", driverId)
        .maybeSingle();

      const driverFilterIds = Array.from(new Set([driverId, authUserId].filter(Boolean))) as string[];

      // Fetch today's completed food orders
      const { data: todayOrders } = await supabase
        .from("food_orders")
        .select("delivery_fee, tip_amount, delivered_at")
        .in("driver_id", driverFilterIds)
        .gte("delivered_at", todayStart.toISOString())
        .in("status", ["delivered"]);

      // Fetch week's completed food orders
      const { data: weekOrders } = await supabase
        .from("food_orders")
        .select("delivery_fee, tip_amount, delivered_at")
        .in("driver_id", driverFilterIds)
        .gte("delivered_at", weekStart.toISOString())
        .in("status", ["delivered"]);

      // Fetch today's completed ride earnings. This includes modern ride_requests
      // payouts, including manual KHR Bakong/KHQR earnings converted for display.
      const { data: todayRideEarningsRows } = await (supabase as any).from("driver_earnings")
        .select("net_amount, tip_amount, currency, created_at")
        .eq("driver_id", driverId)
        .gte("created_at", todayStart.toISOString());

      // Fetch week's completed ride earnings
      const { data: weekRideEarningsRows } = await (supabase as any).from("driver_earnings")
        .select("net_amount, tip_amount, currency, created_at")
        .eq("driver_id", driverId)
        .gte("created_at", weekStart.toISOString());

      const todayDeliveryEarnings = (todayOrders || []).reduce((sum, o) => sum + (o.delivery_fee || 0), 0);
      const todayTips = (todayOrders || []).reduce((sum, o) => sum + (o.tip_amount || 0), 0);
      const todayRideEarnings = (todayRideEarningsRows || []).reduce((sum, t) => sum + earningToUsd(t), 0);
      const todayRideTips = (todayRideEarningsRows || []).reduce((sum, t) => sum + tipToUsd(t), 0);
      const weekDeliveryEarnings = (weekOrders || []).reduce((sum, o) => sum + (o.delivery_fee || 0), 0);
      const weekTips = (weekOrders || []).reduce((sum, o) => sum + (o.tip_amount || 0), 0);
      const weekRideEarnings = (weekRideEarningsRows || []).reduce((sum, t) => sum + earningToUsd(t), 0);
      const weekRideTips = (weekRideEarningsRows || []).reduce((sum, t) => sum + tipToUsd(t), 0);

      setStats({
        todayEarnings: todayDeliveryEarnings + todayTips + todayRideEarnings,
        todayDeliveries: (todayOrders?.length || 0) + (todayRideEarningsRows?.length || 0),
        todayTips: todayTips + todayRideTips,
        weekEarnings: weekDeliveryEarnings + weekTips + weekRideEarnings,
        weekDeliveries: (weekOrders?.length || 0) + (weekRideEarningsRows?.length || 0),
        weekTips: weekTips + weekRideTips,
        hoursOnline: 0,
        // Was `?? 100` — a perfect acceptance rate handed to a driver whose
        // rate has never been measured.
        acceptanceRate: typeof driver?.acceptance_rate === "number" ? driver.acceptance_rate : null,
        // Was `?? 5.0`. `drivers.rating` defaults to 5 beside `rating_count = 0`,
        // so the fallback was not even needed to produce the lie — the column
        // supplies it. Require a count.
        rating: (driver?.rating_count ?? 0) > 0 ? (driver?.rating ?? null) : null,
        dailyGoal: driver?.daily_goal ?? 150,
      });
    } catch (err) {
      console.error("Failed to fetch driver stats:", err);
    } finally {
      setIsLoading(false);
    }
  }, [authUserId, driverId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, refetch: fetchStats, driverId };
}
