/**
 * Per-dealership-tab counts that surface as sidebar badges.
 * Refreshes on the realtime channel when any relevant table changes.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DealershipSidebarBadges {
  leadsNew: number;
  leadsFollowupDue: number;
  testDrivesToday: number;
  salesPending: number;
  financingPending: number;
  reviewsUnreplied: number;
}

const ZERO: DealershipSidebarBadges = {
  leadsNew: 0,
  leadsFollowupDue: 0,
  testDrivesToday: 0,
  salesPending: 0,
  financingPending: 0,
  reviewsUnreplied: 0,
};

export function useDealershipSidebarBadges(
  storeId: string | undefined,
  isDealership: boolean,
): DealershipSidebarBadges {
  const [badges, setBadges] = useState<DealershipSidebarBadges>(ZERO);

  const load = useCallback(async () => {
    if (!storeId || !isDealership) {
      setBadges(ZERO);
      return;
    }
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [newRes, followRes, driveRes, salesRes, finRes, reviewRes] = await Promise.all([
      supabase.from("car_dealership_leads")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId).eq("status", "new"),
      supabase.from("car_dealership_leads")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .not("next_followup_at", "is", null)
        .lte("next_followup_at", new Date().toISOString())
        .not("status", "in", "(won,lost)"),
      supabase.from("car_dealership_test_drives")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .gte("scheduled_at", startOfDay.toISOString())
        .lte("scheduled_at", endOfDay.toISOString())
        .in("status", ["scheduled", "confirmed"]),
      supabase.from("car_dealership_sales")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId).in("status", ["pending", "deposit_paid", "financing"]),
      supabase.from("car_dealership_financing")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId).in("status", ["submitted", "conditionally_approved"]),
      supabase.from("car_dealership_reviews")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId).eq("is_visible", true).is("owner_response", null),
    ]);

    setBadges({
      leadsNew: newRes.count ?? 0,
      leadsFollowupDue: followRes.count ?? 0,
      testDrivesToday: driveRes.count ?? 0,
      salesPending: salesRes.count ?? 0,
      financingPending: finRes.count ?? 0,
      reviewsUnreplied: reviewRes.count ?? 0,
    });
  }, [storeId, isDealership]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!storeId || !isDealership) return;
    const channel = supabase
      .channel(`cd-badges:${storeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "car_dealership_leads", filter: `store_id=eq.${storeId}` }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "car_dealership_test_drives", filter: `store_id=eq.${storeId}` }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "car_dealership_sales", filter: `store_id=eq.${storeId}` }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "car_dealership_financing", filter: `store_id=eq.${storeId}` }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "car_dealership_reviews", filter: `store_id=eq.${storeId}` }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [storeId, isDealership, load]);

  return badges;
}
