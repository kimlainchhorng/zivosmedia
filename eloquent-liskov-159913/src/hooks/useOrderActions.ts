/** Order actions — cancel, resend confirmation via Supabase */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useOrderActions() {
  const [isCancelling, setIsCancelling] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const cancelOrder = useCallback(async (orderId: string) => {
    setIsCancelling(true);
    try {
      const { error } = await supabase
        .from("food_orders")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() } as any)
        .eq("id", orderId);
      if (error) throw error;
      toast.success("Order cancelled");
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel order");
    } finally {
      setIsCancelling(false);
    }
  }, []);

  const resendConfirmation = useCallback(async (orderId: string) => {
    setIsResending(true);
    try {
      // `send-order-confirmation` was never deployed. Re-trigger the
      // receipt-email flow instead so the user actually gets a fresh
      // confirmation in their inbox.
      const { error } = await supabase.functions.invoke("eats-order-receipt", {
        body: { order_id: orderId },
      });
      if (error) throw error;
      toast.success("Confirmation resent");
    } catch (e: any) {
      toast.error(e?.message || "Failed to resend confirmation");
    } finally {
      setIsResending(false);
    }
  }, []);

  return { cancelOrder, isCancelling, resendConfirmation, isResending };
}
