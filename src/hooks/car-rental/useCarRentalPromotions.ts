/**
 * Promo codes CRUD for the car-rental module.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CarRentalPromoKind = "percent" | "flat";

export interface CarRentalPromotion {
  id: string;
  store_id: string;
  code: string;
  description: string | null;
  kind: CarRentalPromoKind;
  amount: number;
  min_rental_days: number;
  min_amount_cents: number;
  max_redemptions: number | null;
  max_per_customer: number | null;
  current_redemptions: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CarRentalPromotionDraft {
  code: string;
  description?: string | null;
  kind: CarRentalPromoKind;
  amount: number;
  min_rental_days?: number;
  min_amount_cents?: number;
  max_redemptions?: number | null;
  max_per_customer?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active?: boolean;
}

export function useCarRentalPromotions(storeId: string | undefined) {
  const [promos, setPromos] = useState<CarRentalPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from("car_rental_promotions")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    if (err) {
      console.error("[useCarRentalPromotions] load failed", err);
      setError("Couldn't load promotions.");
      setLoading(false);
      return;
    }
    setPromos((data ?? []) as unknown as CarRentalPromotion[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (draft: CarRentalPromotionDraft): Promise<CarRentalPromotion | null> => {
    if (!storeId) return null;
    setSaving(true);
    setError(null);
    const payload = {
      store_id: storeId,
      code: draft.code.trim().toUpperCase(),
      description: draft.description?.trim() || null,
      kind: draft.kind,
      amount: draft.amount,
      min_rental_days: draft.min_rental_days ?? 1,
      min_amount_cents: draft.min_amount_cents ?? 0,
      max_redemptions: draft.max_redemptions ?? null,
      max_per_customer: draft.max_per_customer ?? null,
      starts_at: draft.starts_at ?? null,
      ends_at: draft.ends_at ?? null,
      is_active: draft.is_active ?? true,
    };
    const { data, error: err } = await supabase
      .from("car_rental_promotions")
      .insert(payload as never)
      .select("*")
      .single();
    if (err) {
      console.error("[useCarRentalPromotions] create failed", err);
      if ((err as any).code === "23505") {
        setError("A promo with that code already exists.");
      } else {
        setError("Couldn't add promotion.");
      }
      setSaving(false);
      return null;
    }
    const created = data as unknown as CarRentalPromotion;
    setPromos((prev) => [created, ...prev]);
    setSaving(false);
    return created;
  }, [storeId]);

  const update = useCallback(async (id: string, patch: Partial<CarRentalPromotionDraft>) => {
    setSaving(true);
    const cleaned: Record<string, unknown> = {};
    Object.entries(patch).forEach(([k, v]) => { cleaned[k] = typeof v === "string" && k === "code" ? v.toUpperCase() : v; });
    setPromos((prev) => prev.map((p) => p.id === id ? ({ ...p, ...cleaned } as CarRentalPromotion) : p));
    const { error: err } = await supabase.from("car_rental_promotions").update(cleaned as never).eq("id", id);
    if (err) {
      console.error("[useCarRentalPromotions] update failed", err);
      setError("Couldn't save changes — refreshing.");
      await load();
    }
    setSaving(false);
  }, [load]);

  const remove = useCallback(async (id: string) => {
    setSaving(true);
    const prev = promos;
    setPromos((p) => p.filter((x) => x.id !== id));
    const { error: err } = await supabase.from("car_rental_promotions").delete().eq("id", id);
    if (err) {
      console.error("[useCarRentalPromotions] delete failed", err);
      setError("Couldn't delete promotion.");
      setPromos(prev);
    }
    setSaving(false);
  }, [promos]);

  return { promos, loading, saving, error, create, update, remove, refresh: load };
}
