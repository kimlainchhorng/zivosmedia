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

const SNAPSHOT_PLATFORM = process.platform;

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

function safeAreaSnapshotName(
  viewportName: string,
  routeName: string,
  edge: "top" | "bottom",
) {
  return `${viewportName}-${routeName}-${edge}-${SNAPSHOT_PLATFORM}.png`;
}

async function prepareStableVisualPage(page: import("@playwright/test").Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem(
        "zivo_cookie_consent",
        JSON.stringify({
          necessary: true,
          functional: true,
          analytics: false,
          marketing: false,
          personalization: false,
          updatedAt: new Date().toISOString(),
        }),
      );
      // This one-time coach intentionally appears on a timer, but it is not
      // part of the safe-area chrome under test.
      window.localStorage.setItem("zivo:swipe-nav-hint-seen-v1", "visual-qa");
    } catch {
      // Storage can be unavailable in hardened browser contexts.
    }

    // Capture the settled layout instead of a device-speed-dependent frame
    // from a route or Framer Motion transition. This is visual-test-only;
    // production motion still follows the user's preference.
    const style = document.createElement("style");
    style.id = "__qa_stable_visuals";
    style.textContent = `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        scroll-behavior: auto !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
      /* Route progress is intentionally timer-driven and can be 8%, 35%,
         60%, 80%, or 100% wide at capture time. It is not permanent safe-area
         chrome, so exclude it from this layout baseline. */
      .zivo-safe-top-none {
        opacity: 0 !important;
      }
    `;
    const install = () => {
      if (!document.getElementById(style.id)) document.head.appendChild(style);
    };
    if (document.head) install();
    else document.addEventListener("DOMContentLoaded", install, { once: true });
  });
}

async function waitForStableVisuals(
  page: import("@playwright/test").Page,
  routeName: string,
) {
  if (routeName === "home") {
    await page
      .getByText("More Services", { exact: true })
      .waitFor({ state: "visible" });
    await page.locator("[data-zivo-mobile-nav]").waitFor({ state: "visible" });
    const serviceTiles = page.locator(
      'section[aria-labelledby="home-services-heading"] .grid > button',
    );
    await serviceTiles.first().waitFor({ state: "visible" });
    // Framer Motion owns tile opacity in JavaScript, so CSS duration overrides
    // cannot settle the stagger by themselves. Wait until every mounted tile
    // has reached its final opacity before capturing the service row.
    await page.waitForFunction(() => {
      const tiles = Array.from(
        document.querySelectorAll<HTMLElement>(
          'section[aria-labelledby="home-services-heading"] .grid > button',
        ),
      );
      return (
        tiles.length > 0 &&
        tiles.every(
          (tile) => Number.parseFloat(getComputedStyle(tile).opacity) >= 0.999,
        )
      );
    });
    const serviceImages = page.locator(
      'section[aria-labelledby="home-services-heading"] img',
    );
    await serviceImages.first().waitFor({ state: "visible" });
    await serviceImages.evaluateAll(async (images) => {
      await Promise.all(
        images.map(async (node) => {
          const image = node as HTMLImageElement;
          if (!image.complete) {
            await new Promise<void>((resolve) => {
              image.addEventListener("load", () => resolve(), { once: true });
              image.addEventListener("error", () => resolve(), {
                once: true,
              });
            });
          }
          await image.decode().catch(() => undefined);
        }),
      );
    });
  } else if (routeName === "account") {
    await page
      .getByRole("button", { name: "Back to Zivo" })
      .waitFor({ state: "visible" });
  }

  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  });
}

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
        // A cold Vite transform can exceed the repository-wide 30s default on
        // a busy local/CI runner. This only raises the ceiling; named UI waits
        // below still make successful captures finish as soon as they settle.
        test.setTimeout(90_000);
        test.skip(
          skip || !!route.skipTop,
          "auth state missing or top check disabled",
        );
        await prepareStableVisualPage(page);
        await page.goto(route.path, { waitUntil: "domcontentloaded" });
        await waitForStableVisuals(page, route.name);
        await expect(page).toHaveScreenshot(
          safeAreaSnapshotName(vp.name, route.name, "top"),
          {
            animations: "disabled",
            caret: "hide",
            maxDiffPixelRatio: 0.001,
            timeout: 20_000,
            clip: {
              x: 0,
              y: 0,
              width: vp.viewport.width,
              height: TOP_CLIP_HEIGHT,
            },
          },
        );
      });

      test(`${route.name} — bottom region`, async ({ page }) => {
        test.setTimeout(90_000);
        test.skip(
          skip || !!route.skipBottom,
          "auth state missing or bottom check disabled",
        );
        await prepareStableVisualPage(page);
        await page.goto(route.path, { waitUntil: "domcontentloaded" });
        await waitForStableVisuals(page, route.name);
        const h = vp.viewport.height;
        await expect(page).toHaveScreenshot(
          safeAreaSnapshotName(vp.name, route.name, "bottom"),
          {
            animations: "disabled",
            caret: "hide",
            maxDiffPixelRatio: 0.001,
            timeout: 20_000,
            clip: {
              x: 0,
              y: h - BOTTOM_CLIP_HEIGHT,
              width: vp.viewport.width,
              height: BOTTOM_CLIP_HEIGHT,
            },
          },
        );
      });
    }
  });
}
