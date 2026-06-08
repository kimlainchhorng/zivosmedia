# ZivoPay Payment Architecture

## Role

ZivoPay/Zivosmedia Payments is the shared payment layer for all ZIVO apps. Do not build separate payment logic differently in every app.

## Providers

ZIVO must support:

- Stripe.
- PayPal.
- Square.

Implementation order:

1. Stripe adapter.
2. PayPal adapter.
3. Square adapter.

Use Stripe first. Keep provider abstraction generic enough for PayPal and Square without blocking Stripe implementation.

## Shared Records

Every payment record should connect to:

- `zivosmedia_user_id`.
- `source_platform`.
- related record ID.
- provider customer ID.
- payment provider.
- payment status.
- audit logs.

## Provider Adapter Shape

Each provider adapter should support:

- create one-time checkout.
- create subscription checkout when supported.
- create billing/customer portal when supported.
- verify webhook signature.
- normalize webhook event.
- create refund.
- create payout/transfer when supported.
- map provider status to ZivoPay status.

## Payouts

Driver payouts: yes.
Business payouts: yes.

Use marketplace payout systems such as Stripe Connect or provider equivalents when ZIVO pays drivers or businesses.

## Safety Rules

- Do not store card numbers.
- Do not build custom card processing.
- Do not expose provider secret keys.
- Do not expose Supabase service-role keys.
- Use server-side API routes or Supabase Edge Functions for payment provider calls.
- Verify webhooks.
- Process webhooks idempotently.
- Log payment events and errors.
- Use sandbox/test mode before live mode.
- No live payment without owner approval.

## Open Decision

Confirm whether ZivoPay records live in the Zivosmedia Supabase project or in a separate payment database controlled by Zivosmedia.
