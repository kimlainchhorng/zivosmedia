#!/usr/bin/env node
/**
 * Generate an actionable test plan from workflow coverage priorities.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const coveragePath = path.join(docsDir, "workflow-coverage.json");
const jsonPath = path.join(docsDir, "workflow-test-plan.json");
const markdownPath = path.join(docsDir, "workflow-test-plan.md");

const planDetails = {
  "policy-legal-trust": {
    target: "src/test/workflows/legal-policy-workflow.test.ts",
    command: "npm run test -- src/test/workflows/legal-policy-workflow.test.ts",
    acceptance: [
      "Policy routes render required pages.",
      "Account export/delete/privacy controls are linked from account surfaces.",
      "Policy acceptance or consent logging has database/backend evidence.",
    ],
  },
  "push-notifications": {
    target: "src/test/workflows/push-notifications-workflow.test.ts",
    command: "npm run test -- src/test/workflows/push-notifications-workflow.test.ts",
    acceptance: [
      "Push token registration requires an authenticated user.",
      "Notification preferences can disable marketing/non-critical sends.",
      "Digest/test-send paths do not bypass opt-out state.",
    ],
  },
  "client-staff-workflows": {
    target: "src/test/workflows/client-staff-workflow.test.ts",
    command: "npm run test -- src/test/workflows/client-staff-workflow.test.ts",
    acceptance: [
      "Staff invite acceptance lands on the correct workspace.",
      "Client/staff users cannot access owner-only settings.",
      "Schedule/payroll/client data requires the correct role.",
    ],
  },
  "email-marketing-consent": {
    target: "src/test/workflows/email-marketing-consent.test.ts",
    command: "npm run test -- src/test/workflows/email-marketing-consent.test.ts",
    acceptance: [
      "Transactional sends are separated from marketing sends.",
      "Unsubscribe and suppression state block marketing campaigns.",
      "Consent basis/template/version is recorded for outbound messages.",
    ],
  },
  "ads-monetization-tracking": {
    target: "src/test/workflows/ads-monetization-tracking.test.ts",
    command: "npm run test -- src/test/workflows/ads-monetization-tracking.test.ts",
    acceptance: [
      "Ads Studio attribution ties clicks/creative variants to order revenue.",
      "Google Ads, Meta CAPI, and provider conversion uploads are deduped and auditable.",
      "Creator subscriptions, paid video, affiliate tracking, and payouts stay connected.",
    ],
  },
  "payouts-earnings": {
    target: "src/test/workflows/payouts-earnings-workflow.test.ts",
    command: "npm run test -- src/test/workflows/payouts-earnings-workflow.test.ts",
    acceptance: [
      "Payout settings require owner/admin authorization.",
      "Stripe Connect/earnings states render pending, active, restricted, and failed.",
      "Payout changes are audit logged and idempotent.",
    ],
  },
  "shop-owner-admin": {
    target: "src/test/workflows/shop-owner-workflow.test.ts",
    command: "npm run test -- src/test/workflows/shop-owner-workflow.test.ts",
    acceptance: [
      "Owner onboarding reaches a configured shop dashboard.",
      "Catalog, staff, settings, payments, and marketing tabs render.",
      "Non-owners cannot mutate owner-only shop data.",
    ],
  },
  "security-anti-hack": {
    target: "src/test/workflows/security-anti-abuse.test.ts",
    command: "npm run test -- src/test/workflows/security-anti-abuse.test.ts",
    acceptance: [
      "High-risk Edge Functions use shared security wrappers.",
      "Rate-limit and network-risk decisions are auditable.",
      "Attack drills cover account takeover, card testing, spam, scraping, and fake bookings.",
    ],
  },
  "customer-booking-order": {
    target: "src/test/workflows/customer-booking-order.test.ts",
    command: "npm run test -- src/test/workflows/customer-booking-order.test.ts",
    acceptance: [
      "Customer can browse, checkout/book, and view confirmation.",
      "Cancel/refund states match policy and permissions.",
      "Guest/authenticated paths do not expose another customer data.",
    ],
  },
  "payments-refunds": {
    target: "src/test/workflows/payments-refunds-webhooks.test.ts",
    command: "npm run test -- src/test/workflows/payments-refunds-webhooks.test.ts",
    acceptance: [
      "Webhook replay does not duplicate ledger/order rows.",
      "Payment states reconcile from provider webhook, not client redirect only.",
      "Refund/dispute/cancel states render and audit correctly.",
    ],
  },
  "api-speed-ops": {
    target: "src/test/workflows/api-operations-readiness.test.ts",
    command: "npm run test -- src/test/workflows/api-operations-readiness.test.ts",
    acceptance: [
      "Critical functions have health/error visibility.",
      "Webhook failures and function 5xx are surfaced to admin/ops.",
      "Slow query and auth/payment spike checks have documented owners.",
    ],
  },
  "graphics-design-speed": {
    target: "tests/visual/workflow-visual-readiness.spec.ts, tests/visual/safe-area.spec.ts, tests/e2e/mobile-layout-no-overlap.spec.ts, src/test/loadingErrorStates.test.tsx",
    command: "npm run qa:frontend-visual-contracts && npm run test:visual && npm run qa:safe-area:all && npm run test -- src/test/loadingErrorStates.test.tsx",
    acceptance: [
      "Auth, feed, grocery, business, support, security, shop, driver, creator, admin, checkout, legal, and settings surfaces stay covered by visual route contracts.",
      "No clipped primary buttons or incoherent overlapping text.",
      "Safe-area top and bottom snapshots have committed baselines and seed cookie consent before capture.",
      "Media-heavy surfaces use lazy/optimized image/video primitives.",
    ],
  },
  "storage-media-cdn": {
    target: "src/test/fileUploadSecurity.test.ts, src/test/workflows/storage-media-workflow.test.ts",
    command: "npm run platform:test:storage-media",
    acceptance: [
      "Client and server upload validators reject unsafe names, empty files, spoofed types, and active-content payload markers.",
      "Public, owner-only, client-only, and protected media paths are covered.",
      "Storage upsert requires the intended insert/select/update permissions.",
      "Delete/retention behavior matches user privacy and policy promises.",
    ],
  },
  "native-mobile-release": {
    target: "src/test/workflows/native-app-release.test.ts, src/test/otaDeployBypass.test.ts",
    command: "npm run test -- src/test/workflows/native-app-release.test.ts src/test/otaDeployBypass.test.ts",
    acceptance: [
      "Capacitor, iOS, Android, and store metadata stay aligned.",
      "OTA updates are checksum-verified and gated by native version when needed.",
      "OTA preflight bypass requires an explicit emergency risk acknowledgement.",
      "Native release scripts and platform readiness gates stay wired.",
    ],
  },
  "release-safety": {
    target: "src/test/deployEnvPreflight.test.ts, src/test/deployWorkflowGates.test.ts, src/test/secretScanner.test.ts, src/test/releaseSafetyPreflight.test.ts",
    command: "npm run test -- src/test/deployEnvPreflight.test.ts src/test/deployWorkflowGates.test.ts src/test/secretScanner.test.ts src/test/releaseSafetyPreflight.test.ts",
    acceptance: [
      "Deploy env preflight rejects service-role JWTs configured as anon keys.",
      "Production and preview deploy workflows run preflight/secret gates before publishing.",
      "Secret scanning blocks pasted Supabase publishable keys before commit/deploy.",
      "Secret scanning blocks Supabase management access tokens before commit/deploy.",
      "Preflight summaries and artifacts stay strict-mode aware and diagnostic-rich.",
    ],
  },
  "sso-auth-sessions": {
    target: "tests/e2e/sso-session-roles.spec.ts, tests/e2e/auth-sso-role-matrix.spec.ts",
    command: "npm run test:e2e -- tests/e2e/sso-session-roles.spec.ts tests/e2e/auth-sso-role-matrix.spec.ts",
    acceptance: [
      "Password, magic-link/OTP, Google, and Apple entry points have route coverage.",
      "Customer, owner, staff, creator, driver, and admin stay mapped to protected routes and role gates.",
      "Session revoke/device management blocks stale access.",
    ],
  },
};

function readJson(file) {
  if (!existsSync(file)) {
    throw new Error(`${path.relative(root, file)} is missing. Run npm run qa:workflow-coverage first.`);
  }
  return JSON.parse(readFileSync(file, "utf8"));
}

const coverage = readJson(coveragePath);
const generated = new Date().toISOString();
const sourcePriority = coverage.priority?.length
  ? coverage.priority
  : coverage.workflows.map((workflow, index) => ({
    order: index + 1,
    id: workflow.id,
    label: workflow.label,
    status: workflow.status,
    testCoverageRatio: workflow.testCoverageRatio,
    nextAction: workflow.nextAction,
  }));

const releaseChecklistIds = [
  // Keep this visible even after it reaches "covered" so media/storage
  // regressions remain part of every release checklist.
  "storage-media-cdn",
];

const selected = [...sourcePriority];
for (const id of releaseChecklistIds) {
  if (selected.some((item) => item.id === id)) continue;
  const workflow = coverage.workflows.find((item) => item.id === id);
  if (workflow) {
    selected.push({
      order: selected.length + 1,
      id: workflow.id,
      label: workflow.label,
      status: workflow.status,
      testCoverageRatio: workflow.testCoverageRatio,
      nextAction: workflow.nextAction,
    });
  }
}

const actions = selected.map((item, index) => {
  const detail = planDetails[item.id] ?? {
    target: `src/test/workflows/${item.id}.test.ts`,
    command: `npm run test -- src/test/workflows/${item.id}.test.ts`,
    acceptance: [item.nextAction],
  };
  return {
    order: index + 1,
    id: item.id,
    label: item.label,
    status: item.status,
    testCoverageRatio: item.testCoverageRatio,
    target: detail.target,
    command: detail.command,
    acceptance: detail.acceptance,
  };
});

const plan = {
  generated,
  sourceCoverage: "docs/workflow-coverage.json",
  currentGate: coverage.currentGate,
  productionBlockers: coverage.currentGate?.productionBlockers ?? [],
  verificationCommands: [
    "npm run platform:audit",
    "npm run release:gate",
    "npm run release:production-gate",
    "npm run deploy:preflight:strict",
  ],
  actions,
};

const lines = [
  "# Workflow Test Plan",
  "",
  `Generated: ${generated}`,
  "",
  "Source: `docs/workflow-coverage.json`",
  "",
  "## Gate Context",
  "",
  `- Mode: ${coverage.currentGate?.mode ?? "unknown"}`,
  `- Production gate ready: ${coverage.currentGate?.readyForProductionGate === true ? "yes" : "no"}`,
  `- Remote migration history status: ${coverage.currentGate?.remoteMigrationHistoryStatus ?? "unknown"}`,
  "",
  "## Audit Command",
  "",
  "- Run `npm run platform:audit` before release candidates. It starts with `npm run security:scan`, regenerates readiness reports, validates generated report contracts, and runs the domain QA contract suite.",
  "- Run `npm run release:gate` after preflight artifacts are refreshed to validate the summary schema, report artifacts, platform readiness matrix, and packaged security scan.",
  "- Run `npm run release:production-gate` in production deploy automation; it includes `npm run release:gate` and strict production summary enforcement.",
  "- Run `npm run deploy:preflight:strict` before production deploys.",
  "",
  "## Production Blockers",
  "",
];

if (plan.productionBlockers.length) {
  for (const blocker of plan.productionBlockers) lines.push(`- ${blocker}`);
} else {
  lines.push("- None");
}

lines.push(
  "",
  "## Ordered Test Work",
  "",
);

for (const action of actions) {
  lines.push(`${action.order}. ${action.label}`);
  lines.push(`   - Status: ${action.status}`);
  lines.push(`   - Test coverage ratio: ${action.testCoverageRatio}`);
  lines.push(`   - Target: \`${action.target}\``);
  lines.push(`   - Command: \`${action.command}\``);
  lines.push("   - Acceptance:");
  for (const criterion of action.acceptance) lines.push(`     - ${criterion}`);
}

mkdirSync(docsDir, { recursive: true });
writeFileSync(jsonPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
writeFileSync(markdownPath, `${lines.join("\n")}\n`, "utf8");

console.log(`workflow-test-plan: wrote ${path.relative(root, jsonPath)} and ${path.relative(root, markdownPath)}`);
