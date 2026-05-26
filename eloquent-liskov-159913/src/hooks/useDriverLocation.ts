/**
 * useDriverLocation - Subscribe to real-time driver location from Supabase
 * Uses driver_locations table with postgres_changes realtime channel
 */
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DriverLocation {
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  updatedAt: string | null;
}

export function useDriverLocation(driverId: string | null | undefined) {
  const [location, setLocation] = useState<DriverLocation | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!driverId) {
      setLocation(null);
      setIsConnected(false);
      return;
    }

    // Initial fetch
    const fetchInitial = async () => {
      const { data } = await supabase
        .from("driver_locations")
        .select("lat, lng, heading, speed, updated_at")
        .eq("driver_id", driverId)
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
      .channel(`driver-location-${driverId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "driver_locations",
          filter: `driver_id=eq.${driverId}`,
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

    // Also poll as fallback every 10s
    const pollInterval = setInterval(fetchInitial, 10000);

    return () => {
      clearInterval(pollInterval);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [driverId]);

  return { location, isConnected };
}
