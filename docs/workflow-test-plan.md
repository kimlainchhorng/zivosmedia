# Workflow Test Plan

Generated: 2026-08-05T17:43:23.981Z

Source: `docs/workflow-coverage.json`

## Gate Context

- Mode: strict
- Production gate ready: no
- Remote migration history status: unavailable

## Audit Command

- Run `npm run platform:audit` before release candidates. It starts with `npm run security:scan`, regenerates readiness reports, validates generated report contracts, and runs the domain QA contract suite.
- Run `npm run release:gate` after preflight artifacts are refreshed to validate the summary schema, report artifacts, platform readiness matrix, and packaged security scan.
- Run `npm run release:production-gate` in production deploy automation; it includes `npm run release:gate` and strict production summary enforcement.
- Run `npm run deploy:preflight:strict` before production deploys.

## Production Blockers

- Environment readiness has 6 critical finding(s).
- Missing SUPABASE_URL for production backend cron/runtime settings.
- Missing SUPABASE_ANON_KEY for production Edge Function verification and database cron auth.
- Missing SUPABASE_ACCESS_TOKEN for production migration-history verification.
- Supabase remote migration history is unavailable (unavailable).

## Ordered Test Work

1. SSO, Auth, Sessions, Devices
   - Status: covered
   - Test coverage ratio: 0.042
   - Target: `tests/e2e/sso-session-roles.spec.ts, tests/e2e/auth-sso-role-matrix.spec.ts`
   - Command: `npm run test:e2e -- tests/e2e/sso-session-roles.spec.ts tests/e2e/auth-sso-role-matrix.spec.ts`
   - Acceptance:
     - Password, magic-link/OTP, Google, and Apple entry points have route coverage.
     - Customer, owner, staff, creator, driver, and admin stay mapped to protected routes and role gates.
     - Session revoke/device management blocks stale access.
2. Customer Booking, Order, Trip
   - Status: covered
   - Test coverage ratio: 0.0302
   - Target: `src/test/workflows/customer-booking-order.test.ts`
   - Command: `npm run test -- src/test/workflows/customer-booking-order.test.ts`
   - Acceptance:
     - Customer can browse, checkout/book, and view confirmation.
     - Cancel/refund states match policy and permissions.
     - Guest/authenticated paths do not expose another customer data.
3. Shop Owner Setup and Operations
   - Status: covered
   - Test coverage ratio: 0.0419
   - Target: `src/test/workflows/shop-owner-workflow.test.ts`
   - Command: `npm run test -- src/test/workflows/shop-owner-workflow.test.ts`
   - Acceptance:
     - Owner onboarding reaches a configured shop dashboard.
     - Catalog, staff, settings, payments, and marketing tabs render.
     - Non-owners cannot mutate owner-only shop data.
4. Client, Staff, Employee Workflows
   - Status: covered
   - Test coverage ratio: 0.0245
   - Target: `src/test/workflows/client-staff-workflow.test.ts`
   - Command: `npm run test -- src/test/workflows/client-staff-workflow.test.ts`
   - Acceptance:
     - Staff invite acceptance lands on the correct workspace.
     - Client/staff users cannot access owner-only settings.
     - Schedule/payroll/client data requires the correct role.
5. Payments, Refunds, Webhooks
   - Status: covered
   - Test coverage ratio: 0.0327
   - Target: `src/test/workflows/payments-refunds-webhooks.test.ts`
   - Command: `npm run test -- src/test/workflows/payments-refunds-webhooks.test.ts`
   - Acceptance:
     - Webhook replay does not duplicate ledger/order rows.
     - Payment states reconcile from provider webhook, not client redirect only.
     - Refund/dispute/cancel states render and audit correctly.
6. Payouts, Earnings, Balances
   - Status: covered
   - Test coverage ratio: 0.0463
   - Target: `src/test/workflows/payouts-earnings-workflow.test.ts`
   - Command: `npm run test -- src/test/workflows/payouts-earnings-workflow.test.ts`
   - Acceptance:
     - Payout settings require owner/admin authorization.
     - Stripe Connect/earnings states render pending, active, restricted, and failed.
     - Payout changes are audit logged and idempotent.
7. Email Marketing, Consent, Suppression
   - Status: covered
   - Test coverage ratio: 0.0612
   - Target: `src/test/workflows/email-marketing-consent.test.ts`
   - Command: `npm run test -- src/test/workflows/email-marketing-consent.test.ts`
   - Acceptance:
     - Transactional sends are separated from marketing sends.
     - Unsubscribe and suppression state block marketing campaigns.
     - Consent basis/template/version is recorded for outbound messages.
8. Ads, Monetization, Conversion Tracking
   - Status: covered
   - Test coverage ratio: 0.0368
   - Target: `src/test/workflows/ads-monetization-tracking.test.ts`
   - Command: `npm run test -- src/test/workflows/ads-monetization-tracking.test.ts`
   - Acceptance:
     - Ads Studio attribution ties clicks/creative variants to order revenue.
     - Google Ads, Meta CAPI, and provider conversion uploads are deduped and auditable.
     - Creator subscriptions, paid video, affiliate tracking, and payouts stay connected.
9. Push Notifications and Notification Center
   - Status: covered
   - Test coverage ratio: 0.0372
   - Target: `src/test/workflows/push-notifications-workflow.test.ts`
   - Command: `npm run test -- src/test/workflows/push-notifications-workflow.test.ts`
   - Acceptance:
     - Push token registration requires an authenticated user.
     - Notification preferences can disable marketing/non-critical sends.
     - Digest/test-send paths do not bypass opt-out state.
10. Storage, Media, CDN, Downloads
   - Status: covered
   - Test coverage ratio: 0.0519
   - Target: `src/test/fileUploadSecurity.test.ts, src/test/workflows/storage-media-workflow.test.ts`
   - Command: `npm run platform:test:storage-media`
   - Acceptance:
     - Client and server upload validators reject unsafe names, empty files, spoofed types, and active-content payload markers.
     - Public, owner-only, client-only, and protected media paths are covered.
     - Storage upsert requires the intended insert/select/update permissions.
     - Delete/retention behavior matches user privacy and policy promises.
11. Law, Policy, Compliance, Trust
   - Status: covered
   - Test coverage ratio: 0.049
   - Target: `src/test/workflows/legal-policy-workflow.test.ts`
   - Command: `npm run test -- src/test/workflows/legal-policy-workflow.test.ts`
   - Acceptance:
     - Policy routes render required pages.
     - Account export/delete/privacy controls are linked from account surfaces.
     - Policy acceptance or consent logging has database/backend evidence.
12. API, Server Speed, Observability
   - Status: covered
   - Test coverage ratio: 0.0301
   - Target: `src/test/workflows/api-operations-readiness.test.ts`
   - Command: `npm run test -- src/test/workflows/api-operations-readiness.test.ts`
   - Acceptance:
     - Critical functions have health/error visibility.
     - Webhook failures and function 5xx are surfaced to admin/ops.
     - Slow query and auth/payment spike checks have documented owners.
13. Security, Anti-Abuse, Hacker Protection
   - Status: covered
   - Test coverage ratio: 0.0444
   - Target: `src/test/workflows/security-anti-abuse.test.ts`
   - Command: `npm run test -- src/test/workflows/security-anti-abuse.test.ts`
   - Acceptance:
     - High-risk Edge Functions use shared security wrappers.
     - Rate-limit and network-risk decisions are auditable.
     - Attack drills cover account takeover, card testing, spam, scraping, and fake bookings.
14. Graphics, Design, Frontend Speed
   - Status: covered
   - Test coverage ratio: 0.0224
   - Target: `tests/visual/workflow-visual-readiness.spec.ts, tests/visual/safe-area.spec.ts, tests/e2e/mobile-layout-no-overlap.spec.ts, src/test/loadingErrorStates.test.tsx`
   - Command: `npm run qa:frontend-visual-contracts && npm run test:visual && npm run qa:safe-area:all && npm run test -- src/test/loadingErrorStates.test.tsx`
   - Acceptance:
     - Auth, feed, grocery, business, support, security, shop, driver, creator, admin, checkout, legal, and settings surfaces stay covered by visual route contracts.
     - No clipped primary buttons or incoherent overlapping text.
     - Safe-area top and bottom snapshots have committed baselines and seed cookie consent before capture.
     - Media-heavy surfaces use lazy/optimized image/video primitives.
15. Native iOS, Android, OTA, Store Release
   - Status: covered
   - Test coverage ratio: 0.0283
   - Target: `src/test/workflows/native-app-release.test.ts, src/test/otaDeployBypass.test.ts`
   - Command: `npm run test -- src/test/workflows/native-app-release.test.ts src/test/otaDeployBypass.test.ts`
   - Acceptance:
     - Capacitor, iOS, Android, and store metadata stay aligned.
     - OTA updates are checksum-verified and gated by native version when needed.
     - OTA preflight bypass requires an explicit emergency risk acknowledgement.
     - Native release scripts and platform readiness gates stay wired.
