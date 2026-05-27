/**
 * Cafe promotions CRUD.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CafePromoKind = "percent" | "fixed_cents";

export interface CafePromotion {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  kind: CafePromoKind;
  amount: number;
  code: string | null;
  start_at: string | null;
  end_at: string | null;
  weekdays: number[];
  hour_start: number | null;
  hour_end: number | null;
  min_subtotal_cents: number;
  max_redemptions: number | null;
  redemption_count: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type CafePromotionDraft = Omit<CafePromotion, "id" | "store_id" | "created_at" | "updated_at" | "sort_order" | "redemption_count">;

export interface UseCafePromotionsResult {
  promotions: CafePromotion[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (draft: CafePromotionDraft) => Promise<CafePromotion | null>;
  update: (id: string, patch: Partial<CafePromotionDraft & { sort_order: number }>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useCafePromotions(storeId: string | undefined): UseCafePromotionsResult {
  const [promotions, setPromotions] = useState<CafePromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("cafe_promotions" as never)
      .select("*")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (err) {
      console.error("[useCafePromotions] load", err);
      setError("Couldn't load promotions.");
      setLoading(false);
      return;
    }
    setPromotions((data ?? []) as unknown as CafePromotion[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (draft: CafePromotionDraft) => {
    if (!storeId) return null;
    setSaving(true);
    const sort_order = promotions.length === 0 ? 0 : Math.max(...promotions.map((p) => p.sort_order)) + 10;
    const payload = { store_id: storeId, sort_order, ...draft, name: draft.name.trim() };
    const { data, error: err } = await supabase
      .from("cafe_promotions" as never).insert(payload as never).select("*").single();
    setSaving(false);
    if (err) {
      console.error("[useCafePromotions] create", err);
      setError(err.message?.includes("unique") ? "Code already in use." : "Couldn't save promotion.");
      return null;
    }
    const created = data as unknown as CafePromotion;
    setPromotions((p) => [created, ...p]);
    return created;
  }, [storeId, promotions]);

  const update = useCallback(async (id: string, patch: Partial<CafePromotionDraft & { sort_order: number }>) => {
    setSaving(true);
    setPromotions((p) => p.map((row) => row.id === id ? ({ ...row, ...patch } as CafePromotion) : row));
    const { error: err } = await supabase.from("cafe_promotions" as never).update(patch as never).eq("id", id);
    setSaving(false);
    if (err) { console.error("[useCafePromotions] update", err); await load(); }
  }, [load]);

  const remove = useCallback(async (id: string) => {
    const prev = promotions;
    setPromotions((p) => p.filter((row) => row.id !== id));
    const { error: err } = await supabase.from("cafe_promotions" as never).delete().eq("id", id);
    if (err) { console.error("[useCafePromotions] remove", err); setPromotions(prev); }
  }, [promotions]);

  return { promotions, loading, saving, error, refresh: load, create, update, remove };
}
