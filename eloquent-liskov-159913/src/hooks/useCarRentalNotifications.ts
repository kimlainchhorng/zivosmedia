/**
 * useCarRentalNotifications — Car rental-specific notification helpers
 * Wraps local + server push for rental lifecycle events
 * Works on iOS, Android (Capacitor) and Web (PWA)
 */
import { useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type CarRentalEvent =
  | "booking_confirmed"
  | "booking_failed"
  | "payment_confirmed"
  | "payment_failed"
  | "pickup_reminder"
  | "pickup_today"
  | "return_reminder"
  | "return_today"
  | "booking_cancelled"
  | "price_adjusted";

const eventMessages: Record<CarRentalEvent, { title: string; body: string }> = {
  booking_confirmed: { title: "Booking Confirmed 🎉", body: "Your car rental has been confirmed. See you at pickup!" },
  booking_failed: { title: "Booking Failed", body: "We couldn't complete your booking. Please try again or contact support." },
  payment_confirmed: { title: "Payment Confirmed ✅", body: "Your payment has been processed successfully." },
  payment_failed: { title: "Payment Failed", body: "We couldn't process your payment. Please update your payment method." },
  pickup_reminder: { title: "Pickup Reminder 🚗", body: "Your car rental pickup is coming up soon. Prepare your documents." },
  pickup_today: { title: "Pickup Today 🔑", body: "Your car rental pickup is today. Head to the location to get your keys." },
  return_reminder: { title: "Return Reminder ⏰", body: "Please remember to return your rental car today or tomorrow." },
  return_today: { title: "Return Today 🔙", body: "Your rental car needs to be returned today. Head to the location." },
  booking_cancelled: { title: "Booking Cancelled ❌", body: "Your car rental booking has been cancelled. A refund will be processed." },
  price_adjusted: { title: "Price Adjusted 💰", body: "The price for your rental has been adjusted. Check your booking for details." },
};

export function useCarRentalNotifications() {
  const { user } = useAuth();

  const notify = useCallback(async (
    event: CarRentalEvent,
    extra?: { body?: string; userId?: string; bookingId?: string; vehicleInfo?: string }
  ) => {
    const msg = eventMessages[event];
    const body = extra?.body || msg.body;
    const targetUserId = extra?.userId || user?.id;

    // Always show in-app toast (foreground)
    const isError = ["booking_failed", "payment_failed", "booking_cancelled"].includes(event);
    const isWarning = ["return_reminder", "return_today"].includes(event);

    if (isError) {
      toast.error(msg.title, { description: body });
    } else if (isWarning) {
      toast.warning(msg.title, { description: body });
    } else {
      toast.success(msg.title, { description: body });
    }

    // Native local notification on Capacitor (immediate, works offline)
    if (Capacitor.isNativePlatform()) {
      try {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== "granted") {
          await LocalNotifications.requestPermissions();
        }
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Date.now(),
              title: msg.title,
              body,
              schedule: { at: new Date(Date.now() + 100) },
              sound: undefined,
              actionTypeId: "",
              extra: {
                type: event,
                booking_id: extra?.bookingId,
                vehicle_info: extra?.vehicleInfo,
              },
            },
          ],
        });
      } catch (err) {
        console.warn("[CarRentalNotifications] Local notification failed:", err);
      }
    }

    // Server-side push (reaches background/closed app)
    if (targetUserId) {
      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            user_id: targetUserId,
            notification_type: event,
            title: msg.title,
            body,
            data: {
              type: event,
              booking_id: extra?.bookingId,
              vehicle_info: extra?.vehicleInfo,
            },
          },
        });
      } catch (err) {
        console.warn("[CarRentalNotifications] Server push failed:", err);
      }
    }
  }, [user?.id]);

  return { notify };
}
