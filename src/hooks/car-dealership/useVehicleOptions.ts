/**
 * Lightweight hook — fetches only the fields needed for vehicle picker dropdowns.
 * Use this instead of the full useDealershipInventory to avoid over-fetching.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VehicleOption {
  id: string;
  label: string;       // "2023 Toyota Camry SE"
  vin: string | null;
  asking_price_cents: number;
  cost_cents: number;
  status: string;
  stock_number: string | null;
}

export function useVehicleOptions(storeId: string | undefined) {
  const [options, setOptions] = useState<VehicleOption[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    const { data } = await supabase
      .from("car_dealership_vehicles")
      .select("id, year, make, model, trim, vin, asking_price_cents, cost_cents, status, stock_number")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .not("status", "in", '("sold","retired")')
      .order("year", { ascending: false })
      .order("make")
      .order("model");

    setOptions(
      (data ?? []).map((v: any) => ({
        id: v.id,
        label: [v.year, v.make, v.model, v.trim].filter(Boolean).join(" "),
        vin: v.vin ?? null,
        asking_price_cents: v.asking_price_cents ?? 0,
        cost_cents: v.cost_cents ?? 0,
        status: v.status,
        stock_number: v.stock_number ?? null,
      }))
    );
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  return { options, loading };
}
