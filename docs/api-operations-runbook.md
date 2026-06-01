# API Operations Runbook

This runbook is the production ops contract for API speed, availability, webhook health, and abuse spikes. It complements `docs/api-readiness-report.md`, `docs/platform-readiness-matrix.md`, and the admin webhook/security pages.

## Production Gates

- `npm run security:api-readiness -- --write-report`
- `npm run qa:platform-readiness`
- `npm run qa:workflow-coverage`
- `npm run qa:workflow-test-plan`

Remote Supabase migration checks require CLI auth. Setup guide: `docs/supabase-migration-auth-setup.md`.
Strict deploy preflight also requires backend Supabase env values. Setup guide: `docs/supabase-deploy-env-setup.md`.
Production deploy CI secrets checklist: `docs/production-deploy-secrets.md`.

## Signals And Owners

| Signal | Primary owner | Source | Alert rule | First response |
| --- | --- | --- | --- | --- |
| Function 5xx | API/Ops | Supabase Edge Function logs, `withSecurity` `request_failed`, `x-request-id` | Any critical payment/auth/admin function has 5xx > 1% for 5 minutes, or 5+ failures in 10 minutes | Pull function logs by route and request ID, check latest deploy, roll back or disable traffic path if errors touch checkout/auth/admin. |
| Webhook failure | Payments/Ops | Stripe webhook dashboard, `webhook_events`, `grocery_paypal_webhook_events`, `grocery_square_webhook_events`, lodging webhook event tables, admin webhook status pages | Any provider webhook failure count > 0 for 15 minutes, or pending payment mismatch older than 5 minutes | Replay provider event after idempotency check, compare order/payment row, escalate to payments owner if money state diverges. |
| Slow query | Database/Ops | Supabase Query Performance, `pg_stat_statements`, database upgrade readiness report | Query p95 > 1 second on checkout/search/admin lists, or any query > 5 seconds during peak traffic | Capture SQL fingerprint, check missing indexes/RLS filters, add an index or pagination guard before scaling API retries. |
| Auth spike | Security/Ops | `rate_limits`, `security_events`, `network_security_events`, `auth_login` limiter, admin security overview | Login failures or rate-limit blocks double baseline in 15 minutes, or one IP hash triggers repeated auth blocks | Review network risk and user agent signals, block high-risk IP hashes, tighten auth limiter if attack continues. |
| Payment spike | Payments/Security | `rate_limits`, payment Edge Functions using `rateLimitDb`, Stripe/PayPal/Square dashboards, financial ledgers | Payment attempts or provider errors double baseline in 15 minutes, or duplicate idempotency keys appear | Confirm idempotency row reuse, pause risky payment entry point, check provider status, notify support before retrying charges. |

## Admin Visibility Checklist

- Admins can inspect webhook delivery state from `src/pages/admin/AdminWebhookStatusPage.tsx` and lodging webhook event pages.
- Security staff can inspect blocked requests, request IDs, hashed IP/network signals, and rate-limit events from admin security pages.
- API responders must include an `x-request-id` and `withSecurity` must log both `request_completed` and `request_failed`.
- Webhook handlers must store provider event IDs or payment intent IDs before mutating order, booking, payout, refund, wallet, or ledger rows.
- `docs/api-readiness-report.md` must show zero loose Edge Function security backlog before release, and its method gate backlog should shrink as mutating routes move to wrapper-level `allowedMethods`.

## Incident Notes

- Treat client redirect success as advisory only; provider webhook or server-side confirmation owns payment state.
- Never retry a payment/refund/payout mutation without checking the idempotency key, provider object ID, and local ledger row first.
- For database slow query work, prefer scoped indexes and pagination over increasing function timeouts.
- When hardening a route, add `allowedMethods` to `withSecurity()` instead of relying only on handler-local method checks. This rejects bad verbs before request bodies, WAF bypass exceptions, or service-role logic run.
- Record owner, request ID, provider event ID, and final customer-visible state in the incident log before closing.
