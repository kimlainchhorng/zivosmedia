/**
 * Push Notifications Hook
 * Handles push notification registration and management for Capacitor apps
 */
import { createElement, useState, useEffect, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import type { Token, PushNotificationSchema, ActionPerformed } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { safeInternalPath } from "@/lib/urlSafety";

export interface NotificationData {
  title: string;
  body: string;
  type?: string;
  data?: Record<string, any>;
}

export interface PushNotificationState {
  isSupported: boolean;
  isRegistered: boolean;
  token: string | null;
  permission: "granted" | "denied" | "prompt" | "unknown";
}

type IncomingCallPayload = {
  type: "incoming_call";
  call_id?: string;
  caller_id?: string;
  call_type?: "voice" | "video";
  caller_name?: string;
  caller_avatar?: string;
};

const normalizeIncomingCallPayload = (
  rawData: Record<string, any> | undefined,
  fallbackTitle?: string,
  fallbackBody?: string,
): IncomingCallPayload | null => {
  if (!rawData) return null;

  const nested = typeof rawData.data === "object" && rawData.data !== null
    ? rawData.data as Record<string, any>
    : {};

  const merged = { ...nested, ...rawData };
  const type = String(merged.type || merged.notification_type || "").toLowerCase();

  const hasCallHints = Boolean(merged.call_id || merged.caller_id || merged.call_type);
  const textHint = `${fallbackTitle || ""} ${fallbackBody || ""}`.toLowerCase();
  const looksLikeCallText = textHint.includes("calling") && textHint.includes("you");

  if (type !== "incoming_call" && !(hasCallHints && looksLikeCallText)) {
    return null;
  }

  const callType = merged.call_type === "video" ? "video" : "voice";

  return {
    type: "incoming_call",
    call_id: typeof merged.call_id === "string" ? merged.call_id : undefined,
    caller_id: typeof merged.caller_id === "string" ? merged.caller_id : undefined,
    call_type: callType,
    caller_name: typeof merged.caller_name === "string" ? merged.caller_name : fallbackTitle,
    caller_avatar: typeof merged.caller_avatar === "string" ? merged.caller_avatar : undefined,
  };
};

const normalizeLaunchUrl = (url: string | undefined | null): string | null => {
  if (!url) return null;

  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const parsed = new URL(url);
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }

    const schemeMatch = url.match(/^[a-z][a-z0-9+.-]*:\/\/(.*)$/i);
    if (schemeMatch) {
      const remainder = schemeMatch[1] || "";
      return remainder.startsWith("/") ? remainder : `/${remainder}`;
    }

    return url.startsWith("/") ? url : `/${url}`;
  } catch {
    return null;
  }
};

export const usePushNotifications = () => {
  const { user, session } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isRegistered: false,
    token: null,
    permission: "unknown",
  });
  const [notifications, setNotifications] = useState<PushNotificationSchema[]>([]);
  const tokenRetryAttemptsRef = useRef<Record<string, number>>({});
  const pendingNativeTokenRef = useRef<string | null>(null);
  const recentIncomingPushRef = useRef<Record<string, number>>({});
  const activeChatRef = useRef<string | null>(null);

  useEffect(() => {
    const handleChatOpen = (event: Event) => {
      const customEvent = event as CustomEvent<{ recipientId?: string }>;
      activeChatRef.current = customEvent.detail?.recipientId || null;
    };
    const handleChatClose = () => {
      activeChatRef.current = null;
    };

    window.addEventListener("chat-opened" as any, handleChatOpen);
    window.addEventListener("chat-closed" as any, handleChatClose);

    return () => {
      window.removeEventListener("chat-opened" as any, handleChatOpen);
      window.removeEventListener("chat-closed" as any, handleChatClose);
    };
  }, []);

  const showChatToast = useCallback((senderId: string, senderName: string, messageText: string, senderAvatar?: string | null) => {
    void import("@/components/chat/ChatNotificationToast")
      .then(({ default: ChatNotificationToast }) => {
        toast.custom((toastId) => createElement(ChatNotificationToast, {
          senderId,
          senderName,
          senderAvatar,
          messageText: messageText || "Sent you a message",
          onDismiss: () => toast.dismiss(toastId),
          onReply: (id: string) => {
            try { sessionStorage.setItem("pendingChatWith", id); } catch {}
            window.location.href = `/chat?with=${encodeURIComponent(id)}`;
          },
        }), { duration: 5000 });
      })
      .catch(() => {
        toast.message(senderName, { description: messageText || "Sent you a message" });
      });
  }, []);

  // Check if push notifications are supported (native or web with service worker)
  const checkSupport = useCallback(() => {
    const isNative = Capacitor.isNativePlatform();
    const hasWebPush = !isNative && "serviceWorker" in navigator && "PushManager" in window;
    setState(prev => ({ ...prev, isSupported: isNative || hasWebPush }));
    return isNative || hasWebPush;
  }, []);

  // Request permission and register for push notifications
  const register = useCallback(async (): Promise<boolean> => {
    // --- Native (Capacitor) registration ---
    if (Capacitor.isNativePlatform()) {
      try {
        const permStatus = await PushNotifications.checkPermissions();
        
        if (permStatus.receive === "prompt") {
          const requestResult = await PushNotifications.requestPermissions();
          if (requestResult.receive !== "granted") {
            setState(prev => ({ ...prev, permission: "denied" }));
            return false;
          }
        } else if (permStatus.receive !== "granted") {
          setState(prev => ({ ...prev, permission: "denied" }));
          return false;
        }

        setState(prev => ({ ...prev, permission: "granted" }));
        await PushNotifications.register();
        return true;
      } catch (error) {
        console.error("[Push] Native registration error:", error);
        return false;
      }
    }

    // --- Web Push (VAPID / Service Worker) registration ---
    if ("serviceWorker" in navigator && "PushManager" in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setState(prev => ({ ...prev, permission: "denied" }));
          return false;
        }

        setState(prev => ({ ...prev, permission: "granted" }));

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY || undefined,
        });

        // Send subscription to server
        const subJson = subscription.toJSON();
        if (subJson.endpoint && subJson.keys) {
          const { error } = await supabase.functions.invoke("register-web-push", {
            body: {
              endpoint: subJson.endpoint,
              keys: {
                p256dh: subJson.keys.p256dh,
                auth: subJson.keys.auth,
              },
            },
          });

          if (error) {
            console.error("[Push] Web push registration error:", error);
          } else {
            setState(prev => ({ ...prev, isRegistered: true, token: subJson.endpoint }));
            if (import.meta.env.DEV) console.log("[Push] Web push subscription registered");
          }
        }
        return true;
      } catch (error) {
        console.error("[Push] Web push registration error:", error);
        return false;
      }
    }

    return false;
  }, []);

  useEffect(() => {
    const handleRegisterRequest = () => {
      void register();
    };

    window.addEventListener("zivo-register-push", handleRegisterRequest);
    return () => {
      window.removeEventListener("zivo-register-push", handleRegisterRequest);
    };
  }, [register]);

  // Save token to database so server-side push delivery can target this device.
  const saveToken = useCallback(async (token: string, saveAttempt = 0) => {
    if (!user?.id) return;

    try {
      const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'
      const { data: { session: storedSession } } = await supabase.auth.getSession();
      const activeSession = session ?? storedSession;

      // Native auth/session hydration can lag behind registration event after app launch.
      // Retry a few times so token registration doesn't silently fail with 401.
      if (!activeSession?.access_token) {
        const sessionRetryAttempt = (tokenRetryAttemptsRef.current[token] || 0) + 1;
        tokenRetryAttemptsRef.current[token] = sessionRetryAttempt;

        if (sessionRetryAttempt <= 8) {
          setTimeout(() => {
            void saveToken(token);
          }, 700 * sessionRetryAttempt);
          return;
        }

        console.error("[Push] Could not register token: auth session unavailable");
        return;
      }
      
      setState(prev => ({ ...prev, isRegistered: true, token }));

      const now = new Date().toISOString();
      const payload = {
        user_id: user.id,
        token,
        platform,
        is_active: true,
        last_used_at: now,
        updated_at: now,
      } as const;

      const { error: registerError } = await supabase.functions.invoke("register-push-token", {
        body: {
          token,
          platform,
          deactivate: false,
        },
        headers: {
          Authorization: `Bearer ${activeSession.access_token}`,
        },
      });

      if (registerError) {
        console.error("[Push] register-push-token failed, falling back to direct upsert:", registerError);

        // Prefer typed Supabase upsert to avoid REST header/on_conflict edge cases.
        const { error: upsertError } = await (supabase as any)
          .from("device_tokens")
          .upsert(payload, { onConflict: "user_id,token" });

        if (upsertError) {
          const msg = String(upsertError.message || "").toLowerCase();
          console.error("[Push] Error saving token to server:", upsertError);
          if ((msg.includes("jwt") || msg.includes("auth") || msg.includes("expired") || msg.includes("401")) && saveAttempt < 2) {
            setTimeout(() => {
              void saveToken(token, saveAttempt + 1);
            }, 800);
          }
          return;
        }
      }

      delete tokenRetryAttemptsRef.current[token];
      pendingNativeTokenRef.current = null;
      if (import.meta.env.DEV) console.log(`[Push] ${platform} token registered successfully`);
    } catch (error) {
      console.error("[Push] Error saving token:", error);
    }
  }, [session, user?.id]);

  useEffect(() => {
    if (!user?.id || !pendingNativeTokenRef.current) return;
    void saveToken(pendingNativeTokenRef.current);
  }, [user?.id, saveToken]);

  // Initialize push notifications
  useEffect(() => {
    checkSupport();

    if (!Capacitor.isNativePlatform()) {
      // Web: only auto-register if the user has already granted permission.
      // Never call register() silently — it would trigger the browser permission
      // prompt without the user asking. Explicit "Enable Notifications" buttons
      // in Settings call register() directly.
      if (user?.id && "serviceWorker" in navigator && "PushManager" in window) {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          register();
        }
      }
      return;
    }

    // Set up listeners
    const registrationListener = PushNotifications.addListener(
      "registration",
      (token: Token) => {
        if (!user?.id) {
          pendingNativeTokenRef.current = token.value;
          return;
        }
        void saveToken(token.value);
      }
    );

    const registrationErrorListener = PushNotifications.addListener(
      "registrationError",
      (error) => {
        console.error("[Push] Registration error:", error);
        toast.error("Failed to register for notifications");
      }
    );

    const notificationReceivedListener = PushNotifications.addListener(
      "pushNotificationReceived",
      (notification: PushNotificationSchema) => {
        setNotifications(prev => [notification, ...prev].slice(0, 50));

        const payloadData = notification.data as Record<string, any> | undefined;
        const nestedPayloadData = typeof payloadData?.data === "object" && payloadData.data !== null
          ? payloadData.data as Record<string, any>
          : {};
        const mergedPayloadData = { ...nestedPayloadData, ...(payloadData || {}) };
        const incomingCall = normalizeIncomingCallPayload(mergedPayloadData, notification.title, notification.body);

        if (incomingCall) {
          const dedupeKey = incomingCall.call_id || `${incomingCall.caller_id || "unknown"}:${incomingCall.call_type || "voice"}`;
          const now = Date.now();
          const lastSeen = recentIncomingPushRef.current[dedupeKey] || 0;
          if (now - lastSeen < 4000) return;
          recentIncomingPushRef.current[dedupeKey] = now;

          window.dispatchEvent(new CustomEvent("incoming-call-push", {
            detail: {
              call_id: incomingCall.call_id,
              caller_id: incomingCall.caller_id,
              call_type: incomingCall.call_type,
              caller_name: incomingCall.caller_name || notification.title,
              caller_avatar: incomingCall.caller_avatar,
            },
          }));
          return;
        }

        // For chat messages, show actionable toast with profile avatar.
        const notifType = String(mergedPayloadData.type || mergedPayloadData.notification_type || "").toLowerCase();
        const chatSenderId = mergedPayloadData.sender_id || mergedPayloadData.senderId || mergedPayloadData.from_user_id;
        const chatSenderName = mergedPayloadData.sender_name || mergedPayloadData.senderName || notification.title || "Someone";
        const chatSenderAvatar = mergedPayloadData.sender_avatar_url || mergedPayloadData.senderAvatarUrl || mergedPayloadData.image_url || null;
        const chatActionUrl = typeof mergedPayloadData.action_url === "string" ? mergedPayloadData.action_url : "";
        const chatSenderFromUrl = (() => {
          try { return chatActionUrl ? new URL(chatActionUrl, "https://x").searchParams.get("with") : null; } catch { return null; }
        })();
        const resolvedChatSenderId = chatSenderId || chatSenderFromUrl;
        const isForegroundChat = notifType === "chat_message" || notifType === "new_message" || chatActionUrl.startsWith("/chat");
        if (isForegroundChat && resolvedChatSenderId) {
          const normalizedSenderId = String(resolvedChatSenderId);
          if (normalizedSenderId === user?.id) return;
          if (activeChatRef.current === normalizedSenderId) return;

          showChatToast(
            normalizedSenderId,
            String(chatSenderName),
            notification.body || "Sent you a message",
            typeof chatSenderAvatar === "string" ? chatSenderAvatar : null,
          );
        } else {
          // Show in-app toast for other foreground notifications
          toast.info(notification.title || "Notification", {
            description: notification.body,
          });
        }
      }
    );

    const notificationActionListener = PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action: ActionPerformed) => {
        
        handleNotificationAction(action);
      }
    );

    const appResumeListener = import("@capacitor/app").then(({ App: CapacitorApp }) => CapacitorApp.addListener("appStateChange", ({ isActive }) => {
      if (!isActive || !user?.id) return;
      // iOS can rotate APNs tokens and background lifecycle can drop listeners.
      // Re-register on resume to keep device_tokens fresh.
      void register();
    }));

    // Auto-register if user is logged in
    if (user?.id) {
      register();
      // Second attempt helps when iOS permission/session setup races at launch.
      setTimeout(() => {
        void register();
      }, 2000);
    }

    return () => {
      registrationListener.then(l => l.remove());
      registrationErrorListener.then(l => l.remove());
      notificationReceivedListener.then(l => l.remove());
      notificationActionListener.then(l => l.remove());
      appResumeListener.then(l => l.remove());
    };
  }, [user?.id, checkSupport, register, saveToken, showChatToast]);

  // Handle notification action (when user taps notification)
  const handleNotificationAction = (action: ActionPerformed) => {
    const rawData = (action.notification.data || {}) as Record<string, any>;
    const nestedData = typeof rawData.data === "object" && rawData.data !== null
      ? rawData.data as Record<string, any>
      : {};
    const mergedData = { ...nestedData, ...rawData };
    const incomingCall = normalizeIncomingCallPayload(mergedData, action.notification.title, action.notification.body);
    const normalizedType = String(mergedData.type || mergedData.notification_type || "").toLowerCase();
    const actionUrl = typeof mergedData.action_url === "string" ? mergedData.action_url
      : typeof mergedData.actionUrl === "string" ? mergedData.actionUrl : "";

    // Extract sender ID from action_url (/chat?with=<id>) as a reliable fallback
    const senderFromUrl = (() => {
      if (!actionUrl) return null;
      try {
        const urlObj = new URL(actionUrl, "https://x");
        return urlObj.searchParams.get("with");
      } catch { return null; }
    })();

    const senderId = mergedData.sender_id || mergedData.senderId || mergedData.from_user_id || mergedData.user_id || senderFromUrl;
    const isChatAction = Boolean(
      senderId ||
      normalizedType === "chat_message" ||
      normalizedType === "new_message" ||
      normalizedType === "message_received" ||
      actionUrl.startsWith("/chat")
    );

    if (incomingCall) {
      try {
        sessionStorage.setItem("pendingIncomingCallPush", JSON.stringify({
          call_id: incomingCall.call_id,
          caller_id: incomingCall.caller_id,
          call_type: incomingCall.call_type,
          caller_name: incomingCall.caller_name || action.notification.title,
          caller_avatar: incomingCall.caller_avatar,
          ts: Date.now(),
        }));
      } catch {
        // Storage can fail in some restricted contexts; fallback still dispatches event.
      }

      window.dispatchEvent(new CustomEvent("incoming-call-push", {
        detail: {
          call_id: incomingCall.call_id,
          caller_id: incomingCall.caller_id,
          call_type: incomingCall.call_type,
          caller_name: incomingCall.caller_name || action.notification.title,
          caller_avatar: incomingCall.caller_avatar,
        },
      }));
      return;
    }

    if (isChatAction) {
      if (senderId) {
        // Persist so ChatHubPage can open the chat even if URL param is consumed before auth is ready
        try { sessionStorage.setItem("pendingChatWith", String(senderId)); } catch {}
        window.location.href = `/chat?with=${encodeURIComponent(String(senderId))}`;
        return;
      }

      if (actionUrl.startsWith("/chat")) {
        window.location.href = actionUrl;
        return;
      }

      window.location.href = `/chat`;
      return;
    }

    // Generic action_url respect — every push payload that ships an explicit
    // route should win over the hardcoded type switch below. The send-push
    // edge function already attaches action_url for friend requests, post
    // likes, comments, reactions, transfers, etc., so this single line
    // routes nearly every modern notification correctly without needing a
    // case for each type.
    if (actionUrl && actionUrl.startsWith("/")) {
      window.location.href = actionUrl;
      return;
    }

    switch (normalizedType) {
      // Ride notifications
      case "driver_assigned":
      case "driver_en_route":
      case "driver_arrived":
      case "trip_started":
      case "trip_completed":
      case "driver_status":
        window.location.href = safeInternalPath('/rides/track', mergedData.trip_id, '/rides/hub');
        break;
      case "trip_cancelled":
        window.location.href = `/rides/hub`;
        break;

      // Flight notifications
      case "booking_confirmed":
      case "booking_confirmation":
      case "checkin_reminder":
      case "gate_change":
      case "flight_delayed":
      case "flight_cancelled":
      case "boarding_soon":
      case "flight_departed":
      case "flight_landed":
      case "itinerary_update":
        window.location.href = safeInternalPath('/bookings', mergedData.booking_id, '/bookings');
        break;
      case "price_drop":
        window.location.href = `/flights`;
        break;
      case "refund_processed":
      case "refund_update":
        window.location.href = `/wallet`;
        break;

      // Food delivery
      case "delivery_update":
      case "order_placed":
      case "order_confirmed":
      case "order_preparing":
      case "order_ready":
      case "driver_pickup":
      case "out_for_delivery":
      case "order_delivered":
      case "order_cancelled":
      case "new_order_restaurant":
      case "new_delivery_driver":
        window.location.href = safeInternalPath('/eats', mergedData.order_id, '/eats');
        break;
      case "pickup_reminder":
        window.location.href = safeInternalPath('/p2p/bookings', mergedData.rental_id, '/p2p');
        break;

      // Promos
      case "surge_alert":
      case "promo_available":
        window.location.href = `/rides`;
        break;

      // Social — friend requests / accepts / follows
      case "friend_request":
      case "friend_request_received":
        window.location.href = `/notifications`; // friend requests live in the notifications inbox
        break;
      case "friend_request_accepted":
      case "friend_accepted":
      case "new_follower":
        if (mergedData.sender_id || mergedData.user_id) {
          window.location.href = `/user/${encodeURIComponent(String(mergedData.sender_id || mergedData.user_id))}`;
        } else {
          window.location.href = `/notifications`;
        }
        break;

      // Social — engagement on a post
      case "post_liked":
      case "post_commented":
      case "post_reaction":
      case "social_reaction":
      case "social_repost":
      case "social_comment":
      case "social_mention":
        if (mergedData.post_id) {
          window.location.href = `/reels?post=${encodeURIComponent(String(mergedData.post_id))}`;
        } else {
          window.location.href = `/notifications`;
        }
        break;

      // Money — gift / wallet / P2P
      case "coin_transfer":
      case "gift_received":
      case "p2p_transfer":
      case "p2p_request":
        // Open the chat with the sender so the transfer card / accept button
        // is right there. Falls back to wallet if we don't know who.
        if (mergedData.sender_id || mergedData.from_user_id) {
          window.location.href = `/chat?with=${encodeURIComponent(String(mergedData.sender_id || mergedData.from_user_id))}`;
        } else {
          window.location.href = `/wallet`;
        }
        break;
      case "wallet_topup":
      case "wallet_credited":
      case "topup_success":
        window.location.href = `/wallet`;
        break;

      // Channels
      case "channel_post":
      case "channel_broadcast":
        if (mergedData.handle) {
          window.location.href = `/c/${encodeURIComponent(String(mergedData.handle))}`;
        } else if (mergedData.channel_id) {
          window.location.href = `/channels`;
        } else {
          window.location.href = `/notifications`;
        }
        break;

      default:
        window.location.href = `/notifications`;
    }
  };

  // Unregister from push notifications
  const unregister = useCallback(async () => {
    if (!user?.id || !state.token) return;

    try {
      // Mark token as inactive on server
      await supabase.functions.invoke("register-push-token", {
        body: { token: state.token, platform: Capacitor.getPlatform(), deactivate: true }
      });
      
      setState(prev => ({ ...prev, isRegistered: false, token: null }));
      
    } catch (error) {
      console.error("[Push] Error unregistering:", error);
    }
  }, [user?.id, state.token]);

  // Get delivered notifications
  const getDeliveredNotifications = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return [];
    
    const result = await PushNotifications.getDeliveredNotifications();
    return result.notifications;
  }, []);

  // Remove all delivered notifications
  const removeAllDeliveredNotifications = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    
    await PushNotifications.removeAllDeliveredNotifications();
  }, []);

  return {
    ...state,
    notifications,
    register,
    unregister,
    getDeliveredNotifications,
    removeAllDeliveredNotifications,
  };
};

// Notification types for the app
export type NotificationType = 
  | "booking_confirmation"
  | "driver_status"
  | "delivery_update"
  | "pickup_reminder"
  | "schedule_change"
  | "refund_update"
  | "promo"
  | "general";
