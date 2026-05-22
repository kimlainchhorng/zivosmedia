/**
 * Scheduled Bookings — queries scheduled_bookings table from Supabase
 */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ScheduledBooking {
  id: string;
  bookingType: string;
  pickupAddress: string;
  destinationAddress: string | null;
  scheduledDate: string;
  scheduledTime: string;
  status: string;
  estimatedPrice: number | null;
  driverId: string | null;
  createdAt: string;
}

export function useScheduledBookings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["scheduled-bookings", user?.id];

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`scheduled-bookings-${user.id}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scheduled_bookings", filter: `user_id=eq.${user.id}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["scheduled-bookings", user.id] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<ScheduledBooking[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("scheduled_bookings")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["scheduled", "pending", "confirmed", "driver_assigned"])
        .order("scheduled_date", { ascending: true })
        .order("scheduled_time", { ascending: true })
        .limit(20);
      if (error) throw error;
      return (data || []).map(b => ({
        id: b.id,
        bookingType: b.booking_type,
        pickupAddress: b.pickup_address,
        destinationAddress: b.destination_address,
        scheduledDate: b.scheduled_date,
        scheduledTime: b.scheduled_time,
        status: b.status,
        estimatedPrice: b.estimated_price,
        driverId: b.driver_id,
        createdAt: b.created_at,
      }));
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  return {
    bookings: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useScheduledBookingsQuery(..._args: any[]) {
  const result = useScheduledBookings();
  return {
    data: result.bookings,
    isLoading: result.isLoading,
    error: result.error,
  };
}
