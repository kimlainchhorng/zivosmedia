/**
 * Fetches personalized "Trending Near You" recommendations
 * using the AI-powered get_trending_near_user RPC.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TrendingStore {
  store_id: string;
  store_name: string;
  category: string;
  logo_url: string | null;
  relevance_score: number;
  is_featured: boolean;
}

export function useTrendingNearYou(limit = 8) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trending-near-you", user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.rpc("get_trending_near_user", {
        p_user_id: user.id,
        p_limit: limit,
      });
      if (error) throw error;
      return (data as TrendingStore[]) || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
