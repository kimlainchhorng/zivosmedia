/**
 * Cafe table reservations. Loads upcoming bookings (defaults to anything
 * reserved_for >= 1 hour ago) so the owner can see "happening soon" without
 * scrolling. Past-cancelled rows fall out naturally.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CafeReservationStatus =
  | "pending" | "confirmed" | "seated" | "cancelled" | "no_show";

export interface CafeReservation {
  id: string;
  store_id: string;
  table_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  party_size: number;
  reserved_for: string;
  duration_minutes: number;
  status: CafeReservationStatus;
  notes: string | null;
  created_at: string;
}

export interface CafeReservationDraft {
  table_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  party_size: number;
  reserved_for: string; // ISO
  duration_minutes: number;
  status?: CafeReservationStatus;
  notes: string | null;
}

export function useCafeReservations(storeId: string | undefined) {
  const [reservations, setReservations] = useState<CafeReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    // 1-hour back-window catches just-seated bookings so the manager can
    // still mark no-show / cancel without typing the URL.
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data, error: err } = await supabase
      .from("cafe_reservations" as never)
      .select("*")
      .eq("store_id", storeId)
      .gte("reserved_for", since)
      .order("reserved_for", { ascending: true });
    if (err) {
      console.error("[useCafeReservations] load", err);
      setError("Couldn't load reservations.");
      setLoading(false);
      return;
    }
    setReservations((data ?? []) as unknown as CafeReservation[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (draft: CafeReservationDraft): Promise<boolean> => {
    if (!storeId) return false;
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error: err } = await supabase
      .from("cafe_reservations" as never)
      .insert({
        store_id: storeId,
        ...draft,
        created_by_user_id: userData.user?.id ?? null,
      } as never);
    setSaving(false);
    if (err) {
      console.error("[useCafeReservations] create", err);
      setError("Couldn't save reservation.");
      return false;
    }
    await load();
    return true;
  }, [storeId, load]);

  const setStatus = useCallback(async (id: string, status: CafeReservationStatus): Promise<boolean> => {
    setSaving(true);
    const { error: err } = await supabase
      .from("cafe_reservations" as never)
      .update({ status } as never)
      .eq("id", id);
    setSaving(false);
    if (err) {
      console.error("[useCafeReservations] setStatus", err);
      setError("Couldn't update reservation.");
      return false;
    }
    setReservations((p) => p.map((r) => (r.id === id ? { ...r, status } : r)));
    return true;
  }, []);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setSaving(true);
    const { error: err } = await supabase
      .from("cafe_reservations" as never)
      .delete()
      .eq("id", id);
    setSaving(false);
    if (err) {
      console.error("[useCafeReservations] remove", err);
      setError("Couldn't remove reservation.");
      return false;
    }
    setReservations((p) => p.filter((r) => r.id !== id));
    return true;
  }, []);

  return { reservations, loading, saving, error, create, setStatus, remove, refresh: load };
}
