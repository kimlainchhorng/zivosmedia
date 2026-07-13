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
const REPOST_HOOK_SRC = readFileSync(resolve(__dirname, "../hooks/usePostReposts.ts"), "utf8");
const SHARE_SHEET_SRC = readFileSync(resolve(__dirname, "../components/shared/ShareSheet.tsx"), "utf8");
const CSS_SRC = readFileSync(resolve(__dirname, "../index.css"), "utf8");

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
    // Identify the main query by its user-reel select constant and page-size limit.
    const block = SRC.match(/\.from\("user_posts"\)[\s\S]{0,300}?\.select\(FEED_USER_REELS_SELECT\)[\s\S]{0,300}?\.limit\(USER_PAGE \* pageMultiplier\)/);
    expect(block, "expected the main user_posts feed query block").toBeTruthy();
    expect(block![0]).toMatch(/\.eq\("media_type",\s*"video"\)/);
    expect(SRC).toMatch(/const FEED_USER_REELS_SELECT =\s*"[^"]*audio_name, location, shared_from_post_id, shared_from_user_id/);
  });

  it("empty-state copy says 'videos' only, not 'photos or videos'", () => {
    expect(SRC).not.toContain("photos or videos will show here");
    expect(SRC).toMatch(/Reels are videos from people and stores/);
  });

  it("keeps the 'No reels yet' headline", () => {
    expect(SRC).toContain("No reels yet");
  });

  it("keeps Duet/Stitch source metadata connected to the reel composer", () => {
    expect(SRC).toContain("shared_from_post_id, shared_from_user_id");
    expect(SRC).toContain("const remixSource = getReelRemixSource(post)");
    expect(SRC).toContain('remixType: "duet"');
    expect(SRC).toContain('remixType: "stitch"');
    expect(SRC).toContain("sharedPostId={reelComposerDraft.sharedPostId}");
    expect(SRC).toContain("remixType={reelComposerDraft.remixType}");
    expect(SRC).toContain("post.shared_from_post_id");
    expect(SRC).toContain("navigate(`/reels?post=${encodeURIComponent(post.shared_from_post_id || \"\")}`)");
  });

  it("routes Reels comments through the canonical comment sheet with count updates", () => {
    expect(SRC).toContain('const CanonicalCommentsSheet = lazy(() => import("@/components/social/CommentsSheet"));');
    expect(SRC).toContain("<CanonicalCommentsSheet");
    expect(SRC).toContain("postId={getFeedPostRawId(commentTarget.postId)}");
    expect(SRC).toContain("postSource={commentTarget.source}");
    expect(SRC).toContain("onCommentsCountChange");
    expect(SRC).toContain('"comments_count"');
  });

  it("records share/repost engagement and refreshes the Reels query after local count updates", () => {
    expect(SRC).toContain("type EngagementCountField = \"comments_count\" | \"shares_count\" | \"reposts_count\";");
    expect(SRC).toContain("const updatePostEngagementCount = useCallback");
    expect(SRC).toContain("onShareRecorded={() =>");
    expect(SRC).toContain('"shares_count"');
    expect(SRC).toContain('"reposts_count"');
    expect(SRC).toContain('void queryClient.invalidateQueries({ queryKey: ["customer-feed"] });');
    expect(SHARE_SHEET_SRC).toContain('rpc("record_post_share"');
    expect(SHARE_SHEET_SRC).toContain("onShareRecorded?.(channel)");
  });

  it("opens the Reels report dialog without mutating data before submit", () => {
    expect(SRC).toContain("window.dispatchEvent(new CustomEvent(\"zivo-reel-report\"");
    expect(SRC).toContain("reporterId: string | null");
    expect(SRC).toContain("Sign in to submit a report");
    expect(SRC).toContain("{reportPostId && (");
    expect(SRC).toContain("document.body.dataset.reelSheetOpen");
    expect(CSS_SRC).toContain('body[data-reel-sheet-open="true"] [data-zivo-mobile-nav]');
  });

  it("keeps repost toggle failure explicit instead of showing a false success", () => {
    expect(REPOST_HOOK_SRC).toContain("Promise<boolean | null>");
    expect(REPOST_HOOK_SRC).toContain("return null;");
    expect(SRC).toContain("nowReposted === null");
    expect(SRC).toContain("Couldn't update repost. Try again.");
  });
});
