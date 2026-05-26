/**
 * Unit test for the /reels page (rendered by FeedPage.tsx):
 *  1. The store_posts AND user_posts queries must filter media_type='video'.
 *     Reels are a videos-only surface; photo posts must never leak in.
 *  2. The empty-state copy must say "videos" only (not "photos or videos"),
 *     so users aren't told photos will appear here.
 *
 * These assertions are read off the source file directly so a future refactor
 * that removes the filter or reverts the copy will fail this test.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = readFileSync(resolve(__dirname, "../pages/FeedPage.tsx"), "utf8");

describe("/reels (FeedPage.tsx) — videos-only contract", () => {
  it("applies media_type='video' to both the feed query and the deep-link lookup, for both store and user posts (>= 4 sites)", () => {
    const matches = SRC.match(/\.eq\("media_type",\s*"video"\)/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });

  it("main reels-feed query block filters media_type='video' on store_posts", () => {
    // Identify the main query by its richer SELECT (reposts_count is unique to it).
    const block = SRC.match(/\.from\("store_posts"\)[\s\S]{0,500}?reposts_count[\s\S]{0,500}?\.limit\([^)]+\)/);
    expect(block, "expected the main store_posts feed query block").toBeTruthy();
    expect(block![0]).toMatch(/\.eq\("media_type",\s*"video"\)/);
  });

  it("main reels-feed query block filters media_type='video' on user_posts", () => {
    // Identify the main query by its richer SELECT (audio_name + location together is the main feed query).
    const block = SRC.match(/\.from\("user_posts"\)[\s\S]{0,500}?audio_name[\s\S]{0,200}?location[\s\S]{0,300}?\.limit\([^)]+\)/);
    expect(block, "expected the main user_posts feed query block").toBeTruthy();
    expect(block![0]).toMatch(/\.eq\("media_type",\s*"video"\)/);
  });

  it("empty-state copy says 'videos' only, not 'photos or videos'", () => {
    expect(SRC).not.toContain("photos or videos will show here");
    expect(SRC).toMatch(/Reels are videos from people and stores/);
  });

  it("keeps the 'No reels yet' headline", () => {
    expect(SRC).toContain("No reels yet");
  });
});
