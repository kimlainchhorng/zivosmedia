/**
 * Expenses CRUD for the car-rental module.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CarRentalExpenseCategory =
  | "fuel" | "insurance" | "maintenance" | "cleaning" | "lot_rent"
  | "registration" | "taxes" | "parts" | "tires" | "office" | "marketing" | "other";

export interface CarRentalExpense {
  id: string;
  store_id: string;
  vehicle_id: string | null;
  category: CarRentalExpenseCategory;
  description: string;
  notes: string | null;
  amount_cents: number;
  paid_to: string | null;
  payment_method: string | null;
  receipt_url: string | null;
  expense_date: string;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
}

export interface CarRentalExpenseDraft {
  vehicle_id?: string | null;
  category: CarRentalExpenseCategory;
  description: string;
  notes?: string | null;
  amount_cents: number;
  paid_to?: string | null;
  payment_method?: string | null;
  expense_date: string;
  is_recurring?: boolean;
}

export function useCarRentalExpenses(storeId: string | undefined) {
  const [expenses, setExpenses] = useState<CarRentalExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from("car_rental_expenses")
      .select("*")
      .eq("store_id", storeId)
      .order("expense_date", { ascending: false });
    if (err) {
      console.error("[useCarRentalExpenses] load failed", err);
      setError("Couldn't load expenses.");
      setLoading(false);
      return;
    }
    setExpenses((data ?? []) as unknown as CarRentalExpense[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (draft: CarRentalExpenseDraft): Promise<CarRentalExpense | null> => {
    if (!storeId) return null;
    setSaving(true);
    setError(null);
    const payload = {
      store_id: storeId,
      vehicle_id: draft.vehicle_id ?? null,
      category: draft.category,
      description: draft.description.trim(),
      notes: draft.notes?.trim() || null,
      amount_cents: draft.amount_cents,
      paid_to: draft.paid_to?.trim() || null,
      payment_method: draft.payment_method?.trim() || null,
      expense_date: draft.expense_date,
      is_recurring: draft.is_recurring ?? false,
    };
    const { data, error: err } = await supabase.functions.invoke("car-rental-expense-manage", {
      body: { action: "create", store_id: storeId, expense: payload },
    });
    if (err) {
      console.error("[useCarRentalExpenses] create failed", err);
      setError("Couldn't add expense.");
      setSaving(false);
      return null;
    }
    const created = data?.expense as CarRentalExpense;
    setExpenses((prev) => [created, ...prev]);
    setSaving(false);
    return created;
  }, [storeId]);

  const update = useCallback(async (id: string, patch: Partial<CarRentalExpenseDraft>): Promise<boolean> => {
    setSaving(true);
    setError(null);
    setExpenses((prev) => prev.map((e) => (e.id === id ? ({ ...e, ...patch } as CarRentalExpense) : e)));
    const { data, error: err } = await supabase.functions.invoke("car-rental-expense-manage", {
      body: { action: "update", expense_id: id, expense: patch },
    });
    if (err) {
      console.error("[useCarRentalExpenses] update failed", err);
      await load(); // roll the optimistic patch back to server truth …
      setError("Couldn't save changes — please retry."); // … then set the message (load() can clear it)
      setSaving(false);
      return false;
    }
    if (data?.expense) {
      const updated = data.expense as CarRentalExpense;
      setExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)));
    }
    setSaving(false);
    return true;
  }, [load]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setSaving(true);
    setError(null);
    const prev = expenses;
    setExpenses((p) => p.filter((e) => e.id !== id));
    const { error: err } = await supabase.functions.invoke("car-rental-expense-manage", {
      body: { action: "delete", expense_id: id },
    });
    if (err) {
      console.error("[useCarRentalExpenses] delete failed", err);
      setError("Couldn't delete expense.");
      setExpenses(prev);
      setSaving(false);
      return false;
    }
    setSaving(false);
    return true;
  }, [expenses]);

  return { expenses, loading, saving, error, create, update, remove, refresh: load };
}
