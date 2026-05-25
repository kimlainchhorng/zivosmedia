/**
 * Toast popups for incoming car-rental activity:
 *  - New 'pending' reservations (source = 'app')
 *  - New reviews
 *
 * One channel per store; cleans up on unmount.
 */
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function useCarRentalRealtimeNotifications(storeId: string | undefined, enabled: boolean) {
  // Suppress duplicate notifications when the subscription replays on reconnect.
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !storeId) return;
    const seen = seenRef.current;

    const channel = supabase
      .channel(`car-rental-notif:${storeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "car_rental_reservations", filter: `store_id=eq.${storeId}` },
        (payload) => {
          const row: any = payload.new;
          if (seen.has(`res-${row.id}`)) return;
          seen.add(`res-${row.id}`);
          if (row.source === "app") {
            toast.success("New online booking", {
              description: `${row.customer_name} · ${row.vehicle_label}`,
              duration: 8000,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "car_rental_reviews", filter: `store_id=eq.${storeId}` },
        (payload) => {
          const row: any = payload.new;
          if (seen.has(`rev-${row.id}`)) return;
          seen.add(`rev-${row.id}`);
          toast.message(`New ${row.rating}-star review`, {
            description: row.customer_name + (row.comment ? ` — "${String(row.comment).slice(0, 80)}"` : ""),
            duration: 8000,
          });
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [storeId, enabled]);
}
