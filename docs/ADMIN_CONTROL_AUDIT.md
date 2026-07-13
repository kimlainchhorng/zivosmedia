# Admin Control Audit

**Date:** 2026-06-08 · Audit only. Evidence cites real files.

## Two distinct admin surfaces
1. **In-repo admin** (lives in zivosmedia, `src/pages/admin/*`, ~70 pages) — store/ops/finance/moderation dashboards used by staff inside the super-app.
2. **Canonical Zivo-Admin control plane** — a **separate repo**, canonical host `admin.zivosmedia.com` (`src/config/zivoAdminDomain.ts` `FALLBACK_ADMIN_ORIGIN`). **Currently DOWN (DNS NXDOMAIN).** The "platform registry / domain-health / repo-health / supabase-health / deployment-health" control center belongs here and does **not** yet exist as a live product.

## In-repo admin capability (sampled)

| Capability | Status | Path |
|------------|--------|------|
| Users (search/verify) | ✅ | `AdminUsersPage.tsx` |
| Driver verification | ✅ | `AdminDriverVerificationPage.tsx` |
| Payments/payouts/finance | ✅ | `AdminDriverPayoutsPage.tsx`, `AdminFinanceSummaryPage.tsx`, `AdminWalletPage.tsx` |
| Refunds | ✅ | `AdminRefundsPage.tsx` |
| Support tickets | ✅ | `AdminSupportDashboard.tsx` |
| Chat moderation | ✅ | `AdminMessageModerationPage.tsx`, `AdminChatSecurityPage.tsx` |
| Broadcast notifications | ✅ | `AdminBroadcastPage.tsx` (+ `admin-broadcast-notification` verify_jwt) |
| System / webhook health | ✅ | `AdminSystemHealth.tsx`, `AdminWebhookStatusPage.tsx` |
| Security overview | 🟡 | `AdminSecurityOverviewPage.tsx`, `AdminSecurityAuditPage.tsx` |
| Audit logs (admin actions) | 🟡 Partial | `audit_logs` basic; not all admin actions captured/searchable |
| Platform registry (domains/repos/supabase/deploy health) | 🔴 Missing | belongs to Zivo-Admin (not built/live) |
| Role tiers | 🔴 Binary only | `user_roles.role='admin'` via `has_role()`/`is_admin()`; no support/finance/security separation |

## Top gaps
- **P0** Zivo-Admin control plane is unreachable (DNS) — no live access-restricted admin landing. (Infra + separate repo.)
- **P1** Platform registry (domain/repo/supabase/deployment health + workflow events) not built.
- **P1** Tamper-evident admin audit logs (who did what, who read sensitive data) incomplete.
- **P1** Multi-tier admin roles (support vs finance vs security) — replace binary flag.

## Readiness flags
- P0: admin control plane down (DNS).
- P1: platform registry; audit logs; role tiers.
- P2: consolidate auth helper (`has_role` vs `is_admin`).

## Maps to roadmap
PR 3 (admin DNS runbook / code-side access-restricted landing), PR 11 (start platform registry), PR 26 (admin audit logs), PR 28 (RLS/role-tier work).
