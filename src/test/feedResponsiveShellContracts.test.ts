import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("feed responsive shell contracts", () => {
  it("keeps mobile and desktop feed chrome separated instead of duplicated", () => {
    const feed = source("src/pages/ReelsFeedPage.tsx");

    for (const needle of [
      "hidden lg:block relative z-[1200]",
      "lg:flex lg:pt-[60px] transition-all duration-300",
      "chatOpen && \"lg:pr-[400px] xl:pr-[420px] 2xl:pr-[440px]\"",
      "<Suspense fallback={null}><FeedSidebar /></Suspense>",
      "zivo-shell-mobile zivo-social-surface lg:pb-0 flex-1 lg:max-w-2xl xl:max-w-3xl lg:mx-auto",
      'data-testid="feed-sticky-header"',
      "lg:hidden zivo-sticky-mobile-header px-2 pt-1 pb-1",
      "zivo-pt-safe-sticky zivo-feed-mobile-header-panel zivo-social-header-glass",
      "zivo-feed-tabs-shell hidden lg:flex justify-center sticky lg:top-[60px] z-20 py-1",
    ]) {
      expect(feed).toContain(needle);
    }
  });

  it("keeps feed tabs and filter controls stable at small and large breakpoints", () => {
    const feed = source("src/pages/ReelsFeedPage.tsx");
    const noOverlap = source("tests/e2e/mobile-layout-no-overlap.spec.ts");
    const mobileContract = source("src/test/feedMobileVisualContracts.test.ts");

    expect(feed).toContain('(["For You", "Friends", "Following"] as const).map((label) => (');
    expect(feed.match(/aria-pressed=\{feedTab === label\}/g)?.length).toBeGreaterThanOrEqual(2);
    expect(feed).toContain('(["all", "photos", "videos", "text"] as const).map((f) => (');
    expect(feed).toContain("grid grid-cols-4 gap-1 px-2 pb-1.5 pt-1");
    expect(feed).toContain("min-h-10 w-full px-2 py-2 rounded-full");
    expect(feed).toContain("min-h-[40px] rounded-[1rem] px-6");

    expect(noOverlap).toContain("feed keeps category controls fully visible at compact mobile width");
    expect(noOverlap).toContain('[data-testid="feed-sticky-header"] [role="tab"], [data-testid="feed-sticky-header"] button');
    expect(noOverlap).toContain("clipped");
    expect(noOverlap).toContain("tooShort");
    expect(noOverlap).toContain("textOverflow");
    expect(mobileContract).toContain("keeps the compact mobile feed header safe-area aware and fully testable");
  });

  it("keeps the responsive feed surface using shared visual tokens and safe-area floors", () => {
    const css = source("src/index.css");
    const visualContracts = source("scripts/qa/frontend-visual-contracts.mjs");
    const safeAreaCheck = source("scripts/qa/safe-area-check.mjs");

    for (const token of [
      ".zivo-shell-mobile",
      "min-height: 100dvh;",
      "padding-bottom: calc(4.5rem + var(--zivo-safe-bottom, 0px));",
      ".zivo-sticky-mobile-header",
      "position: sticky;",
      ".zivo-pt-safe-sticky",
      "padding-top: var(--zivo-safe-top-sticky);",
      ".zivo-social-surface",
      ".zivo-social-header-glass",
      ".zivo-feed-tabbar",
      ".zivo-feed-tab-active",
      ".zivo-feed-mobile-header-panel",
      "padding-top: max(var(--zivo-safe-top, 0px), 0.625rem) !important;",
      "@media (min-width: 1024px)",
      "--zivo-safe-top-sticky: var(--zivo-safe-top, 0px);",
    ]) {
      expect(css).toContain(token);
    }

    expect(visualContracts).toContain("safe-area-mobile-layout");
    expect(visualContracts).toContain("visual-workflow-route-coverage");
    expect(safeAreaCheck).toContain("Feed sticky header");
    expect(safeAreaCheck).toContain("zivo-pt-safe-sticky");
  });
});
