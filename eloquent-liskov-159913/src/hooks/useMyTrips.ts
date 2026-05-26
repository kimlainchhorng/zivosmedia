/**
 * useMyTrips Hook
 * Fetches travel orders with filtering by status
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type TripFilter = "upcoming" | "past" | "cancelled" | "all";

export interface TravelOrderItem {
  id: string;
  type: "hotel" | "activity" | "transfer";
  provider: string;
  provider_reference: string | null;
  title: string;
  start_date: string;
  end_date: string | null;
  adults: number;
  children: number;
  quantity: number;
  price: number;
  meta: Record<string, unknown>;
  status: string;
  cancellation_policy: string | null;
  cancellable: boolean;
  cancellation_deadline: string | null;
  supplier_status: string;
  created_at: string;
}

export interface TravelPayment {
  id: string;
  provider: string;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

export interface TravelOrder {
  id: string;
  user_id: string | null;
  order_number: string;
  currency: string;
  subtotal: number;
  taxes: number;
  fees: number;
  total: number;
  status: string;
  provider: string;
  holder_name: string;
  holder_email: string;
  holder_phone: string | null;
  cancellation_status: string;
  cancellation_reason: string | null;
  cancellation_requested_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  travel_order_items: TravelOrderItem[];
  travel_payments: TravelPayment[];
}

export function useMyTrips(filter: TripFilter = "all") {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-trips", user?.id, filter],
    queryFn: async (): Promise<TravelOrder[]> => {
      const { data, error } = await supabase
        .from("travel_orders")
        .select(`
          *,
          travel_order_items (*),
          travel_payments (*)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching trips:", error);
        throw error;
      }

      const orders = (data || []) as unknown as TravelOrder[];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Filter based on status
      return orders.filter((order) => {
        // Get earliest start date from items
        const startDates = order.travel_order_items
          .map((item) => new Date(item.start_date))
          .filter((d) => !isNaN(d.getTime()));
        
        const earliestDate = startDates.length > 0
          ? new Date(Math.min(...startDates.map((d) => d.getTime())))
          : null;

        switch (filter) {
          case "upcoming":
            return (
              earliestDate &&
              earliestDate >= today &&
              order.status !== "cancelled" &&
              order.status !== "refunded"
            );
          case "past":
            return (
              earliestDate &&
              earliestDate < today &&
              order.status === "confirmed"
            );
          case "cancelled":
            return (
              order.status === "cancelled" ||
              order.status === "refunded" ||
              order.cancellation_status === "requested"
            );
          case "all":
          default:
            return true;
        }
      });
    },
    enabled: !!user,
  });
}

export function useTripDetails(orderNumber: string | undefined) {
  return useQuery({
    queryKey: ["trip-details", orderNumber],
    queryFn: async (): Promise<TravelOrder | null> => {
      if (!orderNumber) return null;

      const { data, error } = await supabase
        .from("travel_orders")
        .select(`
          *,
          travel_order_items (*),
          travel_payments (*)
        `)
        .eq("order_number", orderNumber)
        .single();

      if (error) {
        console.error("Error fetching trip details:", error);
        throw error;
      }

      return data as unknown as TravelOrder;
    },
    enabled: !!orderNumber,
  });
}
