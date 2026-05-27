/**
 * useLiveActivityCount — counts how many things are "live" for the user
 * across rides, food orders, and upcoming flights/hotels.
 *
 * Subscribes to Supabase realtime channels for `trips`, `food_orders`,
 * `flight_bookings`, and `hotel_bookings` so the count updates the moment a
 * driver accepts, an order changes status, or a booking is added — no
 * polling lag. A 5-minute heartbeat keeps the count fresh in case a realtime
 * event was dropped (e.g. on app resume).
 *
 * Used by the bottom nav and AppMore tab to show a red dot / count badge.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface LiveActivity {
  rides: number;
  orders: number;
  upcoming: number;
  total: number;
}

const ZERO: LiveActivity = { rides: 0, orders: 0, upcoming: 0, total: 0 };

const HEARTBEAT_MS = 5 * 60_000;

export function useLiveActivityCount(): LiveActivity {
  const { user } = useAuth();
  const [state, setState] = useState<LiveActivity>(ZERO);

  useEffect(() => {
    const pathname = typeof window !== "undefined" ? window.location.pathname : "";
    const isPublicStoreSurface = /^\/(grocery\/shop|store)\//.test(pathname);
    if (isPublicStoreSurface) {
      setState(ZERO);
      return;
    }

    if (!user?.id) {
      setState(ZERO);
      return;
    }
    let cancelled = false;
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const refetch = async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user?.id) {
        if (!cancelled) setState(ZERO);
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      const fetchCount = async (request: Promise<{ count: number | null; error?: unknown }>) => {
        try {
          const { count, error } = await request;
          if (error) return 0;
          return count ?? 0;
        } catch {
          return 0;
        }
      };
      const [rides, orders, flights, hotels] = await Promise.all([
        fetchCount((supabase as any)
          .from("trips")
          .select("id", { count: "exact", head: false })
          .eq("rider_id", user.id)
          .in("status", ["accepted", "en_route", "arriving", "in_progress"])),
        fetchCount((supabase as any)
          .from("food_orders")
          .select("id", { count: "exact", head: false })
          .eq("customer_id", user.id)
          .in("status", ["confirmed", "preparing", "ready", "out_for_delivery"])),
        fetchCount((supabase as any)
          .from("flight_bookings")
          .select("id", { count: "exact", head: false })
          .eq("customer_id", user.id)
          .gte("departure_date", today)),
        fetchCount((supabase as any)
          .from("hotel_bookings")
          .select("id", { count: "exact", head: false })
          .eq("customer_id", user.id)
          .gte("check_in_date", today)),
      ]);

      if (cancelled) return;
      const upcoming = flights + hotels;
      setState({ rides, orders, upcoming, total: rides + orders + upcoming });
    };

    refetch().catch(() => {});

    const channel = supabase
      .channel(`live-activity:${user.id}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "trips", filter: `rider_id=eq.${user.id}` }, () => refetch().catch(() => {}))
      .on("postgres_changes", { event: "*", schema: "public", table: "food_orders", filter: `customer_id=eq.${user.id}` }, () => refetch().catch(() => {}))
      .on("postgres_changes", { event: "*", schema: "public", table: "flight_bookings", filter: `customer_id=eq.${user.id}` }, () => refetch().catch(() => {}))
      .on("postgres_changes", { event: "*", schema: "public", table: "hotel_bookings", filter: `customer_id=eq.${user.id}` }, () => refetch().catch(() => {}))
      .subscribe();

    heartbeat = setInterval(() => refetch().catch(() => {}), HEARTBEAT_MS);

    return () => {
      cancelled = true;
      if (heartbeat) clearInterval(heartbeat);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return state;
}
