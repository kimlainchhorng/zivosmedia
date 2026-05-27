/** Order details — reads from food_orders + restaurant info */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOrderDetails(orderId?: string) {
  const query = useQuery({
    queryKey: ["order-details", orderId],
    queryFn: async () => {
      if (!orderId) return null;
      // Use any to avoid strict type checking on joined fields
      const { data, error } = await (supabase as any)
        .from("food_orders")
        .select("*, restaurants(name, logo_url, address)")
        .eq("id", orderId)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!orderId,
  });

  return {
    order: query.data,
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
