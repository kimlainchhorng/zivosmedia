# Zivo Admin Payment Dashboard

Generated: 2026-06-07

Zivo Admin is the control plane for all ZivoPay activity.

## Modules

- Payment dashboard
- Transaction search
- Customer billing profiles
- Travel payments
- Driver payouts
- Business subscriptions
- Software subscriptions
- Invoices
- Refunds
- Disputes and chargebacks
- Coupons and promos
- Taxes and fees
- Payment webhooks
- Audit logs
- Payment support threads
- Failed payments
- Payout holds
- Platform revenue report

## Admin Must See

- who paid
- source platform
- related booking/order/subscription/job/business/software/chat record
- provider status
- app local status
- refund status
- payout status
- webhook history
- processing errors
- audit logs

## Admin APIs

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

All admin APIs require an authenticated admin session. Stripe secret keys and Supabase service-role keys stay inside Edge Functions only.

## Endpoint Contracts

### `GET /admin/payments`

Returns recent `payment_orders` with nested `payment_transactions`.

Supported query parameters:

- `limit`
- `source_platform`
- `status`
- `zivosmedia_user_id`
- `business_id`

### `GET /admin/payments/:id`

Returns one payment order with:

- `payment_transactions`
- `payment_refunds`
- `payment_webhook_events`
- `payment_audit_logs`

The detail endpoint loads related rows by explicit IDs so admin visibility does not depend on browser-side joins.

### `POST /admin/refunds/request`

Body:

```json
{
  "payment_transaction_id": "uuid",
  "amount": 2500,
  "reason": "Customer requested cancellation"
}
```

Creates a local `payment_refunds` row with `requested` status and writes `payment_audit_logs`.

### `POST /admin/refunds/approve`

Body:

```json
{
  "refund_id": "uuid"
}
```

Creates the Stripe refund server-side with an idempotency key, stores `provider_refund_id`, updates payment status, and writes `payment_audit_logs`.

### `POST /admin/payouts/hold`

Body:

```json
{
  "payout_id": "uuid",
  "reason": "Manual review"
}
```

Sets `driver_payouts.status` to `held`.

### `POST /admin/payouts/release`

Body:

```json
{
  "payout_id": "uuid",
  "reason": "Review passed"
}
```

Sets `driver_payouts.status` back to `eligible`.

### `GET /admin/payment-support-threads`

Returns payment-linked ZivoChat support threads from `payment_support_threads`.

Supported query parameters:

- `limit`
- `status`
- `priority`
- `source_platform`
- `zivosmedia_user_id`

### `POST /admin/payment-support/update`

Body:

```json
{
  "support_thread_id": "uuid",
  "assigned_admin_id": "uuid",
  "status": "pending_admin",
  "priority": "high"
}
```

Updates assignment, status, or priority and writes `payment_audit_logs`.

## Filters

Dashboard filters should include:

- date range
- source platform
- customer/user
- business
- booking
- driver job
- software product
- provider
- payment status
- refund status
- subscription status
- payout status
- dispute status
- failed webhook events

## Action Rules

- Refund request can be created by support/admin.
- Refund approval requires admin permission.
- Payout hold/release requires admin permission.
- Manual payout resolution requires admin permission and audit notes.
- Dispute updates should come from provider webhooks or admin reconciliation.
- Admin actions must write `payment_audit_logs`.

## Revenue Reporting

Revenue report should separate:

- gross collected
- refunds
- disputes
- platform fees
- driver earnings
- payout failures/holds
- software recurring revenue
- setup fees
- travel booking revenue
- taxes and fees
