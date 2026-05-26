/**
 * useLodgeRooms - CRUD for lodge_rooms (room types & rates).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BedSlot {
  type: string; // King, Queen, Double, Single, Sofa bed, Bunk, Crib
  qty: number;
}

export interface ChildPolicy {
  child_max_age?: number; // age cutoff for "child" pricing
  free_age?: number; // children under this stay free
  extra_adult_fee_cents?: number; // per night
  extra_child_fee_cents?: number; // per night
  cot_available?: boolean;
}

export interface RoomFees {
  city_tax_cents?: number; // per night per guest
  resort_fee_cents?: number; // per night
  cleaning_fee_cents?: number; // per stay
  service_charge_pct?: number; // %
  vat_pct?: number; // %
}

export interface SeasonalRate {
  label: string; // e.g. "Peak season"
  start: string; // ISO date YYYY-MM-DD
  end: string; // ISO date
  nightly_cents: number;
}

export interface LodgeRoom {
  id: string;
  store_id: string;
  name: string;
  room_type: string | null;
  beds: string | null;
  max_guests: number;
  size_sqm: number | null;
  units_total: number;
  base_rate_cents: number;
  weekend_rate_cents: number;
  weekly_discount_pct: number;
  monthly_discount_pct: number;
  breakfast_included: boolean;
  amenities: string[];
  photos: string[];
  sort_order: number;
  is_active: boolean;
  cover_photo_index?: number | null;
  description?: string | null;
  cancellation_policy?: string | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  addons?: LodgeAddon[];
  // New: structured room metadata
  bed_config?: BedSlot[];
  view?: string | null;
  floor?: string | null;
  wing?: string | null;
  child_policy?: ChildPolicy;
  fees?: RoomFees;
  seasonal_rates?: SeasonalRate[];
  min_stay?: number;
  max_stay?: number | null;
  no_arrival_weekdays?: number[]; // 0=Sun..6=Sat
  // Rate-plan extensions (Booking.com style)
  breakfast_rate_cents?: number | null;   // bundled breakfast rate
  original_rate_cents?: number | null;    // rack rate before Getaway Deal
  // Booking-style storefront enhancements
  badges?: string[];
  expandable_features?: string[];
  created_at: string;
  updated_at: string;
}

export interface LodgeAddon {
  id?: string;
  name: string;
  price_cents: number;
  per: "stay" | "night" | "guest" | "person_night";
  category?: string;
  icon?: string;
  active?: boolean;
  disabled?: boolean;
  max_quantity?: number;
  min_guests?: number;
  max_guests?: number;
  min_nights?: number;
  max_nights?: number;
  available_from?: string;
  available_until?: string;
  requires_status?: string[];
  host_note?: string;
}

export function useLodgeRooms(storeId: string) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["lodge-rooms", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lodge_rooms" as any)
        .select("*")
        .eq("store_id", storeId)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as LodgeRoom[];
    },
    enabled: !!storeId,
    staleTime: 60_000,
    gcTime: 300_000,
  });

  const upsert = useMutation({
    mutationFn: async (room: Partial<LodgeRoom> & { store_id: string; name: string }) => {
      const payload: any = { ...room };
      if (payload.id) {
        const { error } = await supabase.from("lodge_rooms" as any).update(payload).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lodge_rooms" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lodge-rooms", storeId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lodge_rooms" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lodge-rooms", storeId] }),
  });

  return { ...list, upsert, remove };
}
