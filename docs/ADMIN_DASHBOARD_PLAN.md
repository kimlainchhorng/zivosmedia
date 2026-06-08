# ZIVO Admin Dashboard Plan

Status: Draft for owner review
Date: 2026-06-07

## Purpose

Define Zivo Admin modules before implementation.

## Dashboard Modules

| Module | Purpose | Key records |
| --- | --- | --- |
| Platform Registry | Show all platforms, domains, repos, Supabase refs, health, enabled status | app registry rows |
| Users | Search users across platforms | `zivosmedia_user_id`, local profiles |
| Linked Accounts | Show linked app profiles | linked users per app |
| Travel Bookings | View travel booking lifecycle | booking, payment, support |
| Driver Jobs | View driver job lifecycle | driver job, driver, status |
| Business Profiles | View businesses and owners | business, owner, staff |
| Software Subscriptions | View products, plans, activation | product, subscription, invoice |
| Chat Conversations | View cross-app support threads | thread, participants, related record |
| Payments | View payment activity | payment, invoice, refund, dispute |
| Refunds | Review refunds | refund, actor, source record |
| Driver Payouts | Review payout status | driver, job, payout, transfer |
| Business Payouts | Review business payout status | business, payout, provider, invoice |
| Invoices | View business/software invoices | invoice, subscription, payment |
| App Health | Health across apps | health endpoints, Supabase, functions |
| Webhooks | Webhook delivery and failures | event, source, target, retry |
| Audit Logs | Security and admin audit | actor, action, target, result |

## Required Views

### Platform Overview

- App name
- Domain
- GitHub repo
- Supabase project ref
- Health status
- API status
- Deployment status
- Enabled/disabled
- Owner/contact

### User Detail

- Zivosmedia profile
- Linked local profiles
- Roles
- App memberships
- Auth history
- Payment history
- Chat/support history
- Admin actions

### Travel + Driver View

- Booking
- Driver job
- Driver status
- Customer status
- Payment status
- Chat thread
- Webhook history

### Business + Software View

- Business profile
- Owner identity
- Employee/staff links
- Software subscriptions
- Billing status
- Support thread

### Payments View

- Payment list
- Payment detail
- Refunds
- Disputes
- Invoices
- Driver payouts
- Business payouts
- Provider adapters: Stripe, PayPal, Square
- Webhook events
- Audit logs

## Security Rules

- Staff auth required.
- MFA required for privileged workflows.
- Service-role keys stay server-side.
- Browser receives redacted summaries only.
- All admin actions audited.
- Payment actions require role checks.
