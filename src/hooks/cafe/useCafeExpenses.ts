/**
 * Cafe expense log — straightforward CRUD.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CafeExpense {
  id: string;
  store_id: string;
  category: string;
  vendor: string | null;
  description: string | null;
  amount_cents: number;
  expense_date: string; // YYYY-MM-DD
  payment_method: "cash" | "card" | "bank_transfer" | "qr" | "other" | null;
  is_recurring: boolean;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
}

export type CafeExpenseDraft = Omit<CafeExpense, "id" | "store_id" | "created_at" | "updated_at">;

export interface UseCafeExpensesResult {
  expenses: CafeExpense[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (draft: CafeExpenseDraft) => Promise<CafeExpense | null>;
  update: (id: string, patch: Partial<CafeExpenseDraft>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useCafeExpenses(storeId: string | undefined): UseCafeExpensesResult {
  const [expenses, setExpenses] = useState<CafeExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("cafe_expenses" as never)
      .select("*")
      .eq("store_id", storeId)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (err) {
      console.error("[useCafeExpenses] load", err);
      setError("Couldn't load expenses.");
      setLoading(false);
      return;
    }
    setExpenses((data ?? []) as unknown as CafeExpense[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (draft: CafeExpenseDraft) => {
    if (!storeId) return null;
    setSaving(true);
    const payload = { store_id: storeId, ...draft };
    const { data, error: err } = await supabase
      .from("cafe_expenses" as never).insert(payload as never).select("*").single();
    setSaving(false);
    if (err) {
      console.error("[useCafeExpenses] create", err);
      setError("Couldn't save expense.");
      return null;
    }
    const created = data as unknown as CafeExpense;
    setExpenses((p) => [created, ...p]);
    return created;
  }, [storeId]);

  const update = useCallback(async (id: string, patch: Partial<CafeExpenseDraft>) => {
    setSaving(true);
    setExpenses((p) => p.map((e) => e.id === id ? ({ ...e, ...patch } as CafeExpense) : e));
    const { error: err } = await supabase.from("cafe_expenses" as never).update(patch as never).eq("id", id);
    setSaving(false);
    if (err) { console.error("[useCafeExpenses] update", err); await load(); }
  }, [load]);

  const remove = useCallback(async (id: string) => {
    const prev = expenses;
    setExpenses((p) => p.filter((e) => e.id !== id));
    const { error: err } = await supabase.from("cafe_expenses" as never).delete().eq("id", id);
    if (err) { console.error("[useCafeExpenses] remove", err); setExpenses(prev); }
  }, [expenses]);

  return { expenses, loading, saving, error, refresh: load, create, update, remove };
}
