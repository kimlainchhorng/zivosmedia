/**
 * Vehicle blackout windows CRUD.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CarRentalBlackoutCategory = "maintenance" | "reserved" | "holiday" | "personal" | "other";

export interface CarRentalBlackout {
  id: string;
  store_id: string;
  vehicle_id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
  category: CarRentalBlackoutCategory;
  created_at: string;
  updated_at: string;
}

export interface CarRentalBlackoutDraft {
  vehicle_id: string;
  starts_at: string;
  ends_at: string;
  reason?: string | null;
  category?: CarRentalBlackoutCategory;
}

export function useCarRentalBlackouts(storeId: string | undefined) {
  const [blackouts, setBlackouts] = useState<CarRentalBlackout[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("car_rental_vehicle_blackouts")
      .select("*")
      .eq("store_id", storeId)
      .order("starts_at", { ascending: true });
    if (err) {
      console.error("[useCarRentalBlackouts] load failed", err);
      setError("Couldn't load blackouts.");
      setLoading(false);
      return;
    }
    setBlackouts((data ?? []) as unknown as CarRentalBlackout[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (draft: CarRentalBlackoutDraft): Promise<CarRentalBlackout | null> => {
    if (!storeId) return null;
    setSaving(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      store_id: storeId,
      vehicle_id: draft.vehicle_id,
      starts_at: draft.starts_at,
      ends_at: draft.ends_at,
      reason: draft.reason?.trim() || null,
      category: draft.category ?? "other",
      created_by_user_id: user?.id ?? null,
    };
    const { data, error: err } = await supabase
      .from("car_rental_vehicle_blackouts")
      .insert(payload as never)
      .select("*")
      .single();
    if (err) {
      console.error("[useCarRentalBlackouts] create failed", err);
      if ((err as any).code === "23P01") {
        setError("That blackout overlaps an existing one for this vehicle.");
      } else {
        setError("Couldn't add blackout.");
      }
      setSaving(false);
      return null;
    }
    const created = data as unknown as CarRentalBlackout;
    setBlackouts((prev) => [...prev, created].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
    setSaving(false);
    return created;
  }, [storeId]);

  const remove = useCallback(async (id: string) => {
    setSaving(true);
    const prev = blackouts;
    setBlackouts((p) => p.filter((b) => b.id !== id));
    const { error: err } = await supabase.from("car_rental_vehicle_blackouts").delete().eq("id", id);
    if (err) {
      console.error("[useCarRentalBlackouts] delete failed", err);
      setError("Couldn't delete blackout.");
      setBlackouts(prev);
    }
    setSaving(false);
  }, [blackouts]);

  return { blackouts, loading, saving, error, create, remove, refresh: load };
}
