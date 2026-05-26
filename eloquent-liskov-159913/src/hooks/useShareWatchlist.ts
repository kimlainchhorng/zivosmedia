/**
 * useShareWatchlist — localStorage-backed list of share links the user has
 * "saved" (incoming friend trips/orders they want to keep an eye on).
 *
 * Stored under `zivo:watchlist` as a JSON array. Cross-tab sync via
 * `storage` event + a custom `zivo:watchlist:changed` event.
 */
import { useCallback, useEffect, useState } from "react";

export type WatchlistKind = "trip" | "order";

export interface WatchlistEntry {
  id: string;
  kind: WatchlistKind;
  /** Optional display label the user can edit ("Mom's flight"). */
  label?: string | null;
  addedAt: number;
}

const STORAGE_KEY = "zivo:watchlist";
const EVENT_NAME = "zivo:watchlist:changed";

function readAll(): WatchlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is WatchlistEntry =>
        e &&
        typeof e.id === "string" &&
        (e.kind === "trip" || e.kind === "order") &&
        typeof e.addedAt === "number",
    );
  } catch {
    return [];
  }
}

function writeAll(entries: WatchlistEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    /* quota / private mode */
  }
}

export function useShareWatchlist() {
  const [entries, setEntries] = useState<WatchlistEntry[]>(() => readAll());

  useEffect(() => {
    const refresh = () => setEntries(readAll());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT_NAME, refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENT_NAME, refresh);
    };
  }, []);

  const has = useCallback(
    (kind: WatchlistKind, id: string) =>
      entries.some((e) => e.kind === kind && e.id === id),
    [entries],
  );

  const add = useCallback(
    (kind: WatchlistKind, id: string, label?: string | null) => {
      const all = readAll();
      if (all.some((e) => e.kind === kind && e.id === id)) return;
      const next = [
        { id, kind, label: label ?? null, addedAt: Date.now() },
        ...all,
      ].slice(0, 50);
      writeAll(next);
      setEntries(next);
    },
    [],
  );

  const remove = useCallback((kind: WatchlistKind, id: string) => {
    const all = readAll().filter((e) => !(e.kind === kind && e.id === id));
    writeAll(all);
    setEntries(all);
  }, []);

  const clear = useCallback(() => {
    writeAll([]);
    setEntries([]);
  }, []);

  return { entries, has, add, remove, clear };
}
