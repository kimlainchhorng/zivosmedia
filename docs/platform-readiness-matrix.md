# Platform Readiness Matrix

Generated: 2026-06-08T16:39:55.757Z

## Current Gate

- Mode: soft
- Current gate ready: yes
- Production gate ready: no
- Remote migration history status: access_token_missing

## Production Blockers

- Missing SUPABASE_URL for production backend cron/runtime settings.
- Missing SUPABASE_ANON_KEY for production Edge Function verification and database cron auth.
- Missing SUPABASE_ACCESS_TOKEN for production migration-history verification.
- API readiness has 19 warning(s).
- Database readiness has 1 blocker(s).
- Database readiness has 1 warning(s).
- Supabase remote migration history is unavailable (access_token_missing).
- Supabase migrations have 6 unresolved duplicate version(s).

## Inventory Totals

- Page files: 707
- Component files: 1375
- Source files scanned: 2712
- Supabase Edge Functions: 449
- Supabase migrations: 1110
- Test files: 153
- Docs files: 105

## Priority Test Gap Actions

- No priority test gaps detected.

## Release Lanes

### Release Safety Foundation

- Evidence matches: 1508
- Evidence breakdown: pages=16, components=20, otherSource=15, edgeFunctions=198, migrations=1110, tests=87, docs=62
- Test gap: priority=ok, implementationEvidence=1359, testEvidence=87, targetTestEvidence=31, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0577
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
  - src/pages/app/personal/ApplyJobHubPage.tsx
  - src/pages/ChatHubPage.tsx
  - src/pages/FeedPage.tsx
  - src/pages/InspectionViewPage.tsx

### Auth, SSO, Sessions, and Account Protection

- Evidence matches: 2483
- Evidence breakdown: pages=480, components=371, otherSource=235, edgeFunctions=401, migrations=813, tests=100, docs=83
- Test gap: priority=ok, implementationEvidence=2300, testEvidence=100, targetTestEvidence=50, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0403
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

### Customer, Shop Owner, Staff, Driver, Creator, Admin Workflows

- Evidence matches: 3813
- Evidence breakdown: pages=693, components=1214, otherSource=466, edgeFunctions=429, migrations=818, tests=95, docs=98
- Test gap: priority=ok, implementationEvidence=3620, testEvidence=95, targetTestEvidence=77, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0249
- Suggested test files: src/test/roleWorkflowMatrix.test.ts, src/test/crossVerticalRoleNavigation.test.ts, src/test/staffDriverCreatorRoleAccess.test.ts, src/test/merchantPayoutOwnerOpsAccess.test.ts, src/test/adminModerationRoleAccess.test.ts, src/test/adminSupportAccountRoleAccess.test.ts, tests/e2e/customer-booking-payment.spec.ts, tests/e2e/shop-owner-dashboard-permissions.spec.ts, tests/e2e/staff-driver-creator-role-access.spec.ts
- Next action: Keep customer booking, shop owner, staff, driver, creator, support, and admin role workflows green.
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

- Evidence matches: 1518
- Evidence breakdown: pages=343, components=418, otherSource=123, edgeFunctions=218, migrations=268, tests=64, docs=84
- Test gap: priority=ok, implementationEvidence=1370, testEvidence=64, targetTestEvidence=31, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0422
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

- Evidence matches: 1454
- Evidence breakdown: pages=302, components=351, otherSource=215, edgeFunctions=220, migrations=258, tests=67, docs=41
- Test gap: priority=ok, implementationEvidence=1346, testEvidence=67, targetTestEvidence=30, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0461
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

- Evidence matches: 2884
- Evidence breakdown: pages=524, components=571, otherSource=253, edgeFunctions=449, migrations=870, tests=121, docs=96
- Test gap: priority=ok, implementationEvidence=2667, testEvidence=121, targetTestEvidence=58, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.042
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

- Evidence matches: 2184
- Evidence breakdown: pages=322, components=438, otherSource=97, edgeFunctions=448, migrations=724, tests=94, docs=61
- Test gap: priority=ok, implementationEvidence=2029, testEvidence=94, targetTestEvidence=44, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.043
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

- Evidence matches: 3726
- Evidence breakdown: pages=704, components=1340, otherSource=597, edgeFunctions=176, migrations=749, tests=90, docs=70
- Test gap: priority=ok, implementationEvidence=3566, testEvidence=90, targetTestEvidence=75, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0242
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

- Evidence matches: 2588
- Evidence breakdown: pages=628, components=805, otherSource=425, edgeFunctions=412, migrations=208, tests=58, docs=52
- Test gap: priority=ok, implementationEvidence=2478, testEvidence=58, targetTestEvidence=52, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0224
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

- Evidence matches: 1616
- Evidence breakdown: pages=506, components=553, otherSource=213, edgeFunctions=97, migrations=162, tests=44, docs=41
- Test gap: priority=ok, implementationEvidence=1531, testEvidence=44, targetTestEvidence=33, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0272
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

- Evidence matches: 3700
- Evidence breakdown: pages=678, components=1199, otherSource=575, edgeFunctions=449, migrations=610, tests=113, docs=76
- Test gap: priority=ok, implementationEvidence=3511, testEvidence=113, targetTestEvidence=74, testsNeededForHigh=0, testsNeededForOk=0, testCoverageRatio=0.0305
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

