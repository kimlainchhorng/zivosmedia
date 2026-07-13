/**
 * useHiddenPosts - "Not interested" hide list.
 *
 * Signed-in users sync to Supabase so hidden posts follow them across devices.
 * localStorage remains the immediate/offline cache and keeps older anonymous
 * hide choices working.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FeedPreferenceSource = "store" | "user";

const LEGACY_STORAGE_KEY = "zivo:hidden-posts-v1";
const STORAGE_EVENT = "zivo:hidden-posts-changed";

const scopedStorageKey = (userId?: string | null) =>
  userId ? `${LEGACY_STORAGE_KEY}:${userId}` : LEGACY_STORAGE_KEY;

const normalizeUserPostId = (postId: string) => postId.replace(/^u-/, "");

const sourcePostKey = (source: FeedPreferenceSource, postId: string) =>
  `${source}:${normalizeUserPostId(postId)}`;

function readStoredSet(storageKey: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((value) => typeof value === "string")) : new Set();
  } catch {
    return new Set();
  }
}

function readSet(userId?: string | null): Set<string> {
  const scoped = readStoredSet(scopedStorageKey(userId));
  if (!userId) return scoped;
  return new Set([...readStoredSet(LEGACY_STORAGE_KEY), ...scoped]);
}

function writeSet(set: Set<string>, userId?: string | null) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(scopedStorageKey(userId), JSON.stringify([...set]));
    window.dispatchEvent(new Event(STORAGE_EVENT));
  } catch {
    // localStorage may be full or disabled.
  }
}

const keysForPost = (id: string, source?: FeedPreferenceSource): string[] => {
  const rawId = normalizeUserPostId(id);
  const keys = new Set<string>([id, rawId]);
  if (source) {
    keys.add(sourcePostKey(source, rawId));
    if (source === "user") keys.add(`u-${rawId}`);
  }
  return [...keys];
};

const addRemoteHiddenRow = (set: Set<string>, postId: string, source: FeedPreferenceSource) => {
  keysForPost(postId, source).forEach((key) => set.add(key));
};

async function loadRemoteHiddenPosts(userId: string): Promise<Set<string>> {
  const remote = new Set<string>();
  const { data, error } = await (supabase as any)
    .from("feed_hidden_posts")
    .select("post_id, post_source")
    .eq("user_id", userId);

  if (error) throw error;

  (data ?? []).forEach((row: { post_id: string; post_source: FeedPreferenceSource }) => {
    if (row?.post_id && (row.post_source === "store" || row.post_source === "user")) {
      addRemoteHiddenRow(remote, row.post_id, row.post_source);
    }
  });

  return remote;
}

async function saveRemoteHiddenPost(userId: string, id: string, source: FeedPreferenceSource) {
  await (supabase as any)
    .from("feed_hidden_posts")
    .upsert(
      {
        user_id: userId,
        post_id: normalizeUserPostId(id),
        post_source: source,
      },
      { onConflict: "user_id,post_id,post_source", ignoreDuplicates: true },
    );
}

async function deleteRemoteHiddenPost(userId: string, id: string, source: FeedPreferenceSource) {
  await (supabase as any)
    .from("feed_hidden_posts")
    .delete()
    .eq("user_id", userId)
    .eq("post_id", normalizeUserPostId(id))
    .eq("post_source", source);
}

export function useHiddenPosts(userId?: string | null) {
  const [hidden, setHidden] = useState<Set<string>>(() => readSet(userId));

  useEffect(() => {
    let cancelled = false;

    const syncLocal = () => setHidden(readSet(userId));
    const syncRemote = async () => {
      const local = readSet(userId);
      if (!userId) {
        if (!cancelled) setHidden(local);
        return;
      }

      try {
        const remote = await loadRemoteHiddenPosts(userId);
        const merged = new Set([...local, ...remote]);
        writeSet(merged, userId);
        if (!cancelled) setHidden(merged);
      } catch {
        if (!cancelled) setHidden(local);
      }
    };

    syncLocal();
    void syncRemote();
    window.addEventListener(STORAGE_EVENT, syncLocal);
    window.addEventListener("storage", syncLocal);
    return () => {
      cancelled = true;
      window.removeEventListener(STORAGE_EVENT, syncLocal);
      window.removeEventListener("storage", syncLocal);
    };
  }, [userId]);

  const hide = useCallback((id: string, source?: FeedPreferenceSource) => {
    const next = new Set(readSet(userId));
    keysForPost(id, source).forEach((key) => next.add(key));
    writeSet(next, userId);
    setHidden(next);

    if (userId && source) {
      void saveRemoteHiddenPost(userId, id, source);
    }
  }, [userId]);

  const unhide = useCallback((id: string, source?: FeedPreferenceSource) => {
    const next = new Set(readSet(userId));
    keysForPost(id, source).forEach((key) => next.delete(key));
    writeSet(next, userId);
    setHidden(next);

    if (userId && source) {
      void deleteRemoteHiddenPost(userId, id, source);
    }
  }, [userId]);

  const isHidden = useCallback(
    (id: string, source?: FeedPreferenceSource) => keysForPost(id, source).some((key) => hidden.has(key)),
    [hidden],
  );

  return { hidden, hide, unhide, isHidden };
}
