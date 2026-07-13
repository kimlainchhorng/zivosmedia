# Payment Security Checklist

Generated: 2026-06-07

## Hard Rules

- Do not store card numbers in Supabase.
- Do not build custom card processing.
- Do not store CVV, magnetic stripe data, or raw payment method payloads.
- Do not expose Stripe secret keys.
- Do not expose Supabase service-role keys.
- Do not commit `.env` files.
- Do not run live charges until the owner approves.
- Use Stripe test mode before live mode.

## Server-Side Boundary

- Create Checkout Sessions only in server-side API routes or Supabase Edge Functions.
- Create subscriptions only server-side.
- Create billing portal sessions only server-side.
- Create refunds only server-side and admin-authorized.
- Create driver/business payouts only server-side and admin/system-authorized.
- Create payment-linked ZivoChat support threads only server-side after verifying owned payment, invoice, subscription, or business records.
- Keep admin payment operations out of browser-exposed clients.

## Webhooks

- Verify Stripe webhook signatures.
- Use raw request body for signature verification.
- Make webhook handlers idempotent.
- Store every provider event in `payment_webhook_events`.
- Log success/failure in `payment_audit_logs`.
- Alert admin on failed webhook processing.

## Supabase Security

- Enable RLS on all payment tables in exposed schemas.
- Grant user-visible SELECT only where needed.
- Keep inserts/updates/deletes for payment tables server-only.
- Use `auth.uid()` for owner-visible payment history.
- Do not use user-editable metadata for authorization decisions.
- Keep service-role access inside Edge Functions or trusted backends.
- Use admin role checks for refunds, payout holds, payout releases, and dispute actions.

## Testing Before Live

Test each flow before live mode:

- checkout success
- checkout cancellation/expiration
- failed payment
- refund
- partial refund
- subscription creation
- subscription cancellation
- failed renewal
- invoice paid
- invoice payment failed
- dispute/chargeback
- driver payout happy path
- driver payout failed path
- webhook retry/idempotency

## Operational Controls

- Rotate Stripe and Supabase secrets after suspected exposure.
- Restrict Stripe Dashboard access by role.
- Restrict live mode access.
- Keep audit logs immutable from browser clients.
- Require admin approval for manual refunds and payout overrides.
- Reconcile provider dashboard totals with ZivoPay records regularly.
