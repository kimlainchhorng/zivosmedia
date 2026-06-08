# ZIVO Master Build Plan

Status: Draft for owner review
Date: 2026-06-07
Owner: ZIVO LLC

## Purpose

This is the index for the ZIVO LLC master build plan. It links the architecture, inventory, Supabase ownership, platform relationships, auth, payment, API/webhook, Admin dashboard, PR roadmap, and open-question documents that must be reviewed before implementation.

No production code, secrets, migrations, DNS, auth settings, payment settings, or deployment settings should change until this plan is approved.

## Confirmed Source Of Truth

Confirmed domains:

1. `zivosmedia.com`
2. `zivobusiness.com`
3. `zivodriver.com`
4. `zivoemployee.com`
5. `zivoschat.com`
6. `zivosoftware.com`
7. `zivostravel.com`
8. `zivoadmin.com`

Confirmed repos:

- `kimlainchhorng/zivosmedia`
- `kimlainchhorng/zivodriver`
- `kimlainchhorng/ZIVO-CHAT`
- `kimlainchhorng/zivostravel`
- `kimlainchhorng/Zivo-Admin`
- `kimlainchhorng/zivosoftware`

Repos still needed:

- Zivo Business repo for `zivobusiness.com`
- Zivo Employee repo for `zivoemployee.com`

Payment decisions:

- Zivosmedia is the central payment identity hub.
- Zivo Admin is the payment control dashboard.
- ZIVO must support Stripe, PayPal, and Square through a shared ZivoPay provider-adapter layer.
- Stripe is the first provider to implement.
- Driver payouts and business payouts are required.
- No live payment launch until test/sandbox mode passes and the owner approves.

## Documents

| Document | Purpose |
| --- | --- |
| [ZIVO_ECOSYSTEM_MAP.md](./ZIVO_ECOSYSTEM_MAP.md) | Maps all Zivo platforms and how they connect. |
| [DOMAINS_AND_REPOS.md](./DOMAINS_AND_REPOS.md) | Records confirmed domains, repos, missing repos, and GitHub access warning. |
| [REPO_INVENTORY.md](./REPO_INVENTORY.md) | Confirms repos, frameworks, commands, deploy targets, auth, Supabase refs, missing items, and first PR recommendations. |
| [SUPABASE_PROJECT_MAP.md](./SUPABASE_PROJECT_MAP.md) | Maps apps to known and unconfirmed Supabase projects. |
| [PLATFORM_RELATIONSHIPS.md](./PLATFORM_RELATIONSHIPS.md) | Defines Travel-Driver, Business-Software, Chat, Employees, Admin, and Payment relationships. |
| [AUTH_AND_IDENTITY_FLOW.md](./AUTH_AND_IDENTITY_FLOW.md) | Defines Continue with Zivosmedia, linking, sessions, sync, disabled users, audit, and RLS/security. |
| [PAYMENT_ARCHITECTURE.md](./PAYMENT_ARCHITECTURE.md) | Defines ZivoPay / Zivosmedia Payments, Stripe-first flow, webhooks, payouts, invoices, and test-mode rules. |
| [API_WEBHOOK_CONTRACT.md](./API_WEBHOOK_CONTRACT.md) | Defines health, auth exchange, Travel-Driver, Business-Software, Chat, Payment, and Admin API contracts. |
| [ADMIN_DASHBOARD_PLAN.md](./ADMIN_DASHBOARD_PLAN.md) | Defines Admin modules and required views. |
| [PR_ROADMAP.md](./PR_ROADMAP.md) | Defines the safe PR order from documentation through payments/Admin. |
| [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md) | Lists owner decisions required before coding. |

## Recommended First PR

PR 1 should be documentation-only in `kimlainchhorng/zivosmedia`.

Scope:

- Add this master plan index.
- Add the linked planning documents.
- Do not modify runtime code.
- Do not add migrations.
- Do not change production configuration.
- Do not commit secrets or `.env` files.

## Approval Gate

Implementation should not begin until the owner confirms the remaining open items:

- Supabase project ownership for Chat, Business, Employees, and Payments.
- Whether Business and Employee repos already exist or need to be created.
- ZivoPay / payment database location.

## Owner Review Checklist

Before approving PR 1, review:

- Ecosystem map matches the intended ZIVO product model.
- Domains and repos match [DOMAINS_AND_REPOS.md](./DOMAINS_AND_REPOS.md).
- Supabase project map assigns known projects correctly.
- Unknown project owners are listed in `OPEN_QUESTIONS.md`.
- Platform relationships match the desired Travel-Driver, Business-Software, Chat, Employees, Admin, and Payment workflows.
- Continue with Zivosmedia flow is acceptable as the identity direction.
- Payment architecture can start Stripe-first test-mode planning while keeping PayPal and Square adapter paths.
- API/webhook contract covers all required app-to-app communication.
- Admin dashboard modules match operations needs.
- PR roadmap order is safe and matches business priority.

Approval means the next Codex task may start PR 2 or PR 3 only as directed by the owner.
