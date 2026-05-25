/**
 * Cash till lifecycle. Loads the open session (if any) plus recent history,
 * and recomputes the expected cash on demand by summing net cash payments
 * (captured minus refunded) that landed between the session's opened_at and
 * now. Variance = counted - expected at close time.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CafeTillSession {
  id: string;
  store_id: string;
  status: "open" | "closed";
  opened_at: string;
  closed_at: string | null;
  opened_by_user_id: string | null;
  closed_by_user_id: string | null;
  starting_cash_cents: number;
  expected_cash_cents: number | null;
  counted_cash_cents: number | null;
  variance_cents: number | null;
  notes: string | null;
}

interface CashPaymentRow {
  amount_cents: number;
  refunded_cents: number;
  created_at: string;
}

export interface CafeTillDrop {
  id: string;
  till_session_id: string;
  store_id: string;
  amount_cents: number;
  note: string | null;
  dropped_at: string;
}

export function useCafeTill(storeId: string | undefined) {
  const [current, setCurrent] = useState<CafeTillSession | null>(null);
  const [recent, setRecent] = useState<CafeTillSession[]>([]);
  const [drops, setDrops] = useState<CafeTillDrop[]>([]);
  const [expectedLive, setExpectedLive] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const computeExpected = useCallback(async (session: CafeTillSession): Promise<number> => {
    // Cash payments captured in the session window — net of refunds.
    const payRes = await supabase
      .from("cafe_payments" as never)
      .select("amount_cents, refunded_cents, created_at")
      .eq("store_id", session.store_id)
      .eq("method", "cash")
      .eq("status", "captured")
      .gte("created_at", session.opened_at);
    if (payRes.error) throw payRes.error;
    const payRows = (payRes.data ?? []) as unknown as CashPaymentRow[];
    const netCash = payRows.reduce((s, p) => s + (p.amount_cents - p.refunded_cents), 0);
    // Drops leave the drawer mid-shift — subtract them.
    const dropRes = await supabase
      .from("cafe_till_drops" as never)
      .select("amount_cents")
      .eq("till_session_id", session.id);
    if (dropRes.error) throw dropRes.error;
    const dropTotal = ((dropRes.data ?? []) as unknown as Array<{ amount_cents: number }>)
      .reduce((s, d) => s + d.amount_cents, 0);
    return session.starting_cash_cents + netCash - dropTotal;
  }, []);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const [openRes, listRes] = await Promise.all([
      supabase.from("cafe_till_sessions" as never)
        .select("*").eq("store_id", storeId).eq("status", "open")
        .maybeSingle(),
      supabase.from("cafe_till_sessions" as never)
        .select("*").eq("store_id", storeId).eq("status", "closed")
        .order("closed_at", { ascending: false }).limit(5),
    ]);
    if (openRes.error || listRes.error) {
      console.error("[useCafeTill] load", openRes.error || listRes.error);
      setError("Couldn't load till data.");
      setLoading(false);
      return;
    }
    const cur = (openRes.data ?? null) as unknown as CafeTillSession | null;
    setCurrent(cur);
    setRecent((listRes.data ?? []) as unknown as CafeTillSession[]);
    if (cur) {
      const [dropsRes] = await Promise.all([
        supabase.from("cafe_till_drops" as never)
          .select("id, till_session_id, store_id, amount_cents, note, dropped_at")
          .eq("till_session_id", cur.id).order("dropped_at", { ascending: false }),
      ]);
      setDrops((dropsRes.data ?? []) as unknown as CafeTillDrop[]);
      try { setExpectedLive(await computeExpected(cur)); }
      catch (e) { console.error("[useCafeTill] expected", e); setExpectedLive(null); }
    } else {
      setDrops([]);
      setExpectedLive(null);
    }
    setLoading(false);
  }, [storeId, computeExpected]);

  useEffect(() => { void load(); }, [load]);

  const openTill = useCallback(async (startingCashCents: number): Promise<boolean> => {
    if (!storeId) return false;
    setWorking(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error: err } = await supabase
      .from("cafe_till_sessions" as never)
      .insert({
        store_id: storeId,
        starting_cash_cents: Math.max(0, startingCashCents),
        opened_by_user_id: userData.user?.id ?? null,
      } as never);
    setWorking(false);
    if (err) {
      console.error("[useCafeTill] open", err);
      setError(err.message.includes("one_open_per_store") ? "A till session is already open." : "Couldn't open till.");
      return false;
    }
    await load();
    return true;
  }, [storeId, load]);

  const closeTill = useCallback(async (countedCashCents: number, notes: string | null): Promise<boolean> => {
    if (!current) return false;
    setWorking(true);
    let expected: number;
    try { expected = await computeExpected(current); }
    catch (e) {
      console.error("[useCafeTill] close expected", e);
      setError("Couldn't compute expected cash."); setWorking(false); return false;
    }
    const counted = Math.max(0, countedCashCents);
    const variance = counted - expected;
    const { data: userData } = await supabase.auth.getUser();
    const { error: err } = await supabase
      .from("cafe_till_sessions" as never)
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
        closed_by_user_id: userData.user?.id ?? null,
        expected_cash_cents: expected,
        counted_cash_cents: counted,
        variance_cents: variance,
        notes: notes && notes.trim() ? notes.trim() : null,
      } as never)
      .eq("id", current.id);
    setWorking(false);
    if (err) {
      console.error("[useCafeTill] close", err);
      setError("Couldn't close till.");
      return false;
    }
    await load();
    return true;
  }, [current, computeExpected, load]);

  const recordDrop = useCallback(async (amountCents: number, note: string | null): Promise<boolean> => {
    if (!current || !storeId) return false;
    const amt = Math.round(amountCents);
    if (!amt || amt <= 0) { setError("Drop amount must be positive."); return false; }
    setWorking(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error: err } = await supabase
      .from("cafe_till_drops" as never)
      .insert({
        till_session_id: current.id,
        store_id: storeId,
        amount_cents: amt,
        note: note && note.trim() ? note.trim() : null,
        dropped_by_user_id: userData.user?.id ?? null,
      } as never);
    setWorking(false);
    if (err) {
      console.error("[useCafeTill] recordDrop", err);
      setError("Couldn't record drop.");
      return false;
    }
    await load();
    return true;
  }, [current, storeId, load]);

  return { current, recent, drops, expectedLive, loading, working, error, openTill, closeTill, recordDrop, refresh: load };
}
