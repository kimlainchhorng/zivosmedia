# ZIVO Supabase Project Map

Status: Draft for owner review
Date: 2026-06-07

## Purpose

Map every app to the correct Supabase project before coding. This document should be confirmed before any schema or auth implementation.

## Known Projects

| App | Supabase project ref | Role | Current understanding | Confirmation status |
| --- | --- | --- | --- | --- |
| Zivosmedia | `slirphzzwcogdbkeicff` | Central identity, all-in-one platform, payments current owner | Main project and canonical identity source | Verified by owner and local config |
| Zivo Admin | `wtdlbzgryuelpylijnkd` | Admin/control plane | Staff/control-plane data and Admin RPCs | Verified by owner and local config |
| Zivo Driver | `yiedlgoxwjmansszdypf` | Driver platform | Driver profiles, jobs, status, payout support | Verified by owner and local config |
| ZivoSoftware | `ydxztoresbdeoeijhxww` | Software platform | Software/business backend, subscriptions to be designed | Verified by owner and local config |
| Zivo Travel | `xbllvmpomorawkcrtbcq` | Travel platform | Travel bookings, support, migration backend | Verified by owner and local config |

## Needs Confirmation

| App/module | Candidate project | Decision needed |
| --- | --- | --- |
| ZivoChat | Currently appears to share `slirphzzwcogdbkeicff` | Confirm whether Chat remains in Zivosmedia project or gets a dedicated Supabase project. |
| Zivo Business | Unknown | Confirm whether Business uses Zivosmedia, ZivoSoftware, or a new project. |
| Zivo Employee | Unknown | Confirm whether Employee uses Zivosmedia, Zivo Admin, or a new project. |
| ZivoPay / Zivosmedia Payments | Unknown | Confirm payment database location. Zivosmedia is confirmed as central payment identity hub. |
| ZIVO-AI | Unknown | Confirm whether AI features use a separate project or Zivosmedia/Admin. |

## Security Baseline

- Enable RLS on every sensitive table in exposed schemas.
- Do not expose service-role keys to browser code.
- Use Edge Functions or backend routes for privileged joins, token exchange, payment webhooks, admin lookups, and cross-app writes.
- Use migrations for every schema change after owner approval.
- Avoid destructive migrations; add rollback/backup notes for production changes.
- Authorization should use `app_metadata` / server-side role checks, not user-editable metadata.
- Views that need RLS behavior should use `security_invoker = true` where supported or be kept out of exposed schemas.

## Proposed Project Ownership

| Data area | Preferred owner | Notes |
| --- | --- | --- |
| Canonical user identity | Zivosmedia | Every app links to `zivosmedia_user_id`. |
| Account linking registry | Each product app plus Zivosmedia app registry | Product apps store local links; Zivosmedia owns client/app registry. |
| Admin registry and audit visibility | Zivo Admin reads registry; may store ops-only history | Never duplicate secrets to browser. |
| Travel bookings | Zivo Travel | Travel can reference driver jobs and payment IDs. |
| Driver jobs | Zivo Driver | Travel creates/requests; Driver owns acceptance/status. |
| Business profiles | Zivo Business or Zivosmedia until confirmed | Must be decided before schema work. |
| Software subscriptions | ZivoSoftware | Business owns subscription relationship; Software owns product catalog/activation. |
| Chat threads | ZivoChat | Threads include source platform and related record IDs. |
| Payments | Zivosmedia Payments / ZivoPay location still needs confirmation | Support Stripe, PayPal, and Square through common provider adapters. Use Stripe test mode first. |

## Candidate Table Ownership

These are planning candidates only. Do not create tables until the owner approves project ownership and the PR roadmap reaches the relevant phase.

| Table/model | Candidate project | Reason |
| --- | --- | --- |
| `app_integrations` | Zivosmedia | Central identity/app registry and OAuth-style client registration. |
| `linked_zivosmedia_users` | Each product project | Product apps need their own local link to the canonical identity. |
| `auth_audit_logs` | Each product project + Zivo Admin rollup | Product-local auth trace plus Admin visibility. |
| `platform_webhook_events` | Source app and/or Admin | Needed for retry, visibility, and webhook audit. |
| `travel_bookings` | Zivo Travel | Travel owns booking lifecycle. |
| `driver_jobs` | Zivo Driver | Driver owns acceptance, rejection, route/status, and payout context. |
| `business_profiles` | Zivo Business or Zivosmedia | Must be confirmed before implementation. |
| `software_products` | ZivoSoftware | Software owns product catalog. |
| `software_subscriptions` | ZivoSoftware with business owner reference | Software owns activation/status; Business owns buyer relationship. |
| `employee_profiles` | Zivo Employee or Zivosmedia | Must be confirmed before implementation. |
| `chat_threads` | ZivoChat | Shared communication layer across apps. |
| `payment_customers` | Zivosmedia Payments / ZivoPay | Links provider customers to `zivosmedia_user_id`. |
| `payment_orders` | Zivosmedia Payments / ZivoPay | Common app-created payment request model. |
| `payment_transactions` | Zivosmedia Payments / ZivoPay | Provider transaction IDs and statuses. |
| `payment_subscriptions` | Zivosmedia Payments / ZivoPay | Software/business recurring billing. |
| `payment_invoices` | Zivosmedia Payments / ZivoPay | Invoices across providers. |
| `payment_refunds` | Zivosmedia Payments / ZivoPay | Refund tracking across providers. |
| `driver_payouts` | Zivosmedia Payments / ZivoPay | Driver payout tracking. |
| `business_payouts` | Zivosmedia Payments / ZivoPay | Business payout tracking. |
| `payment_webhook_events` | Zivosmedia Payments / ZivoPay | Provider webhook idempotency and audit. |
| `payment_audit_logs` | Zivosmedia Payments / ZivoPay + Admin rollup | Payment action audit. |
| `admin_audit_logs` | Zivo Admin | Staff/admin actions and control-plane audit. |

## Confirmation Gate Before Migrations

Before any Supabase migration is written, confirm:

- Project owner for the table.
- Whether the table is exposed to the Data API.
- RLS policy model.
- Required grants for `anon`, `authenticated`, and `service_role`.
- Admin visibility path.
- Rollback or non-destructive migration approach.
