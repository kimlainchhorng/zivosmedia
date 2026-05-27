/**
 * Add-on extras (insurance, GPS, child seat, etc.) for the car-rental module.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CarRentalAddonBilling = "per_day" | "per_rental";

export interface CarRentalAddon {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  billing: CarRentalAddonBilling;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CarRentalAddonDraft {
  name: string;
  description?: string | null;
  price_cents: number;
  billing: CarRentalAddonBilling;
  icon?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

export function useCarRentalAddons(storeId: string | undefined) {
  const [addons, setAddons] = useState<CarRentalAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from("car_rental_addons")
      .select("*")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (err) {
      console.error("[useCarRentalAddons] load failed", err);
      setError("Couldn't load add-ons.");
      setLoading(false);
      return;
    }
    setAddons((data ?? []) as unknown as CarRentalAddon[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (draft: CarRentalAddonDraft): Promise<CarRentalAddon | null> => {
    if (!storeId) return null;
    setSaving(true);
    const payload = {
      store_id: storeId,
      name: draft.name.trim(),
      description: draft.description?.trim() || null,
      price_cents: draft.price_cents,
      billing: draft.billing,
      icon: draft.icon ?? null,
      is_active: draft.is_active ?? true,
      sort_order: draft.sort_order ?? 0,
    };
    const { data, error: err } = await supabase
      .from("car_rental_addons")
      .insert(payload as never)
      .select("*")
      .single();
    if (err) {
      console.error("[useCarRentalAddons] create failed", err);
      setError("Couldn't add add-on.");
      setSaving(false);
      return null;
    }
    const created = data as unknown as CarRentalAddon;
    setAddons((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));
    setSaving(false);
    return created;
  }, [storeId]);

  const update = useCallback(async (id: string, patch: Partial<CarRentalAddonDraft>) => {
    setSaving(true);
    setAddons((prev) => prev.map((a) => (a.id === id ? ({ ...a, ...patch } as CarRentalAddon) : a)));
    const { error: err } = await supabase.from("car_rental_addons").update(patch as never).eq("id", id);
    if (err) {
      console.error("[useCarRentalAddons] update failed", err);
      setError("Couldn't save changes — refreshing.");
      await load();
    }
    setSaving(false);
  }, [load]);

  const remove = useCallback(async (id: string) => {
    setSaving(true);
    const prev = addons;
    setAddons((p) => p.filter((a) => a.id !== id));
    const { error: err } = await supabase.from("car_rental_addons").delete().eq("id", id);
    if (err) {
      console.error("[useCarRentalAddons] delete failed", err);
      setError("Couldn't delete add-on.");
      setAddons(prev);
    }
    setSaving(false);
  }, [addons]);

  return { addons, loading, saving, error, create, update, remove, refresh: load };
}
