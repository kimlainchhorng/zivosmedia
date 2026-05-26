/**
 * useGeofenceNotifications — Checks if user is near a Boosted shop
 * and sends a local push notification about their deals.
 * Runs periodically when the app is active.
 */
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const GEOFENCE_RADIUS_M = 500;
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useGeofenceNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const checkNearby = async () => {
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;

          try {
            // Get boosted stores with location
            const { data: stores } = await (supabase as any)
              .from("store_profiles")
              .select("id, name, latitude, longitude, category")
              .eq("is_active", true);

            if (!stores?.length) return;

            // Check which are featured (boosted)
            for (const store of stores) {
              if (!store.latitude || !store.longitude) continue;
              if (notifiedRef.current.has(store.id)) continue;

              const dist = haversineDistance(latitude, longitude, store.latitude, store.longitude);
              if (dist <= GEOFENCE_RADIUS_M) {
                // Check if boosted
                const { data: boost } = await (supabase as any)
                  .from("merchant_boosts")
                  .select("id")
                  .eq("store_id", store.id)
                  .eq("status", "active")
                  .gt("featured_until", new Date().toISOString())
                  .limit(1)
                  .maybeSingle();

                if (boost) {
                  notifiedRef.current.add(store.id);
                  const mins = Math.ceil(dist / 80); // ~walking speed
                  toast(`🔥 Hot Deal at ${store.name} — Just ${mins} min away!`, {
                    duration: 8000,
                    action: { label: "View on Map", onClick: () => navigate("/store-map") },
                  });
                }
              }
            }
          } catch {
            // Silent fail for background task
          }
        },
        () => {}, // geo error - silent
        { enableHighAccuracy: false, timeout: 10000 }
      );
    };

    checkNearby();
    const interval = setInterval(checkNearby, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user]);
}
