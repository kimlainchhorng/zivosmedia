/**
 * Cafe tip pool — read tip_cents already captured on cafe_payments, and
 * distribute it across baristas using a simple split (equal, by hours,
 * or weighted).
 *
 * No new schema yet: distributions are computed client-side from
 * existing time entries. Persistence of per-shift payouts can be added
 * later as cafe_tip_distributions; for now the section shows the math.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TipSplitMode = "equal" | "by_hours" | "weighted";

export interface TipPayoutLine {
  barista_id: string;
  display_name: string;
  minutes_worked: number;
  weight: number;
  payout_cents: number;
}

interface PaymentRow { tip_cents: number; created_at: string }
interface TimeEntryRow { barista_id: string; minutes_worked: number; clock_in: string; clock_out: string | null }
interface BaristaRow { id: string; display_name: string; is_active: boolean }

export interface CafeTipPayout {
  id: string;
  store_id: string;
  window_start: string;
  window_end: string;
  mode: TipSplitMode;
  total_cents: number;
  paid_at: string;
  notes: string | null;
}

export function useCafeTips(storeId: string | undefined, windowDays = 1) {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [entries, setEntries] = useState<TimeEntryRow[]>([]);
  const [baristas, setBaristas] = useState<BaristaRow[]>([]);
  const [payouts, setPayouts] = useState<CafeTipPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<TipSplitMode>("by_hours");
  const [weights, setWeights] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const since = new Date(Date.now() - windowDays * 86_400_000).toISOString();
    const [payRes, teRes, bRes, poRes] = await Promise.all([
      supabase.from("cafe_payments" as never)
        .select("tip_cents, created_at")
        .eq("store_id", storeId)
        .gte("created_at", since)
        .gt("tip_cents", 0),
      supabase.from("cafe_time_entries" as never)
        .select("barista_id, minutes_worked, clock_in, clock_out")
        .eq("store_id", storeId)
        .gte("clock_in", since),
      supabase.from("cafe_baristas" as never)
        .select("id, display_name, is_active")
        .eq("store_id", storeId),
      supabase.from("cafe_tip_payouts" as never)
        .select("id, store_id, window_start, window_end, mode, total_cents, paid_at, notes")
        .eq("store_id", storeId)
        .order("paid_at", { ascending: false })
        .limit(10),
    ]);
    if (payRes.error || teRes.error || bRes.error || poRes.error) {
      console.error("[useCafeTips] load", payRes.error || teRes.error || bRes.error || poRes.error);
      setError("Couldn't load tip data.");
      setLoading(false);
      return;
    }
    setPayments((payRes.data ?? []) as unknown as PaymentRow[]);
    setEntries((teRes.data ?? []) as unknown as TimeEntryRow[]);
    setBaristas((bRes.data ?? []) as unknown as BaristaRow[]);
    setPayouts((poRes.data ?? []) as unknown as CafeTipPayout[]);
    setLoading(false);
  }, [storeId, windowDays]);

  useEffect(() => { void load(); }, [load]);

  const poolCents = useMemo(() => payments.reduce((s, p) => s + p.tip_cents, 0), [payments]);

  const minutesByBarista = useMemo(() => {
    const m = new Map<string, number>();
    const now = Date.now();
    for (const e of entries) {
      const live = e.clock_out
        ? e.minutes_worked
        : Math.max(0, Math.floor((now - new Date(e.clock_in).getTime()) / 60_000));
      m.set(e.barista_id, (m.get(e.barista_id) ?? 0) + live);
    }
    return m;
  }, [entries]);

  const distribution = useMemo<TipPayoutLine[]>(() => {
    // Eligible baristas = either worked in window, or have a non-zero
    // explicit weight (so owner can include a barista with no clocked hours).
    const ids = new Set<string>();
    for (const e of entries) ids.add(e.barista_id);
    for (const id of Object.keys(weights)) if (weights[id] > 0) ids.add(id);
    const eligible = baristas.filter((b) => b.is_active && ids.has(b.id));
    if (eligible.length === 0) return [];

    let lines: TipPayoutLine[] = eligible.map((b) => ({
      barista_id: b.id,
      display_name: b.display_name,
      minutes_worked: minutesByBarista.get(b.id) ?? 0,
      weight: 0,
      payout_cents: 0,
    }));

    if (mode === "equal") {
      const share = Math.floor(poolCents / lines.length);
      let rem = poolCents - share * lines.length;
      lines = lines.map((l, idx) => ({ ...l, weight: 1, payout_cents: share + (idx < rem ? 1 : 0) }));
    } else if (mode === "by_hours") {
      const totalMin = lines.reduce((s, l) => s + l.minutes_worked, 0);
      if (totalMin === 0) return lines;
      let running = 0;
      lines = lines.map((l, idx) => {
        const exact = (l.minutes_worked / totalMin) * poolCents;
        const flat = Math.floor(exact);
        running += flat;
        return { ...l, weight: l.minutes_worked, payout_cents: flat };
      });
      // Push the rounding remainder to the largest-share line.
      const rem = poolCents - running;
      if (rem !== 0 && lines.length > 0) {
        const idx = lines.reduce((bestIdx, l, i, arr) => l.minutes_worked > arr[bestIdx].minutes_worked ? i : bestIdx, 0);
        lines[idx] = { ...lines[idx], payout_cents: lines[idx].payout_cents + rem };
      }
    } else {
      const totalW = lines.reduce((s, l) => s + (weights[l.barista_id] ?? 0), 0);
      if (totalW === 0) return lines.map((l) => ({ ...l, payout_cents: 0 }));
      let running = 0;
      lines = lines.map((l) => {
        const w = weights[l.barista_id] ?? 0;
        const exact = (w / totalW) * poolCents;
        const flat = Math.floor(exact);
        running += flat;
        return { ...l, weight: w, payout_cents: flat };
      });
      const rem = poolCents - running;
      if (rem !== 0 && lines.length > 0) {
        const idx = lines.reduce((bestIdx, l, i, arr) => (weights[l.barista_id] ?? 0) > (weights[arr[bestIdx].barista_id] ?? 0) ? i : bestIdx, 0);
        lines[idx] = { ...lines[idx], payout_cents: lines[idx].payout_cents + rem };
      }
    }
    return lines.sort((a, b) => b.payout_cents - a.payout_cents);
  }, [baristas, entries, minutesByBarista, poolCents, mode, weights]);

  const setWeight = useCallback((baristaId: string, weight: number) => {
    setWeights((p) => ({ ...p, [baristaId]: Math.max(0, weight) }));
  }, []);

  const payOut = useCallback(async (notes: string | null): Promise<boolean> => {
    if (!storeId) return false;
    if (poolCents <= 0) { setError("No tips to pay out."); return false; }
    if (distribution.length === 0) { setError("No eligible baristas."); return false; }
    setPaying(true);
    const windowEnd = new Date().toISOString();
    const windowStart = new Date(Date.now() - windowDays * 86_400_000).toISOString();
    const { data: userData } = await supabase.auth.getUser();
    const { data: headerData, error: headerErr } = await supabase
      .from("cafe_tip_payouts" as never)
      .insert({
        store_id: storeId,
        window_start: windowStart,
        window_end: windowEnd,
        mode,
        total_cents: poolCents,
        paid_by_user_id: userData.user?.id ?? null,
        notes: notes && notes.trim() ? notes.trim() : null,
      } as never)
      .select("id")
      .single();
    if (headerErr || !headerData) {
      console.error("[useCafeTips] payOut header", headerErr);
      setError("Couldn't record payout.");
      setPaying(false);
      return false;
    }
    const payoutId = (headerData as { id: string }).id;
    const lineRows = distribution.map((l) => ({
      payout_id: payoutId,
      barista_id: l.barista_id,
      display_name: l.display_name,
      minutes_worked: l.minutes_worked,
      weight: l.weight,
      payout_cents: l.payout_cents,
    }));
    const { error: linesErr } = await supabase
      .from("cafe_tip_payout_lines" as never)
      .insert(lineRows as never);
    setPaying(false);
    if (linesErr) {
      console.error("[useCafeTips] payOut lines", linesErr);
      setError("Couldn't record payout lines.");
      // Best-effort cleanup of the orphan header.
      void supabase.from("cafe_tip_payouts" as never).delete().eq("id", payoutId);
      return false;
    }
    await load();
    return true;
  }, [storeId, poolCents, distribution, mode, windowDays, load]);

  return {
    poolCents, distribution, mode, setMode, weights, setWeight,
    payouts, paying, payOut,
    loading, error, refresh: load,
  };
}
