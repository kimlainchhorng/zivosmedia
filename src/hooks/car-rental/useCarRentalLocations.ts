/**
 * Pickup / dropoff locations CRUD for the car-rental module.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CarRentalLocation {
  id: string;
  store_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  open_time: string | null;
  close_time: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CarRentalLocationDraft {
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  phone?: string | null;
  open_time?: string | null;
  close_time?: string | null;
  is_default?: boolean;
  is_active?: boolean;
}

export function useCarRentalLocations(storeId: string | undefined) {
  const [locations, setLocations] = useState<CarRentalLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from("car_rental_locations")
      .select("*")
      .eq("store_id", storeId)
      .order("is_default", { ascending: false })
      .order("name", { ascending: true });
    if (err) {
      console.error("[useCarRentalLocations] load failed", err);
      setError("Couldn't load locations.");
      setLoading(false);
      return;
    }
    setLocations((data ?? []) as unknown as CarRentalLocation[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (draft: CarRentalLocationDraft): Promise<CarRentalLocation | null> => {
    if (!storeId) return null;
    setSaving(true);
    const payload = {
      store_id: storeId,
      name: draft.name.trim(),
      address: draft.address?.trim() || null,
      city: draft.city?.trim() || null,
      state: draft.state?.trim() || null,
      postal_code: draft.postal_code?.trim() || null,
      country: draft.country?.trim() || null,
      phone: draft.phone?.trim() || null,
      open_time: draft.open_time || null,
      close_time: draft.close_time || null,
      is_default: draft.is_default ?? false,
      is_active: draft.is_active ?? true,
    };
    const { data, error: err } = await supabase
      .from("car_rental_locations")
      .insert(payload as never)
      .select("*")
      .single();
    if (err) {
      console.error("[useCarRentalLocations] create failed", err);
      setError("Couldn't add location.");
      setSaving(false);
      return null;
    }
    const created = data as unknown as CarRentalLocation;
    setLocations((prev) => [created, ...prev]);
    setSaving(false);
    return created;
  }, [storeId]);

  const update = useCallback(async (id: string, patch: Partial<CarRentalLocationDraft>) => {
    setSaving(true);
    setLocations((prev) => prev.map((l) => (l.id === id ? ({ ...l, ...patch } as CarRentalLocation) : l)));
    const { error: err } = await supabase.from("car_rental_locations").update(patch as never).eq("id", id);
    if (err) {
      console.error("[useCarRentalLocations] update failed", err);
      setError("Couldn't save changes — refreshing.");
      await load();
    }
    setSaving(false);
  }, [load]);

  const remove = useCallback(async (id: string) => {
    setSaving(true);
    const prev = locations;
    setLocations((p) => p.filter((l) => l.id !== id));
    const { error: err } = await supabase.from("car_rental_locations").delete().eq("id", id);
    if (err) {
      console.error("[useCarRentalLocations] delete failed", err);
      setError("Couldn't delete location.");
      setLocations(prev);
    }
    setSaving(false);
  }, [locations]);

  return { locations, loading, saving, error, create, update, remove, refresh: load };
}
