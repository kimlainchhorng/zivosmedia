/**
 * Cafe purchasing — suppliers + POs + line-item receiving.
 *
 * Receiving stock: increase qty_received on a PO line; a DB trigger inserts
 * the matching cafe_inventory_movement row (reason='received') which in turn
 * adds to on_hand_qty and blends rolling cost. PO header status flips to
 * 'partial' / 'received' automatically.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CafeSupplier {
  id: string;
  store_id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  payment_terms: string | null;
  lead_time_days: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
export type CafeSupplierDraft = Omit<CafeSupplier, "id" | "store_id" | "created_at" | "updated_at" | "sort_order">;

export type CafePoStatus = "draft" | "sent" | "partial" | "received" | "cancelled";

export interface CafePurchaseOrder {
  id: string;
  store_id: string;
  supplier_id: string | null;
  po_number: number;
  status: CafePoStatus;
  expected_at: string | null;
  sent_at: string | null;
  received_at: string | null;
  subtotal_cents: number;
  tax_cents: number;
  shipping_cents: number;
  total_cents: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CafePurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  store_id: string;
  inventory_item_id: string | null;
  item_name: string;
  unit: string;
  qty_ordered: number;
  qty_received: number;
  unit_cost_cents: number;
  line_total_cents: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface UseCafePurchasingResult {
  suppliers: CafeSupplier[];
  orders: CafePurchaseOrder[];
  itemsByOrder: Record<string, CafePurchaseOrderItem[]>;
  loading: boolean;
  saving: boolean;
  error: string | null;
  refresh: () => Promise<void>;

  createSupplier: (draft: CafeSupplierDraft) => Promise<CafeSupplier | null>;
  updateSupplier: (id: string, patch: Partial<CafeSupplierDraft>) => Promise<void>;
  removeSupplier: (id: string) => Promise<void>;

  createOrder: (input: {
    supplier_id: string | null;
    expected_at?: string | null;
    notes?: string;
    items: Array<{ inventory_item_id: string; qty_ordered: number; unit_cost_cents: number }>;
  }) => Promise<CafePurchaseOrder | null>;
  setOrderStatus: (id: string, status: CafePoStatus) => Promise<void>;
  receiveItem: (orderItemId: string, qtyReceived: number) => Promise<{ ok: boolean; error?: string }>;
  removeOrder: (id: string) => Promise<void>;
}

const WINDOW_DAYS = 180;

export function useCafePurchasing(storeId: string | undefined): UseCafePurchasingResult {
  const [suppliers, setSuppliers] = useState<CafeSupplier[]>([]);
  const [orders, setOrders] = useState<CafePurchaseOrder[]>([]);
  const [items, setItems] = useState<CafePurchaseOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
    const [supRes, ordRes] = await Promise.all([
      supabase.from("cafe_suppliers" as never)
        .select("*").eq("store_id", storeId)
        .order("sort_order", { ascending: true }).order("name", { ascending: true }),
      supabase.from("cafe_purchase_orders" as never)
        .select("*").eq("store_id", storeId)
        .gte("created_at", since)
        .order("created_at", { ascending: false }),
    ]);
    if (supRes.error || ordRes.error) {
      console.error("[useCafePurchasing] load", supRes.error || ordRes.error);
      setError("Couldn't load purchasing.");
      setLoading(false);
      return;
    }
    setSuppliers((supRes.data ?? []) as unknown as CafeSupplier[]);
    const orderRows = (ordRes.data ?? []) as unknown as CafePurchaseOrder[];
    setOrders(orderRows);
    if (orderRows.length > 0) {
      const itemRes = await supabase
        .from("cafe_purchase_order_items" as never)
        .select("*")
        .in("purchase_order_id", orderRows.map((o) => o.id))
        .order("sort_order", { ascending: true });
      setItems((itemRes.data ?? []) as unknown as CafePurchaseOrderItem[]);
    } else {
      setItems([]);
    }
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const itemsByOrder = useMemo(() => {
    const map: Record<string, CafePurchaseOrderItem[]> = {};
    for (const it of items) {
      map[it.purchase_order_id] = map[it.purchase_order_id] ?? [];
      map[it.purchase_order_id].push(it);
    }
    return map;
  }, [items]);

  // ===== Suppliers =====
  const createSupplier = useCallback(async (draft: CafeSupplierDraft) => {
    if (!storeId) return null;
    setSaving(true);
    const sort_order = suppliers.length === 0 ? 0 : Math.max(...suppliers.map((s) => s.sort_order)) + 10;
    const payload = { store_id: storeId, sort_order, ...draft, name: draft.name.trim() };
    const { data, error: err } = await supabase
      .from("cafe_suppliers" as never).insert(payload as never).select("*").single();
    setSaving(false);
    if (err) {
      console.error("[useCafePurchasing] createSupplier", err);
      setError("Couldn't add supplier.");
      return null;
    }
    const created = data as unknown as CafeSupplier;
    setSuppliers((p) => [...p, created]);
    return created;
  }, [storeId, suppliers]);

  const updateSupplier = useCallback(async (id: string, patch: Partial<CafeSupplierDraft>) => {
    setSaving(true);
    setSuppliers((p) => p.map((s) => s.id === id ? ({ ...s, ...patch } as CafeSupplier) : s));
    const { error: err } = await supabase.from("cafe_suppliers" as never).update(patch as never).eq("id", id);
    setSaving(false);
    if (err) { console.error("[useCafePurchasing] updateSupplier", err); await load(); }
  }, [load]);

  const removeSupplier = useCallback(async (id: string) => {
    const prev = suppliers;
    setSuppliers((p) => p.filter((s) => s.id !== id));
    const { error: err } = await supabase.from("cafe_suppliers" as never).delete().eq("id", id);
    if (err) { console.error("[useCafePurchasing] removeSupplier", err); setSuppliers(prev); }
  }, [suppliers]);

  // ===== Orders =====
  const createOrder = useCallback<UseCafePurchasingResult["createOrder"]>(async (input) => {
    if (!storeId) return null;
    setSaving(true);
    setError(null);
    const headerPayload: Record<string, unknown> = {
      store_id: storeId,
      supplier_id: input.supplier_id,
      status: "draft" as CafePoStatus,
      expected_at: input.expected_at ?? null,
      notes: input.notes?.trim() || null,
    };
    const { data: headerRow, error: headerErr } = await supabase
      .from("cafe_purchase_orders" as never).insert(headerPayload as never).select("*").single();
    if (headerErr || !headerRow) {
      console.error("[useCafePurchasing] createOrder header", headerErr);
      setError("Couldn't create PO.");
      setSaving(false);
      return null;
    }
    const created = headerRow as unknown as CafePurchaseOrder;

    // Look up snapshots for each chosen inventory item in one go.
    const ids = input.items.map((i) => i.inventory_item_id);
    const invRes = ids.length > 0
      ? await supabase.from("cafe_inventory_items" as never).select("id,name,unit").in("id", ids)
      : { data: [] as { id: string; name: string; unit: string }[] };
    const invMap = new Map<string, { name: string; unit: string }>();
    for (const row of ((invRes.data ?? []) as unknown as { id: string; name: string; unit: string }[])) {
      invMap.set(row.id, { name: row.name, unit: row.unit });
    }

    const linePayloads = input.items.map((it, idx) => {
      const snap = invMap.get(it.inventory_item_id);
      return {
        purchase_order_id: created.id,
        store_id: storeId,
        inventory_item_id: it.inventory_item_id,
        item_name: snap?.name ?? "(item)",
        unit: snap?.unit ?? "unit",
        qty_ordered: it.qty_ordered,
        unit_cost_cents: it.unit_cost_cents,
        sort_order: idx * 10,
      };
    });
    if (linePayloads.length > 0) {
      const { error: lineErr } = await supabase.from("cafe_purchase_order_items" as never).insert(linePayloads as never);
      if (lineErr) {
        console.error("[useCafePurchasing] createOrder lines", lineErr);
      }
    }
    await load();
    setSaving(false);
    return created;
  }, [storeId, load]);

  const setOrderStatus = useCallback(async (id: string, status: CafePoStatus) => {
    setSaving(true);
    const patch: Record<string, unknown> = { status };
    if (status === "sent") patch.sent_at = new Date().toISOString();
    if (status === "received") patch.received_at = new Date().toISOString();
    setOrders((p) => p.map((o) => o.id === id ? ({ ...o, ...patch } as CafePurchaseOrder) : o));
    const { error: err } = await supabase.from("cafe_purchase_orders" as never).update(patch as never).eq("id", id);
    setSaving(false);
    if (err) { console.error("[useCafePurchasing] setOrderStatus", err); await load(); }
  }, [load]);

  const receiveItem = useCallback<UseCafePurchasingResult["receiveItem"]>(async (orderItemId, qtyReceived) => {
    if (qtyReceived < 0) return { ok: false, error: "Quantity must be ≥ 0" };
    const { error: err } = await supabase
      .from("cafe_purchase_order_items" as never)
      .update({ qty_received: qtyReceived } as never)
      .eq("id", orderItemId);
    if (err) {
      console.error("[useCafePurchasing] receiveItem", err);
      return { ok: false, error: err.message ?? "Couldn't record receipt." };
    }
    await load();
    return { ok: true };
  }, [load]);

  const removeOrder = useCallback(async (id: string) => {
    const prevOrders = orders;
    const prevItems = items;
    setOrders((p) => p.filter((o) => o.id !== id));
    setItems((p) => p.filter((i) => i.purchase_order_id !== id));
    const { error: err } = await supabase.from("cafe_purchase_orders" as never).delete().eq("id", id);
    if (err) {
      console.error("[useCafePurchasing] removeOrder", err);
      setOrders(prevOrders); setItems(prevItems);
    }
  }, [orders, items]);

  return {
    suppliers, orders, itemsByOrder, loading, saving, error, refresh: load,
    createSupplier, updateSupplier, removeSupplier,
    createOrder, setOrderStatus, receiveItem, removeOrder,
  };
}
