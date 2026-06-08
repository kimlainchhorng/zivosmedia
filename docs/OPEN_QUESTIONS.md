# ZIVO Open Questions

Status: Draft for owner review
Date: 2026-06-07

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

1. What Supabase project owns ZivoChat long term?
2. What Supabase project owns Zivo Business?
3. What Supabase project owns Zivo Employee?
4. Which app owns ZivoPay / payment database tables?

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
