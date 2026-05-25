/**
 * Car dealership trade-in appraisals CRUD.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DealershipTradeInCondition = "excellent" | "good" | "fair" | "poor" | "salvage";
export type DealershipTradeInStatus = "appraised" | "offered" | "accepted" | "declined" | "completed";

export interface DealershipTradeIn {
  id: string;
  store_id: string;
  sale_id: string | null;
  customer_id: string | null;
  appraiser_user_id: string | null;
  make: string;
  model: string;
  year: number | null;
  trim: string | null;
  vin: string | null;
  license_plate: string | null;
  mileage: number | null;
  color: string | null;
  condition: DealershipTradeInCondition | null;
  appraised_value_cents: number;
  offered_value_cents: number;
  payoff_amount_cents: number;
  payoff_lender: string | null;
  notes: string | null;
  photo_urls: string[];
  status: DealershipTradeInStatus;
  created_at: string;
  updated_at: string;
}

export type DealershipTradeInDraft = Omit<
  DealershipTradeIn,
  "id" | "store_id" | "created_at" | "updated_at"
>;

export function useDealershipTradeIns(storeId: string | undefined) {
  const [tradeIns, setTradeIns] = useState<DealershipTradeIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true); setError(null);
    const { data, error: err } = await supabase
      .from("car_dealership_trade_ins")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    if (err) {
      console.error("[useDealershipTradeIns] load failed", err);
      setError("Couldn't load trade-ins.");
      setLoading(false);
      return;
    }
    setTradeIns((data ?? []) as unknown as DealershipTradeIn[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (draft: DealershipTradeInDraft) => {
    if (!storeId) return null;
    setSaving(true); setError(null);
    const { data, error: err } = await supabase
      .from("car_dealership_trade_ins")
      .insert({ store_id: storeId, ...draft } as never)
      .select("*").single();
    if (err) {
      console.error("[useDealershipTradeIns] create failed", err);
      setError(err.message || "Couldn't add trade-in.");
      setSaving(false);
      return null;
    }
    const created = data as unknown as DealershipTradeIn;
    setTradeIns((prev) => [created, ...prev]);
    setSaving(false);
    return created;
  }, [storeId]);

  const update = useCallback(async (id: string, patch: Partial<DealershipTradeInDraft>) => {
    setSaving(true); setError(null);
    setTradeIns((prev) => prev.map((t) => (t.id === id ? ({ ...t, ...patch } as DealershipTradeIn) : t)));
    const { error: err } = await supabase
      .from("car_dealership_trade_ins").update(patch as never).eq("id", id);
    if (err) { setError("Couldn't update."); setSaving(false); void load(); return false; }
    setSaving(false);
    return true;
  }, [load]);

  const remove = useCallback(async (id: string) => {
    setSaving(true); setError(null);
    const prev = tradeIns;
    setTradeIns((p) => p.filter((t) => t.id !== id));
    const { error: err } = await supabase.from("car_dealership_trade_ins").delete().eq("id", id);
    if (err) { setError("Couldn't delete."); setTradeIns(prev); setSaving(false); return false; }
    setSaving(false);
    return true;
  }, [tradeIns]);

  return { tradeIns, loading, saving, error, create, update, remove, refresh: load };
}
