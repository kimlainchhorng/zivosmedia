/**
 * Renter book CRUD for the car-rental module.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CarRentalCustomer {
  id: string;
  store_id: string;
  user_id: string | null;
  display_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  driver_license_number: string | null;
  driver_license_state: string | null;
  driver_license_country: string | null;
  driver_license_expiry: string | null;
  driver_license_photo_url: string | null;
  driver_license_photo_back_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  notes: string | null;
  tags: string[];
  is_blocked: boolean;
  total_rentals: number;
  last_rental_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CarRentalCustomerDraft {
  display_name: string;
  email?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  driver_license_number?: string | null;
  driver_license_state?: string | null;
  driver_license_country?: string | null;
  driver_license_expiry?: string | null;
  driver_license_photo_url?: string | null;
  driver_license_photo_back_url?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  notes?: string | null;
  tags?: string[];
  is_blocked?: boolean;
}

export function useCarRentalCustomers(storeId: string | undefined) {
  const [customers, setCustomers] = useState<CarRentalCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from("car_rental_customers")
      .select("*")
      .eq("store_id", storeId)
      .order("display_name", { ascending: true });
    if (err) {
      console.error("[useCarRentalCustomers] load failed", err);
      setError("Couldn't load renters.");
      setLoading(false);
      return;
    }
    setCustomers((data ?? []) as unknown as CarRentalCustomer[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (draft: CarRentalCustomerDraft): Promise<CarRentalCustomer | null> => {
    if (!storeId) return null;
    setSaving(true);
    const payload = {
      store_id: storeId,
      display_name: draft.display_name.trim(),
      email: draft.email?.trim() || null,
      phone: draft.phone?.trim() || null,
      date_of_birth: draft.date_of_birth || null,
      driver_license_number: draft.driver_license_number?.trim() || null,
      driver_license_state: draft.driver_license_state?.trim() || null,
      driver_license_country: draft.driver_license_country?.trim() || null,
      driver_license_expiry: draft.driver_license_expiry || null,
      driver_license_photo_url: draft.driver_license_photo_url?.trim() || null,
      driver_license_photo_back_url: draft.driver_license_photo_back_url?.trim() || null,
      address: draft.address?.trim() || null,
      city: draft.city?.trim() || null,
      state: draft.state?.trim() || null,
      postal_code: draft.postal_code?.trim() || null,
      country: draft.country?.trim() || null,
      notes: draft.notes?.trim() || null,
      tags: draft.tags ?? [],
      is_blocked: draft.is_blocked ?? false,
    };
    const { data, error: err } = await supabase
      .from("car_rental_customers")
      .insert(payload as never)
      .select("*")
      .single();
    if (err) {
      console.error("[useCarRentalCustomers] create failed", err);
      setError("Couldn't add renter.");
      setSaving(false);
      return null;
    }
    const created = data as unknown as CarRentalCustomer;
    setCustomers((prev) => [...prev, created].sort((a, b) => a.display_name.localeCompare(b.display_name)));
    setSaving(false);
    return created;
  }, [storeId]);

  const update = useCallback(async (id: string, patch: Partial<CarRentalCustomerDraft>) => {
    setSaving(true);
    setCustomers((prev) => prev.map((c) => (c.id === id ? ({ ...c, ...patch } as CarRentalCustomer) : c)));
    const { error: err } = await supabase.from("car_rental_customers").update(patch as never).eq("id", id);
    if (err) {
      console.error("[useCarRentalCustomers] update failed", err);
      setError("Couldn't save changes — refreshing.");
      await load();
    }
    setSaving(false);
  }, [load]);

  const remove = useCallback(async (id: string) => {
    setSaving(true);
    const prev = customers;
    setCustomers((p) => p.filter((c) => c.id !== id));
    const { error: err } = await supabase.from("car_rental_customers").delete().eq("id", id);
    if (err) {
      console.error("[useCarRentalCustomers] delete failed", err);
      setError("Couldn't delete renter.");
      setCustomers(prev);
    }
    setSaving(false);
  }, [customers]);

  return { customers, loading, saving, error, create, update, remove, refresh: load };
}
