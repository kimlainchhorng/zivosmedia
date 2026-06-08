# ZIVO PR Roadmap

Status: Draft for owner review
Date: 2026-06-07

## Rules For Every PR

- No direct push to main.
- Use feature branches.
- Use pull requests.
- No destructive migrations.
- No live payment until test mode passes.
- No secrets in frontend code.
- No `.env` files in GitHub.
- No service-role keys in browser.
- Add audit logs for auth, payment, admin, chat, and webhook events.
- Add RLS for sensitive tables.
- Run lint, build, tests, and type checks before PR.

## Implementation Order

### PR 1: Documentation only in Zivosmedia

Add all architecture docs. No production code changes.

Deliverables:

- `ZIVO_ECOSYSTEM_MAP.md`
- `DOMAINS_AND_REPOS.md`
- `REPO_INVENTORY.md`
- `SUPABASE_PROJECT_MAP.md`
- `PLATFORM_RELATIONSHIPS.md`
- `AUTH_AND_IDENTITY_FLOW.md`
- `PAYMENT_ARCHITECTURE.md`
- `API_WEBHOOK_CONTRACT.md`
- `ADMIN_DASHBOARD_PLAN.md`
- `PR_ROADMAP.md`
- `OPEN_QUESTIONS.md`

### PR 2: Zivosmedia identity foundation

Repo: `kimlainchhorng/zivosmedia`
Branch: `feature/zivosmedia-identity-foundation`

Add:

- `zivosmedia_user_id` standard
- account linking model
- `Continue with Zivosmedia` auth flow
- auth audit logs
- server-side token/code exchange plan or implementation
- no frontend secrets

### PR 3: Zivo Admin platform registry

Repo: `kimlainchhorng/Zivo-Admin`
Branch: `feature/platform-registry`

Add:

- platform registry table
- list all 8 domains
- list GitHub repos
- list Supabase project refs
- app health status fields
- admin dashboard view
- audit logs

### PR 4: Zivo Travel + Zivo Driver contract

Repos:

- `kimlainchhorng/zivostravel`
- `kimlainchhorng/zivodriver`

Branches:

- `feature/travel-driver-contract`
- `feature/driver-travel-contract`

Add:

- `travel_booking_id`
- `driver_job_id`
- request driver from travel
- driver accepts/rejects job
- driver status syncs back to travel
- admin can view relation
- `chat_thread_id` placeholder
- `payment_order_id` placeholder

### PR 5: ZivoPay foundation

Start in Zivosmedia or Zivo Admin after deciding database owner.

Add:

- `payment_customers`
- `payment_orders`
- `payment_transactions`
- `payment_subscriptions`
- `payment_invoices`
- `payment_refunds`
- `driver_payouts`
- `business_payouts`
- `payment_webhook_events`
- `payment_audit_logs`
- provider adapter interface: Stripe, PayPal, Square

### PR 6: Travel <-> Driver integration

Connect travel bookings to driver jobs, payment order, payout placeholder, chat placeholder, and status webhooks.

### PR 7: ZivoSoftware product/subscription foundation

Create software product and subscription foundation.

### PR 8: Zivo Business billing/software ownership foundation

Define business ownership of software subscriptions and billing.

### PR 9: Business <-> Software integration

Connect business activation, subscription, billing, and software status.

### PR 10: ZivoChat shared thread model

Create shared thread model with app keys and related record IDs.

### PR 11: ZivoChat integration with Travel, Driver, Business, Software, Admin

Integrate chat creation and admin visibility across apps.

### PR 12: ZivoPay payment dashboard and webhook logs in Zivo Admin

Add payment dashboard, webhook logs, refunds, payouts, invoices, and audit views.

## Final Connection Priority

1. Zivosmedia identity foundation
2. Zivo Admin
3. Zivo Travel + Zivo Driver
4. ZivosChat
5. ZivoPay
6. ZivoSoftware + Zivo Business
7. Zivo Employee

## Recommended First PR

PR 1 should be opened against `kimlainchhorng/zivosmedia` from a docs-only feature branch. It should not include code, migrations, deployment changes, secrets, or schema changes.

Suggested branch:

- `docs/zivo-master-build-plan`

Scope:

- Add `docs/ZIVO_MASTER_BUILD_PLAN.md`.
- Add the supporting architecture documents.
- Add or update README link to the master plan.

Non-goals:

- No runtime code.
- No Supabase migrations.
- No Edge Functions.
- No payment provider setup.
- No DNS, Cloudflare, Netlify, or deployment changes.
- No `.env` or secret changes.

Validation:

- `git diff --check`
- Manual review for secret-like values.
- Owner review of `OPEN_QUESTIONS.md`.
