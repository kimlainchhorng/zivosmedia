import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LodgeReservationCharge {
  id: string;
  store_id: string;
  reservation_id: string;
  label?: string | null;
  description?: string | null;
  charge_type?: string | null;
  category?: string | null;
  amount_cents: number;
  quantity?: number | null;
  created_at: string;
}

export function useLodgeReservationCharges(reservationId?: string) {
  return useQuery({
    queryKey: ["lodge-reservation-charges", reservationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lodge_reservation_charges" as any)
        .select("*")
        .eq("reservation_id", reservationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as LodgeReservationCharge[];
    },
    enabled: !!reservationId,
  });
}
