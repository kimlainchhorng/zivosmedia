/**
 * useRideNotifications — Ride-specific notification helpers
 * Wraps local + server push for ride lifecycle events
 * Works on iOS, Android (Capacitor) and Web (PWA)
 */
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { notify as showNotification } from "@/lib/notify";

export type RideEvent =
  | "driver_assigned"
  | "driver_en_route"
  | "driver_arrived"
  | "trip_started"
  | "trip_completed"
  | "trip_cancelled"
  | "surge_alert"
  | "promo_available";

const eventMessages: Record<RideEvent, { title: string; body: string }> = {
  driver_assigned: { title: "Driver Found!", body: "Your driver is on the way to your pickup location." },
  driver_en_route: { title: "Driver En Route", body: "Your driver is heading to pick you up." },
  driver_arrived: { title: "Driver Arrived", body: "Your driver has arrived at the pickup point." },
  trip_started: { title: "Trip Started", body: "You're on your way! Enjoy your ride." },
  trip_completed: { title: "Trip Complete", body: "You've arrived at your destination. Rate your ride!" },
  trip_cancelled: { title: "Ride Cancelled", body: "Your ride has been cancelled." },
  surge_alert: { title: "Prices Dropping", body: "Demand is decreasing in your area. Check for lower fares!" },
  promo_available: { title: "New Promo!", body: "A new promo code is available for your next ride." },
};

const eventActionLabels: Partial<Record<RideEvent, string>> = {
  driver_assigned: "Track",
  driver_en_route: "Track",
  driver_arrived: "Track",
  trip_started: "Track",
  trip_completed: "Rate",
  trip_cancelled: "View",
  surge_alert: "View",
  promo_available: "View",
};

function defaultDeepLink(event: RideEvent, jobId?: string): string {
  switch (event) {
    case "driver_assigned":
    case "driver_en_route":
    case "driver_arrived":
    case "trip_started":
      return jobId ? `/rides/track/${jobId}` : "/rides/hub";
    case "trip_completed":
      return jobId ? `/rides/track/${jobId}` : "/rides/hub?tab=history";
    case "trip_cancelled":
      return "/rides/hub";
    case "surge_alert":
      return "/rides/hub";
    case "promo_available":
      return "/wallet/promos";
    default:
      return "/rides/hub";
  }
}

// Deterministic 31-bit hash for a string (LocalNotifications id must be int32)
function hashId(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 2147483647;
}

type NotifyExtra = {
  body?: string;
  userId?: string;
  jobId?: string;
  onAction?: () => void;
};

export function useRideNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const notify = useCallback(async (event: RideEvent, extra?: NotifyExtra) => {
    const msg = eventMessages[event];
    const body = extra?.body || msg.body;
    const targetUserId = extra?.userId || user?.id;
    const jobId = extra?.jobId;

    const deepLink = defaultDeepLink(event, jobId);
    const handleAction = extra?.onAction ?? (() => navigate(deepLink));
    const actionLabel = eventActionLabels[event];

    // Always show branded in-app toast (foreground)
    showNotification.ride(event, {
      title: msg.title,
      body,
      actionLabel,
      onAction: handleAction,
      onBodyClick: handleAction,
      // Stable id so the same event for the same job replaces an existing toast
      id: jobId ? `ride-${jobId}-${event}` : undefined,
    });

    // Native local notification on Capacitor (immediate, works offline)
    if (Capacitor.isNativePlatform()) {
      try {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== "granted") {
          await LocalNotifications.requestPermissions();
        }
        const dedupKey = `${jobId ?? "global"}-${event}`;
        await LocalNotifications.schedule({
          notifications: [
            {
              id: hashId(dedupKey),
              title: msg.title,
              body,
              schedule: { at: new Date(Date.now() + 100) },
              sound: undefined,
              actionTypeId: "",
              extra: { type: event, jobId, deepLink },
            },
          ],
        });
      } catch (err) {
        console.warn("[RideNotifications] Local notification failed:", err);
      }
    }

    // Server-side push (reaches background/closed app on all platforms)
    if (targetUserId) {
      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            user_id: targetUserId,
            notification_type: event,
            title: msg.title,
            body,
            data: { type: event, jobId, deepLink },
          },
        });
      } catch (err) {
        console.warn("[RideNotifications] Server push failed:", err);
      }
    }
  }, [user?.id, navigate]);

  return { notify };
}
