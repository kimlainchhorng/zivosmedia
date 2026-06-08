# ZIVO Payment Architecture

Status: Draft for owner review
Date: 2026-06-07

## Purpose

Define ZivoPay / Zivosmedia Payments before implementation.

Confirmed payment provider support:

1. Stripe
2. PayPal
3. Square

Implement Stripe first. Use one common ZivoPay / Zivosmedia Payments abstraction with provider adapters, then add PayPal and Square after the database model and Admin payment dashboard are stable.

## Current Ownership

ZivoPay is the shared Zivosmedia Payments layer:

- Central payment identity hub: Zivosmedia
- Payment control dashboard: Zivo Admin
- Current route: `https://zivosmedia.com/payments`
- Payment database location: still needs confirmation
- First provider implementation: Stripe

Each app can create a payment request, but payment logic must not be built differently in every app. Apps should call the common payment layer.

## Provider Adapters

Provider adapters:

- `stripe_adapter`
- `paypal_adapter`
- `square_adapter`

### Stripe

Stripe is the first provider to implement because it supports online checkout, subscriptions, and marketplace-style driver/business payouts through Stripe Connect.

### PayPal

PayPal should be added as an additional checkout and payout option. PayPal Payouts can send money to multiple recipients using emails, phone numbers, or PayPal IDs.

### Square

Square should be added through the same provider-adapter pattern for business payments, in-person/terminal payments, Square-supported online payments, refunds, webhooks, and related payment workflows.

## Payment Types

### One-Time Payments

Use for:

- Travel booking checkout
- One-off software setup fees
- Support or service payments
- Manual invoices

Recommended Stripe object:

- Checkout Session or Payment Intent

### Subscriptions

Use for:

- Business software subscriptions
- Premium business tools
- Recurring service plans

Recommended Stripe objects:

- Customer
- Product
- Price
- Subscription
- Invoice

### Invoices

Use for:

- Business billing
- Manual service billing
- Software renewal billing

### Refunds

Refund records should link to:

- original payment
- `zivosmedia_user_id`
- source platform
- related record ID
- admin actor, if admin initiated

### Disputes

Dispute records should store:

- provider dispute ID
- payment ID
- amount/currency
- status
- evidence status
- related app/source record

### Driver Payouts

Driver payouts are required.

Potential payout models:

- Stripe Connect Express/Custom
- PayPal Payouts as an additional payout option
- Square-supported payout or business payment workflows where applicable

No live payouts until test mode passes and owner approves.

### Business Payouts

Business payouts are required.

Business payout records should link to business profile, owner identity, payment provider, payout status, invoices, and audit events.

## Shared Payment Record Shape

Every payment should include:

- `id`
- `zivosmedia_user_id`
- `source_platform`
- `source_record_type`
- `source_record_id`
- `provider`
- `provider_customer_id`
- `payment_order_id`
- `transaction_id`
- `subscription_id`
- `payout_id`
- `invoice_id`
- `refund_id`
- `amount`
- `currency`
- `status`
- `metadata`
- `created_at`
- `updated_at`

## Payment Webhooks

Use backend routes or Supabase Edge Functions.

Minimum Stripe events:

- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `invoice.created`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `charge.refunded`
- `charge.dispute.created`
- `charge.dispute.updated`

PayPal and Square webhook event lists should be added when those adapters are implemented. The shared processing requirements stay the same.

Webhook rules:

- Verify Stripe signature server-side.
- Verify PayPal and Square webhook signatures when those providers are enabled.
- Store event ID for idempotency.
- Never trust browser-submitted payment status.
- Do not log secret values.
- Audit every processed event.

## Admin Payment Dashboard

Zivo Admin should show:

- Payments
- Refunds
- Disputes
- Driver payouts
- Business payouts
- Business/software invoices
- Subscription status
- Webhook events
- Failed webhook processing
- Payment audit logs

## Test Mode Before Live Mode

Required before live payment:

- Stripe test mode configured first.
- PayPal sandbox configured before PayPal launch.
- Square sandbox configured before Square launch.
- Webhook signature verified.
- Test checkout succeeds.
- Test subscription succeeds.
- Test refund succeeds.
- Test failed payment recorded.
- Admin dashboard shows event trail.
- No card numbers stored.
- No Stripe, PayPal, or Square secret keys exposed.
- No Supabase service-role keys exposed.

## Security Rules

- Do not store card numbers.
- Do not expose Stripe, PayPal, or Square secret keys.
- Do not expose Supabase service-role keys.
- Do not commit `.env` files.
- Use backend routes or Supabase Edge Functions.
- Store provider IDs, not raw payment credentials.
