/**
 * useMultiLegQueue — track the remaining stops of a multi-stop ride.
 *
 * Strategy: when the user starts a multi-stop ride from
 * /rides/multi-stop?…&multi=B|C|D, we persist the queue in localStorage
 * keyed by the active trip id (or "pending" until a trip id exists).
 * Once a leg completes, RideTrackingPage pops the next stop and offers
 * "Book next leg" → opens /rides/hub?pickup=<lastDrop>&destination=<next>&multi=…
 * with one fewer stop.
 *
 * Synchronous and offline-safe — no backend coupling required.
 */
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "zivo:multi-leg-queue";
const EVENT_NAME = "zivo:multi-leg-changed";

export interface MultiLegQueue {
  /** First leg's drop-off (where the rider currently is). */
  current: string;
  /** Stops still ahead. */
  upcoming: string[];
  /** When the queue was created — we expire stale ones after 12h. */
  createdAt: number;
}

const TTL_MS = 12 * 60 * 60 * 1000;

function readRaw(): MultiLegQueue | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MultiLegQueue;
    if (!parsed || typeof parsed.current !== "string" || !Array.isArray(parsed.upcoming)) return null;
    if (Date.now() - (parsed.createdAt ?? 0) > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeRaw(value: MultiLegQueue | null) {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    /* quota / private mode */
  }
}

export function useMultiLegQueue() {
  const [queue, setQueue] = useState<MultiLegQueue | null>(() => readRaw());

  useEffect(() => {
    const refresh = () => setQueue(readRaw());
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

  const start = useCallback((current: string, upcoming: string[]) => {
    if (!current || upcoming.length === 0) {
      writeRaw(null);
      setQueue(null);
      return;
    }
    const next: MultiLegQueue = { current, upcoming, createdAt: Date.now() };
    writeRaw(next);
    setQueue(next);
  }, []);

  /** Pop the front of `upcoming`, advancing `current`. Returns the new state. */
  const advance = useCallback((): MultiLegQueue | null => {
    const cur = readRaw();
    if (!cur || cur.upcoming.length === 0) {
      writeRaw(null);
      setQueue(null);
      return null;
    }
    const [next, ...rest] = cur.upcoming;
    if (rest.length === 0) {
      writeRaw(null);
      setQueue(null);
      return null;
    }
    const updated: MultiLegQueue = { ...cur, current: next, upcoming: rest };
    writeRaw(updated);
    setQueue(updated);
    return updated;
  }, []);

  const clear = useCallback(() => {
    writeRaw(null);
    setQueue(null);
  }, []);

  return { queue, start, advance, clear };
}
