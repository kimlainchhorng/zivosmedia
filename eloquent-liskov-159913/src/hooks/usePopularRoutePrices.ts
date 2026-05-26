import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PopularRoutePrice {
  origin_code: string;
  destination_code: string;
  origin_city: string;
  destination_city: string;
  lowest_price: number;
  currency: string;
  airline_name: string | null;
  airline_code: string | null;
}

/**
 * Fetches cached popular route prices.
 * Triggers a background refresh if cache is empty/expired.
 */
export function usePopularRoutePrices() {
  return useQuery({
    queryKey: ["popular-route-prices"],
    queryFn: async (): Promise<PopularRoutePrice[]> => {
      // 1. Read from cache
      const { data, error } = await supabase
        .from("popular_route_prices")
        .select("origin_code, destination_code, origin_city, destination_city, lowest_price, currency, airline_name, airline_code, expires_at")
        .gt("expires_at", new Date().toISOString());

      if (error) throw error;

      // 2. If cache is empty or stale, trigger background refresh
      if (!data || data.length === 0) {
        supabase.functions.invoke("refresh-popular-routes").catch(() => {});
        return [];
      }

      return data as PopularRoutePrice[];
    },
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 30 * 60 * 1000,
  });
}
