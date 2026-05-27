/**
 * useFeedMute — shared mute state across feed video cards and reel slides.
 *
 * Sound choice is sticky for the session: once the viewer unmutes one
 * video, every other card and the fullscreen reels viewer follow. Backed
 * by sessionStorage so navigation between feed tabs doesn't reset it.
 *
 * The pure helpers are exported so the storage contract is testable
 * without spinning up React — matches the pattern in useSwipeDownClose.
 */
import { useEffect, useState } from "react";

export const FEED_MUTE_STORAGE_KEY = "zivo_feed_mute";

type Storage = Pick<typeof sessionStorage, "getItem" | "setItem">;
const getStorage = (): Storage | null => {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
};

export const readPersistedFeedMute = (storage: Storage | null = getStorage()): boolean => {
  if (!storage) return true;
  try {
    return storage.getItem(FEED_MUTE_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
};

export const persistFeedMute = (muted: boolean, storage: Storage | null = getStorage()): void => {
  if (!storage) return;
  try {
    storage.setItem(FEED_MUTE_STORAGE_KEY, muted ? "true" : "false");
  } catch {
    /* private-mode storage failure — ignore */
  }
};

const subscribers = new Set<(muted: boolean) => void>();
let cachedFeedMute: boolean = readPersistedFeedMute();

export const getFeedMute = (): boolean => cachedFeedMute;

export const setFeedMute = (muted: boolean): void => {
  if (muted === cachedFeedMute) return;
  cachedFeedMute = muted;
  persistFeedMute(muted);
  subscribers.forEach((fn) => fn(muted));
};

/** Test seam: reset the shared state and clear subscribers between cases. */
export const __resetFeedMuteForTests = (initial = true): void => {
  cachedFeedMute = initial;
  subscribers.clear();
};

export const useFeedMute = (): [boolean, (muted: boolean) => void] => {
  const [muted, setLocalMuted] = useState(cachedFeedMute);
  useEffect(() => {
    const sub = (m: boolean) => setLocalMuted(m);
    subscribers.add(sub);
    return () => {
      subscribers.delete(sub);
    };
  }, []);
  return [muted, setFeedMute];
};
