# End-to-End Platform Readiness Plan

Generated: 2026-05-31

This plan turns the broad ZIVO buildout into release lanes for frontend, backend, database, security, legal, payments, marketing, storage, and role workflows.

Generated matrix:

- Human report: `docs/platform-readiness-matrix.md`
- Machine report: `docs/platform-readiness-matrix.json`
- Workflow report: `docs/workflow-coverage.md`
- Workflow test plan: `docs/workflow-test-plan.md`
- Full platform audit: `npm run platform:audit`
- Compact release gate: `npm run release:gate`
- Production release gate: `npm run release:production-gate`
- Regenerate: `npm run qa:platform-readiness`
- Validate matrix: `npm run qa:platform-readiness:check`
- Regenerate workflow report: `npm run qa:workflow-coverage`
- Validate workflow report: `npm run qa:workflow-coverage:check`
- Regenerate workflow test plan: `npm run qa:workflow-test-plan`
- Validate workflow test plan: `npm run qa:workflow-test-plan:check`

## Current Release Gate

Production is not ready for schema pushes or launch until Supabase migration history is reconciled and the strict preflight passes.

- Current preflight summary: `docs/production-preflight-summary.json`
- Current production blockers: missing `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_ACCESS_TOKEN`; API readiness has 1 warning because remote migration history cannot be read without Supabase auth.
- TypeScript type-check is still terminating with `SIGTERM` in this environment when full strict preflight runs.
- Production build is passing after moving the custom service worker source from `public/sw.js` to `src/sw.js` to avoid PWA injectManifest collisions on repeat builds.
- Migration reconciliation plan: `docs/supabase-migration-reconciliation-plan.md`
- Edge Functions inventoried: 283
- Local migrations inventoried: 922
- Page files inventoried: 691

Do not run production `supabase db push`, `supabase db pull`, or migration repair until the candidate map has been reviewed against actual SQL/schema intent.

## Build Order

### 1. Release Safety Foundation

Goal: make the system safe to change.

- Reconcile Supabase migration history.
- Keep `npm run deploy:preflight:strict` as the production gate.
- Keep `npm run security:api-readiness:report`, `npm run security:scan`, and `npm run supabase:upgrade-readiness` in every release checklist.
- Require all new high-risk Edge Functions to use `withSecurity`, strict CORS, and a domain-specific rate limit.
- Keep service-role keys out of frontend code and out of all `VITE_` env vars.

Done when:

- `readyForProductionGate` is true in `docs/production-preflight-summary.json`.
- Linked migration history no longer reports zero exact matches.
- No high-risk function is missing shared security wrappers.

### 2. Auth, SSO, Sessions, and Account Protection

Goal: one reliable identity system for customers, shop owners, staff, creators, drivers, and admins.

- Verify password, magic link, Google OAuth, Apple sign-in, and callback redirects.
- Add a matrix test for each role: guest, customer, owner, staff, driver, creator, admin.
- Confirm protected routes call server-side permission checks for sensitive actions.
- Enforce 2FA for admin, owner payout, refund, and payment settings workflows.
- Add account recovery, session revocation, device list, and suspicious-login notifications to the critical-flow test suite.

Done when:

- Each role can sign in, land on the correct dashboard, access only allowed data, and sign out.
- Admin and payout-related routes require stronger verification.
- Session/device controls work from web and mobile.

### 3. Customer, Owner, Client, and Shop Workflows

Goal: make the primary product paths complete before adding more surfaces.

- Customer: browse, book/order, pay, receive confirmation, message support, cancel/refund where allowed.
- Shop owner: onboard, configure store, manage catalog/services, staff, bookings/orders, payouts, policies, and marketing.
- Client: book, receive reminders, review, subscribe, redeem loyalty or gift cards.
- Staff: accept invite, view schedule, manage assigned bookings/orders, clock in/out if enabled.
- Admin: moderation, refunds, compliance, abuse review, webhook health, and operational audit logs.

Done when:

- Each workflow has one happy-path E2E test and one permission-denied test.
- All money-moving and personally identifiable data actions create audit rows.
- Owner/client wording is consistent across UI, emails, notifications, and legal policy surfaces.

### 4. Payments, Payouts, Refunds, and Webhooks

Goal: protect money flows and keep ledger state consistent.

- Confirm Stripe Connect onboarding, account status, payout readiness, and webhook signature verification.
- Verify checkout, deposits, tips, creator payments, refunds, no-show fees, and subscription renewals.
- Add idempotency keys for every payment and webhook mutation.
- Reconcile payment status from provider webhooks, not client-only success redirects.
- Lock payout settings behind owner/admin authorization, 2FA, and audit logging.

Done when:

- Webhook replay does not duplicate orders, credits, payouts, notifications, or ledger rows.
- Failed, pending, succeeded, refunded, disputed, and cancelled states all render correctly.
- Finance/admin dashboards match database ledger totals.

### 5. Email, Push, SMS, and Marketing

Goal: send the right message, to the right person, with consent.

- Separate transactional messages from marketing campaigns.
- Respect unsubscribe, suppression, consent, age restriction, and regional privacy settings.
- Verify push registration, token refresh, opt-out, digest jobs, and test sends.
- Add campaign throttles and sender reputation protections.
- Keep every outbound message tied to template version, consent basis, recipient, store/campaign, and idempotency key.

Done when:

- Transactional messages still send after marketing opt-out.
- Marketing messages never send without valid consent.
- Unsubscribe and suppression flows are tested end to end.

### 6. Database, Storage, and Media

Goal: make data fast, private, and durable.

- Every exposed table has RLS and policies matching the role model.
- Every storage bucket has explicit read, insert, update, and delete policy decisions.
- Media upload, preview, protected download, retention, and deletion flows are documented.
- Hot paths have indexes for owner dashboards, feeds, booking calendars, chat, orders, and search.
- Large image/video UI uses `SmartImage`, `LazyVideo`, and `npm run perf:media-report`.

Done when:

- RLS tests cover private customer data, shop owner data, staff data, media ownership, and public share-token views.
- Storage upsert works only where intended.
- Feed, search, booking, chat, and dashboard queries have measured plans for production-scale tables.

### 7. Security and Anti-Abuse

Goal: reduce attack impact and make abuse visible.

- Keep WAF, CORS, rate limits, bot checks, IP hash blocklists, and network-risk scoring enabled on sensitive functions.
- Add abuse playbooks for account takeover, card testing, scraping, spam, fake bookings, refund fraud, and API key leakage.
- Add alerting for webhook failures, auth spikes, blocked requests, payment errors, function 5xx, and database slow queries.
- Run dependency audit, secret scan, API readiness, and preflight before each release.
- Consider a dedicated provider for VPN/proxy reputation when traffic justifies it.

Done when:

- Attack simulations fail closed without breaking normal customers.
- Admin security views show request IDs, hashed IP signals, user, function, risk score, decision, and reason.
- Critical functions have rate limits and audit logs.

### 8. Policy, Compliance, and Legal Review

Goal: keep product behavior aligned with published terms.

- Treat legal pages as product requirements, not decoration.
- Counsel should review terms, privacy, refund, cancellation, payout, seller/travel, communication consent, data retention, vulnerability disclosure, and child/age policies before production launch.
- Keep policy version, effective date, acceptance log, and re-consent trigger for material changes.
- Verify regional requirements for California privacy, GDPR-style access/deletion/export, marketing consent, and payments.

Done when:

- Users can view, accept, export, delete, and control privacy settings as promised.
- Policy acceptance is logged with version, user, timestamp, and source.
- Product flows do not promise refunds, notifications, guarantees, or security behaviors that the backend does not enforce.

### 9. Graphics, Brand, and Frontend Quality

Goal: make the product feel finished without slowing it down.

- Standardize brand tokens, icons, empty states, loading states, error states, and mobile safe-area behavior.
- Replace heavy or raw media with optimized assets where possible.
- Verify responsive layouts for customer, owner, shop, admin, legal, marketing, and auth pages.
- Keep core app screens task-first instead of landing-page style.
- Run visual/smoke checks for high-traffic surfaces after UI changes.

Done when:

- No core workflow has clipped text, overlapping controls, broken mobile nav, missing loading/error state, or inaccessible buttons.
- Visual QA covers auth, feed, chat, shop dashboard, checkout, legal, and account settings.

## Verification Command Set

Run locally before release candidates:

```bash
npm run platform:audit
npm run release:gate
npm run release:production-gate
npm run deploy:preflight:strict
```

Use targeted runs while developing:

```bash
npm run qa:platform-readiness
npm run qa:platform-readiness:check
npm run type-check
npm run build
npm run test
npm run test:e2e
npm run security:scan
npm run security:api-readiness:report
npm run supabase:upgrade-readiness
npm run perf:media-report
```

Use deploy/Supabase checks while developing:

```bash
npm run test:rls
npm run deploy:env-check
npm run supabase:migrations:linked:strict
npm run deploy:preflight:local
```

## Immediate Next Work

1. Configure production Supabase deploy env (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_ACCESS_TOKEN`) and refresh the linked migration report.
2. Convert the role workflow list into E2E tests, starting with customer booking/payment and owner payout/settings.
3. Add payment webhook replay/idempotency tests around the highest-risk money flows.
4. Add consent/unsubscribe regression tests for marketing and transactional messages.
5. Add a security drill checklist for account takeover, card testing, spam, and abusive scraping.
