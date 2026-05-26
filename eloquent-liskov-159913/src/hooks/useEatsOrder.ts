/**
 * useEatsOrder — Handles placing a food order, payment, and driver dispatch
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createFoodOrder, type EatsCartItem } from "./useEatsData";
import { useEatsNotifications } from "./useEatsNotifications";
import { deductWalletBalance } from "./useWalletPayment";

export interface PlaceOrderParams {
  restaurantId: string;
  items: EatsCartItem[];
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tipAmount: number;
  totalAmount: number;
  paymentType: "cash" | "card" | "wallet" | "paypal" | "square";
  specialInstructions?: string;
  isExpress?: boolean;
  expressFee?: number;
  promoCode?: string;
  discountAmount?: number;
  restaurantName?: string;
  pickupLat?: number;
  pickupLng?: number;
}

export function useEatsOrder() {
  const [placing, setPlacing] = useState(false);
  const { notify } = useEatsNotifications();

  const placeOrder = async (params: PlaceOrderParams): Promise<{
    orderId: string;
    trackingCode: string;
  } | null> => {
    setPlacing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to place an order");
        return null;
      }

      // 1. Create food order in DB
      const result = await createFoodOrder({
        customerId: user.id,
        restaurantId: params.restaurantId,
        items: params.items,
        deliveryAddress: params.deliveryAddress,
        deliveryLat: params.deliveryLat,
        deliveryLng: params.deliveryLng,
        subtotal: params.subtotal,
        deliveryFee: params.deliveryFee,
        serviceFee: params.serviceFee,
        tipAmount: params.tipAmount,
        totalAmount: params.totalAmount,
        paymentType: params.paymentType,
        specialInstructions: params.specialInstructions,
        isExpress: params.isExpress,
        expressFee: params.expressFee,
        promoCode: params.promoCode,
        discountAmount: params.discountAmount,
      });

      const orderId = result.order.id;
      const trackingCode = result.trackingCode;

      // 2. Handle payment
      if (params.paymentType === "card") {
        const totalCents = Math.round(params.totalAmount * 100);
        const { data, error } = await supabase.functions.invoke("create-eats-payment", {
          body: { order_id: orderId, amount_cents: totalCents },
        });
        if (error || !data?.ok) {
          // Mark order payment failed but don't block - they can retry
          console.error("[EatsOrder] Payment intent error:", error || data?.error);
          toast.error("Card payment setup failed. You can retry from order details.");
        } else {
          // Update payment status to processing
          await supabase
            .from("food_orders")
            .update({ payment_status: "processing" } as any)
            .eq("id", orderId);
        }
      } else if (params.paymentType === "cash") {
        await supabase
          .from("food_orders")
          .update({ payment_status: "cash_on_delivery" } as any)
          .eq("id", orderId);
      } else if (params.paymentType === "wallet") {
        const amountCents = Math.round(params.totalAmount * 100);
        const walletResult = await deductWalletBalance(user.id, amountCents, orderId, `Eats order #${trackingCode}`);
        if (walletResult.success) {
          await supabase
            .from("food_orders")
            .update({ payment_status: "paid", payment_provider: "wallet" } as any)
            .eq("id", orderId);
          // Fire confirmation email + SMS — wallet flow doesn't trigger any webhook.
          supabase.functions.invoke("notify-eats-order-confirmed", {
            body: { order_id: orderId, payment_method: "Wallet" },
          }).catch((e) => console.warn("[EatsOrder] confirmation email skipped:", e));
        } else {
          await supabase
            .from("food_orders")
            .update({ payment_status: "failed" } as any)
            .eq("id", orderId);
          toast.error("Wallet payment failed. Please try another method.");
        }
      } else if (params.paymentType === "paypal") {
        const amountCents = Math.round(params.totalAmount * 100);
        const returnUrl = `${window.location.origin}/orders?eats_paypal_return=${orderId}`;
        const cancelUrl = `${window.location.origin}/orders?eats_paypal_cancel=${orderId}`;
        const { data, error } = await supabase.functions.invoke("create-eats-paypal-order", {
          body: { order_id: orderId, amount_cents: amountCents, return_url: returnUrl, cancel_url: cancelUrl },
        });
        if (error || !data?.approve_url) {
          toast.error("PayPal checkout could not start. You can retry from order details.");
        } else {
          window.location.assign(data.approve_url);
        }
      } else if (params.paymentType === "square") {
        const amountCents = Math.round(params.totalAmount * 100);
        const returnUrl = `${window.location.origin}/orders?eats_square_return=${orderId}`;
        const { data, error } = await supabase.functions.invoke("create-eats-square-checkout", {
          body: { order_id: orderId, amount_cents: amountCents, return_url: returnUrl },
        });
        if (error || !data?.url) {
          toast.error("Square checkout could not start. You can retry from order details.");
        } else {
          window.location.assign(data.url);
        }
      }

      // 3. Dispatch delivery driver
      // For redirect-based payments (PayPal/Square) the page is navigating
      // away here — dispatching from the hook is racy AND dispatches an
      // unpaid order. For card payments the webhook fires faster than this
      // hook completes anyway. So: only dispatch from the hook for synchronous
      // payment paths (cash on delivery, wallet). Webhooks handle everything else.
      const dispatchableNow = params.paymentType === "cash" || params.paymentType === "wallet";
      if (dispatchableNow) {
        try {
          const { data: dispatchData, error: dispatchErr } = await supabase.functions.invoke(
            "dispatch-eats-order",
            { body: { order_id: orderId } },
          );
          if (dispatchErr) {
            console.error("[EatsOrder] Dispatch error:", dispatchErr);
          } else if ((dispatchData as any)?.error) {
            console.warn("[EatsOrder] Dispatch refused:", (dispatchData as any).error);
          }
        } catch (dispatchErr) {
          console.error("[EatsOrder] Dispatch invoke error:", dispatchErr);
        }
      }
      // For card/paypal/square: webhooks (stripe-webhook, paypal-eats-webhook,
      // square-eats-webhook) call dispatch-eats-order on payment confirmation.

      // 3.5 Track promo redemption (non-blocking attribution)
      if (params.promoCode && params.discountAmount && params.discountAmount > 0) {
        supabase.functions
          .invoke("track-promo-redemption", {
            body: {
              promo_code: params.promoCode,
              user_id: user.id,
              order_id: orderId,
              discount_cents: Math.round((params.discountAmount || 0) * 100),
              order_total_cents: Math.round(params.totalAmount * 100),
            },
          })
          .catch((err) => console.warn("[EatsOrder] promo attribution failed:", err));
      }

      // 4. Notify
      notify("order_placed", {
        orderId: trackingCode,
        restaurantName: params.restaurantName,
      });

      toast.success("Order placed successfully!");
      return { orderId, trackingCode };
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
      return null;
    } finally {
      setPlacing(false);
    }
  };

  return { placeOrder, placing };
}
