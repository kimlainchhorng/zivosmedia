/**
 * ChatNotificationListener — Global listener for incoming chat messages
 * Plays a sound and shows a browser notification when a new DM arrives
 * while the user is NOT actively viewing that conversation
 */
import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ChatNotificationToast from "./ChatNotificationToast";

const SOUND_URL = "/sounds/chat-notification.wav";
const NOTIFICATION_COOLDOWN_MS = 2000; // Don't spam sounds

type ChatOpenedDetail = {
  recipientId?: string;
};

type DirectMessageRow = {
  sender_id: string;
  message_type: string | null;
  message: string | null;
  content?: string | null;
};

type RealtimePayload<T> = {
  new: T;
};

export default function ChatNotificationListener() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSoundRef = useRef(0);
  const activeChatRef = useRef<string | null>(null);
  const lastNotifBySender = useRef<Record<string, number>>({});

  // Preload audio
  useEffect(() => {
    const audio = new Audio(SOUND_URL);
    audio.volume = 0.6;
    audio.preload = "auto";
    audioRef.current = audio;
  }, []);

  // Track which chat is currently open via a custom event
  useEffect(() => {
    const handleChatOpen = (event: Event) => {
      const customEvent = event as CustomEvent<ChatOpenedDetail>;
      activeChatRef.current = customEvent.detail?.recipientId || null;
    };
    const handleChatClose = () => {
      activeChatRef.current = null;
    };
    window.addEventListener("chat-opened", handleChatOpen as EventListener);
    window.addEventListener("chat-closed", handleChatClose as EventListener);
    return () => {
      window.removeEventListener("chat-opened", handleChatOpen as EventListener);
      window.removeEventListener("chat-closed", handleChatClose as EventListener);
    };
  }, []);

  const playSound = useCallback(() => {
    const now = Date.now();
    if (now - lastSoundRef.current < NOTIFICATION_COOLDOWN_MS) return;
    lastSoundRef.current = now;
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, []);

  const showBrowserNotification = useCallback((senderName: string, messageText: string, senderId: string) => {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        const now = Date.now();
        const lastAt = lastNotifBySender.current[senderId] || 0;
        // Suppress repeat buzz/sound for rapid follow-ups (<8s); still update content via tag
        const shouldRenotify = now - lastAt > 8000;
        lastNotifBySender.current[senderId] = now;

        const notif = new Notification(`${senderName}`, {
          body: messageText || "Sent you a message",
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-72x72.png",
          // Dedup per sender so multiple messages collapse instead of stacking
          tag: `chat-${senderId}`,
          renotify: shouldRenotify,
          silent: !shouldRenotify,
          vibrate: shouldRenotify ? [80, 40, 80] : [],
          data: { senderId, type: "chat" },
        } as NotificationOptions);
        notif.onclick = () => {
          window.focus();
          notif.close();
          window.location.href = `/chat?with=${encodeURIComponent(senderId)}`;
        };
        // Auto-close after 5s
        setTimeout(() => notif.close(), 5000);
      } catch {
        // Notification API can throw on unsupported/blocked environments.
      }
    }
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    if (!user?.id) return;

    const channel = supabase
      .channel(`global-chat-notif-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload: RealtimePayload<DirectMessageRow>) => {
          const msg = payload.new;
          if (!msg || msg.sender_id === user.id) return;

          // Don't notify if the chat with this sender is currently open
          if (activeChatRef.current === msg.sender_id) return;

          // Play sound
          playSound();

          // Get sender name + avatar
          let senderName = "Someone";
          let senderAvatar: string | null = null;
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("user_id", msg.sender_id)
              .maybeSingle();
            if (profile) {
              senderName = profile.full_name || "Someone";
              senderAvatar = profile.avatar_url || null;
            }
          } catch {
            // Missing profile should not block notification delivery.
          }

          // Determine message preview
          let preview = msg.message || msg.content || "";
          if (msg.message_type === "image" || msg.message_type === "locked_image") preview = "📷 Photo";
          else if (msg.message_type === "video" || msg.message_type === "locked_video") preview = "🎥 Video";
          else if (msg.message_type === "voice") preview = "🎤 Voice message";
          else if (msg.message_type === "location") preview = "📍 Location";
          else if (msg.message_type === "sticker") preview = "🎭 Sticker";
          else if (msg.message_type === "gif") preview = "GIF";
          else if (preview.length > 50) preview = preview.slice(0, 50) + "…";

          const senderId = msg.sender_id;

          toast.custom((t) => (
            <ChatNotificationToast
              senderId={senderId}
              senderName={senderName}
              senderAvatar={senderAvatar}
              messageText={preview || "Sent you a message"}
              onDismiss={() => toast.dismiss(t)}
              onReply={(id) => navigate(`/chat?with=${encodeURIComponent(id)}`)}
            />
          ), { duration: 5000 });

          // Browser notification (when tab is not focused)
          if (document.hidden) {
            showBrowserNotification(senderName, preview, senderId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, navigate, playSound, showBrowserNotification]);

  return null;
}
