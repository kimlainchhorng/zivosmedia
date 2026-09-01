/**
 * useEatsOrder — Handles placing a food order, payment, and driver dispatch
 */
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createFoodOrder, type EatsCartItem } from "./useEatsData";
import { deductWalletBalance } from "./useWalletPayment";
import {
  isAllowedPayPalCheckoutUrl,
  isAllowedSquareCheckoutUrl,
} from "@/lib/urlSafety";
import {
  EATS_ORDERING_ENABLED,
  isEatsPaymentRailEnabled,
  type EatsPaymentRail,
} from "@/lib/eatsPaymentCapabilities";

export interface PlaceOrderParams {
  restaurantId: string;
  items: EatsCartItem[];
  orderMode: "delivery" | "pickup";
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tipAmount: number;
  totalAmount: number;
  paymentType: EatsPaymentRail;
  specialInstructions?: string;
  isScheduled?: boolean;
  scheduledFor?: string;
  isExpress?: boolean;
  expressFee?: number;
  promoCode?: string;
  discountAmount?: number;
  restaurantName?: string;
  pickupLat?: number;
  pickupLng?: number;
}

type SavedOrderResult = {
  orderId: string;
  trackingCode: string;
};

export type PlaceOrderResult =
  | (SavedOrderResult & { outcome: "placed" })
  | (SavedOrderResult & {
      outcome: "confirmation_pending";
      rail: "wallet" | "cash";
    })
  | (SavedOrderResult & {
      outcome: "payment_failed";
      rail: "wallet" | "card" | "paypal" | "square";
    })
  | (SavedOrderResult & {
      outcome: "card_payment_required";
      rail: "card";
      clientSecret: string;
      amountCents: number;
    })
  | (SavedOrderResult & {
      outcome: "external_checkout_started";
      rail: "paypal" | "square";
    });

export function useEatsOrder() {
  const [placing, setPlacing] = useState(false);
  const placingRef = useRef(false);

  const placeOrder = async (
    params: PlaceOrderParams,
  ): Promise<PlaceOrderResult | null> => {
    if (placingRef.current) return null;
    placingRef.current = true;
    setPlacing(true);
    try {
      if (!EATS_ORDERING_ENABLED) {
        toast.error(
          "Food ordering is temporarily unavailable while restaurant delivery setup is completed",
        );
        return null;
      }
      if (!isEatsPaymentRailEnabled(params.paymentType)) {
        toast.error("This payment method is not available yet");
        return null;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to place an order");
        return null;
      }

      // 1. Create food order in DB
      const result = await createFoodOrder({
        customerId: user.id,
        restaurantId: params.restaurantId,
        items: params.items,
        orderMode: params.orderMode,
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
        isScheduled: params.isScheduled,
        scheduledFor: params.scheduledFor,
        isExpress: params.isExpress,
        expressFee: params.expressFee,
        promoCode: params.promoCode,
        discountAmount: params.discountAmount,
      });

      const orderId = result.order.id;
      const trackingCode = result.trackingCode;
      const payableCents = Math.round(Number(result.order.total_amount) * 100);

      if (
        params.paymentType !== "cash" &&
        (!Number.isSafeInteger(payableCents) || payableCents < 50)
      ) {
        await markPaymentFailed(orderId, "Saved order total is unavailable");
        return {
          orderId,
          trackingCode,
          outcome: "payment_failed",
          rail: params.paymentType,
        };
      }

      // 2. Handle payment
      if (params.paymentType === "card") {
        const { data, error } = await supabase.functions.invoke(
          "create-eats-payment",
          {
            body: { order_id: orderId, amount_cents: payableCents },
          },
        );
        if (error || !data?.ok || !data?.client_secret) {
          console.error(
            "[EatsOrder] Payment intent error:",
            error || data?.error,
          );
          await markPaymentFailed(orderId, "Card payment setup failed");
          return {
            orderId,
            trackingCode,
            outcome: "payment_failed",
            rail: "card",
          };
        }

        const { data: statusData, error: statusError } =
          await supabase.functions.invoke("eats-payment-status-update", {
            body: { order_id: orderId, action: "card_processing" },
          });
        if (statusError || !statusData?.ok) {
          console.error(
            "[EatsOrder] card_processing status update failed:",
            statusError || statusData?.error,
          );
        }

        // PaymentElement must confirm this intent before any success,
        // notification, or delivery dispatch is shown.
        return {
          orderId,
          trackingCode,
          outcome: "card_payment_required",
          rail: "card",
          clientSecret: String(data.client_secret),
          amountCents: payableCents,
        };
      } else if (params.paymentType === "cash") {
        const { data, error } = await supabase.functions.invoke(
          "eats-payment-status-update",
          {
            body: { order_id: orderId, action: "cash_on_delivery" },
          },
        );
        if (error || !data?.ok) {
          // The order already exists. Cash confirmation now owns the trusted
          // service-role dispatch, so a failed/ambiguous response must move the
          // saved order to reconciliation instead of creating a second order.
          console.error(
            "[EatsOrder] cash_on_delivery status update failed:",
            error || data?.error,
          );
          return {
            orderId,
            trackingCode,
            outcome: "confirmation_pending",
            rail: "cash",
          };
        }
        if (!isConfirmedOrderResponse(data, orderId, "cash_on_delivery")) {
          return {
            orderId,
            trackingCode,
            outcome: "confirmation_pending",
            rail: "cash",
          };
        }
      } else if (params.paymentType === "wallet") {
        const walletResult = await deductWalletBalance(
          user.id,
          payableCents,
          orderId,
          `Eats order #${trackingCode}`,
        );
        if (walletResult.success) {
          const { data, error } = await supabase.functions.invoke(
            "eats-payment-status-update",
            {
              body: { order_id: orderId, action: "wallet_paid" },
            },
          );
          if (error || !data?.ok) {
            // The wallet has already been debited. If the order is not marked
            // paid it is never dispatched and never reaches the restaurant, so
            // return the saved order as a recovery outcome. The caller must
            // clear checkout and move the customer to the non-resubmittable
            // confirmation-recovery screen instead of returning null.
            console.error(
              "[EatsOrder] wallet_paid status update failed:",
              error || data?.error,
            );
            return {
              orderId,
              trackingCode,
              outcome: "confirmation_pending",
              rail: "wallet",
            };
          }
          if (!isConfirmedOrderResponse(data, orderId, "paid")) {
            return {
              orderId,
              trackingCode,
              outcome: "confirmation_pending",
              rail: "wallet",
            };
          }
        } else {
          if (walletResult.outcome === "unknown") {
            // The debit response was ambiguous. Never call the debit endpoint
            // again from checkout. The tracking screen verifies the existing
            // ledger by order ID and completes confirmation/dispatch if it
            // committed.
            return {
              orderId,
              trackingCode,
              outcome: "confirmation_pending",
              rail: "wallet",
            };
          }

          await markPaymentFailed(orderId, "Wallet payment was not charged");
          return {
            orderId,
            trackingCode,
            outcome: "payment_failed",
            rail: "wallet",
          };
        }
      } else if (params.paymentType === "paypal") {
        const returnUrl = `${window.location.origin}/eats/track/${orderId}?eats_paypal_return=${orderId}`;
        const cancelUrl = `${window.location.origin}/eats/track/${orderId}?eats_paypal_cancel=${orderId}`;
        const { data, error } = await supabase.functions.invoke(
          "create-eats-paypal-order",
          {
            body: {
              order_id: orderId,
              return_url: returnUrl,
              cancel_url: cancelUrl,
            },
          },
        );
        if (
          error ||
          !data?.approve_url ||
          !isAllowedPayPalCheckoutUrl(data.approve_url)
        ) {
          await markPaymentFailed(orderId, "PayPal checkout could not start");
          return {
            orderId,
            trackingCode,
            outcome: "payment_failed",
            rail: "paypal",
          };
        } else {
          window.location.assign(data.approve_url);
          return {
            orderId,
            trackingCode,
            outcome: "external_checkout_started",
            rail: "paypal",
          };
        }
      } else if (params.paymentType === "square") {
        const returnUrl = `${window.location.origin}/eats/track/${orderId}?eats_square_return=${orderId}`;
        const { data, error } = await supabase.functions.invoke(
          "create-eats-square-checkout",
          {
            body: {
              order_id: orderId,
              amount_cents: payableCents,
              return_url: returnUrl,
            },
          },
        );
        if (error || !data?.url || !isAllowedSquareCheckoutUrl(data.url)) {
          await markPaymentFailed(orderId, "Square checkout could not start");
          return {
            orderId,
            trackingCode,
            outcome: "payment_failed",
            rail: "square",
          };
        } else {
          window.location.assign(data.url);
          return {
            orderId,
            trackingCode,
            outcome: "external_checkout_started",
            rail: "square",
          };
        }
      }

      // 3. Dispatch authority stays server-side. Wallet and cash confirmation
      // invoke the idempotent dispatcher with the service role inside
      // eats-payment-status-update; card/PayPal/Square webhooks do the same.
      // The browser never invokes dispatch-eats-order directly.

      // 3.5 Track promo redemption (non-blocking attribution)
      if (
        params.promoCode &&
        params.discountAmount &&
        params.discountAmount > 0
      ) {
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
          .catch((err) =>
            console.warn("[EatsOrder] promo attribution failed:", err),
          );
      }

      return { orderId, trackingCode, outcome: "placed" };
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
      return null;
    } finally {
      placingRef.current = false;
      setPlacing(false);
    }
  };

  return { placeOrder, placing };
}

async function markPaymentFailed(orderId: string, message: string) {
  const { data, error } = await supabase.functions.invoke(
    "eats-payment-status-update",
    {
      body: {
        order_id: orderId,
        action: "payment_failed",
        error_message: message,
      },
    },
  );
  if (error || !data?.ok) {
    console.error(
      "[EatsOrder] payment_failed status update failed:",
      error || data?.error,
    );
  }

  // A known pre-payment failure is not ambiguous: close the exact saved order
  // so the atomic cancellation trigger releases limited stock and promo quota.
  // If this cleanup fails, the signed stale-order job remains the server-owned
  // 60-minute backstop; never create a replacement order here.
  const { data: cancelData, error: cancelError } =
    await supabase.functions.invoke("cancel-eats-order", {
      body: {
        order_id: orderId,
        reason: "payment_setup_failed",
      },
    });
  if (
    cancelError ||
    cancelData?.ok !== true ||
    cancelData?.status !== "cancelled"
  ) {
    console.error(
      "[EatsOrder] failed unpaid order cleanup was not confirmed:",
      cancelError || cancelData?.error,
    );
  }
}

function isConfirmedOrderResponse(
  data: unknown,
  orderId: string,
  expectedPaymentStatus: "paid" | "cash_on_delivery",
): boolean {
  const response = data as {
    ok?: unknown;
    state?: unknown;
    order?: { id?: unknown; payment_status?: unknown } | null;
  } | null;
  return Boolean(
    response?.ok === true &&
    response.state === "confirmed" &&
    response.order?.id === orderId &&
    response.order.payment_status === expectedPaymentStatus,
  );
}
