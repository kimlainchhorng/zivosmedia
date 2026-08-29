# Platform Readiness Matrix

Generated: 2026-08-29T15:51:34.202Z

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

- Page files: 717
- Component files: 1335
- Source files scanned: 2772
- Supabase Edge Functions: 477
- Supabase migrations: 1147
- Test files: 267
- Docs files: 1591

## Priority Test Gap Actions

- No priority test gaps detected.

## Release Lanes

### Release Safety Foundation

- Evidence matches: 1627
- Evidence breakdown: pages=19, components=20, otherSource=18, edgeFunctions=203, migrations=1147, tests=100, docs=120
- Test gap: priority=ok, implementationEvidence=1407, testEvidence=100, targetTestEvidence=33, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0615
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

- Evidence matches: 3300
- Evidence breakdown: pages=484, components=375, otherSource=264, edgeFunctions=417, migrations=843, tests=163, docs=754
- Test gap: priority=ok, implementationEvidence=2383, testEvidence=163, targetTestEvidence=66, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0494
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

### Customer, Shop Owner, Staff, Driver, Support, Admin Workflows

- Evidence matches: 5424
- Evidence breakdown: pages=699, components=1170, otherSource=524, edgeFunctions=454, migrations=850, tests=168, docs=1559
- Test gap: priority=ok, implementationEvidence=3697, testEvidence=168, targetTestEvidence=109, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.031
- Suggested test files: src/test/roleWorkflowMatrix.test.ts, src/test/crossVerticalRoleNavigation.test.ts, src/test/staffDriverCreatorRoleAccess.test.ts, src/test/merchantPayoutOwnerOpsAccess.test.ts, src/test/adminModerationRoleAccess.test.ts, src/test/adminSupportAccountRoleAccess.test.ts, tests/e2e/customer-booking-payment.spec.ts, tests/e2e/shop-owner-dashboard-permissions.spec.ts, tests/e2e/staff-driver-creator-role-access.spec.ts
- Next action: Keep customer booking, shop owner, staff, driver, support, and admin workflows green while creator monetization remains retired.
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

- Evidence matches: 2033
- Evidence breakdown: pages=348, components=409, otherSource=144, edgeFunctions=229, migrations=274, tests=119, docs=510
- Test gap: priority=ok, implementationEvidence=1404, testEvidence=119, targetTestEvidence=41, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0585
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
  - src/pages/AutoMessagesLogPage.tsx
  - src/pages/AvatarMoodsPage.tsx
  - src/pages/BecomePartnerPage.tsx

### Email, Push, SMS, and Marketing

- Evidence matches: 1814
- Evidence breakdown: pages=303, components=343, otherSource=238, edgeFunctions=230, migrations=267, tests=90, docs=343
- Test gap: priority=ok, implementationEvidence=1381, testEvidence=90, targetTestEvidence=37, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0496
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

- Evidence matches: 4182
- Evidence breakdown: pages=540, components=560, otherSource=300, edgeFunctions=477, migrations=904, tests=201, docs=1200
- Test gap: priority=ok, implementationEvidence=2781, testEvidence=201, targetTestEvidence=84, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0481
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

- Evidence matches: 3396
- Evidence breakdown: pages=328, components=440, otherSource=117, edgeFunctions=460, migrations=747, tests=129, docs=1175
- Test gap: priority=ok, implementationEvidence=2092, testEvidence=129, targetTestEvidence=68, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.038
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

- Evidence matches: 4653
- Evidence breakdown: pages=705, components=1290, otherSource=649, edgeFunctions=224, migrations=774, tests=135, docs=876
- Test gap: priority=ok, implementationEvidence=3642, testEvidence=135, targetTestEvidence=94, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.029
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

- Evidence matches: 4063
- Evidence breakdown: pages=637, components=789, otherSource=459, edgeFunctions=435, migrations=213, tests=97, docs=1433
- Test gap: priority=ok, implementationEvidence=2533, testEvidence=97, targetTestEvidence=82, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0239
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

- Evidence matches: 2600
- Evidence breakdown: pages=507, components=522, otherSource=236, edgeFunctions=110, migrations=165, tests=78, docs=982
- Test gap: priority=ok, implementationEvidence=1540, testEvidence=78, targetTestEvidence=52, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.03
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

- Evidence matches: 5071
- Evidence breakdown: pages=689, components=1151, otherSource=632, edgeFunctions=477, migrations=637, tests=173, docs=1312
- Test gap: priority=ok, implementationEvidence=3586, testEvidence=173, targetTestEvidence=102, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0341
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

