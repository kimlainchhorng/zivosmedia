/**
 * Car dealership financing applications CRUD.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DealershipFinancingStatus =
  | "draft" | "submitted" | "approved" | "conditionally_approved"
  | "declined" | "funded" | "cancelled";

export interface DealershipFinancing {
  id: string;
  store_id: string;
  sale_id: string | null;
  customer_id: string | null;
  lender_name: string | null;
  application_number: string | null;
  amount_financed_cents: number;
  down_payment_cents: number;
  apr_bps: number;
  term_months: number;
  monthly_payment_cents: number;
  first_payment_due: string | null;
  payment_frequency: "weekly" | "biweekly" | "monthly";
  status: DealershipFinancingStatus;
  submitted_at: string | null;
  decision_at: string | null;
  funded_at: string | null;
  decision_notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DealershipFinancingDraft = Omit<
  DealershipFinancing,
  "id" | "store_id" | "created_at" | "updated_at"
>;

export function useDealershipFinancing(storeId: string | undefined) {
  const [financings, setFinancings] = useState<DealershipFinancing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true); setError(null);
    const { data, error: err } = await supabase
      .from("car_dealership_financing")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    if (err) {
      console.error("[useDealershipFinancing] load failed", err);
      setError("Couldn't load financing applications.");
      setLoading(false);
      return;
    }
    setFinancings((data ?? []) as unknown as DealershipFinancing[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (draft: DealershipFinancingDraft) => {
    if (!storeId) return null;
    setSaving(true); setError(null);
    const { data, error: err } = await supabase
      .from("car_dealership_financing")
      .insert({ store_id: storeId, ...draft } as never)
      .select("*").single();
    if (err) {
      console.error("[useDealershipFinancing] create failed", err);
      setError(err.message || "Couldn't create application.");
      setSaving(false);
      return null;
    }
    const created = data as unknown as DealershipFinancing;
    setFinancings((prev) => [created, ...prev]);
    setSaving(false);
    return created;
  }, [storeId]);

  const update = useCallback(async (id: string, patch: Partial<DealershipFinancingDraft>) => {
    setSaving(true); setError(null);
    setFinancings((prev) => prev.map((f) => (f.id === id ? ({ ...f, ...patch } as DealershipFinancing) : f)));
    const { error: err } = await supabase
      .from("car_dealership_financing").update(patch as never).eq("id", id);
    if (err) { setError("Couldn't update."); setSaving(false); void load(); return false; }
    setSaving(false);
    return true;
  }, [load]);

  const remove = useCallback(async (id: string) => {
    setSaving(true); setError(null);
    const prev = financings;
    setFinancings((p) => p.filter((f) => f.id !== id));
    const { error: err } = await supabase.from("car_dealership_financing").delete().eq("id", id);
    if (err) { setError("Couldn't delete."); setFinancings(prev); setSaving(false); return false; }
    setSaving(false);
    return true;
  }, [financings]);

  return { financings, loading, saving, error, create, update, remove, refresh: load };
}
