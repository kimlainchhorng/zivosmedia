/**
 * useLocalChatHide — Per-user, browser-local "hide" state for chat messages.
 *
 * Powers two Telegram-style features without touching server state:
 *   - "Delete for me" : a single message id is hidden for the current user.
 *   - "Clear history" : every message in a conversation older than the cleared
 *     timestamp is hidden for the current user.
 *
 * Stored in localStorage so it survives reloads on the same device. Other
 * devices / the other side of the conversation are unaffected — this matches
 * Telegram's local-only semantics for these two actions.
 */
import { useCallback, useEffect, useState } from "react";

const HIDDEN_KEY = (uid: string) => `chat:hidden_msgs:${uid}`;
const CLEARED_KEY = (uid: string) => `chat:cleared_before:${uid}`;

type ClearedMap = Record<string, string>; // partnerId → ISO timestamp

function readSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeSet(key: string, set: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    // ignore quota / SSR errors
  }
}

function readMap(key: string): ClearedMap {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? (obj as ClearedMap) : {};
  } catch {
    return {};
  }
}

function writeMap(key: string, map: ClearedMap) {
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function useLocalChatHide(userId: string | undefined) {
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [clearedBefore, setClearedBefore] = useState<ClearedMap>({});

  useEffect(() => {
    if (!userId) {
      setHiddenIds(new Set());
      setClearedBefore({});
      return;
    }
    setHiddenIds(readSet(HIDDEN_KEY(userId)));
    setClearedBefore(readMap(CLEARED_KEY(userId)));
  }, [userId]);

  const hideMessage = useCallback((messageId: string) => {
    if (!userId) return;
    setHiddenIds((prev) => {
      if (prev.has(messageId)) return prev;
      const next = new Set(prev);
      next.add(messageId);
      writeSet(HIDDEN_KEY(userId), next);
      return next;
    });
  }, [userId]);

  const unhideMessage = useCallback((messageId: string) => {
    if (!userId) return;
    setHiddenIds((prev) => {
      if (!prev.has(messageId)) return prev;
      const next = new Set(prev);
      next.delete(messageId);
      writeSet(HIDDEN_KEY(userId), next);
      return next;
    });
  }, [userId]);

  /**
   * Clear all messages in a conversation up to "now". Subsequent messages
   * are not affected. Pass an explicit timestamp to clear up to that point.
   */
  const clearChatBefore = useCallback((partnerId: string, isoTimestamp?: string) => {
    if (!userId) return;
    const ts = isoTimestamp ?? new Date().toISOString();
    setClearedBefore((prev) => {
      const next = { ...prev, [partnerId]: ts };
      writeMap(CLEARED_KEY(userId), next);
      return next;
    });
  }, [userId]);

  const undoClear = useCallback((partnerId: string) => {
    if (!userId) return;
    setClearedBefore((prev) => {
      if (!prev[partnerId]) return prev;
      const next = { ...prev };
      delete next[partnerId];
      writeMap(CLEARED_KEY(userId), next);
      return next;
    });
  }, [userId]);

  const isHidden = useCallback((messageId: string) => hiddenIds.has(messageId), [hiddenIds]);

  /** Returns true if a message of the given created_at should be hidden by a clear-history cutoff. */
  const isClearedFor = useCallback((partnerId: string, createdAt: string) => {
    const cutoff = clearedBefore[partnerId];
    if (!cutoff) return false;
    return new Date(createdAt).getTime() <= new Date(cutoff).getTime();
  }, [clearedBefore]);

  return { hiddenIds, clearedBefore, hideMessage, unhideMessage, clearChatBefore, undoClear, isHidden, isClearedFor };
}
