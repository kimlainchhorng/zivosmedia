/**
 * Inventory variance + wastage tally over a rolling window. Pulls movements
 * with reason in ('adjust', 'wastage') and rolls them up per ingredient.
 *
 * - `adjust` = stocktake correction (anomalous shrinkage or surplus)
 * - `wastage` = intentional write-off (expired, dropped, comped)
 *
 * Cost lost is computed using the movement's own `unit_cost_cents` snapshot
 * when present (so a historic cost change doesn't rewrite past variance),
 * falling back to the current item cost for legacy rows.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CafeStockVarianceRow {
  inventory_item_id: string;
  name: string;
  unit: string;
  qty_adjust: number;
  qty_wastage: number;
  cost_lost_cents: number;
}

interface MovementRow {
  inventory_item_id: string;
  reason: "adjust" | "wastage" | string;
  qty_change: number;
  unit_cost_cents: number | null;
}
interface InventoryRow { id: string; name: string; unit: string; cost_per_unit_cents: number }

export function useCafeStockVariance(storeId: string | undefined, daysBack = 30) {
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [inv, setInv] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const since = new Date(Date.now() - daysBack * 86_400_000).toISOString();
    const [mvRes, invRes] = await Promise.all([
      supabase.from("cafe_inventory_movements" as never)
        .select("inventory_item_id, reason, qty_change, unit_cost_cents")
        .eq("store_id", storeId)
        .in("reason", ["adjust", "wastage"])
        .gte("created_at", since),
      supabase.from("cafe_inventory_items" as never)
        .select("id, name, unit, cost_per_unit_cents")
        .eq("store_id", storeId),
    ]);
    if (mvRes.error || invRes.error) {
      console.error("[useCafeStockVariance] load", mvRes.error || invRes.error);
      setError("Couldn't load stock variance.");
      setLoading(false);
      return;
    }
    setMovements((mvRes.data ?? []) as unknown as MovementRow[]);
    setInv((invRes.data ?? []) as unknown as InventoryRow[]);
    setLoading(false);
  }, [storeId, daysBack]);

  useEffect(() => { void load(); }, [load]);

  const { rows, totalCostLostCents } = useMemo(() => {
    const invMap = new Map(inv.map((i) => [i.id, i]));
    const agg = new Map<string, { qty_adjust: number; qty_wastage: number; cost_lost_cents: number }>();
    for (const m of movements) {
      const ent = agg.get(m.inventory_item_id) ?? { qty_adjust: 0, qty_wastage: 0, cost_lost_cents: 0 };
      if (m.reason === "adjust") ent.qty_adjust += Number(m.qty_change);
      else if (m.reason === "wastage") ent.qty_wastage += Number(m.qty_change);
      // Cost of loss: only count *negative* qty changes (true loss). A
      // positive adjust is a found-extra and doesn't represent cost out.
      if (m.qty_change < 0) {
        const unitCost = m.unit_cost_cents ?? invMap.get(m.inventory_item_id)?.cost_per_unit_cents ?? 0;
        ent.cost_lost_cents += Math.round(Math.abs(Number(m.qty_change)) * unitCost);
      }
      agg.set(m.inventory_item_id, ent);
    }
    const out: CafeStockVarianceRow[] = [];
    let total = 0;
    for (const [id, v] of agg) {
      const item = invMap.get(id);
      if (!item) continue;
      // Drop rows that are net-zero on both buckets to keep the list focused.
      if (v.qty_adjust === 0 && v.qty_wastage === 0) continue;
      out.push({
        inventory_item_id: id,
        name: item.name,
        unit: item.unit,
        qty_adjust: v.qty_adjust,
        qty_wastage: v.qty_wastage,
        cost_lost_cents: v.cost_lost_cents,
      });
      total += v.cost_lost_cents;
    }
    out.sort((a, b) => b.cost_lost_cents - a.cost_lost_cents);
    return { rows: out, totalCostLostCents: total };
  }, [movements, inv]);

  return { rows, totalCostLostCents, loading, error, refresh: load };
}
