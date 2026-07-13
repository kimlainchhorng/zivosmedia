import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TripStatus = "requested" | "accepted" | "en_route" | "arrived" | "in_progress" | "completed" | "cancelled";

export type Trip = {
  id: string;
  rider_id: string | null;
  driver_id: string | null;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  distance_km: number | null;
  duration_minutes: number | null;
  fare_amount: number | null;
  status: TripStatus | null;
  payment_status: string | null;
  rating: number | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  // Joined data
  driver?: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
  rider?: {
    full_name: string;
    email: string;
  } | null;
};

export const useTrips = () => {
  return useQuery({
    queryKey: ["trips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select(`
          *,
          driver:drivers(full_name, email, avatar_url)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Trip[];
    },
  });
};

// Admin hook - fetches all trips regardless of rider_id
export interface UseAdminTripsOptions {
  statusFilter?: TripStatus | "all";
  regionId?: string | null;
}

export const useAdminTrips = (statusFilterOrOptions?: TripStatus | "all" | UseAdminTripsOptions, regionId?: string | null) => {
  // Handle both old API (statusFilter as first param) and new API (options object)
  let options: UseAdminTripsOptions;
  if (typeof statusFilterOrOptions === 'object' && statusFilterOrOptions !== null && !Array.isArray(statusFilterOrOptions)) {
    options = statusFilterOrOptions;
  } else {
    options = { statusFilter: statusFilterOrOptions as TripStatus | "all", regionId };
  }

  return useQuery({
    queryKey: ["admin-trips", options.statusFilter, options.regionId],
    queryFn: async () => {
      let query = supabase
        .from("trips")
        .select(`
          *,
          driver:drivers(full_name, email, avatar_url),
          regions(id, name, city, state)
        `)
        .order("created_at", { ascending: false });

      if (options.statusFilter && options.statusFilter !== "all") {
        query = query.eq("status", options.statusFilter);
      }

      if (options.regionId) {
        query = query.eq("region_id", options.regionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (Trip & { regions?: { id: string; name: string; city: string; state: string } | null })[];
    },
  });
};

// Create a test trip for driver app testing
export const useCreateTestTrip = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const testAddresses = [
        { pickup: "123 Main St, New York, NY", dropoff: "456 Broadway, New York, NY" },
        { pickup: "789 5th Ave, New York, NY", dropoff: "321 Park Ave, New York, NY" },
        { pickup: "555 Lexington Ave, New York, NY", dropoff: "888 Madison Ave, New York, NY" },
      ];
      const randomAddr = testAddresses[Math.floor(Math.random() * testAddresses.length)];
      const fare = 15 + Math.random() * 25;
      const distance = 2 + Math.random() * 8;

      const { data, error } = await supabase
        .from("trips")
        .insert({
          pickup_address: randomAddr.pickup,
          dropoff_address: randomAddr.dropoff,
          pickup_lat: 40.7128 + (Math.random() * 0.05),
          pickup_lng: -74.0060 + (Math.random() * 0.05),
          dropoff_lat: 40.7580 + (Math.random() * 0.05),
          dropoff_lng: -73.9855 + (Math.random() * 0.05),
          fare_amount: parseFloat(fare.toFixed(2)),
          distance_km: parseFloat(distance.toFixed(1)),
          duration_minutes: Math.floor(distance * 3 + 5),
          status: "requested",
          payment_status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-trips"] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success(`Test trip created: ${data.id.slice(0, 8)}...`);
    },
    onError: (error) => {
      toast.error("Failed to create test trip: " + error.message);
    },
  });
};

export const useUpdateTripStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, payment_status }: { id: string; status?: TripStatus; payment_status?: string }) => {
      const updateData: { status?: TripStatus; payment_status?: string; completed_at?: string } = {};
      if (status) {
        updateData.status = status;
        if (status === "completed") {
          updateData.completed_at = new Date().toISOString();
        }
      }
      if (payment_status) {
        updateData.payment_status = payment_status;
      }

      const { error } = await supabase
        .from("trips")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Trip updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update trip: " + error.message);
    },
  });
};

export const useCancelTrip = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, refund }: { id: string; refund: boolean }) => {
      const updateData: { status: TripStatus; payment_status?: string } = { status: "cancelled" };
      if (refund) {
        updateData.payment_status = "refunded";
      }

      const { error } = await supabase
        .from("trips")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success("Trip cancelled successfully");
    },
    onError: (error) => {
      toast.error("Failed to cancel trip: " + error.message);
    },
  });
};

export const useTripStats = () => {
  return useQuery({
    queryKey: ["trip-stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: allTrips, error } = await supabase
        .from("trips")
        .select("status, fare_amount, payment_status, created_at");

      if (error) throw error;

      const todayTrips = allTrips?.filter(t => new Date(t.created_at) >= today) || [];
      
      return {
        activeTrips: allTrips?.filter(t => 
          ["requested", "accepted", "en_route", "arrived", "in_progress"].includes(t.status || "")
        ).length || 0,
        completedToday: todayTrips.filter(t => t.status === "completed").length,
        cancelledToday: todayTrips.filter(t => t.status === "cancelled").length,
        revenueToday: todayTrips
          .filter(t => t.payment_status === "paid")
          .reduce((sum, t) => sum + (t.fare_amount || 0), 0),
        totalTrips: allTrips?.length || 0,
        totalRevenue: allTrips
          ?.filter(t => t.payment_status === "paid")
          .reduce((sum, t) => sum + (t.fare_amount || 0), 0) || 0,
      };
    },
  });
};
