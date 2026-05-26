/**
 * Per-cafe-tab counts that surface as sidebar badges. Light realtime refresh
 * whenever cafe_orders or cafe_payments changes for this store.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CafeSidebarBadges {
  ordersOpen: number;            // pending + accepted + preparing
  kdsActive: number;             // preparing + ready (kitchen "needs eyes")
  tablesOccupied: number;        // distinct table_ids with open orders
  reviewsUnreplied: number;      // visible reviews missing owner_response
  reservationsPending: number;   // customer-submitted, awaiting owner action
}

const ZERO: CafeSidebarBadges = {
  ordersOpen: 0,
  kdsActive: 0,
  tablesOccupied: 0,
  reviewsUnreplied: 0,
  reservationsPending: 0,
};

export function useCafeSidebarBadges(storeId: string | undefined, isCafe: boolean): CafeSidebarBadges {
  const [badges, setBadges] = useState<CafeSidebarBadges>(ZERO);

  const load = useCallback(async () => {
    if (!storeId || !isCafe) { setBadges(ZERO); return; }
    const [openRes, kdsRes, tableRes, reviewRes, resvRes] = await Promise.all([
      supabase.from("cafe_orders" as never)
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId).in("status", ["pending", "accepted", "preparing"]),
      supabase.from("cafe_orders" as never)
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId).in("status", ["preparing", "ready"]),
      supabase.from("cafe_orders" as never)
        .select("table_id")
        .eq("store_id", storeId)
        .in("status", ["pending", "accepted", "preparing", "ready", "served"])
        .not("table_id", "is", null),
      supabase.from("cafe_reviews" as never)
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId).eq("is_visible", true).is("owner_response", null),
      supabase.from("cafe_reservations" as never)
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId).eq("status", "pending"),
    ]);
    const distinctTables = new Set<string>();
    for (const r of (tableRes.data ?? []) as { table_id: string | null }[]) {
      if (r.table_id) distinctTables.add(r.table_id);
    }
    setBadges({
      ordersOpen: openRes.count ?? 0,
      kdsActive: kdsRes.count ?? 0,
      tablesOccupied: distinctTables.size,
      reviewsUnreplied: reviewRes.count ?? 0,
      reservationsPending: resvRes.count ?? 0,
    });
  }, [storeId, isCafe]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!storeId || !isCafe) return;
    const ch = supabase
      .channel(`cafe-badges:${storeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cafe_orders", filter: `store_id=eq.${storeId}` }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "cafe_reviews", filter: `store_id=eq.${storeId}` }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "cafe_reservations", filter: `store_id=eq.${storeId}` }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [storeId, isCafe, load]);

  return badges;
}
