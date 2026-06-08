# Workflow Coverage

Generated: 2026-06-08T16:40:08.881Z

## Current Gate

- Mode: soft
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

## Priority Workflow Updates

- All tracked workflows have frontend/backend or database evidence plus tests.

## Workflow Evidence

### SSO, Auth, Sessions, Devices

- Status: covered
- Evidence counts: frontend=1047, backend=546, database=823, tests=105, docs=86
- Test coverage ratio: 0.0435
- Next action: Keep `npm run qa:sso-auth-contracts` green for OAuth, passwordless OTP, MFA, trusted devices, active sessions, and role-aware route gates.
- Frontend samples:
  - src/pages/About.tsx
  - src/pages/account/AccountAnalyticsPage.tsx
  - src/pages/account/AccountExportPage.tsx
  - src/pages/account/AccountSecurity.tsx
  - src/pages/account/AccountSessionsPage.tsx
- Backend samples:
  - supabase/functions/aba-payway-checkout/index.ts
  - supabase/functions/account-delete-self/index.ts
  - supabase/functions/account-export/index.ts
  - supabase/functions/account-security-settings/index.ts
  - supabase/functions/account-summary/index.ts
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
  - docs/ADMIN_PAYMENT_DASHBOARD.md
  - docs/ALL_ZIVO_LIVE_WEBSITE_AUDIT.md
  - docs/api-operations-runbook.md
  - docs/api-readiness-report.md
  - docs/API_CONTRACT.md

### Customer Booking, Order, Trip

- Status: covered
- Evidence counts: frontend=2162, backend=428, database=564, tests=84, docs=90
- Test coverage ratio: 0.0266
- Next action: Keep `npm run qa:customer-booking-contracts` green for grocery checkout, order scoping, lodging add-ons, and shopping-order RLS.
- Frontend samples:
  - src/pages/About.tsx
  - src/pages/account/AccountAnalyticsPage.tsx
  - src/pages/account/AccountExportPage.tsx
  - src/pages/account/AccountSecurity.tsx
  - src/pages/account/AccountSessionsPage.tsx
- Backend samples:
  - supabase/functions/aba-payway-checkout/index.ts
  - supabase/functions/account-delete-self/index.ts
  - supabase/functions/account-export/index.ts
  - supabase/functions/admin-create-user-post/index.ts
  - supabase/functions/admin-moderate-message/index.ts
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
  - docs/api-operations-runbook.md
  - docs/API_WEBHOOK_CONTRACT.md

### Shop Owner Setup and Operations

- Status: covered
- Evidence counts: frontend=1335, backend=516, database=715, tests=106, docs=97
- Test coverage ratio: 0.0413
- Next action: Keep `npm run qa:shop-owner-contracts` green for owner setup, dashboard routes, scoped store operations, and RLS/grants.
- Frontend samples:
  - src/pages/About.tsx
  - src/pages/account/AccountExportPage.tsx
  - src/pages/account/AccountSecurity.tsx
  - src/pages/account/AccountSettingsPage.tsx
  - src/pages/account/AccountSubscriptionsPage.tsx
- Backend samples:
  - supabase/functions/aba-payway-checkout/index.ts
  - supabase/functions/account-delete-self/index.ts
  - supabase/functions/account-export/index.ts
  - supabase/functions/account-security-settings/index.ts
  - supabase/functions/admin-broadcast-notification/index.ts
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
  - docs/ADMIN_DASHBOARD_PLAN.md
  - docs/ADMIN_PAYMENT_DASHBOARD.md
  - docs/ADMIN_UI_AUDIT.md
  - docs/ALL_ZIVO_LIVE_WEBSITE_AUDIT.md
  - docs/api-operations-runbook.md

### Client, Staff, Employee Workflows

- Status: covered
- Evidence counts: frontend=1329, backend=510, database=267, tests=54, docs=62
- Test coverage ratio: 0.0256
- Next action: Keep `npm run qa:client-staff-contracts` green for invite acceptance, owner-only staff invites, schedule reads, payroll/rules, training, and client scoping.
- Frontend samples:
  - src/pages/account/AccountAnalyticsPage.tsx
  - src/pages/account/AccountExportPage.tsx
  - src/pages/account/AccountSecurity.tsx
  - src/pages/account/AccountSessionsPage.tsx
  - src/pages/account/AccountSettingsPage.tsx
- Backend samples:
  - supabase/functions/aba-payway-checkout/index.ts
  - supabase/functions/account-delete-self/index.ts
  - supabase/functions/account-export/index.ts
  - supabase/functions/account-security-settings/index.ts
  - supabase/functions/account-summary/index.ts
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
  - src/test/autoRepairInternalFunctionGrants.test.ts
- Docs samples:
  - docs/ALL_ZIVO_LIVE_WEBSITE_AUDIT.md
  - docs/api-operations-runbook.md
  - docs/api-readiness-report.md
  - docs/ARCHITECTURE.md
  - docs/AUTH_AND_IDENTITY_FLOW.md

### Payments, Refunds, Webhooks

- Status: covered
- Evidence counts: frontend=1594, backend=626, database=1110, tests=117, docs=99
- Test coverage ratio: 0.0351
- Next action: Keep `npm run qa:payments-refunds-contracts` green for provider webhooks, idempotent refunds, subscription portals, refund-state UI, and audit ledgers.
- Frontend samples:
  - src/pages/About.tsx
  - src/pages/account/AccountAnalyticsPage.tsx
  - src/pages/account/AccountExportPage.tsx
  - src/pages/account/AccountSecurity.tsx
  - src/pages/account/AccountSessionsPage.tsx
- Backend samples:
  - supabase/functions/aba-payway-checkout/index.ts
  - supabase/functions/account-delete-self/index.ts
  - supabase/functions/account-export/index.ts
  - supabase/functions/account-security-settings/index.ts
  - supabase/functions/account-summary/index.ts
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
  - docs/ADMIN_DASHBOARD_PLAN.md
  - docs/ADMIN_PAYMENT_DASHBOARD.md
  - docs/ADMIN_UI_AUDIT.md
  - docs/ALL_ZIVO_LIVE_WEBSITE_AUDIT.md
  - docs/api-operations-runbook.md

### Payouts, Earnings, Balances

- Status: covered
- Evidence counts: frontend=653, backend=206, database=197, tests=53, docs=72
- Test coverage ratio: 0.0502
- Next action: Keep `npm run qa:payouts-earnings-contracts` green for payout auth, server-gated payout methods, idempotent retries, and auditable ledgers.
- Frontend samples:
  - src/pages/About.tsx
  - src/pages/account/AccountExportPage.tsx
  - src/pages/account/AccountSettingsPage.tsx
  - src/pages/account/AccountTipsPage.tsx
  - src/pages/account/GiftCardsPage.tsx
- Backend samples:
  - supabase/functions/aba-payway-checkout/index.ts
  - supabase/functions/account-delete-self/index.ts
  - supabase/functions/account-export/index.ts
  - supabase/functions/admin-driver-payouts/index.ts
  - supabase/functions/admin-moderate-message/index.ts
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
  - docs/ADMIN_DASHBOARD_PLAN.md
  - docs/ADMIN_PAYMENT_DASHBOARD.md
  - docs/ADMIN_UI_AUDIT.md
  - docs/ALL_ZIVO_LIVE_WEBSITE_AUDIT.md
  - docs/api-operations-runbook.md

### Email Marketing, Consent, Suppression

- Status: covered
- Evidence counts: frontend=595, backend=249, database=230, tests=68, docs=35
- Test coverage ratio: 0.0633
- Next action: Keep `npm run qa:email-marketing-contracts` green for transactional-vs-marketing separation, suppression, consent, and campaign event logging.
- Frontend samples:
  - src/pages/About.tsx
  - src/pages/account/AccountExportPage.tsx
  - src/pages/account/AccountSecurity.tsx
  - src/pages/account/AccountSettingsPage.tsx
  - src/pages/account/BusinessInvoicesPage.tsx
- Backend samples:
  - supabase/functions/account-delete-self/index.ts
  - supabase/functions/account-export/index.ts
  - supabase/functions/account-security-settings/index.ts
  - supabase/functions/admin-broadcast-notification/index.ts
  - supabase/functions/admin-create-user/index.ts
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
  - docs/database-upgrade-readiness-report.md

### Ads, Monetization, Conversion Tracking

- Status: covered
- Evidence counts: frontend=2323, backend=705, database=976, tests=149, docs=103
- Test coverage ratio: 0.0372
- Next action: Keep `npm run qa:ads-monetization-contracts` green for attribution, conversion uploads, Ads Studio ROAS, creator monetization, and provider roadmap coverage.
- Frontend samples:
  - src/pages/About.tsx
  - src/pages/account/AccountAnalyticsPage.tsx
  - src/pages/account/AccountExportPage.tsx
  - src/pages/account/AccountSecurity.tsx
  - src/pages/account/AccountSessionsPage.tsx
- Backend samples:
  - supabase/functions/aba-payway-checkout/index.ts
  - supabase/functions/account-delete-self/index.ts
  - supabase/functions/account-export/index.ts
  - supabase/functions/account-security-settings/index.ts
  - supabase/functions/account-summary/index.ts
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
  - docs/ADMIN_DASHBOARD_PLAN.md
  - docs/ADMIN_PAYMENT_DASHBOARD.md
  - docs/ADMIN_UI_AUDIT.md
  - docs/ALL_ZIVO_LIVE_WEBSITE_AUDIT.md
  - docs/api-operations-runbook.md

### Push Notifications and Notification Center

- Status: covered
- Evidence counts: frontend=514, backend=202, database=106, tests=31, docs=35
- Test coverage ratio: 0.0377
- Next action: Keep `npm run qa:push-notification-contracts` green for token registration, opt-outs, digest dispatch, and service worker routing.
- Frontend samples:
  - src/pages/About.tsx
  - src/pages/account/AccountExportPage.tsx
  - src/pages/account/AccountSecurity.tsx
  - src/pages/account/AccountSettingsPage.tsx
  - src/pages/account/ActivityLogPage.tsx
- Backend samples:
  - supabase/functions/account-delete-self/index.ts
  - supabase/functions/admin-broadcast-notification/index.ts
  - supabase/functions/admin-create-user-post/index.ts
  - supabase/functions/admin-list-created-users/index.ts
  - supabase/functions/ads-studio-auto-winner/index.ts
- Database samples:
  - supabase/migrations/20260126210051_db732eec-5136-48f3-9aed-f84e414f4307.sql
  - supabase/migrations/20260129225210_7429b719-03e7-49dc-98a2-a101f956b59d.sql
  - supabase/migrations/20260129225228_f8acf683-0020-463d-baac-e9c8dda02913.sql
  - supabase/migrations/20260201011854_0dd90e3e-d414-443c-ab60-74ab8b147261.sql
  - supabase/migrations/20260201040315_45c14265-db1d-49f1-94b5-0b6ab7a1e92c.sql
- Tests samples:
  - src/test/deployWorkflowGates.test.ts
  - src/test/errorBoundaryObservability.test.tsx
  - src/test/feedMobileVisualContracts.test.ts
  - src/test/marketingConsentSuppression.test.ts
  - src/test/nativePermissionsDeepLinks.test.ts
- Docs samples:
  - docs/api-readiness-report.md
  - docs/database-upgrade-readiness-report.md
  - docs/dev/capacitor-safe-area.md
  - docs/DOMAINS_AND_REPOS.md
  - docs/end-to-end-platform-readiness.md

### Storage, Media, CDN, Downloads

- Status: covered
- Evidence counts: frontend=973, backend=250, database=217, tests=78, docs=88
- Test coverage ratio: 0.0542
- Next action: Keep `npm run qa:storage-media-contracts`, `npm run qa:database-storage-contracts`, and `npm run platform:test:storage-media` green for upload validation, public, protected, owner, and client/staff media paths plus Data API/RLS gates.
- Frontend samples:
  - src/pages/About.tsx
  - src/pages/account/AccountAnalyticsPage.tsx
  - src/pages/account/AccountExportPage.tsx
  - src/pages/account/AccountSecurity.tsx
  - src/pages/account/AccountSessionsPage.tsx
- Backend samples:
  - supabase/functions/aba-payway-checkout/index.ts
  - supabase/functions/account-delete-self/index.ts
  - supabase/functions/account-export/index.ts
  - supabase/functions/admin-create-user-post/index.ts
  - supabase/functions/admin-delete-user-post/index.ts
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
  - docs/ADMIN_PAYMENT_DASHBOARD.md
  - docs/ALL_ZIVO_LIVE_WEBSITE_AUDIT.md
  - docs/API_CONTRACT.md
  - docs/API_WEBHOOK_CONTRACT.md
  - docs/ARCHITECTURE.md

### Law, Policy, Compliance, Trust

- Status: covered
- Evidence counts: frontend=512, backend=125, database=696, tests=66, docs=59
- Test coverage ratio: 0.0495
- Next action: Keep `npm run qa:legal-policy-contracts` green across legal pages, consent logs, export/delete, grants, and policy-backed booking flows.
- Frontend samples:
  - src/pages/About.tsx
  - src/pages/account/AccountExportPage.tsx
  - src/pages/account/AccountSecurity.tsx
  - src/pages/account/AccountSettingsPage.tsx
  - src/pages/account/ActivityLogPage.tsx
- Backend samples:
  - supabase/functions/account-delete-self/index.ts
  - supabase/functions/account-export/index.ts
  - supabase/functions/admin-refund-approve/index.ts
  - supabase/functions/admin-refund-request/index.ts
  - supabase/functions/admin-refunds/index.ts
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
  - docs/ADMIN_DASHBOARD_PLAN.md
  - docs/ADMIN_PAYMENT_DASHBOARD.md
  - docs/ALL_ZIVO_LIVE_WEBSITE_AUDIT.md
  - docs/api-operations-runbook.md
  - docs/BUSINESS_PAYOUT_FLOW.md

### API, Server Speed, Observability

- Status: covered
- Evidence counts: frontend=2250, backend=721, database=594, tests=113, docs=77
- Test coverage ratio: 0.0317
- Next action: Keep `npm run qa:api-operations-contracts` green for 5xx, slow query, webhook failure, auth/payment spike, cron, runtime settings, and preflight observability.
- Frontend samples:
  - src/pages/account/AccountAnalyticsPage.tsx
  - src/pages/account/AccountExportPage.tsx
  - src/pages/account/AccountSecurity.tsx
  - src/pages/account/AccountSessionsPage.tsx
  - src/pages/account/AccountSettingsPage.tsx
- Backend samples:
  - supabase/functions/aba-payway-checkout/index.ts
  - supabase/functions/account-delete-self/index.ts
  - supabase/functions/account-export/index.ts
  - supabase/functions/account-security-settings/index.ts
  - supabase/functions/account-summary/index.ts
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
  - docs/ADMIN_DASHBOARD_PLAN.md
  - docs/ADMIN_PAYMENT_DASHBOARD.md
  - docs/ADMIN_UI_AUDIT.md
  - docs/ALL_ZIVO_LIVE_WEBSITE_AUDIT.md
  - docs/api-operations-runbook.md

### Security, Anti-Abuse, Hacker Protection

- Status: covered
- Evidence counts: frontend=793, backend=532, database=724, tests=94, docs=61
- Test coverage ratio: 0.0459
- Next action: Keep `npm run qa:security-anti-abuse-contracts` green for account takeover, card testing, spam, scraping, fake booking, key leakage, WAF, rate limits, and network-risk controls.
- Frontend samples:
  - src/pages/About.tsx
  - src/pages/account/AccountAnalyticsPage.tsx
  - src/pages/account/AccountExportPage.tsx
  - src/pages/account/AccountSecurity.tsx
  - src/pages/account/AccountSessionsPage.tsx
- Backend samples:
  - supabase/functions/aba-payway-checkout/index.ts
  - supabase/functions/account-delete-self/index.ts
  - supabase/functions/account-export/index.ts
  - supabase/functions/account-security-settings/index.ts
  - supabase/functions/account-summary/index.ts
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
  - docs/ADMIN_UI_AUDIT.md
  - docs/ALL_ZIVO_LIVE_WEBSITE_AUDIT.md
  - docs/api-operations-runbook.md
  - docs/api-readiness-report.md
  - docs/API_CONTRACT.md

### Graphics, Design, Frontend Speed

- Status: covered
- Evidence counts: frontend=1738, backend=561, database=185, tests=59, docs=52
- Test coverage ratio: 0.0238
- Next action: Keep `npm run qa:frontend-visual-contracts` green for visual route coverage, mobile safe areas, lazy media, loading/error states, and no clipped controls.
- Frontend samples:
  - src/pages/account/AccountAnalyticsPage.tsx
  - src/pages/account/AccountExportPage.tsx
  - src/pages/account/AccountSecurity.tsx
  - src/pages/account/AccountSessionsPage.tsx
  - src/pages/account/AccountSettingsPage.tsx
- Backend samples:
  - supabase/functions/aba-payway-checkout/index.ts
  - supabase/functions/account-delete-self/index.ts
  - supabase/functions/account-export/index.ts
  - supabase/functions/account-security-settings/index.ts
  - supabase/functions/account-summary/index.ts
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
  - src/test/botDetection.test.ts
- Docs samples:
  - docs/ADMIN_PAYMENT_DASHBOARD.md
  - docs/ALL_ZIVO_LIVE_WEBSITE_AUDIT.md
  - docs/api-operations-runbook.md
  - docs/api-readiness-report.md
  - docs/API_CONTRACT.md

### Native iOS, Android, OTA, Store Release

- Status: covered
- Evidence counts: frontend=1183, backend=198, database=162, tests=44, docs=41
- Test coverage ratio: 0.0285
- Next action: Keep `npm run qa:native-app-contracts` green for Capacitor config, iOS/Android metadata, OTA safety, store listing alignment, and native release checks.
- Frontend samples:
  - src/pages/About.tsx
  - src/pages/account/AccountAnalyticsPage.tsx
  - src/pages/account/AccountExportPage.tsx
  - src/pages/account/AccountSecurity.tsx
  - src/pages/account/AccountSessionsPage.tsx
- Backend samples:
  - supabase/functions/ads-studio-generate/index.ts
  - supabase/functions/ads-studio-track-conversion/index.ts
  - supabase/functions/ai-smart-deals/index.ts
  - supabase/functions/approve-lodging-change/index.ts
  - supabase/functions/ar-estimate-send/index.ts
- Database samples:
  - supabase/migrations/20260126182101_2f0234ed-56dc-4072-ab57-dfd72543853a.sql
  - supabase/migrations/20260126194309_e195e9d5-5e21-4d2c-b212-f7264928e546.sql
  - supabase/migrations/20260126210051_db732eec-5136-48f3-9aed-f84e414f4307.sql
  - supabase/migrations/20260126210105_93ebc1b8-2f34-4353-8ebe-0cd1ec2b2902.sql
  - supabase/migrations/20260201011854_0dd90e3e-d414-443c-ab60-74ab8b147261.sql
- Tests samples:
  - src/test/apiObservabilityContracts.test.ts
  - src/test/botAccountFunctionAnonGrants.test.ts
  - src/test/createPostComposerVisualContracts.test.ts
  - src/test/critical-flows.test.tsx
  - src/test/deployWorkflowGates.test.ts
- Docs samples:
  - docs/ALL_ZIVO_LIVE_WEBSITE_AUDIT.md
  - docs/AUTH_AND_IDENTITY_FLOW.md
  - docs/BUSINESS_SOFTWARE_BILLING_FLOW.md
  - docs/CROSS_APP_NAVIGATION_FIXES.md
  - docs/dev/capacitor-safe-area.md

