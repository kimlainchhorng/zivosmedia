# Platform Readiness Matrix

Generated: 2026-06-01T12:45:14.477Z

## Current Gate

- Mode: strict
- Current gate ready: no
- Production gate ready: no
- Remote migration history status: access_token_missing

## Production Blockers

- Environment readiness has 3 critical finding(s).
- Missing SUPABASE_URL for production backend cron/runtime settings.
- Missing SUPABASE_ANON_KEY for production Edge Function verification and database cron auth.
- Missing SUPABASE_ACCESS_TOKEN for production migration-history verification.
- API readiness has 1 warning(s).
- Supabase remote migration history is unavailable (access_token_missing).

## Inventory Totals

- Page files: 691
- Component files: 1344
- Source files scanned: 2644
- Supabase Edge Functions: 397
- Supabase migrations: 1048
- Test files: 137
- Docs files: 29

## Priority Test Gap Actions

- No priority test gaps detected.

## Release Lanes

### Release Safety Foundation

- Evidence matches: 1388
- Evidence breakdown: pages=15, components=19, otherSource=15, edgeFunctions=192, migrations=1048, tests=73, docs=26
- Test gap: priority=ok, implementationEvidence=1289, testEvidence=73, targetTestEvidence=28, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0526
- Suggested test files: src/test/releaseSafetyPreflight.test.ts, src/test/releaseSafetyMigrationDrift.test.ts, src/test/releaseSafetyArtifactContracts.test.ts, src/test/releaseSafetyProductionSecretsContracts.test.ts, src/test/deployEnvPreflight.test.ts, src/test/deployWorkflowGates.test.ts, src/test/secretScanner.test.ts
- Next action: Resolve production preflight blockers and keep Supabase token misuse/leakage tests green before schema pushes or production deploys.
- Verification: npm run test -- src/test/deployEnvPreflight.test.ts src/test/secretScanner.test.ts && npm run deploy:preflight:strict && npm run security:scan && npm run supabase:upgrade-readiness
- Sample evidence:
  - src/pages/ChatHubPage.tsx
  - src/pages/FeedPage.tsx
  - src/pages/InspectionViewPage.tsx
  - src/pages/MonetizationArticlesPage.tsx
  - src/pages/SecurityStatus.tsx
  - src/pages/account/ActivityLogPage.tsx
  - src/pages/account/LegalPoliciesPage.tsx
  - src/pages/account/LinkDevicePage.tsx
  - src/pages/admin/AdminTelegramSystemPage.tsx
  - src/pages/admin/HotelAdminLaunchPage.tsx

### Auth, SSO, Sessions, and Account Protection

- Evidence matches: 2313
- Evidence breakdown: pages=464, components=359, otherSource=227, edgeFunctions=385, migrations=770, tests=86, docs=22
- Test gap: priority=ok, implementationEvidence=2205, testEvidence=86, targetTestEvidence=47, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0372
- Suggested test files: tests/e2e/auth-sso-role-matrix.spec.ts, src/test/authSessionSecurity.test.ts, tests/e2e/admin-two-step-required.spec.ts
- Next action: Keep OAuth, passwordless OTP, MFA step-up, trusted devices, active sessions, and role-aware route gates green.
- Verification: npm run qa:sso-auth-contracts && npm run test -- src/test/authSessionSecurity.test.ts src/test/workflows/sso-auth-sessions.test.ts && npx playwright test tests/e2e/sso-session-roles.spec.ts tests/e2e/auth-sso-role-matrix.spec.ts tests/e2e/admin-two-step-required.spec.ts && npm run test:e2e -- tests/e2e/mobile-auth-feed-smoke.spec.ts
- Sample evidence:
  - src/pages/AITripPlanner.tsx
  - src/pages/AMAPage.tsx
  - src/pages/About.tsx
  - src/pages/ActivityFeedPage.tsx
  - src/pages/AffiliateHubPage.tsx
  - src/pages/AffiliateLinksPage.tsx
  - src/pages/AppSettingsPage.tsx
  - src/pages/AudioSpacesPage.tsx
  - src/pages/AuthCallback.tsx
  - src/pages/AutoMessagesLogPage.tsx

### Customer, Shop Owner, Staff, Driver, Creator, Admin Workflows

- Evidence matches: 3579
- Evidence breakdown: pages=678, components=1186, otherSource=449, edgeFunctions=392, migrations=772, tests=82, docs=20
- Test gap: priority=ok, implementationEvidence=3477, testEvidence=82, targetTestEvidence=72, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0229
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

- Evidence matches: 1367
- Evidence breakdown: pages=332, components=411, otherSource=120, edgeFunctions=179, migrations=249, tests=61, docs=15
- Test gap: priority=ok, implementationEvidence=1291, testEvidence=61, targetTestEvidence=28, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0446
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

- Evidence matches: 1375
- Evidence breakdown: pages=297, components=339, otherSource=204, edgeFunctions=213, migrations=246, tests=61, docs=15
- Test gap: priority=ok, implementationEvidence=1299, testEvidence=61, targetTestEvidence=28, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0444
- Suggested test files: src/test/marketingConsentSuppression.test.ts, src/test/pushTokenLifecycle.test.ts, tests/e2e/transactional-vs-marketing-messages.spec.ts
- Next action: Keep transactional-vs-marketing separation, suppression, consent, push tokens, digest dispatch, and campaign event logging green.
- Verification: npm run qa:email-marketing-contracts && npm run qa:push-notification-contracts && npm run test -- src/test/marketingConsentSuppression.test.ts src/test/pushTokenLifecycle.test.ts src/test/workflows/email-marketing-consent.test.ts src/test/workflows/push-notifications-workflow.test.ts && npx playwright test tests/e2e/transactional-vs-marketing-messages.spec.ts && npm run security:api-readiness:report
- Sample evidence:
  - src/pages/AMAPage.tsx
  - src/pages/About.tsx
  - src/pages/AccountDeletionInfo.tsx
  - src/pages/ActivityFeedPage.tsx
  - src/pages/AffiliateDisclosure.tsx
  - src/pages/AppSettingsPage.tsx
  - src/pages/AudioSpacesPage.tsx
  - src/pages/AuthCallback.tsx
  - src/pages/AutoMessagesLogPage.tsx
  - src/pages/BookingManagement.tsx

### Database, Storage, and Media

- Evidence matches: 2614
- Evidence breakdown: pages=478, components=549, otherSource=239, edgeFunctions=397, migrations=820, tests=106, docs=25
- Test gap: priority=ok, implementationEvidence=2483, testEvidence=106, targetTestEvidence=53, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0406
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
  - src/pages/AffiliateHubPage.tsx

### Security, Anti-Abuse, and Hacker Protection

- Evidence matches: 2028
- Evidence breakdown: pages=310, components=433, otherSource=91, edgeFunctions=397, migrations=687, tests=86, docs=24
- Test gap: priority=ok, implementationEvidence=1918, testEvidence=86, targetTestEvidence=41, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0424
- Suggested test files: src/test/securityAttackDrills.test.ts, src/test/rateLimitRiskDecisions.test.ts, tests/e2e/account-takeover-protection.spec.ts
- Next action: Keep account takeover, card testing, spam, scraping, fake booking, key leakage, WAF, rate-limit, network-risk, and strict preflight controls green.
- Verification: npm run qa:security-anti-abuse-contracts && npm run test -- src/test/securityAttackDrills.test.ts src/test/rateLimitRiskDecisions.test.ts src/test/workflows/security-anti-abuse.test.ts && npx playwright test tests/e2e/account-takeover-protection.spec.ts && npm run security:scan && npm run security:api-readiness:report && npm run deploy:preflight:strict
- Sample evidence:
  - src/pages/AMAPage.tsx
  - src/pages/ARFiltersPage.tsx
  - src/pages/About.tsx
  - src/pages/AccountDeletionInfo.tsx
  - src/pages/ActivityFeedPage.tsx
  - src/pages/AdminContentReportsPage.tsx
  - src/pages/AdultDiscoveryPage.tsx
  - src/pages/AppSettingsPage.tsx
  - src/pages/AudioSpacesPage.tsx
  - src/pages/AuthCallback.tsx

### Law, Policy, Compliance, and Trust

- Evidence matches: 3568
- Evidence breakdown: pages=689, components=1309, otherSource=578, edgeFunctions=168, migrations=720, tests=86, docs=18
- Test gap: priority=ok, implementationEvidence=3464, testEvidence=86, targetTestEvidence=72, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0241
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

- Evidence matches: 2486
- Evidence breakdown: pages=616, components=788, otherSource=415, edgeFunctions=396, migrations=197, tests=53, docs=21
- Test gap: priority=ok, implementationEvidence=2412, testEvidence=53, targetTestEvidence=50, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0213
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

- Evidence matches: 1552
- Evidence breakdown: pages=500, components=532, otherSource=213, edgeFunctions=95, migrations=150, tests=42, docs=20
- Test gap: priority=ok, implementationEvidence=1490, testEvidence=42, targetTestEvidence=32, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0271
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

- Evidence matches: 3481
- Evidence breakdown: pages=664, components=1171, otherSource=558, edgeFunctions=397, migrations=568, tests=98, docs=25
- Test gap: priority=ok, implementationEvidence=3358, testEvidence=98, targetTestEvidence=70, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0282
- Suggested test files: src/test/apiObservabilityContracts.test.ts, src/test/webhookFailureAlerting.test.ts, src/test/apiOperationsReportSurfaces.test.ts, tests/e2e/server-error-fallbacks.spec.ts
- Next action: Keep wrapper observability, preflight artifacts, runtime settings, operations runbook owners, webhook failure surfaces, cron monitors, server-error fallbacks, and API readiness green.
- Verification: npm run qa:api-operations-contracts && npm run test -- src/test/workflows/api-operations-readiness.test.ts src/test/apiObservabilityContracts.test.ts src/test/webhookFailureAlerting.test.ts src/test/apiOperationsReportSurfaces.test.ts && npx playwright test tests/e2e/server-error-fallbacks.spec.ts && npm run security:api-readiness:report && npm run deploy:preflight:strict
- Sample evidence:
  - src/pages/AMAPage.tsx
  - src/pages/ARFiltersPage.tsx
  - src/pages/AchievementsPage.tsx
  - src/pages/ActivityFeedPage.tsx
  - src/pages/AdminContentReportsPage.tsx
  - src/pages/AdminModerationPage.tsx
  - src/pages/AdultDiscoveryPage.tsx
  - src/pages/AffiliateHubPage.tsx
  - src/pages/AffiliateLinksPage.tsx
  - src/pages/AffiliateRedirectPage.tsx

