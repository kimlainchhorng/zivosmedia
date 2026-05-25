/**
 * Counters shown as sidebar badges in StoreOwnerLayout for car-rental stores:
 *   - reservationsPending: pending booking requests waiting for confirmation
 *   - returnsActive: vehicles currently on rental
 *   - returnsOverdue: rentals whose drop-off is in the past and not returned
 *   - reviewsUnack: reviews not yet acknowledged
 *   - maintenanceActive: vehicles currently in maintenance status
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CarRentalSidebarBadges {
  reservationsPending: number;
  returnsActive: number;
  returnsOverdue: number;
  reviewsUnack: number;
  maintenanceActive: number;
}

const EMPTY: CarRentalSidebarBadges = {
  reservationsPending: 0,
  returnsActive: 0,
  returnsOverdue: 0,
  reviewsUnack: 0,
  maintenanceActive: 0,
};

export function useCarRentalSidebarBadges(storeId: string | undefined, enabled: boolean) {
  const [badges, setBadges] = useState<CarRentalSidebarBadges>(EMPTY);

  useEffect(() => {
    if (!enabled || !storeId) {
      setBadges(EMPTY);
      return;
    }

    let cancelled = false;
    const load = async () => {
      const nowIso = new Date().toISOString();
      const [pending, active, overdue, reviews, maintenance] = await Promise.all([
        supabase.from("car_rental_reservations").select("id", { count: "exact", head: true })
          .eq("store_id", storeId).eq("status", "pending"),
        supabase.from("car_rental_reservations").select("id", { count: "exact", head: true })
          .eq("store_id", storeId).eq("status", "picked_up"),
        supabase.from("car_rental_reservations").select("id", { count: "exact", head: true })
          .eq("store_id", storeId).eq("status", "picked_up").lt("dropoff_at", nowIso),
        supabase.from("car_rental_reviews").select("id", { count: "exact", head: true })
          .eq("store_id", storeId).eq("is_acknowledged", false),
        supabase.from("car_rental_vehicles").select("id", { count: "exact", head: true })
          .eq("store_id", storeId).eq("status", "maintenance"),
      ]);
      if (cancelled) return;
      setBadges({
        reservationsPending: pending.count ?? 0,
        returnsActive: active.count ?? 0,
        returnsOverdue: overdue.count ?? 0,
        reviewsUnack: reviews.count ?? 0,
        maintenanceActive: maintenance.count ?? 0,
      });
    };

    void load();

    const channel = supabase
      .channel(`car-rental-badges:${storeId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "car_rental_reservations", filter: `store_id=eq.${storeId}` },
        () => { void load(); })
      .on("postgres_changes",
        { event: "*", schema: "public", table: "car_rental_reviews", filter: `store_id=eq.${storeId}` },
        () => { void load(); })
      .on("postgres_changes",
        { event: "*", schema: "public", table: "car_rental_vehicles", filter: `store_id=eq.${storeId}` },
        () => { void load(); })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [storeId, enabled]);

  return badges;
}
