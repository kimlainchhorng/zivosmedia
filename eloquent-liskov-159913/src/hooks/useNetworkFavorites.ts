/**
 * useNetworkFavorites — localStorage-backed favorites for places in the
 * ZIVO network (restaurants & hotels). Same hook reads/writes from any page,
 * so a heart tap on EatsLanding shows up immediately on /saved.
 *
 * Stored as one JSON blob per kind: `zivo:fav:restaurants`, `zivo:fav:hotels`.
 * Cross-tab sync is handled via the `storage` event so multiple tabs stay
 * consistent without a backend round-trip.
 */
import { useCallback, useEffect, useState } from "react";

export type FavoriteKind = "restaurant" | "hotel";

const STORAGE_KEYS: Record<FavoriteKind, string> = {
  restaurant: "zivo:fav:restaurants",
  hotel: "zivo:fav:hotels",
};
const EVENT_NAME = "zivo:fav:changed";

function readSet(kind: FavoriteKind): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS[kind]);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed.filter((x) => typeof x === "string"));
    return new Set();
  } catch {
    return new Set();
  }
}

function writeSet(kind: FavoriteKind, set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEYS[kind], JSON.stringify(Array.from(set)));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { kind } }));
  } catch {
    /* quota / private mode — silently ignore */
  }
}

export function useNetworkFavorites(kind: FavoriteKind) {
  const [favorites, setFavorites] = useState<Set<string>>(() => readSet(kind));

  useEffect(() => {
    const refresh = () => setFavorites(readSet(kind));
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS[kind]) refresh();
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.kind === kind) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT_NAME, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENT_NAME, onCustom);
    };
  }, [kind]);

  const has = useCallback((id: string) => favorites.has(id), [favorites]);

  const toggle = useCallback(
    (id: string) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        writeSet(kind, next);
        return next;
      });
    },
    [kind],
  );

  const add = useCallback(
    (id: string) => {
      setFavorites((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        writeSet(kind, next);
        return next;
      });
    },
    [kind],
  );

  const remove = useCallback(
    (id: string) => {
      setFavorites((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        writeSet(kind, next);
        return next;
      });
    },
    [kind],
  );

  const clear = useCallback(() => {
    setFavorites(() => {
      const empty = new Set<string>();
      writeSet(kind, empty);
      return empty;
    });
  }, [kind]);

  return { favorites, has, toggle, add, remove, clear };
}
