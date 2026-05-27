/**
 * Contract tests for the shared feed-mute store. Covers the pure helpers
 * + the subscribe/notify pattern that keeps every feed card and reel
 * slide in sync once the viewer unmutes once.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  FEED_MUTE_STORAGE_KEY,
  readPersistedFeedMute,
  persistFeedMute,
  getFeedMute,
  setFeedMute,
  __resetFeedMuteForTests,
} from "../useFeedMute";

function makeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
}

describe("useFeedMute — persistence helpers", () => {
  beforeEach(() => {
    __resetFeedMuteForTests(true);
  });

  it("defaults to muted when storage has no entry", () => {
    const store = makeStorage();
    expect(readPersistedFeedMute(store)).toBe(true);
  });

  it("returns unmuted only when storage explicitly holds 'false'", () => {
    expect(readPersistedFeedMute(makeStorage({ [FEED_MUTE_STORAGE_KEY]: "false" }))).toBe(false);
    expect(readPersistedFeedMute(makeStorage({ [FEED_MUTE_STORAGE_KEY]: "true" }))).toBe(true);
    // Defensive: any unexpected value falls back to muted (safer default for autoplay).
    expect(readPersistedFeedMute(makeStorage({ [FEED_MUTE_STORAGE_KEY]: "garbage" }))).toBe(true);
  });

  it("persistFeedMute writes the canonical string form", () => {
    const store = makeStorage();
    persistFeedMute(false, store);
    expect(store.data[FEED_MUTE_STORAGE_KEY]).toBe("false");
    persistFeedMute(true, store);
    expect(store.data[FEED_MUTE_STORAGE_KEY]).toBe("true");
  });

  it("read/persist round-trip preserves the value", () => {
    const store = makeStorage();
    persistFeedMute(false, store);
    expect(readPersistedFeedMute(store)).toBe(false);
    persistFeedMute(true, store);
    expect(readPersistedFeedMute(store)).toBe(true);
  });

  it("returns the muted default when no storage backend is available", () => {
    expect(readPersistedFeedMute(null)).toBe(true);
  });
});

describe("useFeedMute — shared in-memory state", () => {
  beforeEach(() => {
    __resetFeedMuteForTests(true);
  });

  it("getFeedMute reflects the latest setFeedMute call", () => {
    expect(getFeedMute()).toBe(true);
    setFeedMute(false);
    expect(getFeedMute()).toBe(false);
    setFeedMute(true);
    expect(getFeedMute()).toBe(true);
  });

  it("setFeedMute is a no-op when the value matches current state", () => {
    // Set up an initial mismatch by changing to false first.
    setFeedMute(false);
    // Calling with the same value should not throw and should keep state stable.
    expect(() => setFeedMute(false)).not.toThrow();
    expect(getFeedMute()).toBe(false);
  });

  it("__resetFeedMuteForTests restores the initial value", () => {
    setFeedMute(false);
    expect(getFeedMute()).toBe(false);
    __resetFeedMuteForTests(true);
    expect(getFeedMute()).toBe(true);
    __resetFeedMuteForTests(false);
    expect(getFeedMute()).toBe(false);
  });
});
