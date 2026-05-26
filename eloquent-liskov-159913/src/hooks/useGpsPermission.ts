/**
 * useGpsPermission — Reusable GPS permission request hook
 * Returns permission state + request handler
 * Works on iOS/Android (Capacitor) and Web
 */
import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";

export type GpsPermissionState = "checking" | "prompt" | "granted" | "denied";

export function useGpsPermission() {
  const [permission, setPermission] = useState<GpsPermissionState>("checking");
  const { getCurrentLocation, isGettingLocation } = useCurrentLocation();

  // Check initial permission state
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // On native, try to get a position to determine permission
      navigator.geolocation.getCurrentPosition(
        () => setPermission("granted"),
        (err) => {
          if (err.code === err.PERMISSION_DENIED) setPermission("prompt");
          else setPermission("prompt");
        },
        { timeout: 3000 }
      );
      return;
    }

    // Web: use Permissions API
    if ("permissions" in navigator) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((result) => {
          if (result.state === "granted") setPermission("granted");
          else if (result.state === "denied") setPermission("denied");
          else setPermission("prompt");

          result.onchange = () => {
            if (result.state === "granted") setPermission("granted");
            else if (result.state === "denied") setPermission("denied");
          };
        })
        .catch(() => setPermission("prompt"));
    } else {
      setPermission("prompt");
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    setPermission("checking");
    try {
      const loc = await getCurrentLocation();
      setPermission("granted");
      return { lat: loc.lat, lng: loc.lng };
    } catch {
      setPermission("denied");
      return null;
    }
  }, [getCurrentLocation]);

  const skipPermission = useCallback(() => {
    setPermission("denied");
  }, []);

  return {
    permission,
    setPermission,
    requestPermission,
    skipPermission,
    isGettingLocation,
  };
}
