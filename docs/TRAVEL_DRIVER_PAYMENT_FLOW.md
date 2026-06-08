# Zivo Travel and Driver Payment Flow

Generated: 2026-06-07

## Travel Payments

Zivo Travel creates travel payment requests for booking deposits, full package payments, airport pickup, tours, add-on services, cancellation fees, refunds, and partial refunds.

Required fields:

- `travel_booking_id`
- `zivosmedia_user_id`
- `payment_id`
- `checkout_session_id`
- `payment_intent_id`
- `amount`
- `currency`
- `payment_status`
- `refund_status`
- `driver_job_id`, if applicable
- `created_at`
- `updated_at`

Travel statuses map to the shared `payment_orders.status` values: `pending`, `checkout_created`, `paid`, `failed`, `cancelled`, `refunded`, `partially_refunded`, and `disputed`.

## Travel Flow

1. Customer books travel in Zivo Travel.
2. Zivo Travel creates the booking and calls ZivoPay to create a payment order.
3. ZivoPay creates Stripe Checkout and stores provider references.
4. Stripe webhook marks the transaction `paid`, `failed`, `cancelled`, `refunded`, `partially_refunded`, or `disputed`.
5. If the booking requires a driver, Zivo Travel creates or links a Zivo Driver job with `driver_job_id`.
6. Driver payout is tracked separately from customer payment.
7. Zivo Admin sees booking, payment status, refund status, driver job status, and payout status.

## Travel APIs

- `POST /api/travel/create-payment` -> `travel-create-payment`
- `POST /api/travel/create-driver-payment` -> `travel-create-driver-payment`
- `POST /webhooks/payments/travel-paid` -> `travel-payment-paid`
- `POST /webhooks/payments/travel-refunded` -> `travel-payment-refunded`
- `POST /webhooks/payments/travel-payment-failed` -> `travel-payment-failed`

The create endpoints are customer-authenticated and create canonical `payment_orders` / `payment_transactions` rows with `source_platform = 'zivo_travel'`. The travel webhook adapters are server-to-server and require the Supabase service bearer token; Stripe itself should still enter through `zivopay-stripe-webhook`.

## Driver Job Payments

Driver job payments can originate from Zivo Travel or Zivo Driver. Customer funds are collected by Zivo. Driver earnings become payout-eligible only after job completion and admin/system checks.

Required driver payout fields:

- `driver_job_id`
- `travel_booking_id`, if related
- `driver_id`
- `zivosmedia_user_id`
- `gross_amount`
- `platform_fee`
- `driver_earning`
- `payout_id`
- `payout_status`
- `payment_status`
- `completed_at`
- `payout_available_at`
- `paid_out_at`

## Driver Payout Flow

1. Travel booking or driver order creates a ZivoPay payment.
2. Customer pays Zivo through Stripe Checkout.
3. Driver job is assigned.
4. Driver completes the job.
5. Admin/system marks payout eligible.
6. Stripe Connect transfer or payout is created if marketplace mode is approved.
7. ZivoPay stores payout provider IDs, commission, status, and audit logs.

## Driver Payout Statuses

- `not_ready`
- `pending_completion`
- `eligible`
- `payout_pending`
- `paid`
- `failed`
- `held`
- `cancelled`
