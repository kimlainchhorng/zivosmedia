/**
 * Cafe orders + line items + payments — realtime stream for the Orders & KDS
 * sections. Provides:
 *   - load + refresh
 *   - real-time subscription on cafe_orders (the only table the KDS card list
 *     re-renders on; item changes refresh the affected order through the
 *     same channel because we listen to UPDATE which fires the recompute
 *     trigger that touches the parent).
 *   - status mutations: accept / preparing / ready / served / complete /
 *     cancel.
 *   - addItem / removeItem / setQuantity for the counter / POS flow.
 *   - addPayment / refundPayment for split-tender.
 *
 * Like the menu hook, table calls are cast through `as never` since the
 * autogen types file doesn't include cafe_* yet.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CafeOrderStatus =
  | "pending" | "accepted" | "preparing" | "ready"
  | "served" | "completed" | "cancelled" | "refunded";

export type CafeOrderChannel = "qr_table" | "counter" | "pickup" | "delivery" | "phone";

export interface CafeOrder {
  id: string;
  store_id: string;
  table_id: string | null;
  ticket_number: number;
  status: CafeOrderStatus;
  channel: CafeOrderChannel;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  customer_user_id: string | null;
  subtotal_cents: number;
  discount_cents: number;
  tax_cents: number;
  tip_cents: number;
  total_cents: number;
  paid_cents: number;
  customer_notes: string | null;
  internal_notes: string | null;
  placed_at: string;
  accepted_at: string | null;
  ready_at: string | null;
  served_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  scheduled_for: string | null;
  created_at: string;
  updated_at: string;
}

export interface CafeOrderItem {
  id: string;
  order_id: string;
  store_id: string;
  menu_item_id: string | null;
  item_name: string;
  unit_price_cents: number;
  quantity: number;
  modifiers_total_cents: number;
  line_total_cents: number;
  notes: string | null;
  station: string | null;
  fulfilled_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CafeOrderItemModifier {
  id: string;
  order_item_id: string;
  modifier_id: string | null;
  group_id: string | null;
  group_name: string;
  modifier_name: string;
  price_delta_cents: number;
  sort_order: number;
  created_at: string;
}

export interface CafePayment {
  id: string;
  order_id: string;
  store_id: string;
  method: "cash" | "card" | "qr" | "wallet" | "gift_card" | "other";
  status: "pending" | "authorized" | "captured" | "refunded" | "voided" | "failed";
  amount_cents: number;
  tip_cents: number;
  refunded_cents: number;
  reference: string | null;
  notes: string | null;
  taken_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewOrderItemDraft {
  menu_item_id: string;
  item_name: string;
  unit_price_cents: number;
  quantity: number;
  notes?: string | null;
  modifier_ids?: string[];
  station?: string | null;
}

export interface UseCafeOrdersResult {
  orders: CafeOrder[];
  itemsByOrder: Record<string, CafeOrderItem[]>;
  modifiersByItem: Record<string, CafeOrderItemModifier[]>;
  paymentsByOrder: Record<string, CafePayment[]>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;

  createOrder: (input: {
    channel?: CafeOrderChannel;
    table_id?: string | null;
    customer_name?: string | null;
    customer_phone?: string | null;
    items: NewOrderItemDraft[];
    customer_notes?: string | null;
  }) => Promise<CafeOrder | null>;

  setStatus: (orderId: string, status: CafeOrderStatus, reason?: string) => Promise<void>;
  cancelOrder: (orderId: string, reason?: string) => Promise<void>;
  addPayment: (orderId: string, input: { method: CafePayment["method"]; amount_cents: number; tip_cents?: number; reference?: string }) => Promise<void>;
  refundPayment: (paymentId: string, refundCents: number) => Promise<void>;
  removeOrderItem: (orderId: string, itemId: string) => Promise<{ ok: boolean; error?: string }>;
  // Phase 71: line-level void/comp with audit trail. kind 'void' = item
  // never made; 'comp' = item delivered free. Both reduce subtotal the
  // same way via the recompute trigger.
  voidOrderItem: (orderId: string, itemId: string, kind: "void" | "comp", reason: string) => Promise<{ ok: boolean; error?: string }>;
}

const STATUS_TIMESTAMPS: Partial<Record<CafeOrderStatus, keyof CafeOrder>> = {
  accepted: "accepted_at",
  ready: "ready_at",
  served: "served_at",
  completed: "completed_at",
  cancelled: "cancelled_at",
};

export function useCafeOrders(storeId: string | undefined): UseCafeOrdersResult {
  const [orders, setOrders] = useState<CafeOrder[]>([]);
  const [itemsByOrder, setItemsByOrder] = useState<Record<string, CafeOrderItem[]>>({});
  const [modifiersByItem, setModifiersByItem] = useState<Record<string, CafeOrderItemModifier[]>>({});
  const [paymentsByOrder, setPaymentsByOrder] = useState<Record<string, CafePayment[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(); // last 7 days
    const ordRes = await supabase
      .from("cafe_orders" as never).select("*").eq("store_id", storeId)
      .gte("placed_at", since).order("placed_at", { ascending: false });
    if (ordRes.error) { console.error("[useCafeOrders] load orders", ordRes.error); setError("Couldn't load orders."); setLoading(false); return; }
    const ordersRows = (ordRes.data ?? []) as unknown as CafeOrder[];
    setOrders(ordersRows);
    const orderIds = ordersRows.map((o) => o.id);
    if (orderIds.length === 0) {
      setItemsByOrder({}); setModifiersByItem({}); setPaymentsByOrder({});
      setLoading(false); return;
    }
    const [itemRes, payRes] = await Promise.all([
      supabase.from("cafe_order_items" as never).select("*").in("order_id", orderIds).order("sort_order", { ascending: true }),
      supabase.from("cafe_payments" as never).select("*").in("order_id", orderIds).order("created_at", { ascending: true }),
    ]);
    const itemsRows = (itemRes.data ?? []) as unknown as CafeOrderItem[];
    const payRows = (payRes.data ?? []) as unknown as CafePayment[];
    const grouped: Record<string, CafeOrderItem[]> = {};
    for (const it of itemsRows) {
      grouped[it.order_id] = grouped[it.order_id] ?? [];
      grouped[it.order_id].push(it);
    }
    const payGrouped: Record<string, CafePayment[]> = {};
    for (const p of payRows) {
      payGrouped[p.order_id] = payGrouped[p.order_id] ?? [];
      payGrouped[p.order_id].push(p);
    }
    setItemsByOrder(grouped);
    setPaymentsByOrder(payGrouped);
    const itemIds = itemsRows.map((i) => i.id);
    if (itemIds.length > 0) {
      const modRes = await supabase
        .from("cafe_order_item_modifiers" as never).select("*").in("order_item_id", itemIds);
      const modRows = (modRes.data ?? []) as unknown as CafeOrderItemModifier[];
      const modGrouped: Record<string, CafeOrderItemModifier[]> = {};
      for (const m of modRows) {
        modGrouped[m.order_item_id] = modGrouped[m.order_item_id] ?? [];
        modGrouped[m.order_item_id].push(m);
      }
      setModifiersByItem(modGrouped);
    } else {
      setModifiersByItem({});
    }
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  // Realtime: any change to this store's orders or items triggers a refresh.
  // Cheap because cafe traffic is bounded by the number of active tickets.
  useEffect(() => {
    if (!storeId) return;
    const ch = supabase
      .channel(`cafe-orders:${storeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cafe_orders", filter: `store_id=eq.${storeId}` }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "cafe_order_items", filter: `store_id=eq.${storeId}` }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "cafe_payments", filter: `store_id=eq.${storeId}` }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [storeId, load]);

  const createOrder = useCallback<UseCafeOrdersResult["createOrder"]>(async (input) => {
    if (!storeId) return null;
    const orderPayload = {
      store_id: storeId,
      table_id: input.table_id ?? null,
      channel: input.channel ?? "counter",
      status: "pending" as CafeOrderStatus,
      customer_name: input.customer_name ?? null,
      customer_phone: input.customer_phone ?? null,
      customer_notes: input.customer_notes ?? null,
    };
    const { data: orderRow, error: orderErr } = await supabase
      .from("cafe_orders" as never).insert(orderPayload as never).select("*").single();
    if (orderErr || !orderRow) {
      console.error("[useCafeOrders] createOrder order", orderErr);
      setError("Couldn't create order.");
      return null;
    }
    const created = orderRow as unknown as CafeOrder;

    // Insert line items + their snapshot modifiers in parallel per item.
    for (let i = 0; i < input.items.length; i++) {
      const draft = input.items[i];
      const itemPayload = {
        order_id: created.id,
        store_id: storeId,
        menu_item_id: draft.menu_item_id,
        item_name: draft.item_name,
        unit_price_cents: draft.unit_price_cents,
        quantity: draft.quantity,
        modifiers_total_cents: 0,
        notes: draft.notes ?? null,
        station: draft.station ?? null,
        sort_order: i * 10,
      };
      const { data: itemRow, error: itemErr } = await supabase
        .from("cafe_order_items" as never).insert(itemPayload as never).select("*").single();
      if (itemErr || !itemRow) {
        console.error("[useCafeOrders] createOrder item", itemErr);
        continue;
      }
      const itemId = (itemRow as { id: string }).id;
      if (draft.modifier_ids && draft.modifier_ids.length > 0) {
        // Look up each modifier so we can snapshot its name + price.
        const { data: modCatalog, error: modErr } = await supabase
          .from("cafe_modifiers" as never).select("*").in("id", draft.modifier_ids);
        if (modErr || !modCatalog) { continue; }
        const rows = modCatalog as unknown as {
          id: string; name: string; price_delta_cents: number; group_id: string;
        }[];
        const groupIds = Array.from(new Set(rows.map((r) => r.group_id))).filter(Boolean);
        const { data: groupCatalog } = groupIds.length
          ? await supabase.from("cafe_modifier_groups" as never).select("id,name").in("id", groupIds)
          : { data: [] as { id: string; name: string }[] };
        const groupNameById: Record<string, string> = {};
        for (const g of (groupCatalog ?? []) as { id: string; name: string }[]) {
          groupNameById[g.id] = g.name;
        }
        let modSum = 0;
        const modInserts = rows.map((r, idx) => {
          modSum += r.price_delta_cents;
          return {
            order_item_id: itemId,
            modifier_id: r.id,
            group_id: r.group_id,
            group_name: groupNameById[r.group_id] ?? "",
            modifier_name: r.name,
            price_delta_cents: r.price_delta_cents,
            sort_order: idx * 10,
          };
        });
        await supabase.from("cafe_order_item_modifiers" as never).insert(modInserts as never);
        if (modSum !== 0) {
          await supabase.from("cafe_order_items" as never).update({ modifiers_total_cents: modSum } as never).eq("id", itemId);
        }
      }
    }

    await load();
    return created;
  }, [storeId, load]);

  const setStatus = useCallback(async (orderId: string, status: CafeOrderStatus, reason?: string) => {
    const patch: Record<string, unknown> = { status };
    const ts = STATUS_TIMESTAMPS[status];
    if (ts) patch[ts as string] = new Date().toISOString();
    if (status === "cancelled" && reason) patch.cancellation_reason = reason;
    // Optimistic
    setOrders((p) => p.map((o) => (o.id === orderId ? ({ ...o, ...patch } as CafeOrder) : o)));
    const { error: err } = await supabase.from("cafe_orders" as never).update(patch as never).eq("id", orderId);
    if (err) { console.error("[useCafeOrders] setStatus", err); await load(); }
  }, [load]);

  const cancelOrder = useCallback((orderId: string, reason?: string) => setStatus(orderId, "cancelled", reason), [setStatus]);

  const addPayment = useCallback(async (orderId: string, input: { method: CafePayment["method"]; amount_cents: number; tip_cents?: number; reference?: string }) => {
    if (!storeId) return;
    const payload = {
      order_id: orderId, store_id: storeId,
      method: input.method, status: "captured" as const,
      amount_cents: input.amount_cents,
      tip_cents: input.tip_cents ?? 0,
      reference: input.reference ?? null,
    };
    const { error: err } = await supabase.from("cafe_payments" as never).insert(payload as never);
    if (err) { console.error("[useCafeOrders] addPayment", err); }
    await load();
  }, [storeId, load]);

  const refundPayment = useCallback(async (paymentId: string, refundCents: number) => {
    const { error: err } = await supabase
      .from("cafe_payments" as never)
      .update({ refunded_cents: refundCents, status: "refunded" } as never)
      .eq("id", paymentId);
    if (err) { console.error("[useCafeOrders] refundPayment", err); }
    await load();
  }, [load]);

  const removeOrderItem = useCallback<UseCafeOrdersResult["removeOrderItem"]>(async (orderId, itemId) => {
    // Optimistic: drop the line locally; the cafe_order_items trigger
    // recomputes order subtotal/total which the realtime channel reloads.
    setItemsByOrder((prev) => {
      const arr = prev[orderId] ?? [];
      return { ...prev, [orderId]: arr.filter((it) => it.id !== itemId) };
    });
    const { error: err } = await supabase
      .from("cafe_order_items" as never)
      .delete()
      .eq("id", itemId);
    if (err) {
      console.error("[useCafeOrders] removeOrderItem", err);
      await load();
      return { ok: false, error: err.message ?? "Couldn't remove item." };
    }
    return { ok: true };
  }, [load]);

  const voidOrderItem = useCallback<UseCafeOrdersResult["voidOrderItem"]>(async (orderId, itemId, kind, reason) => {
    // Optimistic local drop, same as removeOrderItem — the RPC handles the
    // audit insert + delete server-side.
    setItemsByOrder((prev) => {
      const arr = prev[orderId] ?? [];
      return { ...prev, [orderId]: arr.filter((it) => it.id !== itemId) };
    });
    const { error: err } = await supabase.rpc("cafe_void_order_item" as never, {
      p_order_item_id: itemId,
      p_kind: kind,
      p_reason: reason,
    } as never);
    if (err) {
      console.error("[useCafeOrders] voidOrderItem", err);
      await load();
      return { ok: false, error: err.message ?? "Couldn't void item." };
    }
    return { ok: true };
  }, [load]);

  return useMemo(() => ({
    orders, itemsByOrder, modifiersByItem, paymentsByOrder,
    loading, error, refresh: load,
    createOrder, setStatus, cancelOrder, addPayment, refundPayment, removeOrderItem, voidOrderItem,
  }), [orders, itemsByOrder, modifiersByItem, paymentsByOrder, loading, error, load, createOrder, setStatus, cancelOrder, addPayment, refundPayment, removeOrderItem, voidOrderItem]);
}
