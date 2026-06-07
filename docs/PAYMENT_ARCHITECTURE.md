# ZivoPay / Zivosmedia Payments Architecture

Generated: 2026-06-07

ZivoPay is the shared payment layer for Zivosmedia, Zivo Travel, Zivo Driver, ZivoSoftware, Zivo Business, ZivoChat, and Zivo Admin. Zivosmedia stays the central identity and payment hub: every payment record links to `zivosmedia_user_id`, `source_platform`, the platform record that created the payment, provider customer IDs, provider payment IDs, local status, webhook history, and audit logs.

## Provider Decision

Stripe is the default provider.

- Use Stripe Checkout for one-time customer payments.
- Use Stripe Billing for software/business subscriptions, renewals, invoices, trials, coupons, and plan changes.
- Use Stripe Connect if Zivo operates as a marketplace where drivers or businesses receive payouts.
- Keep provider fields generic enough for a future owner-approved provider change.

Zivo must not store card numbers, CVV, magnetic stripe data, or raw payment method payloads in Supabase. Only store provider references such as customer IDs, checkout session IDs, payment intent IDs, subscription IDs, invoice IDs, refund IDs, charge IDs, connected account IDs, payout IDs, and status snapshots.

## System Roles

| Platform | Payment Role |
| --- | --- |
| Zivosmedia | Central identity, payment customer profile, payment history, billing dashboard, saved provider customer reference |
| Zivo Travel | Booking payments, deposits, full travel package payments, add-ons, cancellation fees, refunds |
| Zivo Driver | Driver job earnings, commission, payout eligibility, payout status |
| ZivoSoftware | Software products, setup fees, subscriptions, invoices, trials, renewals, plan changes |
| Zivo Business | Business billing owner, billing profile, tax/billing details, software subscriptions and invoices |
| ZivoChat | Support conversations linked to payments, refunds, subscriptions, invoices, driver jobs, and business records |
| Zivo Admin | Payment control plane for transactions, refunds, disputes, subscriptions, invoices, payouts, webhooks, and audit logs |

## Data Ownership

- Zivosmedia owns canonical payment records in the main Supabase project.
- Product apps create payment requests through server-side API routes or Supabase Edge Functions.
- Product apps keep their local booking/job/business/software records, but payment state is reconciled through ZivoPay.
- Zivo Admin reads and mutates payments only through server-side admin APIs.
- Users can read their own visible payment history through RLS-filtered records or secure server endpoints.

## Core Tables

- `payment_customers`
- `business_billing_profiles`
- `payment_orders`
- `payment_transactions`
- `payment_subscriptions`
- `payment_invoices`
- `payment_refunds`
- `driver_payouts`
- `payment_webhook_events`
- `payment_audit_logs`
- `payment_support_threads`

Amounts are stored in the smallest currency unit, such as cents. Currency is lowercase ISO 4217 text.

## Seller vs Marketplace Decision

Phase 1 assumes Zivo is the seller of record for customer charges unless the owner explicitly approves marketplace operation. If drivers or businesses receive money through the platform, the implementation must add Stripe Connect or an equivalent marketplace payout system before live payouts.

## Required Links

Every payment order must include:

- `zivosmedia_user_id`
- `source_platform`
- `order_type`
- `related_table`
- `related_id`
- amount and currency
- local payment status
- provider metadata references once created

Platform-specific nullable fields connect the order to `travel_booking_id`, `driver_job_id`, `business_id`, and `software_product_id`.

## Implementation Phases

1. Payment architecture, Stripe-first provider decision, seller vs marketplace decision, database design, security checklist.
2. Zivosmedia/ZivoPay foundation: customers, orders, transactions, checkout, webhooks, provider IDs only.
3. Zivo Travel payments and refunds, including optional driver job linkage through `travel-create-payment`, `travel-create-driver-payment`, and server-side travel payment webhook adapters.
4. Zivo Driver earnings and payouts, including payout account onboarding, driver-visible earnings/payout history, payout eligibility, shared `driver_payouts`, and Connect IDs.
5. ZivoSoftware subscriptions, invoices, trials, setup fees, plan changes, catalog plans, and `business_software_entitlements` activation.
6. Zivo Business billing profiles, subscriptions, invoice history, and billing-info updates through `business-billing-profile`, `business-subscriptions`, `business-invoices`, and `business-update-billing-info`.
7. Zivo Admin dashboard and payment operations through admin-only Edge Functions for payments, subscriptions, invoices, refunds, driver payouts, webhook events, audit logs, refund approval, and payout holds/releases.
8. ZivoChat payment support thread linkage through `payment_support_threads`, customer support intake, admin assignment, and payment audit logs.

## References

- [Stripe Checkout Sessions API](https://docs.stripe.com/api/checkout/sessions)
- [Stripe subscriptions overview](https://docs.stripe.com/billing/subscriptions/creating)
- [Stripe webhooks](https://docs.stripe.com/webhooks)
- [Stripe Connect overview](https://docs.stripe.com/connect/how-connect-works)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
