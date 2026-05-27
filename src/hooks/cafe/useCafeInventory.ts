/**
 * Cafe inventory CRUD + stock-movement helpers. on_hand_qty is owned by
 * the DB trigger on cafe_inventory_movements — never UPDATE the column
 * directly.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CafeInventoryItem {
  id: string;
  store_id: string;
  name: string;
  sku: string | null;
  category: string | null;
  unit: string;
  on_hand_qty: number;
  low_stock_threshold: number;
  cost_per_unit_cents: number;
  default_supplier: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type CafeInventoryItemDraft = Omit<CafeInventoryItem, "id" | "store_id" | "created_at" | "updated_at" | "sort_order" | "on_hand_qty">;

export type CafeMovementReason = "received" | "sold" | "wastage" | "adjust" | "transfer" | "return";

export interface CafeInventoryMovement {
  id: string;
  store_id: string;
  inventory_item_id: string;
  reason: CafeMovementReason;
  qty_change: number;
  unit_cost_cents: number;
  order_id: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface UseCafeInventoryResult {
  items: CafeInventoryItem[];
  movements: CafeInventoryMovement[];
  lowStockItems: CafeInventoryItem[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createItem: (draft: CafeInventoryItemDraft) => Promise<CafeInventoryItem | null>;
  updateItem: (id: string, patch: Partial<CafeInventoryItemDraft & { sort_order: number }>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  // qty is POSITIVE for receive/adjust-up, NEGATIVE for wastage/adjust-down.
  recordMovement: (input: {
    inventory_item_id: string;
    reason: CafeMovementReason;
    qty_change: number;
    unit_cost_cents?: number;
    notes?: string;
    reference?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
}

const MOVEMENT_WINDOW_DAYS = 30;

export function useCafeInventory(storeId: string | undefined): UseCafeInventoryResult {
  const [items, setItems] = useState<CafeInventoryItem[]>([]);
  const [movements, setMovements] = useState<CafeInventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const since = new Date(Date.now() - MOVEMENT_WINDOW_DAYS * 86_400_000).toISOString();
    const [itemRes, moveRes] = await Promise.all([
      supabase.from("cafe_inventory_items" as never)
        .select("*").eq("store_id", storeId)
        .order("sort_order", { ascending: true }).order("name", { ascending: true }),
      supabase.from("cafe_inventory_movements" as never)
        .select("*").eq("store_id", storeId)
        .gte("created_at", since)
        .order("created_at", { ascending: false }),
    ]);
    if (itemRes.error || moveRes.error) {
      console.error("[useCafeInventory] load", itemRes.error || moveRes.error);
      setError("Couldn't load inventory.");
      setLoading(false);
      return;
    }
    setItems((itemRes.data ?? []) as unknown as CafeInventoryItem[]);
    setMovements((moveRes.data ?? []) as unknown as CafeInventoryMovement[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const lowStockItems = useMemo(
    () => items.filter((i) => i.is_active && Number(i.on_hand_qty) <= Number(i.low_stock_threshold)),
    [items],
  );

  const createItem = useCallback(async (draft: CafeInventoryItemDraft) => {
    if (!storeId) return null;
    setSaving(true);
    const sort_order = items.length === 0 ? 0 : Math.max(...items.map((i) => i.sort_order)) + 10;
    const payload = { store_id: storeId, sort_order, ...draft, name: draft.name.trim() };
    const { data, error: err } = await supabase
      .from("cafe_inventory_items" as never).insert(payload as never).select("*").single();
    setSaving(false);
    if (err) {
      console.error("[useCafeInventory] createItem", err);
      setError(err.message?.includes("unique") ? "SKU already in use." : "Couldn't add item.");
      return null;
    }
    const created = data as unknown as CafeInventoryItem;
    setItems((p) => [...p, created]);
    return created;
  }, [storeId, items]);

  const updateItem = useCallback(async (id: string, patch: Partial<CafeInventoryItemDraft & { sort_order: number }>) => {
    setSaving(true);
    setItems((p) => p.map((i) => i.id === id ? ({ ...i, ...patch } as CafeInventoryItem) : i));
    const { error: err } = await supabase.from("cafe_inventory_items" as never).update(patch as never).eq("id", id);
    setSaving(false);
    if (err) { console.error("[useCafeInventory] updateItem", err); await load(); }
  }, [load]);

  const removeItem = useCallback(async (id: string) => {
    const prev = items;
    setItems((p) => p.filter((i) => i.id !== id));
    const { error: err } = await supabase.from("cafe_inventory_items" as never).delete().eq("id", id);
    if (err) { console.error("[useCafeInventory] removeItem", err); setItems(prev); }
  }, [items]);

  const recordMovement = useCallback<UseCafeInventoryResult["recordMovement"]>(async (input) => {
    if (!storeId) return { ok: false, error: "no store" };
    if (input.qty_change === 0) return { ok: false, error: "Quantity required" };
    const payload = {
      store_id: storeId,
      inventory_item_id: input.inventory_item_id,
      reason: input.reason,
      qty_change: input.qty_change,
      unit_cost_cents: input.unit_cost_cents ?? 0,
      notes: input.notes ?? null,
      reference: input.reference ?? null,
    };
    const { error: err } = await supabase.from("cafe_inventory_movements" as never).insert(payload as never);
    if (err) {
      console.error("[useCafeInventory] recordMovement", err);
      return { ok: false, error: err.message ?? "Couldn't save movement." };
    }
    await load();
    return { ok: true };
  }, [storeId, load]);

  return { items, movements, lowStockItems, loading, saving, error, refresh: load, createItem, updateItem, removeItem, recordMovement };
}
