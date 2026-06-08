# Email & SMS Alerts Audit

**Date:** 2026-06-08 · Audit only. Evidence cites real files. Provider config lives in host dashboards, never the repo.

## Email inventory (provider: Resend)

| Capability | Status | Path(s) | Notes |
|------------|--------|---------|-------|
| Transactional email | ✅ Complete | `supabase/functions/send-transactional-email/`, `_shared/transactional-email-templates/` (16 templates) | Idempotency keys, template allowlist |
| Booking/payment/refund email | ✅ Complete | templates: eats-order, lodging-booking, payment receipt, refund-issued | In registry |
| OTP email | ✅ Complete | `supabase/functions/send-otp-email/` | 6-digit, 10-min, 5/hour rate-limit |
| Suppression + unsubscribe | ✅ Complete | `handle-email-suppression/`, `handle-email-unsubscribe/`, `suppressed_emails`, `email_unsubscribe_tokens` | RFC 8058 one-click; Resend/Lovable webhooks |
| Email consent + logs | ✅ Complete | `email_consents`, `email_send_log`, `email_logs` tables | status/error/retry tracking |
| Marketing email | 🟡 Partial | `supabase/functions/send-marketing-campaign/` | Dispatch + suppression check; needs delivery-event logging |
| Support email | 🟡 Partial | `email_settings` (support auto-reply), support_reply template | No dedicated ticketing backend beyond tickets table |
| **Auth emails (reset/magic-link/signup)** | 🔴 Broken | `supabase/functions/auth-email-hook/` (~line 264) | **Enqueues to a queue with NO dispatcher** → these emails never send |
| Driver payout email | 🟡 Stub | (generic transactional only) | No dedicated payout receipt template |
| Business subscription email | 🔴 None | not found | No signup/renewal/cancel lifecycle emails |

## SMS inventory (provider: Twilio)

| Capability | Status | Path(s) | Notes |
|------------|--------|---------|-------|
| OTP / phone verify | ✅ Complete | `send-otp-sms/`, `verify-otp-sms/`, `sms_otp_codes` | Twilio Verify; 5 OTP/hour atomic |
| Rate-limit / anti-spam | ✅ Complete | `sms_daily_limits` + RPC `check_sms_rate_limit` | 5 SMS/user/day |
| Generic transactional SMS | 🟡 Partial | `send-sms/`, `sms_send_log` | Masked logging; Twilio or Lovable connector |
| Employee SMS invite | ✅ Complete | `send-employee-sms-invite/` | |
| Consent / opt-out flags | 🟡 Partial | `profiles.sms_opted_out`, `notification_preferences.sms_consent_at` | **Flag exists but `send-sms` does not check it** |
| **STOP/HELP handler** | 🔴 None | not found | TCPA compliance gap — no inbound STOP parser/auto-suppress |
| Per-vertical SMS (booking/driver/support/payment) | 🟡 Stub | (generic fallback) | No dedicated templates |

## Top gaps
- **P0** Auth email queue has no consumer → password reset/magic-link/signup-confirm undeliverable (build a dispatcher or repoint to a live sender).
- **P1** SMS `sms_opted_out` not enforced in `send-sms`; no STOP/HELP handler → compliance risk.
- **P1** Missing B2B subscription email lifecycle + driver payout receipt template.
- **P1** Add `List-Unsubscribe` to auth/OTP emails (deliverability).
- **P2** Marketing delivery-event logging; per-vertical SMS templates.

## Readiness flags
- P0: auth-email queue not consumed.
- P1: SMS opt-out not enforced; no STOP handler; B2B + payout email templates missing.
- P2: marketing event logs; per-vertical SMS templates.

## Maps to roadmap
PR 16 (email/SMS provider abstraction) — fold in the auth-email dispatcher, opt-out enforcement, STOP handler, and missing templates. Compliance items (STOP, opt-out, List-Unsubscribe) should be treated as P1 within PR 16.
