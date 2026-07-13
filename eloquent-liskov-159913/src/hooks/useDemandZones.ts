/**
 * useDemandZones - Fetch real-time demand zones from Supabase
 */
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DemandZone {
  id: string;
  lat: number;
  lng: number;
  demandLevel: "low" | "medium" | "high";
  radiusMeters: number;
  ordersCount: number;
  driversCount: number;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useDemandZones(driverLat: number, driverLng: number, radiusMiles = 15, enabled = true) {
  const MILES_TO_DEGREES = 1 / 69;
  const boundingBox = useMemo(() => {
    const dLat = radiusMiles * MILES_TO_DEGREES;
    const dLng = radiusMiles * MILES_TO_DEGREES / Math.cos((driverLat * Math.PI) / 180);
    return { minLat: driverLat - dLat, maxLat: driverLat + dLat, minLng: driverLng - dLng, maxLng: driverLng + dLng };
  }, [driverLat, driverLng, radiusMiles]);

  const { data: zones = [], isLoading } = useQuery({
    queryKey: ["demand-zones", boundingBox.minLat, boundingBox.maxLat, boundingBox.minLng, boundingBox.maxLng],
    queryFn: async (): Promise<DemandZone[]> => {
      const { data, error } = await supabase
        .from("demand_zones")
        .select("*")
        .gte("latitude", boundingBox.minLat)
        .lte("latitude", boundingBox.maxLat)
        .gte("longitude", boundingBox.minLng)
        .lte("longitude", boundingBox.maxLng)
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []).map((z) => ({
        id: z.id,
        lat: Number(z.latitude),
        lng: Number(z.longitude),
        demandLevel: z.demand_level as "low" | "medium" | "high",
        radiusMeters: z.radius_meters || 500,
        ordersCount: z.orders_count || 0,
        driversCount: z.drivers_count || 0,
      }));
    },
    enabled,
    refetchInterval: 45000,
    staleTime: 30000,
  });

  const isInHighDemandZone = useMemo(() => {
    return zones.some(z => {
      if (z.demandLevel !== "high") return false;
      const dist = haversineDistance(driverLat, driverLng, z.lat, z.lng) * 1609.34;
      return dist <= z.radiusMeters;
    });
  }, [zones, driverLat, driverLng]);

  return { zones, isLoading, isInHighDemandZone };
}
