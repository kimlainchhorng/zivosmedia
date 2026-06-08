# API and Webhook Contract

## Purpose

This contract defines cross-platform API and webhook expectations before production features are implemented.

## Shared Request Fields

Product apps that create shared records should send:

- `zivosmedia_user_id`.
- `source_platform`.
- `app_key`.
- related table or record type.
- related ID.
- idempotency key for write operations.
- metadata limited to non-secret workflow context.

## Payment Webhooks

Provider webhooks must:

- be handled server-side.
- verify provider signatures.
- store provider event IDs.
- process idempotently.
- map provider status to local status.
- update related records only after verified event processing.
- write audit logs.

## Chat Webhooks and Events

Chat events should include:

- `chat_thread_id`.
- `source_platform`.
- `app_key`.
- related IDs.
- participant IDs.
- status or assignment changes.
- audit context.

## Travel/Driver Events

Travel/driver integration events should include:

- `travel_booking_id`.
- `driver_job_id`.
- driver assignment status.
- driver location/status updates when approved.
- `payment_order_id` placeholder.
- `chat_thread_id` placeholder.

## Business/Software Events

Business/software events should include:

- `business_id`.
- `software_product_id`.
- `subscription_id`.
- invoice/payment references.
- entitlement status.
- setup/support status.

## Security Requirements

- no secrets in payloads.
- no card data in payloads.
- server-side signature verification.
- replay protection through idempotency.
- RLS for user-visible records.
- admin-only endpoints for privileged actions.
