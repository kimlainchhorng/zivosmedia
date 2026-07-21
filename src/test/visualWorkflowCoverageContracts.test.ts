import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("visual workflow coverage contracts", () => {
  it("keeps critical app routes in the Playwright visual workflow suite", () => {
    const visual = source("tests/visual/workflow-visual-readiness.spec.ts");

    for (const route of [
      '{ area: "auth", path: "/login" }',
      '{ area: "feed", path: "/feed" }',
      '{ area: "grocery", path: "/grocery" }',
      '{ area: "business", path: "/business" }',
      '{ area: "support", path: "/support/new" }',
      '{ area: "security", path: "/security/report" }',
      '{ area: "shop-dashboard", path: "/shop-dashboard", needsAuth: true }',
      '{ area: "shop-orders", path: "/shop-dashboard/orders", needsAuth: true }',
      '{ area: "shop-staff", path: "/shop-dashboard/employees", needsAuth: true }',
      '{ area: "shop-wallet", path: "/shop-dashboard/wallet", needsAuth: true }',
      '{ area: "driver", path: "/driver/orders", needsAuth: true }',
      '{ area: "creator", path: "/creator-dashboard", needsAuth: true }',
      '{ area: "admin-security", path: "/admin/security", needsAuth: true }',
      '{ area: "admin-webhooks", path: "/admin/payments/webhook-status", needsAuth: true }',
      '{ area: "checkout", path: "/rent-car/checkout" }',
      '{ area: "legal", path: "/legal/privacy" }',
      '{ area: "settings", path: "/settings", needsAuth: true }',
    ]) {
      expect(visual).toContain(route);
    }

    expect(visual).toContain("CRITICAL_WORKFLOW_AREAS");
    expect(visual).toContain("expect(coveredAreas).toEqual([...CRITICAL_WORKFLOW_AREAS]);");
  });

  it("keeps mobile and desktop visual checks catching startup, clipping, and overflow issues", () => {
    const visual = source("tests/visual/workflow-visual-readiness.spec.ts");

    for (const needle of [
      'name: "mobile"',
      'devices["iPhone 13"].viewport',
      'name: "desktop"',
      "width: 1440, height: 1000",
      "assertNoStartupErrors",
      "App failed to start",
      "vite-error-overlay",
      "assertControlsStayInsideViewport",
      "hasHorizontalScrollAncestor",
      "insideHorizontalScroller",
      "textOverflow",
      "control.scrollWidth > control.clientWidth + 2",
      "expect(clippedControls).toEqual([]);",
      "await expect(page.locator(\"main, #root, [role='main']\").first()).toBeVisible();",
    ]) {
      expect(visual).toContain(needle);
    }
  });

  it("keeps auth-aware browser coverage, consent seeding, router wiring, and media readiness attached", () => {
    const visual = source("tests/visual/workflow-visual-readiness.spec.ts");
    const frontendContracts = source("scripts/qa/frontend-visual-contracts.mjs");
    const packageJson = source("package.json");
    const workflowPlan = source("scripts/qa/workflow-test-plan.mjs");
    const matrix = source("scripts/qa/platform-readiness-matrix.mjs");

    for (const needle of [
      "AUTH_STATE",
      "HAS_AUTH",
      "storageState: HAS_AUTH ? AUTH_STATE : undefined",
      'test.skip(route.needsAuth && !HAS_AUTH, "auth state missing for protected visual route")',
      "zivo_cookie_consent",
      "ROUTE_WIRING_TOKENS",
      "critical visual workflow routes stay wired in the app router",
      "SOCIAL_ROUTE_PATHS.feed",
      'expect(loginSource).toContain(\'loading="lazy"\');',
      'expect(loginSource).toContain(\'decoding="async"\');',
      'expect(packageJson).toContain(\'"perf:media-report"\');',
    ]) {
      expect(visual).toContain(needle);
    }

    expect(frontendContracts).toContain('id: "visual-workflow-route-coverage"');
    expect(frontendContracts).toContain("tests/visual/workflow-visual-readiness.spec.ts");
    expect(packageJson).toContain('"test:visual"');
    expect(workflowPlan).toContain("tests/visual/workflow-visual-readiness.spec.ts");
    expect(matrix).toContain("tests/visual/workflow-visual-readiness.spec.ts");
    expect(matrix).toContain("src/test/feedMobileVisualContracts.test.ts");
    expect(matrix).toContain("npx playwright test tests/e2e/mobile-layout-no-overlap.spec.ts");
    expect(matrix).toContain("compact mobile feed controls");
  });
});
