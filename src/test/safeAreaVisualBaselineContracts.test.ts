import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("safe-area visual baseline contracts", () => {
  it("keeps iPhone safe-area visual screenshots focused on top and bottom clipping", () => {
    const safeAreaVisual = source("tests/visual/safe-area.spec.ts");

    for (const needle of [
      "Visual regression tests for safe-area handling.",
      "white-bar (top) regression",
      "home-indicator clipping",
      "TOP_CLIP_HEIGHT = 120",
      "BOTTOM_CLIP_HEIGHT = 140",
      "clip: { x: 0, y: 0, width: vp.viewport.width, height: TOP_CLIP_HEIGHT }",
      "y: h - BOTTOM_CLIP_HEIGHT",
      "height: BOTTOM_CLIP_HEIGHT",
      "toMatchSnapshot",
      "maxDiffPixelRatio: 0.001",
    ]) {
      expect(safeAreaVisual).toContain(needle);
    }
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
      "test.skip(skip || !!route.skipTop",
      "test.skip(skip || !!route.skipBottom",
      "zivo_cookie_consent",
    ]) {
      expect(safeAreaVisual).toContain(needle);
    }
  });

  it("keeps required committed baselines and frontend contract wiring in place", () => {
    const frontendContracts = source("scripts/qa/frontend-visual-contracts.mjs");
    const packageJson = source("package.json");
    const matrix = source("scripts/qa/platform-readiness-matrix.mjs");
    const baselineDir = "tests/visual/__screenshots__/safe-area.spec.ts";

    for (const fileName of [
      "iphone-se-home-top.png",
      "iphone-se-home-bottom.png",
      "iphone-se-account-top.png",
      "iphone-se-account-bottom.png",
      "iphone-13-home-top.png",
      "iphone-13-home-bottom.png",
      "iphone-13-account-top.png",
      "iphone-13-account-bottom.png",
      "iphone-14-pro-max-home-top.png",
      "iphone-14-pro-max-home-bottom.png",
      "iphone-14-pro-max-account-top.png",
      "iphone-14-pro-max-account-bottom.png",
    ]) {
      expect(existsSync(path.join(root, baselineDir, fileName))).toBe(true);
      expect(frontendContracts).toContain(fileName);
    }

    expect(frontendContracts).toContain('id: "safe-area-visual-baselines"');
    expect(frontendContracts).toContain("tests/visual/safe-area.spec.ts");
    expect(packageJson).toContain('"test:visual"');
    expect(matrix).toContain("npm run test:visual");
  });
});
