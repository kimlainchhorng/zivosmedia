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

The 16 canonical architecture documents (owner-specified set), plus the detailed inventory:

| # | Document | Purpose |
| --- | --- | --- |
| 1 | [ZIVO_ECOSYSTEM_MAP.md](./ZIVO_ECOSYSTEM_MAP.md) | Maps all Zivo platforms and how they connect. |
| 2 | [DOMAINS_AND_REPOS.md](./DOMAINS_AND_REPOS.md) | Confirmed domains, repos, missing repos, and GitHub access warning. |
| 3 | [SUPABASE_PROJECT_MAP.md](./SUPABASE_PROJECT_MAP.md) | Maps apps to the 5 confirmed Supabase projects. |
| 4 | [PLATFORM_RELATIONSHIPS.md](./PLATFORM_RELATIONSHIPS.md) | Travel-Driver, Business-Software, Chat, Employees, Admin, Payment relationships. |
| 5 | [AUTH_AND_IDENTITY_FLOW.md](./AUTH_AND_IDENTITY_FLOW.md) | Continue with Zivosmedia, linking, sessions, sync, disabled users, audit, RLS. |
| 6 | [TRAVEL_DRIVER_FLOW.md](./TRAVEL_DRIVER_FLOW.md) | Travel↔Driver job creation, status sync, chat/admin/payment touchpoints. |
| 7 | [BUSINESS_SOFTWARE_FLOW.md](./BUSINESS_SOFTWARE_FLOW.md) | Business↔Software activation, subscriptions, setup support, billing. |
| 8 | [ZIVOCHAT_FLOW.md](./ZIVOCHAT_FLOW.md) | Shared cross-app chat thread schema and lifecycle. |
| 9 | [PAYMENT_ARCHITECTURE.md](./PAYMENT_ARCHITECTURE.md) | ZivoPay provider-adapter model, Stripe-first, webhooks, test-mode rules. |
| 10 | [DRIVER_PAYOUT_FLOW.md](./DRIVER_PAYOUT_FLOW.md) | Driver payout preconditions, ledger, status, admin controls. |
| 11 | [BUSINESS_PAYOUT_FLOW.md](./BUSINESS_PAYOUT_FLOW.md) | Business payout preconditions, ledger, status, admin controls. |
| 12 | [API_WEBHOOK_CONTRACT.md](./API_WEBHOOK_CONTRACT.md) | Health, auth exchange, Travel-Driver, Business-Software, Chat, Payment, Admin contracts. |
| 13 | [ADMIN_DASHBOARD_PLAN.md](./ADMIN_DASHBOARD_PLAN.md) | Admin modules and required views. |
| 14 | [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) | Secrets, DB/RLS, auth-exchange, webhook, payment, deployment rules. |
| 15 | [PR_ROADMAP.md](./PR_ROADMAP.md) | Safe PR order from documentation through payments/Admin. |
| 16 | [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md) | Owner decisions required before coding (with 2026-06-07 resolutions). |
| + | [REPO_INVENTORY.md](./REPO_INVENTORY.md) | Detailed per-repo inventory: frameworks, commands, deploy, auth, env, first PRs. |
| + | [SUPABASE_TABLE_INVENTORY.md](./SUPABASE_TABLE_INVENTORY.md) | Live per-project table inventory + the ZivoPay consolidation map (fragmented payment tables → unified model). |
| + | [STEP1_IDENTITY_IMPLEMENTATION_BRIEF.md](./STEP1_IDENTITY_IMPLEMENTATION_BRIEF.md) | Codex worklist for Step-1 identity (all-four-Path-B ruling); Phase A non-gated + Phase B owner-gated. |

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

Resolved 2026-06-07 (see [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md)): Supabase ownership for
Chat/Business/Employee/Pay — Chat + Pay = hub `slirphzzwcogdbkeicff`; Business = ZivoSoftware
backend + hub identity; Employee = greenfield. Business/Employee need no separate repo yet.

Implementation should not begin until the owner confirms the remaining open items:

- Explicit owner sign-off to run the first ZivoPay (Stripe, test-mode) migration on the hub.
- First currencies/countries, refund + dispute authority, and Stripe Connect account type.
- Admin MFA policy + cross-app logout policy; Cloudflare zone-per-domain mapping.
- Role of `kimlainchhorng/ZIVO-AI` in the ecosystem.

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
