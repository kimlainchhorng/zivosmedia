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
    setError(null);
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
    const { data, error: err } = await supabase.functions.invoke("car-rental-addon-manage", {
      body: { action: "create", store_id: storeId, addon: payload },
    });
    if (err) {
      console.error("[useCarRentalAddons] create failed", err);
      setError("Couldn't add add-on.");
      setSaving(false);
      return null;
    }
    const created = data?.addon as CarRentalAddon;
    setAddons((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));
    setSaving(false);
    return created;
  }, [storeId]);

  const update = useCallback(async (id: string, patch: Partial<CarRentalAddonDraft>): Promise<boolean> => {
    setSaving(true);
    setError(null);
    setAddons((prev) => prev.map((a) => (a.id === id ? ({ ...a, ...patch } as CarRentalAddon) : a)));
    const { data, error: err } = await supabase.functions.invoke("car-rental-addon-manage", {
      body: { action: "update", addon_id: id, addon: patch },
    });
    if (err) {
      console.error("[useCarRentalAddons] update failed", err);
      await load(); // roll the optimistic patch back to server truth …
      setError("Couldn't save changes — please retry."); // … then set the message (load() can clear it)
      setSaving(false);
      return false;
    }
    if (data?.addon) {
      const updated = data.addon as CarRentalAddon;
      setAddons((prev) => prev.map((a) => (a.id === id ? updated : a)));
    }
    setSaving(false);
    return true;
  }, [load]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setSaving(true);
    setError(null);
    const prev = addons;
    setAddons((p) => p.filter((a) => a.id !== id));
    const { error: err } = await supabase.functions.invoke("car-rental-addon-manage", {
      body: { action: "delete", addon_id: id },
    });
    if (err) {
      console.error("[useCarRentalAddons] delete failed", err);
      setError("Couldn't delete add-on.");
      setAddons(prev);
      setSaving(false);
      return false;
    }
    setSaving(false);
    return true;
  }, [addons]);

  return { addons, loading, saving, error, create, update, remove, refresh: load };
}
