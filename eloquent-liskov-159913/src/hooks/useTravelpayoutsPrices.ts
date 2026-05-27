/**
 * useTravelpayoutsPrices — Fetch comparison prices from Travelpayouts
 * Used alongside Duffel results for price comparison
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ENABLE_TRAVELPAYOUTS =
  (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_ENABLE_TRAVELPAYOUTS === "true";

export interface TravelpayoutsPrice {
  origin: string;
  destination: string;
  originAirport: string;
  destinationAirport: string;
  price: number;
  airline: string;
  flightNumber: string;
  departureAt: string;
  returnAt: string | null;
  transfers: number;
  duration: number; // total minutes
  durationTo: number;
  durationBack: number | null;
  link: string; // Aviasales deep link code
}

interface UseTravelpayoutsPricesParams {
  origin: string;
  destination: string;
  departureDate?: string;
  returnDate?: string;
  enabled?: boolean;
}

export function useTravelpayoutsPrices({
  origin,
  destination,
  departureDate,
  returnDate,
  enabled = true,
}: UseTravelpayoutsPricesParams) {
  return useQuery({
    queryKey: ["travelpayouts-prices", origin, destination, departureDate, returnDate],
    queryFn: async (): Promise<TravelpayoutsPrice[]> => {
      const { data, error } = await supabase.functions.invoke("travelpayouts-prices", {
        body: {
          origin,
          destination,
          depart_date: departureDate,
          return_date: returnDate,
          currency: "usd",
        },
      });

      if (error) {
        console.warn("[Travelpayouts] Fetch failed:", error.message);
        return [];
      }

      if (!data?.success) {
        console.warn("[Travelpayouts] API returned error:", data?.error);
        return [];
      }

      return data.data || [];
    },
    enabled: ENABLE_TRAVELPAYOUTS && enabled && !!origin && !!destination,
    staleTime: 10 * 60 * 1000, // 10 min cache
    retry: 1,
    // Don't block the UI — this is supplementary data
    placeholderData: [],
  });
}

/**
 * Find the best Travelpayouts price match for a given route
 */
export function findBestTravelpayoutsPrice(
  prices: TravelpayoutsPrice[],
  airlineCode?: string
): TravelpayoutsPrice | null {
  if (!prices.length) return null;

  // Try to match by airline first
  if (airlineCode) {
    const match = prices.find((p) => p.airline === airlineCode);
    if (match) return match;
  }

  // Otherwise return cheapest
  return prices.reduce((best, p) => (p.price < best.price ? p : best), prices[0]);
}
