/**
 * Hook to fetch Duffel seat maps for an offer
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SeatService {
  id: string;
  passenger_id: string;
  price: number;
  currency: string;
}

export interface SeatElement {
  type: string; // 'seat' | 'bassinet' | 'empty' | 'exit_row' | 'lavatory' | 'galley'
  designator: string | null;
  name: string | null;
  disclosures: string[];
  available_services: SeatService[];
  is_available: boolean;
}

export interface SeatSection {
  elements: SeatElement[];
}

export interface SeatRow {
  rowNumber: number;
  sections: SeatSection[];
}

export interface SeatCabin {
  cabin_class: string;
  deck: number;
  wings: { first_row_index: number; last_row_index: number };
  rows: SeatRow[];
}

export interface SeatMap {
  id: string;
  slice_id: string;
  segment_id: string;
  cabins: SeatCabin[];
}

export interface SeatMapsResponse {
  seat_maps: SeatMap[];
  available: boolean;
}

export function useDuffelSeatMaps(offerId: string | null, enabled = true) {
  return useQuery<SeatMapsResponse>({
    queryKey: ["duffel-seat-maps", offerId],
    queryFn: async () => {
      if (!offerId) throw new Error("No offer ID");
      const { data, error } = await supabase.functions.invoke("duffel-flights", {
        body: { action: "getSeatMaps", offer_id: offerId },
      });
      if (error) throw new Error(error.message || "Failed to fetch seat maps");
      if (data?.error) throw new Error(data.error);
      return data as SeatMapsResponse;
    },
    enabled: !!offerId && enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
