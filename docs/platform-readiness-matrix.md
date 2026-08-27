# Platform Readiness Matrix

Generated: 2026-08-27T23:51:33.455Z

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

- Page files: 716
- Component files: 1333
- Source files scanned: 2762
- Supabase Edge Functions: 460
- Supabase migrations: 1147
- Test files: 261
- Docs files: 1632

## Priority Test Gap Actions

- No priority test gaps detected.

## Release Lanes

### Release Safety Foundation

- Evidence matches: 1663
- Evidence breakdown: pages=19, components=20, otherSource=18, edgeFunctions=202, migrations=1147, tests=100, docs=157
- Test gap: priority=ok, implementationEvidence=1406, testEvidence=100, targetTestEvidence=34, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0601
- Suggested test files: src/test/releaseSafetyPreflight.test.ts, src/test/releaseSafetyMigrationDrift.test.ts, src/test/releaseSafetyArtifactContracts.test.ts, src/test/releaseSafetyProductionSecretsContracts.test.ts, src/test/deployEnvPreflight.test.ts, src/test/deployWorkflowGates.test.ts, src/test/secretScanner.test.ts
- Next action: Resolve production preflight blockers and keep Supabase token misuse/leakage tests green before schema pushes or production deploys.
- Verification: npm run test -- src/test/deployEnvPreflight.test.ts src/test/secretScanner.test.ts && npm run deploy:preflight:strict && npm run security:scan && npm run supabase:upgrade-readiness
- Sample evidence:
  - src/pages/account/ActivityLogPage.tsx
  - src/pages/account/LegalPoliciesPage.tsx
  - src/pages/account/LinkDevicePage.tsx
  - src/pages/admin/AdminAdsAnalyticsPage.tsx
  - src/pages/admin/AdminTelegramSystemPage.tsx
  - src/pages/admin/HotelAdminLaunchPage.tsx
  - src/pages/app/CanonicalRidePage.test.tsx
  - src/pages/app/personal/ApplyJobHubPage.tsx
  - src/pages/ChatHubPage.tsx
  - src/pages/FeedPage.tsx

### Auth, SSO, Sessions, and Account Protection

- Evidence matches: 3321
- Evidence breakdown: pages=483, components=373, otherSource=258, edgeFunctions=412, migrations=843, tests=161, docs=791
- Test gap: priority=ok, implementationEvidence=2369, testEvidence=161, targetTestEvidence=67, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0485
- Suggested test files: tests/e2e/auth-sso-role-matrix.spec.ts, src/test/authSessionSecurity.test.ts, tests/e2e/admin-two-step-required.spec.ts
- Next action: Keep OAuth, passwordless OTP, MFA step-up, trusted devices, active sessions, and role-aware route gates green.
- Verification: npm run qa:sso-auth-contracts && npm run test -- src/test/authSessionSecurity.test.ts src/test/workflows/sso-auth-sessions.test.ts && npx playwright test tests/e2e/sso-session-roles.spec.ts tests/e2e/auth-sso-role-matrix.spec.ts tests/e2e/admin-two-step-required.spec.ts && npm run test:e2e -- tests/e2e/mobile-auth-feed-smoke.spec.ts
- Sample evidence:
  - src/pages/About.tsx
  - src/pages/account/AccountAnalyticsPage.tsx
  - src/pages/account/AccountExportPage.tsx
  - src/pages/account/AccountSecurity.tsx
  - src/pages/account/AccountSessionsPage.tsx
  - src/pages/account/AccountSettingsPage.tsx
  - src/pages/account/AccountSubscriptionsPage.tsx
  - src/pages/account/AccountTipsPage.tsx
  - src/pages/account/ActivityLogPage.tsx
  - src/pages/account/AddressesPage.tsx

### Customer, Shop Owner, Staff, Driver, Support, Admin Workflows

- Evidence matches: 5431
- Evidence breakdown: pages=698, components=1167, otherSource=520, edgeFunctions=437, migrations=850, tests=163, docs=1596
- Test gap: priority=ok, implementationEvidence=3672, testEvidence=163, targetTestEvidence=109, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.03
- Suggested test files: src/test/roleWorkflowMatrix.test.ts, src/test/crossVerticalRoleNavigation.test.ts, src/test/staffDriverCreatorRoleAccess.test.ts, src/test/merchantPayoutOwnerOpsAccess.test.ts, src/test/adminModerationRoleAccess.test.ts, src/test/adminSupportAccountRoleAccess.test.ts, tests/e2e/customer-booking-payment.spec.ts, tests/e2e/shop-owner-dashboard-permissions.spec.ts, tests/e2e/staff-driver-creator-role-access.spec.ts
- Next action: Keep customer booking, shop owner, staff, driver, support, and admin workflows green while creator monetization remains retired.
- Verification: npm run qa:customer-booking-contracts && npm run qa:shop-owner-contracts && npm run qa:client-staff-contracts && npm run test -- src/test/roleWorkflowMatrix.test.ts src/test/crossVerticalRoleNavigation.test.ts src/test/staffDriverCreatorRoleAccess.test.ts src/test/merchantPayoutOwnerOpsAccess.test.ts src/test/adminModerationRoleAccess.test.ts src/test/adminSupportAccountRoleAccess.test.ts && npx playwright test tests/e2e/customer-booking-payment.spec.ts tests/e2e/shop-owner-dashboard-permissions.spec.ts tests/e2e/staff-driver-creator-role-access.spec.ts
- Sample evidence:
  - src/pages/About.tsx
  - src/pages/account/AccountAnalyticsPage.tsx
  - src/pages/account/AccountExportPage.tsx
  - src/pages/account/AccountSecurity.tsx
  - src/pages/account/AccountSessionsPage.tsx
  - src/pages/account/AccountSettingsPage.tsx
  - src/pages/account/AccountSubscriptionsPage.tsx
  - src/pages/account/AccountTipsPage.tsx
  - src/pages/account/ActivityLogPage.tsx
  - src/pages/account/AddressesPage.tsx

### Payments, Payouts, Refunds, and Webhooks

- Evidence matches: 2060
- Evidence breakdown: pages=346, components=407, otherSource=143, edgeFunctions=229, migrations=274, tests=114, docs=547
- Test gap: priority=ok, implementationEvidence=1399, testEvidence=114, targetTestEvidence=42, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0553
- Suggested test files: src/test/paymentWebhookIdempotency.test.ts, src/test/payoutAuthorization.test.ts, tests/e2e/checkout-refund-state.spec.ts
- Next action: Keep provider webhooks, checkout/refund state, payout auth, idempotency, and wallet ledgers green.
- Verification: npm run qa:payments-refunds-contracts && npm run qa:payouts-earnings-contracts && npm run test -- src/test/paymentWebhookIdempotency.test.ts src/test/payoutAuthorization.test.ts && npx playwright test tests/e2e/checkout-refund-state.spec.ts && npm run security:api-readiness:report
- Sample evidence:
  - src/pages/About.tsx
  - src/pages/account/AccountSecurity.tsx
  - src/pages/account/AccountSettingsPage.tsx
  - src/pages/account/AccountSubscriptionsPage.tsx
  - src/pages/account/GiftCardsPage.tsx
  - src/pages/account/GiftCardSuccessPage.tsx
  - src/pages/account/LegalPoliciesPage.tsx
  - src/pages/account/NotificationSettings.tsx
  - src/pages/account/PrivacySettingsPage.tsx
  - src/pages/account/ProfileEditPage.tsx

### Email, Push, SMS, and Marketing

- Evidence matches: 1845
- Evidence breakdown: pages=303, components=343, otherSource=233, edgeFunctions=230, migrations=267, tests=89, docs=380
- Test gap: priority=ok, implementationEvidence=1376, testEvidence=89, targetTestEvidence=37, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0482
- Suggested test files: src/test/marketingConsentSuppression.test.ts, src/test/pushTokenLifecycle.test.ts, tests/e2e/transactional-vs-marketing-messages.spec.ts
- Next action: Keep transactional-vs-marketing separation, suppression, consent, push tokens, digest dispatch, and campaign event logging green.
- Verification: npm run qa:email-marketing-contracts && npm run qa:push-notification-contracts && npm run test -- src/test/marketingConsentSuppression.test.ts src/test/pushTokenLifecycle.test.ts src/test/workflows/email-marketing-consent.test.ts src/test/workflows/push-notifications-workflow.test.ts && npx playwright test tests/e2e/transactional-vs-marketing-messages.spec.ts && npm run security:api-readiness:report
- Sample evidence:
  - src/pages/About.tsx
  - src/pages/account/AccountExportPage.tsx
  - src/pages/account/AccountSecurity.tsx
  - src/pages/account/AccountSettingsPage.tsx
  - src/pages/account/ActivityLogPage.tsx
  - src/pages/account/BusinessInvoicesPage.tsx
  - src/pages/account/GiftCardsPage.tsx
  - src/pages/account/GiftCardSuccessPage.tsx
  - src/pages/account/LegalPoliciesPage.tsx
  - src/pages/account/LinkedDevicesPage.tsx

### Database, Storage, and Media

- Evidence matches: 4197
- Evidence breakdown: pages=539, components=559, otherSource=296, edgeFunctions=460, migrations=904, tests=200, docs=1239
- Test gap: priority=ok, implementationEvidence=2758, testEvidence=200, targetTestEvidence=84, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0477
- Suggested test files: src/test/rls/dataApiGrantCoverage.test.ts, src/test/fileUploadSecurity.test.ts, src/test/storageBucketPolicies.test.ts, tests/e2e/media-upload-delete-retention.spec.ts
- Next action: Keep `npm run qa:database-storage-contracts`, `npm run qa:storage-media-contracts`, and `npm run platform:test:storage-media` green for Data API grants, RLS, storage policies, signed media, upload validation, Postgres upgrade checks, and media/CDN gates.
- Verification: npm run qa:database-storage-contracts && npm run qa:storage-media-contracts && npm run platform:test:storage-media && npm run test:rls && npm run perf:media-report && npm run supabase:migrations:linked:strict
- Sample evidence:
  - src/pages/About.tsx
  - src/pages/account/AccountAnalyticsPage.tsx
  - src/pages/account/AccountExportPage.tsx
  - src/pages/account/AccountSecurity.tsx
  - src/pages/account/AccountSessionsPage.tsx
  - src/pages/account/AccountSettingsPage.tsx
  - src/pages/account/AccountSubscriptionsPage.tsx
  - src/pages/account/AccountTipsPage.tsx
  - src/pages/account/ActivityLogPage.tsx
  - src/pages/account/AddressesPage.tsx

### Security, Anti-Abuse, and Hacker Protection

- Evidence matches: 3427
- Evidence breakdown: pages=327, components=439, otherSource=117, edgeFunctions=460, migrations=747, tests=126, docs=1211
- Test gap: priority=ok, implementationEvidence=2090, testEvidence=126, targetTestEvidence=69, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0368
- Suggested test files: src/test/securityAttackDrills.test.ts, src/test/rateLimitRiskDecisions.test.ts, tests/e2e/account-takeover-protection.spec.ts
- Next action: Keep account takeover, card testing, spam, scraping, fake booking, key leakage, WAF, rate-limit, network-risk, and strict preflight controls green.
- Verification: npm run qa:security-anti-abuse-contracts && npm run test -- src/test/securityAttackDrills.test.ts src/test/rateLimitRiskDecisions.test.ts src/test/workflows/security-anti-abuse.test.ts && npx playwright test tests/e2e/account-takeover-protection.spec.ts && npm run security:scan && npm run security:api-readiness:report && npm run deploy:preflight:strict
- Sample evidence:
  - src/pages/About.tsx
  - src/pages/account/AccountAnalyticsPage.tsx
  - src/pages/account/AccountExportPage.tsx
  - src/pages/account/AccountSecurity.tsx
  - src/pages/account/AccountSessionsPage.tsx
  - src/pages/account/AccountSettingsPage.tsx
  - src/pages/account/ActivityLogPage.tsx
  - src/pages/account/AddressesPage.tsx
  - src/pages/account/LegalPoliciesPage.tsx
  - src/pages/account/LinkDevicePage.tsx

### Law, Policy, Compliance, and Trust

- Evidence matches: 4662
- Evidence breakdown: pages=704, components=1288, otherSource=644, edgeFunctions=205, migrations=774, tests=134, docs=913
- Test gap: priority=ok, implementationEvidence=3615, testEvidence=134, targetTestEvidence=94, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0287
- Suggested test files: src/test/legalRouteSurface.test.ts, src/test/legalHubCanonicalLinks.test.ts, src/test/publicLegalNavigationCanonical.test.ts, src/test/checkoutLegalCanonicalLinks.test.ts, src/test/accountDeletionDataRightsLinks.test.ts, src/test/travelLegalCanonicalLinks.test.ts, src/test/groceryBusinessLegalCanonicalLinks.test.ts, src/test/legalPolicyPageRelatedLinks.test.ts, src/test/supportFlightLegalCanonicalLinks.test.ts, src/test/residualPublicLegalCanonicalLinks.test.ts, src/test/legalCanonicalSeoUrls.test.ts, src/test/policyAcceptanceVersioning.test.ts, src/test/legalAcceptanceEdgeAllowlists.test.ts, src/test/accountDeletionLifecycle.test.ts, src/test/accountExportManifest.test.ts, src/test/privacyExportDeletePromises.test.ts, src/test/legalTrustIntakeContracts.test.ts, src/test/refundSupportTrustIntake.test.ts, src/test/creatorMonetizationLegalDisclosure.test.ts, src/test/adsMarketingPrivacyDisclosure.test.ts, src/test/adsMarketingConsentRuntime.test.ts, src/test/marketingLeadPrivacyIntake.test.ts, src/test/ageEligibilitySafetyDisclosure.test.ts, src/test/aiAutomatedDecisionDisclosure.test.ts, src/test/automatedLegalPolicyHub.test.ts, src/test/dataRightsLegalPolicyHub.test.ts, src/test/sensitiveDataLegalPolicyHub.test.ts, tests/e2e/refund-policy-flow.spec.ts
- Next action: Keep legal pages, canonical links, consent logs, export/delete rights, privacy intake, refund support, monetization disclosures, ads consent, AI notices, and policy-backed booking flows green.
- Verification: npm run qa:legal-policy-contracts && npm run test -- src/test/workflows/legal-policy-workflow.test.ts src/test/legalRouteSurface.test.ts src/test/legalHubCanonicalLinks.test.ts src/test/publicLegalNavigationCanonical.test.ts src/test/checkoutLegalCanonicalLinks.test.ts src/test/accountDeletionDataRightsLinks.test.ts src/test/travelLegalCanonicalLinks.test.ts src/test/groceryBusinessLegalCanonicalLinks.test.ts src/test/legalPolicyPageRelatedLinks.test.ts src/test/supportFlightLegalCanonicalLinks.test.ts src/test/residualPublicLegalCanonicalLinks.test.ts src/test/legalCanonicalSeoUrls.test.ts src/test/policyAcceptanceVersioning.test.ts src/test/legalAcceptanceEdgeAllowlists.test.ts src/test/accountDeletionLifecycle.test.ts src/test/accountExportManifest.test.ts src/test/privacyExportDeletePromises.test.ts src/test/legalTrustIntakeContracts.test.ts src/test/refundSupportTrustIntake.test.ts src/test/creatorMonetizationLegalDisclosure.test.ts src/test/adsMarketingPrivacyDisclosure.test.ts src/test/adsMarketingConsentRuntime.test.ts src/test/marketingLeadPrivacyIntake.test.ts src/test/ageEligibilitySafetyDisclosure.test.ts src/test/aiAutomatedDecisionDisclosure.test.ts src/test/automatedLegalPolicyHub.test.ts src/test/dataRightsLegalPolicyHub.test.ts src/test/sensitiveDataLegalPolicyHub.test.ts && npx playwright test tests/e2e/refund-policy-flow.spec.ts && npm run security:api-readiness:report
- Sample evidence:
  - src/pages/About.tsx
  - src/pages/account/AccountAnalyticsPage.tsx
  - src/pages/account/AccountExportPage.tsx
  - src/pages/account/AccountSecurity.tsx
  - src/pages/account/AccountSessionsPage.tsx
  - src/pages/account/AccountSettingsPage.tsx
  - src/pages/account/AccountSubscriptionsPage.tsx
  - src/pages/account/AccountTipsPage.tsx
  - src/pages/account/ActivityLogPage.tsx
  - src/pages/account/AddressesPage.tsx

### Frontend, Graphics, Design, and Speed

- Evidence matches: 4054
- Evidence breakdown: pages=636, components=791, otherSource=455, edgeFunctions=421, migrations=213, tests=94, docs=1444
- Test gap: priority=ok, implementationEvidence=2516, testEvidence=94, targetTestEvidence=82, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0232
- Suggested test files: tests/visual/workflow-visual-readiness.spec.ts, tests/e2e/mobile-layout-no-overlap.spec.ts, src/test/visualWorkflowCoverageContracts.test.ts, src/test/safeAreaVisualBaselineContracts.test.ts, src/test/feedMobileVisualContracts.test.ts, src/test/mobileBottomNavVisualContracts.test.ts, src/test/createPostComposerVisualContracts.test.ts, src/test/mediaRenderingPerformanceContracts.test.ts, src/test/feedResponsiveShellContracts.test.ts, src/test/loadingEmptyReliabilityContracts.test.ts, src/test/loadingErrorStates.test.tsx
- Next action: Keep visual route coverage, compact mobile feed controls, safe-area baselines, bottom navigation, composer controls, lazy media, loading/error states, and no-overlap checks green.
- Verification: npm run qa:frontend-visual-contracts && npm run test -- src/test/visualWorkflowCoverageContracts.test.ts src/test/safeAreaVisualBaselineContracts.test.ts src/test/feedMobileVisualContracts.test.ts src/test/mobileBottomNavVisualContracts.test.ts src/test/createPostComposerVisualContracts.test.ts src/test/mediaRenderingPerformanceContracts.test.ts src/test/feedResponsiveShellContracts.test.ts src/test/loadingEmptyReliabilityContracts.test.ts src/test/loadingErrorStates.test.tsx && npx playwright test tests/e2e/mobile-layout-no-overlap.spec.ts && npm run test:visual && npm run qa:safe-area:all && npm run perf:media-report && npm run build
- Sample evidence:
  - src/pages/account/AccountAnalyticsPage.tsx
  - src/pages/account/AccountExportPage.tsx
  - src/pages/account/AccountSecurity.tsx
  - src/pages/account/AccountSessionsPage.tsx
  - src/pages/account/AccountSettingsPage.tsx
  - src/pages/account/AccountSubscriptionsPage.tsx
  - src/pages/account/AccountTipsPage.tsx
  - src/pages/account/ActivityLogPage.tsx
  - src/pages/account/AddressesPage.tsx
  - src/pages/account/BusinessInvoicesPage.tsx

### Native iOS, Android, OTA, and Store Release

- Evidence matches: 2619
- Evidence breakdown: pages=504, components=520, otherSource=228, edgeFunctions=110, migrations=165, tests=73, docs=1019
- Test gap: priority=ok, implementationEvidence=1527, testEvidence=73, targetTestEvidence=53, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0279
- Suggested test files: src/test/workflows/native-app-release.test.ts, src/test/nativePermissionsDeepLinks.test.ts, src/test/nativeStoreListingCanonicalUrls.test.ts, src/test/nativeStoreAssets.test.ts, src/test/nativeStoreScreenshotSpecs.test.ts, src/test/nativeSubmissionCommands.test.ts, src/test/nativeVersionReleaseAlignment.test.ts, src/test/nativeReleaseChecklist.test.ts, src/test/nativeSafeAreaBridgeContracts.test.ts, src/test/otaDeployBypass.test.ts, scripts/qa/native-app-contracts.mjs, scripts/native/doctor.mjs
- Next action: Keep Capacitor config, native permissions, deep links, push extensions, iOS/Android store metadata, screenshots, safe-area bridge, OTA bypass safety, version alignment, native sync, and simulator/debug builds green.
- Verification: npm run qa:native-app-contracts && npm run test -- src/test/workflows/native-app-release.test.ts src/test/nativePermissionsDeepLinks.test.ts src/test/nativeStoreListingCanonicalUrls.test.ts src/test/nativeStoreAssets.test.ts src/test/nativeStoreScreenshotSpecs.test.ts src/test/nativeSubmissionCommands.test.ts src/test/nativeVersionReleaseAlignment.test.ts src/test/nativeReleaseChecklist.test.ts src/test/nativeSafeAreaBridgeContracts.test.ts src/test/otaDeployBypass.test.ts && npm run native:doctor && npm run native:sync && npm run ios:build:sim && npm run android:build:debug
- Sample evidence:
  - src/pages/About.tsx
  - src/pages/account/AccountAnalyticsPage.tsx
  - src/pages/account/AccountExportPage.tsx
  - src/pages/account/AccountSecurity.tsx
  - src/pages/account/AccountSessionsPage.tsx
  - src/pages/account/AccountSettingsPage.tsx
  - src/pages/account/AccountTipsPage.tsx
  - src/pages/account/ActivityLogPage.tsx
  - src/pages/account/AddressesPage.tsx
  - src/pages/account/BusinessInvoicesPage.tsx

### API, Server Speed, Observability, and Operations

- Evidence matches: 5079
- Evidence breakdown: pages=688, components=1148, otherSource=627, edgeFunctions=460, migrations=637, tests=170, docs=1349
- Test gap: priority=ok, implementationEvidence=3560, testEvidence=170, targetTestEvidence=102, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0335
- Suggested test files: src/test/apiObservabilityContracts.test.ts, src/test/webhookFailureAlerting.test.ts, src/test/apiOperationsReportSurfaces.test.ts, tests/e2e/server-error-fallbacks.spec.ts
- Next action: Keep wrapper observability, preflight artifacts, runtime settings, operations runbook owners, webhook failure surfaces, cron monitors, server-error fallbacks, and API readiness green.
- Verification: npm run qa:api-operations-contracts && npm run test -- src/test/workflows/api-operations-readiness.test.ts src/test/apiObservabilityContracts.test.ts src/test/webhookFailureAlerting.test.ts src/test/apiOperationsReportSurfaces.test.ts && npx playwright test tests/e2e/server-error-fallbacks.spec.ts && npm run security:api-readiness:report && npm run deploy:preflight:strict
- Sample evidence:
  - src/pages/account/AccountAnalyticsPage.tsx
  - src/pages/account/AccountExportPage.tsx
  - src/pages/account/AccountSecurity.tsx
  - src/pages/account/AccountSessionsPage.tsx
  - src/pages/account/AccountSettingsPage.tsx
  - src/pages/account/AccountSubscriptionsPage.tsx
  - src/pages/account/AccountTipsPage.tsx
  - src/pages/account/ActivityLogPage.tsx
  - src/pages/account/AddressesPage.tsx
  - src/pages/account/BusinessInvoicesPage.tsx

