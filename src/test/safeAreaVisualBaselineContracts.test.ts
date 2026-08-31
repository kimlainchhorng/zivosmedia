import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("safe-area visual baseline contracts", () => {
  it("keeps iPhone safe-area visual screenshots focused on top and bottom clipping", () => {
    const safeAreaVisual = source("tests/visual/safe-area.spec.ts");

    for (const needle of [
      "Visual regression tests for safe-area handling.",
      "white-bar (top) regression",
      "home-indicator clipping",
      "TOP_CLIP_HEIGHT = 120",
      "BOTTOM_CLIP_HEIGHT = 140",
      "y: h - BOTTOM_CLIP_HEIGHT",
      "height: BOTTOM_CLIP_HEIGHT",
      "toHaveScreenshot",
      'animations: "disabled"',
      'caret: "hide"',
      "maxDiffPixelRatio: 0.001",
    ]) {
      expect(safeAreaVisual).toContain(needle);
    }
    expect(safeAreaVisual).toMatch(
      /clip:\s*\{\s*x: 0,\s*y: 0,\s*width: vp\.viewport\.width,\s*height: TOP_CLIP_HEIGHT,?\s*\}/,
    );
  });

  it("keeps safe-area snapshots across small, standard, and large notched iPhones", () => {
    const safeAreaVisual = source("tests/visual/safe-area.spec.ts");

    for (const needle of [
      '{ name: "iphone-se", ...devices["iPhone SE"] }',
      '{ name: "iphone-13", ...devices["iPhone 13"] }',
      '{ name: "iphone-14-pro-max", ...devices["iPhone 14 Pro Max"] }',
      '{ name: "home", path: "/" }',
      '{ name: "account", path: "/account" }',
      '{ name: "profile", path: "/profile", needsAuth: true }',
      '{ name: "chat", path: "/chat", needsAuth: true }',
      '{ name: "more", path: "/more", needsAuth: true }',
      '{ name: "settings", path: "/settings", needsAuth: true }',
      '{ name: "account-settings", path: "/account/settings", needsAuth: true }',
      '{ name: "wallet", path: "/wallet", needsAuth: true }',
      "storageState: HAS_AUTH ? AUTH_STATE : undefined",
      "zivo_cookie_consent",
      "zivo:swipe-nav-hint-seen-v1",
      'emulateMedia({ reducedMotion: "reduce" })',
      'locator("[data-zivo-mobile-nav]")',
      "Number.parseFloat(getComputedStyle(tile).opacity) >= 0.999",
      "serviceImages.first().waitFor",
      "document.fonts.ready",
      "image.decode()",
      'waitUntil: "domcontentloaded"',
      "test.setTimeout(90_000)",
      ".zivo-safe-top-none",
      "opacity: 0 !important",
    ]) {
      expect(safeAreaVisual).toContain(needle);
    }
    expect(safeAreaVisual).toMatch(/test\.skip\(\s*skip \|\| !!route\.skipTop/);
    expect(safeAreaVisual).toMatch(
      /test\.skip\(\s*skip \|\| !!route\.skipBottom/,
    );
    expect(safeAreaVisual).not.toContain("waitForTimeout(500)");
    expect(safeAreaVisual).not.toContain('waitUntil: "networkidle"');
  });

  it("keeps required committed baselines and frontend contract wiring in place", () => {
    const frontendContracts = source(
      "scripts/qa/frontend-visual-contracts.mjs",
    );
    const packageJson = source("package.json");
    const matrix = source("scripts/qa/platform-readiness-matrix.mjs");
    const baselineDir = "tests/visual/__screenshots__/safe-area.spec.ts";

    const baselineVariants = [
      "iphone-se-home-top",
      "iphone-se-home-bottom",
      "iphone-se-account-top",
      "iphone-se-account-bottom",
      "iphone-13-home-top",
      "iphone-13-home-bottom",
      "iphone-13-account-top",
      "iphone-13-account-bottom",
      "iphone-14-pro-max-home-top",
      "iphone-14-pro-max-home-bottom",
      "iphone-14-pro-max-account-top",
      "iphone-14-pro-max-account-bottom",
    ];

    for (const fileName of baselineVariants.flatMap((base) => [
      `${base}-darwin.png`,
      `${base}-linux.png`,
    ])) {
      expect(existsSync(path.join(root, baselineDir, fileName))).toBe(true);
    }

    expect(frontendContracts).toContain('id: "safe-area-visual-baselines"');
    expect(frontendContracts).toContain("tests/visual/safe-area.spec.ts");
    expect(frontendContracts).toContain("baselineVariants.flatMap");
    expect(frontendContracts).toContain("${base}-darwin.png");
    expect(frontendContracts).toContain("${base}-linux.png");
    expect(packageJson).toContain('"test:visual"');
    expect(matrix).toContain("npm run test:visual");
  });

  it("keeps six mobile destinations usable without clipping Home on 320px screens", () => {
    const mobileNav = source("src/components/app/ZivoMobileNav.tsx");

    expect(mobileNav).toContain("min-w-[44px]");
    expect(mobileNav).toContain("max-[340px]:w-[calc(100%-16px)]");
    expect(mobileNav).toContain("max-[340px]:px-0.5");
    expect(mobileNav).toContain("max-[340px]:gap-0.5 max-[340px]:px-1");
    expect(mobileNav).toContain("truncate text-[11px]");
  });
});
