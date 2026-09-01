/**
 * useThreadSettings — per-user, per-thread chat settings (pin / mute / archive / notification mode).
 * Backed by public.chat_thread_settings. Realtime-synced.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type NotificationMode = "all" | "mentions" | "none";

export type ThreadSettings = {
  thread_id: string;
  muted_until: string | null;
  notification_mode: NotificationMode;
  pinned_at: string | null;
  archived_at: string | null;
};

const empty: Omit<ThreadSettings, "thread_id"> = {
  muted_until: null,
  notification_mode: "all",
  pinned_at: null,
  archived_at: null,
};

/** Build a stable thread id used across the chat hub. */
export function buildThreadId(kind: "dm" | "group" | "channel", id: string): string {
  return `${kind}:${id}`;
}

export function useThreadSettings() {
  const { user } = useAuth();
  const [byThread, setByThread] = useState<Record<string, ThreadSettings>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setByThread({});
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("chat_thread_settings")
      .select("thread_id, muted_until, notification_mode, pinned_at, archived_at")
      .eq("user_id", user.id);
    const next: Record<string, ThreadSettings> = {};
    (data ?? []).forEach((row: any) => {
      next[row.thread_id] = row as ThreadSettings;
    });
    setByThread(next);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
    if (!user) return;
    const ch = supabase
      .channel(`thread-settings-${user.id}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_thread_settings", filter: `user_id=eq.${user.id}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, refresh]);

  const update = useCallback(
    async (threadId: string, patch: Partial<Omit<ThreadSettings, "thread_id">>) => {
      if (!user) return;
      const prior = byThread[threadId];
      const current = prior ?? { thread_id: threadId, ...empty };
      const next = { ...current, ...patch, thread_id: threadId } as ThreadSettings;
      setByThread((prev) => ({ ...prev, [threadId]: next }));
      const { data, error } = await supabase.functions.invoke("chat-thread-settings-update", {
        body: { thread_id: threadId, patch },
      });
      const failure = error ?? (data as { error?: string } | null)?.error ?? null;
      if (failure) {
        // Nothing was persisted — undo the optimistic pin/mute/archive so the UI
        // matches the server instead of reverting on the next reload.
        setByThread((prev) => {
          if (prev[threadId] !== next) return prev; // a newer write or realtime refresh already won
          const rolled = { ...prev };
          if (prior) rolled[threadId] = prior;
          else delete rolled[threadId];
          return rolled;
        });
        console.error("[useThreadSettings] chat-thread-settings-update failed", failure);
        toast.error("Couldn't save chat setting. Try again.");
        // Throw so callers don't announce success for a change that never saved.
        throw failure instanceof Error ? failure : new Error(String(failure));
      }
    },
    [user, byThread],
  );

  const pin = useCallback((t: string) => update(t, { pinned_at: new Date().toISOString() }), [update]);
  const unpin = useCallback((t: string) => update(t, { pinned_at: null }), [update]);
  const archive = useCallback((t: string) => update(t, { archived_at: new Date().toISOString() }), [update]);
  const unarchive = useCallback((t: string) => update(t, { archived_at: null }), [update]);

  /** Mute for `hours`. Pass 0 for forever; pass -1 to unmute. */
  const mute = useCallback(
    (t: string, hours: number) => {
      if (hours < 0) return update(t, { muted_until: null });
      const until = hours === 0 ? "2099-01-01T00:00:00Z" : new Date(Date.now() + hours * 3600_000).toISOString();
      return update(t, { muted_until: until });
    },
    [update],
  );

  const setMode = useCallback((t: string, mode: NotificationMode) => update(t, { notification_mode: mode }), [update]);

  const helpers = useMemo(
    () => ({
      get: (t: string) => byThread[t] ?? { thread_id: t, ...empty },
      isPinned: (t: string) => Boolean(byThread[t]?.pinned_at),
      isArchived: (t: string) => Boolean(byThread[t]?.archived_at),
      isMuted: (t: string) => {
        const u = byThread[t]?.muted_until;
        return Boolean(u && new Date(u).getTime() > Date.now());
      },
    }),
    [byThread],
  );

  return { byThread, loading, refresh, pin, unpin, archive, unarchive, mute, setMode, ...helpers };
}
