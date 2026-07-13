/** Create order — inserts into food_orders via Supabase */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface HolderInfo {
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  [key: string]: any;
}

export function useCreateOrder() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOrder = useCallback(async (...args: any[]): Promise<{ orderId: string } | null> => {
    if (!user) {
      setError("Please sign in to place an order");
      toast.error("Please sign in first");
      return null;
    }
    setIsLoading(true);
    setError(null);
    try {
      const params = typeof args[0] === "object" && !Array.isArray(args[0]) ? args[0] : { items: args[0], holder: args[1] };
      const items = params.items || [];
      const holder = params.holder || args[1] || {};
      
      const trackingCode = `ZE-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      const { data, error: insertError } = await (supabase as any)
        .from("food_orders")
        .insert({
          customer_id: user.id,
          restaurant_id: params.restaurantId || items[0]?.restaurantId || null,
          items,
          delivery_address: params.deliveryAddress || holder?.address || "",
          total_amount: params.totalAmount || 0,
          payment_type: params.paymentType || "card",
          tracking_code: trackingCode,
          status: "pending",
          subtotal: params.totalAmount || 0,
          holder_name: holder?.name || `${holder?.firstName || ""} ${holder?.lastName || ""}`.trim(),
          holder_email: holder?.email || user.email,
          holder_phone: holder?.phone || "",
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      toast.success("Order created!");
      return { orderId: data.id };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create order";
      setError(msg);
      toast.error(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return { createOrder, isLoading, error };
}
