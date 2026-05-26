/**
 * Cafe analytics — aggregations over cafe_orders / cafe_order_items /
 * cafe_payments / cafe_expenses driving the Income and Reports sections.
 *
 * The window is days-back from "now". For larger date ranges this should
 * be moved to a server-side RPC, but for a single cafe a 30-day window is
 * tiny and fine to compute client-side.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CafeAnalyticsDataset {
  // Day-by-day buckets, oldest first.
  daily: Array<{ date: string; revenue_cents: number; tickets: number; expenses_cents: number }>;
  topItems: Array<{ name: string; qty: number; revenue_cents: number }>;
  byCategory: Array<{ name: string; qty: number; revenue_cents: number }>;
  byChannel: Record<string, { tickets: number; revenue_cents: number }>;
  byHour: number[]; // 24 entries, revenue per hour-of-day across the window
  totals: {
    revenue_cents: number;
    tickets: number;
    avg_ticket_cents: number;
    expenses_cents: number;
    cogs_cents: number;
    gross_profit_cents: number;
    gross_margin_bp: number; // basis points: 8250 = 82.50%
    net_cents: number;
  };
}

interface OrderRow {
  id: string;
  status: string;
  channel: string;
  placed_at: string;
  total_cents: number;
}
interface ItemRow {
  order_id: string;
  item_name: string;
  menu_item_id: string | null;
  quantity: number;
  line_total_cents: number;
}
interface MenuItemRow { id: string; category_id: string | null; cost_cents: number }
interface CategoryRow { id: string; name: string }
interface ExpenseRow {
  expense_date: string;
  amount_cents: number;
}

const dateKey = (iso: string) => iso.slice(0, 10);

export function useCafeAnalytics(storeId: string | undefined, daysBack = 30) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
    const sinceDate = since.slice(0, 10);

    const [ordRes, expRes] = await Promise.all([
      supabase.from("cafe_orders" as never)
        .select("id,status,channel,placed_at,total_cents")
        .eq("store_id", storeId)
        .gte("placed_at", since)
        .eq("status", "completed"),
      supabase.from("cafe_expenses" as never)
        .select("expense_date,amount_cents")
        .eq("store_id", storeId)
        .gte("expense_date", sinceDate),
    ]);
    if (ordRes.error || expRes.error) {
      const err = ordRes.error || expRes.error;
      console.error("[useCafeAnalytics] load", err);
      setError(`Couldn't load analytics: ${err?.message ?? "unknown error"}`);
      setLoading(false);
      return;
    }
    const ordersRows = (ordRes.data ?? []) as unknown as OrderRow[];
    setOrders(ordersRows);
    setExpenses((expRes.data ?? []) as unknown as ExpenseRow[]);
    if (ordersRows.length > 0) {
      const itemRes = await supabase
        .from("cafe_order_items" as never)
        .select("order_id,item_name,menu_item_id,quantity,line_total_cents")
        .in("order_id", ordersRows.map((o) => o.id));
      setItems((itemRes.data ?? []) as unknown as ItemRow[]);
    } else {
      setItems([]);
    }
    // Menu items + categories — small tables, fetched once per window so we
    // can join order items to a category name client-side.
    const [miRes, catRes] = await Promise.all([
      supabase.from("cafe_menu_items" as never).select("id,category_id,cost_cents").eq("store_id", storeId),
      supabase.from("cafe_categories" as never).select("id,name").eq("store_id", storeId),
    ]);
    setMenuItems((miRes.data ?? []) as unknown as MenuItemRow[]);
    setCategories((catRes.data ?? []) as unknown as CategoryRow[]);
    setLoading(false);
  }, [storeId, daysBack]);

  useEffect(() => { void load(); }, [load]);

  const dataset = useMemo<CafeAnalyticsDataset>(() => {
    const dailyMap = new Map<string, { revenue_cents: number; tickets: number; expenses_cents: number }>();
    const channelMap: Record<string, { tickets: number; revenue_cents: number }> = {};
    const byHour = new Array(24).fill(0);
    let totalRevenue = 0;

    // Seed the buckets so empty days still appear on the chart.
    for (let i = daysBack - 1; i >= 0; i--) {
      const k = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      dailyMap.set(k, { revenue_cents: 0, tickets: 0, expenses_cents: 0 });
    }

    for (const o of orders) {
      const d = dateKey(o.placed_at);
      const bucket = dailyMap.get(d) ?? { revenue_cents: 0, tickets: 0, expenses_cents: 0 };
      bucket.revenue_cents += o.total_cents;
      bucket.tickets += 1;
      dailyMap.set(d, bucket);
      totalRevenue += o.total_cents;
      channelMap[o.channel] = channelMap[o.channel] ?? { tickets: 0, revenue_cents: 0 };
      channelMap[o.channel].tickets += 1;
      channelMap[o.channel].revenue_cents += o.total_cents;
      const hr = new Date(o.placed_at).getHours();
      byHour[hr] += o.total_cents;
    }

    let totalExpenses = 0;
    for (const e of expenses) {
      const bucket = dailyMap.get(e.expense_date) ?? { revenue_cents: 0, tickets: 0, expenses_cents: 0 };
      bucket.expenses_cents += e.amount_cents;
      dailyMap.set(e.expense_date, bucket);
      totalExpenses += e.amount_cents;
    }

    const daily = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));

    const topMap = new Map<string, { qty: number; revenue_cents: number }>();
    for (const it of items) {
      const prev = topMap.get(it.item_name) ?? { qty: 0, revenue_cents: 0 };
      prev.qty += it.quantity;
      prev.revenue_cents += it.line_total_cents;
      topMap.set(it.item_name, prev);
    }
    const topItems = Array.from(topMap.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    // Bucket revenue by category. Items without a menu_item_id (manual ad-hoc
    // entries) or with no category fall under "Uncategorised" so the totals
    // line up with topItems above.
    const miToCat = new Map(menuItems.map((m) => [m.id, m.category_id]));
    const miCost = new Map(menuItems.map((m) => [m.id, m.cost_cents]));
    const catName = new Map(categories.map((c) => [c.id, c.name]));

    // COGS rollup: sum (menu_item.cost_cents × qty) across order items in
    // the window. Items without a known cost (manual entries, or recipes
    // not yet wired up) contribute 0 — gross margin will read a touch high
    // until the owner fills in costs, which is the correct conservative
    // behaviour for an unknown.
    let totalCogs = 0;
    for (const it of items) {
      const c = it.menu_item_id ? miCost.get(it.menu_item_id) ?? 0 : 0;
      totalCogs += c * it.quantity;
    }
    const categoryMap = new Map<string, { qty: number; revenue_cents: number }>();
    for (const it of items) {
      const catId = it.menu_item_id ? miToCat.get(it.menu_item_id) ?? null : null;
      const name = (catId && catName.get(catId)) || "Uncategorised";
      const prev = categoryMap.get(name) ?? { qty: 0, revenue_cents: 0 };
      prev.qty += it.quantity;
      prev.revenue_cents += it.line_total_cents;
      categoryMap.set(name, prev);
    }
    const byCategory = Array.from(categoryMap.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue_cents - a.revenue_cents);

    return {
      daily,
      topItems,
      byCategory,
      byChannel: channelMap,
      byHour,
      totals: {
        revenue_cents: totalRevenue,
        tickets: orders.length,
        avg_ticket_cents: orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0,
        expenses_cents: totalExpenses,
        cogs_cents: totalCogs,
        gross_profit_cents: totalRevenue - totalCogs,
        gross_margin_bp: totalRevenue > 0
          ? Math.round(((totalRevenue - totalCogs) / totalRevenue) * 10000)
          : 0,
        net_cents: totalRevenue - totalCogs - totalExpenses,
      },
    };
  }, [orders, items, expenses, menuItems, categories, daysBack]);

  return { dataset, loading, error, refresh: load };
}
