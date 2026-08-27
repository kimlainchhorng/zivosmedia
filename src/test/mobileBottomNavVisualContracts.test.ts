import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("mobile bottom nav visual contracts", () => {
  it("keeps bottom navigation above the home indicator with stable tap targets", () => {
    const nav = source("src/components/app/ZivoMobileNav.tsx");
    const more = source("src/pages/MorePage.tsx");
    const prefetcher = source("src/components/shared/RoutePrefetcher.tsx");
    const css = source("src/index.css");
    const noOverlap = source("tests/e2e/mobile-layout-no-overlap.spec.ts");

    expect(nav).toContain("data-zivo-mobile-nav");
    expect(nav).toContain("fixed inset-x-0 bottom-0");
    expect(nav).toContain("lg:hidden pb-safe");
    expect(nav).toContain("max-w-[340px]");
    expect(nav).toContain(
      "pointer-events-auto relative flex w-full items-stretch px-1.5 py-2",
    );
    expect(nav).toContain("min-h-[52px] min-w-[44px]");
    expect(nav).toContain('aria-current={isActive ? "page" : undefined}');
    expect(nav).toContain(
      'const label = tab.label ?? (tab.labelKey ? t(tab.labelKey) : "");',
    );
    expect(nav).toMatch(
      /isActive\s*\?\s*"flex-\[1\.8\] flex-row gap-1 px-1\.5 text-white"/,
    );
    expect(nav).toMatch(
      /isActive\s*\?\s*"relative z-10 block max-w-\[76px\] truncate/,
    );
    expect(nav).toContain(': "sr-only"');
    expect(nav).toContain("bg-ig-gradient opacity-100");
    // Active pill is a plain CSS-transition lozenge — framer-motion shared-layout
    // layoutId was deliberately removed (loops when the nav mounts twice).
    expect(nav).toContain("no framer-motion layoutId");
    expect(nav).toContain(
      "pointer-events-none absolute inset-1 rounded-full transition-all duration-300 ease-out",
    );

    for (const routeToken of [
      "SOCIAL_ROUTE_PATHS.feed",
      "SOCIAL_ROUTE_PATHS.reels",
      '"/rides/hub"',
      "gated(SOCIAL_ROUTE_PATHS.profile)",
      'gated("/account")',
    ]) {
      expect(nav).toContain(routeToken);
    }

    expect(nav).toContain("normalizedPathname !== SOCIAL_ROUTE_PATHS.profile");
    expect(nav).toContain('location.pathname.replace(/\\/+$/, "")');
    expect(nav).not.toContain('path: gated("/more")');
    expect(nav).not.toContain(
      'navigate(location.pathname.startsWith("/more") ? gated("/profile") : "/more")',
    );
    expect(more).toContain(
      'const returnPath = returnTarget ? `/${returnTarget}` : "/";',
    );
    expect(more).toContain("navigate(returnPath);");
    expect(prefetcher).toContain('"/more": () => import("@/pages/MorePage")');

    expect(css).toContain("--zivo-mobile-nav-h: 68px");
    expect(css).toContain(".pb-safe");
    expect(css).toContain(
      "padding-bottom: max(env(safe-area-inset-bottom, 0px), 12px) !important;",
    );
    expect(css).toContain(".pb-nav");
    expect(css).toContain(
      "padding-bottom: calc(4rem + var(--zivo-safe-bottom, 0px));",
    );
    expect(css).toContain(".zivo-social-nav-glass");
    expect(css).toContain(".zivo-social-nav-pill");

    for (const hiddenState of [
      'body[data-story-open="true"] [data-zivo-mobile-nav]',
      'body[data-share-sheet-open="true"] [data-zivo-mobile-nav]',
      'body[data-reel-sheet-open="true"] [data-zivo-mobile-nav]',
    ]) {
      expect(css).toContain(hiddenState);
    }

    expect(noOverlap).toContain("data-zivo-mobile-nav");
    expect(noOverlap).toContain("pb-safe");
    expect(noOverlap).toContain("tooSmall");
    expect(noOverlap).toContain("textOverflow");
  });

  it("keeps fixed bottom sheets and page shells reserving bottom navigation space", () => {
    const responsiveModal = source("src/components/ui/responsive-modal.tsx");
    const appHome = source("src/pages/app/AppHome.tsx");
    const socialFeed = source("src/pages/SocialFeedPage.tsx");
    const reelsFeed = source("src/pages/ReelsFeedPage.tsx");
    const css = source("src/index.css");
    const mobileSmoke = source("tests/e2e/mobile-auth-feed-smoke.spec.ts");
    const visualWorkflow = source(
      "tests/visual/workflow-visual-readiness.spec.ts",
    );

    expect(responsiveModal).toContain("var(--zivo-mobile-nav-h, 64px)");
    expect(responsiveModal).toContain("var(--zivo-safe-bottom,0px)");
    expect(appHome).toContain("<ZivoMobileNav />");
    expect(appHome).toContain("pb-safe");
    expect(socialFeed).toContain("<ZivoMobileNav />");
    expect(socialFeed).toContain("pb-safe");
    expect(reelsFeed).toContain(
      "Spacer so last post clears the fixed bottom nav",
    );
    expect(reelsFeed).toContain("zivo-reels-bottom-spacer");
    expect(css).toContain(".zivo-reels-bottom-spacer");
    expect(css).toContain(
      "height: max(calc(var(--zivo-safe-bottom, 0px) + 6rem), 6rem);",
    );

    expect(mobileSmoke).toContain("div.pb-nav.safe-area-bottom");
    expect(visualWorkflow).toContain("assertControlsStayInsideViewport");
    expect(visualWorkflow).toContain("hasHorizontalScrollAncestor");
  });
});
