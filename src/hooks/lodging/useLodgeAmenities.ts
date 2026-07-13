/**
 * useLodgeAmenities - amenities flags + policies + categorized catalog (one row per store).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { flattenCategoriesToLegacy } from "@/components/lodging/amenityCatalog";

export interface LodgeAmenities {
  id: string;
  store_id: string;
  amenities: Record<string, boolean>;
  policies: Record<string, string>;
  categories: Record<string, string[]>;
  extra_charge_keys: string[];
  parking_mode: string | null;
  internet_mode: string | null;
  updated_at: string;
}

export interface SaveAmenitiesInput {
  amenities?: Record<string, boolean>;
  policies?: Record<string, string>;
  categories?: Record<string, string[]>;
  extra_charge_keys?: string[];
  parking_mode?: string | null;
  internet_mode?: string | null;
}

export function useLodgeAmenities(storeId: string) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["lodge-amenities", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lodge_amenities" as any)
        .select("*")
        .eq("store_id", storeId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as LodgeAmenities | null;
    },
    enabled: !!storeId,
  });

  const save = useMutation({
    mutationFn: async (input: SaveAmenitiesInput) => {
      const categories = input.categories ?? {};
      const parkingMode = input.parking_mode ?? null;
      const internetMode = input.internet_mode ?? null;
      const derivedFlat = flattenCategoriesToLegacy(categories, parkingMode, internetMode);
      // Merge with any explicit amenities passed in (legacy callers).
      const amenities = { ...derivedFlat, ...(input.amenities ?? {}) };

      const payload: any = {
        store_id: storeId,
        amenities,
        policies: input.policies ?? {},
        categories,
        extra_charge_keys: input.extra_charge_keys ?? [],
        parking_mode: parkingMode,
        internet_mode: internetMode,
      };
      const { error } = await supabase
        .from("lodge_amenities" as any)
        .upsert(payload, { onConflict: "store_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lodge-amenities", storeId] }),
  });

  return { ...list, save };
}
