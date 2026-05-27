/**
 * useChatPrefs — Local pin / mute / archive / mark-unread preferences for chats.
 * Stored in localStorage per user. v1 — cross-device sync is a follow-up.
 */
import { useCallback, useEffect, useState } from "react";

type PrefMap = Record<string, true>;

interface ChatPrefs {
  pinned: PrefMap;
  muted: PrefMap;
  archived: PrefMap;
  unread: PrefMap;
}

const EMPTY: ChatPrefs = { pinned: {}, muted: {}, archived: {}, unread: {} };

function storageKey(userId: string | undefined) {
  return `zivo:chat-prefs:${userId || "anon"}`;
}

function load(userId: string | undefined): ChatPrefs {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw);
    return {
      pinned: parsed.pinned || {},
      muted: parsed.muted || {},
      archived: parsed.archived || {},
      unread: parsed.unread || {},
    };
  } catch {
    return { ...EMPTY };
  }
}

function save(userId: string | undefined, prefs: ChatPrefs) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
  } catch {}
}

export function useChatPrefs(userId: string | undefined) {
  const [prefs, setPrefs] = useState<ChatPrefs>(() => load(userId));

  useEffect(() => {
    setPrefs(load(userId));
  }, [userId]);

  const update = useCallback(
    (next: ChatPrefs) => {
      setPrefs(next);
      save(userId, next);
    },
    [userId]
  );

  const toggle = useCallback(
    (bucket: keyof ChatPrefs, chatId: string) => {
      setPrefs((prev) => {
        const map = { ...prev[bucket] };
        if (map[chatId]) delete map[chatId];
        else map[chatId] = true;
        const next = { ...prev, [bucket]: map };
        save(userId, next);
        return next;
      });
    },
    [userId]
  );

  const setBucket = useCallback(
    (bucket: keyof ChatPrefs, chatId: string, value: boolean) => {
      setPrefs((prev) => {
        const map = { ...prev[bucket] };
        if (value) map[chatId] = true;
        else delete map[chatId];
        const next = { ...prev, [bucket]: map };
        save(userId, next);
        return next;
      });
    },
    [userId]
  );

  return {
    prefs,
    isPinned: (id: string) => !!prefs.pinned[id],
    isMuted: (id: string) => !!prefs.muted[id],
    isArchived: (id: string) => !!prefs.archived[id],
    isMarkedUnread: (id: string) => !!prefs.unread[id],
    togglePin: (id: string) => toggle("pinned", id),
    toggleMute: (id: string) => toggle("muted", id),
    toggleArchive: (id: string) => toggle("archived", id),
    toggleMarkUnread: (id: string) => toggle("unread", id),
    setMarkedUnread: (id: string, value: boolean) => setBucket("unread", id, value),
    setPrefs: update,
  };
}
