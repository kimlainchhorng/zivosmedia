#!/usr/bin/env node
/**
 * Generate a broad end-to-end platform readiness matrix.
 *
 * This does not claim the product is complete. It gives each release lane a
 * repeatable inventory and the next verification command so frontend, backend,
 * payments, marketing, legal, storage, and security work can move deliberately.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const jsonPath = path.join(docsDir, "platform-readiness-matrix.json");
const markdownPath = path.join(docsDir, "platform-readiness-matrix.md");

function walk(dir, predicate = () => true) {
  if (!existsSync(dir)) return [];
  const entries = [];
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name);
    const stat = statSync(file);
    if (stat.isDirectory()) {
      entries.push(...walk(file, predicate));
    } else if (predicate(file)) {
      entries.push(file);
    }
  }
  return entries;
}

function rel(file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

function readJson(file) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function sampleMatches(files, patterns, limit = 10) {
  const matches = [];
  for (const file of files) {
    const relative = rel(file);
    const text = readFileSync(file, "utf8");
    if (patterns.some((pattern) => pattern.test(relative) || pattern.test(text))) {
      matches.push(relative);
    }
    if (matches.length >= limit) break;
  }
  return matches;
}

function countMatches(files, patterns) {
  let count = 0;
  for (const file of files) {
    const relative = rel(file);
    const text = readFileSync(file, "utf8");
    if (patterns.some((pattern) => pattern.test(relative) || pattern.test(text))) count += 1;
  }
  return count;
}

function evidenceBreakdown(lane) {
  return {
    pages: countMatches(pageFiles, lane.patterns),
    components: countMatches(componentFiles, lane.patterns),
    otherSource: countMatches(sourceFiles.filter((file) => !pageFiles.includes(file) && !componentFiles.includes(file)), lane.patterns),
    edgeFunctions: countMatches(functionFiles, lane.patterns),
    migrations: countMatches(migrationFiles, lane.patterns),
    tests: countMatches(testFiles, lane.patterns),
    docs: countMatches(docsFiles, lane.patterns),
  };
}

function testGapSummary(evidenceCount, breakdown) {
  const testEvidence = breakdown.tests;
  const testCoverageRatio = evidenceCount > 0 ? Number((testEvidence / evidenceCount).toFixed(4)) : 0;
  const implementationEvidence = breakdown.pages + breakdown.components + breakdown.otherSource + breakdown.edgeFunctions + breakdown.migrations;
  const targetTestEvidence = Math.max(5, Math.ceil(evidenceCount * 0.02));
  const testsNeededForHigh = Math.max(0, 5 - testEvidence);
  const testsNeededForOk = Math.max(0, targetTestEvidence - testEvidence);
  let priority = "ok";

  if (testsNeededForOk === 0) {
    priority = "ok";
  } else if (implementationEvidence >= 100 && testEvidence < 5) {
    priority = "critical";
  } else if (implementationEvidence >= 100 && testCoverageRatio < 0.02) {
    priority = "high";
  } else if (implementationEvidence >= 50 && testCoverageRatio < 0.05) {
    priority = "medium";
  }

  return {
    implementationEvidence,
    testEvidence,
    testCoverageRatio,
    targetTestEvidence,
    testsNeededForHigh,
    testsNeededForOk,
    priority,
  };
}

function suggestedTestFiles(lane) {
  const names = {
    "release-safety": [
      "src/test/releaseSafetyPreflight.test.ts",
      "src/test/releaseSafetyMigrationDrift.test.ts",
      "src/test/releaseSafetyArtifactContracts.test.ts",
      "src/test/releaseSafetyProductionSecretsContracts.test.ts",
      "src/test/deployEnvPreflight.test.ts",
      "src/test/deployWorkflowGates.test.ts",
      "src/test/secretScanner.test.ts",
    ],
    "auth-sso-sessions": [
      "tests/e2e/auth-sso-role-matrix.spec.ts",
      "src/test/authSessionSecurity.test.ts",
      "tests/e2e/admin-two-step-required.spec.ts",
    ],
    "role-workflows": [
      "src/test/roleWorkflowMatrix.test.ts",
      "src/test/crossVerticalRoleNavigation.test.ts",
      "src/test/staffDriverCreatorRoleAccess.test.ts",
      "src/test/merchantPayoutOwnerOpsAccess.test.ts",
      "src/test/adminModerationRoleAccess.test.ts",
      "src/test/adminSupportAccountRoleAccess.test.ts",
      "tests/e2e/customer-booking-payment.spec.ts",
      "tests/e2e/shop-owner-dashboard-permissions.spec.ts",
      "tests/e2e/staff-driver-creator-role-access.spec.ts",
    ],
    "payments-payouts": [
      "src/test/paymentWebhookIdempotency.test.ts",
      "src/test/payoutAuthorization.test.ts",
      "tests/e2e/checkout-refund-state.spec.ts",
    ],
    "email-push-marketing": [
      "src/test/marketingConsentSuppression.test.ts",
      "src/test/pushTokenLifecycle.test.ts",
      "tests/e2e/transactional-vs-marketing-messages.spec.ts",
    ],
    "database-storage-media": [
      "src/test/rls/dataApiGrantCoverage.test.ts",
      "src/test/fileUploadSecurity.test.ts",
      "src/test/storageBucketPolicies.test.ts",
      "tests/e2e/media-upload-delete-retention.spec.ts",
    ],
    "security-anti-abuse": [
      "src/test/securityAttackDrills.test.ts",
      "src/test/rateLimitRiskDecisions.test.ts",
      "tests/e2e/account-takeover-protection.spec.ts",
    ],
    "legal-policy-compliance": [
      "src/test/legalRouteSurface.test.ts",
      "src/test/legalHubCanonicalLinks.test.ts",
      "src/test/publicLegalNavigationCanonical.test.ts",
      "src/test/checkoutLegalCanonicalLinks.test.ts",
      "src/test/accountDeletionDataRightsLinks.test.ts",
      "src/test/travelLegalCanonicalLinks.test.ts",
      "src/test/groceryBusinessLegalCanonicalLinks.test.ts",
      "src/test/legalPolicyPageRelatedLinks.test.ts",
      "src/test/supportFlightLegalCanonicalLinks.test.ts",
      "src/test/residualPublicLegalCanonicalLinks.test.ts",
      "src/test/legalCanonicalSeoUrls.test.ts",
      "src/test/policyAcceptanceVersioning.test.ts",
      "src/test/legalAcceptanceEdgeAllowlists.test.ts",
      "src/test/accountDeletionLifecycle.test.ts",
      "src/test/accountExportManifest.test.ts",
      "src/test/privacyExportDeletePromises.test.ts",
      "src/test/legalTrustIntakeContracts.test.ts",
      "src/test/refundSupportTrustIntake.test.ts",
      "src/test/creatorMonetizationLegalDisclosure.test.ts",
      "src/test/adsMarketingPrivacyDisclosure.test.ts",
      "src/test/adsMarketingConsentRuntime.test.ts",
      "src/test/marketingLeadPrivacyIntake.test.ts",
      "src/test/ageEligibilitySafetyDisclosure.test.ts",
      "src/test/aiAutomatedDecisionDisclosure.test.ts",
      "src/test/automatedLegalPolicyHub.test.ts",
      "src/test/dataRightsLegalPolicyHub.test.ts",
      "src/test/sensitiveDataLegalPolicyHub.test.ts",
      "tests/e2e/refund-policy-flow.spec.ts",
    ],
    "frontend-graphics-speed": [
      "tests/visual/workflow-visual-readiness.spec.ts",
      "tests/e2e/mobile-layout-no-overlap.spec.ts",
      "src/test/visualWorkflowCoverageContracts.test.ts",
      "src/test/safeAreaVisualBaselineContracts.test.ts",
      "src/test/feedMobileVisualContracts.test.ts",
      "src/test/mobileBottomNavVisualContracts.test.ts",
      "src/test/createPostComposerVisualContracts.test.ts",
      "src/test/mediaRenderingPerformanceContracts.test.ts",
      "src/test/feedResponsiveShellContracts.test.ts",
      "src/test/loadingEmptyReliabilityContracts.test.ts",
      "src/test/loadingErrorStates.test.tsx",
    ],
    "native-mobile-release": [
      "src/test/workflows/native-app-release.test.ts",
      "src/test/nativePermissionsDeepLinks.test.ts",
      "src/test/nativeStoreListingCanonicalUrls.test.ts",
      "src/test/nativeStoreAssets.test.ts",
      "src/test/nativeStoreScreenshotSpecs.test.ts",
      "src/test/nativeSubmissionCommands.test.ts",
      "src/test/nativeVersionReleaseAlignment.test.ts",
      "src/test/nativeReleaseChecklist.test.ts",
      "src/test/nativeSafeAreaBridgeContracts.test.ts",
      "src/test/otaDeployBypass.test.ts",
      "scripts/qa/native-app-contracts.mjs",
      "scripts/native/doctor.mjs",
    ],
    "api-server-operations": [
      "src/test/apiObservabilityContracts.test.ts",
      "src/test/webhookFailureAlerting.test.ts",
      "src/test/apiOperationsReportSurfaces.test.ts",
      "tests/e2e/server-error-fallbacks.spec.ts",
    ],
  };
  return names[lane.id] ?? [`src/test/${lane.id}.test.ts`];
}

const pageFiles = walk(path.join(root, "src", "pages"), (file) => /\.(tsx?|jsx?)$/.test(file));
const componentFiles = walk(path.join(root, "src", "components"), (file) => /\.(tsx?|jsx?)$/.test(file));
const sourceFiles = [
  ...pageFiles,
  ...componentFiles,
  ...walk(path.join(root, "src", "hooks"), (file) => /\.(tsx?|jsx?)$/.test(file)),
  ...walk(path.join(root, "src", "services"), (file) => /\.(tsx?|jsx?)$/.test(file)),
  ...walk(path.join(root, "src", "lib"), (file) => /\.(tsx?|jsx?)$/.test(file)),
];
const functionFiles = walk(path.join(root, "supabase", "functions"), (file) => file.endsWith("index.ts"));
const migrationFiles = walk(path.join(root, "supabase", "migrations"), (file) => file.endsWith(".sql"));
const testFiles = [
  ...walk(path.join(root, "src", "test"), (file) => /\.(tsx?|jsx?)$/.test(file)),
  ...walk(path.join(root, "tests"), (file) => /\.(tsx?|jsx?)$/.test(file)),
];
const docsFiles = walk(path.join(root, "docs"), (file) => /\.(md|json)$/.test(file));
const summary = readJson(path.join(root, "docs", "production-preflight-summary.json"));

const lanes = [
  {
    id: "release-safety",
    label: "Release Safety Foundation",
    patterns: [/preflight|migration|readiness|security:scan|security:check-secrets|upgrade-readiness|SUPABASE_ACCESS_TOKEN|SUPABASE_ANON_KEY|VITE_SUPABASE_PUBLISHABLE_KEY|service-role JWT/i],
    commands: ["npm run test -- src/test/deployEnvPreflight.test.ts src/test/secretScanner.test.ts", "npm run deploy:preflight:strict", "npm run security:scan", "npm run supabase:upgrade-readiness"],
    next: "Resolve production preflight blockers and keep Supabase token misuse/leakage tests green before schema pushes or production deploys.",
  },
  {
    id: "auth-sso-sessions",
    label: "Auth, SSO, Sessions, and Account Protection",
    patterns: [/auth|sso|oauth|otp|session|two.?step|login|signInWithOAuth|Apple|Google/i],
    commands: [
      "npm run qa:sso-auth-contracts",
      "npm run test -- src/test/authSessionSecurity.test.ts src/test/workflows/sso-auth-sessions.test.ts",
      "npx playwright test tests/e2e/sso-session-roles.spec.ts tests/e2e/auth-sso-role-matrix.spec.ts tests/e2e/admin-two-step-required.spec.ts",
      "npm run test:e2e -- tests/e2e/mobile-auth-feed-smoke.spec.ts",
    ],
    next: "Keep OAuth, passwordless OTP, MFA step-up, trusted devices, active sessions, and role-aware route gates green.",
  },
  {
    id: "role-workflows",
    label: "Customer, Shop Owner, Staff, Driver, Creator, Admin Workflows",
    patterns: [/customer|owner|shop|staff|driver|creator|admin|client|booking|order|dashboard/i],
    commands: [
      "npm run qa:customer-booking-contracts",
      "npm run qa:shop-owner-contracts",
      "npm run qa:client-staff-contracts",
      "npm run test -- src/test/roleWorkflowMatrix.test.ts src/test/crossVerticalRoleNavigation.test.ts src/test/staffDriverCreatorRoleAccess.test.ts src/test/merchantPayoutOwnerOpsAccess.test.ts src/test/adminModerationRoleAccess.test.ts src/test/adminSupportAccountRoleAccess.test.ts",
      "npx playwright test tests/e2e/customer-booking-payment.spec.ts tests/e2e/shop-owner-dashboard-permissions.spec.ts tests/e2e/staff-driver-creator-role-access.spec.ts",
    ],
    next: "Keep customer booking, shop owner, staff, driver, creator, support, and admin role workflows green.",
  },
  {
    id: "payments-payouts",
    label: "Payments, Payouts, Refunds, and Webhooks",
    patterns: [/stripe|paypal|square|payway|bakong|payment|payout|refund|checkout|webhook|ledger|wallet/i],
    commands: [
      "npm run qa:payments-refunds-contracts",
      "npm run qa:payouts-earnings-contracts",
      "npm run test -- src/test/paymentWebhookIdempotency.test.ts src/test/payoutAuthorization.test.ts",
      "npx playwright test tests/e2e/checkout-refund-state.spec.ts",
      "npm run security:api-readiness:report",
    ],
    next: "Keep provider webhooks, checkout/refund state, payout auth, idempotency, and wallet ledgers green.",
  },
  {
    id: "email-push-marketing",
    label: "Email, Push, SMS, and Marketing",
    patterns: [/email|push|sms|notification|campaign|marketing|unsubscribe|suppression|digest/i],
    commands: [
      "npm run qa:email-marketing-contracts",
      "npm run qa:push-notification-contracts",
      "npm run test -- src/test/marketingConsentSuppression.test.ts src/test/pushTokenLifecycle.test.ts src/test/workflows/email-marketing-consent.test.ts src/test/workflows/push-notifications-workflow.test.ts",
      "npx playwright test tests/e2e/transactional-vs-marketing-messages.spec.ts",
      "npm run security:api-readiness:report",
    ],
    next: "Keep transactional-vs-marketing separation, suppression, consent, push tokens, digest dispatch, and campaign event logging green.",
  },
  {
    id: "database-storage-media",
    label: "Database, Storage, and Media",
    patterns: [/storage|bucket|media|upload|avatar|SmartImage|LazyVideo|RLS|policy|grant|index/i],
    commands: ["npm run qa:database-storage-contracts", "npm run qa:storage-media-contracts", "npm run platform:test:storage-media", "npm run test:rls", "npm run perf:media-report", "npm run supabase:migrations:linked:strict"],
    next: "Keep `npm run qa:database-storage-contracts`, `npm run qa:storage-media-contracts`, and `npm run platform:test:storage-media` green for Data API grants, RLS, storage policies, signed media, upload validation, Postgres upgrade checks, and media/CDN gates.",
  },
  {
    id: "security-anti-abuse",
    label: "Security, Anti-Abuse, and Hacker Protection",
    patterns: [/security|abuse|fraud|risk|bot|waf|rateLimit|withSecurity|csp|integrity|blocklist|scam/i],
    commands: [
      "npm run qa:security-anti-abuse-contracts",
      "npm run test -- src/test/securityAttackDrills.test.ts src/test/rateLimitRiskDecisions.test.ts src/test/workflows/security-anti-abuse.test.ts",
      "npx playwright test tests/e2e/account-takeover-protection.spec.ts",
      "npm run security:scan",
      "npm run security:api-readiness:report",
      "npm run deploy:preflight:strict",
    ],
    next: "Keep account takeover, card testing, spam, scraping, fake booking, key leakage, WAF, rate-limit, network-risk, and strict preflight controls green.",
  },
  {
    id: "legal-policy-compliance",
    label: "Law, Policy, Compliance, and Trust",
    patterns: [/terms|privacy|policy|legal|compliance|trust|disclosure|refund|cancellation|consent|delete|export/i],
    commands: [
      "npm run qa:legal-policy-contracts",
      "npm run test -- src/test/workflows/legal-policy-workflow.test.ts src/test/legalRouteSurface.test.ts src/test/legalHubCanonicalLinks.test.ts src/test/publicLegalNavigationCanonical.test.ts src/test/checkoutLegalCanonicalLinks.test.ts src/test/accountDeletionDataRightsLinks.test.ts src/test/travelLegalCanonicalLinks.test.ts src/test/groceryBusinessLegalCanonicalLinks.test.ts src/test/legalPolicyPageRelatedLinks.test.ts src/test/supportFlightLegalCanonicalLinks.test.ts src/test/residualPublicLegalCanonicalLinks.test.ts src/test/legalCanonicalSeoUrls.test.ts src/test/policyAcceptanceVersioning.test.ts src/test/legalAcceptanceEdgeAllowlists.test.ts src/test/accountDeletionLifecycle.test.ts src/test/accountExportManifest.test.ts src/test/privacyExportDeletePromises.test.ts src/test/legalTrustIntakeContracts.test.ts src/test/refundSupportTrustIntake.test.ts src/test/creatorMonetizationLegalDisclosure.test.ts src/test/adsMarketingPrivacyDisclosure.test.ts src/test/adsMarketingConsentRuntime.test.ts src/test/marketingLeadPrivacyIntake.test.ts src/test/ageEligibilitySafetyDisclosure.test.ts src/test/aiAutomatedDecisionDisclosure.test.ts src/test/automatedLegalPolicyHub.test.ts src/test/dataRightsLegalPolicyHub.test.ts src/test/sensitiveDataLegalPolicyHub.test.ts",
      "npx playwright test tests/e2e/refund-policy-flow.spec.ts",
      "npm run security:api-readiness:report",
    ],
    next: "Keep legal pages, canonical links, consent logs, export/delete rights, privacy intake, refund support, monetization disclosures, ads consent, AI notices, and policy-backed booking flows green.",
  },
  {
    id: "frontend-graphics-speed",
    label: "Frontend, Graphics, Design, and Speed",
    patterns: [/design|brand|image|video|skeleton|loading|error|safe-area|responsive|performance|lazy/i],
    commands: [
      "npm run qa:frontend-visual-contracts",
      "npm run test -- src/test/visualWorkflowCoverageContracts.test.ts src/test/safeAreaVisualBaselineContracts.test.ts src/test/feedMobileVisualContracts.test.ts src/test/mobileBottomNavVisualContracts.test.ts src/test/createPostComposerVisualContracts.test.ts src/test/mediaRenderingPerformanceContracts.test.ts src/test/feedResponsiveShellContracts.test.ts src/test/loadingEmptyReliabilityContracts.test.ts src/test/loadingErrorStates.test.tsx",
      "npx playwright test tests/e2e/mobile-layout-no-overlap.spec.ts",
      "npm run test:visual",
      "npm run qa:safe-area:all",
      "npm run perf:media-report",
      "npm run build",
    ],
    next: "Keep visual route coverage, compact mobile feed controls, safe-area baselines, bottom navigation, composer controls, lazy media, loading/error states, and no-overlap checks green.",
  },
  {
    id: "native-mobile-release",
    label: "Native iOS, Android, OTA, and Store Release",
    patterns: [/capacitor|native|ios|android|ota|live update|app store|play store|bundle id|versionCode|versionName|PrivacyInfo|entitlements|safe-area/i],
    commands: [
      "npm run qa:native-app-contracts",
      "npm run test -- src/test/workflows/native-app-release.test.ts src/test/nativePermissionsDeepLinks.test.ts src/test/nativeStoreListingCanonicalUrls.test.ts src/test/nativeStoreAssets.test.ts src/test/nativeStoreScreenshotSpecs.test.ts src/test/nativeSubmissionCommands.test.ts src/test/nativeVersionReleaseAlignment.test.ts src/test/nativeReleaseChecklist.test.ts src/test/nativeSafeAreaBridgeContracts.test.ts src/test/otaDeployBypass.test.ts",
      "npm run native:doctor",
      "npm run native:sync",
      "npm run ios:build:sim",
      "npm run android:build:debug",
    ],
    next: "Keep Capacitor config, native permissions, deep links, push extensions, iOS/Android store metadata, screenshots, safe-area bridge, OTA bypass safety, version alignment, native sync, and simulator/debug builds green.",
  },
  {
    id: "api-server-operations",
    label: "API, Server Speed, Observability, and Operations",
    patterns: [/api|function|cron|webhook|monitor|alert|receipt|proxy|cache|performance|readiness/i],
    commands: [
      "npm run qa:api-operations-contracts",
      "npm run test -- src/test/workflows/api-operations-readiness.test.ts src/test/apiObservabilityContracts.test.ts src/test/webhookFailureAlerting.test.ts src/test/apiOperationsReportSurfaces.test.ts",
      "npx playwright test tests/e2e/server-error-fallbacks.spec.ts",
      "npm run security:api-readiness:report",
      "npm run deploy:preflight:strict",
    ],
    next: "Keep wrapper observability, preflight artifacts, runtime settings, operations runbook owners, webhook failure surfaces, cron monitors, server-error fallbacks, and API readiness green.",
  },
];

const inventory = {
  generated: new Date().toISOString(),
  totals: {
    pageFiles: pageFiles.length,
    componentFiles: componentFiles.length,
    sourceFiles: sourceFiles.length,
    edgeFunctions: functionFiles.length,
    migrations: migrationFiles.length,
    testFiles: testFiles.length,
    docsFiles: docsFiles.length,
  },
  currentGate: {
    mode: summary?.mode ?? "unknown",
    readyForCurrentGate: summary?.readyForCurrentGate ?? null,
    readyForProductionGate: summary?.readyForProductionGate ?? null,
    remoteMigrationHistoryStatus: summary?.supabase?.remoteMigrationHistoryStatus ?? "unknown",
    productionBlockers: summary?.blockers?.production ?? [],
  },
  productionBlockers: summary?.blockers?.production ?? [],
  lanes: lanes.map((lane) => {
    const evidenceFiles = [...sourceFiles, ...functionFiles, ...migrationFiles, ...docsFiles, ...testFiles];
    const breakdown = evidenceBreakdown(lane);
    const evidenceCount = countMatches(evidenceFiles, lane.patterns);
    return {
      id: lane.id,
      label: lane.label,
      evidenceCount,
      evidenceBreakdown: breakdown,
      testGap: testGapSummary(evidenceCount, breakdown),
      sampleEvidence: sampleMatches(evidenceFiles, lane.patterns),
      suggestedTestFiles: suggestedTestFiles(lane),
      verificationCommands: lane.commands,
      nextAction: lane.next,
    };
  }),
};

const priorityRank = { critical: 0, high: 1, medium: 2, ok: 3 };
const priorityTestGapActions = inventory.lanes
  .filter((lane) => lane.testGap.priority !== "ok")
  .sort((left, right) => (
    priorityRank[left.testGap.priority] - priorityRank[right.testGap.priority] ||
    left.testGap.testCoverageRatio - right.testGap.testCoverageRatio ||
    right.testGap.implementationEvidence - left.testGap.implementationEvidence
  ))
  .map((lane, index) => ({
    order: index + 1,
    id: lane.id,
    label: lane.label,
    priority: lane.testGap.priority,
    testCoverageRatio: lane.testGap.testCoverageRatio,
    implementationEvidence: lane.testGap.implementationEvidence,
    testEvidence: lane.testGap.testEvidence,
    targetTestEvidence: lane.testGap.targetTestEvidence,
    testsNeededForHigh: lane.testGap.testsNeededForHigh,
    testsNeededForOk: lane.testGap.testsNeededForOk,
    nextAction: lane.nextAction,
    verificationCommands: lane.verificationCommands,
    suggestedTestFiles: lane.suggestedTestFiles,
  }));

inventory.priorityTestGapActions = priorityTestGapActions;

const lines = [
  "# Platform Readiness Matrix",
  "",
  `Generated: ${inventory.generated}`,
  "",
  "## Current Gate",
  "",
  `- Mode: ${inventory.currentGate.mode}`,
  `- Current gate ready: ${inventory.currentGate.readyForCurrentGate === true ? "yes" : "no"}`,
  `- Production gate ready: ${inventory.currentGate.readyForProductionGate === true ? "yes" : "no"}`,
  `- Remote migration history status: ${inventory.currentGate.remoteMigrationHistoryStatus}`,
  "",
  "## Production Blockers",
  "",
];

if (inventory.productionBlockers.length) {
  for (const blocker of inventory.productionBlockers) lines.push(`- ${blocker}`);
} else {
  lines.push("- None");
}

lines.push(
  "",
  "## Inventory Totals",
  "",
  `- Page files: ${inventory.totals.pageFiles}`,
  `- Component files: ${inventory.totals.componentFiles}`,
  `- Source files scanned: ${inventory.totals.sourceFiles}`,
  `- Supabase Edge Functions: ${inventory.totals.edgeFunctions}`,
  `- Supabase migrations: ${inventory.totals.migrations}`,
  `- Test files: ${inventory.totals.testFiles}`,
  `- Docs files: ${inventory.totals.docsFiles}`,
  "",
  "## Priority Test Gap Actions",
  "",
);

if (inventory.priorityTestGapActions.length) {
  for (const action of inventory.priorityTestGapActions) {
    lines.push(`${action.order}. ${action.label} (${action.priority})`);
    lines.push(`   - Test coverage ratio: ${action.testCoverageRatio}`);
    lines.push(`   - Evidence: implementation=${action.implementationEvidence}, tests=${action.testEvidence}, targetTests=${action.targetTestEvidence}`);
    lines.push(`   - Test files needed: toHigh=${action.testsNeededForHigh}, toOk=${action.testsNeededForOk}`);
    lines.push(`   - Next action: ${action.nextAction}`);
    lines.push(`   - Verification: ${action.verificationCommands.join(" && ")}`);
    lines.push(`   - Suggested test files: ${action.suggestedTestFiles.join(", ")}`);
  }
} else {
  lines.push("- No priority test gaps detected.");
}

lines.push(
  "",
  "## Release Lanes",
  "",
);

for (const lane of inventory.lanes) {
  lines.push(`### ${lane.label}`);
  lines.push("");
  lines.push(`- Evidence matches: ${lane.evidenceCount}`);
  lines.push(`- Evidence breakdown: pages=${lane.evidenceBreakdown.pages}, components=${lane.evidenceBreakdown.components}, otherSource=${lane.evidenceBreakdown.otherSource}, edgeFunctions=${lane.evidenceBreakdown.edgeFunctions}, migrations=${lane.evidenceBreakdown.migrations}, tests=${lane.evidenceBreakdown.tests}, docs=${lane.evidenceBreakdown.docs}`);
  lines.push(`- Test gap: priority=${lane.testGap.priority}, implementationEvidence=${lane.testGap.implementationEvidence}, testEvidence=${lane.testGap.testEvidence}, targetTestEvidence=${lane.testGap.targetTestEvidence}, testsNeededForHigh=${lane.testGap.testsNeededForHigh}, testsNeededForOk=${lane.testGap.testsNeededForOk}, testCoverageRatio=${lane.testGap.testCoverageRatio}`);
  lines.push(`- Suggested test files: ${lane.suggestedTestFiles.join(", ")}`);
  lines.push(`- Next action: ${lane.nextAction}`);
  lines.push(`- Verification: ${lane.verificationCommands.join(" && ")}`);
  if (lane.sampleEvidence.length) {
    lines.push("- Sample evidence:");
    for (const sample of lane.sampleEvidence) lines.push(`  - ${sample}`);
  }
  lines.push("");
}

mkdirSync(docsDir, { recursive: true });
writeFileSync(jsonPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
writeFileSync(markdownPath, `${lines.join("\n")}\n`, "utf8");

console.log(`platform-readiness-matrix: wrote ${rel(jsonPath)} and ${rel(markdownPath)}`);
