/**
 * Sums each barista's lifetime tip payouts. Pulls payout lines for the
 * current store via a join on the parent payout header (RLS does the
 * store-owner gate). Returns a Map keyed by barista_id, plus the total
 * across everyone in case the caller wants a header stat.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PayoutLineRow {
  barista_id: string;
  payout_cents: number;
  cafe_tip_payouts: { store_id: string } | null;
}

export function useCafeBaristaLifetimeTips(storeId: string | undefined) {
  const [byBarista, setByBarista] = useState<Map<string, number>>(new Map());
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    // PostgREST inner-join on the parent so we can filter by store. Without
    // !inner the join is left-outer and the store_id filter would not work
    // correctly for non-matching parents.
    const { data, error } = await supabase
      .from("cafe_tip_payout_lines" as never)
      .select("barista_id, payout_cents, cafe_tip_payouts!inner(store_id)")
      .eq("cafe_tip_payouts.store_id", storeId);
    if (error) {
      console.error("[useCafeBaristaLifetimeTips] load", error);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as unknown as PayoutLineRow[];
    const m = new Map<string, number>();
    let t = 0;
    for (const r of rows) {
      m.set(r.barista_id, (m.get(r.barista_id) ?? 0) + r.payout_cents);
      t += r.payout_cents;
    }
    setByBarista(m);
    setTotal(t);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  return { byBarista, total, loading, refresh: load };
}
