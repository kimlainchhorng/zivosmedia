# Platform Readiness Matrix

Generated: 2026-07-23T02:57:43.272Z

## Current Gate

- Mode: strict
- Current gate ready: no
- Production gate ready: no
- Remote migration history status: unavailable

## Production Blockers

- Environment readiness has 6 critical finding(s).
- Missing SUPABASE_URL for production backend cron/runtime settings.
- Missing SUPABASE_ANON_KEY for production Edge Function verification and database cron auth.
- Missing SUPABASE_ACCESS_TOKEN for production migration-history verification.
- Supabase remote migration history is unavailable (unavailable).

## Inventory Totals

- Page files: 709
- Component files: 1318
- Source files scanned: 2714
- Supabase Edge Functions: 474
- Supabase migrations: 1135
- Test files: 167
- Docs files: 1573

## Priority Test Gap Actions

1. Frontend, Graphics, Design, and Speed (high)
   - Test coverage ratio: 0.0156
   - Evidence: implementation=2503, tests=62, targetTests=80
   - Test files needed: toHigh=0, toOk=18
   - Next action: Keep visual route coverage, compact mobile feed controls, safe-area baselines, bottom navigation, composer controls, lazy media, loading/error states, and no-overlap checks green.
   - Verification: npm run qa:frontend-visual-contracts && npm run test -- src/test/visualWorkflowCoverageContracts.test.ts src/test/safeAreaVisualBaselineContracts.test.ts src/test/feedMobileVisualContracts.test.ts src/test/mobileBottomNavVisualContracts.test.ts src/test/createPostComposerVisualContracts.test.ts src/test/mediaRenderingPerformanceContracts.test.ts src/test/feedResponsiveShellContracts.test.ts src/test/loadingEmptyReliabilityContracts.test.ts src/test/loadingErrorStates.test.tsx && npx playwright test tests/e2e/mobile-layout-no-overlap.spec.ts && npm run test:visual && npm run qa:safe-area:all && npm run perf:media-report && npm run build
   - Suggested test files: tests/visual/workflow-visual-readiness.spec.ts, tests/e2e/mobile-layout-no-overlap.spec.ts, src/test/visualWorkflowCoverageContracts.test.ts, src/test/safeAreaVisualBaselineContracts.test.ts, src/test/feedMobileVisualContracts.test.ts, src/test/mobileBottomNavVisualContracts.test.ts, src/test/createPostComposerVisualContracts.test.ts, src/test/mediaRenderingPerformanceContracts.test.ts, src/test/feedResponsiveShellContracts.test.ts, src/test/loadingEmptyReliabilityContracts.test.ts, src/test/loadingErrorStates.test.tsx
2. Native iOS, Android, OTA, and Store Release (high)
   - Test coverage ratio: 0.0185
   - Evidence: implementation=1514, tests=47, targetTests=51
   - Test files needed: toHigh=0, toOk=4
   - Next action: Keep Capacitor config, native permissions, deep links, push extensions, iOS/Android store metadata, screenshots, safe-area bridge, OTA bypass safety, version alignment, native sync, and simulator/debug builds green.
   - Verification: npm run qa:native-app-contracts && npm run test -- src/test/workflows/native-app-release.test.ts src/test/nativePermissionsDeepLinks.test.ts src/test/nativeStoreListingCanonicalUrls.test.ts src/test/nativeStoreAssets.test.ts src/test/nativeStoreScreenshotSpecs.test.ts src/test/nativeSubmissionCommands.test.ts src/test/nativeVersionReleaseAlignment.test.ts src/test/nativeReleaseChecklist.test.ts src/test/nativeSafeAreaBridgeContracts.test.ts src/test/otaDeployBypass.test.ts && npm run native:doctor && npm run native:sync && npm run ios:build:sim && npm run android:build:debug
   - Suggested test files: src/test/workflows/native-app-release.test.ts, src/test/nativePermissionsDeepLinks.test.ts, src/test/nativeStoreListingCanonicalUrls.test.ts, src/test/nativeStoreAssets.test.ts, src/test/nativeStoreScreenshotSpecs.test.ts, src/test/nativeSubmissionCommands.test.ts, src/test/nativeVersionReleaseAlignment.test.ts, src/test/nativeReleaseChecklist.test.ts, src/test/nativeSafeAreaBridgeContracts.test.ts, src/test/otaDeployBypass.test.ts, scripts/qa/native-app-contracts.mjs, scripts/native/doctor.mjs
3. Customer, Shop Owner, Staff, Driver, Creator, Admin Workflows (high)
   - Test coverage ratio: 0.0196
   - Evidence: implementation=3645, tests=104, targetTests=106
   - Test files needed: toHigh=0, toOk=2
   - Next action: Keep customer booking, shop owner, staff, driver, creator, support, and admin role workflows green.
   - Verification: npm run qa:customer-booking-contracts && npm run qa:shop-owner-contracts && npm run qa:client-staff-contracts && npm run test -- src/test/roleWorkflowMatrix.test.ts src/test/crossVerticalRoleNavigation.test.ts src/test/staffDriverCreatorRoleAccess.test.ts src/test/merchantPayoutOwnerOpsAccess.test.ts src/test/adminModerationRoleAccess.test.ts src/test/adminSupportAccountRoleAccess.test.ts && npx playwright test tests/e2e/customer-booking-payment.spec.ts tests/e2e/shop-owner-dashboard-permissions.spec.ts tests/e2e/staff-driver-creator-role-access.spec.ts
   - Suggested test files: src/test/roleWorkflowMatrix.test.ts, src/test/crossVerticalRoleNavigation.test.ts, src/test/staffDriverCreatorRoleAccess.test.ts, src/test/merchantPayoutOwnerOpsAccess.test.ts, src/test/adminModerationRoleAccess.test.ts, src/test/adminSupportAccountRoleAccess.test.ts, tests/e2e/customer-booking-payment.spec.ts, tests/e2e/shop-owner-dashboard-permissions.spec.ts, tests/e2e/staff-driver-creator-role-access.spec.ts

## Release Lanes

### Release Safety Foundation

- Evidence matches: 1597
- Evidence breakdown: pages=18, components=20, otherSource=16, edgeFunctions=199, migrations=1135, tests=90, docs=119
- Test gap: priority=ok, implementationEvidence=1388, testEvidence=90, targetTestEvidence=32, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0564
- Suggested test files: src/test/releaseSafetyPreflight.test.ts, src/test/releaseSafetyMigrationDrift.test.ts, src/test/releaseSafetyArtifactContracts.test.ts, src/test/releaseSafetyProductionSecretsContracts.test.ts, src/test/deployEnvPreflight.test.ts, src/test/deployWorkflowGates.test.ts, src/test/secretScanner.test.ts
- Next action: Resolve production preflight blockers and keep Supabase token misuse/leakage tests green before schema pushes or production deploys.
- Verification: npm run test -- src/test/deployEnvPreflight.test.ts src/test/secretScanner.test.ts && npm run deploy:preflight:strict && npm run security:scan && npm run supabase:upgrade-readiness
- Sample evidence:
  - src/pages/ChatHubPage.tsx
  - src/pages/FeedPage.tsx
  - src/pages/FlightReview.tsx
  - src/pages/FlightTravelerInfo.tsx
  - src/pages/InspectionViewPage.tsx
  - src/pages/MonetizationArticlesPage.tsx
  - src/pages/SecurityStatus.tsx
  - src/pages/account/ActivityLogPage.tsx
  - src/pages/account/LegalPoliciesPage.tsx
  - src/pages/account/LinkDevicePage.tsx

### Auth, SSO, Sessions, and Account Protection

- Evidence matches: 3195
- Evidence breakdown: pages=484, components=364, otherSource=248, edgeFunctions=414, migrations=834, tests=108, docs=743
- Test gap: priority=ok, implementationEvidence=2344, testEvidence=108, targetTestEvidence=64, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0338
- Suggested test files: tests/e2e/auth-sso-role-matrix.spec.ts, src/test/authSessionSecurity.test.ts, tests/e2e/admin-two-step-required.spec.ts
- Next action: Keep OAuth, passwordless OTP, MFA step-up, trusted devices, active sessions, and role-aware route gates green.
- Verification: npm run qa:sso-auth-contracts && npm run test -- src/test/authSessionSecurity.test.ts src/test/workflows/sso-auth-sessions.test.ts && npx playwright test tests/e2e/sso-session-roles.spec.ts tests/e2e/auth-sso-role-matrix.spec.ts tests/e2e/admin-two-step-required.spec.ts && npm run test:e2e -- tests/e2e/mobile-auth-feed-smoke.spec.ts
- Sample evidence:
  - src/pages/AMAPage.tsx
  - src/pages/About.tsx
  - src/pages/ActivityFeedPage.tsx
  - src/pages/AffiliateHubPage.tsx
  - src/pages/AffiliateLinksPage.tsx
  - src/pages/AppSettingsPage.tsx
  - src/pages/AudioSpacesPage.tsx
  - src/pages/AuthCallback.tsx
  - src/pages/AuthHandoff.tsx
  - src/pages/AutoMessagesLogPage.tsx

### Customer, Shop Owner, Staff, Driver, Creator, Admin Workflows

- Evidence matches: 5293
- Evidence breakdown: pages=695, components=1154, otherSource=505, edgeFunctions=451, migrations=840, tests=104, docs=1544
- Test gap: priority=high, implementationEvidence=3645, testEvidence=104, targetTestEvidence=106, testsNeededForHigh=0, testsNeededForOk=2, testCoverageRatio=0.0196
- Suggested test files: src/test/roleWorkflowMatrix.test.ts, src/test/crossVerticalRoleNavigation.test.ts, src/test/staffDriverCreatorRoleAccess.test.ts, src/test/merchantPayoutOwnerOpsAccess.test.ts, src/test/adminModerationRoleAccess.test.ts, src/test/adminSupportAccountRoleAccess.test.ts, tests/e2e/customer-booking-payment.spec.ts, tests/e2e/shop-owner-dashboard-permissions.spec.ts, tests/e2e/staff-driver-creator-role-access.spec.ts
- Next action: Keep customer booking, shop owner, staff, driver, creator, support, and admin role workflows green.
- Verification: npm run qa:customer-booking-contracts && npm run qa:shop-owner-contracts && npm run qa:client-staff-contracts && npm run test -- src/test/roleWorkflowMatrix.test.ts src/test/crossVerticalRoleNavigation.test.ts src/test/staffDriverCreatorRoleAccess.test.ts src/test/merchantPayoutOwnerOpsAccess.test.ts src/test/adminModerationRoleAccess.test.ts src/test/adminSupportAccountRoleAccess.test.ts && npx playwright test tests/e2e/customer-booking-payment.spec.ts tests/e2e/shop-owner-dashboard-permissions.spec.ts tests/e2e/staff-driver-creator-role-access.spec.ts
- Sample evidence:
  - src/pages/AITripPlanner.tsx
  - src/pages/AMAPage.tsx
  - src/pages/ARFiltersPage.tsx
  - src/pages/About.tsx
  - src/pages/AccountDeletionInfo.tsx
  - src/pages/AchievementsPage.tsx
  - src/pages/ActivityFeedPage.tsx
  - src/pages/AdminContentReportsPage.tsx
  - src/pages/AdminModerationPage.tsx
  - src/pages/AdultDiscoveryPage.tsx

### Payments, Payouts, Refunds, and Webhooks

- Evidence matches: 1951
- Evidence breakdown: pages=350, components=400, otherSource=133, edgeFunctions=226, migrations=270, tests=71, docs=501
- Test gap: priority=ok, implementationEvidence=1379, testEvidence=71, targetTestEvidence=40, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0364
- Suggested test files: src/test/paymentWebhookIdempotency.test.ts, src/test/payoutAuthorization.test.ts, tests/e2e/checkout-refund-state.spec.ts
- Next action: Keep provider webhooks, checkout/refund state, payout auth, idempotency, and wallet ledgers green.
- Verification: npm run qa:payments-refunds-contracts && npm run qa:payouts-earnings-contracts && npm run test -- src/test/paymentWebhookIdempotency.test.ts src/test/payoutAuthorization.test.ts && npx playwright test tests/e2e/checkout-refund-state.spec.ts && npm run security:api-readiness:report
- Sample evidence:
  - src/pages/About.tsx
  - src/pages/AccountDeletionInfo.tsx
  - src/pages/AchievementsPage.tsx
  - src/pages/ActivityFeedPage.tsx
  - src/pages/AffiliateDisclosure.tsx
  - src/pages/AffiliateHubPage.tsx
  - src/pages/AirportPage.tsx
  - src/pages/AppSettingsPage.tsx
  - src/pages/AutoMessagesLogPage.tsx
  - src/pages/AvatarMoodsPage.tsx

### Email, Push, SMS, and Marketing

- Evidence matches: 1764
- Evidence breakdown: pages=302, components=339, otherSource=226, edgeFunctions=225, migrations=264, tests=72, docs=336
- Test gap: priority=ok, implementationEvidence=1356, testEvidence=72, targetTestEvidence=36, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0408
- Suggested test files: src/test/marketingConsentSuppression.test.ts, src/test/pushTokenLifecycle.test.ts, tests/e2e/transactional-vs-marketing-messages.spec.ts
- Next action: Keep transactional-vs-marketing separation, suppression, consent, push tokens, digest dispatch, and campaign event logging green.
- Verification: npm run qa:email-marketing-contracts && npm run qa:push-notification-contracts && npm run test -- src/test/marketingConsentSuppression.test.ts src/test/pushTokenLifecycle.test.ts src/test/workflows/email-marketing-consent.test.ts src/test/workflows/push-notifications-workflow.test.ts && npx playwright test tests/e2e/transactional-vs-marketing-messages.spec.ts && npm run security:api-readiness:report
- Sample evidence:
  - src/pages/AMAPage.tsx
  - src/pages/About.tsx
  - src/pages/AccountDeletionInfo.tsx
  - src/pages/ActivityFeedPage.tsx
  - src/pages/AffiliateDisclosure.tsx
  - src/pages/AffiliateHubPage.tsx
  - src/pages/AppSettingsPage.tsx
  - src/pages/AudioSpacesPage.tsx
  - src/pages/AuthCallback.tsx
  - src/pages/AutoMessagesLogPage.tsx

### Database, Storage, and Media

- Evidence matches: 4048
- Evidence breakdown: pages=530, components=550, otherSource=282, edgeFunctions=474, migrations=892, tests=135, docs=1185
- Test gap: priority=ok, implementationEvidence=2728, testEvidence=135, targetTestEvidence=81, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0333
- Suggested test files: src/test/rls/dataApiGrantCoverage.test.ts, src/test/fileUploadSecurity.test.ts, src/test/storageBucketPolicies.test.ts, tests/e2e/media-upload-delete-retention.spec.ts
- Next action: Keep `npm run qa:database-storage-contracts`, `npm run qa:storage-media-contracts`, and `npm run platform:test:storage-media` green for Data API grants, RLS, storage policies, signed media, upload validation, Postgres upgrade checks, and media/CDN gates.
- Verification: npm run qa:database-storage-contracts && npm run qa:storage-media-contracts && npm run platform:test:storage-media && npm run test:rls && npm run perf:media-report && npm run supabase:migrations:linked:strict
- Sample evidence:
  - src/pages/AITripPlanner.tsx
  - src/pages/AMAPage.tsx
  - src/pages/About.tsx
  - src/pages/AccountDeletionInfo.tsx
  - src/pages/AchievementsPage.tsx
  - src/pages/ActivityFeedPage.tsx
  - src/pages/AdminContentReportsPage.tsx
  - src/pages/AdminModerationPage.tsx
  - src/pages/AdultDiscoveryPage.tsx
  - src/pages/AffiliateDisclosure.tsx

### Security, Anti-Abuse, and Hacker Protection

- Evidence matches: 3323
- Evidence breakdown: pages=325, components=434, otherSource=111, edgeFunctions=457, migrations=738, tests=98, docs=1160
- Test gap: priority=ok, implementationEvidence=2065, testEvidence=98, targetTestEvidence=67, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0295
- Suggested test files: src/test/securityAttackDrills.test.ts, src/test/rateLimitRiskDecisions.test.ts, tests/e2e/account-takeover-protection.spec.ts
- Next action: Keep account takeover, card testing, spam, scraping, fake booking, key leakage, WAF, rate-limit, network-risk, and strict preflight controls green.
- Verification: npm run qa:security-anti-abuse-contracts && npm run test -- src/test/securityAttackDrills.test.ts src/test/rateLimitRiskDecisions.test.ts src/test/workflows/security-anti-abuse.test.ts && npx playwright test tests/e2e/account-takeover-protection.spec.ts && npm run security:scan && npm run security:api-readiness:report && npm run deploy:preflight:strict
- Sample evidence:
  - src/pages/AITripPlanner.tsx
  - src/pages/AMAPage.tsx
  - src/pages/ARFiltersPage.tsx
  - src/pages/About.tsx
  - src/pages/AccountDeletionInfo.tsx
  - src/pages/ActivityFeedPage.tsx
  - src/pages/AdminContentReportsPage.tsx
  - src/pages/AdultDiscoveryPage.tsx
  - src/pages/AppSettingsPage.tsx
  - src/pages/AudioSpacesPage.tsx

### Law, Policy, Compliance, and Trust

- Evidence matches: 4535
- Evidence breakdown: pages=705, components=1283, otherSource=630, edgeFunctions=196, migrations=765, tests=98, docs=858
- Test gap: priority=ok, implementationEvidence=3579, testEvidence=98, targetTestEvidence=91, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0216
- Suggested test files: src/test/legalRouteSurface.test.ts, src/test/legalHubCanonicalLinks.test.ts, src/test/publicLegalNavigationCanonical.test.ts, src/test/checkoutLegalCanonicalLinks.test.ts, src/test/accountDeletionDataRightsLinks.test.ts, src/test/travelLegalCanonicalLinks.test.ts, src/test/groceryBusinessLegalCanonicalLinks.test.ts, src/test/legalPolicyPageRelatedLinks.test.ts, src/test/supportFlightLegalCanonicalLinks.test.ts, src/test/residualPublicLegalCanonicalLinks.test.ts, src/test/legalCanonicalSeoUrls.test.ts, src/test/policyAcceptanceVersioning.test.ts, src/test/legalAcceptanceEdgeAllowlists.test.ts, src/test/accountDeletionLifecycle.test.ts, src/test/accountExportManifest.test.ts, src/test/privacyExportDeletePromises.test.ts, src/test/legalTrustIntakeContracts.test.ts, src/test/refundSupportTrustIntake.test.ts, src/test/creatorMonetizationLegalDisclosure.test.ts, src/test/adsMarketingPrivacyDisclosure.test.ts, src/test/adsMarketingConsentRuntime.test.ts, src/test/marketingLeadPrivacyIntake.test.ts, src/test/ageEligibilitySafetyDisclosure.test.ts, src/test/aiAutomatedDecisionDisclosure.test.ts, src/test/automatedLegalPolicyHub.test.ts, src/test/dataRightsLegalPolicyHub.test.ts, src/test/sensitiveDataLegalPolicyHub.test.ts, tests/e2e/refund-policy-flow.spec.ts
- Next action: Keep legal pages, canonical links, consent logs, export/delete rights, privacy intake, refund support, monetization disclosures, ads consent, AI notices, and policy-backed booking flows green.
- Verification: npm run qa:legal-policy-contracts && npm run test -- src/test/workflows/legal-policy-workflow.test.ts src/test/legalRouteSurface.test.ts src/test/legalHubCanonicalLinks.test.ts src/test/publicLegalNavigationCanonical.test.ts src/test/checkoutLegalCanonicalLinks.test.ts src/test/accountDeletionDataRightsLinks.test.ts src/test/travelLegalCanonicalLinks.test.ts src/test/groceryBusinessLegalCanonicalLinks.test.ts src/test/legalPolicyPageRelatedLinks.test.ts src/test/supportFlightLegalCanonicalLinks.test.ts src/test/residualPublicLegalCanonicalLinks.test.ts src/test/legalCanonicalSeoUrls.test.ts src/test/policyAcceptanceVersioning.test.ts src/test/legalAcceptanceEdgeAllowlists.test.ts src/test/accountDeletionLifecycle.test.ts src/test/accountExportManifest.test.ts src/test/privacyExportDeletePromises.test.ts src/test/legalTrustIntakeContracts.test.ts src/test/refundSupportTrustIntake.test.ts src/test/creatorMonetizationLegalDisclosure.test.ts src/test/adsMarketingPrivacyDisclosure.test.ts src/test/adsMarketingConsentRuntime.test.ts src/test/marketingLeadPrivacyIntake.test.ts src/test/ageEligibilitySafetyDisclosure.test.ts src/test/aiAutomatedDecisionDisclosure.test.ts src/test/automatedLegalPolicyHub.test.ts src/test/dataRightsLegalPolicyHub.test.ts src/test/sensitiveDataLegalPolicyHub.test.ts && npx playwright test tests/e2e/refund-policy-flow.spec.ts && npm run security:api-readiness:report
- Sample evidence:
  - src/pages/AITripPlanner.tsx
  - src/pages/AMAPage.tsx
  - src/pages/ARFiltersPage.tsx
  - src/pages/About.tsx
  - src/pages/AccountDeletionInfo.tsx
  - src/pages/AchievementsPage.tsx
  - src/pages/ActivityFeedPage.tsx
  - src/pages/AdminContentReportsPage.tsx
  - src/pages/AdminModerationPage.tsx
  - src/pages/AdultDiscoveryPage.tsx

### Frontend, Graphics, Design, and Speed

- Evidence matches: 3981
- Evidence breakdown: pages=632, components=781, otherSource=447, edgeFunctions=432, migrations=211, tests=62, docs=1416
- Test gap: priority=high, implementationEvidence=2503, testEvidence=62, targetTestEvidence=80, testsNeededForHigh=0, testsNeededForOk=18, testCoverageRatio=0.0156
- Suggested test files: tests/visual/workflow-visual-readiness.spec.ts, tests/e2e/mobile-layout-no-overlap.spec.ts, src/test/visualWorkflowCoverageContracts.test.ts, src/test/safeAreaVisualBaselineContracts.test.ts, src/test/feedMobileVisualContracts.test.ts, src/test/mobileBottomNavVisualContracts.test.ts, src/test/createPostComposerVisualContracts.test.ts, src/test/mediaRenderingPerformanceContracts.test.ts, src/test/feedResponsiveShellContracts.test.ts, src/test/loadingEmptyReliabilityContracts.test.ts, src/test/loadingErrorStates.test.tsx
- Next action: Keep visual route coverage, compact mobile feed controls, safe-area baselines, bottom navigation, composer controls, lazy media, loading/error states, and no-overlap checks green.
- Verification: npm run qa:frontend-visual-contracts && npm run test -- src/test/visualWorkflowCoverageContracts.test.ts src/test/safeAreaVisualBaselineContracts.test.ts src/test/feedMobileVisualContracts.test.ts src/test/mobileBottomNavVisualContracts.test.ts src/test/createPostComposerVisualContracts.test.ts src/test/mediaRenderingPerformanceContracts.test.ts src/test/feedResponsiveShellContracts.test.ts src/test/loadingEmptyReliabilityContracts.test.ts src/test/loadingErrorStates.test.tsx && npx playwright test tests/e2e/mobile-layout-no-overlap.spec.ts && npm run test:visual && npm run qa:safe-area:all && npm run perf:media-report && npm run build
- Sample evidence:
  - src/pages/AITripPlanner.tsx
  - src/pages/AMAPage.tsx
  - src/pages/ARFiltersPage.tsx
  - src/pages/AchievementsPage.tsx
  - src/pages/ActivityFeedPage.tsx
  - src/pages/AdminContentReportsPage.tsx
  - src/pages/AdminModerationPage.tsx
  - src/pages/AdultDiscoveryPage.tsx
  - src/pages/AffiliateHubPage.tsx
  - src/pages/AffiliateLinksPage.tsx

### Native iOS, Android, OTA, and Store Release

- Evidence matches: 2536
- Evidence breakdown: pages=506, components=518, otherSource=224, edgeFunctions=102, migrations=164, tests=47, docs=975
- Test gap: priority=high, implementationEvidence=1514, testEvidence=47, targetTestEvidence=51, testsNeededForHigh=0, testsNeededForOk=4, testCoverageRatio=0.0185
- Suggested test files: src/test/workflows/native-app-release.test.ts, src/test/nativePermissionsDeepLinks.test.ts, src/test/nativeStoreListingCanonicalUrls.test.ts, src/test/nativeStoreAssets.test.ts, src/test/nativeStoreScreenshotSpecs.test.ts, src/test/nativeSubmissionCommands.test.ts, src/test/nativeVersionReleaseAlignment.test.ts, src/test/nativeReleaseChecklist.test.ts, src/test/nativeSafeAreaBridgeContracts.test.ts, src/test/otaDeployBypass.test.ts, scripts/qa/native-app-contracts.mjs, scripts/native/doctor.mjs
- Next action: Keep Capacitor config, native permissions, deep links, push extensions, iOS/Android store metadata, screenshots, safe-area bridge, OTA bypass safety, version alignment, native sync, and simulator/debug builds green.
- Verification: npm run qa:native-app-contracts && npm run test -- src/test/workflows/native-app-release.test.ts src/test/nativePermissionsDeepLinks.test.ts src/test/nativeStoreListingCanonicalUrls.test.ts src/test/nativeStoreAssets.test.ts src/test/nativeStoreScreenshotSpecs.test.ts src/test/nativeSubmissionCommands.test.ts src/test/nativeVersionReleaseAlignment.test.ts src/test/nativeReleaseChecklist.test.ts src/test/nativeSafeAreaBridgeContracts.test.ts src/test/otaDeployBypass.test.ts && npm run native:doctor && npm run native:sync && npm run ios:build:sim && npm run android:build:debug
- Sample evidence:
  - src/pages/AITripPlanner.tsx
  - src/pages/AMAPage.tsx
  - src/pages/ARFiltersPage.tsx
  - src/pages/About.tsx
  - src/pages/AchievementsPage.tsx
  - src/pages/ActivityFeedPage.tsx
  - src/pages/AdminContentReportsPage.tsx
  - src/pages/AdminModerationPage.tsx
  - src/pages/AdultDiscoveryPage.tsx
  - src/pages/AffiliateHubPage.tsx

### API, Server Speed, Observability, and Operations

- Evidence matches: 4956
- Evidence breakdown: pages=684, components=1140, otherSource=609, edgeFunctions=474, migrations=628, tests=123, docs=1298
- Test gap: priority=ok, implementationEvidence=3535, testEvidence=123, targetTestEvidence=100, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0248
- Suggested test files: src/test/apiObservabilityContracts.test.ts, src/test/webhookFailureAlerting.test.ts, src/test/apiOperationsReportSurfaces.test.ts, tests/e2e/server-error-fallbacks.spec.ts
- Next action: Keep wrapper observability, preflight artifacts, runtime settings, operations runbook owners, webhook failure surfaces, cron monitors, server-error fallbacks, and API readiness green.
- Verification: npm run qa:api-operations-contracts && npm run test -- src/test/workflows/api-operations-readiness.test.ts src/test/apiObservabilityContracts.test.ts src/test/webhookFailureAlerting.test.ts src/test/apiOperationsReportSurfaces.test.ts && npx playwright test tests/e2e/server-error-fallbacks.spec.ts && npm run security:api-readiness:report && npm run deploy:preflight:strict
- Sample evidence:
  - src/pages/AITripPlanner.tsx
  - src/pages/AMAPage.tsx
  - src/pages/ARFiltersPage.tsx
  - src/pages/AchievementsPage.tsx
  - src/pages/ActivityFeedPage.tsx
  - src/pages/AdminContentReportsPage.tsx
  - src/pages/AdminModerationPage.tsx
  - src/pages/AdultDiscoveryPage.tsx
  - src/pages/AffiliateHubPage.tsx
  - src/pages/AffiliateLinksPage.tsx

