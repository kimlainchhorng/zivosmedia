#!/usr/bin/env node
/**
 * Generate workflow-level coverage for the broad product surface.
 *
 * The platform matrix answers "what release lanes exist?" This report answers
 * "which actual workflows have frontend, backend, database, tests, and docs?"
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const jsonPath = path.join(docsDir, "workflow-coverage.json");
const markdownPath = path.join(docsDir, "workflow-coverage.md");

function walk(dir, predicate = () => true) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name);
    const stat = statSync(file);
    if (stat.isDirectory()) files.push(...walk(file, predicate));
    else if (predicate(file)) files.push(file);
  }
  return files;
}

function rel(file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

function readText(file) {
  // Normalize CRLF -> LF so multiline assertions are line-ending agnostic
  // (Windows/OneDrive checkouts with core.autocrlf=true yield CRLF files).
  return readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function readJson(file) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readText(file));
  } catch {
    return null;
  }
}

function matches(file, patterns) {
  const relative = rel(file);
  const text = readText(file);
  return patterns.some((pattern) => pattern.test(relative) || pattern.test(text));
}

function evidence(files, patterns, limit = 8) {
  const matched = files.filter((file) => matches(file, patterns));
  return {
    count: matched.length,
    samples: matched.slice(0, limit).map(rel),
  };
}

function statusFor(item) {
  if (item.frontend.count === 0 && item.backend.count === 0 && item.database.count === 0) return "missing";
  if (item.tests.count === 0) return "needs-tests";
  if (item.backend.count === 0 && item.database.count === 0) return "needs-backend";
  if (item.frontend.count === 0) return "needs-frontend";
  if (item.testCoverageRatio < 0.02) return "needs-targeted-tests";
  return "covered";
}

const frontendFiles = [
  ...walk(path.join(root, "src", "pages"), (file) => /\.(tsx?|jsx?)$/.test(file)),
  ...walk(path.join(root, "src", "components"), (file) => /\.(tsx?|jsx?)$/.test(file)),
  ...walk(path.join(root, "src", "hooks"), (file) => /\.(tsx?|jsx?)$/.test(file)),
];
const backendFiles = [
  ...walk(path.join(root, "supabase", "functions"), (file) => /\.(tsx?)$/.test(file)),
  ...walk(path.join(root, "src", "services"), (file) => /\.(tsx?)$/.test(file)),
  ...walk(path.join(root, "src", "lib"), (file) => /\.(tsx?)$/.test(file)),
];
const databaseFiles = walk(path.join(root, "supabase", "migrations"), (file) => file.endsWith(".sql"));
const testFiles = [
  ...walk(path.join(root, "src", "test"), (file) => /\.(tsx?|jsx?)$/.test(file)),
  ...walk(path.join(root, "tests"), (file) => /\.(tsx?|jsx?)$/.test(file)),
];
const docsFiles = walk(path.join(root, "docs"), (file) => /\.(md|json)$/.test(file));

const workflows = [
  {
    id: "sso-auth-sessions",
    label: "SSO, Auth, Sessions, Devices",
    patterns: [/sso|oauth|auth|login|signup|session|otp|two.?step|device|signInWithOAuth|Apple|Google/i],
    next: "Keep `npm run qa:sso-auth-contracts` green for OAuth, passwordless OTP, MFA, trusted devices, active sessions, and role-aware route gates.",
  },
  {
    id: "customer-booking-order",
    label: "Customer Booking, Order, Trip",
    patterns: [/customer|booking|reservation|checkout|order|trip|ride|flight|hotel|lodging|delivery|grocery/i],
    next: "Keep `npm run qa:customer-booking-contracts` green for grocery checkout, order scoping, lodging add-ons, and shopping-order RLS.",
  },
  {
    id: "shop-owner-admin",
    label: "Shop Owner Setup and Operations",
    patterns: [/shop|store|owner|merchant|dashboard|catalog|product|service|inventory|schedule|staff/i],
    next: "Keep `npm run qa:shop-owner-contracts` green for owner setup, dashboard routes, scoped store operations, and RLS/grants.",
  },
  {
    id: "client-staff-workflows",
    label: "Client, Staff, Employee Workflows",
    patterns: [/client|staff|employee|invite|timesheet|payroll|schedule|stylist|barista|technician/i],
    next: "Keep `npm run qa:client-staff-contracts` green for invite acceptance, owner-only staff invites, schedule reads, payroll/rules, training, and client scoping.",
  },
  {
    id: "payments-refunds",
    label: "Payments, Refunds, Webhooks",
    patterns: [/stripe|payment|checkout|refund|webhook|deposit|tip|wallet|ledger|bakong|khqr|aba/i],
    next: "Keep `npm run qa:payments-refunds-contracts` green for provider webhooks, idempotent refunds, subscription portals, refund-state UI, and audit ledgers.",
  },
  {
    id: "payouts-earnings",
    label: "Payouts, Earnings, Balances",
    patterns: [/payout|earning|balance|connect|stripe_account|ledger|wallet|driver_payout|tip/i],
    next: "Keep `npm run qa:payouts-earnings-contracts` green for payout auth, server-gated payout methods, idempotent retries, and auditable ledgers.",
  },
  {
    id: "email-marketing-consent",
    label: "Email Marketing, Consent, Suppression",
    patterns: [/email|marketing|campaign|automation|unsubscribe|suppression|consent|digest|template/i],
    next: "Keep `npm run qa:email-marketing-contracts` green for transactional-vs-marketing separation, suppression, consent, and campaign event logging.",
  },
  {
    id: "ads-monetization-tracking",
    label: "Ads, Monetization, Conversion Tracking",
    patterns: [/ads?|ad_campaign|store_ad_campaign|boost|monetization|creator|subscription|affiliate|conversion|gclid|capi|roas|attribution|utm|tiktok|meta|google ads/i],
    next: "Keep `npm run qa:ads-monetization-contracts` green for attribution, conversion uploads, Ads Studio ROAS, creator monetization, and provider roadmap coverage.",
  },
  {
    id: "push-notifications",
    label: "Push Notifications and Notification Center",
    patterns: [/push|notification|vapid|device_token|digest|bell|reminder|register-push-token/i],
    next: "Keep `npm run qa:push-notification-contracts` green for token registration, opt-outs, digest dispatch, and service worker routing.",
  },
  {
    id: "storage-media-cdn",
    label: "Storage, Media, CDN, Downloads",
    patterns: [/storage|bucket|upload|media|photo|video|avatar|download|SmartImage|LazyVideo|cdn/i],
    next: "Keep `npm run qa:storage-media-contracts`, `npm run qa:database-storage-contracts`, and `npm run platform:test:storage-media` green for upload validation, public, protected, owner, and client/staff media paths plus Data API/RLS gates.",
  },
  {
    id: "policy-legal-trust",
    label: "Law, Policy, Compliance, Trust",
    patterns: [/policy|legal|terms|privacy|gdpr|california|refund|cancellation|consent|retention|disclosure/i],
    next: "Keep `npm run qa:legal-policy-contracts` green across legal pages, consent logs, export/delete, grants, and policy-backed booking flows.",
  },
  {
    id: "api-speed-ops",
    label: "API, Server Speed, Observability",
    patterns: [/api|function|cron|webhook|cache|performance|slow|monitor|alert|readiness|preflight/i],
    next: "Keep `npm run qa:api-operations-contracts` green for 5xx, slow query, webhook failure, auth/payment spike, cron, runtime settings, and preflight observability.",
  },
  {
    id: "security-anti-hack",
    label: "Security, Anti-Abuse, Hacker Protection",
    patterns: [/security|abuse|fraud|bot|rateLimit|withSecurity|waf|risk|blocklist|csp|hacker|attack/i],
    next: "Keep `npm run qa:security-anti-abuse-contracts` green for account takeover, card testing, spam, scraping, fake booking, key leakage, WAF, rate limits, and network-risk controls.",
  },
  {
    id: "graphics-design-speed",
    label: "Graphics, Design, Frontend Speed",
    patterns: [/brand|design|graphic|image|video|skeleton|loading|error|safe-area|responsive|lazy/i],
    next: "Keep `npm run qa:frontend-visual-contracts` green for visual route coverage, mobile safe areas, lazy media, loading/error states, and no clipped controls.",
  },
  {
    id: "native-mobile-release",
    label: "Native iOS, Android, OTA, Store Release",
    patterns: [/capacitor|native|ios|android|ota|live update|app store|play store|bundle id|versionCode|versionName|PrivacyInfo|entitlements|safe-area/i],
    next: "Keep `npm run qa:native-app-contracts` green for Capacitor config, iOS/Android metadata, OTA safety, store listing alignment, and native release checks.",
  },
];

const summary = readJson(path.join(root, "docs", "production-preflight-summary.json"));
const generated = new Date().toISOString();
const rows = workflows.map((workflow) => {
  const item = {
    id: workflow.id,
    label: workflow.label,
    frontend: evidence(frontendFiles, workflow.patterns),
    backend: evidence(backendFiles, workflow.patterns),
    database: evidence(databaseFiles, workflow.patterns),
    tests: evidence(testFiles, workflow.patterns),
    docs: evidence(docsFiles, workflow.patterns),
    nextAction: workflow.next,
  };
  const implementationCount = item.frontend.count + item.backend.count + item.database.count;
  item.implementationCount = implementationCount;
  item.testCoverageRatio = implementationCount > 0
    ? Number((item.tests.count / implementationCount).toFixed(4))
    : 0;
  item.status = statusFor(item);
  return item;
});

const statusOrder = { missing: 0, "needs-backend": 1, "needs-frontend": 2, "needs-tests": 3, "needs-targeted-tests": 4, covered: 5 };
const priority = rows
  .filter((row) => row.status !== "covered")
  .sort((left, right) => statusOrder[left.status] - statusOrder[right.status] || left.tests.count - right.tests.count)
  .map((row, index) => ({
    order: index + 1,
    id: row.id,
    label: row.label,
    status: row.status,
    testCoverageRatio: row.testCoverageRatio,
    nextAction: row.nextAction,
  }));

const report = {
  generated,
  currentGate: {
    mode: summary?.mode ?? "unknown",
    readyForProductionGate: summary?.readyForProductionGate ?? null,
    remoteMigrationHistoryStatus: summary?.supabase?.remoteMigrationHistoryStatus ?? "unknown",
    productionBlockers: summary?.blockers?.production ?? [],
  },
  productionBlockers: summary?.blockers?.production ?? [],
  totals: {
    frontendFiles: frontendFiles.length,
    backendFiles: backendFiles.length,
    databaseFiles: databaseFiles.length,
    testFiles: testFiles.length,
    docsFiles: docsFiles.length,
  },
  priority,
  workflows: rows,
};

const lines = [
  "# Workflow Coverage",
  "",
  `Generated: ${generated}`,
  "",
  "## Current Gate",
  "",
  `- Mode: ${report.currentGate.mode}`,
  `- Production gate ready: ${report.currentGate.readyForProductionGate === true ? "yes" : "no"}`,
  `- Remote migration history status: ${report.currentGate.remoteMigrationHistoryStatus}`,
  "",
  "## Production Blockers",
  "",
];

if (report.productionBlockers.length) {
  for (const blocker of report.productionBlockers) lines.push(`- ${blocker}`);
} else {
  lines.push("- None.");
}

lines.push(
  "",
  "## Priority Workflow Updates",
  "",
);

if (priority.length) {
  for (const item of priority) {
    lines.push(`${item.order}. ${item.label} (${item.status})`);
    lines.push(`   - Test coverage ratio: ${item.testCoverageRatio}`);
    lines.push(`   - Next action: ${item.nextAction}`);
  }
} else {
  lines.push("- All tracked workflows have frontend/backend or database evidence plus tests.");
}

lines.push("", "## Workflow Evidence", "");

for (const row of rows) {
  lines.push(`### ${row.label}`);
  lines.push("");
  lines.push(`- Status: ${row.status}`);
  lines.push(`- Evidence counts: frontend=${row.frontend.count}, backend=${row.backend.count}, database=${row.database.count}, tests=${row.tests.count}, docs=${row.docs.count}`);
  lines.push(`- Test coverage ratio: ${row.testCoverageRatio}`);
  lines.push(`- Next action: ${row.nextAction}`);
  for (const [label, bucket] of Object.entries({
    Frontend: row.frontend,
    Backend: row.backend,
    Database: row.database,
    Tests: row.tests,
    Docs: row.docs,
  })) {
    if (!bucket.samples.length) continue;
    lines.push(`- ${label} samples:`);
    for (const sample of bucket.samples.slice(0, 5)) lines.push(`  - ${sample}`);
  }
  lines.push("");
}

mkdirSync(docsDir, { recursive: true });
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeFileSync(markdownPath, `${lines.join("\n")}\n`, "utf8");

console.log(`workflow-coverage: wrote ${rel(jsonPath)} and ${rel(markdownPath)}`);
