/**
 * Shared helpers for the Stories surface.
 *
 * - `invalidateAllStoryCaches` — single place to refresh every carousel
 *   (Profile, Feed, Chat) plus per-user "my stories" + view-state.
 * - `parseStorageKeyFromPublicUrl` — turn a `…/user-stories/<key>` public
 *   URL back into the storage object key so we can delete the file.
 * - `collectStoryStorageKeys` — gather every candidate storage key for a
 *   single story (media + audio + thumbnail) for storage cleanup.
 * - `sweepStoryStoragePrefix` — list & delete every object under a
 *   `<userId>/<storyId>/` prefix in the bucket so failed uploads or
 *   thumbnails written without a URL are still removed.
 */
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const STORIES_BUCKET = "user-stories";

/** Invalidate every cache the story system reads from. */
export function invalidateAllStoryCaches(qc: QueryClient, userId?: string | null) {
  const keysToRefresh = new Set([
    "feed-story-users",
    "user-stories",
    "profile-story-rings",
    "profile-my-story",
    "my-story-views",
    "chat-story-rings",
    "story-author-profiles",
    "feed-story-profiles",
  ]);
  qc.invalidateQueries({
    predicate: (q) => {
      const k0 = q.queryKey?.[0];
      return typeof k0 === "string" && keysToRefresh.has(k0);
    },
  });
  // Also force an immediate refetch of the active carousel queries so the
  // ring updates without waiting for the next interval.
  qc.refetchQueries({
    type: "active",
    predicate: (q) => {
      const k0 = q.queryKey?.[0];
      return typeof k0 === "string" && keysToRefresh.has(k0);
    },
  });
}

/**
 * Convert a public storage URL into its bucket key.
 * Returns null if the URL doesn't look like a `user-stories` public URL.
 */
export function parseStorageKeyFromPublicUrl(url?: string | null): string | null {
  if (!url) return null;
  const marker = `/${STORIES_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const key = url.slice(idx + marker.length).split("?")[0];
  return key || null;
}

interface StoryRowLike {
  mediaUrl?: string | null;
  media_url?: string | null;
  audioUrl?: string | null;
  audio_url?: string | null;
  thumbnailUrl?: string | null;
  thumbnail_url?: string | null;
}

/** Return every storage key referenced by a story row (any naming convention). */
export function collectStoryStorageKeys(story?: StoryRowLike | null): string[] {
  if (!story) return [];
  const candidates = [
    story.mediaUrl ?? story.media_url,
    story.audioUrl ?? story.audio_url,
    story.thumbnailUrl ?? story.thumbnail_url,
  ];
  return candidates
    .map((u) => parseStorageKeyFromPublicUrl(u))
    .filter((k): k is string => !!k);
}

/**
 * Belt-and-suspenders cleanup: list everything under `<userId>/<storyId>/`
 * and delete it. Catches files whose URL was never written back to the row
 * (failed inserts, thumbnails, etc).
 *
 * Safe to call alongside `storage.remove(keys)` — duplicate deletes no-op.
 */
export async function sweepStoryStoragePrefix(userId: string, storyId: string) {
  const prefix = `${userId}/${storyId}`;
  try {
    const { data, error } = await supabase.storage
      .from(STORIES_BUCKET)
      .list(prefix, { limit: 100 });
    if (error || !data?.length) return;
    const paths = data.map((f) => `${prefix}/${f.name}`);
    await supabase.storage.from(STORIES_BUCKET).remove(paths);
  } catch {
    // best-effort — server-side cron will catch anything we miss
  }
}
