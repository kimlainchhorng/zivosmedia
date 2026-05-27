/** Car rental settings — reads from car_rental_settings table */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCarRentalSettings() {
  const query = useQuery({
    queryKey: ["car-rental-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("car_rental_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });

  return {
    settings: query.data,
    data: query.data,
    isLoading: query.isLoading,
  };
}
