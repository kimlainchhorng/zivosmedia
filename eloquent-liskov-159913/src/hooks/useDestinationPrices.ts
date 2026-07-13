import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { airports } from "@/data/airports";
import { edgeFunctionFallback, isEdgeFunctionCircuitOpen, recordEdgeFunctionResult } from "@/utils/edgeFunctionFallback";

/**
 * Fetches real lowest flight fares from Duffel API for popular destinations.
 * Auto-detects the user's nearest major airport via geolocation.
 */

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestAirport(lat: number, lng: number): string {
  // Only consider international airports with decent popularity
  const majorAirports = airports.filter(a => a.type === "international" && a.popularity >= 7);
  let nearest = "LAX";
  let minDist = Infinity;
  for (const ap of majorAirports) {
    const d = haversineDistance(lat, lng, ap.lat, ap.lng);
    if (d < minDist) {
      minDist = d;
      nearest = ap.code;
    }
  }
  return nearest;
}

export function useDestinationPrices(destinations: string[], isKH: boolean, autoDetectOrigin = false) {
  const [origin, setOrigin] = useState<string>(isKH ? "PNH" : "LAX");

  // Auto-detect nearest airport only when explicitly enabled
  useEffect(() => {
    if (isKH) {
      setOrigin("PNH");
      return;
    }
    if (!autoDetectOrigin || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nearest = findNearestAirport(pos.coords.latitude, pos.coords.longitude);
        setOrigin(nearest);
      },
      () => {
        setOrigin("LAX");
      },
      { timeout: 5000 }
    );
  }, [isKH, autoDetectOrigin]);

  return useQuery({
    queryKey: ["destination-prices", origin, destinations],
    queryFn: async () => {
      if (isEdgeFunctionCircuitOpen("duffel-destination-prices")) {
        return {} as Record<string, number | null>;
      }
      const { data, error } = await supabase.functions.invoke("duffel-destination-prices", {
        body: { origin, destinations },
      });

      if (error) {
        return edgeFunctionFallback({
          functionName: "duffel-destination-prices",
          error,
          fallback: {} as Record<string, number | null>,
          context: { origin, destinationCount: destinations.length },
        });
      }

      recordEdgeFunctionResult("duffel-destination-prices", true);
      return (data?.prices || {}) as Record<string, number | null>;
    },
    staleTime: 6 * 60 * 60 * 1000, // 6 hours
    gcTime: 12 * 60 * 60 * 1000,
    retry: 1,
    enabled: destinations.length > 0,
  });
}
