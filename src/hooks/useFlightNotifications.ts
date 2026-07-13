/**
 * useFlightNotifications — Flight-specific notification helpers
 * Wraps local + server push for flight lifecycle events
 * Works on iOS, Android (Capacitor) and Web (PWA)
 */
import { useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type FlightEvent =
  | "booking_confirmed"
  | "booking_failed"
  | "checkin_reminder"
  | "gate_change"
  | "flight_delayed"
  | "flight_cancelled"
  | "boarding_soon"
  | "flight_departed"
  | "flight_landed"
  | "price_drop"
  | "refund_processed"
  | "itinerary_update";

const eventMessages: Record<FlightEvent, { title: string; body: string }> = {
  booking_confirmed: { title: "Booking Confirmed ✈️", body: "Your flight has been confirmed. Check your itinerary for details." },
  booking_failed: { title: "Booking Failed", body: "We couldn't complete your booking. Please try again or contact support." },
  checkin_reminder: { title: "Check-in Now Open 🎫", body: "Online check-in is available for your upcoming flight." },
  gate_change: { title: "Gate Changed ⚠️", body: "Your departure gate has been updated. Check the new gate number." },
  flight_delayed: { title: "Flight Delayed ⏰", body: "Your flight has been delayed. We'll keep you updated." },
  flight_cancelled: { title: "Flight Cancelled ❌", body: "Unfortunately your flight has been cancelled. Check rebooking options." },
  boarding_soon: { title: "Boarding Soon 🚪", body: "Boarding will begin shortly. Please proceed to your gate." },
  flight_departed: { title: "Flight Departed 🛫", body: "Your flight is now in the air. Have a great trip!" },
  flight_landed: { title: "Flight Landed 🛬", body: "Your flight has landed. Welcome to your destination!" },
  price_drop: { title: "Price Drop Alert 💰", body: "A flight you're watching just dropped in price!" },
  refund_processed: { title: "Refund Processed 💸", body: "Your flight refund has been processed and will appear in your account." },
  itinerary_update: { title: "Itinerary Updated 📋", body: "Your travel itinerary has been updated with new information." },
};

export function useFlightNotifications() {
  const { user } = useAuth();

  const notify = useCallback(async (
    event: FlightEvent,
    extra?: { body?: string; userId?: string; bookingId?: string; flightNumber?: string }
  ) => {
    const msg = eventMessages[event];
    const body = extra?.body || msg.body;
    const targetUserId = extra?.userId || user?.id;

    // Always show in-app toast (foreground)
    const isError = ["booking_failed", "flight_cancelled"].includes(event);
    const isWarning = ["flight_delayed", "gate_change"].includes(event);

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
                flight_number: extra?.flightNumber,
              },
            },
          ],
        });
      } catch (err) {
        console.warn("[FlightNotifications] Local notification failed:", err);
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
              flight_number: extra?.flightNumber,
            },
          },
        });
      } catch (err) {
        console.warn("[FlightNotifications] Server push failed:", err);
      }
    }
  }, [user?.id]);

  return { notify };
}
