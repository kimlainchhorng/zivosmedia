import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

const MOBILE_ROUTES = [
  { name: "login", path: "/login" },
  { name: "feed", path: "/feed" },
  { name: "legal privacy", path: "/legal/privacy" },
] as const;

async function seedConsent(page: Page) {
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
      // Storage can be unavailable in hardened browser contexts.
    }
  });
}

async function assertNoMobileLayoutBreaks(page: Page) {
  const issues = await page
    .locator("button, a, input, select, textarea, [role='button'], [role='tab']")
    .evaluateAll((nodes) => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      return nodes
        .filter((node) => {
          const element = node as HTMLElement;
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          const centerY = rect.top + rect.height / 2;
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            style.opacity !== "0" &&
            rect.width > 0 &&
            rect.height > 0 &&
            rect.right > 0 &&
            rect.left < viewportWidth &&
            centerY > 0 &&
            centerY < viewportHeight
          );
        })
        .map((node) => {
          const element = node as HTMLElement;
          const rect = element.getBoundingClientRect();
          const text = element.textContent?.replace(/\s+/g, " ").trim() || "";
          const role = element.getAttribute("role") || element.tagName.toLowerCase();
          const label =
            element.getAttribute("aria-label") ||
            element.getAttribute("name") ||
            text.slice(0, 64) ||
            role;
          const isInlineTextLink = element.tagName.toLowerCase() === "a" && rect.height < 32 && text.length > 24;
          const isSmallIconButton = text.length === 0 || Boolean(element.querySelector("svg,img"));
          const minTapTarget = isInlineTextLink ? 0 : isSmallIconButton ? 36 : 40;
          const textOverflow =
            text.length > 0 &&
            !isInlineTextLink &&
            (element.scrollWidth > element.clientWidth + 2 || element.scrollHeight > element.clientHeight + 2);

          return {
            label,
            role,
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            top: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            clipped: rect.left < -2 || rect.right > viewportWidth + 2,
            tooSmall: minTapTarget > 0 && (rect.width < minTapTarget || rect.height < minTapTarget),
            textOverflow,
          };
        })
        .filter((issue) => issue.clipped || issue.tooSmall || issue.textOverflow);
    });

  expect(issues).toEqual([]);
}

test.describe("mobile layout no-overlap contracts", () => {
  const mobileViewports = [
    { label: "compact", viewport: { width: 375, height: 814 } },
    { label: "standard", viewport: { width: 393, height: 852 } },
  ] as const;

  for (const { label, viewport } of mobileViewports) {
    test.describe(label, () => {
      test.use({ viewport, isMobile: true });

      for (const route of MOBILE_ROUTES) {
        test(`${route.name} keeps visible controls inside the mobile viewport`, async ({ page }) => {
          await seedConsent(page);
          await page.goto(route.path, { waitUntil: "domcontentloaded" });
          await page.locator("body").waitFor({ state: "visible" });
          await page.waitForTimeout(300);

          await expect(page.locator("body")).not.toContainText(/App failed to start|Unhandled Runtime Error/i);
          await expect(page.locator("vite-error-overlay")).toHaveCount(0);
          await assertNoMobileLayoutBreaks(page);
        });
      }
    });
  }

  test("feed keeps category controls fully visible at compact mobile width", async ({ page }) => {
    test.setTimeout(30_000);
    await page.setViewportSize({ width: 375, height: 814 });
    await seedConsent(page);
    await page.goto("/feed", { waitUntil: "domcontentloaded" });
    await page.locator("body").waitFor({ state: "visible" });
    await page.waitForTimeout(300);

    const issues = await page
      .locator('[data-testid="feed-sticky-header"] [role="tab"], [data-testid="feed-sticky-header"] button')
      .evaluateAll((nodes) => {
        const viewportWidth = window.innerWidth;
        return nodes
          .map((node) => {
            const element = node as HTMLElement;
            const rect = element.getBoundingClientRect();
            const text = element.textContent?.replace(/\s+/g, " ").trim() || element.getAttribute("aria-label") || "";
            return {
              text,
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              clipped: rect.left < -2 || rect.right > viewportWidth + 2,
              tooShort: rect.height < 40,
              textOverflow: element.scrollWidth > element.clientWidth + 2 || element.scrollHeight > element.clientHeight + 2,
            };
          })
          .filter((issue) => issue.clipped || issue.tooShort || issue.textOverflow);
      });

    expect(issues).toEqual([]);
  });

  test("feed and mobile shell keep safe-area and fixed navigation anchors", async () => {
    const css = read("src/index.css");
    const feedPage = read("src/pages/ReelsFeedPage.tsx");
    const socialFeedPage = read("src/pages/SocialFeedPage.tsx");
    const mobileNav = read("src/components/app/ZivoMobileNav.tsx");
    const visualContracts = read("scripts/qa/frontend-visual-contracts.mjs");

    for (const token of [
      "--zivo-safe-top",
      "--zivo-safe-top-overlay",
      "--zivo-safe-top-sticky",
      "safe-area-bottom",
      "pb-safe",
    ]) {
      expect(css).toContain(token);
    }

    expect(feedPage + socialFeedPage).toContain('data-testid="feed-sticky-header"');
    expect(feedPage + socialFeedPage).toContain("zivo-pt-safe-sticky");
    expect(feedPage).toContain("min-h-10 w-full px-2 py-2 rounded-full");
    expect(mobileNav).toContain("pb-safe");
    expect(mobileNav).toContain("data-zivo-mobile-nav");
    expect(visualContracts).toContain("mobile-layout-no-overlap");
  });
});
