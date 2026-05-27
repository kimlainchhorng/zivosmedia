import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DealershipPromoType = "discount" | "financing" | "lease" | "trade_in_bonus" | "event";
export type DealershipDiscountType = "percent" | "flat";
export type DealershipPromoAppliesTo = "all" | "new" | "used" | "certified" | "specific_make" | "specific_model";

export interface DealershipPromotion {
  id: string;
  store_id: string;
  title: string;
  description: string | null;
  promo_type: DealershipPromoType;
  discount_type: DealershipDiscountType | null;
  discount_amount: number;
  applies_to: DealershipPromoAppliesTo;
  applies_to_make: string | null;
  applies_to_model: string | null;
  financing_apr_bps: number | null;
  financing_term_months: number | null;
  code: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface DealershipPromotionDraft {
  title: string;
  description?: string | null;
  promo_type: DealershipPromoType;
  discount_type?: DealershipDiscountType | null;
  discount_amount?: number;
  applies_to?: DealershipPromoAppliesTo;
  applies_to_make?: string | null;
  applies_to_model?: string | null;
  financing_apr_bps?: number | null;
  financing_term_months?: number | null;
  code?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active?: boolean;
  is_featured?: boolean;
}

export function useDealershipPromotions(storeId: string | undefined) {
  const [promotions, setPromotions] = useState<DealershipPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from("car_dealership_promotions")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    if (err) {
      console.error("[useDealershipPromotions] load failed", err);
      setError("Couldn't load promotions.");
      setLoading(false);
      return;
    }
    setPromotions((data ?? []) as unknown as DealershipPromotion[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (draft: DealershipPromotionDraft): Promise<DealershipPromotion | null> => {
    if (!storeId) return null;
    setSaving(true);
    setError(null);
    const payload = {
      store_id: storeId,
      title: draft.title.trim(),
      description: draft.description?.trim() || null,
      promo_type: draft.promo_type,
      discount_type: draft.discount_type ?? null,
      discount_amount: draft.discount_amount ?? 0,
      applies_to: draft.applies_to ?? "all",
      applies_to_make: draft.applies_to_make || null,
      applies_to_model: draft.applies_to_model || null,
      financing_apr_bps: draft.financing_apr_bps ?? null,
      financing_term_months: draft.financing_term_months ?? null,
      code: draft.code?.trim().toUpperCase() || null,
      starts_at: draft.starts_at ?? null,
      ends_at: draft.ends_at ?? null,
      is_active: draft.is_active ?? true,
      is_featured: draft.is_featured ?? false,
    };
    const { data, error: err } = await supabase
      .from("car_dealership_promotions")
      .insert(payload as never)
      .select("*")
      .single();
    if (err) {
      console.error("[useDealershipPromotions] create failed", err);
      setError((err as any).code === "23505" ? "A promotion with that code already exists." : "Couldn't create promotion.");
      setSaving(false);
      return null;
    }
    const created = data as unknown as DealershipPromotion;
    setPromotions((prev) => [created, ...prev]);
    setSaving(false);
    return created;
  }, [storeId]);

  const update = useCallback(async (id: string, patch: Partial<DealershipPromotionDraft>): Promise<boolean> => {
    setSaving(true);
    const cleaned: Record<string, unknown> = {};
    Object.entries(patch).forEach(([k, v]) => {
      cleaned[k] = k === "code" && typeof v === "string" ? v.trim().toUpperCase() || null : v;
    });
    setPromotions((prev) => prev.map((p) => p.id === id ? ({ ...p, ...cleaned } as DealershipPromotion) : p));
    const { error: err } = await supabase.from("car_dealership_promotions").update(cleaned as never).eq("id", id);
    if (err) {
      console.error("[useDealershipPromotions] update failed", err);
      setError("Couldn't save — refreshing.");
      await load();
      setSaving(false);
      return false;
    }
    setSaving(false);
    return true;
  }, [load]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setSaving(true);
    const snapshot = promotions;
    setPromotions((prev) => prev.filter((p) => p.id !== id));
    const { error: err } = await supabase.from("car_dealership_promotions").delete().eq("id", id);
    if (err) {
      console.error("[useDealershipPromotions] delete failed", err);
      setError("Couldn't delete promotion.");
      setPromotions(snapshot);
      setSaving(false);
      return false;
    }
    setSaving(false);
    return true;
  }, [promotions]);

  return { promotions, loading, saving, error, create, update, remove };
}
