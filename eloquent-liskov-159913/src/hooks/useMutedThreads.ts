/**
 * useMutedThreads — Per-user, per-thread mute state.
 *
 * Stored in localStorage so it survives reloads but doesn't need a backend
 * column. Each entry maps a thread id (the other user's user_id for DMs)
 * to either a UTC ms expiry (snooze) or null (mute indefinitely).
 *
 * Expired entries are filtered out lazily on read — we only purge the file
 * when the consumer calls `unmute` or `mute` again, so an idle browser
 * doesn't churn writes for a stale clock.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

type MuteEntry = { until: number | null }; // null = until-I-unmute

const STORAGE_KEY = (uid: string) => `zivo:muted-threads:${uid}`;

function readMap(uid: string): Map<string, MuteEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(uid));
    if (!raw) return new Map();
    const obj = JSON.parse(raw) as Record<string, MuteEntry>;
    return new Map(Object.entries(obj));
  } catch {
    return new Map();
  }
}

function writeMap(uid: string, m: Map<string, MuteEntry>) {
  try {
    const obj = Object.fromEntries(m.entries());
    localStorage.setItem(STORAGE_KEY(uid), JSON.stringify(obj));
  } catch {
    /* localStorage may be unavailable (private mode etc.) — no-op. */
  }
}

export const MUTE_DURATIONS = [
  { id: "1h", label: "1 hour" },
  { id: "8h", label: "8 hours" },
  { id: "tomorrow", label: "Until tomorrow" },
  { id: "forever", label: "Until I unmute" },
] as const;

export type MuteDurationId = (typeof MUTE_DURATIONS)[number]["id"];

function durationMs(id: MuteDurationId): number | null {
  if (id === "forever") return null;
  if (id === "tomorrow") {
    // 8am next day in the user's local timezone — common Slack/Linear pattern.
    const t = new Date();
    t.setDate(t.getDate() + 1);
    t.setHours(8, 0, 0, 0);
    return t.getTime() - Date.now();
  }
  if (id === "1h") return 60 * 60 * 1000;
  if (id === "8h") return 8 * 60 * 60 * 1000;
  return null;
}

export function useMutedThreads() {
  const { user } = useAuth();
  const [map, setMap] = useState<Map<string, MuteEntry>>(() =>
    user ? readMap(user.id) : new Map()
  );

  // Re-load whenever the signed-in user changes (logout, account switch).
  useEffect(() => {
    setMap(user ? readMap(user.id) : new Map());
  }, [user?.id]);

  const mute = useCallback(
    (threadId: string, duration: MuteDurationId) => {
      if (!user) return;
      const ms = durationMs(duration);
      const until = ms === null ? null : Date.now() + ms;
      setMap((prev) => {
        const next = new Map(prev);
        next.set(threadId, { until });
        writeMap(user.id, next);
        return next;
      });
    },
    [user]
  );

  const unmute = useCallback(
    (threadId: string) => {
      if (!user) return;
      setMap((prev) => {
        const next = new Map(prev);
        next.delete(threadId);
        writeMap(user.id, next);
        return next;
      });
    },
    [user]
  );

  const isMuted = useCallback(
    (threadId: string) => {
      const e = map.get(threadId);
      if (!e) return false;
      if (e.until === null) return true;
      return e.until > Date.now();
    },
    [map]
  );

  /**
   * Read the active mute entry. Returns:
   *   - { until: null }   → muted forever
   *   - { until: <ms> }   → snoozed until that timestamp
   *   - null              → not muted (or expired)
   */
  const getMuteEntry = useCallback(
    (threadId: string): { until: number | null } | null => {
      const e = map.get(threadId);
      if (!e) return null;
      if (e.until !== null && e.until <= Date.now()) return null;
      return e;
    },
    [map]
  );

  const mutedSet = useMemo(() => {
    const s = new Set<string>();
    const now = Date.now();
    for (const [k, v] of map) {
      if (v.until === null || v.until > now) s.add(k);
    }
    return s;
  }, [map]);

  return { isMuted, mute, unmute, mutedSet, getMuteEntry };
}

/**
 * Format a mute entry into a short user-facing label like "1h left",
 * "until 8am Wed", or "muted". Pure helper — exported so any UI surface
 * (bell popover, chat hub row, profile sheet) can render the same text.
 */
export function formatMuteLabel(entry: { until: number | null } | null): string {
  if (!entry) return "";
  if (entry.until === null) return "muted";
  const ms = entry.until - Date.now();
  if (ms <= 0) return "";
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes}m left`;
  const hours = Math.round(ms / (60 * 60_000));
  if (hours < 24) return `${hours}h left`;
  // Day or more out — show absolute time so it's unambiguous.
  const d = new Date(entry.until);
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: undefined as any });
  const day = d.toLocaleDateString([], { weekday: "short" });
  return `until ${time.toLowerCase().replace(" ", "")} ${day}`;
}
