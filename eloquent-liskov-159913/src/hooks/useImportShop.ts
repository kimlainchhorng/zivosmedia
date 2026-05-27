/**
 * useImportShop - Hooks for the cross-border import marketplace
 * (Lazada/Taobao-style products fulfilled via local warehouse)
 */
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ImportProduct {
  id: string;
  title: string;
  description: string | null;
  source_platform: string;
  source_url: string | null;
  images: string[];
  variants: Array<{ name: string; options: string[] }>;
  category: string | null;
  weight_grams: number;
  source_price: number | null;
  source_currency: string | null;
  markup_percent: number;
  final_price_cents: number;
  est_delivery_days_min: number;
  est_delivery_days_max: number;
  active: boolean;
  featured: boolean;
}

export interface ImportCartItem {
  productId: string;
  title: string;
  image: string;
  price_cents: number;
  weight_grams: number;
  variant?: string;
  qty: number;
}

const CART_KEY = "zivo-import-cart";

export function useImportProducts(category?: string) {
  return useQuery({
    queryKey: ["import-products", category ?? "all"],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return [] as ImportProduct[];
      let q = (supabase as any).from("import_products").select("*").eq("active", true);
      if (category && category !== "All") q = q.eq("category", category);
      const { data, error } = await q.order("featured", { ascending: false }).order("created_at", { ascending: false }).limit(60);
      if (error) throw error;
      return (data ?? []) as ImportProduct[];
    },
    retry: false,
  });
}

export function useImportProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["import-product", id],
    enabled: !!id,
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return null;
      const { data, error } = await (supabase as any).from("import_products").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as ImportProduct | null;
    },
    retry: false,
  });
}

export function useImportOrders() {
  return useQuery({
    queryKey: ["import-orders"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("import_orders").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useImportOrder(id: string | undefined) {
  return useQuery({
    queryKey: ["import-order", id],
    enabled: !!id,
    queryFn: async () => {
      const [{ data: order }, { data: events }] = await Promise.all([
        (supabase as any).from("import_orders").select("*").eq("id", id).maybeSingle(),
        (supabase as any).from("import_order_events").select("*").eq("order_id", id).order("created_at", { ascending: true }),
      ]);
      return { order, events: events ?? [] };
    },
  });
}

export function useImportCart() {
  const [items, setItems] = useState<ImportCartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((item: Omit<ImportCartItem, "qty">) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.productId === item.productId && (i.variant ?? "") === (item.variant ?? ""));
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { ...item, qty: 1 }];
    });
  }, []);

  const removeItem = useCallback((productId: string, variant?: string) => {
    setItems((prev) => prev.filter((i) => !(i.productId === productId && (i.variant ?? "") === (variant ?? ""))));
  }, []);

  const updateQty = useCallback((productId: string, qty: number, variant?: string) => {
    if (qty <= 0) return removeItem(productId, variant);
    setItems((prev) => prev.map((i) => (i.productId === productId && (i.variant ?? "") === (variant ?? "") ? { ...i, qty } : i)));
  }, [removeItem]);

  const clear = useCallback(() => setItems([]), []);

  const subtotal_cents = items.reduce((s, i) => s + i.price_cents * i.qty, 0);
  const totalWeight = items.reduce((s, i) => s + i.weight_grams * i.qty, 0);
  const itemCount = items.reduce((s, i) => s + i.qty, 0);

  // Weight-based shipping in cents
  const shipping_cents = (() => {
    if (totalWeight === 0) return 0;
    const kg = totalWeight / 1000;
    if (kg <= 0.5) return 350;
    if (kg <= 2) return 750;
    if (kg <= 5) return 1500;
    return 1500 + Math.ceil(kg - 5) * 300;
  })();

  return { items, addItem, removeItem, updateQty, clear, subtotal_cents, shipping_cents, itemCount, totalWeight };
}
