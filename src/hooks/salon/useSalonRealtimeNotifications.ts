/**
 * Listens for new public booking requests on the realtime channel and pops a
 * toast for each one. Tracks the "seen" set so historic rows don't trigger
 * notifications on mount. Used by the StoreOwnerLayout so owners get pinged
 * anywhere in the admin, not just on the Bookings tab.
 */
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BookingRow {
  id: string;
  client_name: string;
  service_name: string;
  source: string;
  status: string;
}

export function useSalonRealtimeNotifications(storeId: string | undefined, isSalon: boolean) {
  const seenRef = useRef<Set<string>>(new Set());
  const primedRef = useRef(false);

  // Prime the set on mount so existing pending rows don't trigger toasts.
  useEffect(() => {
    if (!storeId || !isSalon) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("salon_bookings")
        .select("id")
        .eq("store_id", storeId)
        .eq("status", "pending")
        .eq("source", "app");
      if (cancelled) return;
      for (const r of data ?? []) seenRef.current.add((r as any).id);
      primedRef.current = true;
    })();
    return () => { cancelled = true; };
  }, [storeId, isSalon]);

  useEffect(() => {
    if (!storeId || !isSalon) return;
    const channel = supabase
      .channel(`salon-notifications:${storeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "salon_bookings", filter: `store_id=eq.${storeId}` },
        (payload) => {
          const row = payload.new as Partial<BookingRow> | null;
          if (!row?.id) return;
          if (!primedRef.current) {
            // Eat the event but mark it as seen so we don't double-toast later.
            seenRef.current.add(row.id);
            return;
          }
          if (row.status !== "pending" || row.source !== "app") return;
          if (seenRef.current.has(row.id)) return;
          seenRef.current.add(row.id);
          toast.info(`New booking request: ${row.client_name}`, {
            description: row.service_name,
            duration: 8000,
          });
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [storeId, isSalon]);
}
