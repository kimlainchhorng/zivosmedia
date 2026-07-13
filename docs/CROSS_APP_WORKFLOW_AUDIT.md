# Cross-App Workflow Audit

**Date:** 2026-06-08 · Audit only. Evidence cites real files.

## Workflow coverage

| Workflow | Status | Key files | Notification fires? |
|----------|--------|-----------|---------------------|
| User onboarding | ✅ Complete | `src/contexts/AuthContext.tsx`, Login/Signup pages | Audit logs; no welcome email/push on account link |
| Continue with Zivosmedia | 🟡 Backend only | `supabase/functions/zivosmedia-auth-issue-code/`, `…-validate-code/`, `app_integrations` | **No UI entrypoint / `/authorize` route** (sso-auth-contracts fails) |
| Travel booking | 🟡 Partial | `travel-create-payment/`, travel UI | Payment webhook fires; **booking-confirmation email not wired** |
| Travel → Driver job | 🔴 Stub | `travel-create-driver-payment/` (payment only); no `dispatch-driver-job` | No cross-repo job-creation event |
| Driver accept/reject | 🟡 Partial | `dispatch-ride/` (job_offers), driver-connect-* | State machine assumed in zivodriver repo |
| Driver earnings/payout | ✅ Complete | `driver-payout(-paid/-failed)/`, `driver_payouts` table | payout-paid/failed notifications |
| Business profile | 🟡 Partial | `business-billing-profile/`, `business_billing_profiles` | No confirmation email |
| Business → Software subscription | ✅ Complete | `software-create/cancel/change-plan-subscription/`, `business_software_entitlements`, stripe-webhook | subscription active/cancelled/past-due notifications |
| ZivoChat thread creation | 🟡 Partial | `payment_support_threads.chat_thread_id` referenced | Creation logic in separate chat repo; no receiver here |
| Admin control / moderation | 🟡 Partial | `admin-refund-*`, `social-safety-report`, admin pages | Actions logged; no admin→user broadcast on action |
| Payment / refund / dispute | ✅ Complete | `stripe-webhook/`, `paypal/square-*-webhook/`, payment_* tables | refund/dispute handled + notifications |

## Top gaps
- **P0** Travel→Driver job creation: payment exists but no job-dispatch event/webhook to the driver app. Needs a cross-repo contract (`docs/TRAVEL_DRIVER_INTEGRATION.md`) + dispatch function.
- **P0** ZivoChat thread creation contract: payments reference `chat_thread_id` but nothing creates it here; define ownership + receiver.
- **P1** Booking-confirmation email not fired on travel payment success.
- **P1** Continue-with-Zivosmedia has no UI path (backend ready).
- **P2** No admin→user broadcast on moderation/refund actions.

## Notifications-per-workflow matrix
Payments/payouts/subscriptions fire notifications; **onboarding, travel-booking, business-profile, and the Travel→Driver handoff do not** — close these as part of PR 14/16 + PR 24.

## Readiness flags
- P0: Travel→Driver job, chat-thread creation contract, SSO UI path.
- P1: booking email, per-workflow notification coverage.
- P2: admin broadcasts on actions.

## Maps to roadmap
PR 23 (Business↔Software), PR 24 (Travel↔Driver request/status), PR 13 (shared chat support thread), PR 8/12 (Continue with Zivosmedia), PR 14 (notifications per workflow).
