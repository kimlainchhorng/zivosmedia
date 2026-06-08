# ZivoPay Payment Flow

Generated: 2026-06-07

## One-Time Checkout

1. A product app creates a local order, booking, job, invoice, or add-on record.
2. The product app calls a server-side ZivoPay endpoint with `zivosmedia_user_id`, `source_platform`, `related_table`, `related_id`, amount, currency, and metadata.
3. ZivoPay finds or creates a `payment_customers` row and Stripe Customer.
4. ZivoPay creates a `payment_orders` row with `pending` status.
5. ZivoPay creates a Stripe Checkout Session in `payment` mode.
6. ZivoPay creates or updates `payment_transactions` with the Checkout Session ID and `checkout_created` status.
7. The browser redirects to Stripe Checkout.
8. Stripe sends webhooks to the server-side webhook endpoint.
9. The webhook verifies the Stripe signature, stores `payment_webhook_events`, updates local status idempotently, and writes `payment_audit_logs`.
10. Product apps consume the status change through server-side webhook fanout, polling, or admin review.

## Subscription Checkout

1. ZivoSoftware or Zivo Business sends product, price, business, and user context to ZivoPay.
2. ZivoPay creates a Stripe Checkout Session in `subscription` mode.
3. Stripe creates or updates Customer, Subscription, Invoice, and PaymentIntent resources.
4. Webhooks update `payment_subscriptions`, `payment_invoices`, and `payment_transactions`.
5. ZivoSoftware activates the selected software only after a successful webhook, not after a browser redirect alone.

## Billing Portal

1. The authenticated user requests billing management.
2. ZivoPay verifies ownership of the `provider_customer_id`.
3. ZivoPay creates a Stripe Billing Portal session server-side.
4. The browser redirects to Stripe-hosted billing management.
5. Subscription, invoice, and payment status changes are accepted only through verified Stripe webhooks.

## Status Mapping

| Local Status | Meaning |
| --- | --- |
| `pending` | Local order exists, provider checkout not created |
| `checkout_created` | Provider checkout/session exists |
| `paid` | Provider confirms successful payment |
| `failed` | Provider confirms failed payment |
| `cancelled` | Checkout/order cancelled before payment |
| `refunded` | Fully refunded |
| `partially_refunded` | Partially refunded |
| `disputed` | Chargeback/dispute opened |

## Required Zivosmedia APIs

- `GET /payments` -> protected connected-workflow landing, currently redirects to `/wallet` while preserving query and handoff context.
- `POST /api/payments/create-checkout-session` -> `zivopay-create-checkout-session`
- `POST /api/payments/create-subscription-checkout` -> `zivopay-create-subscription-checkout`
- `POST /api/payments/create-billing-portal` -> `zivopay-create-billing-portal`
- `GET /api/payments/history` -> `zivopay-history`
- `GET /api/payments/order/:id` -> `zivopay-order?id=:id`
- `POST /api/webhooks/stripe` -> `zivopay-stripe-webhook`

All mutation routes must run server-side and must use idempotency keys for charge, checkout, refund, subscription, and payout creation.

## Travel API Mapping

- `POST /api/travel/create-payment` -> `travel-create-payment`
- `POST /api/travel/create-driver-payment` -> `travel-create-driver-payment`
- `POST /webhooks/payments/travel-paid` -> `travel-payment-paid`
- `POST /webhooks/payments/travel-refunded` -> `travel-payment-refunded`
- `POST /webhooks/payments/travel-payment-failed` -> `travel-payment-failed`

## Driver API Mapping

- `POST /api/driver/create-payout-account` -> `driver-create-payout-account`
- `GET /api/driver/earnings` -> `driver-earnings`
- `GET /api/driver/payouts` -> `driver-payouts`
- `POST /webhooks/payments/driver-payout-paid` -> `driver-payout-paid`
- `POST /webhooks/payments/driver-payout-failed` -> `driver-payout-failed`

## Software API Mapping

- `POST /api/software/create-subscription` -> `software-create-subscription`
- `POST /api/software/cancel-subscription` -> `software-cancel-subscription`
- `POST /api/software/change-plan` -> `software-change-plan`
- `POST /webhooks/payments/software-subscription-active` -> `software-subscription-active`
- `POST /webhooks/payments/software-subscription-past-due` -> `software-subscription-past-due`
- `POST /webhooks/payments/software-subscription-cancelled` -> `software-subscription-cancelled`

## Business API Mapping

- `GET /api/business/billing-profile` -> `business-billing-profile?business_id=:id`
- `GET /api/business/subscriptions` -> `business-subscriptions?business_id=:id`
- `GET /api/business/invoices` -> `business-invoices?business_id=:id`
- `POST /api/business/update-billing-info` -> `business-update-billing-info`

## Admin API Mapping

- `GET /admin/payments` -> `admin-payments`
- `GET /admin/payments/:id` -> `admin-payment-detail?id=:id`
- `GET /admin/subscriptions` -> `admin-subscriptions`
- `GET /admin/invoices` -> `admin-invoices`
- `GET /admin/refunds` -> `admin-refunds`
- `GET /admin/driver-payouts` -> `admin-driver-payouts`
- `POST /admin/refunds/request` -> `admin-refund-request`
- `POST /admin/refunds/approve` -> `admin-refund-approve`
- `POST /admin/payouts/hold` -> `admin-payout-hold`
- `POST /admin/payouts/release` -> `admin-payout-release`
- `GET /admin/payment-webhooks` -> `admin-payment-webhooks`
- `GET /admin/payment-audit-logs` -> `admin-payment-audit-logs`
- `GET /admin/payment-support-threads` -> `admin-payment-support-threads`
- `POST /admin/payment-support/update` -> `admin-payment-support-update`

## ZivoChat Payment Support Mapping

- `POST /api/chat/payment-support` -> `zivochat-create-payment-support`
- `GET /api/chat/payment-support` -> `zivochat-payment-support-threads`

Payment-related ZivoChat threads must include `zivosmedia_user_id`, `source_platform`, `chat_thread_id`, and any related `payment_id`, `invoice_id`, `subscription_id`, `travel_booking_id`, `driver_job_id`, or `business_id`. The create endpoint validates owned payment, invoice, subscription, and business records before inserting `payment_support_threads`; it does not process payments.
