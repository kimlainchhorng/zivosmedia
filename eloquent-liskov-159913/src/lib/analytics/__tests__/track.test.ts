/**
 * Analytics tracking-payload tests.
 *
 * Verifies that every user-facing engagement action emits the correct
 * event_name + payload (post_id, surface, event_id) into analytics_events,
 * and that rapid duplicate calls are deduped client-side.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Capture every analytics_events insert payload.
const inserts: Array<{ event_name: string; meta: Record<string, unknown>; page: string | null }> = [];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      insert: (row: any) => {
        if (table === "analytics_events") inserts.push(row);
        return Promise.resolve({ error: null });
      },
    }),
  },
}));

import { track, __resetAnalyticsDedupe } from "@/lib/analytics";

const FIXTURE_POST_ID = "fixture-post-123";
const FIXTURE_AUTHOR_ID = "fixture-author-456";

const UUID_RE = /^[0-9a-f-]{8,}$/i;

function expectValidPayload(event_name: string) {
  const row = inserts.find((r) => r.event_name === event_name);
  expect(row, `expected ${event_name} to be tracked`).toBeDefined();
  expect(row!.meta.post_id).toBe(FIXTURE_POST_ID);
  expect(row!.meta.surface).toBe("profile_feed");
  expect(String(row!.meta.event_id)).toMatch(UUID_RE);
}

describe("analytics tracking payloads", () => {
  beforeEach(() => {
    inserts.length = 0;
    __resetAnalyticsDedupe();
  });

  const events = [
    "post_liked",
    "post_unliked",
    "post_comment_opened",
    "post_comment_added",
    "share_button_tapped",
    "share_sheet_opened",
    "share_completed",
    "post_bookmarked",
    "post_unbookmarked",
  ] as const;

  it.each(events)("emits %s with post_id, surface, and event_id", async (event) => {
    track(event, {
      post_id: FIXTURE_POST_ID,
      author_id: FIXTURE_AUTHOR_ID,
      surface: "profile_feed",
    });
    // microtask flush
    await Promise.resolve();
    expectValidPayload(event);
  });

  it("strips dedupeMs from the persisted payload", async () => {
    track("post_liked", { post_id: FIXTURE_POST_ID, surface: "profile_feed", dedupeMs: 500 });
    await Promise.resolve();
    const row = inserts.find((r) => r.event_name === "post_liked");
    expect(row).toBeDefined();
    expect(row!.meta.dedupeMs).toBeUndefined();
  });
});

describe("analytics dedupe", () => {
  beforeEach(() => {
    inserts.length = 0;
    __resetAnalyticsDedupe();
  });

  it("drops a duplicate event for the same post_id within the dedupe window", async () => {
    track("post_liked", { post_id: FIXTURE_POST_ID, surface: "profile_feed" });
    track("post_liked", { post_id: FIXTURE_POST_ID, surface: "profile_feed" });
    await Promise.resolve();
    const liked = inserts.filter((r) => r.event_name === "post_liked");
    expect(liked).toHaveLength(1);
  });

  it("does not dedupe across different post_ids", async () => {
    track("post_liked", { post_id: "post-a", surface: "profile_feed" });
    track("post_liked", { post_id: "post-b", surface: "profile_feed" });
    await Promise.resolve();
    expect(inserts.filter((r) => r.event_name === "post_liked")).toHaveLength(2);
  });

  it("does not dedupe across different event names", async () => {
    track("post_liked", { post_id: FIXTURE_POST_ID, surface: "profile_feed" });
    track("post_unliked", { post_id: FIXTURE_POST_ID, surface: "profile_feed" });
    await Promise.resolve();
    expect(inserts).toHaveLength(2);
  });

  it("inserts again after the dedupe window passes (dedupeMs: 0 forces immediate)", async () => {
    track("post_liked", { post_id: FIXTURE_POST_ID, surface: "profile_feed", dedupeMs: 0 });
    track("post_liked", { post_id: FIXTURE_POST_ID, surface: "profile_feed", dedupeMs: 0 });
    await Promise.resolve();
    expect(inserts.filter((r) => r.event_name === "post_liked")).toHaveLength(2);
  });
});
