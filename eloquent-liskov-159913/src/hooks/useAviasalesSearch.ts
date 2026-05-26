/**
 * useAviasalesSearch — Real-time multi-agency flight search via Aviasales Search API
 * Returns live OTA prices (Mytrip, Trip.com, etc.) for comparison
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AviasalesAgentPrice {
  agentId: string;
  agentName: string;
  price: number;
  currency: string;
}

export interface AviasalesFlightSegment {
  flights: Array<{
    carrier: string;
    operatingCarrier: string;
    number: string;
    departure: string;
    departureTime: string;
    arrival: string;
    arrivalTime: string;
    duration: number;
    aircraft: string;
  }>;
  stops: number;
  totalDuration: number;
}

export interface AviasalesResult {
  id: string;
  price: number;
  currency: string;
  agentId: string;
  agentName: string;
  proposalId: string;
  searchId: string;
  resultsUrl: string;
  airline: string;
  airlineCode: string;
  segments: AviasalesFlightSegment[];
  allPrices: AviasalesAgentPrice[];
}

export interface AviasalesSearchMeta {
  searchId: string;
  resultsUrl: string;
  totalProposals: number;
  agentCount: number;
  agents: Array<{ id: string; name: string }>;
  unavailableReason?: string;
}

const emptyAviasalesMeta: AviasalesSearchMeta = {
  searchId: "",
  resultsUrl: "",
  totalProposals: 0,
  agentCount: 0,
  agents: [],
};

const emptyAviasalesResponse = {
  results: [],
  meta: emptyAviasalesMeta,
};

interface UseAviasalesSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults?: number;
  children?: number;
  infants?: number;
  cabinClass?: string;
  enabled?: boolean;
}

export function useAviasalesSearch({
  origin,
  destination,
  departureDate,
  returnDate,
  adults = 1,
  children = 0,
  infants = 0,
  cabinClass = "economy",
  enabled = true,
}: UseAviasalesSearchParams) {
  return useQuery({
    queryKey: ["aviasales-search", origin, destination, departureDate, returnDate, adults, children, infants, cabinClass],
    queryFn: async (): Promise<{ results: AviasalesResult[]; meta: AviasalesSearchMeta }> => {
      try {
        const { data, error } = await supabase.functions.invoke("aviasales-search", {
          body: {
            origin,
            destination,
            depart_date: departureDate,
            return_date: returnDate,
            adults,
            children,
            infants,
            cabin_class: cabinClass,
          },
        });

        if (error) {
          console.warn("[AviasalesSearch] Fetch failed:", error.message);
          return emptyAviasalesResponse;
        }

        if (!data?.success) {
          console.warn("[AviasalesSearch] API error:", data?.error);
          return emptyAviasalesResponse;
        }

        return {
          results: data.data || [],
          meta: data.meta || emptyAviasalesMeta,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.warn("[AviasalesSearch] Request threw:", message);
        return emptyAviasalesResponse;
      }
    },
    enabled: enabled && !!origin && !!destination && !!departureDate,
    staleTime: 5 * 60 * 1000, // 5 min
    retry: 1,
    placeholderData: emptyAviasalesResponse,
  });
}

/**
 * Build a booking click URL for an Aviasales result
 */
export function buildAviasalesBookingUrl(result: AviasalesResult, agentId?: string): string {
  const agent = agentId || result.agentId;
  return `https://${result.resultsUrl}/searches/${result.searchId}/clicks/${result.proposalId}?gate_id=${agent}`;
}
