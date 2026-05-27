/**
 * Cafe shifts — planned schedule blocks. Distinct from cafe_time_entries
 * (the actual clock-in/out log). The page is a 7-day grid; this hook
 * returns shifts in a [from, to) window and exposes simple CRUD.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CafeShiftStatus = "scheduled" | "in_progress" | "completed" | "no_show" | "cancelled";

export interface CafeShift {
  id: string;
  store_id: string;
  barista_id: string;
  starts_at: string;
  ends_at: string;
  role: string | null;
  status: CafeShiftStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
export type CafeShiftDraft = Omit<CafeShift, "id" | "store_id" | "created_at" | "updated_at" | "status"> & { status?: CafeShiftStatus };

export interface UseCafeShiftsResult {
  shifts: CafeShift[];
  shiftsByBarista: Record<string, CafeShift[]>;
  loading: boolean;
  saving: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (draft: CafeShiftDraft) => Promise<CafeShift | null>;
  update: (id: string, patch: Partial<CafeShiftDraft>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setStatus: (id: string, status: CafeShiftStatus) => Promise<void>;
}

export function useCafeShifts(storeId: string | undefined, opts?: { from?: string; to?: string }): UseCafeShiftsResult {
  const [shifts, setShifts] = useState<CafeShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default window: 7 days back / 21 days forward.
  const from = opts?.from ?? new Date(Date.now() - 7 * 86_400_000).toISOString();
  const to = opts?.to ?? new Date(Date.now() + 21 * 86_400_000).toISOString();

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("cafe_shifts" as never)
      .select("*")
      .eq("store_id", storeId)
      .gte("starts_at", from)
      .lt("starts_at", to)
      .order("starts_at", { ascending: true });
    if (err) {
      console.error("[useCafeShifts] load", err);
      setError("Couldn't load shifts.");
      setLoading(false);
      return;
    }
    setShifts((data ?? []) as unknown as CafeShift[]);
    setLoading(false);
  }, [storeId, from, to]);

  useEffect(() => { void load(); }, [load]);

  const shiftsByBarista = useMemo(() => {
    const m: Record<string, CafeShift[]> = {};
    for (const s of shifts) {
      m[s.barista_id] = m[s.barista_id] ?? [];
      m[s.barista_id].push(s);
    }
    return m;
  }, [shifts]);

  const create = useCallback(async (draft: CafeShiftDraft) => {
    if (!storeId) return null;
    if (new Date(draft.ends_at) <= new Date(draft.starts_at)) {
      setError("End time must be after start time.");
      return null;
    }
    setSaving(true);
    const payload = {
      store_id: storeId,
      barista_id: draft.barista_id,
      starts_at: draft.starts_at,
      ends_at: draft.ends_at,
      role: draft.role ?? null,
      notes: draft.notes ?? null,
      status: draft.status ?? "scheduled",
    };
    const { data, error: err } = await supabase
      .from("cafe_shifts" as never).insert(payload as never).select("*").single();
    setSaving(false);
    if (err) {
      console.error("[useCafeShifts] create", err);
      setError("Couldn't create shift.");
      return null;
    }
    const created = data as unknown as CafeShift;
    setShifts((p) => [...p, created].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
    return created;
  }, [storeId]);

  const update = useCallback(async (id: string, patch: Partial<CafeShiftDraft>) => {
    setSaving(true);
    setShifts((p) => p.map((s) => s.id === id ? ({ ...s, ...patch } as CafeShift) : s));
    const { error: err } = await supabase.from("cafe_shifts" as never).update(patch as never).eq("id", id);
    setSaving(false);
    if (err) { console.error("[useCafeShifts] update", err); await load(); }
  }, [load]);

  const remove = useCallback(async (id: string) => {
    const prev = shifts;
    setShifts((p) => p.filter((s) => s.id !== id));
    const { error: err } = await supabase.from("cafe_shifts" as never).delete().eq("id", id);
    if (err) { console.error("[useCafeShifts] remove", err); setShifts(prev); }
  }, [shifts]);

  const setStatus = useCallback(async (id: string, status: CafeShiftStatus) => {
    return update(id, { status } as Partial<CafeShiftDraft>);
  }, [update]);

  return { shifts, shiftsByBarista, loading, saving, error, refresh: load, create, update, remove, setStatus };
}
