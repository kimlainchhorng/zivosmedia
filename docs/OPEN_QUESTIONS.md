# Open Questions

## Repository Access

The GitHub connector returned 404 Not Found for:

- `kimlainchhorng/zivodriver`.
- `kimlainchhorng/ZIVO-CHAT`.
- `kimlainchhorng/Zivo-Admin`.
- `kimlainchhorng/zivosoftware`.

Owner should connect GitHub app access, verify spelling/capitalization, or create the repos.

<<<<<<< Updated upstream
## Supabase Projects
=======
- **Identity Path A/B (owner ruling 2026-06-07):** **all four apps are Path B** — build/keep the linking bridge (`linked_zivosmedia_users` + `auth_audit_logs` + server exchange) in Travel, Driver, Software; Chat short-circuits on the shared hub (no separate linked table). The ADR's D4 (Driver-only) is **overridden** — do **not** remove the Travel/Software bridges.

Still open below.
>>>>>>> Stashed changes

Need confirmation:

- ZivoChat Supabase project.
- Zivo Business Supabase project.
- Zivo Employee Supabase project.
- ZivoPay/payment database location.

## Repo Boundaries

Need confirmation:

- Whether Zivo Business needs its own repo or remains a module inside another repo.
- Whether Zivo Employee needs its own repo or remains a module inside another repo.
- Whether Zivo Admin should be deployed on `zivoadmin.com` from a dedicated repo or from a module.

## Payment Decisions

Need confirmation:

- ZivoPay database location.
- Stripe Connect account model for driver payouts.
- PayPal marketplace/payout product choice.
- Square payout/marketplace capability and region fit.
- Live payment approval checklist owner.

## Admin Decisions

Need confirmation:

- Zivo Admin repo access.
- platform registry data model.
- health check endpoints per app.
- admin roles and permission model.

## Implementation Rule

<<<<<<< Updated upstream
Do not start PR 2 until owner approves.
=======
1. ZivoChat → hub `slirphzzwcogdbkeicff` (shares the main project).
2. Zivo Business → ZivoSoftware `ydxztoresbdeoeijhxww` backend + hub identity (module, not its own project).
3. Zivo Employee → none yet; greenfield, decide at Step 7 (likely the hub).
4. ZivoPay / payment tables → hub `slirphzzwcogdbkeicff` (owner sign-off required before migration).

Still open: does ZIVO-AI need its own Supabase project?

## Payments

Confirmed payment decisions:

- ZIVO must support Stripe, PayPal, and Square.
- Driver payouts are required.
- Business payouts are required.
- Stripe should be implemented first.
- Use a common ZivoPay provider-adapter abstraction.

Remaining payment questions:

1. Which project owns payment database tables?
2. Which countries/currencies are required first?
3. Who can issue refunds?
4. Who can view disputes and payout records?
5. Which Stripe Connect account type should be used?

## Auth

Resolved 2026-06-07: all four first-party apps are **Path B** — each runs "Continue with
Zivosmedia" (server-side PKCE code exchange) and keeps a local session; Travel/Driver/Software
hold a local `linked_zivosmedia_users` link, Chat short-circuits on the shared hub.
`zivosmedia_user_id` stays the universal join key, with shared identity (Path A) underneath.
(Answers the original Q1–Q3.)

Still open:

1. What is the required MFA policy for Admin?
2. What is the logout policy across apps (coordinated logout / session revocation)?

## Deployment

1. Which Cloudflare project/zone maps to each confirmed domain?
2. Which apps are production now?
3. Which apps are staging only?
4. Are Netlify and Cloudflare both still used for Zivosmedia?
5. Which old aliases should redirect to confirmed domains?

## Implementation Order

Confirmed connection priority:

1. Zivosmedia identity foundation
2. Zivo Admin
3. Zivo Travel + Zivo Driver
4. ZivosChat
5. ZivoPay
6. ZivoSoftware + Zivo Business
7. Zivo Employee

Remaining implementation questions:

1. Should Business <-> Software wait for a standalone Business repo?
2. Should ZivoPay tables start in Zivosmedia or Zivo Admin?
>>>>>>> Stashed changes
