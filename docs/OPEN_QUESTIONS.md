# Open Questions

## Repository Access

The GitHub connector returned 404 Not Found for:

- `kimlainchhorng/zivodriver`.
- `kimlainchhorng/ZIVO-CHAT`.
- `kimlainchhorng/Zivo-Admin`.
- `kimlainchhorng/zivosoftware`.

Owner should connect GitHub app access, verify spelling/capitalization, or create the repos.

## Supabase Projects

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

Do not start PR 2 until owner approves.
