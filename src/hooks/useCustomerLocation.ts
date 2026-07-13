/**
 * useCustomerLocation - Subscribe to real-time customer location from Supabase
 * Used by drivers to see where the customer is during an active ride.
 */
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CustomerLocation {
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  updatedAt: string | null;
}

export function useCustomerLocation(tripId: string | null | undefined) {
  const [location, setLocation] = useState<CustomerLocation | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!tripId) {
      setLocation(null);
      setIsConnected(false);
      return;
    }

    // Initial fetch
    const fetchInitial = async () => {
      const { data } = await supabase
        .from("customer_locations")
        .select("lat, lng, heading, speed, updated_at")
        .eq("trip_id", tripId)
        .maybeSingle();

      if (data) {
        setLocation({
          lat: data.lat,
          lng: data.lng,
          heading: data.heading,
          speed: data.speed,
          updatedAt: data.updated_at,
        });
      }
    };

    fetchInitial();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`customer-location-${tripId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customer_locations",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (row?.lat != null && row?.lng != null) {
            setLocation({
              lat: row.lat,
              lng: row.lng,
              heading: row.heading ?? null,
              speed: row.speed ?? null,
              updatedAt: row.updated_at ?? null,
            });
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    // Poll fallback every 10s
    const pollInterval = setInterval(fetchInitial, 10000);

    return () => {
      clearInterval(pollInterval);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tripId]);

  return { location, isConnected };
}
