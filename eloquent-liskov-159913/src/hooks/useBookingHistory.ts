/**
 * useBookingHistory Hook
 * Fetches travel booking history for the current user
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TravelBooking {
  id: string;
  user_id: string;
  email: string;
  service_type: string;
  status: string;
  partner_booking_ref: string | null;
  partner_redirect_url: string | null;
  traveler_info: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export function useBookingHistory() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["booking-history", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("travel_bookings")
        .select("id, user_id, email, service_type, status, partner_booking_ref, partner_redirect_url, traveler_info, created_at, updated_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as TravelBooking[];
    },
  });

  return {
    bookings: query.data || [],
    isLoading: query.isLoading,
  };
}
