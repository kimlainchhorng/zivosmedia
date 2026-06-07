# Zivo Business and ZivoSoftware Billing Flow

Generated: 2026-06-07

## ZivoSoftware Role

ZivoSoftware sells business software products, setup fees, monthly subscriptions, yearly subscriptions, trials, custom invoices, renewals, upgrades, downgrades, coupons, and cancellations.

Required subscription fields:

- `business_id`
- `zivosmedia_user_id`
- `software_product_id`
- `subscription_id`
- `price_id`
- `plan_name`
- `billing_interval`
- `trial_end`
- `current_period_start`
- `current_period_end`
- `payment_status`
- `subscription_status`
- `invoice_id`
- `created_at`
- `updated_at`

## Software Subscription Flow

1. Business owner signs in with Zivosmedia.
2. Business chooses a software product and plan.
3. ZivoSoftware calls ZivoPay to create a subscription checkout.
4. Stripe Billing creates or updates customer, subscription, invoice, and payment resources.
5. ZivoPay webhook updates `payment_subscriptions` and `payment_invoices`.
6. ZivoSoftware activates the product only after verified webhook success.
7. Zivo Business shows the active product, subscription period, and invoices.
8. Zivo Admin manages status, failed renewals, cancellation, and disputes.

## Subscription Statuses

- `trialing`
- `active`
- `past_due`
- `unpaid`
- `cancelled`
- `incomplete`
- `paused`
- `expired`

## Zivo Business Billing Profile

The shared `business_billing_profiles` table stores the business billing owner, payment customer link, billing email, tax fields, billing address, default currency, and business-level payment status.

Required business billing fields:

- `business_id`
- `business_owner_zivosmedia_user_id`
- `payment_customer_id`
- `billing_email`
- `tax_id`, if needed
- `billing_address`
- `default_currency`
- `payment_status`
- `created_at`
- `updated_at`

## Business APIs

- `GET /api/business/billing-profile` -> `business-billing-profile?business_id=:id`
- `GET /api/business/subscriptions` -> `business-subscriptions?business_id=:id`
- `GET /api/business/invoices` -> `business-invoices?business_id=:id`
- `POST /api/business/update-billing-info` -> `business-update-billing-info`

Business billing endpoints require an authenticated Zivosmedia user who owns or administers the business. They read from `business_billing_profiles`, `payment_subscriptions`, `payment_invoices`, and `business_software_entitlements`. Billing profile updates create or update the Stripe Customer server-side and store only provider/customer references in Supabase.

## Software APIs

- `POST /api/software/create-subscription` -> `software-create-subscription`
- `POST /api/software/cancel-subscription` -> `software-cancel-subscription`
- `POST /api/software/change-plan` -> `software-change-plan`
- `POST /webhooks/payments/software-subscription-active` -> `software-subscription-active`
- `POST /webhooks/payments/software-subscription-past-due` -> `software-subscription-past-due`
- `POST /webhooks/payments/software-subscription-cancelled` -> `software-subscription-cancelled`

The shared catalog tables are `software_products` and `software_pricing_plans`. Verified Stripe subscription webhooks update `payment_subscriptions`, `payment_invoices`, and `business_software_entitlements`; the entitlement table is the activation switch for business software access.

## Activation Rule

Browser redirects are not proof of payment. ZivoSoftware must activate, renew, downgrade, or cancel product access from verified webhook state or an admin-reviewed provider reconciliation job.
