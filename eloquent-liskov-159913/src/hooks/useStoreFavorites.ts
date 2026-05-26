/**
 * useStoreFavorites — Manage saved stores via the shared `user_favorites` table.
 * item_type = "store", item_id = store.id (uuid as text).
 *
 * Adds local cache + offline queue so favorites are responsive when the network
 * is weak/offline. Queued toggles flush automatically on next mount when online.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const FAV_CACHE = (uid: string) => `zivo:store-favs:${uid}`;
const QUEUE_KEY = "zivo:store-favs:queue";
const ANON_CACHE = "zivo:store-favs:anon"; // stays empty, just a marker

interface QueueEntry {
  storeId: string;
  action: "add" | "remove";
  snapshot?: Record<string, any>;
  ts: number;
}

function readFavCache(uid: string): string[] {
  try {
    const raw = localStorage.getItem(FAV_CACHE(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
    return [];
  } catch {
    return [];
  }
}

function writeFavCache(uid: string, ids: Set<string>) {
  try {
    localStorage.setItem(FAV_CACHE(uid), JSON.stringify(Array.from(ids)));
  } catch {
    /* noop */
  }
}

function readQueue(): QueueEntry[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(q: QueueEntry[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    /* noop */
  }
}

function enqueue(entry: QueueEntry) {
  const q = readQueue().filter((e) => e.storeId !== entry.storeId);
  q.push(entry);
  writeQueue(q);
}

async function flushQueue(uid: string) {
  const q = readQueue();
  if (q.length === 0) return;
  const remaining: QueueEntry[] = [];
  for (const entry of q) {
    try {
      if (entry.action === "remove") {
        const { error } = await (supabase as any)
          .from("user_favorites")
          .delete()
          .eq("user_id", uid)
          .eq("item_type", "store")
          .eq("item_id", entry.storeId);
        if (error) remaining.push(entry);
      } else {
        const { error } = await (supabase as any).from("user_favorites").insert({
          user_id: uid,
          item_type: "store",
          item_id: entry.storeId,
          item_data: entry.snapshot || {},
        });
        if (error && (error as any).code !== "23505") remaining.push(entry);
      }
    } catch {
      remaining.push(entry);
    }
  }
  writeQueue(remaining);
}

export function useStoreFavorites() {
  const [userId, setUserId] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => readQueue().length);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id || null;
      if (!active) return;
      setUserId(uid);

      if (!uid) {
        setIsLoading(false);
        return;
      }

      // Hydrate from local cache first
      const cached = readFavCache(uid);
      if (cached.length) setFavoriteIds(new Set(cached));

      // Best-effort flush of queued offline toggles
      if (typeof navigator !== "undefined" && navigator.onLine) {
        await flushQueue(uid);
      }

      // Fetch fresh from server
      try {
        const { data: rows } = await (supabase as any)
          .from("user_favorites")
          .select("item_id")
          .eq("user_id", uid)
          .eq("item_type", "store");
        if (!active) return;
        if (rows) {
          const ids = new Set<string>((rows || []).map((r: any) => String(r.item_id)));
          setFavoriteIds(ids);
          writeFavCache(uid, ids);
        }
      } catch {
        /* offline — keep cached */
      }
      setIsLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const isFavorite = useCallback(
    (storeId: string) => favoriteIds.has(storeId),
    [favoriteIds]
  );

  const toggleFavorite = useCallback(
    async (
      storeId: string,
      snapshot?: Record<string, any>
    ): Promise<{ added: boolean; needsAuth: boolean; error?: boolean; queued?: boolean }> => {
      if (!userId) return { added: false, needsAuth: true };
      const wasFav = favoriteIds.has(storeId);

      // Optimistic
      const next = new Set(favoriteIds);
      if (wasFav) next.delete(storeId);
      else next.add(storeId);
      setFavoriteIds(next);
      writeFavCache(userId, next);

      // If offline, queue and return
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        enqueue({
          storeId,
          action: wasFav ? "remove" : "add",
          snapshot,
          ts: Date.now(),
        });
        return { added: !wasFav, needsAuth: false, queued: true };
      }

      try {
        if (wasFav) {
          const { error } = await (supabase as any)
            .from("user_favorites")
            .delete()
            .eq("user_id", userId)
            .eq("item_type", "store")
            .eq("item_id", storeId);
          if (error) throw error;
        } else {
          const { error } = await (supabase as any).from("user_favorites").insert({
            user_id: userId,
            item_type: "store",
            item_id: storeId,
            item_data: snapshot || {},
          });
          if (error && (error as any).code !== "23505") throw error;
        }
        return { added: !wasFav, needsAuth: false };
      } catch {
        // Rollback
        const rb = new Set(favoriteIds);
        setFavoriteIds(rb);
        writeFavCache(userId, rb);
        return { added: wasFav, needsAuth: false, error: true };
      }
    },
    [userId, favoriteIds]
  );

  /** Bulk remove favorites — used by the Manage mode. */
  const removeFavorites = useCallback(
    async (storeIds: string[]): Promise<{ removed: number; failed: number }> => {
      if (!userId || storeIds.length === 0) return { removed: 0, failed: 0 };

      // Optimistic
      const next = new Set(favoriteIds);
      storeIds.forEach((id) => next.delete(id));
      setFavoriteIds(next);
      writeFavCache(userId, next);

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        storeIds.forEach((id) => enqueue({ storeId: id, action: "remove", ts: Date.now() }));
        return { removed: storeIds.length, failed: 0 };
      }

      try {
        const { error } = await (supabase as any)
          .from("user_favorites")
          .delete()
          .eq("user_id", userId)
          .eq("item_type", "store")
          .in("item_id", storeIds);
        if (error) throw error;
        return { removed: storeIds.length, failed: 0 };
      } catch {
        // Rollback
        const rb = new Set(favoriteIds);
        setFavoriteIds(rb);
        writeFavCache(userId, rb);
        return { removed: 0, failed: storeIds.length };
      }
    },
    [userId, favoriteIds]
  );

  // Listen for online events to flush queue automatically.
  useEffect(() => {
    const onOnline = async () => {
      if (!userId) return;
      const before = readQueue().length;
      if (before === 0) return;
      await flushQueue(userId);
      const after = readQueue().length;
      setPendingSyncCount(after);
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [userId]);

  // Keep pendingSyncCount in sync after toggles.
  useEffect(() => {
    setPendingSyncCount(readQueue().length);
  }, [favoriteIds]);

  const syncNow = useCallback(async (): Promise<{ flushed: number }> => {
    if (!userId) return { flushed: 0 };
    const before = readQueue().length;
    await flushQueue(userId);
    const after = readQueue().length;
    setPendingSyncCount(after);
    return { flushed: before - after };
  }, [userId]);

  return {
    favoriteIds,
    isFavorite,
    toggleFavorite,
    removeFavorites,
    isLoading,
    isAuthed: !!userId,
    pendingSyncCount,
    syncNow,
  };
}
