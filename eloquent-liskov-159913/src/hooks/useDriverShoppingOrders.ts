/**
 * useDriverShoppingOrders - Fetch available & assigned shopping orders for drivers
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ShoppingOrder {
  id: string;
  store: string;
  status: string;
  items: any[];
  total_amount: number;
  delivery_fee: number;
  delivery_address: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  placed_at: string | null;
  driver_id: string | null;
}

export function useDriverShoppingOrders() {
  const [available, setAvailable] = useState<ShoppingOrder[]>([]);
  const [assigned, setAssigned] = useState<ShoppingOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [driverRecord, setDriverRecord] = useState<{ id: string } | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get driver record
      const { data: driver } = await supabase
        .from("drivers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      setDriverRecord(driver);

      // Available (pending, unassigned)
      const { data: pending } = await supabase
        .from("shopping_orders")
        .select("id, store, status, items, total_amount, delivery_fee, delivery_address, customer_name, customer_phone, placed_at, driver_id")
        .eq("status", "pending")
        .is("driver_id", null)
        .order("placed_at", { ascending: true });

      setAvailable((pending || []).map((o) => ({ ...o, items: Array.isArray(o.items) ? o.items : [] })));

      // My assigned orders (not delivered/cancelled)
      if (driver) {
        const { data: mine } = await supabase
          .from("shopping_orders")
          .select("id, store, status, items, total_amount, delivery_fee, delivery_address, customer_name, customer_phone, placed_at, driver_id")
          .eq("driver_id", driver.id)
          .not("status", "in", '("delivered","cancelled")')
          .order("placed_at", { ascending: true });

        setAssigned((mine || []).map((o) => ({ ...o, items: Array.isArray(o.items) ? o.items : [] })));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const acceptOrder = useCallback(async (orderId: string) => {
    if (!driverRecord) return false;
    const { error } = await supabase
      .from("shopping_orders")
      .update({
        driver_id: driverRecord.id,
        status: "accepted",
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("status", "pending")
      .is("driver_id", null);

    if (!error) {
      await fetchOrders();
      return true;
    }
    return false;
  }, [driverRecord, fetchOrders]);

  const updateStatus = useCallback(async (orderId: string, newStatus: string) => {
    const timestampField: Record<string, string> = {
      shopping: "shopping_started_at",
      shopping_complete: "shopping_completed_at",
      picked_up: "picked_up_at",
      delivered: "delivered_at",
      cancelled: "cancelled_at",
    };

    const updates: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    const tsField = timestampField[newStatus];
    if (tsField) updates[tsField] = new Date().toISOString();

    const { error } = await supabase
      .from("shopping_orders")
      .update(updates)
      .eq("id", orderId);

    if (!error) await fetchOrders();
    return !error;
  }, [fetchOrders]);

  return { available, assigned, isLoading, acceptOrder, updateStatus, refetch: fetchOrders };
}
