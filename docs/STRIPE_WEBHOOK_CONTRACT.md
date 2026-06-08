# Stripe Webhook Contract

Generated: 2026-06-07

Stripe webhooks are the source of truth for final payment, subscription, invoice, refund, dispute, and payout state. Browser redirects are not authoritative.

## Endpoint

`POST /api/webhooks/stripe`

Supabase Edge Function equivalent: `zivopay-stripe-webhook`. The legacy vertical `stripe-webhook` can keep serving existing flows while product teams migrate onto ZivoPay records.

## Security Contract

- Read the raw request body before parsing JSON.
- Verify `Stripe-Signature` using `STRIPE_WEBHOOK_SECRET`.
- Store every accepted event in `payment_webhook_events`.
- Enforce uniqueness on `(provider, provider_event_id)`.
- Process events idempotently.
- Never expose `STRIPE_SECRET_KEY`.
- Never expose `SUPABASE_SERVICE_ROLE_KEY`.
- Return 2xx only after the event is durably recorded or already known.

## Event Handling

| Stripe Event | ZivoPay Action |
| --- | --- |
| `checkout.session.completed` | Mark checkout transaction paid or subscription checkout complete |
| `checkout.session.expired` | Mark order cancelled if not paid |
| `payment_intent.succeeded` | Mark transaction paid and set `paid_at` |
| `payment_intent.payment_failed` | Mark transaction failed with failure code/message |
| `charge.succeeded` | Store charge ID for dispute/refund correlation |
| `charge.refunded` | Update refund status, order status, audit log |
| `charge.dispute.created` | Mark payment disputed and create admin alert |
| `customer.subscription.created` | Upsert subscription |
| `customer.subscription.updated` | Update subscription period/status/cancel data |
| `customer.subscription.deleted` | Mark subscription cancelled/expired |
| `invoice.paid` | Upsert invoice and mark subscription active when applicable |
| `invoice.payment_failed` | Mark invoice/subscription past due |
| `payout.paid` | Mark driver/business payout paid when Connect is enabled |
| `payout.failed` | Mark payout failed and alert admin |

## Metadata Requirements

Checkout Sessions, PaymentIntents, Subscriptions, and Invoices created by ZivoPay should include metadata:

- `payment_order_id`
- `zivosmedia_user_id`
- `source_platform`
- `related_table`
- `related_id`
- `business_id`, when relevant
- `travel_booking_id`, when relevant
- `driver_job_id`, when relevant
- `software_product_id`, when relevant

## Idempotency

- Use Stripe idempotency keys for provider mutations.
- Use local `idempotency_records` for API retry safety.
- Webhooks should upsert by provider IDs and never double-create orders, subscriptions, invoices, refunds, or payouts.
- Retried webhook events increment `retry_count` and keep the last `processing_error`.

## Failure Handling

Webhook processing errors must be visible in Zivo Admin under payment webhooks and audit logs. Failed events can be retried by admin/server tooling after code or data issues are corrected.

## ZivoChat Support Linkage

ZivoChat does not receive Stripe webhooks and does not process payment provider payloads directly. Payment-related support conversations are linked through `payment_support_threads` after the user opens a support request for an owned payment, invoice, subscription, travel booking, driver job, or business billing record. Admins use the payment support queue to see the related payment context beside webhook history and audit logs.

## Official References

- [Stripe webhooks](https://docs.stripe.com/webhooks)
- [Stripe Checkout Sessions API](https://docs.stripe.com/api/checkout/sessions)
- [Stripe subscriptions](https://docs.stripe.com/billing/subscriptions/creating)
