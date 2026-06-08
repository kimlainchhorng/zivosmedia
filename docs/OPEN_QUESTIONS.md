# ZIVO Open Questions

Status: Draft for owner review
Date: 2026-06-07

## Resolved 2026-06-07

Confirmed this session (Supabase `list_projects` + local repos + owner rules):

- **Supabase = exactly 5 projects.** No separate project for Chat, Business, Employee, or Pay.
- **ZivoChat Supabase** → the hub `slirphzzwcogdbkeicff` (shares the main project).
- **ZivoPay / payment DB** → the hub `slirphzzwcogdbkeicff` (zivosmedia is the central payment
  hub; active `feature/zivopay-payments-foundation` branch confirms). Owner sign-off still
  required before payment migrations run.
- **Zivo Business** → a module, not its own repo/project: backend in ZivoSoftware
  (`ydxztoresbdeoeijhxww`), owner UI in the zivosmedia build. Standalone repo only if it later
  needs an independent runtime.
- **Zivo Employee** → greenfield/not started (only a `ZIVO Employees/` folder in zivosmedia);
  build last (Step 7), give it a repo + hub identity then.
- **Repo access**: all 6 confirmed repos are cloned locally with valid `kimlainchhorng/*`
  remotes and commits dated today. `gh` is not installed and no `GH_TOKEN` is set, so access
  could not be re-verified headlessly — install `gh` / set `GH_TOKEN` for PR workflows. No
  404/permission denial was observed.

Still open below.

## Domains

Confirmed 8 domains:

1. `zivosmedia.com`
2. `zivobusiness.com`
3. `zivodriver.com`
4. `zivoemployee.com`
5. `zivoschat.com`
6. `zivosoftware.com`
7. `zivostravel.com`
8. `zivoadmin.com`

Remaining domain questions:

1. Which Cloudflare project/zone maps to each confirmed domain?
2. Should any old aliases remain active or redirect to the confirmed domains?

## GitHub Repos

Confirmed repos:

- `kimlainchhorng/zivosmedia`
- `kimlainchhorng/zivodriver`
- `kimlainchhorng/ZIVO-CHAT`
- `kimlainchhorng/zivostravel`
- `kimlainchhorng/Zivo-Admin`
- `kimlainchhorng/zivosoftware`

Remaining repo questions:

1. Confirm or create Zivo Business repo for `zivobusiness.com`.
2. Confirm or create Zivo Employee repo for `zivoemployee.com`.
3. What role does `kimlainchhorng/ZIVO-AI` play in the ecosystem?

## Supabase

Resolved 2026-06-07 (see the Resolved section above):

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

1. Does each app keep its own Supabase Auth?
2. Should all apps rely only on Zivosmedia login?
3. Which apps need local sessions vs shared identity only?
4. What is the required MFA policy for Admin?
5. What is the logout policy across apps?

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
