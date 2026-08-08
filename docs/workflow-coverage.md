# Workflow Coverage

Generated: 2026-08-05T17:43:20.119Z

## Current Gate

- Mode: strict
- Production gate ready: no
- Remote migration history status: unavailable

## Production Blockers

- Environment readiness has 6 critical finding(s).
- Missing SUPABASE_URL for production backend cron/runtime settings.
- Missing SUPABASE_ANON_KEY for production Edge Function verification and database cron auth.
- Missing SUPABASE_ACCESS_TOKEN for production migration-history verification.
- Supabase remote migration history is unavailable (unavailable).

## Priority Workflow Updates

- All tracked workflows have frontend/backend or database evidence plus tests.

## Workflow Evidence

### SSO, Auth, Sessions, Devices

- Status: covered
- Evidence counts: frontend=1042, backend=854, database=845, tests=115, docs=772
- Test coverage ratio: 0.042
- Next action: Keep `npm run qa:sso-auth-contracts` green for OAuth, passwordless OTP, MFA, trusted devices, active sessions, and role-aware route gates.
- Frontend samples:
  - src/pages/AMAPage.tsx
  - src/pages/About.tsx
  - src/pages/ActivityFeedPage.tsx
  - src/pages/AffiliateHubPage.tsx
  - src/pages/AffiliateLinksPage.tsx
- Backend samples:
  - supabase/functions/_shared/aalCheck.ts
  - supabase/functions/_shared/audit.ts
  - supabase/functions/_shared/audit_test.ts
  - supabase/functions/_shared/auth.ts
  - supabase/functions/_shared/bruteForce.ts
- Database samples:
  - supabase/migrations/20260126182101_2f0234ed-56dc-4072-ab57-dfd72543853a.sql
  - supabase/migrations/20260126184430_15d3dc46-97b5-4f21-b420-db59cd05443a.sql
  - supabase/migrations/20260126184928_0755b267-5e93-4458-b091-dce75d554b08.sql
  - supabase/migrations/20260126185227_cda82eb4-ac9e-49b5-9acf-17a1a8079c3d.sql
  - supabase/migrations/20260126191000_58715aeb-e9bb-454c-bb6a-e617cbbce913.sql
- Tests samples:
  - src/test/accountDeletionLifecycle.test.ts
  - src/test/accountExportManifest.test.ts
  - src/test/accountWalletFunctionAnonGrants.test.ts
  - src/test/adminModerationRoleAccess.test.ts
  - src/test/adminSecurityDefinerRpcGrants.test.ts
- Docs samples:
  - docs/ADMIN_CONTROL_AUDIT.md
  - docs/ADMIN_PAYMENT_DASHBOARD.md
  - docs/ALL_ZIVO_LIVE_WEBSITE_AUDIT.md
  - docs/API_CONNECTIVITY_AUDIT.md
  - docs/API_CONTRACT.md

### Customer Booking, Order, Trip

- Status: covered
- Evidence counts: frontend=2104, backend=596, database=574, tests=99, docs=1444
- Test coverage ratio: 0.0302
- Next action: Keep `npm run qa:customer-booking-contracts` green for grocery checkout, order scoping, lodging add-ons, and shopping-order RLS.
- Frontend samples:
  - src/pages/AITripPlanner.tsx
  - src/pages/AMAPage.tsx
  - src/pages/ARFiltersPage.tsx
  - src/pages/About.tsx
  - src/pages/AccountDeletionInfo.tsx
- Backend samples:
  - supabase/functions/_shared/aalCheck.ts
  - supabase/functions/_shared/auth.ts
  - supabase/functions/_shared/busWebhookTransitions.ts
  - supabase/functions/_shared/cancellation-cascade.ts
  - supabase/functions/_shared/contentLinkValidation.ts
- Database samples:
  - supabase/migrations/20260126182101_2f0234ed-56dc-4072-ab57-dfd72543853a.sql
  - supabase/migrations/20260126184928_0755b267-5e93-4458-b091-dce75d554b08.sql
  - supabase/migrations/20260126185227_cda82eb4-ac9e-49b5-9acf-17a1a8079c3d.sql
  - supabase/migrations/20260126191000_58715aeb-e9bb-454c-bb6a-e617cbbce913.sql
  - supabase/migrations/20260126194309_e195e9d5-5e21-4d2c-b212-f7264928e546.sql
- Tests samples:
  - src/test/accountExportManifest.test.ts
  - src/test/accountWalletFunctionAnonGrants.test.ts
  - src/test/ageEligibilitySafetyDisclosure.test.ts
  - src/test/aiAutomatedDecisionDisclosure.test.ts
  - src/test/apiObservabilityContracts.test.ts
- Docs samples:
  - docs/ADMIN_DASHBOARD_PLAN.md
  - docs/ADMIN_PAYMENT_DASHBOARD.md
  - docs/ALL_ZIVO_LIVE_WEBSITE_AUDIT.md
  - docs/API_CONNECTIVITY_AUDIT.md
  - docs/API_WEBHOOK_CONTRACT.md

### Shop Owner Setup and Operations

- Status: covered
- Evidence counts: frontend=1330, backend=707, database=734, tests=116, docs=1438
- Test coverage ratio: 0.0419
- Next action: Keep `npm run qa:shop-owner-contracts` green for owner setup, dashboard routes, scoped store operations, and RLS/grants.
- Frontend samples:
  - src/pages/AMAPage.tsx
  - src/pages/ARFiltersPage.tsx
  - src/pages/About.tsx
  - src/pages/AccountDeletionInfo.tsx
  - src/pages/AchievementsPage.tsx
- Backend samples:
  - supabase/functions/_shared/audit.ts
  - supabase/functions/_shared/auth.ts
  - supabase/functions/_shared/bruteForce.ts
  - supabase/functions/_shared/cancellation-cascade.ts
  - supabase/functions/_shared/contentLinkValidation.ts
- Database samples:
  - supabase/migrations/20260126194309_e195e9d5-5e21-4d2c-b212-f7264928e546.sql
  - supabase/migrations/20260126204105_c67b7de4-2860-447e-9fbd-92891b2247a5.sql
  - supabase/migrations/20260127224927_9e2a2506-a399-42ca-89b3-e8cf7b5a3733.sql
  - supabase/migrations/20260127233015_5ca2a59c-f6eb-4fca-9560-ba33232020d3.sql
  - supabase/migrations/20260129222403_8821654d-63c2-4fb4-b5bf-216b04f4a603.sql
- Tests samples:
  - src/test/accountDeletionLifecycle.test.ts
  - src/test/accountWalletFunctionAnonGrants.test.ts
  - src/test/adminSecurityDefinerRpcGrants.test.ts
  - src/test/adminSupportAccountRoleAccess.test.ts
  - src/test/adsMarketingPrivacyDisclosure.test.ts
- Docs samples:
  - docs/ADMIN_CONTROL_AUDIT.md
  - docs/ADMIN_DASHBOARD_PLAN.md
  - docs/ADMIN_PAYMENT_DASHBOARD.md
  - docs/ADMIN_UI_AUDIT.md
  - docs/ALL_ZIVO_LIVE_WEBSITE_AUDIT.md

### Client, Staff, Employee Workflows

- Status: covered
- Evidence counts: frontend=1297, backend=792, database=275, tests=58, docs=365
- Test coverage ratio: 0.0245
- Next action: Keep `npm run qa:client-staff-contracts` green for invite acceptance, owner-only staff invites, schedule reads, payroll/rules, training, and client scoping.
- Frontend samples:
  - src/pages/AMAPage.tsx
  - src/pages/AccountDeletionInfo.tsx
  - src/pages/AchievementsPage.tsx
  - src/pages/ActivityFeedPage.tsx
  - src/pages/AdminContentReportsPage.tsx
- Backend samples:
  - supabase/functions/_shared/audit.ts
  - supabase/functions/_shared/auth.ts
  - supabase/functions/_shared/botDetection.ts
  - supabase/functions/_shared/cancellation-cascade.ts
  - supabase/functions/_shared/contentLinkValidation.ts
- Database samples:
  - supabase/migrations/20260127224927_9e2a2506-a399-42ca-89b3-e8cf7b5a3733.sql
  - supabase/migrations/20260127233015_5ca2a59c-f6eb-4fca-9560-ba33232020d3.sql
  - supabase/migrations/20260131202033_2a6cde74-5ca5-4f55-9675-9580420c3829.sql
  - supabase/migrations/20260201143419_282f5007-80e4-4b53-881f-6268400c8d51.sql
  - supabase/migrations/20260202220847_bedb61f0-7016-4d3e-927c-061886814f3d.sql
- Tests samples:
  - src/test/accountDeletionLifecycle.test.ts
  - src/test/adminSupportAccountRoleAccess.test.ts
  - src/test/adsMarketingConsentRuntime.test.ts
  - src/test/apiObservabilityContracts.test.ts
  - src/test/autoRepairBuildROWorkflowContracts.test.ts
- Docs samples:
  - docs/ADMIN_CONTROL_AUDIT.md
  - docs/ALL_ZIVO_LIVE_WEBSITE_AUDIT.md
  - docs/API_CONNECTIVITY_AUDIT.md
  - docs/ARCHITECTURE.md
  - docs/AUTH_AND_IDENTITY_FLOW.md

### Payments, Refunds, Webhooks

- Status: covered
- Evidence counts: frontend=1578, backend=1198, database=1136, tests=128, docs=1214
- Test coverage ratio: 0.0327
- Next action: Keep `npm run qa:payments-refunds-contracts` green for provider webhooks, idempotent refunds, subscription portals, refund-state UI, and audit ledgers.
- Frontend samples:
  - src/pages/AMAPage.tsx
  - src/pages/About.tsx
  - src/pages/AccountDeletionInfo.tsx
  - src/pages/AchievementsPage.tsx
  - src/pages/ActivityFeedPage.tsx
- Backend samples:
  - supabase/functions/_shared/aalCheck.ts
  - supabase/functions/_shared/audit.ts
  - supabase/functions/_shared/audit_test.ts
  - supabase/functions/_shared/auth.ts
  - supabase/functions/_shared/botDetection.ts
- Database samples:
  - supabase/migrations/20260126182101_2f0234ed-56dc-4072-ab57-dfd72543853a.sql
  - supabase/migrations/20260126184430_15d3dc46-97b5-4f21-b420-db59cd05443a.sql
  - supabase/migrations/20260126184928_0755b267-5e93-4458-b091-dce75d554b08.sql
  - supabase/migrations/20260126185227_cda82eb4-ac9e-49b5-9acf-17a1a8079c3d.sql
  - supabase/migrations/20260126191000_58715aeb-e9bb-454c-bb6a-e617cbbce913.sql
- Tests samples:
  - src/test/accountDeletionLifecycle.test.ts
  - src/test/accountExportManifest.test.ts
  - src/test/accountWalletFunctionAnonGrants.test.ts
  - src/test/adminModerationRoleAccess.test.ts
  - src/test/adminSecurityDefinerRpcGrants.test.ts
- Docs samples:
  - docs/ADMIN_CONTROL_AUDIT.md
  - docs/ADMIN_DASHBOARD_PLAN.md
  - docs/ADMIN_PAYMENT_DASHBOARD.md
  - docs/ADMIN_UI_AUDIT.md
  - docs/ALL_ZIVO_LIVE_WEBSITE_AUDIT.md

### Payouts, Earnings, Balances

- Status: covered
- Evidence counts: frontend=655, backend=377, database=198, tests=57, docs=411
- Test coverage ratio: 0.0463
- Next action: Keep `npm run qa:payouts-earnings-contracts` green for payout auth, server-gated payout methods, idempotent retries, and auditable ledgers.
- Frontend samples:
  - src/pages/About.tsx
  - src/pages/AccountDeletionInfo.tsx
  - src/pages/AffiliateHubPage.tsx
  - src/pages/AffiliateLinksPage.tsx
  - src/pages/AppSettingsPage.tsx
- Backend samples:
  - supabase/functions/_shared/auth.ts
  - supabase/functions/_shared/contentLinkValidation.ts
  - supabase/functions/_shared/eats-notifications.ts
  - supabase/functions/_shared/grocery-notifications.ts
  - supabase/functions/_shared/lodging-notifications.ts
- Database samples:
  - supabase/migrations/20260126182101_2f0234ed-56dc-4072-ab57-dfd72543853a.sql
  - supabase/migrations/20260127224927_9e2a2506-a399-42ca-89b3-e8cf7b5a3733.sql
  - supabase/migrations/20260127233015_5ca2a59c-f6eb-4fca-9560-ba33232020d3.sql
  - supabase/migrations/20260131202033_2a6cde74-5ca5-4f55-9675-9580420c3829.sql
  - supabase/migrations/20260131204001_8fc6e8e9-7bc7-46de-bd85-4266f95306aa.sql
- Tests samples:
  - src/test/accountExportManifest.test.ts
  - src/test/accountWalletFunctionAnonGrants.test.ts
  - src/test/adsMarketingConsentRuntime.test.ts
  - src/test/ageEligibilitySafetyDisclosure.test.ts
  - src/test/aiAutomatedDecisionDisclosure.test.ts
- Docs samples:
  - docs/ADMIN_CONTROL_AUDIT.md
  - docs/ADMIN_DASHBOARD_PLAN.md
  - docs/ADMIN_PAYMENT_DASHBOARD.md
  - docs/ADMIN_UI_AUDIT.md
  - docs/ALL_ZIVO_LIVE_WEBSITE_AUDIT.md

### Email Marketing, Consent, Suppression

- Status: covered
- Evidence counts: frontend=599, backend=391, database=235, tests=75, docs=327
- Test coverage ratio: 0.0612
- Next action: Keep `npm run qa:email-marketing-contracts` green for transactional-vs-marketing separation, suppression, consent, and campaign event logging.
- Frontend samples:
  - src/pages/About.tsx
  - src/pages/AccountDeletionInfo.tsx
  - src/pages/AdultDiscoveryPage.tsx
  - src/pages/AffiliateDisclosure.tsx
  - src/pages/AffiliateHubPage.tsx
- Backend samples:
  - supabase/functions/_shared/audit.ts
  - supabase/functions/_shared/audit_test.ts
  - supabase/functions/_shared/auth.ts
  - supabase/functions/_shared/bruteForce.ts
  - supabase/functions/_shared/contentLinkValidation.ts
- Database samples:
  - supabase/migrations/20260126182101_2f0234ed-56dc-4072-ab57-dfd72543853a.sql
  - supabase/migrations/20260126194309_e195e9d5-5e21-4d2c-b212-f7264928e546.sql
  - supabase/migrations/20260126195812_4c0fbc98-ad0f-455f-abee-31eb6a1c0840.sql
  - supabase/migrations/20260126210105_93ebc1b8-2f34-4353-8ebe-0cd1ec2b2902.sql
  - supabase/migrations/20260127224927_9e2a2506-a399-42ca-89b3-e8cf7b5a3733.sql
- Tests samples:
  - src/test/accountExportManifest.test.ts
  - src/test/adsMarketingConsentRuntime.test.ts
  - src/test/adsMarketingPrivacyDisclosure.test.ts
  - src/test/ageEligibilitySafetyDisclosure.test.ts
  - src/test/aiAutomatedDecisionDisclosure.test.ts
- Docs samples:
  - docs/API_CONTRACT.md
  - docs/AUTH_FLOW.md
  - docs/BUSINESS_SOFTWARE_BILLING_FLOW.md
  - docs/BUSINESS_SOFTWARE_FLOW.md
  - docs/CROSS_APP_WORKFLOW_AUDIT.md

### Ads, Monetization, Conversion Tracking

- Status: covered
- Evidence counts: frontend=2273, backend=1214, database=1002, tests=165, docs=1567
- Test coverage ratio: 0.0368
- Next action: Keep `npm run qa:ads-monetization-contracts` green for attribution, conversion uploads, Ads Studio ROAS, creator monetization, and provider roadmap coverage.
- Frontend samples:
  - src/pages/AITripPlanner.tsx
  - src/pages/AMAPage.tsx
  - src/pages/ARFiltersPage.tsx
  - src/pages/About.tsx
  - src/pages/AccountDeletionInfo.tsx
- Backend samples:
  - supabase/functions/_shared/aalCheck.ts
  - supabase/functions/_shared/audit.ts
  - supabase/functions/_shared/auth.ts
  - supabase/functions/_shared/botDetection.ts
  - supabase/functions/_shared/bruteForce.ts
- Database samples:
  - supabase/migrations/20260126182101_2f0234ed-56dc-4072-ab57-dfd72543853a.sql
  - supabase/migrations/20260126184430_15d3dc46-97b5-4f21-b420-db59cd05443a.sql
  - supabase/migrations/20260126185227_cda82eb4-ac9e-49b5-9acf-17a1a8079c3d.sql
  - supabase/migrations/20260126191000_58715aeb-e9bb-454c-bb6a-e617cbbce913.sql
  - supabase/migrations/20260126194309_e195e9d5-5e21-4d2c-b212-f7264928e546.sql
- Tests samples:
  - src/test/accountDeletionDataRightsLinks.test.ts
  - src/test/accountDeletionLifecycle.test.ts
  - src/test/accountExportManifest.test.ts
  - src/test/accountWalletFunctionAnonGrants.test.ts
  - src/test/adminModerationRoleAccess.test.ts
- Docs samples:
  - docs/ADMIN_CONTROL_AUDIT.md
  - docs/ADMIN_DASHBOARD_PLAN.md
  - docs/ADMIN_PAYMENT_DASHBOARD.md
  - docs/ADMIN_UI_AUDIT.md
  - docs/ALL_ZIVO_LIVE_WEBSITE_AUDIT.md

### Push Notifications and Notification Center

- Status: covered
- Evidence counts: frontend=494, backend=312, database=107, tests=34, docs=248
- Test coverage ratio: 0.0372
- Next action: Keep `npm run qa:push-notification-contracts` green for token registration, opt-outs, digest dispatch, and service worker routing.
- Frontend samples:
  - src/pages/AMAPage.tsx
  - src/pages/About.tsx
  - src/pages/ActivityFeedPage.tsx
  - src/pages/AppSettingsPage.tsx
  - src/pages/AutoMessagesLogPage.tsx
- Backend samples:
  - supabase/functions/_shared/cancellation-cascade.ts
  - supabase/functions/_shared/contentLinkValidation.ts
  - supabase/functions/_shared/eats-notifications.ts
  - supabase/functions/_shared/grocery-notifications.ts
  - supabase/functions/_shared/idempotency.ts
- Database samples:
  - supabase/migrations/20260126210051_db732eec-5136-48f3-9aed-f84e414f4307.sql
  - supabase/migrations/20260129225210_7429b719-03e7-49dc-98a2-a101f956b59d.sql
  - supabase/migrations/20260129225228_f8acf683-0020-463d-baac-e9c8dda02913.sql
  - supabase/migrations/20260201011854_0dd90e3e-d414-443c-ab60-74ab8b147261.sql
  - supabase/migrations/20260201040315_45c14265-db1d-49f1-94b5-0b6ab7a1e92c.sql
- Tests samples:
  - src/test/autoRepairBuildROWorkflowContracts.test.ts
  - src/test/cloudflarePagesEdgeGuard.test.ts
  - src/test/deployWorkflowGates.test.ts
  - src/test/errorBoundaryObservability.test.tsx
  - src/test/feedMobileVisualContracts.test.ts
- Docs samples:
  - docs/ADMIN_CONTROL_AUDIT.md
  - docs/API_CONNECTIVITY_AUDIT.md
  - docs/CHAT_CALL_VIDEO_AUDIT.md
  - docs/CROSS_APP_WORKFLOW_AUDIT.md
  - docs/DATABASE_SQL_RLS_AUDIT.md

### Storage, Media, CDN, Downloads

- Status: covered
- Evidence counts: frontend=957, backend=435, database=226, tests=84, docs=834
- Test coverage ratio: 0.0519
- Next action: Keep `npm run qa:storage-media-contracts`, `npm run qa:database-storage-contracts`, and `npm run platform:test:storage-media` green for upload validation, public, protected, owner, and client/staff media paths plus Data API/RLS gates.
- Frontend samples:
  - src/pages/ARFiltersPage.tsx
  - src/pages/About.tsx
  - src/pages/AccountDeletionInfo.tsx
  - src/pages/ActivityFeedPage.tsx
  - src/pages/AdminModerationPage.tsx
- Backend samples:
  - supabase/functions/_shared/cancellation-cascade.ts
  - supabase/functions/_shared/contentLinkValidation.ts
  - supabase/functions/_shared/cors.ts
  - supabase/functions/_shared/eats-notifications.ts
  - supabase/functions/_shared/email-templates/email-change.tsx
- Database samples:
  - supabase/migrations/20260126182101_2f0234ed-56dc-4072-ab57-dfd72543853a.sql
  - supabase/migrations/20260126184430_15d3dc46-97b5-4f21-b420-db59cd05443a.sql
  - supabase/migrations/20260126222347_17c79ffb-aefb-49fe-9f4c-311d704354ee.sql
  - supabase/migrations/20260129225210_7429b719-03e7-49dc-98a2-a101f956b59d.sql
  - supabase/migrations/20260129225228_f8acf683-0020-463d-baac-e9c8dda02913.sql
- Tests samples:
  - src/test/accountDeletionDataRightsLinks.test.ts
  - src/test/accountDeletionLifecycle.test.ts
  - src/test/accountExportManifest.test.ts
  - src/test/adminSupportAccountRoleAccess.test.ts
  - src/test/adsMarketingConsentRuntime.test.ts
- Docs samples:
  - docs/ADMIN_CONTROL_AUDIT.md
  - docs/ADMIN_PAYMENT_DASHBOARD.md
  - docs/ALL_ZIVO_LIVE_WEBSITE_AUDIT.md
  - docs/API_CONNECTIVITY_AUDIT.md
  - docs/API_CONTRACT.md

### Law, Policy, Compliance, Trust

- Status: covered
- Evidence counts: frontend=514, backend=205, database=711, tests=70, docs=502
- Test coverage ratio: 0.049
- Next action: Keep `npm run qa:legal-policy-contracts` green across legal pages, consent logs, export/delete, grants, and policy-backed booking flows.
- Frontend samples:
  - src/pages/About.tsx
  - src/pages/AccountDeletionInfo.tsx
  - src/pages/AdultDiscoveryPage.tsx
  - src/pages/AffiliateDisclosure.tsx
  - src/pages/AppSettingsPage.tsx
- Backend samples:
  - supabase/functions/_shared/busWebhookTransitions.ts
  - supabase/functions/_shared/cancellation-cascade.ts
  - supabase/functions/_shared/contentLinkValidation.ts
  - supabase/functions/_shared/eats-notifications.ts
  - supabase/functions/_shared/email-templates/layout.tsx
- Database samples:
  - supabase/migrations/20260126182101_2f0234ed-56dc-4072-ab57-dfd72543853a.sql
  - supabase/migrations/20260126184430_15d3dc46-97b5-4f21-b420-db59cd05443a.sql
  - supabase/migrations/20260126184928_0755b267-5e93-4458-b091-dce75d554b08.sql
  - supabase/migrations/20260126185227_cda82eb4-ac9e-49b5-9acf-17a1a8079c3d.sql
  - supabase/migrations/20260126191000_58715aeb-e9bb-454c-bb6a-e617cbbce913.sql
- Tests samples:
  - src/test/accountDeletionDataRightsLinks.test.ts
  - src/test/accountDeletionLifecycle.test.ts
  - src/test/accountExportManifest.test.ts
  - src/test/adsMarketingConsentRuntime.test.ts
  - src/test/adsMarketingPrivacyDisclosure.test.ts
- Docs samples:
  - docs/ADMIN_CONTROL_AUDIT.md
  - docs/ADMIN_DASHBOARD_PLAN.md
  - docs/ADMIN_PAYMENT_DASHBOARD.md
  - docs/ALL_ZIVO_LIVE_WEBSITE_AUDIT.md
  - docs/API_CONNECTIVITY_AUDIT.md

### API, Server Speed, Observability

- Status: covered
- Evidence counts: frontend=2195, backend=1309, database=612, tests=124, docs=1297
- Test coverage ratio: 0.0301
- Next action: Keep `npm run qa:api-operations-contracts` green for 5xx, slow query, webhook failure, auth/payment spike, cron, runtime settings, and preflight observability.
- Frontend samples:
  - src/pages/AITripPlanner.tsx
  - src/pages/AMAPage.tsx
  - src/pages/ARFiltersPage.tsx
  - src/pages/AchievementsPage.tsx
  - src/pages/ActivityFeedPage.tsx
- Backend samples:
  - supabase/functions/_shared/aalCheck.ts
  - supabase/functions/_shared/audit.ts
  - supabase/functions/_shared/audit_test.ts
  - supabase/functions/_shared/auth.ts
  - supabase/functions/_shared/botDetection.ts
- Database samples:
  - supabase/migrations/20260126182101_2f0234ed-56dc-4072-ab57-dfd72543853a.sql
  - supabase/migrations/20260126185227_cda82eb4-ac9e-49b5-9acf-17a1a8079c3d.sql
  - supabase/migrations/20260126191000_58715aeb-e9bb-454c-bb6a-e617cbbce913.sql
  - supabase/migrations/20260126194309_e195e9d5-5e21-4d2c-b212-f7264928e546.sql
  - supabase/migrations/20260126204105_c67b7de4-2860-447e-9fbd-92891b2247a5.sql
- Tests samples:
  - src/test/accountDeletionLifecycle.test.ts
  - src/test/accountExportManifest.test.ts
  - src/test/accountWalletFunctionAnonGrants.test.ts
  - src/test/adminModerationRoleAccess.test.ts
  - src/test/adminSecurityDefinerRpcGrants.test.ts
- Docs samples:
  - docs/ADMIN_CONTROL_AUDIT.md
  - docs/ADMIN_DASHBOARD_PLAN.md
  - docs/ADMIN_PAYMENT_DASHBOARD.md
  - docs/ADMIN_UI_AUDIT.md
  - docs/ALL_ZIVO_LIVE_WEBSITE_AUDIT.md

### Security, Anti-Abuse, Hacker Protection

- Status: covered
- Evidence counts: frontend=794, backend=676, database=738, tests=98, docs=1157
- Test coverage ratio: 0.0444
- Next action: Keep `npm run qa:security-anti-abuse-contracts` green for account takeover, card testing, spam, scraping, fake booking, key leakage, WAF, rate limits, and network-risk controls.
- Frontend samples:
  - src/pages/AITripPlanner.tsx
  - src/pages/AMAPage.tsx
  - src/pages/ARFiltersPage.tsx
  - src/pages/About.tsx
  - src/pages/AccountDeletionInfo.tsx
- Backend samples:
  - supabase/functions/_shared/audit.ts
  - supabase/functions/_shared/auth.ts
  - supabase/functions/_shared/botDetection.ts
  - supabase/functions/_shared/bruteForce.ts
  - supabase/functions/_shared/busWebhookTransitions.ts
- Database samples:
  - supabase/migrations/20260126182101_2f0234ed-56dc-4072-ab57-dfd72543853a.sql
  - supabase/migrations/20260126185227_cda82eb4-ac9e-49b5-9acf-17a1a8079c3d.sql
  - supabase/migrations/20260126191000_58715aeb-e9bb-454c-bb6a-e617cbbce913.sql
  - supabase/migrations/20260126194309_e195e9d5-5e21-4d2c-b212-f7264928e546.sql
  - supabase/migrations/20260126204105_c67b7de4-2860-447e-9fbd-92891b2247a5.sql
- Tests samples:
  - src/test/accountDeletionLifecycle.test.ts
  - src/test/accountExportManifest.test.ts
  - src/test/adminModerationRoleAccess.test.ts
  - src/test/adminSecurityDefinerRpcGrants.test.ts
  - src/test/adminSupportAccountRoleAccess.test.ts
- Docs samples:
  - docs/ADMIN_CONTROL_AUDIT.md
  - docs/ADMIN_UI_AUDIT.md
  - docs/ALL_ZIVO_LIVE_WEBSITE_AUDIT.md
  - docs/API_CONNECTIVITY_AUDIT.md
  - docs/API_CONTRACT.md

### Graphics, Design, Frontend Speed

- Status: covered
- Evidence counts: frontend=1718, backend=954, database=187, tests=64, docs=1414
- Test coverage ratio: 0.0224
- Next action: Keep `npm run qa:frontend-visual-contracts` green for visual route coverage, mobile safe areas, lazy media, loading/error states, and no clipped controls.
- Frontend samples:
  - src/pages/AITripPlanner.tsx
  - src/pages/AMAPage.tsx
  - src/pages/ARFiltersPage.tsx
  - src/pages/AchievementsPage.tsx
  - src/pages/ActivityFeedPage.tsx
- Backend samples:
  - supabase/functions/_shared/aalCheck.ts
  - supabase/functions/_shared/audit.ts
  - supabase/functions/_shared/auth.ts
  - supabase/functions/_shared/contentLinkValidation.ts
  - supabase/functions/_shared/eats-notifications.ts
- Database samples:
  - supabase/migrations/20260126194309_e195e9d5-5e21-4d2c-b212-f7264928e546.sql
  - supabase/migrations/20260126204406_4b930ffe-7701-4cca-8669-5b8015c31411.sql
  - supabase/migrations/20260127224927_9e2a2506-a399-42ca-89b3-e8cf7b5a3733.sql
  - supabase/migrations/20260201015944_d2dcded2-8f84-47d7-b226-bb29a6944d8f.sql
  - supabase/migrations/20260201040315_45c14265-db1d-49f1-94b5-0b6ab7a1e92c.sql
- Tests samples:
  - src/test/accountDeletionLifecycle.test.ts
  - src/test/aiAutomatedDecisionDisclosure.test.ts
  - src/test/apiObservabilityContracts.test.ts
  - src/test/apiOperationsReportSurfaces.test.ts
  - src/test/autoRepairBuildROWorkflowContracts.test.ts
- Docs samples:
  - docs/ADMIN_PAYMENT_DASHBOARD.md
  - docs/ALL_ZIVO_LIVE_WEBSITE_AUDIT.md
  - docs/API_CONTRACT.md
  - docs/AUTH_AND_IDENTITY_FLOW.md
  - docs/CHAT_CALL_VIDEO_AUDIT.md

### Native iOS, Android, OTA, Store Release

- Status: covered
- Evidence counts: frontend=1145, backend=353, database=164, tests=47, docs=975
- Test coverage ratio: 0.0283
- Next action: Keep `npm run qa:native-app-contracts` green for Capacitor config, iOS/Android metadata, OTA safety, store listing alignment, and native release checks.
- Frontend samples:
  - src/pages/AITripPlanner.tsx
  - src/pages/AMAPage.tsx
  - src/pages/ARFiltersPage.tsx
  - src/pages/About.tsx
  - src/pages/AchievementsPage.tsx
- Backend samples:
  - supabase/functions/_shared/botDetection.ts
  - supabase/functions/_shared/contentLinkValidation.ts
  - supabase/functions/_shared/cors.ts
  - supabase/functions/_shared/eats-notifications.ts
  - supabase/functions/_shared/grocery-notifications.ts
- Database samples:
  - supabase/migrations/20260126182101_2f0234ed-56dc-4072-ab57-dfd72543853a.sql
  - supabase/migrations/20260126194309_e195e9d5-5e21-4d2c-b212-f7264928e546.sql
  - supabase/migrations/20260126210051_db732eec-5136-48f3-9aed-f84e414f4307.sql
  - supabase/migrations/20260126210105_93ebc1b8-2f34-4353-8ebe-0cd1ec2b2902.sql
  - supabase/migrations/20260201011854_0dd90e3e-d414-443c-ab60-74ab8b147261.sql
- Tests samples:
  - src/test/apiObservabilityContracts.test.ts
  - src/test/autoRepairBuildROWorkflowContracts.test.ts
  - src/test/botAccountFunctionAnonGrants.test.ts
  - src/test/createPostComposerVisualContracts.test.ts
  - src/test/critical-flows.test.tsx
- Docs samples:
  - docs/ALL_ZIVO_LIVE_WEBSITE_AUDIT.md
  - docs/AUTH_AND_IDENTITY_FLOW.md
  - docs/BUSINESS_SOFTWARE_BILLING_FLOW.md
  - docs/CHAT_CALL_VIDEO_AUDIT.md
  - docs/CROSS_APP_NAVIGATION_FIXES.md

