/**
 * P2P Booking — queries p2p_vehicles, p2p_bookings, p2p_reviews from Supabase
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface P2PSearchFilters {
  location?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  make?: string;
  transmission?: string;
  fuelType?: string;
  seats?: number;
  instantBook?: boolean;
  startDate?: string;
  endDate?: string;
  [key: string]: any;
}

export interface P2PVehicleWithOwner {
  id: string;
  make: string;
  model: string;
  year: number;
  daily_rate: number;
  images: any;
  rating: number | null;
  review_count: number | null;
  location_city: string | null;
  location_address: string | null;
  seats: number | null;
  transmission: string | null;
  fuel_type: string | null;
  category: string;
  instant_book: boolean | null;
  is_featured: boolean | null;
  description: string | null;
  features: any;
  total_trips: number | null;
  color: string | null;
  doors: number | null;
  mileage: number | null;
  included_miles_per_day: number | null;
  owner_id: string;
  [key: string]: any;
}

export function useP2PVehicleCount() {
  const query = useQuery({
    queryKey: ["p2p-vehicle-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("p2p_vehicles")
        .select("id", { count: "exact", head: true })
        .eq("is_available", true)
        .eq("approval_status", "approved");
      if (error) throw error;
      return count || 0;
    },
    staleTime: 60_000,
  });
  return { count: query.data || 0, isLoading: query.isLoading };
}

export function useP2PVehicleSearch(filters?: P2PSearchFilters) {
  const query = useQuery({
    queryKey: ["p2p-vehicles", filters],
    queryFn: async (): Promise<P2PVehicleWithOwner[]> => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return [];

      let q = supabase
        .from("p2p_vehicles")
        .select("*")
        .eq("is_available", true)
        .eq("approval_status", "approved")
        .order("is_featured", { ascending: false })
        .order("rating", { ascending: false, nullsFirst: false })
        .limit(50);

      if (filters?.category && filters.category !== "all") {
        q = q.eq("category", filters.category as any);
      }
      if (filters?.minPrice) {
        q = q.gte("daily_rate", filters.minPrice);
      }
      if (filters?.maxPrice) {
        q = q.lte("daily_rate", filters.maxPrice);
      }
      if (filters?.make) {
        q = q.ilike("make", `%${filters.make}%`);
      }
      if (filters?.transmission) {
        q = q.eq("transmission", filters.transmission as any);
      }
      if (filters?.fuelType) {
        q = q.eq("fuel_type", filters.fuelType as any);
      }
      if (filters?.seats) {
        q = q.gte("seats", filters.seats);
      }
      if (filters?.instantBook) {
        q = q.eq("instant_book", true);
      }
      if (filters?.location) {
        q = q.ilike("location_city", `%${filters.location}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as P2PVehicleWithOwner[];
    },
    staleTime: 30_000,
    retry: false,
  });

  return {
    vehicles: query.data || [],
    data: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    isError: query.isError,
  };
}

export function useP2PVehicleDetail(id?: string) {
  const query = useQuery({
    queryKey: ["p2p-vehicle-detail", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("p2p_vehicles")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as P2PVehicleWithOwner;
    },
    enabled: !!id,
  });

  return {
    vehicle: query.data,
    data: query.data,
    isLoading: query.isLoading,
  };
}

export function useBookingPricing(vehicleId?: string, days?: number) {
  const query = useQuery({
    queryKey: ["p2p-booking-pricing", vehicleId, days],
    queryFn: async () => {
      if (!vehicleId || !days) return null;
      const { data, error } = await supabase
        .from("p2p_vehicles")
        .select("daily_rate, weekly_rate, monthly_rate, weekly_discount_percent, monthly_discount_percent, cleaning_fee, deposit_amount, extra_mileage_fee, included_miles_per_day")
        .eq("id", vehicleId)
        .single();
      if (error) throw error;
      if (!data) return null;

      const dailyRate = data.daily_rate || 0;
      let subtotal = dailyRate * days;

      // Apply weekly/monthly discounts
      if (days >= 30 && data.monthly_rate) {
        subtotal = data.monthly_rate * Math.ceil(days / 30);
      } else if (days >= 7 && data.weekly_rate) {
        subtotal = data.weekly_rate * Math.ceil(days / 7);
      } else if (days >= 7 && data.weekly_discount_percent) {
        subtotal = subtotal * (1 - data.weekly_discount_percent / 100);
      }

      const cleaningFee = data.cleaning_fee || 0;
      const deposit = data.deposit_amount || 0;
      const serviceFee = Math.round(subtotal * 0.12); // 12% platform fee
      const total = subtotal + cleaningFee + serviceFee;

      return {
        dailyRate,
        days,
        subtotal,
        cleaningFee,
        serviceFee,
        deposit,
        total,
        includedMilesPerDay: data.included_miles_per_day,
        extraMileageFee: data.extra_mileage_fee,
      };
    },
    enabled: !!vehicleId && !!days && days > 0,
  });

  return {
    pricing: query.data,
    data: query.data,
    isLoading: query.isLoading,
  };
}

export function useVehicleReviews(vehicleId?: string) {
  const query = useQuery({
    queryKey: ["p2p-vehicle-reviews", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      const { data, error } = await (supabase as any)
        .from("p2p_reviews")
        .select("id, rating, comment, created_at, reviewer_id")
        .eq("vehicle_id", vehicleId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.created_at,
        reviewerId: r.reviewer_id,
      }));
    },
    enabled: !!vehicleId,
  });

  return {
    reviews: query.data || [],
    data: query.data,
    isLoading: query.isLoading,
  };
}
