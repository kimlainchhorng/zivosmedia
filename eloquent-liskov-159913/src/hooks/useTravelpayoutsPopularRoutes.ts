/**
 * useTravelpayoutsPopularRoutes — Fetches live prices for popular routes
 * from Travelpayouts API. Returns real prices, dates, and airline data.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ENABLE_TRAVELPAYOUTS =
  (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_ENABLE_TRAVELPAYOUTS === "true";

export interface TravelpayoutsRoutePrice {
  origin: string;
  destination: string;
  price: number;
  airline: string;
  departureAt: string;
  returnAt: string | null;
  transfers: number;
  duration: number; // minutes
  link: string;
}

type TravelpayoutsPriceRow = {
  origin?: string;
  destination?: string;
  price: number;
  airline?: string;
  departureAt?: string;
  returnAt?: string | null;
  transfers?: number;
  duration?: number;
  link?: string;
};

const POPULAR_ROUTES = [
  { origin: "JFK", destination: "MIA" },
  { origin: "LAX", destination: "SFO" },
  { origin: "ORD", destination: "ATL" },
  { origin: "DFW", destination: "DEN" },
  { origin: "SEA", destination: "LAS" },
  { origin: "BOS", destination: "FLL" },
];

export function useTravelpayoutsPopularRoutes() {
  return useQuery({
    queryKey: ["tp-popular-routes"],
    queryFn: async (): Promise<TravelpayoutsRoutePrice[]> => {
      // Fetch all routes in parallel
      const results = await Promise.allSettled(
        POPULAR_ROUTES.map(async (route) => {
          const { data, error } = await supabase.functions.invoke(
            "travelpayouts-prices",
            {
              body: {
                origin: route.origin,
                destination: route.destination,
                currency: "usd",
              },
            }
          );

          if (error || !data?.success || !data.data?.length) {
            return null;
          }

          // Return the cheapest option
          const prices = data.data as TravelpayoutsPriceRow[];
          const cheapest = prices.reduce(
            (best, p) => (p.price < best.price ? p : best),
            prices[0]
          );

          return {
            origin: cheapest.origin || route.origin,
            destination: cheapest.destination || route.destination,
            price: cheapest.price,
            airline: cheapest.airline || "",
            departureAt: cheapest.departureAt || "",
            returnAt: cheapest.returnAt || null,
            transfers: cheapest.transfers ?? 0,
            duration: cheapest.duration ?? 0,
            link: cheapest.link || "",
          } as TravelpayoutsRoutePrice;
        })
      );

      return results
        .filter(
          (r): r is PromiseFulfilledResult<TravelpayoutsRoutePrice | null> =>
            r.status === "fulfilled"
        )
        .map((r) => r.value)
        .filter((v): v is TravelpayoutsRoutePrice => v !== null);
    },
    enabled: ENABLE_TRAVELPAYOUTS,
    staleTime: 15 * 60 * 1000, // 15 min cache
    gcTime: 60 * 60 * 1000,
    retry: 1,
    placeholderData: [],
  });
}
