/**
 * useRecommendedDeals Hook
 * Fetches live travel deals from Supabase with filtering and sorting
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TravelDeal {
  id: string;
  title: string;
  description: string | null;
  category: string;
  origin: string | null;
  destination: string;
  destination_country: string | null;
  destination_flag: string | null;
  price_from: number | null;
  currency: string;
  discount_percent: number | null;
  deal_type: string;
  image_url: string | null;
  cta_url: string | null;
  expires_at: string | null;
  is_active: boolean;
  priority: number;
  search_count: number;
  created_at: string;
}

export type DealCategory = "all" | "flights" | "hotels" | "cars" | "packages";

export function useRecommendedDeals(category?: DealCategory, limit = 20) {
  return useQuery({
    queryKey: ["travel-deals", category, limit],
    queryFn: async (): Promise<TravelDeal[]> => {
      let query = supabase
        .from("travel_deals")
        .select("*")
        .eq("is_active", true)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);

      if (category && category !== "all") {
        query = query.eq("category", category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as TravelDeal[];
    },
  });
}

export function useFlashDeals(limit = 6) {
  return useQuery({
    queryKey: ["flash-deals", limit],
    queryFn: async (): Promise<TravelDeal[]> => {
      const { data, error } = await supabase
        .from("travel_deals")
        .select("*")
        .eq("is_active", true)
        .in("deal_type", ["flash", "last-minute"])
        .gt("expires_at", new Date().toISOString())
        .order("priority", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as unknown as TravelDeal[];
    },
  });
}
