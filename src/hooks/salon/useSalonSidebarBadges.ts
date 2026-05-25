/**
 * Per-salon-tab counts that surface as sidebar badges. One round trip via
 * a few parallel COUNT queries; refreshes on the realtime channel when any
 * relevant table changes for the store.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SalonSidebarBadges {
  bookingsPending: number;
  waitlist: number;
  reviewsUnreplied: number;
  retailLowStock: number;
}

const ZERO: SalonSidebarBadges = {
  bookingsPending: 0,
  waitlist: 0,
  reviewsUnreplied: 0,
  retailLowStock: 0,
};

export function useSalonSidebarBadges(storeId: string | undefined, isSalon: boolean): SalonSidebarBadges {
  const [badges, setBadges] = useState<SalonSidebarBadges>(ZERO);

  const load = useCallback(async () => {
    if (!storeId || !isSalon) {
      setBadges(ZERO);
      return;
    }
    const [pendingRes, waitRes, reviewRes, retailRes] = await Promise.all([
      supabase.from("salon_bookings")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId).eq("source", "app").eq("status", "pending"),
      supabase.from("salon_waitlist")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId).in("status", ["waiting", "notified"]),
      supabase.from("salon_reviews")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId).eq("is_visible", true).is("owner_response", null),
      supabase.from("salon_retail_products")
        .select("id, stock_quantity, low_stock_threshold")
        .eq("store_id", storeId).eq("is_active", true),
    ]);
    let lowStockCount = 0;
    for (const r of retailRes.data ?? []) {
      const row = r as { stock_quantity: number; low_stock_threshold: number };
      if (row.stock_quantity <= row.low_stock_threshold) lowStockCount++;
    }
    setBadges({
      bookingsPending: pendingRes.count ?? 0,
      waitlist: waitRes.count ?? 0,
      reviewsUnreplied: reviewRes.count ?? 0,
      retailLowStock: lowStockCount,
    });
  }, [storeId, isSalon]);

  useEffect(() => {
    void load();
  }, [load]);

  // Light realtime: refresh whenever any of the relevant tables get a change
  // affecting THIS store. Cheap because Postgres broadcasts payload-only.
  useEffect(() => {
    if (!storeId || !isSalon) return;
    const channel = supabase
      .channel(`salon-badges:${storeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "salon_bookings", filter: `store_id=eq.${storeId}` }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "salon_waitlist", filter: `store_id=eq.${storeId}` }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "salon_reviews", filter: `store_id=eq.${storeId}` }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "salon_retail_products", filter: `store_id=eq.${storeId}` }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [storeId, isSalon, load]);

  return badges;
}
