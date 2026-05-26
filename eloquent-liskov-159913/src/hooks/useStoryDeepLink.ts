/**
 * useStoryDeepLink — Reads/writes the `?story=<story_id>` URL param so any
 * stories carousel (Profile / Feed / Chat) can deep-link directly into the
 * shared StoryViewer at the exact story segment.
 *
 * Uses react-router's useSearchParams so back/forward navigation closes or
 * reopens the viewer naturally without unmounting the underlying page.
 *
 * Also emits analytics for every deep-link open so we can attribute story
 * viewing back to its source carousel (profile / feed / chat / shared-link).
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { track } from "@/lib/analytics";
import type { StoryGroup } from "@/components/stories/StoryViewer";

export type StorySource = "profile" | "feed" | "chat" | "shared-link";

interface Options {
  /** Which carousel is mounting the hook — used for analytics attribution. */
  source: StorySource;
}

export function useStoryDeepLink({ source }: Options) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeStoryId = searchParams.get("story");

  // Track the most recent story we emitted analytics for so URL syncs from
  // auto-advance / next / prev don't double-fire the "opened" event.
  const lastTrackedRef = useRef<string | null>(null);

  const emitOpen = useCallback(
    (storyId: string, kind: "open" | "navigate") => {
      if (lastTrackedRef.current === storyId && kind === "open") return;
      lastTrackedRef.current = storyId;
      track(kind === "open" ? "story_deeplink_open" : "story_segment_view", {
        story_id: storyId,
        source,
      });
    },
    [source]
  );

  // Emit `story_deeplink_open` once on initial mount when the URL already
  // contains `?story=…` (e.g. shared link, chat link, refresh inside the
  // viewer). Subsequent updates from `openStory` / `updateStory` are
  // de-duped via `lastTrackedRef`.
  useEffect(() => {
    if (activeStoryId && lastTrackedRef.current !== activeStoryId) {
      emitOpen(activeStoryId, "open");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStoryId]);

  const openStory = useCallback(
    (storyId: string) => {
      const next = new URLSearchParams(searchParams);
      next.set("story", storyId);
      setSearchParams(next, { replace: false });
      emitOpen(storyId, "open");
    },
    [searchParams, setSearchParams, emitOpen]
  );

  const updateStory = useCallback(
    (storyId: string) => {
      const next = new URLSearchParams(searchParams);
      if (next.get("story") === storyId) return;
      next.set("story", storyId);
      // Replace so auto-advance doesn't pollute browser history — back button
      // should exit the viewer, not walk through every segment.
      setSearchParams(next, { replace: true });
      emitOpen(storyId, "navigate");
    },
    [searchParams, setSearchParams, emitOpen]
  );

  const closeStory = useCallback(
    (closeMeta?: {
      story_id?: string;
      segment_index?: number;
      total_segments?: number;
      completed?: boolean;
    }) => {
      if (closeMeta?.story_id) {
        track("story_deeplink_close", {
          source,
          story_id: closeMeta.story_id,
          segment_index: closeMeta.segment_index,
          total_segments: closeMeta.total_segments,
          completed: !!closeMeta.completed,
        });
      }
      const next = new URLSearchParams(searchParams);
      next.delete("story");
      setSearchParams(next, { replace: false });
      lastTrackedRef.current = null;
    },
    [searchParams, setSearchParams, source]
  );

  return { activeStoryId, openStory, updateStory, closeStory };
}

/**
 * Shared resolver: given the carousel's loaded `StoryGroup[]` and the active
 * deep-link `story_id`, return the `(groupIndex, storyIndex)` for the viewer.
 *
 * Returns `null` if no deep-link is active OR if the story_id isn't in the
 * loaded groups (still loading, or belongs to someone outside this carousel's
 * scope — e.g. a shared link to a non-friend's story).
 */
export function useStoryViewerLocation(
  groups: StoryGroup[],
  activeStoryId: string | null
) {
  return useMemo(() => {
    if (!activeStoryId) return null;
    for (let gi = 0; gi < groups.length; gi++) {
      const si = groups[gi].stories.findIndex((s) => s.id === activeStoryId);
      if (si !== -1) return { groupIndex: gi, storyIndex: si };
    }
    return null;
  }, [activeStoryId, groups]);
}
