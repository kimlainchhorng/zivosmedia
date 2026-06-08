# API Connectivity Audit

**Date:** 2026-06-08 · Audit only. Evidence cites real files. `qa:api-operations-contracts` passes.

## Inventory

| Capability | Status | Path(s) | Notes |
|------------|--------|---------|-------|
| Health endpoints | ✅ Complete | `cloudflare/worker.ts` `/healthz`; `supabase/functions/zivosmedia-health/` | app + supabase + version |
| SSO authorize: issue code | ✅ Complete | `supabase/functions/zivosmedia-auth-issue-code/` | PKCE S256, redirect/scope validation, audit logs |
| SSO authorize: validate/exchange | ✅ Complete | `supabase/functions/zivosmedia-auth-validate-code/` | client-secret + PKCE, atomic single-use, expiry/revoke |
| Identity event dispatch (webhooks) | ✅ Complete | `supabase/functions/zivosmedia-user-event-dispatch/`, `app_integrations`, `platform_webhook_events` | fan-out user_updated/disabled, dual-signature, per-app timeout |
| Stripe webhook | ✅ Complete | `supabase/functions/stripe-webhook/` | checkout/intent/refund/dispute → orders + notifications |
| PayPal/Square webhooks | ✅ Complete | `paypal/square-{eats,grocery,lodging,tip}-webhook/` | per-provider event-id dedup tables |
| ZivoPay webhook | ✅ Complete | `supabase/functions/zivopay-stripe-webhook/` | subscriptions/invoices/payouts |
| Idempotency | ✅ Complete | `_shared/idempotency.ts`, `idempotency_records` (24h TTL) | header-keyed |
| Rate limiting | ✅ Complete | `cloudflare/worker.ts` (auth 80 / general 600 per 10m), `_shared/withSecurity.ts` named limits | |
| Retry / dead-letter | 🟡 Partial | `jobs_queue`, `platform_webhook_events` (retry_count/next_retry_at) | **schemas present, no cron/scheduler wired** |
| API request logs | 🟡 Partial | `zivosmedia_auth_audit_logs`, `payment_audit_logs` | no unified per-request log table |

## Top gaps
- **P0** Travel→Driver API contract + ZivoChat thread-created receiver are not implemented here (cross-repo). Define `docs/TRAVEL_DRIVER_INTEGRATION.md` + receivers.
- **P1** Wire retry crons for `jobs_queue` and `platform_webhook_events` (exponential backoff).
- **P1** Add unified `api_request_logs` (method/path/status/duration/user/ip) for latency + abuse diagnosis.
- **P2** Webhook replay protection: add timestamp+nonce to identity webhooks (some signatures sign body only).

## Readiness flags
- P0: cross-repo Travel→Driver + chat-thread receivers.
- P1: retry crons; unified request logging.
- P2: webhook replay hardening.

## Maps to roadmap
PR 24 (Travel↔Driver), PR 13 (chat thread contract), PR 27 (webhook logs + retries), PR 26 (admin audit logs).
