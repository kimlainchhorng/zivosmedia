/**
 * Cafe baristas (staff roster) CRUD.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CafeBaristaRole = "owner" | "manager" | "barista" | "kitchen" | "server" | "other";

export interface CafeBarista {
  id: string;
  store_id: string;
  display_name: string;
  role: CafeBaristaRole;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  hourly_rate_cents: number;
  till_pin: string | null;
  user_id: string | null;
  specialties: string[];
  is_active: boolean;
  sort_order: number;
  hired_on: string | null;
  created_at: string;
  updated_at: string;
}

export type CafeBaristaDraft = Omit<CafeBarista, "id" | "store_id" | "created_at" | "updated_at" | "sort_order">;

export interface UseCafeBaristasResult {
  baristas: CafeBarista[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (draft: CafeBaristaDraft) => Promise<CafeBarista | null>;
  update: (id: string, patch: Partial<CafeBaristaDraft & { sort_order: number }>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useCafeBaristas(storeId: string | undefined): UseCafeBaristasResult {
  const [baristas, setBaristas] = useState<CafeBarista[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("cafe_baristas" as never)
      .select("*")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (err) {
      console.error("[useCafeBaristas] load", err);
      setError("Couldn't load baristas.");
      setLoading(false);
      return;
    }
    setBaristas((data ?? []) as unknown as CafeBarista[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (draft: CafeBaristaDraft) => {
    if (!storeId) return null;
    setSaving(true);
    const sort_order = baristas.length === 0 ? 0 : Math.max(...baristas.map((b) => b.sort_order)) + 10;
    const payload = { store_id: storeId, sort_order, ...draft, display_name: draft.display_name.trim() };
    const { data, error: err } = await supabase
      .from("cafe_baristas" as never).insert(payload as never).select("*").single();
    setSaving(false);
    if (err) {
      console.error("[useCafeBaristas] create", err);
      setError("Couldn't add barista.");
      return null;
    }
    const created = data as unknown as CafeBarista;
    setBaristas((p) => [...p, created]);
    return created;
  }, [storeId, baristas]);

  const update = useCallback(async (id: string, patch: Partial<CafeBaristaDraft & { sort_order: number }>) => {
    setSaving(true);
    setBaristas((p) => p.map((b) => b.id === id ? ({ ...b, ...patch } as CafeBarista) : b));
    const { error: err } = await supabase.from("cafe_baristas" as never).update(patch as never).eq("id", id);
    setSaving(false);
    if (err) { console.error("[useCafeBaristas] update", err); await load(); }
  }, [load]);

  const remove = useCallback(async (id: string) => {
    const prev = baristas;
    setBaristas((p) => p.filter((b) => b.id !== id));
    const { error: err } = await supabase.from("cafe_baristas" as never).delete().eq("id", id);
    if (err) { console.error("[useCafeBaristas] remove", err); setBaristas(prev); }
  }, [baristas]);

  return { baristas, loading, saving, error, refresh: load, create, update, remove };
}
