import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PriceLevel = "low" | "mid" | "high";

export interface FareCalendarData {
  /** Map of "YYYY-MM-DD" → { level, price } */
  fares: Record<string, { level: PriceLevel; price: number }>;
  isLoading: boolean;
  hasData: boolean;
}

/**
 * Fetches real fare levels from Duffel for a given route + month.
 * Samples 5 dates and interpolates the rest.
 * Cached for 6 hours server-side + React Query staleTime.
 */
export function useFareCalendar(
  origin: string | undefined,
  destination: string | undefined,
  year: number,
  month: number, // 0-indexed (JS Date style)
  cabinClass: string = "economy"
): FareCalendarData {
  const enabled = !!origin && !!destination && origin.length === 3 && destination.length === 3;

  const { data, isLoading } = useQuery({
    queryKey: ["fare-calendar", origin, destination, year, month, cabinClass],
    queryFn: async () => {
      const { data: result, error } = await supabase.functions.invoke(
        "duffel-fare-calendar",
        {
          body: { origin, destination, year, month, cabinClass },
        }
      );

      if (error) {
        console.warn("[FareCalendar] Edge function error:", error);
        return { fares: {} };
      }

      return result as { fares: Record<string, { level: PriceLevel; price: number }> };
    },
    enabled,
    staleTime: 30 * 60 * 1000, // 30 min client cache
    gcTime: 60 * 60 * 1000, // 1 hour gc
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return {
    fares: data?.fares || {},
    isLoading: enabled && isLoading,
    hasData: !!data && Object.keys(data.fares || {}).length > 0,
  };
}
