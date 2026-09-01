#!/usr/bin/env node
/**
 * Static, credential-free release contracts for the canonical ZIVO Ride
 * boundary. Live DNS, Supabase migration state, Edge Function deployment, and
 * secret presence remain production checks; this script prevents source and
 * workflow configuration from silently widening or bypassing that boundary.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
let checks = 0;

function source(relativePath) {
  const file = path.join(root, relativePath);
  if (!existsSync(file)) {
    failures.push(`missing file: ${relativePath}`);
    return "";
  }
  return readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function requireContains(id, text, value, relativePath) {
  checks += 1;
  if (!text.includes(value)) {
    failures.push(`${id}: ${relativePath} missing ${JSON.stringify(value)}`);
  }
}

function requireNotContains(id, text, value, relativePath) {
  checks += 1;
  if (text.includes(value)) {
    failures.push(
      `${id}: ${relativePath} must not contain ${JSON.stringify(value)}`,
    );
  }
}

function requireMissingFile(id, relativePath) {
  checks += 1;
  if (existsSync(path.join(root, relativePath))) {
    failures.push(
      `${id}: ${relativePath} must be retired; use CanonicalRidePage and the shared ZIVO Ride app instead`,
    );
  }
}

function requireOnlyAllowedFiles(id, relativeDir, allowedFiles) {
  checks += 1;
  const absoluteDir = path.join(root, relativeDir);
  if (!existsSync(absoluteDir)) {
    failures.push(`${id}: ${relativeDir} missing`);
    return;
  }
  const allowed = new Set(allowedFiles);
  const extras = readdirSync(absoluteDir)
    .filter((file) => /\.(ts|tsx)$/.test(file))
    .filter((file) => !/\.(test|spec)\.(ts|tsx)$/.test(file))
    .filter((file) => !allowed.has(file));
  if (extras.length > 0) {
    failures.push(
      `${id}: ${relativeDir} contains retired local customer Ride components: ${extras.join(", ")}`,
    );
  }
}

function requireMatch(id, text, pattern, relativePath) {
  checks += 1;
  if (!pattern.test(text)) {
    failures.push(`${id}: ${relativePath} must match ${pattern}`);
  }
}

function requireOrdered(id, text, values, relativePath) {
  checks += 1;
  let cursor = -1;

  for (const value of values) {
    const next = text.indexOf(value, cursor + 1);
    if (next === -1) {
      failures.push(
        `${id}: ${relativePath} must contain ${JSON.stringify(value)} after the preceding gate`,
      );
      return;
    }
    cursor = next;
  }
}

const headerPaths = [
  "cloudflare/worker.ts",
  "public/_worker.js",
  "public/_headers",
];

for (const relativePath of headerPaths) {
  const text = source(relativePath);
  requireContains(
    "ride-frame-src-exact",
    text,
    "frame-src 'self' https://ride.zivosmedia.com",
    relativePath,
  );
  requireNotContains(
    "ride-frame-src-no-wildcard",
    text,
    "https://*.zivosmedia.com",
    relativePath,
  );
  requireNotContains(
    "ride-frame-src-no-localhost",
    text,
    "http://localhost:*",
    relativePath,
  );
  requireNotContains(
    "ride-policy-no-localhost",
    text,
    "http://localhost:5177",
    relativePath,
  );
  requireNotContains(
    "ride-policy-no-loopback",
    text,
    "http://127.0.0.1:5177",
    relativePath,
  );
  requireMatch(
    "ride-geolocation-delegation",
    text,
    /geolocation=\(self (?:\\?"https:\/\/ride\.zivosmedia\.com\\?")\)/,
    relativePath,
  );
  requireMatch(
    "ride-payment-delegation",
    text,
    /payment=\(self (?:\\?"https:\/\/ride\.zivosmedia\.com\\?")\)/,
    relativePath,
  );
}

const ridePagePath = "src/pages/app/CanonicalRidePage.tsx";
const ridePage = source(ridePagePath);
requireContains(
  "iframe-permission-opt-in",
  ridePage,
  'allow="geolocation; payment"',
  ridePagePath,
);
requireContains(
  "iframe-referrer-policy",
  ridePage,
  'referrerPolicy="strict-origin-when-cross-origin"',
  ridePagePath,
);
requireContains(
  "iframe-runtime-url-gate",
  ridePage,
  "resolveRideAppBaseUrl",
  ridePagePath,
);
requireContains(
  "iframe-runtime-authorize-gate",
  ridePage,
  "getRideAuthorizeUrl",
  ridePagePath,
);
requireContains(
  "iframe-account-generation-gate",
  ridePage,
  "isRideManageAccountRequest",
  ridePagePath,
);
requireContains(
  "iframe-account-parent-route",
  ridePage,
  'navigate("/account/settings")',
  ridePagePath,
);
requireContains(
  "iframe-replaced-on-account-switch",
  ridePage,
  "key={rideUrl}",
  ridePagePath,
);

const appPath = "src/App.tsx";
const app = source(appPath);
requireMatch(
  "rides-hub-route-canonical-frame",
  app,
  /<Route\s+path="\/rides\/hub"\s+element=\{\s*<ProtectedRoute>\s*<PhoneRequiredGate>\s*<CambodiaOnlyGate>\s*<CanonicalRidePage\s*\/>\s*<\/CambodiaOnlyGate>\s*<\/PhoneRequiredGate>\s*<\/ProtectedRoute>\s*\}\s*\/>/,
  appPath,
);
requireNotContains(
  "rides-hub-no-local-page",
  app,
  'import("./pages/app/RideHubPage")',
  appPath,
);
requireMatch(
  "request-ride-route-canonical-frame",
  app,
  /<Route\s+path="\/app\/request-ride"\s+element=\{\s*<ProtectedRoute>\s*<CambodiaOnlyGate>\s*<CanonicalRidePage\s*\/>\s*<\/CambodiaOnlyGate>\s*<\/ProtectedRoute>\s*\}\s*\/>/,
  appPath,
);
requireNotContains(
  "request-ride-no-local-page",
  app,
  'import("./pages/app/RequestRidePage")',
  appPath,
);
requireMatch(
  "multi-stop-route-canonical-frame",
  app,
  /<Route\s+path="\/rides\/multi-stop"\s+element=\{\s*<ProtectedRoute>\s*<PhoneRequiredGate>\s*<CambodiaOnlyGate>\s*<CanonicalRidePage\s*\/>\s*<\/CambodiaOnlyGate>\s*<\/PhoneRequiredGate>\s*<\/ProtectedRoute>\s*\}\s*\/>/,
  appPath,
);
requireNotContains(
  "multi-stop-no-local-page",
  app,
  'import("./pages/MultiStopRideBuilder")',
  appPath,
);
requireMatch(
  "legacy-tracking-route-canonical-frame",
  app,
  /<Route\s+path="\/rides\/track\/:tripId"\s+element=\{\s*<ProtectedRoute>\s*<PhoneRequiredGate>\s*<CambodiaOnlyGate>\s*<CanonicalRidePage\s*\/>\s*<\/CambodiaOnlyGate>\s*<\/PhoneRequiredGate>\s*<\/ProtectedRoute>\s*\}\s*\/>/,
  appPath,
);
requireNotContains(
  "legacy-tracking-no-local-page",
  app,
  'import("./pages/app/RideTrackingPage")',
  appPath,
);
requireMatch(
  "legacy-quotes-route-canonical-frame",
  app,
  /<Route\s+path="\/ride-quotes"\s+element=\{\s*<ProtectedRoute>\s*<CanonicalRidePage\s*\/>\s*<\/ProtectedRoute>\s*\}\s*\/>/,
  appPath,
);
requireNotContains(
  "legacy-quotes-no-local-page",
  app,
  'import("./pages/RideQuotesPage")',
  appPath,
);

for (const relativePath of [
  "src/pages/app/RideHubPage.tsx",
  "src/pages/app/RequestRidePage.tsx",
  "src/pages/app/RideTrackingPage.tsx",
  "src/pages/MultiStopRideBuilder.tsx",
  "src/pages/RideQuotesPage.tsx",
  "src/hooks/useMultiLegQueue.ts",
]) {
  requireMissingFile(
    `retired-local-customer-ride:${relativePath}`,
    relativePath,
  );
}
requireOnlyAllowedFiles(
  "ride-components-no-local-customer-ui",
  "src/components/rides",
  [
    "DriverEnRouteTracker.tsx",
    "InTripCallButton.tsx",
    "TripChatFab.tsx",
    "TripChatSheet.tsx",
  ],
);

const routePrefetcherPath = "src/components/shared/RoutePrefetcher.tsx";
const routePrefetcher = source(routePrefetcherPath);
for (const required of [
  '"/rides": "@/pages/app/CanonicalRidePage"',
  '"/rides/hub": "@/pages/app/CanonicalRidePage"',
  '"/app/request-ride": "@/pages/app/CanonicalRidePage"',
  '"/rides/multi-stop": "@/pages/app/CanonicalRidePage"',
  '"/rides/track/:tripId": "@/pages/app/CanonicalRidePage"',
  '"/ride-quotes": "@/pages/app/CanonicalRidePage"',
  'if (path.startsWith("/rides/track/")) return "/rides/track/:tripId"',
]) {
  requireContains(
    `ride-prefetch:${required}`,
    routePrefetcher,
    required,
    routePrefetcherPath,
  );
}

const serviceWorkerPath = "src/sw.js";
const serviceWorker = source(serviceWorkerPath);
requireContains(
  "ride-sw-tracking-canonical-route",
  serviceWorker,
  "const rideTrackingUrl = rideTripId ? `/rides/track/${encodeURIComponent(String(rideTripId))}` : '/rides/hub'",
  serviceWorkerPath,
);
requireContains(
  "ride-sw-history-canonical-route",
  serviceWorker,
  "urlToOpen = '/rides/hub?ride_path=%2Fhistory'",
  serviceWorkerPath,
);
requireContains(
  "ride-sw-wallet-real-route",
  serviceWorker,
  "urlToOpen = '/wallet'",
  serviceWorkerPath,
);
requireContains(
  "ride-sw-rewards-real-route",
  serviceWorker,
  "urlToOpen = '/rewards'",
  serviceWorkerPath,
);
requireNotContains(
  "ride-sw-no-legacy-tracking-tab",
  serviceWorker,
  "/rides/hub?tab=tracking",
  serviceWorkerPath,
);
requireNotContains(
  "ride-sw-no-legacy-history-tab",
  serviceWorker,
  "/rides/hub?tab=history",
  serviceWorkerPath,
);
requireNotContains(
  "ride-sw-no-legacy-wallet-tab",
  serviceWorker,
  "/rides/hub?tab=wallet",
  serviceWorkerPath,
);
requireNotContains(
  "ride-sw-no-legacy-loyalty-tab",
  serviceWorker,
  "/rides/hub?tab=loyalty",
  serviceWorkerPath,
);

const servicesPagePath = "src/pages/app/ServicesPage.tsx";
const servicesPage = source(servicesPagePath);
requireContains(
  "ride-reserve-marked-coming-soon",
  servicesPage,
  'id: "ride-reserve"',
  servicesPagePath,
);
requireContains(
  "ride-reserve-no-fake-schedule",
  servicesPage,
  "comingSoon: true",
  servicesPagePath,
);
requireNotContains(
  "ride-services-no-dead-reserve-tab",
  servicesPage,
  "/rides/hub?tab=reserve",
  servicesPagePath,
);

const hotelResortDetailPath = "src/pages/lodging/HotelResortDetailPage.tsx";
const hotelResortDetail = source(hotelResortDetailPath);
requireContains(
  "ride-lodging-direct-booking-destination",
  hotelResortDetail,
  "/rides/hub?destination=",
  hotelResortDetailPath,
);
requireNotContains(
  "ride-lodging-no-legacy-book-tab",
  hotelResortDetail,
  "/rides/hub?tab=book",
  hotelResortDetailPath,
);

const zivoMapHelperPath = "src/lib/maps/openInZivoMap.ts";
const zivoMapHelper = source(zivoMapHelperPath);
requireContains(
  "ride-map-helper-direct-booking-destination",
  zivoMapHelper,
  'return `/rides/hub${search ? `?${search}` : ""}`;',
  zivoMapHelperPath,
);
requireNotContains(
  "ride-map-helper-no-legacy-book-tab",
  zivoMapHelper,
  "tab=book",
  zivoMapHelperPath,
);

const runtimeBoundaryPath = "src/lib/zivoRideProductionBoundary.ts";
const runtimeBoundary = source(runtimeBoundaryPath);
requireContains(
  "runtime-canonical-origin",
  runtimeBoundary,
  'ZIVO_RIDE_PRODUCTION_ORIGIN = "https://ride.zivosmedia.com"',
  runtimeBoundaryPath,
);
requireContains(
  "runtime-no-url-credentials",
  runtimeBoundary,
  "url.username || url.password",
  runtimeBoundaryPath,
);
requireContains(
  "runtime-no-ambient-state",
  runtimeBoundary,
  "url.search || url.hash",
  runtimeBoundaryPath,
);
requireContains(
  "runtime-exact-authority",
  runtimeBoundary,
  '"https://zivosmedia.com"',
  runtimeBoundaryPath,
);
requireContains(
  "runtime-exact-app-key",
  runtimeBoundary,
  'appKey !== "zivo_ride"',
  runtimeBoundaryPath,
);
requireContains(
  "runtime-pkce-s256",
  runtimeBoundary,
  'challengeMethod !== "S256"',
  runtimeBoundaryPath,
);
requireContains(
  "runtime-exact-callback",
  runtimeBoundary,
  'redirect.pathname !== "/auth/callback"',
  runtimeBoundaryPath,
);
requireNotContains(
  "runtime-no-subdomain-suffix-trust",
  runtimeBoundary,
  'endsWith(".zivosmedia.com")',
  runtimeBoundaryPath,
);

const preflightPath = "scripts/deploy/env-preflight.mjs";
const preflight = source(preflightPath);
for (const required of [
  "zivo-ride-app-url-missing",
  "zivo-ride-app-url-not-https",
  "zivo-ride-app-url-credentials",
  "zivo-ride-app-url-port",
  "zivo-ride-app-url-state",
  "zivo-ride-app-url-untrusted-host",
  "zivo-ride-app-url-not-canonical",
  'ZIVO_RIDE_PRODUCTION_URL = "https://ride.zivosmedia.com"',
  "value !== ZIVO_RIDE_PRODUCTION_URL",
]) {
  requireContains(`deploy-url:${required}`, preflight, required, preflightPath);
}
requireNotContains(
  "deploy-url-no-subdomain-suffix-trust",
  preflight,
  'hostname.endsWith(".zivosmedia.com")',
  preflightPath,
);

const wranglerPath = "wrangler.toml";
const wrangler = source(wranglerPath);
for (const forbidden of [
  'pattern = "zivodriver.com/*"',
  'pattern = "www.zivodriver.com/*"',
  'zone_name = "zivodriver.com"',
]) {
  requireNotContains(
    `zivodriver-dedicated-deploy:${forbidden}`,
    wrangler,
    forbidden,
    wranglerPath,
  );
}
for (const forbidden of [
  'pattern = "admin.zivosmedia.com/*"',
  'pattern = "zivoadmin.com/*"',
  'pattern = "www.zivoadmin.com/*"',
]) {
  requireNotContains(
    `zivo-admin-dedicated-deploy:${forbidden}`,
    wrangler,
    forbidden,
    wranglerPath,
  );
}
requireContains(
  "zivodriver-dedicated-deploy-note",
  wrangler,
  "`zivodriver.com` must be",
  wranglerPath,
);
requireContains(
  "zivodriver-dedicated-deploy-repo-note",
  wrangler,
  "dedicated Driver app/repo",
  wranglerPath,
);
const workerSourcePath = "cloudflare/worker.ts";
const workerSource = source(workerSourcePath);
const devVarsPath = "cloudflare/.dev.vars.example";
const devVars = source(devVarsPath);
for (const required of [
  "https://admin.zivosmedia.com",
  "https://zivoadmin.com",
  "https://www.zivoadmin.com",
]) {
  requireContains(
    `zivo-admin-allowed-origin-wrangler:${required}`,
    wrangler,
    required,
    wranglerPath,
  );
  requireContains(
    `zivo-admin-allowed-origin-worker:${required}`,
    workerSource,
    required,
    workerSourcePath,
  );
  requireContains(
    `zivo-admin-allowed-origin-dev-vars:${required}`,
    devVars,
    required,
    devVarsPath,
  );
}
requireContains(
  "zivo-admin-dedicated-deploy-note",
  wrangler,
  "`admin.zivosmedia.com` /",
  wranglerPath,
);

const migrationPath =
  "supabase/migrations/20260722192749_zivo_ride_sso_integration.sql";
const migration = source(migrationPath);
for (const required of [
  "'zivo_ride'",
  "'ride.zivosmedia.com'",
  "'configuration_pending'",
  "app_integrations_zivo_ride_enabled_secret_check",
  "enabled = true",
  "status = 'enabled'",
  "client_secret_hash is not null",
  "client_secret_hash ~ '^[0-9a-f]{64}$'",
]) {
  requireContains(
    `sso-migration:${required}`,
    migration,
    required,
    migrationPath,
  );
}
requireMatch(
  "sso-migration-seeds-disabled",
  migration,
  /'configuration_pending',\s*false,/,
  migrationPath,
);
requireMatch(
  "sso-migration-does-not-seed-secret",
  migration,
  /insert into public\.app_integrations\s*\(([^)]*)\)/s,
  migrationPath,
);
const insertColumns =
  migration.match(/insert into public\.app_integrations\s*\(([^)]*)\)/s)?.[1] ??
  "";
requireNotContains(
  "sso-migration-no-secret-column",
  insertColumns,
  "client_secret_hash",
  migrationPath,
);

const issuePath = "supabase/functions/zivosmedia-auth-issue-code/index.ts";
const issueFunction = source(issuePath);
const validatePath =
  "supabase/functions/zivosmedia-auth-validate-code/index.ts";
const validateFunction = source(validatePath);
const sharedAuthPath = "supabase/functions/_shared/zivosmediaAuth.ts";
const sharedAuth = source(sharedAuthPath);
for (const [relativePath, text] of [
  [issuePath, issueFunction],
  [validatePath, validateFunction],
]) {
  requireContains(
    "sso-enabled-boolean-gate",
    text,
    "app.enabled !== true",
    relativePath,
  );
  requireContains(
    "sso-enabled-status-gate",
    text,
    'app.status !== "enabled"',
    relativePath,
  );
}
requireContains(
  "sso-validates-client-secret",
  validateFunction,
  "verifyClientSecret",
  validatePath,
);
requireContains(
  "sso-consumes-code-atomically",
  validateFunction,
  '.is("used_at", null)',
  validatePath,
);
requireContains(
  "sso-rejects-consume-race",
  validateFunction,
  "!consumedCode",
  validatePath,
);
requireContains(
  "sso-secret-sha256",
  sharedAuth,
  "return sha256Hex(secret)",
  sharedAuthPath,
);
requireContains(
  "sso-secret-timing-safe",
  sharedAuth,
  "timingSafeEqual",
  sharedAuthPath,
);

const configPath = "supabase/config.toml";
const config = source(configPath);
requireMatch(
  "sso-issue-requires-jwt",
  config,
  /\[functions\.zivosmedia-auth-issue-code\]\s+verify_jwt = true/,
  configPath,
);
requireMatch(
  "sso-validate-uses-client-credentials",
  config,
  /\[functions\.zivosmedia-auth-validate-code\]\s+verify_jwt = false/,
  configPath,
);

const productionWorkflowPath = ".github/workflows/deploy-production.yml";
const productionWorkflow = source(productionWorkflowPath);
const cloudflareWorkflowPath =
  ".github/workflows/deploy-cloudflare-production.yml";
const cloudflareWorkflow = source(cloudflareWorkflowPath);
for (const [relativePath, text] of [
  [productionWorkflowPath, productionWorkflow],
  [cloudflareWorkflowPath, cloudflareWorkflow],
]) {
  requireContains(
    "workflow-ride-secret",
    text,
    "secrets.VITE_ZIVO_RIDE_APP_URL",
    relativePath,
  );
  requireContains(
    "workflow-boundary-contract",
    text,
    "npm run qa:zivo-ride-production-boundary",
    relativePath,
  );
  requireContains(
    "workflow-strict-production-preflight",
    text,
    "npm run deploy:preflight:strict -- --skip-build --skip-type-check",
    relativePath,
  );
  requireContains(
    "workflow-production-release-gate",
    text,
    "npm run release:production-gate",
    relativePath,
  );
  requireNotContains(
    "workflow-no-soft-fail",
    text,
    "continue-on-error: true",
    relativePath,
  );
  requireOrdered(
    "workflow-production-gate-order",
    text,
    [
      "npm run qa:zivo-ride-production-boundary",
      "npm run deploy:preflight:strict -- --skip-build --skip-type-check",
      "npm run release:production-gate",
    ],
    relativePath,
  );
}

for (const secret of [
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_PROJECT_ID",
  "VITE_ZIVO_RIDE_APP_URL",
  "VITE_ZIVO_SOFTWARE_SUPABASE_URL",
  "VITE_ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY",
  "ZIVO_DRIVER_SUPABASE_PUBLISHABLE_KEY",
  "ZIVO_TRAVEL_SUPABASE_PUBLISHABLE_KEY",
  "ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY",
]) {
  requireContains(
    `cloudflare-required-secret:${secret}`,
    cloudflareWorkflow,
    `secrets.${secret}`,
    cloudflareWorkflowPath,
  );
}
requireContains(
  "cloudflare-exact-ride-url",
  cloudflareWorkflow,
  '"$VITE_ZIVO_RIDE_APP_URL" != "https://ride.zivosmedia.com"',
  cloudflareWorkflowPath,
);
requireContains(
  "cloudflare-preflight-artifact",
  cloudflareWorkflow,
  "docs/production-preflight-summary.json",
  cloudflareWorkflowPath,
);
requireContains(
  "cloudflare-preflight-summary",
  cloudflareWorkflow,
  "scripts/deploy/render-preflight-step-summary.mjs",
  cloudflareWorkflowPath,
);
requireOrdered(
  "cloudflare-deploy-after-production-gates",
  cloudflareWorkflow,
  [
    "npm run qa:zivo-ride-production-boundary",
    "npm run deploy:preflight:strict -- --skip-build --skip-type-check",
    "npm run release:production-gate",
    "npm run build",
    "npx wrangler deploy --keep-vars",
  ],
  cloudflareWorkflowPath,
);
requireNotContains(
  "cloudflare-workflow-no-local-deploy-wrapper",
  cloudflareWorkflow,
  "run: npm run cloudflare:deploy",
  cloudflareWorkflowPath,
);

const packagePath = "package.json";
const packageJson = source(packagePath);
requireContains(
  "package-boundary-command",
  packageJson,
  '"qa:zivo-ride-production-boundary"',
  packagePath,
);
requireContains(
  "package-update-gate",
  packageJson,
  "npm run qa:zivo-ride-production-boundary",
  packagePath,
);
const packageScripts = JSON.parse(packageJson).scripts ?? {};
requireContains(
  "package-cloudflare-publish-command",
  packageScripts["cloudflare:deploy"] ?? "",
  "wrangler deploy --keep-vars",
  packagePath,
);
requireOrdered(
  "package-cloudflare-production-gate-order",
  packageScripts["cloudflare:deploy"] ?? "",
  [
    "npm run qa:zivo-ride-production-boundary",
    "npm run deploy:preflight:strict -- --skip-build --skip-type-check",
    "npm run release:production-gate",
    "npm run build",
    "npx wrangler deploy --keep-vars",
  ],
  packagePath,
);

const deployInventoryPath = "scripts/qa/edge-function-deploy-contracts.mjs";
const deployInventory = source(deployInventoryPath);
requireContains(
  "deploy-inventory-issue-code",
  deployInventory,
  'slug: "zivosmedia-auth-issue-code"',
  deployInventoryPath,
);
requireContains(
  "deploy-inventory-validate-code",
  deployInventory,
  'slug: "zivosmedia-auth-validate-code"',
  deployInventoryPath,
);

const runbookPath = "docs/zivo-sso-provisioning-runbook.md";
const runbook = source(runbookPath);
requireContains(
  "runbook-ride-secret",
  runbook,
  "ZIVO_RIDE_AUTH_CLIENT_SECRET",
  runbookPath,
);
requireContains(
  "runbook-hash-only",
  runbook,
  "encode(digest('<same-fresh-random-secret>', 'sha256'), 'hex')",
  runbookPath,
);
requireContains(
  "runbook-ride-enable",
  runbook,
  "where app_key = 'zivo_ride'",
  runbookPath,
);

const report = {
  generated: new Date().toISOString(),
  counts: {
    checks,
    failures: failures.length,
  },
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exit(1);
