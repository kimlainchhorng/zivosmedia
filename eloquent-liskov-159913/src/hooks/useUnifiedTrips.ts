/**
 * Unified Trips Hook
 * Aggregates bookings across all ZIVO services including travel orders
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

export type ServiceType = "flights" | "cars" | "p2p_cars" | "rides" | "eats" | "move" | "hotels" | "activities" | "transfers";

export interface UnifiedTrip {
  id: string;
  service: ServiceType;
  title: string;
  subtitle: string;
  status: string;
  date: string;
  amount: number;
  currency: string;
  icon: string;
  details: Record<string, unknown>;
  orderNumber?: string;
  detailPath?: string;
}

export interface TripsFilter {
  services?: ServiceType[];
  status?: "upcoming" | "active" | "completed" | "cancelled" | "all";
  limit?: number;
}

export function useUnifiedTrips(filter: TripsFilter = {}) {
  const { user } = useAuth();
  const { services, status = "all", limit = 50 } = filter;

  return useQuery({
    queryKey: ["unified-trips", user?.id, services, status, limit],
    queryFn: async () => {
      const trips: UnifiedTrip[] = [];

      // Fetch Travel Orders (Hotels, Activities, Transfers)
      if (!services || services.includes("hotels") || services.includes("activities") || services.includes("transfers")) {
        const { data } = await supabase
          .from("travel_orders")
          .select(`
            id, order_number, status, total, currency, created_at,
            cancellation_status,
            travel_order_items (id, type, title, start_date, end_date, price)
          `)
          .order("created_at", { ascending: false })
          .limit(limit);

        (data || []).forEach((order: any) => {
          const items = order.travel_order_items || [];
          
          // Get earliest start date
          const startDates = items
            .map((item: any) => new Date(item.start_date))
            .filter((d: Date) => !isNaN(d.getTime()));
          const earliestDate = startDates.length > 0
            ? new Date(Math.min(...startDates.map((d: Date) => d.getTime())))
            : new Date(order.created_at);

          // Determine primary type and icon
          const types = [...new Set(items.map((item: any) => item.type))] as string[];
          const primaryType = types[0] || "hotels";
          const icon = primaryType === "hotel" ? "building-2" : primaryType === "activity" ? "target" : primaryType === "flight" ? "plane" : primaryType === "transfer" ? "car" : "plane";

          // Build subtitle from items
          const itemTitles = items.slice(0, 2).map((item: any) => item.title).join(", ");
          const subtitle = items.length > 2 
            ? `${itemTitles} +${items.length - 2} more`
            : itemTitles || "Travel booking";

          // Determine display status
          const displayStatus = order.cancellation_status !== "none" 
            ? `cancel_${order.cancellation_status}` 
            : order.status;

          trips.push({
            id: order.id,
            service: primaryType === "hotel" ? "hotels" : primaryType === "activity" ? "activities" : primaryType === "flight" ? "flights" : "transfers",
            title: `Travel Order ${order.order_number}`,
            subtitle,
            status: displayStatus,
            date: earliestDate.toISOString(),
            amount: Number(order.total),
            currency: order.currency || "USD",
            icon,
            details: { order, items },
            orderNumber: order.order_number,
            detailPath: `/my-trips/${order.order_number}`,
          });
        });
      }

      // Fetch P2P Car Rentals
      if (!services || services.includes("p2p_cars")) {
        const { data } = await supabase
          .from("p2p_bookings")
          .select("id, status, pickup_date, return_date, total_amount")
          .eq("renter_id", user!.id)
          .order("pickup_date", { ascending: false })
          .limit(limit);

        (data || []).forEach((b: any) => {
          trips.push({
            id: b.id,
            service: "p2p_cars",
            title: "Car Rental",
            subtitle: `${format(new Date(b.pickup_date), "MMM d")} - ${format(new Date(b.return_date), "MMM d")}`,
            status: b.status || "pending",
            date: b.pickup_date,
            amount: Number(b.total_amount),
            currency: "USD",
            icon: "car-front",
            details: { booking: b },
            orderNumber: b.id,
            detailPath: `/my-trips/cars/${b.id}`,
          });
        });
      }

      // Fetch Ride bookings (jobs table)
      if (!services || services.includes("rides")) {
        const { data } = await (supabase as any)
          .from("jobs")
          .select("id, status, created_at, pickup_address, dropoff_address, estimated_fare, job_type")
          .eq("customer_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(limit);

        (data || []).forEach((t: any) => {
          trips.push({
            id: t.id,
            service: "rides",
            title: "ZIVO Ride",
            subtitle: `${t.pickup_address?.split(",")[0] || "Pickup"} → ${t.dropoff_address?.split(",")[0] || "Dropoff"}`,
            status: t.status,
            date: t.created_at,
            amount: Number(t.estimated_fare) || 0,
            currency: "USD",
            icon: "car-taxi-front",
            details: { trip: t },
            orderNumber: t.id,
            detailPath: `/trip-status/${t.id}`,
          });
        });
      }

      // Fetch Food orders
      if (!services || services.includes("eats")) {
        const { data } = await (supabase as any)
          .from("food_orders")
          .select("id, status, created_at, total_amount")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(limit);

        (data || []).forEach((o: any) => {
          trips.push({
            id: o.id,
            service: "eats",
            title: "Food Order",
            subtitle: format(new Date(o.created_at), "MMM d, h:mm a"),
            status: o.status,
            date: o.created_at,
            amount: Number(o.total_amount) || 0,
            currency: "USD",
            icon: "utensils-crossed",
            details: { order: o },
            orderNumber: o.id,
            detailPath: `/grocery/track/${o.id}`,
          });
        });
      }

      // Fetch Car Rental bookings
      if (!services || services.includes("cars")) {
        const { data } = await supabase
          .from("car_rentals")
          .select("id, status, pickup_date, return_date, total_amount")
          .eq("customer_id", user!.id)
          .order("pickup_date", { ascending: false })
          .limit(limit);

        (data || []).forEach((r: any) => {
          trips.push({
            id: r.id,
            service: "cars",
            title: "Car Rental",
            subtitle: `${format(new Date(r.pickup_date), "MMM d")} - ${format(new Date(r.return_date), "MMM d")}`,
            status: r.status || "confirmed",
            date: r.pickup_date,
            amount: Number(r.total_amount),
            currency: "USD",
            icon: "car",
            details: { rental: r },
            orderNumber: r.id,
            detailPath: `/my-trips/cars/${r.id}`,
          });
        });
      }

      // Fetch Move jobs
      if (!services || services.includes("move")) {
        const { data } = await (supabase as any)
          .from("jobs")
          .select("id, status, created_at, pickup_address, dropoff_address, estimated_fare, job_type")
          .eq("customer_id", user!.id)
          .eq("job_type", "move")
          .order("created_at", { ascending: false })
          .limit(limit);

        (data || []).forEach((m: any) => {
          trips.push({
            id: m.id,
            service: "move",
            title: "ZIVO Move",
            subtitle: `${m.pickup_address?.split(",")[0] || "Pickup"} → ${m.dropoff_address?.split(",")[0] || "Dropoff"}`,
            status: m.status,
            date: m.created_at,
            amount: Number(m.estimated_fare) || 0,
            currency: "USD",
            icon: "package",
            details: { trip: m },
            orderNumber: m.id,
            detailPath: `/trip-status/${m.id}`,
          });
        });
      }

      // Filter by status
      let filtered = trips;
      if (status !== "all") {
        const statusMap: Record<string, string[]> = {
          upcoming: ["pending", "confirmed", "approved", "scheduled", "draft", "pending_payment"],
          active: ["in_progress", "active", "picked_up", "en_route"],
          completed: ["completed", "delivered", "returned"],
          cancelled: ["cancelled", "rejected", "failed", "refunded", "cancel_requested", "cancel_approved", "cancel_processed"],
        };
        const validStatuses = statusMap[status] || [];
        filtered = trips.filter((t) => validStatuses.includes(t.status));
      }

      return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    enabled: !!user,
  });
}

export function useRecentActivity() {
  return useUnifiedTrips({ limit: 5 });
}

export function useUpcomingTrips() {
  return useUnifiedTrips({ status: "upcoming", limit: 10 });
}

export function useActiveTrips() {
  return useUnifiedTrips({ status: "active", limit: 10 });
}
