# Payment / Monetization Audit

**Date:** 2026-06-08 · Audit only. **No live payment. No card storage. No provider secrets in frontend.** `qa:payments-refunds-contracts` and `qa:payouts-earnings-contracts` pass; secret scanners pass.

## Inventory

| Capability | Status | Provider | Sandbox/Live | Path(s) |
|------------|--------|----------|--------------|---------|
| ZivoPay foundation (PR#57) | ✅ Complete | Stripe | test-ready | `supabase/functions/zivopay-*` (checkout, subscription, billing-portal, history, order, webhook), `_shared/zivopay.ts` |
| Central payment schema | ✅ Complete | — | schema | `20260607163048_zivosmedia_payments_foundation.sql` (8 tables: customers/orders/transactions/subscriptions/invoices/refunds/webhook_events/audit_logs) |
| Stripe one-time checkout | ✅ Complete | Stripe (embedded) | test | `LodgingEmbeddedCheckout.tsx`, zivopay checkout-session |
| Stripe subscriptions + portal | ✅ Complete | Stripe Billing | test | zivopay subscription/billing-portal; software billing catalog |
| Webhook + idempotency | ✅ Complete | Stripe | impl | `zivopay-stripe-webhook/`, `payment_webhook_events` (event-id unique) |
| Refunds / disputes | ✅ Schema + handlers | Stripe | designed | `payment_refunds`, `admin-refund-request/approve`, dispute via webhook |
| Driver payouts | 🟡 Partial | Stripe Connect | schema | `driver_payouts` + status enum; Connect not live |
| Business payouts | 🔴 Stub | Stripe Connect | none | `docs/BUSINESS_PAYOUT_FLOW.md` only — **no table/functions** |
| Platform fees | 🟡 Partial | — | schema | `driver_payouts.platform_fee` column |
| PayPal / Square | 🟡 Vertical-only | PayPal/Square | per-vertical | `paypal/square-{eats,grocery,lodging,tip}-webhook/` exist; **not in central ZivoPay adapter** |
| Revenue reporting | 🟡 Partial | — | schema | `payment_audit_logs`; no live reconciliation dashboard |

## Safety posture (good — do not change)
- ✅ No raw card data stored (only provider customer/intent IDs).
- ✅ `STRIPE_SECRET_KEY` server/edge only; `VITE_STRIPE_PUBLISHABLE_KEY` is the only client key; secret scanners pass.
- ✅ RLS on payment tables; audit logging on payment events.
- ⚠️ Live mode intentionally blocked pending owner approval + sandbox verification.

## Top gaps
- **P1** Business payouts table + functions (parallel to driver payouts) — only if marketplace payout needed soon.
- **P1** Admin-visible payment status placeholders (item #10) — surface order/subscription/payout status in admin without enabling live.
- **P2** Central PayPal/Square adapters in ZivoPay (currently only vertical webhooks); platform-wide reconciliation dashboard.

## Readiness flags
- P0: none (live correctly blocked).
- P1: business payouts schema; admin-visible status; sandbox verification before any live.
- P2: multi-provider central adapter; reconciliation reporting.

## Maps to roadmap
PR 19 (admin-visible payment status placeholders), PR 20 (Stripe sandbox checkout foundation), PR 21 (driver payout sandbox), PR 22 (business payout sandbox), PR 23 (Business↔Software subscription). **No live payment until sandbox-verified + owner-approved.**
