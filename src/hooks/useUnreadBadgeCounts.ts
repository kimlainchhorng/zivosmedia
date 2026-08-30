import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * The two unread counts the bottom nav shows: chat messages, and everything
 * else.
 *
 * These used to be derived from `useNotifications(20)` — the twenty most recent
 * notifications, read and unread alike. An account with 45 unread therefore
 * displayed 18, because fifteen chat rows plus three others plus two already
 * read filled the page exactly and the remaining twenty-seven were never
 * fetched. The badge did not look truncated; it looked like a smaller number.
 *
 * So this asks only for UNREAD rows, and only for the columns the chat/not-chat
 * split needs. The cap is well above the 99+ the badge can display, so the
 * number shown is the real one right up to the point the UI stops counting.
 */

const UNREAD_FETCH_CAP = 200;

type NotificationLike = {
  action_url: string | null;
  category?: string | null;
  template?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * A notification belongs to Chat if anything about it points at a conversation.
 * Kept deliberately broad: a chat message counted as "account" is worse than the
 * reverse, because the Account badge is not where anyone looks for a reply.
 */
export const isChatNotification = (notification: NotificationLike): boolean => {
  const template = (notification.template || "").toLowerCase();
  const category = (notification.category || "").toLowerCase();
  const actionUrl = (notification.action_url || "").toLowerCase();
  const metadata = notification.metadata || {};

  return (
    category === "chat" ||
    template === "chat_message" ||
    template === "bot_reply" ||
    template.includes("chat") ||
    actionUrl.startsWith("/chat") ||
    actionUrl.includes("?with=") ||
    actionUrl.includes("&with=") ||
    Boolean(
      metadata.thread_id ||
        metadata.chat_id ||
        metadata.conversation_id ||
        metadata.message_id,
    )
  );
};

export interface UnreadBadgeCounts {
  chatUnread: number;
  accountUnread: number;
  refresh: () => void;
}

export function useUnreadBadgeCounts(): UnreadBadgeCounts {
  const [chatUnread, setChatUnread] = useState(0);
  const [accountUnread, setAccountUnread] = useState(0);

  const load = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) {
      setChatUnread(0);
      setAccountUnread(0);
      return;
    }

    // Only columns that exist. `snoozed_until` is NOT deployed on
    // public.notifications — useNotifications filters snoozed rows client-side
    // precisely because of that, and gets away with naming nothing because it
    // uses select('*'). Listing the column explicitly makes PostgREST reject
    // the whole request, which this hook would swallow into a silent zero: both
    // badges simply disappeared. If the column is ever added, filter it here.
    const { data, error } = await supabase
      .from("notifications")
      .select("action_url, category, template, metadata")
      .eq("user_id", userId)
      .eq("channel", "in_app")
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(UNREAD_FETCH_CAP);

    if (error) {
      // Never fail silently again: a zero badge is indistinguishable from
      // "nothing unread", which is the bug this hook exists to fix.
      console.error("[useUnreadBadgeCounts] unread query failed", error);
      return;
    }

    const rows = (data || []) as NotificationLike[];
    let chat = 0;
    for (const row of rows) if (isChatNotification(row)) chat += 1;
    setChatUnread(chat);
    setAccountUnread(rows.length - chat);
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      await load();
      if (!alive) return;
    })();

    const channel = supabase
      .channel("unread-badge-counts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => void load(),
      )
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, [load]);

  return { chatUnread, accountUnread, refresh: load };
}
