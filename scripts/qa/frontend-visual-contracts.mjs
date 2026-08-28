#!/usr/bin/env node
/**
 * Frontend graphics, visual readiness, and speed contract check.
 *
 * Verifies visual workflow coverage, safe-area guardrails, media loading,
 * loading/error states, and platform audit wiring.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function source(relativePath) {
  const file = path.join(root, relativePath);
  if (!existsSync(file)) {
    failures.push(`missing file: ${relativePath}`);
    return "";
  }
  // Normalize CRLF -> LF so multiline assertions are line-ending agnostic
  // (Windows/OneDrive checkouts with core.autocrlf=true yield CRLF files).
  return readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function requireContains(id, text, needle, relativePath) {
  if (!text.includes(needle)) {
    failures.push(`${id}: ${relativePath} missing ${JSON.stringify(needle)}`);
  }
}

const contracts = [
  {
    id: "visual-workflow-route-coverage",
    category: "visual",
    check() {
      const visualPath = "tests/visual/workflow-visual-readiness.spec.ts";
      const visual = source(visualPath);

      for (const route of [
        '{ area: "auth", path: "/login" }',
        '{ area: "feed", path: "/feed" }',
        '{ area: "grocery", path: "/grocery" }',
        '{ area: "business", path: "/business" }',
        '{ area: "support", path: "/support/new" }',
        '{ area: "security", path: "/security/report" }',
        '{ area: "chat", path: "/chat", needsAuth: true }',
        '{ area: "shop-dashboard", path: "/shop-dashboard", needsAuth: true }',
        '{ area: "shop-orders", path: "/shop-dashboard/orders", needsAuth: true }',
        '{ area: "shop-staff", path: "/shop-dashboard/employees", needsAuth: true }',
        '{ area: "shop-wallet", path: "/shop-dashboard/wallet", needsAuth: true }',
        '{ area: "driver", path: "/driver/orders", needsAuth: true }',
        '{ area: "admin-security", path: "/admin/security", needsAuth: true }',
        '{ area: "admin-webhooks", path: "/admin/payments/webhook-status", needsAuth: true }',
        '{ area: "checkout", path: "/rent-car/checkout" }',
        '{ area: "legal", path: "/legal/privacy" }',
        '{ area: "settings", path: "/settings", needsAuth: true }',
      ]) {
        requireContains(this.id, visual, route, visualPath);
      }
      for (const needle of [
        "assertNoStartupErrors",
        "assertControlsStayInsideViewport",
        "CRITICAL_WORKFLOW_AREAS",
        "ROUTE_WIRING_TOKENS",
        "hasHorizontalScrollAncestor",
        "critical visual workflow routes stay wired in the app router",
        "textOverflow",
        "workflow visual readiness",
        "mobile",
        "desktop",
      ]) {
        requireContains(this.id, visual, needle, visualPath);
      }
    },
  },
  {
    id: "media-loading-performance",
    category: "media",
    check() {
      const smartImagePath = "src/components/shared/SmartImage.tsx";
      const lazyVideoPath = "src/components/shared/LazyVideo.tsx";
      const mediaReportPath = "scripts/performance/media-readiness-check.mjs";
      const serviceWorkerPath = "src/sw.js";
      const smartImage = source(smartImagePath);
      const lazyVideo = source(lazyVideoPath);
      const mediaReport = source(mediaReportPath);
      const serviceWorker = source(serviceWorkerPath);

      for (const needle of [
        'loading={eager ? "eager" : "lazy"}',
        'decoding="async"',
        "fetchPriority",
        "animate-pulse",
        "onError={() => setErrored(true)}",
      ]) {
        requireContains(this.id, smartImage, needle, smartImagePath);
      }
      for (const needle of [
        'preload = "metadata"',
        "IntersectionObserver",
        "pauseWhenOffscreen",
        "playsInline",
      ]) {
        requireContains(this.id, lazyVideo, needle, lazyVideoPath);
      }
      for (const needle of ["img missing loading", "img missing decoding", "video missing preload policy/LazyVideo"]) {
        requireContains(this.id, mediaReport, needle, mediaReportPath);
      }
      requireContains(this.id, serviceWorker, "supabase-storage-cache", serviceWorkerPath);
      requireContains(this.id, serviceWorker, "StaleWhileRevalidate", serviceWorkerPath);
    },
  },
  {
    id: "safe-area-mobile-layout",
    category: "mobile",
    check() {
      const safeAreaPath = "scripts/qa/safe-area-check.mjs";
      const safeAreaSpecPath = "tests/e2e/safe-area.spec.ts";
      const noOverlapPath = "tests/e2e/mobile-layout-no-overlap.spec.ts";
      const cssPath = "src/index.css";
      const safeArea = source(safeAreaPath);
      const safeAreaSpec = source(safeAreaSpecPath);
      const noOverlap = source(noOverlapPath);
      const css = source(cssPath);

      for (const needle of [
        "iPhone 15 Pro (notch)",
        "iOS Dynamic Island (broken inset=0)",
        "--zivo-safe-top-overlay",
        "--zivo-safe-top-sheet",
        "--zivo-safe-top-sticky",
        "brokenIslandFloor",
      ]) {
        requireContains(this.id, safeArea, needle, safeAreaPath);
      }
      for (const needle of ["--zivo-safe-top", "feed-sticky-header", 'aria-label="Reel feed mode"']) {
        requireContains(this.id, safeAreaSpec, needle, safeAreaSpecPath);
      }
      for (const needle of [
        "mobile layout no-overlap contracts",
        "assertNoMobileLayoutBreaks",
        "MOBILE_ROUTES",
        "compact",
        "standard",
        "feed keeps category controls fully visible at compact mobile width",
        "/feed",
        "/login",
        "/legal/privacy",
        "safe-area-bottom",
        "data-zivo-mobile-nav",
      ]) {
        requireContains(this.id, noOverlap, needle, noOverlapPath);
      }
      for (const needle of ["safe-area-top", "pt-safe", "pb-safe"]) {
        requireContains(this.id, css, needle, cssPath);
      }
    },
  },
  {
    id: "safe-area-visual-baselines",
    category: "visual",
    check() {
      const safeAreaVisualPath = "tests/visual/safe-area.spec.ts";
      const safeAreaVisual = source(safeAreaVisualPath);
      const baselineDir = "tests/visual/__screenshots__/safe-area.spec.ts";

      for (const needle of [
        "seedConsent",
        "zivo_cookie_consent",
        "TOP_CLIP_HEIGHT",
        "BOTTOM_CLIP_HEIGHT",
        "toMatchSnapshot",
        "iphone-14-pro-max",
        "iphone-13",
        "iphone-se",
      ]) {
        requireContains(this.id, safeAreaVisual, needle, safeAreaVisualPath);
      }

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
        const relativePath = path.join(baselineDir, fileName);
        if (!existsSync(path.join(root, relativePath))) {
          failures.push(`${this.id}: missing visual baseline ${relativePath}`);
        }
      }
    },
  },
  {
    id: "loading-error-empty-states",
    category: "states",
    check() {
      const loadingTestPath = "src/test/loadingErrorStates.test.tsx";
      const globalBoundaryPath = "src/components/shared/ErrorBoundary.tsx";
      const routeBoundaryPath = "src/components/shared/RouteErrorBoundary.tsx";
      const groceryPath = "src/pages/GroceryStorePage.tsx";
      const channelPath = "src/pages/channels/ChannelsDirectoryPage.tsx";
      const loadingTest = source(loadingTestPath);
      const globalBoundary = source(globalBoundaryPath);
      const routeBoundary = source(routeBoundaryPath);
      const grocery = source(groceryPath);
      const channel = source(channelPath);

      for (const needle of [
        "Something went wrong",
        "Support code:",
        "Try Again",
        "Go Home",
        "reportBoundaryError",
      ]) {
        requireContains(this.id, globalBoundary, needle, globalBoundaryPath);
      }
      for (const needle of ["Page Error", "Go Back", "Home", "reportBoundaryError"]) {
        requireContains(this.id, routeBoundary, needle, routeBoundaryPath);
      }
      for (const needle of ["Loading skeletons", "!isLoading && error", "!isLoading && !error && products.length === 0"]) {
        requireContains(this.id, grocery, needle, groceryPath);
      }
      for (const needle of ["loading ? (", "Couldn't update", "channels.length === 0"]) {
        requireContains(this.id, channel, needle, channelPath);
      }
      for (const needle of ["global crash fallback", "route crash fallback", "loading, error, and empty states"]) {
        requireContains(this.id, loadingTest, needle, loadingTestPath);
      }
    },
  },
  {
    id: "platform-visual-gate-wiring",
    category: "wiring",
    check() {
      const packagePath = "package.json";
      const matrixPath = "scripts/qa/platform-readiness-matrix.mjs";
      const coveragePath = "scripts/qa/workflow-coverage.mjs";
      const planPath = "scripts/qa/workflow-test-plan.mjs";
      const packageJson = source(packagePath);
      const matrix = source(matrixPath);
      const coverage = source(coveragePath);
      const plan = source(planPath);

      for (const scriptName of ["qa:frontend-visual-contracts", "test:visual", "qa:safe-area:all", "perf:media-report"]) {
        requireContains(this.id, packageJson, `"${scriptName}"`, packagePath);
      }
      requireContains(this.id, packageJson, "npm run qa:frontend-visual-contracts", packagePath);
      requireContains(this.id, matrix, "qa:frontend-visual-contracts", matrixPath);
      requireContains(this.id, matrix, "src/test/feedMobileVisualContracts.test.ts", matrixPath);
      requireContains(this.id, matrix, "npx playwright test tests/e2e/mobile-layout-no-overlap.spec.ts", matrixPath);
      requireContains(this.id, matrix, "compact mobile feed controls", matrixPath);
      requireContains(this.id, coverage, "qa:frontend-visual-contracts", coveragePath);
      requireContains(this.id, plan, "tests/visual/workflow-visual-readiness.spec.ts", planPath);
      requireContains(this.id, matrix, "tests/visual/workflow-visual-readiness.spec.ts", matrixPath);
      requireContains(this.id, matrix, "tests/e2e/mobile-layout-no-overlap.spec.ts", matrixPath);
      requireContains(this.id, matrix, "src/test/loadingErrorStates.test.tsx", matrixPath);
    },
  },
];

for (const contract of contracts) contract.check();

console.log(JSON.stringify({
  generated: new Date().toISOString(),
  counts: {
    contracts: contracts.length,
    failures: failures.length,
  },
  contracts: contracts.map(({ id, category }) => ({ id, category })),
  failures,
}, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
