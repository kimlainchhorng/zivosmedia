/**
 * Car dealership customers CRUD.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DealershipCustomer {
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
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  employer: string | null;
  occupation: string | null;
  income_band: string | null;
  preferred_contact: "phone" | "email" | "sms" | "whatsapp" | null;
  notes: string | null;
  tags: string[];
  total_purchases: number;
  lifetime_value_cents: number;
  last_purchase_at: string | null;
  created_at: string;
  updated_at: string;
}

export type DealershipCustomerDraft = Omit<
  DealershipCustomer,
  "id" | "store_id" | "created_at" | "updated_at" | "total_purchases" | "lifetime_value_cents" | "last_purchase_at"
>;

export function useDealershipCustomers(storeId: string | undefined) {
  const [customers, setCustomers] = useState<DealershipCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true); setError(null);
    const { data, error: err } = await supabase
      .from("car_dealership_customers")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    if (err) {
      console.error("[useDealershipCustomers] load failed", err);
      setError("Couldn't load customers.");
      setLoading(false);
      return;
    }
    setCustomers((data ?? []) as unknown as DealershipCustomer[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (draft: DealershipCustomerDraft) => {
    if (!storeId) return null;
    setSaving(true); setError(null);
    const payload = { store_id: storeId, ...draft };
    const { data, error: err } = await supabase
      .from("car_dealership_customers")
      .insert(payload as never)
      .select("*")
      .single();
    if (err) {
      console.error("[useDealershipCustomers] create failed", err);
      setError(err.message || "Couldn't add customer.");
      setSaving(false);
      return null;
    }
    const created = data as unknown as DealershipCustomer;
    setCustomers((prev) => [created, ...prev]);
    setSaving(false);
    return created;
  }, [storeId]);

  const update = useCallback(async (id: string, patch: Partial<DealershipCustomerDraft>) => {
    setSaving(true); setError(null);
    setCustomers((prev) => prev.map((c) => (c.id === id ? ({ ...c, ...patch } as DealershipCustomer) : c)));
    const { error: err } = await supabase
      .from("car_dealership_customers")
      .update(patch as never)
      .eq("id", id);
    if (err) {
      console.error("[useDealershipCustomers] update failed", err);
      setError("Couldn't update customer.");
      setSaving(false);
      void load();
      return false;
    }
    setSaving(false);
    return true;
  }, [load]);

  const remove = useCallback(async (id: string) => {
    setSaving(true); setError(null);
    const prev = customers;
    setCustomers((p) => p.filter((c) => c.id !== id));
    const { error: err } = await supabase
      .from("car_dealership_customers")
      .delete()
      .eq("id", id);
    if (err) {
      console.error("[useDealershipCustomers] remove failed", err);
      setError("Couldn't delete customer.");
      setCustomers(prev);
      setSaving(false);
      return false;
    }
    setSaving(false);
    return true;
  }, [customers]);

  return { customers, loading, saving, error, create, update, remove, refresh: load };
}
