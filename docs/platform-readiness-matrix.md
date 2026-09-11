# Platform Readiness Matrix

Generated: 2026-09-09T16:13:17.424Z

## Current Gate

- Mode: strict
- Current gate ready: yes
- Production gate ready: yes
- Remote migration history status: read

## Production Blockers

- None

## Inventory Totals

- Page files: 731
- Component files: 1355
- Source files scanned: 2839
- Supabase Edge Functions: 484
- Supabase migrations: 1183
- Test files: 347
- Docs files: 1611

## Priority Test Gap Actions

- No priority test gaps detected.

## Release Lanes

### Release Safety Foundation

- Evidence matches: 1724
- Evidence breakdown: pages=19, components=20, otherSource=20, edgeFunctions=211, migrations=1183, tests=139, docs=132
- Test gap: priority=ok, implementationEvidence=1453, testEvidence=139, targetTestEvidence=35, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0806
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

- Evidence matches: 3466
- Evidence breakdown: pages=497, components=389, otherSource=289, edgeFunctions=423, migrations=876, tests=219, docs=773
- Test gap: priority=ok, implementationEvidence=2474, testEvidence=219, targetTestEvidence=70, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0632
- Suggested test files: tests/e2e/auth-sso-role-matrix.spec.ts, src/test/authSessionSecurity.test.ts, tests/e2e/admin-two-step-required.spec.ts
- Next action: Keep OAuth, passwordless OTP, MFA step-up, trusted devices, active sessions, and role-aware route gates green.
- Verification: npm run qa:sso-auth-contracts && npm run test -- src/test/authSessionSecurity.test.ts src/test/workflows/sso-auth-sessions.test.ts && npx playwright test tests/e2e/sso-session-roles.spec.ts tests/e2e/auth-sso-role-matrix.spec.ts tests/e2e/admin-two-step-required.spec.ts && npm run test:e2e -- tests/e2e/mobile-auth-feed-smoke.spec.ts
- Sample evidence:
  - src/pages/AMAPage.tsx
  - src/pages/About.tsx
  - src/pages/ActivityFeedPage.tsx
  - src/pages/AdminContentReportsPage.tsx
  - src/pages/AdminModerationPage.tsx
  - src/pages/AffiliateHubPage.tsx
  - src/pages/AffiliateLinksPage.tsx
  - src/pages/AppSettingsPage.tsx
  - src/pages/AudioSpacesPage.tsx
  - src/pages/AuthCallback.tsx

### Customer, Shop Owner, Staff, Driver, Support, Admin Workflows

- Evidence matches: 5576
- Evidence breakdown: pages=708, components=1185, otherSource=549, edgeFunctions=454, migrations=881, tests=220, docs=1579
- Test gap: priority=ok, implementationEvidence=3777, testEvidence=220, targetTestEvidence=112, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0395
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

- Evidence matches: 2134
- Evidence breakdown: pages=350, components=417, otherSource=157, edgeFunctions=236, migrations=289, tests=155, docs=530
- Test gap: priority=ok, implementationEvidence=1449, testEvidence=155, targetTestEvidence=43, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0726
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

- Evidence matches: 1890
- Evidence breakdown: pages=307, components=348, otherSource=247, edgeFunctions=229, migrations=279, tests=121, docs=359
- Test gap: priority=ok, implementationEvidence=1410, testEvidence=121, targetTestEvidence=38, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.064
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

- Evidence matches: 4347
- Evidence breakdown: pages=549, components=572, otherSource=317, edgeFunctions=484, migrations=935, tests=270, docs=1220
- Test gap: priority=ok, implementationEvidence=2857, testEvidence=270, targetTestEvidence=87, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0621
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

- Evidence matches: 3517
- Evidence breakdown: pages=334, components=452, otherSource=129, edgeFunctions=467, migrations=776, tests=165, docs=1194
- Test gap: priority=ok, implementationEvidence=2158, testEvidence=165, targetTestEvidence=71, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0469
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
  - src/pages/AdminModerationPage.tsx
  - src/pages/AdultDiscoveryPage.tsx
  - src/pages/AppSettingsPage.tsx

### Law, Policy, Compliance, and Trust

- Evidence matches: 4773
- Evidence breakdown: pages=713, components=1303, otherSource=674, edgeFunctions=222, migrations=801, tests=168, docs=892
- Test gap: priority=ok, implementationEvidence=3713, testEvidence=168, targetTestEvidence=96, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0352
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

- Evidence matches: 4193
- Evidence breakdown: pages=645, components=800, otherSource=486, edgeFunctions=442, migrations=225, tests=148, docs=1447
- Test gap: priority=ok, implementationEvidence=2598, testEvidence=148, targetTestEvidence=84, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0353
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

- Evidence matches: 2685
- Evidence breakdown: pages=511, components=535, otherSource=245, edgeFunctions=113, migrations=182, tests=102, docs=997
- Test gap: priority=ok, implementationEvidence=1586, testEvidence=102, targetTestEvidence=54, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.038
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

- Evidence matches: 5251
- Evidence breakdown: pages=701, components=1168, otherSource=658, edgeFunctions=484, migrations=672, tests=237, docs=1331
- Test gap: priority=ok, implementationEvidence=3683, testEvidence=237, targetTestEvidence=106, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0451
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

