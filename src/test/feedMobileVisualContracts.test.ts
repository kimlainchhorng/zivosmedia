import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("feed mobile visual contracts", () => {
  it("keeps the compact mobile feed header safe-area aware and fully testable", () => {
    const feed = source("src/pages/ReelsFeedPage.tsx");
    const css = source("src/index.css");
    const noOverlap = source("tests/e2e/mobile-layout-no-overlap.spec.ts");
    const safeArea = source("tests/e2e/safe-area.spec.ts");

    expect(feed).toContain('data-testid="feed-sticky-header"');
    expect(feed).toContain("zivo-sticky-mobile-header");
    expect(feed).toContain("zivo-pt-safe-sticky");
    expect(feed).toContain("zivo-feed-mobile-header-panel");
    expect(feed).toContain("zivo-feed-tabbar");
    expect(feed).toContain('aria-pressed={feedTab === label}');
    expect(feed).toContain('["For You", "Friends", "Following", "Travel", "Eat"] as const');
    expect(feed).toContain('(["all", "photos", "videos", "text"] as const)');
    expect(feed).toContain("min-h-10 w-full px-2 py-2 rounded-full");
    expect(feed).toContain("grid grid-cols-4 gap-1 px-2 pb-1.5 pt-1");

    for (const token of [
      ".zivo-sticky-mobile-header",
      ".zivo-pt-safe-sticky",
      ".zivo-feed-mobile-header-panel",
      "--zivo-safe-top-sticky",
      "--zivo-safe-top-overlay",
      "--zivo-safe-bottom",
    ]) {
      expect(css).toContain(token);
    }
    expect(css).toContain("padding-top: max(var(--zivo-safe-top, 0px), 0.625rem) !important;");

    expect(noOverlap).toContain("feed keeps category controls fully visible at compact mobile width");
    expect(noOverlap).toContain('[data-testid="feed-sticky-header"] [role="tab"], [data-testid="feed-sticky-header"] button');
    expect(noOverlap).toContain("textOverflow");
    expect(noOverlap).toContain("tooShort");
    expect(noOverlap).toContain("clipped");

    expect(safeArea).toContain("feed sticky header clears status bar");
    expect(safeArea).toContain('[data-testid="feed-sticky-header"] > div');
    expect(safeArea).toContain("DynamicIsland-broken");
  });

  it("keeps first-feed viewport content dense without secondary shortcut clutter", () => {
    const feed = source("src/pages/ReelsFeedPage.tsx");
    const visual = source("tests/visual/workflow-visual-readiness.spec.ts");
    const contracts = source("scripts/qa/frontend-visual-contracts.mjs");

    expect(feed).toContain("Personalized greeting removed");
    expect(feed).toContain("quick-link shortcut bar removed");
    expect(feed).toContain("pushed actual posts");
    expect(feed).toContain("Story Rings");
    expect(feed).toContain("<Suspense fallback={null}><FeedStoryRing /></Suspense>");
    expect(feed).toContain("SuggestedUsersCarousel");

    expect(visual).toContain('{ area: "feed", path: "/feed" }');
    expect(visual).toContain("assertControlsStayInsideViewport");
    expect(visual).toContain("textOverflow");
    expect(visual).toContain("mobile");
    expect(visual).toContain("desktop");

    expect(contracts).toContain("safe-area-mobile-layout");
    expect(contracts).toContain("visual-workflow-route-coverage");
    expect(contracts).toContain("loading-error-empty-states");
  });
});
