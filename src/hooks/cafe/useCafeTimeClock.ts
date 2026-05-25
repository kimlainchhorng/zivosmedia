/**
 * Cafe time clock — clock-in / clock-out flow.
 *   • clockIn(barista_id) opens a row (one open shift per barista, enforced
 *     by a partial unique index).
 *   • clockOut(entry_id) closes the open row; the BEFORE trigger fills in
 *     minutes_worked.
 *   • A small in-memory tick keeps "elapsed today" labels fresh without
 *     hitting the DB.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CafeTimeEntry {
  id: string;
  store_id: string;
  barista_id: string;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  hourly_rate_cents_snapshot: number;
  minutes_worked: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UseCafeTimeClockResult {
  entries: CafeTimeEntry[];
  openByBarista: Record<string, CafeTimeEntry | undefined>;
  loading: boolean;
  saving: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  clockIn: (baristaId: string) => Promise<CafeTimeEntry | null>;
  clockOut: (entryId: string, breakMinutes?: number) => Promise<void>;
  updateEntry: (entryId: string, patch: Partial<Pick<CafeTimeEntry, "clock_in" | "clock_out" | "break_minutes" | "notes">>) => Promise<void>;
  removeEntry: (entryId: string) => Promise<void>;
}

const SINCE_DAYS = 14;

export function useCafeTimeClock(storeId: string | undefined): UseCafeTimeClockResult {
  const [entries, setEntries] = useState<CafeTimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const since = new Date(Date.now() - SINCE_DAYS * 86_400_000).toISOString();
    const { data, error: err } = await supabase
      .from("cafe_time_entries" as never)
      .select("*")
      .eq("store_id", storeId)
      .gte("clock_in", since)
      .order("clock_in", { ascending: false });
    if (err) {
      console.error("[useCafeTimeClock] load", err);
      setError("Couldn't load time entries.");
      setLoading(false);
      return;
    }
    setEntries((data ?? []) as unknown as CafeTimeEntry[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const openByBarista = useMemo(() => {
    const out: Record<string, CafeTimeEntry | undefined> = {};
    for (const e of entries) {
      if (!e.clock_out) out[e.barista_id] = e;
    }
    return out;
  }, [entries]);

  const clockIn = useCallback(async (baristaId: string) => {
    if (!storeId) return null;
    if (openByBarista[baristaId]) {
      setError("Already clocked in.");
      return null;
    }
    setSaving(true);
    const payload = { store_id: storeId, barista_id: baristaId };
    const { data, error: err } = await supabase
      .from("cafe_time_entries" as never).insert(payload as never).select("*").single();
    setSaving(false);
    if (err) {
      console.error("[useCafeTimeClock] clockIn", err);
      setError("Couldn't clock in.");
      return null;
    }
    const created = data as unknown as CafeTimeEntry;
    setEntries((p) => [created, ...p]);
    return created;
  }, [storeId, openByBarista]);

  const clockOut = useCallback(async (entryId: string, breakMinutes = 0) => {
    setSaving(true);
    const patch: Record<string, unknown> = { clock_out: new Date().toISOString() };
    if (breakMinutes > 0) patch.break_minutes = breakMinutes;
    const { data, error: err } = await supabase
      .from("cafe_time_entries" as never).update(patch as never).eq("id", entryId).select("*").single();
    setSaving(false);
    if (err) { console.error("[useCafeTimeClock] clockOut", err); await load(); return; }
    const updated = data as unknown as CafeTimeEntry;
    setEntries((p) => p.map((e) => e.id === entryId ? updated : e));
  }, [load]);

  const updateEntry = useCallback(async (entryId: string, patch: Partial<Pick<CafeTimeEntry, "clock_in" | "clock_out" | "break_minutes" | "notes">>) => {
    setSaving(true);
    const { data, error: err } = await supabase
      .from("cafe_time_entries" as never).update(patch as never).eq("id", entryId).select("*").single();
    setSaving(false);
    if (err) { console.error("[useCafeTimeClock] updateEntry", err); await load(); return; }
    const updated = data as unknown as CafeTimeEntry;
    setEntries((p) => p.map((e) => e.id === entryId ? updated : e));
  }, [load]);

  const removeEntry = useCallback(async (entryId: string) => {
    const prev = entries;
    setEntries((p) => p.filter((e) => e.id !== entryId));
    const { error: err } = await supabase.from("cafe_time_entries" as never).delete().eq("id", entryId);
    if (err) { console.error("[useCafeTimeClock] removeEntry", err); setEntries(prev); }
  }, [entries]);

  return { entries, openByBarista, loading, saving, error, refresh: load, clockIn, clockOut, updateEntry, removeEntry };
}
