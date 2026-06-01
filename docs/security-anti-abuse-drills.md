# Security Anti-Abuse Drills

Generated: 2026-05-31

## Purpose

These drills keep the hacker-protection workflow testable across account takeover, card testing, spam, scraping, fake bookings, and key leakage. They map each attack to the local code surface that should block, rate-limit, log, or escalate it.

## Drill Matrix

| Attack | Primary guard | Audit evidence | Pass signal |
| --- | --- | --- | --- |
| Account takeover / OTP stuffing | `withSecurity`, `auth_otp` limits, OTP per-email hourly cap, brute-force helper | `security_events`, `login_history`, new-device notifications | Repeated OTP/login attempts return 429 or lockout and emit a security event. |
| Card testing / payment replay | `rateLimitDb`, Stripe idempotency keys, terminal payment states, webhook idempotency | `financial_ledger`, `platform_fee_ledger`, payment attempt tables | Duplicate payment attempts reuse existing provider objects or cached rows. |
| Spam / notification abuse | `notify-dispatch`, marketing opt-out checks, unsubscribe/suppression tables | `notifications`, campaign event rows, send logs | Marketing sends skip opted-out/suppressed recipients. |
| Scraping / scanner traffic | bot detection, WAF inspection, IP blocklist, auto-block threat scoring | `security_events`, `network_security_events`, `ip_blocklist` | Scanner/scraper user agents and WAF payloads are blocked before handler work. |
| Fake booking / price tampering | public booking sanitization triggers, active service/store checks, deposit/payment state checks | booking rows, payment attempts, admin notifications | Client-supplied price/status/user fields are overwritten or rejected. |
| Key leakage / frontend secret exposure | secret scanner, API readiness frontend scanner, browser client secret guard, Supabase rotation runbook | CI output, API readiness report, incident closeout | Service role/secret keys are not accepted in runtime frontend code and leaked Supabase tokens are rotated before release. |

## Operational Cadence

- Run `npm run security:api-readiness -- --strict` before release candidates.
- Run `npm run security:scan` before commits that touch config, docs, scripts, or frontend code.
- Run `npm run test -- src/test/workflows/security-anti-abuse.test.ts` after changes to Edge Function wrappers, checkout functions, OTP flows, booking public-write policies, or marketing dispatch.
- Review `docs/api-readiness-report.md` and reconcile migration-history warnings before production schema work.
- Follow `docs/supabase-secret-rotation-runbook.md` for any pasted or suspected leaked Supabase access token, service-role key, secret key, anon JWT, or publishable key.
