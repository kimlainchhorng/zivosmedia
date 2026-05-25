/**
 * Car dealership expenses CRUD.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DealershipExpenseCategory =
  | "acquisition" | "reconditioning" | "detailing" | "transport"
  | "parts" | "advertising" | "rent" | "utilities"
  | "insurance" | "payroll" | "licensing" | "general";

export interface DealershipExpense {
  id: string;
  store_id: string;
  vehicle_id: string | null;
  category: DealershipExpenseCategory;
  description: string;
  amount_cents: number;
  vendor: string | null;
  paid_at: string;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DealershipExpenseDraft = Omit<
  DealershipExpense,
  "id" | "store_id" | "created_at" | "updated_at"
>;

export function useDealershipExpenses(storeId: string | undefined) {
  const [expenses, setExpenses] = useState<DealershipExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true); setError(null);
    const { data, error: err } = await supabase
      .from("car_dealership_expenses")
      .select("*")
      .eq("store_id", storeId)
      .order("paid_at", { ascending: false });
    if (err) {
      console.error("[useDealershipExpenses] load failed", err);
      setError("Couldn't load expenses.");
      setLoading(false);
      return;
    }
    setExpenses((data ?? []) as unknown as DealershipExpense[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (draft: DealershipExpenseDraft) => {
    if (!storeId) return null;
    setSaving(true); setError(null);
    const { data, error: err } = await supabase
      .from("car_dealership_expenses")
      .insert({ store_id: storeId, ...draft } as never)
      .select("*").single();
    if (err) {
      console.error("[useDealershipExpenses] create failed", err);
      setError(err.message || "Couldn't add expense.");
      setSaving(false);
      return null;
    }
    const created = data as unknown as DealershipExpense;
    setExpenses((prev) => [created, ...prev]);
    setSaving(false);
    return created;
  }, [storeId]);

  const update = useCallback(async (id: string, patch: Partial<DealershipExpenseDraft>) => {
    setSaving(true); setError(null);
    setExpenses((prev) => prev.map((e) => (e.id === id ? ({ ...e, ...patch } as DealershipExpense) : e)));
    const { error: err } = await supabase
      .from("car_dealership_expenses").update(patch as never).eq("id", id);
    if (err) { setError("Couldn't update."); setSaving(false); void load(); return false; }
    setSaving(false);
    return true;
  }, [load]);

  const remove = useCallback(async (id: string) => {
    setSaving(true); setError(null);
    const prev = expenses;
    setExpenses((p) => p.filter((e) => e.id !== id));
    const { error: err } = await supabase.from("car_dealership_expenses").delete().eq("id", id);
    if (err) { setError("Couldn't delete."); setExpenses(prev); setSaving(false); return false; }
    setSaving(false);
    return true;
  }, [expenses]);

  return { expenses, loading, saving, error, create, update, remove, refresh: load };
}
