/**
 * useLodgePropertyProfile - CRUD for lodge_property_profile (resort-level metadata).
 * One row per store_id.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HouseRules {
  quiet_hours?: string;
  quiet_from?: string;
  quiet_to?: string;
  parties_allowed?: boolean;
  smoking_zones?: string;
  min_age?: number;
  id_at_checkin?: boolean;
  security_deposit_cents?: number;
}

export interface NearbyDistance {
  label: string;
  minutes?: number;
  km?: number;
  mode?: "walk" | "drive" | "boat";
}

export interface PetPolicy {
  allowed?: boolean;
  fee_cents?: number;
  max_weight_kg?: number;
  notes?: string;
}

export interface ChildPolicy {
  allowed?: boolean;
  min_age?: number;
  cot_available?: boolean;
  extra_bed_fee_cents?: number;
  notes?: string;
}

export interface ContactInfo {
  phone?: string;
  email?: string;
  whatsapp?: string;
  website?: string;
  emergency_phone?: string;
  /** ISO timestamp set after successful Twilio Verify of `phone`. */
  phone_verified_at?: string | null;
}

export interface DescriptionSection {
  title: string;
  body: string;
}

export interface PropertyHighlights {
  perfect_for?: string;
  top_location_score?: number;
  breakfast_info?: string;
  rooms_with?: string[];
}

export interface LodgePropertyProfile {
  id: string;
  store_id: string;
  languages: string[];
  facilities: string[];
  meal_plans: string[];
  house_rules: HouseRules;
  accessibility: string[];
  sustainability: string[];
  hero_badges: string[];
  included_highlights: string[];
  description_sections: DescriptionSection[];
  property_highlights: PropertyHighlights;
  popular_amenities: string[];
  nearby: NearbyDistance[];
  // New Booking-grade fields
  check_in_from?: string;
  check_in_until?: string;
  check_out_from?: string;
  check_out_until?: string;
  cancellation_policy?: string;
  cancellation_window_hours?: number;
  pet_policy: PetPolicy;
  child_policy: ChildPolicy;
  contact: ContactInfo;
  payment_methods: string[];
  currencies_accepted: string[];
  deposit_required: boolean;
  deposit_percent?: number;
  created_at: string;
  updated_at: string;
}

const EMPTY: Omit<LodgePropertyProfile, "id" | "created_at" | "updated_at" | "store_id"> = {
  languages: [],
  facilities: [],
  meal_plans: [],
  house_rules: {},
  accessibility: [],
  sustainability: [],
  hero_badges: [],
  included_highlights: [],
  description_sections: [],
  property_highlights: {},
  popular_amenities: [],
  nearby: [],
  check_in_from: "15:00",
  check_in_until: "23:00",
  check_out_from: "07:00",
  check_out_until: "11:00",
  cancellation_policy: "",
  cancellation_window_hours: undefined,
  pet_policy: {},
  child_policy: {},
  contact: {},
  payment_methods: [],
  currencies_accepted: [],
  deposit_required: false,
  deposit_percent: undefined,
};

export function useLodgePropertyProfile(storeId: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["lodge-property-profile", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lodge_property_profile" as any)
        .select("*")
        .eq("store_id", storeId)
        .maybeSingle();
      if (error && (error as any).code !== "PGRST116") throw error;
      return (data || null) as unknown as LodgePropertyProfile | null;
    },
    enabled: !!storeId,
    staleTime: 60_000,
    gcTime: 300_000,
  });

  const upsert = useMutation({
    mutationFn: async (patch: Partial<LodgePropertyProfile>) => {
      const payload: any = { store_id: storeId, ...EMPTY, ...(query.data || {}), ...patch };
      delete payload.created_at;
      delete payload.updated_at;
      const { error } = await supabase
        .from("lodge_property_profile" as any)
        .upsert(payload, { onConflict: "store_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lodge-property-profile", storeId] }),
  });

  return { ...query, upsert, defaults: EMPTY };
}
