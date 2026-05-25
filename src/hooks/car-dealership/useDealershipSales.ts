/**
 * Car dealership sales / deals CRUD. Total / subtotal / balance_due are
 * rolled up server-side by a trigger — clients send raw fields, the DB
 * computes the sums.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DealershipSaleStatus =
  | "quote"
  | "pending"
  | "deposit_paid"
  | "financing"
  | "completed"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface DealershipSale {
  id: string;
  store_id: string;
  vehicle_id: string | null;
  customer_id: string | null;
  lead_id: string | null;
  salesperson_user_id: string | null;
  vehicle_label: string;
  vehicle_vin: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  salesperson_name: string | null;
  deal_number: string;
  sale_price_cents: number;
  trade_in_value_cents: number;
  trade_in_payoff_cents: number;
  rebate_cents: number;
  doc_fee_cents: number;
  registration_fee_cents: number;
  title_fee_cents: number;
  other_fees_cents: number;
  taxes_cents: number;
  discount_cents: number;
  warranty_cents: number;
  gap_insurance_cents: number;
  subtotal_cents: number;
  total_cents: number;
  deposit_cents: number;
  amount_paid_cents: number;
  balance_due_cents: number;
  status: DealershipSaleStatus;
  payment_method:
    | "cash" | "card" | "financing" | "lease" | "bank_transfer" | "check" | "other"
    | null;
  sold_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  customer_notes: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DealershipSaleDraft = Omit<
  DealershipSale,
  "id" | "store_id" | "deal_number" | "subtotal_cents" | "total_cents" | "balance_due_cents" | "created_at" | "updated_at"
>;

export function useDealershipSales(storeId: string | undefined) {
  const [sales, setSales] = useState<DealershipSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true); setError(null);
    const { data, error: err } = await supabase
      .from("car_dealership_sales")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    if (err) {
      console.error("[useDealershipSales] load failed", err);
      setError("Couldn't load deals.");
      setLoading(false);
      return;
    }
    setSales((data ?? []) as unknown as DealershipSale[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (draft: DealershipSaleDraft) => {
    if (!storeId) return null;
    setSaving(true); setError(null);
    const payload = { store_id: storeId, ...draft };
    const { data, error: err } = await supabase
      .from("car_dealership_sales")
      .insert(payload as never)
      .select("*")
      .single();
    if (err) {
      console.error("[useDealershipSales] create failed", err);
      setError(err.message || "Couldn't create deal.");
      setSaving(false);
      return null;
    }
    const created = data as unknown as DealershipSale;
    setSales((prev) => [created, ...prev]);
    setSaving(false);
    return created;
  }, [storeId]);

  const update = useCallback(async (id: string, patch: Partial<DealershipSaleDraft>) => {
    setSaving(true); setError(null);
    // Don't optimistically apply totals — let the trigger recompute on reload.
    const { data, error: err } = await supabase
      .from("car_dealership_sales")
      .update(patch as never)
      .eq("id", id)
      .select("*")
      .single();
    if (err) {
      console.error("[useDealershipSales] update failed", err);
      setError("Couldn't update deal.");
      setSaving(false);
      return false;
    }
    const updated = data as unknown as DealershipSale;
    setSales((prev) => prev.map((s) => (s.id === id ? updated : s)));
    setSaving(false);
    return true;
  }, []);

  const remove = useCallback(async (id: string) => {
    setSaving(true); setError(null);
    const prev = sales;
    setSales((p) => p.filter((s) => s.id !== id));
    const { error: err } = await supabase
      .from("car_dealership_sales")
      .delete()
      .eq("id", id);
    if (err) {
      console.error("[useDealershipSales] remove failed", err);
      setError("Couldn't delete deal.");
      setSales(prev);
      setSaving(false);
      return false;
    }
    setSaving(false);
    return true;
  }, [sales]);

  return { sales, loading, saving, error, create, update, remove, refresh: load };
}
