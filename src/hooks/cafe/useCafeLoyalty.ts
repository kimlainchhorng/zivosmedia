/**
 * Cafe loyalty — single program config + balances + audit events.
 * Mutations:
 *   • saveProgram(): create-or-update the one program row per store
 *   • findOrCreateBalance(): by phone or user_id (used at till lookup)
 *   • earn(balance_id, points, order_id?) / redeem(balance_id, points, order_id?)
 *   • adjust(balance_id, delta, notes)
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CafeLoyaltyMode = "points_per_dollar" | "stamp_card";

export interface CafeLoyaltyProgram {
  id: string;
  store_id: string;
  mode: CafeLoyaltyMode;
  earn_rate_milli: number;
  redeem_threshold: number;
  reward_value_cents: number;
  birthday_bonus_points: number;
  referral_bonus_points: number;
  expire_after_days: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CafeLoyaltyBalance {
  id: string;
  store_id: string;
  user_id: string | null;
  phone: string | null;
  email: string | null;
  display_name: string | null;
  points: number;
  total_earned: number;
  total_redeemed: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface CafeLoyaltyEvent {
  id: string;
  store_id: string;
  balance_id: string;
  order_id: string | null;
  kind: "earn" | "redeem" | "adjust" | "expire";
  points_change: number;
  notes: string | null;
  created_at: string;
}

export type CafeLoyaltyProgramDraft = Omit<CafeLoyaltyProgram, "id" | "store_id" | "created_at" | "updated_at">;

export interface UseCafeLoyaltyResult {
  program: CafeLoyaltyProgram | null;
  balances: CafeLoyaltyBalance[];
  eventsByBalance: Record<string, CafeLoyaltyEvent[]>;
  loading: boolean;
  saving: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  saveProgram: (draft: CafeLoyaltyProgramDraft) => Promise<void>;
  findOrCreateBalance: (input: { phone?: string; user_id?: string; display_name?: string }) => Promise<CafeLoyaltyBalance | null>;
  earn: (balanceId: string, points: number, orderId?: string | null, notes?: string) => Promise<{ ok: boolean; error?: string }>;
  redeem: (balanceId: string, points: number, orderId?: string | null, notes?: string) => Promise<{ ok: boolean; error?: string }>;
  adjust: (balanceId: string, points: number, notes?: string) => Promise<{ ok: boolean; error?: string }>;
}

export function useCafeLoyalty(storeId: string | undefined): UseCafeLoyaltyResult {
  const [program, setProgram] = useState<CafeLoyaltyProgram | null>(null);
  const [balances, setBalances] = useState<CafeLoyaltyBalance[]>([]);
  const [events, setEvents] = useState<CafeLoyaltyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const [progRes, balRes, evRes] = await Promise.all([
      supabase.from("cafe_loyalty_programs" as never).select("*").eq("store_id", storeId).maybeSingle(),
      supabase.from("cafe_loyalty_balances" as never).select("*").eq("store_id", storeId).order("points", { ascending: false }),
      supabase.from("cafe_loyalty_events" as never).select("*").eq("store_id", storeId).order("created_at", { ascending: false }).limit(200),
    ]);
    if (progRes.error || balRes.error || evRes.error) {
      console.error("[useCafeLoyalty] load", progRes.error || balRes.error || evRes.error);
      setError("Couldn't load loyalty.");
      setLoading(false);
      return;
    }
    setProgram((progRes.data ?? null) as unknown as CafeLoyaltyProgram | null);
    setBalances((balRes.data ?? []) as unknown as CafeLoyaltyBalance[]);
    setEvents((evRes.data ?? []) as unknown as CafeLoyaltyEvent[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const eventsByBalance = useMemo(() => {
    const m: Record<string, CafeLoyaltyEvent[]> = {};
    for (const e of events) {
      m[e.balance_id] = m[e.balance_id] ?? [];
      m[e.balance_id].push(e);
    }
    return m;
  }, [events]);

  const saveProgram = useCallback(async (draft: CafeLoyaltyProgramDraft) => {
    if (!storeId) return;
    setSaving(true);
    setError(null);
    if (program) {
      setProgram({ ...program, ...draft });
      const { error: err } = await supabase
        .from("cafe_loyalty_programs" as never).update(draft as never).eq("id", program.id);
      if (err) { console.error("[useCafeLoyalty] saveProgram update", err); await load(); }
    } else {
      const payload = { store_id: storeId, ...draft };
      const { data, error: err } = await supabase
        .from("cafe_loyalty_programs" as never).insert(payload as never).select("*").single();
      if (err) {
        console.error("[useCafeLoyalty] saveProgram insert", err);
        setError("Couldn't save program.");
      } else {
        setProgram(data as unknown as CafeLoyaltyProgram);
      }
    }
    setSaving(false);
  }, [storeId, program, load]);

  const findOrCreateBalance = useCallback<UseCafeLoyaltyResult["findOrCreateBalance"]>(async (input) => {
    if (!storeId) return null;
    const phone = input.phone?.trim() || null;
    const userId = input.user_id || null;
    if (!phone && !userId) return null;
    // Try local first.
    const local = balances.find((b) =>
      (phone && b.phone === phone) || (userId && b.user_id === userId),
    );
    if (local) return local;
    // Otherwise hit DB.
    let q = supabase.from("cafe_loyalty_balances" as never).select("*").eq("store_id", storeId).limit(1);
    if (phone) q = q.eq("phone", phone);
    else if (userId) q = q.eq("user_id", userId);
    const found = await q.maybeSingle();
    if (found.data) {
      const row = found.data as unknown as CafeLoyaltyBalance;
      setBalances((p) => p.some((b) => b.id === row.id) ? p : [row, ...p]);
      return row;
    }
    // Create.
    const payload = {
      store_id: storeId, phone, user_id: userId,
      display_name: input.display_name ?? null,
    };
    const { data, error: err } = await supabase
      .from("cafe_loyalty_balances" as never).insert(payload as never).select("*").single();
    if (err || !data) {
      console.error("[useCafeLoyalty] findOrCreateBalance", err);
      setError("Couldn't create balance.");
      return null;
    }
    const created = data as unknown as CafeLoyaltyBalance;
    setBalances((p) => [created, ...p]);
    return created;
  }, [storeId, balances]);

  const insertEvent = useCallback(async (input: { balance_id: string; kind: CafeLoyaltyEvent["kind"]; points_change: number; order_id?: string | null; notes?: string }) => {
    if (!storeId) return { ok: false, error: "no store" };
    const payload = {
      store_id: storeId,
      balance_id: input.balance_id,
      kind: input.kind,
      points_change: input.points_change,
      order_id: input.order_id ?? null,
      notes: input.notes ?? null,
    };
    const { error: err } = await supabase.from("cafe_loyalty_events" as never).insert(payload as never);
    if (err) {
      console.error("[useCafeLoyalty] insertEvent", err);
      return { ok: false, error: err.message ?? "Couldn't save event." };
    }
    await load();
    return { ok: true };
  }, [storeId, load]);

  const earn = useCallback((balanceId: string, points: number, orderId?: string | null, notes?: string) =>
    insertEvent({ balance_id: balanceId, kind: "earn", points_change: Math.abs(points), order_id: orderId, notes }),
    [insertEvent]);

  const redeem = useCallback((balanceId: string, points: number, orderId?: string | null, notes?: string) =>
    insertEvent({ balance_id: balanceId, kind: "redeem", points_change: -Math.abs(points), order_id: orderId, notes }),
    [insertEvent]);

  const adjust = useCallback((balanceId: string, points: number, notes?: string) =>
    insertEvent({ balance_id: balanceId, kind: "adjust", points_change: points, notes }),
    [insertEvent]);

  return { program, balances, eventsByBalance, loading, saving, error, refresh: load, saveProgram, findOrCreateBalance, earn, redeem, adjust };
}
