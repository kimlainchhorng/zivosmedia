/**
 * Cafe customers — derived from cafe_orders. No separate table; we group
 * by phone (when present) then by user_id then by name. Each "customer"
 * row reports lifetime stats and a list of their top items.
 *
 * This trades real-time accuracy for zero-schema simplicity: refresh on
 * demand, or rely on the Orders realtime channel.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CafeCustomerRow {
  key: string;
  display_name: string;
  phone: string | null;
  email: string | null;
  user_id: string | null;
  orders_count: number;
  lifetime_spend_cents: number;
  first_seen: string;
  last_seen: string;
  favourite_items: Array<{ name: string; count: number }>;
}

export interface UseCafeCustomersResult {
  customers: CafeCustomerRow[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface OrderRow {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  customer_user_id: string | null;
  total_cents: number;
  placed_at: string;
  status: string;
}

interface ItemRow {
  order_id: string;
  item_name: string;
  quantity: number;
}

export function useCafeCustomers(storeId: string | undefined): UseCafeCustomersResult {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const ordRes = await supabase
      .from("cafe_orders" as never)
      .select("id,customer_name,customer_phone,customer_email,customer_user_id,total_cents,placed_at,status")
      .eq("store_id", storeId)
      .neq("status", "cancelled");
    if (ordRes.error) {
      console.error("[useCafeCustomers] load orders", ordRes.error);
      setError("Couldn't load customers.");
      setLoading(false);
      return;
    }
    const ordersRows = (ordRes.data ?? []) as unknown as OrderRow[];
    setOrders(ordersRows);
    const orderIds = ordersRows.map((o) => o.id);
    if (orderIds.length > 0) {
      const itemRes = await supabase
        .from("cafe_order_items" as never)
        .select("order_id,item_name,quantity")
        .in("order_id", orderIds);
      setItems((itemRes.data ?? []) as unknown as ItemRow[]);
    } else {
      setItems([]);
    }
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const customers = useMemo<CafeCustomerRow[]>(() => {
    if (orders.length === 0) return [];
    const itemsByOrder = new Map<string, ItemRow[]>();
    for (const it of items) {
      const arr = itemsByOrder.get(it.order_id) ?? [];
      arr.push(it);
      itemsByOrder.set(it.order_id, arr);
    }
    const buckets = new Map<string, CafeCustomerRow>();
    for (const o of orders) {
      // Identity priority: user_id > phone > email > name. Anonymous orders
      // (none of the above) are bucketed individually so they don't merge.
      const key =
        o.customer_user_id ? `u:${o.customer_user_id}`
        : o.customer_phone ? `p:${o.customer_phone.trim()}`
        : o.customer_email ? `e:${o.customer_email.toLowerCase().trim()}`
        : o.customer_name ? `n:${o.customer_name.trim().toLowerCase()}`
        : `anon:${o.id}`;
      const existing = buckets.get(key);
      const itemRows = itemsByOrder.get(o.id) ?? [];
      if (!existing) {
        const favCount = new Map<string, number>();
        for (const it of itemRows) favCount.set(it.item_name, (favCount.get(it.item_name) ?? 0) + it.quantity);
        buckets.set(key, {
          key,
          display_name: o.customer_name || (o.customer_phone ? o.customer_phone : o.customer_email ? o.customer_email : "Guest"),
          phone: o.customer_phone,
          email: o.customer_email,
          user_id: o.customer_user_id,
          orders_count: 1,
          lifetime_spend_cents: o.total_cents,
          first_seen: o.placed_at,
          last_seen: o.placed_at,
          favourite_items: Array.from(favCount.entries()).map(([name, count]) => ({ name, count })),
        });
      } else {
        existing.orders_count += 1;
        existing.lifetime_spend_cents += o.total_cents;
        if (o.placed_at < existing.first_seen) existing.first_seen = o.placed_at;
        if (o.placed_at > existing.last_seen) existing.last_seen = o.placed_at;
        // Best-name wins: prefer one with both name + phone.
        if (!existing.phone && o.customer_phone) existing.phone = o.customer_phone;
        if (!existing.email && o.customer_email) existing.email = o.customer_email;
        if (o.customer_name && (!existing.display_name || existing.display_name === "Guest")) existing.display_name = o.customer_name;
        const favCount = new Map(existing.favourite_items.map((f) => [f.name, f.count]));
        for (const it of itemRows) favCount.set(it.item_name, (favCount.get(it.item_name) ?? 0) + it.quantity);
        existing.favourite_items = Array.from(favCount.entries()).map(([name, count]) => ({ name, count }));
      }
    }
    const out = Array.from(buckets.values());
    for (const c of out) {
      c.favourite_items.sort((a, b) => b.count - a.count);
      c.favourite_items = c.favourite_items.slice(0, 3);
    }
    out.sort((a, b) => b.lifetime_spend_cents - a.lifetime_spend_cents);
    return out;
  }, [orders, items]);

  return { customers, loading, error, refresh: load };
}
