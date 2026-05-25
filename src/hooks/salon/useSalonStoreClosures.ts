/**
 * useSalonStoreClosures — store-level closure windows (holidays, vacation).
 * Bookings overlapping a closure are rejected at the DB level via
 * tg_salon_booking_store_closure_guard.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SalonStoreClosure {
  id: string;
  store_id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

interface Result {
  closures: SalonStoreClosure[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  add: (input: { start_at: string; end_at: string; reason?: string | null }) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useSalonStoreClosures(storeId: string | undefined): Result {
  const [closures, setClosures] = useState<SalonStoreClosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!storeId) return;
    setError(null);
    const { data, error: err } = await supabase
      .from("salon_store_closures")
      .select("*")
      .eq("store_id", storeId)
      .order("start_at", { ascending: true });
    if (err) { setError(err.message); setLoading(false); return; }
    setClosures((data ?? []) as unknown as SalonStoreClosure[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const add = useCallback(async (input: { start_at: string; end_at: string; reason?: string | null }) => {
    if (!storeId) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error: err } = await supabase
      .from("salon_store_closures")
      .insert({
        store_id: storeId,
        start_at: input.start_at,
        end_at: input.end_at,
        reason: input.reason?.trim() || null,
        created_by_user_id: user?.id ?? null,
      } as never);
    if (err) {
      if ((err as any).code === "23P01") throw new Error("That overlaps an existing closure.");
      throw new Error(err.message);
    }
    await refresh();
  }, [storeId, refresh]);

  const remove = useCallback(async (id: string) => {
    const { error: err } = await supabase.from("salon_store_closures").delete().eq("id", id);
    if (err) throw new Error(err.message);
    await refresh();
  }, [refresh]);

  return { closures, loading, error, refresh, add, remove };
}
