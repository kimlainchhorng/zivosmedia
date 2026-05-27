/**
 * useSalonTimeEntries — owner-managed time clock for stylists.
 * Loads entries since the start of the current week so the section can show
 * "open shift", "today's hours", and "week-to-date hours" without a second
 * round-trip. clockIn enforces the one-open-per-stylist invariant on the
 * server via the partial unique index.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SalonTimeEntry {
  id: string;
  store_id: string;
  stylist_id: string;
  start_at: string;
  end_at: string | null;
  notes: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

function weekStartIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  // Monday-start week.
  const day = d.getDay(); // 0=Sun .. 6=Sat
  const back = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - back);
  return d.toISOString();
}

interface Result {
  entries: SalonTimeEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  clockIn: (stylistId: string) => Promise<void>;
  clockOut: (entryId: string) => Promise<void>;
  remove: (entryId: string) => Promise<void>;
}

export function useSalonTimeEntries(storeId: string | undefined): Result {
  const [entries, setEntries] = useState<SalonTimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!storeId) return;
    setError(null);
    const { data, error: err } = await supabase
      .from("salon_time_entries")
      .select("*")
      .eq("store_id", storeId)
      .gte("start_at", weekStartIso())
      .order("start_at", { ascending: false });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setEntries((data ?? []) as unknown as SalonTimeEntry[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const clockIn = useCallback(async (stylistId: string) => {
    if (!storeId) return;
    const { error: err } = await supabase
      .from("salon_time_entries")
      .insert({ store_id: storeId, stylist_id: stylistId, source: "admin" } as never);
    if (err) {
      // 23505 = unique violation (already clocked in).
      if ((err as any).code === "23505") throw new Error("Already clocked in.");
      throw new Error(err.message);
    }
    await refresh();
  }, [storeId, refresh]);

  const clockOut = useCallback(async (entryId: string) => {
    const { error: err } = await supabase
      .from("salon_time_entries")
      .update({ end_at: new Date().toISOString() } as never)
      .eq("id", entryId);
    if (err) throw new Error(err.message);
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (entryId: string) => {
    const { error: err } = await supabase
      .from("salon_time_entries")
      .delete()
      .eq("id", entryId);
    if (err) throw new Error(err.message);
    await refresh();
  }, [refresh]);

  return { entries, loading, error, refresh, clockIn, clockOut, remove };
}
