/**
 * useChatPresence — Real-time typing indicators + online/offline status
 * Uses Supabase Realtime Presence for instant online detection
 * and postgres_changes on profiles for live last_seen updates
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { topicForPairSync } from "@/lib/security/channelName";
import { subscribeToPooledPostgresChanges } from "@/services/chatRealtimePool";

interface PresenceState {
  isTyping: boolean;
  isOnline: boolean;
  lastSeen: string | null;
}

function formatLastSeen(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    const diffMs = Date.now() - d.getTime();
    // If less than 1 minute, show "just now"
    if (diffMs < 60000) return "just now";
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return null;
  }
}

export function useChatPresence(userId: string | undefined, recipientId: string) {
  const channelRef = useRef<any>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rawLastSeenRef = useRef<string | null>(null);
  const [state, setState] = useState<PresenceState>({ isTyping: false, isOnline: false, lastSeen: null });

  // Fetch last_seen from DB
  const fetchLastSeen = useCallback(async () => {
    if (!recipientId) return;
    const { data } = await supabase
      .from("profiles")
      .select("last_seen")
      .eq("user_id", recipientId)
      .maybeSingle();
    const ls = (data?.last_seen as string) || null;
    rawLastSeenRef.current = ls;
    setState((prev) => ({ ...prev, lastSeen: formatLastSeen(ls) }));
  }, [recipientId]);

  // Initial fetch
  useEffect(() => {
    fetchLastSeen();
  }, [fetchLastSeen]);

  // Subscribe to postgres_changes on profiles for real-time last_seen updates
  useEffect(() => {
    if (!recipientId) return;
    const unsubscribe = subscribeToPooledPostgresChanges(
      {
        poolKey: `profile-lastseen:${recipientId}`,
        event: "UPDATE",
        schema: "public",
        table: "profiles",
        filter: `user_id=eq.${recipientId}`,
      },
      (payload) => {
        const newLastSeen = payload.new?.last_seen as string | null;
        if (newLastSeen) {
          rawLastSeenRef.current = newLastSeen;
          setState((prev) => ({ ...prev, lastSeen: formatLastSeen(newLastSeen) }));
        }
      }
    );

    return unsubscribe;
  }, [recipientId]);

  // Refresh the "X minutes ago" text every 30s so it stays accurate
  useEffect(() => {
    const interval = setInterval(() => {
      if (rawLastSeenRef.current && !state.isOnline) {
        setState((prev) => ({ ...prev, lastSeen: formatLastSeen(rawLastSeenRef.current) }));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [state.isOnline]);

  // Realtime Presence channel for instant online/typing detection
  useEffect(() => {
    if (!userId) return;

    const roomName = topicForPairSync(userId, recipientId, "presence");
    const channel = supabase.channel(roomName, { config: { presence: { key: userId } } });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const presenceState = channel.presenceState();
        const recipientPresence = presenceState[recipientId];
        if (recipientPresence && recipientPresence.length > 0) {
          const latest = recipientPresence[0] as any;
          setState((prev) => ({ ...prev, isOnline: true, isTyping: !!latest.typing }));
        } else {
          setState((prev) => ({ ...prev, isOnline: false, isTyping: false }));
        }
      })
      .on("presence", { event: "join" }, ({ key }: { key: string }) => {
        if (key === recipientId) {
          setState((prev) => ({ ...prev, isOnline: true }));
        }
      })
      .on("presence", { event: "leave" }, ({ key }: { key: string }) => {
        if (key === recipientId) {
          setState((prev) => ({ ...prev, isOnline: false, isTyping: false }));
          // Refetch last_seen after a delay so the DB write lands first
          setTimeout(() => fetchLastSeen(), 2000);
        }
      })
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online: true, typing: false });
        }
      });

    // Update own last_seen every 30s
    const updateOwnLastSeen = async () => {
      if (!userId) return;
      await supabase
        .from("profiles")
        .update({ last_seen: new Date().toISOString() } as any)
        .eq("user_id", userId);
    };
    updateOwnLastSeen();
    const interval = setInterval(updateOwnLastSeen, 30000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [userId, recipientId, fetchLastSeen]);

  const setTyping = useCallback((typing: boolean) => {
    if (!channelRef.current) return;
    channelRef.current.track({ online: true, typing });

    if (typing) {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        channelRef.current?.track({ online: true, typing: false });
      }, 3000);
    }
  }, []);

  return { ...state, setTyping };
}
