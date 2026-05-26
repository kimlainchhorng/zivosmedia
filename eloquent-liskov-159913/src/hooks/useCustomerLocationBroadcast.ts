/**
 * useCustomerLocationBroadcast - Broadcasts the customer's live GPS location
 * to Supabase customer_locations table while a ride is active.
 * Drivers with assigned trips can read this in real-time.
 */
import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface BroadcastOptions {
  /** Trip/job ID to associate with */
  tripId: string | null | undefined;
  /** Whether broadcasting is active */
  enabled?: boolean;
  /** Update interval in ms (default: 5000) */
  intervalMs?: number;
}

export function useCustomerLocationBroadcast({
  tripId,
  enabled = true,
  intervalMs = 5000,
}: BroadcastOptions) {
  const { user } = useAuth();
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPositionRef = useRef<GeolocationPosition | null>(null);

  const upsertLocation = useCallback(
    async (position: GeolocationPosition) => {
      if (!user?.id || !tripId) return;

      const { latitude: lat, longitude: lng, heading, speed } = position.coords;

      await supabase.from("customer_locations").upsert(
        {
          user_id: user.id,
          trip_id: tripId,
          lat,
          lng,
          heading: heading ?? null,
          speed: speed ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    },
    [user?.id, tripId]
  );

  useEffect(() => {
    if (!enabled || !user?.id || !tripId || !("geolocation" in navigator)) return;

    // Watch position changes
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        lastPositionRef.current = pos;
        upsertLocation(pos);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
    );

    // Also push on interval as fallback
    intervalRef.current = setInterval(() => {
      if (lastPositionRef.current) {
        upsertLocation(lastPositionRef.current);
      }
    }, intervalMs);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, user?.id, tripId, upsertLocation, intervalMs]);

  // Cleanup location on unmount
  useEffect(() => {
    return () => {
      if (user?.id) {
        supabase
          .from("customer_locations")
          .delete()
          .eq("user_id", user.id)
          .then(() => {});
      }
    };
  }, [user?.id]);
}
