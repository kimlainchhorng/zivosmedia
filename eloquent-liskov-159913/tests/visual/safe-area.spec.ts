/**
 * Visual regression tests for safe-area handling.
 *
 * Captures top + bottom regions of key routes on multiple iPhone viewports to
 * detect both the white-bar (top) regression and home-indicator clipping
 * (bottom) regression that occur when safe-area floors are reintroduced.
 *
 * Usage:
 *   bun run test:visual                       # run against baselines
 *   bun run test:visual -- --update-snapshots # refresh baselines
 *
 * Authenticated routes use a saved storage state from tests/visual/.auth/state.json
 * created by tests/visual/auth.setup.ts. If the file doesn't exist, the
 * authenticated routes are skipped (so the suite still runs in unauth contexts).
 *
 * See: docs/dev/capacitor-safe-area.md
 */
import { test, expect, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// __dirname isn't defined in ESM scope; reconstruct from import.meta.url so
// Playwright can load this file (otherwise it ReferenceErrors during test
// collection and reports "No tests found").
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const AUTH_STATE = path.join(__dirname, ".auth", "state.json");
const HAS_AUTH = fs.existsSync(AUTH_STATE);

const VIEWPORTS = [
  { name: "iphone-se", ...devices["iPhone SE"] },
  { name: "iphone-13", ...devices["iPhone 13"] },
  { name: "iphone-14-pro-max", ...devices["iPhone 14 Pro Max"] },
];

type RouteCfg = {
  name: string;
  path: string;
  needsAuth?: boolean;
  /** Skip top-region check (e.g. when route has full-bleed media) */
  skipTop?: boolean;
  /** Skip bottom-region check */
  skipBottom?: boolean;
};

const ROUTES: RouteCfg[] = [
  { name: "home", path: "/" },
  { name: "account", path: "/account" },
  { name: "profile", path: "/profile", needsAuth: true },
  { name: "chat", path: "/chat", needsAuth: true },
  { name: "more", path: "/more", needsAuth: true },
  { name: "settings", path: "/settings", needsAuth: true },
  { name: "account-settings", path: "/account/settings", needsAuth: true },
  { name: "wallet", path: "/wallet", needsAuth: true },
];

const TOP_CLIP_HEIGHT = 120;
const BOTTOM_CLIP_HEIGHT = 140;

for (const vp of VIEWPORTS) {
  test.describe(`safe-area · ${vp.name}`, () => {
    test.use({
      viewport: vp.viewport,
      userAgent: vp.userAgent,
      // Apply saved auth state when available; otherwise unauth tests still run.
      storageState: HAS_AUTH ? AUTH_STATE : undefined,
    });

    for (const route of ROUTES) {
      const skip = route.needsAuth && !HAS_AUTH;

      test(`${route.name} — top region`, async ({ page }) => {
        test.skip(skip || !!route.skipTop, "auth state missing or top check disabled");
        await page.goto(route.path, { waitUntil: "networkidle" });
        await page.waitForTimeout(500);
        const buf = await page.screenshot({
          clip: { x: 0, y: 0, width: vp.viewport.width, height: TOP_CLIP_HEIGHT },
        });
        expect(buf).toMatchSnapshot(`${vp.name}-${route.name}-top.png`, {
          maxDiffPixelRatio: 0.001,
        });
      });

      test(`${route.name} — bottom region`, async ({ page }) => {
        test.skip(skip || !!route.skipBottom, "auth state missing or bottom check disabled");
        await page.goto(route.path, { waitUntil: "networkidle" });
        await page.waitForTimeout(500);
        const h = vp.viewport.height;
        const buf = await page.screenshot({
          clip: {
            x: 0,
            y: h - BOTTOM_CLIP_HEIGHT,
            width: vp.viewport.width,
            height: BOTTOM_CLIP_HEIGHT,
          },
        });
        expect(buf).toMatchSnapshot(`${vp.name}-${route.name}-bottom.png`, {
          maxDiffPixelRatio: 0.001,
        });
      });
    }
  });
}
