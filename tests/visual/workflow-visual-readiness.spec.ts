import { expect, test, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_STATE = path.join(__dirname, ".auth", "state.json");
const HAS_AUTH = fs.existsSync(AUTH_STATE);

const VIEWPORTS = [
  { name: "mobile", viewport: devices["iPhone 13"].viewport, userAgent: devices["iPhone 13"].userAgent },
  { name: "desktop", viewport: { width: 1440, height: 1000 }, userAgent: devices["Desktop Chrome"].userAgent },
];

const ROUTES = [
  { area: "auth", path: "/login" },
  { area: "feed", path: "/feed" },
  { area: "grocery", path: "/grocery" },
  { area: "business", path: "/business" },
  { area: "support", path: "/support/new" },
  { area: "security", path: "/security/report" },
  { area: "shop-dashboard", path: "/shop-dashboard", needsAuth: true },
  { area: "shop-orders", path: "/shop-dashboard/orders", needsAuth: true },
  { area: "shop-staff", path: "/shop-dashboard/employees", needsAuth: true },
  { area: "shop-wallet", path: "/shop-dashboard/wallet", needsAuth: true },
  { area: "driver", path: "/driver/orders", needsAuth: true },
  { area: "creator", path: "/creator-dashboard", needsAuth: true },
  { area: "admin-security", path: "/admin/security", needsAuth: true },
  { area: "admin-webhooks", path: "/admin/payments/webhook-status", needsAuth: true },
  { area: "checkout", path: "/rent-car/checkout" },
  { area: "legal", path: "/legal/privacy" },
  { area: "settings", path: "/settings", needsAuth: true },
] as const;

const CRITICAL_WORKFLOW_AREAS = [
  "auth",
  "feed",
  "grocery",
  "business",
  "support",
  "security",
  "shop-dashboard",
  "shop-orders",
  "shop-staff",
  "shop-wallet",
  "driver",
  "creator",
  "admin-security",
  "admin-webhooks",
  "checkout",
  "legal",
  "settings",
] as const;

const ROUTE_WIRING_TOKENS: Partial<Record<(typeof ROUTES)[number]["path"], string>> = {
  "/feed": "SOCIAL_ROUTE_PATHS.feed",
};

async function assertNoStartupErrors(page: import("@playwright/test").Page) {
  await expect(page.locator("body")).not.toContainText(/App failed to start|ReferenceError|TypeError|Unhandled Runtime Error/i);
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);
}

async function assertControlsStayInsideViewport(page: import("@playwright/test").Page) {
  const clippedControls = await page.locator("button, a, input, select, textarea").evaluateAll((controls) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const hasHorizontalScrollAncestor = (element: Element) => {
      let parent = element.parentElement;
      while (parent && parent !== document.body) {
        const style = window.getComputedStyle(parent);
        const canScrollX = /(auto|scroll)/.test(style.overflowX) && parent.scrollWidth > parent.clientWidth + 2;
        if (canScrollX) return true;
        parent = parent.parentElement;
      }
      return false;
    };

    return controls
      .filter((control) => {
        const style = window.getComputedStyle(control);
        const rect = control.getBoundingClientRect();
        return (
          control.getAttribute("aria-hidden") !== "true" &&
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          rect.width > 1 &&
          rect.height > 1 &&
          rect.bottom > 0 &&
          rect.right > 0 &&
          rect.top < viewportHeight &&
          rect.left < viewportWidth
        );
      })
      .map((control) => {
        const rect = control.getBoundingClientRect();
          return {
          label:
            control.getAttribute("aria-label") ||
            control.getAttribute("name") ||
            control.textContent?.trim().slice(0, 64) ||
            control.tagName.toLowerCase(),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            top: Math.round(rect.top),
            insideHorizontalScroller: hasHorizontalScrollAncestor(control),
            textOverflow: control.scrollWidth > control.clientWidth + 2 || control.scrollHeight > control.clientHeight + 2,
          };
        })
      .filter(
        (control) =>
          ((control.left < -2 || control.right > viewportWidth + 2) && !control.insideHorizontalScroller) ||
          control.top < -2 ||
          control.textOverflow,
      );
  });

  expect(clippedControls).toEqual([]);
}

for (const viewport of VIEWPORTS) {
  test.describe(`workflow visual readiness · ${viewport.name}`, () => {
    test.use({
      viewport: viewport.viewport,
      userAgent: viewport.userAgent,
      storageState: HAS_AUTH ? AUTH_STATE : undefined,
    });

    for (const route of ROUTES) {
      test(`${route.area} renders without clipped controls`, async ({ page }) => {
        test.skip(route.needsAuth && !HAS_AUTH, "auth state missing for protected visual route");

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
          } catch {
            // Storage may be unavailable in hardened browser contexts.
          }
        });

        await page.goto(route.path, { waitUntil: "domcontentloaded" });
        await page.locator("body").waitFor({ state: "visible" });
        await page.waitForTimeout(500);

        await assertNoStartupErrors(page);
        await expect(page.locator("main, #root, [role='main']").first()).toBeVisible();
        await assertControlsStayInsideViewport(page);
      });
    }
  });
}

test("visual workflow covers required areas and media readiness checks", async () => {
  const coveredAreas = ROUTES.map((route) => route.area);
  expect(coveredAreas).toEqual([...CRITICAL_WORKFLOW_AREAS]);

  const loginSource = fs.readFileSync(path.join(__dirname, "../../src/pages/Login.tsx"), "utf8");
  expect(loginSource).toContain('loading="lazy"');
  expect(loginSource).toContain('decoding="async"');

  const packageJson = fs.readFileSync(path.join(__dirname, "../../package.json"), "utf8");
  expect(packageJson).toContain('"perf:media-report"');
});

test("critical visual workflow routes stay wired in the app router", async () => {
  const appSource = fs.readFileSync(path.join(__dirname, "../../src/App.tsx"), "utf8");

  for (const route of ROUTES) {
    expect(appSource).toContain(ROUTE_WIRING_TOKENS[route.path] ?? `path="${route.path}"`);
  }
});
