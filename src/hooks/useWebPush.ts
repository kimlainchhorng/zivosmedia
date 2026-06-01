/**
 * useWebPush Hook
 * Manages Web Push notification subscriptions with full server-side integration
 * 
 * Requires VAPID secrets configured in Supabase Edge Functions:
 * - VAPID_PUBLIC_KEY
 * - VAPID_PRIVATE_KEY
 * - VAPID_SUBJECT
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { urlBase64ToUint8Array } from "@/lib/push/vapidKey";
import { getSupabaseFunctionAuthHeaders } from "@/lib/supabaseFunctionAuth";
import { getSupabaseFunctionErrorDetails } from "@/lib/supabaseFunctionError";

// VAPID public key - must match server-side VAPID_PUBLIC_KEY secret
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

// Convert ArrayBuffer to base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export interface WebPushState {
  isSupported: boolean;
  permission: NotificationPermission;
  subscription: PushSubscription | null;
  isLoading: boolean;
  error: string | null;
}

export function useWebPush() {
  const { user } = useAuth();
  const [state, setState] = useState<WebPushState>({
    isSupported: false,
    permission: "default",
    subscription: null,
    isLoading: false,
    error: null,
  });

  // Check browser support and current permission on mount
  useEffect(() => {
    const checkSupport = async () => {
      const supported = 
        "PushManager" in window && 
        "serviceWorker" in navigator &&
        "Notification" in window;
      
      setState(prev => ({
        ...prev,
        isSupported: supported,
        permission: supported ? Notification.permission : "denied",
      }));

      // Check for existing subscription
      if (supported && Notification.permission === "granted") {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await (registration as any).pushManager.getSubscription();
          setState(prev => ({ ...prev, subscription }));
        } catch (err) {
          console.error("[useWebPush] Error getting subscription:", err);
        }
      }
    };

    checkSupport();
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<PushSubscription | null> => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: "Push notifications not supported" }));
      return null;
    }

    if (!VAPID_PUBLIC_KEY) {
      console.warn("[useWebPush] VAPID_PUBLIC_KEY not configured");
      setState(prev => ({ 
        ...prev, 
        error: "Push notifications not configured yet" 
      }));
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission !== "granted") {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: "Notification permission denied" 
        }));
        return null;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const vapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });

      // Extract keys
      const p256dhKey = subscription.getKey("p256dh");
      const authKey = subscription.getKey("auth");

      if (!p256dhKey || !authKey) {
        throw new Error("Failed to get subscription keys");
      }

      const authHeaders = await getSupabaseFunctionAuthHeaders();
      if (!authHeaders) {
        await subscription.unsubscribe().catch(() => undefined);
        throw new Error("Sign in again to enable push notifications on this device.");
      }

      // Register with backend
      const { error: registerError } = await supabase.functions.invoke(
        "register-web-push",
        {
          body: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(p256dhKey),
              auth: arrayBufferToBase64(authKey),
            },
          },
          headers: authHeaders,
        }
      );

      if (registerError) {
        const details = await getSupabaseFunctionErrorDetails(registerError);
        console.error("[useWebPush] Registration error:", details.message || registerError);
        await subscription.unsubscribe().catch(() => undefined);
        throw new Error(details.message || "Failed to register push subscription with ZIVO.");
      }

      setState(prev => ({
        ...prev,
        subscription,
        isLoading: false,
      }));

      return subscription;
    } catch (err) {
      console.error("[useWebPush] Subscribe error:", err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to subscribe",
      }));
      return null;
    }
  }, [state.isSupported]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!state.subscription) {
      return true;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const endpoint = state.subscription.endpoint;
      const authHeaders = await getSupabaseFunctionAuthHeaders();
      if (!authHeaders) {
        throw new Error("Sign in again to disable push notifications on this device.");
      }
      
      // Unsubscribe from browser
      await state.subscription.unsubscribe();

      // Remove from backend
      try {
        await supabase.functions.invoke("unregister-web-push", {
          body: { endpoint },
          headers: authHeaders,
        });
      } catch (serverErr) {
        console.warn("[useWebPush] Failed to remove from server:", serverErr);
        // Continue anyway - browser is unsubscribed
      }

      setState(prev => ({
        ...prev,
        subscription: null,
        isLoading: false,
      }));

      return true;
    } catch (err) {
      console.error("[useWebPush] Unsubscribe error:", err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to unsubscribe",
      }));
      return false;
    }
  }, [state.subscription]);

  // Send test notification via server (real end-to-end test)
  const sendTestNotification = useCallback(async () => {
    if (!user?.id) {
      // Fallback to local notification if not logged in
      if (Notification.permission === "granted") {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification("ZIVO Test", {
          body: "Push notifications are working!",
          icon: "/pwa-icons/icon-192x192.png",
          badge: "/pwa-icons/icon-192x192.png",
          tag: "test",
        });
      }
      return;
    }

    // Send through the production dispatcher so the test respects the user's
    // master push opt-out and quiet-hours preferences.
    try {
      const authHeaders = await getSupabaseFunctionAuthHeaders();
      if (!authHeaders) throw new Error("Sign in again to send a test notification.");

      const { error } = await supabase.functions.invoke("notify-dispatch", {
        body: {
          user_id: user.id,
          event_type: "push_test",
          title: "ZIVO Push Test",
          body: "Push notifications are working end-to-end!",
          channels: ["push"],
          category: "transactional",
          data: { type: "test", url: "/account" },
        },
        headers: authHeaders,
      });

      if (error) {
        console.error("[useWebPush] Test notification error:", error);
        // Fallback to local
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification("ZIVO Test", {
          body: "Push notifications are working locally!",
          icon: "/pwa-icons/icon-192x192.png",
          badge: "/pwa-icons/icon-192x192.png",
          tag: "test",
        });
      } else {
        // Test notification sent successfully
      }
    } catch (err) {
      console.error("[useWebPush] Test notification failed:", err);
    }
  }, [user]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendTestNotification,
    isConfigured: !!VAPID_PUBLIC_KEY,
  };
}
