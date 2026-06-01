import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("native safe-area bridge contracts", () => {
  it("keeps Capacitor edge-to-edge status bar behavior aligned with React startup", () => {
    const config = source("capacitor.config.ts");
    const main = source("src/main.tsx");

    for (const needle of [
      "StatusBar: {",
      "overlaysWebView: true",
      "style: 'DARK'",
      'resize: "native"',
      "resizeOnFullScreen: true",
      "launchAutoHide: false",
      "SplashScreen.hide({ fadeOutDuration: 200 })",
      "StatusBar.setOverlaysWebView({ overlay: true })",
      "StatusBar.setStyle({ style: getStyle() })",
      "Keyboard.setAccessoryBarVisible({ isVisible: false })",
      "document.documentElement.classList.add(\"kb-open\")",
      "document.documentElement.style.setProperty(\"--zivo-kb-height\"",
    ]) {
      expect(config + main).toContain(needle);
    }
  });

  it("keeps shared CSS tokens protecting interactive chrome in native and browser shells", () => {
    const css = source("src/index.css");
    const mobileNav = source("src/components/app/ZivoMobileNav.tsx");
    const sheet = source("src/components/ui/sheet.tsx");
    const responsiveModal = source("src/components/ui/responsive-modal.tsx");

    for (const needle of [
      "--zivo-safe-top: env(safe-area-inset-top, 0px);",
      "--zivo-safe-bottom: env(safe-area-inset-bottom, 0px);",
      "--zivo-mobile-nav-h: 60px;",
      "--zivo-safe-top-overlay: max(calc(var(--zivo-safe-top, 0px) + 1.25rem), 80px);",
      "--zivo-safe-top-sheet: max(var(--zivo-safe-top, 0px), 44px);",
      "--zivo-safe-top-sticky: max(calc(var(--zivo-safe-top, 0px) + 0.125rem), 64px);",
      ".safe-area-top",
      ".safe-area-bottom",
      ".pb-safe",
      ".pt-safe",
      "padding-bottom: max(env(safe-area-inset-bottom, 0px), 12px) !important;",
      "padding-top: var(--zivo-safe-top-sticky) !important;",
      "@media (min-width: 1024px)",
      "--zivo-safe-top-sticky: var(--zivo-safe-top, 0px);",
    ]) {
      expect(css).toContain(needle);
    }

    expect(mobileNav).toContain("data-zivo-mobile-nav");
    expect(mobileNav).toContain("fixed inset-x-0 bottom-0");
    expect(mobileNav).toContain("lg:hidden pb-safe");
    expect(sheet).toContain("pt-[max(1.5rem,calc(var(--zivo-safe-top,0px)+0.5rem))]");
    expect(sheet).toContain("pb-[max(1.5rem,calc(var(--zivo-safe-bottom,0px)+0.5rem))]");
    expect(sheet).toContain('side === "bottom"');
    expect(sheet).toContain('"calc(var(--zivo-safe-top,0px) + 0.75rem)"');
    expect(responsiveModal).toContain("var(--zivo-mobile-nav-h, 64px)");
    expect(responsiveModal).toContain("var(--zivo-safe-bottom,0px)");
  });

  it("keeps native safe-area QA wired to simulated devices and visual baselines", () => {
    const safeAreaCheck = source("scripts/qa/safe-area-check.mjs");
    const safeAreaE2e = source("tests/e2e/safe-area.spec.ts");
    const safeAreaVisual = source("tests/visual/safe-area.spec.ts");
    const nativeContracts = source("scripts/qa/native-app-contracts.mjs");
    const packageJson = source("package.json");
    const docs = source("docs/dev/capacitor-safe-area.md");

    for (const needle of [
      "iPhone 15 Pro (notch)",
      "Pixel 8 (cutout)",
      "Galaxy S24 (cutout)",
      "iOS Dynamic Island (broken inset=0)",
      "Feed sticky header",
      "ReelSlide close button (top)",
      "brokenIslandFloor",
    ]) {
      expect(safeAreaCheck).toContain(needle);
    }

    for (const needle of [
      "iPhone-15-Pro",
      "DynamicIsland-broken",
      '[data-testid="feed-sticky-header"] > div',
      '[aria-label="Reel feed mode"]',
      "await page.screenshot({ path: `test-results/safe-area-${p.name}-feed.png` });",
    ]) {
      expect(safeAreaE2e).toContain(needle);
    }

    expect(safeAreaVisual).toContain("iphone-se");
    expect(safeAreaVisual).toContain("iphone-13");
    expect(safeAreaVisual).toContain("iphone-14-pro-max");
    expect(safeAreaVisual).toContain("TOP_CLIP_HEIGHT");
    expect(safeAreaVisual).toContain("BOTTOM_CLIP_HEIGHT");
    expect(nativeContracts).toContain("capacitor-production-shell");
    expect(packageJson).toContain('"qa:safe-area:all"');
    expect(packageJson).toContain('"qa:native-app-contracts"');
    expect(docs).toContain("StatusBar.overlaysWebView");
    expect(docs).toContain("Visual content");
    expect(docs).toContain("Interactive controls");
    expect(docs).toContain("Bottom nav / home indicator");
  });
});
