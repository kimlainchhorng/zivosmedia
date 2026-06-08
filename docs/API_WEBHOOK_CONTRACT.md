# ZIVO API and Webhook Contract

Status: Draft for owner review
Date: 2026-06-07

## Purpose

Define how Zivo apps communicate.

## Common Conventions

- JSON only unless documented.
- HTTPS only in production.
- Server-to-server endpoints require signed tokens, webhook signatures, or admin credentials.
- Browser clients never receive service-role keys.
- Every privileged action creates an audit log.
- Idempotency keys are required for payment, webhook, and job-creation flows.

## Health Endpoints

Every app should expose:

```http
GET /health
GET /api/health
```

Response:

```json
{
  "status": "ok",
  "app_key": "zivo-travel",
  "version": "0.1.0",
  "supabase": "reachable",
  "timestamp": "2026-06-07T00:00:00.000Z"
}
```

## Auth Exchange Endpoints

Product apps expose:

```http
POST /auth/zivosmedia/exchange
```

Body:

```json
{
  "code": "one-time-code",
  "code_verifier": "pkce-verifier",
  "redirect_uri": "https://app.example/auth/callback"
}
```

Server validates with Zivosmedia and creates local session/profile.

## Travel to Driver APIs

Travel creates driver job request:

```http
POST /api/driver-jobs
```

Body:

```json
{
  "travel_booking_id": "uuid",
  "zivosmedia_user_id": "uuid",
  "pickup": {},
  "dropoff": {},
  "scheduled_at": "2026-06-07T00:00:00.000Z",
  "metadata": {}
}
```

## Driver to Travel Webhooks

Driver sends status update:

```http
POST /webhooks/driver/job-status
```

Body:

```json
{
  "driver_job_id": "uuid",
  "travel_booking_id": "uuid",
  "status": "accepted",
  "driver_user_id": "uuid",
  "zivosmedia_user_id": "uuid",
  "updated_at": "2026-06-07T00:00:00.000Z"
}
```

## Business to Software APIs

Business requests software activation:

```http
POST /api/software/subscriptions
```

Body:

```json
{
  "business_id": "uuid",
  "zivosmedia_user_id": "uuid",
  "software_product_id": "uuid",
  "plan_key": "starter",
  "payment_id": "uuid"
}
```

## Software to Business Webhooks

Software sends subscription update:

```http
POST /webhooks/software/subscription-updated
```

## Chat APIs

Create or find thread:

```http
POST /api/chat/threads
```

Required fields:

- `app_key`
- `source_platform`
- `zivosmedia_user_id`
- `related_record_type`
- `related_record_id`
- `participants`

## Payment Webhooks

Payment provider webhooks enter through Zivosmedia Payments or ZivoPay:

```http
POST /webhooks/payments/stripe
POST /webhooks/payments/paypal
POST /webhooks/payments/square
```

Rules:

- Verify provider signature.
- Store event ID.
- Process idempotently.
- Link event to source platform and record.
- Audit processing result.

## Payment Provider Adapter Contract

All apps should use one common payment abstraction instead of separate app-specific payment logic.

Provider adapters:

- `stripe_adapter`
- `paypal_adapter`
- `square_adapter`

Minimum adapter methods:

- create customer
- create checkout/payment order
- create subscription
- create invoice
- refund payment
- read transaction status
- process webhook event
- create payout where provider supports it

Payment records must connect to:

- `zivosmedia_user_id`
- `source_platform`
- related app record
- `provider`
- `provider_customer_id`
- `payment_order_id`
- `transaction_id`
- `subscription_id`, if subscription
- `payout_id`, if payout
- `invoice_id`, if invoice
- `refund_id`, if refund
- `status`
- audit logs

## Admin APIs

Zivo Admin consumes:

- `GET /api/platform/registry`
- `GET /api/platform/registry/resolve?domain=...`
- `GET /api/platform/health`
- `GET /admin/users/:zivosmedia_user_id`
- product queue endpoints/RPCs
- payment dashboard endpoints
- audit log endpoints

Admin-only endpoints require staff auth and server-side secrets only.
