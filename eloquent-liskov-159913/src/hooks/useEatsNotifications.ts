/**
 * useEatsNotifications — Food order & delivery notification helpers
 * Wraps local + server push for eats lifecycle events
 * Works on iOS, Android (Capacitor) and Web (PWA)
 */
import { useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type EatsEvent =
  | "order_placed"
  | "order_confirmed"
  | "order_preparing"
  | "order_ready"
  | "driver_assigned"
  | "driver_pickup"
  | "out_for_delivery"
  | "order_delivered"
  | "order_cancelled"
  | "new_order_restaurant"
  | "new_delivery_driver";

const eventMessages: Record<EatsEvent, { title: string; body: string }> = {
  order_placed: { title: "Order Placed 🛒", body: "Your order has been submitted and is being reviewed." },
  order_confirmed: { title: "Order Confirmed ✅", body: "The restaurant has confirmed your order." },
  order_preparing: { title: "Preparing Your Food 👨‍🍳", body: "Your order is being prepared in the kitchen." },
  order_ready: { title: "Order Ready! 🍽️", body: "Your food is ready and waiting for pickup." },
  driver_assigned: { title: "Driver Assigned 🚗", body: "A driver has been assigned to deliver your order." },
  driver_pickup: { title: "Driver Picked Up 📦", body: "Your driver has picked up your food and is heading your way." },
  out_for_delivery: { title: "Out for Delivery 🏎️", body: "Your order is on its way to you!" },
  order_delivered: { title: "Order Delivered! 🎉", body: "Your food has arrived. Enjoy your meal!" },
  order_cancelled: { title: "Order Cancelled ❌", body: "Your order has been cancelled." },
  new_order_restaurant: { title: "New Order! 🔔", body: "A new order has been received." },
  new_delivery_driver: { title: "New Delivery 📍", body: "You've been assigned a new delivery." },
};

export function useEatsNotifications() {
  const { user } = useAuth();

  const notify = useCallback(async (
    event: EatsEvent,
    extra?: { body?: string; userId?: string; orderId?: string; restaurantName?: string }
  ) => {
    const msg = eventMessages[event];
    const body = extra?.body || msg.body;
    const targetUserId = extra?.userId || user?.id;

    // In-app toast
    const isError = ["order_cancelled"].includes(event);
    if (isError) {
      toast.error(msg.title, { description: body });
    } else {
      toast.success(msg.title, { description: body });
    }

    // Native local notification on Capacitor
    if (Capacitor.isNativePlatform()) {
      try {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== "granted") {
          await LocalNotifications.requestPermissions();
        }
        await LocalNotifications.schedule({
          notifications: [{
            id: Date.now(),
            title: msg.title,
            body,
            schedule: { at: new Date(Date.now() + 100) },
            sound: undefined,
            actionTypeId: "",
            extra: {
              type: event,
              order_id: extra?.orderId,
            },
          }],
        });
      } catch (err) {
        console.warn("[EatsNotifications] Local notification failed:", err);
      }
    }

    // Server-side push
    if (targetUserId) {
      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            user_id: targetUserId,
            notification_type: event,
            title: msg.title,
            body,
            data: {
              type: "delivery_update",
              order_id: extra?.orderId,
            },
          },
        });
      } catch (err) {
        console.warn("[EatsNotifications] Server push failed:", err);
      }
    }
  }, [user?.id]);

  return { notify };
}
