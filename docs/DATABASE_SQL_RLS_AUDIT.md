# Database / SQL / RLS Audit

**Date:** 2026-06-08 · Audit only. Evidence cites real files. `qa:database-storage-contracts` passes; `qa:storage-media-contracts` fails (one function missing `withSecurity`).

## Supabase project map

| Project ref | Role | Evidence |
|-------------|------|----------|
| `slirphzzwcogdbkeicff` | Main (auth + live travel engine + CSP report for media/chat) | `src/integrations/supabase/client.ts`, worker CSP map |
| `xbllvmpomorawkcrtbcq` | Travel (dedicated; **cutover incomplete**, telemetry only) | `travelClient.ts`, worker CSP, `VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND=false` |
| `ydxztoresbdeoeijhxww` | Software/business (CSP report-uri) | worker CSP map |
| `yiedlgoxwjmansszdypf` | Driver (auth bridge) | `zivoDriverDomain.ts`, `zivosmedia_auth_bridge` migration |

## Inventory

| Area | Status | Evidence |
|------|--------|----------|
| Migrations | 🟡 Large (~1,110 files) | `supabase/migrations/` (2026-01 → 2026-06) |
| RLS foundation | ✅ Complete | `app_role` enum, `user_roles`, `has_role()`, `is_admin()` (early 2026 migrations); ~2,495 RLS statements |
| Auth/identity tables | ✅ Present | `app_integrations`, `zivosmedia_auth_codes`, `zivosmedia_auth_audit_logs`, `platform_webhook_events` (`20260607161643`) |
| Payment/payout tables | ✅ Present | `payment_*` (`20260607163048`), `driver_payouts`, `business_software_entitlements` |
| Notification/webhook logs | ✅ Present | `push_notification_logs`, `email_send_log`, `sms_send_log`, per-provider webhook event tables |
| Audit logs | 🟡 Partial | `audit_logs` basic; `automation_logs` not wired to admin UI; no "who-read" trail on sensitive tables |
| Performance indexes | ✅ Maintained | `20260518204722_drop_duplicate_performance_indexes.sql`; `docs/supabase-performance-upgrade-report.md` |
| Backup/rollback | 🟡 Doc-level | drift/reconciliation docs exist (`docs/supabase-migration-*`) |

## Top gaps
- **P0 (verify before deploy)** Migration drift: `docs/supabase-migration-drift-report.md` reports a large pending/unsynced set + **6 duplicate timestamps** (e.g. `20260601000000`); **cannot confirm remote state without `SUPABASE_ACCESS_TOKEN`**. Reconcile duplicates + verify remote before any migration deploy. *(This audit adds no migrations.)*
- **P1** Travel backend cutover incomplete (live engine still on main project; dedicated project telemetry-only).
- **P1** Inconsistent admin RLS (`has_role()` vs `is_admin()`); binary admin role only — no support/finance/security tiers.
- **P1** 51/90 edge functions set `verify_jwt=false` (`supabase/config.toml`) — document which are intentionally public vs. need JWT.
- **P2** No tamper-evident "who accessed sensitive table" audit; service-role grants scattered across ≥5 migrations.

## Readiness flags
- P0: migration drift verification + duplicate-timestamp reconciliation.
- P1: travel cutover; admin RLS consistency + role tiers; JWT-skip audit.
- P2: access audit trail; grant consolidation.

## Maps to roadmap
PR 28 (DB indexes + RLS audit — incl. duplicate-timestamp reconcile + JWT-skip review), PR 26 (admin audit logs), PR 11 (admin registry). **No migrations in this audit PR.**
