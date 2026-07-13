import { useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { airports } from "@/data/airports";
import { edgeFunctionFallback, isEdgeFunctionCircuitOpen, recordEdgeFunctionResult } from "@/utils/edgeFunctionFallback";

export interface SmartDeal {
  id: string;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  destinationKey: string;
  price: number;
  departureDate: string;
  returnDate: string | null;
  airline: string;
  airlineCode: string;
  airlineLogo: string | null;
  flightNumber: string;
  stops: number;
  duration: string;
  departureTime: string;
  arrivalTime: string;
  cabin: string;
  baggageIncluded: boolean;
  offersCount: number;
  aiDescription: string;
  aiTip: string;
  dealScore: number;
  dealTag: string;
  savingsPercent: number;
  category: 'beach' | 'city' | 'adventure' | 'culture' | 'nightlife' | 'family';
  fetchedAt: string;
  expiresAt: string;
}

export interface SmartDealsResponse {
  deals: SmartDeal[];
  generatedAt: string;
  totalRoutesSearched: number;
  totalDealsFound: number;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestAirport(lat: number, lng: number): string {
  const majorAirports = airports.filter(a => a.type === "international" && a.popularity >= 7);
  let nearest = "LAX";
  let minDist = Infinity;
  for (const ap of majorAirports) {
    const d = haversineDistance(lat, lng, ap.lat, ap.lng);
    if (d < minDist) { minDist = d; nearest = ap.code; }
  }
  return nearest;
}

export function useAISmartDeals(category?: string, autoDetectOrigin = false) {
  const [origin, setOrigin] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!autoDetectOrigin || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setOrigin(findNearestAirport(pos.coords.latitude, pos.coords.longitude)),
      () => setOrigin(undefined),
      { timeout: 5000 }
    );
  }, [autoDetectOrigin]);

  return useQuery({
    queryKey: ["ai-smart-deals", origin, category],
    queryFn: async (): Promise<SmartDealsResponse> => {
      if (isEdgeFunctionCircuitOpen("ai-smart-deals")) {
        return {
          deals: [],
          generatedAt: new Date().toISOString(),
          totalRoutesSearched: 0,
          totalDealsFound: 0,
        };
      }
      const { data, error } = await supabase.functions.invoke("ai-smart-deals", {
        body: { origin, category },
      });
      if (error) {
        return edgeFunctionFallback({
          functionName: "ai-smart-deals",
          error,
          fallback: {
            deals: [],
            generatedAt: new Date().toISOString(),
            totalRoutesSearched: 0,
            totalDealsFound: 0,
          },
          context: { origin, category },
        });
      }
      recordEdgeFunctionResult("ai-smart-deals", true);
      return {
        deals: (data?.deals || []) as SmartDeal[],
        generatedAt: data?.generatedAt || new Date().toISOString(),
        totalRoutesSearched: data?.totalRoutesSearched || 0,
        totalDealsFound: data?.totalDealsFound || 0,
      };
    },
    staleTime: 90 * 60 * 1000,
    gcTime: 3 * 60 * 60 * 1000,
    retry: 1,
    placeholderData: keepPreviousData,
  });
}
