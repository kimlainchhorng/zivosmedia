# ZIVO Platform Readiness — Master Audit

**Date:** 2026-06-08 · **Branch:** `docs/zivo-platform-readiness-master-audit` · **Repo:** kimlainchhorng/zivosmedia
**Type:** Audit only. No code/auth/payment/migration/secret/`.env` changes. No push to main.
**Method:** Ran the repo's own QA contract suite (27/30 scripts) + 7 parallel read-only codebase investigations + the prior live website audit. All findings cite real files.

> This master doc synthesizes the 13 area audits in this folder. See each `*_AUDIT.md` for detail, `DOMAIN_BY_DOMAIN_FIX_PLAN.md` for per-domain actions, and `ZIVO_NEXT_30_PRS_ROADMAP.md` for the sequenced plan.

---

## 0. Headline readiness scorecard

| Area | Maturity | Readiness | Doc |
|------|----------|-----------|-----|
| Notifications (push/in-app) | Partial | 🟡 web+in-app solid; **Android FCM broken, iOS sandbox-only** | NOTIFICATIONS_READINESS_AUDIT |
| Email | Strong | 🟡 transactional/suppression complete; **auth-email queue has no consumer (P0)** | EMAIL_SMS_ALERTS_AUDIT |
| SMS | Partial | 🟡 OTP+rate-limit solid; **opt-out not enforced, no STOP handler (compliance P1)** | EMAIL_SMS_ALERTS_AUDIT |
| iOS / Android (Capacitor) | Strong | 🟢 code complete; **blockers are non-code: FCM/APNs creds, keystore, OTA bucket** | IOS_ANDROID_READINESS_AUDIT |
| UX/UI / design system | Strong core, weak cross-app | 🟡 mature tokens/components; **no app-switcher / Continue-with-Zivosmedia / cross-surface ZivoChat** | UX_UI_GRAPHIC_DESIGN_AUDIT |
| Cross-app workflows | Partial | 🟡 payments/SSO-backend/payouts solid; **Travel→Driver job + chat-thread creation are cross-repo stubs** | CROSS_APP_WORKFLOW_AUDIT |
| API / connectivity | Strong | 🟢 health, SSO codes, webhooks, idempotency, rate-limit present; **retry crons not wired** | API_CONNECTIVITY_AUDIT |
| Database / SQL / RLS | Partial | 🟡 ~1,110 migrations, broad RLS; **migration drift unverified, inconsistent admin RLS, JWT-skip on 51 fns** | DATABASE_SQL_RLS_AUDIT |
| Admin control | Strong in-repo | 🟡 ~70 admin pages here; **canonical Zivo-Admin (admin.zivosmedia.com) is DOWN; binary roles only** | ADMIN_CONTROL_AUDIT |
| Performance | Strong | 🟢 chunking/lazy/SW/skeletons; **video lazy-load + call-quality adaptation missing** | PERFORMANCE_SPEED_AUDIT |
| Payment / monetization | Partial | 🟡 Stripe + ZivoPay schema complete, **no card storage / no leaked secrets ✅**; business payouts stub; **live blocked** | PAYMENT_MONETIZATION_AUDIT |
| SEO | Strong | 🟢 SEOHead/OG/canonical/sitemap/robots; **schema.org not uniform; thin software/business SEO pages** | SEO_SSO_AUDIT |
| SSO | Backend done, UI missing | 🔴 PR#67 authorize/webhooks merged; **Login.tsx has NO OAuth entrypoints → sso-auth-contracts FAILS** | SEO_SSO_AUDIT |
| Chat / call / video | Strong | 🟢 DMs/groups/channels, 1:1 WebRTC + group LiveKit SFU, safety/moderation; **no user call-history UI, TURN fallback** | CHAT_CALL_VIDEO_AUDIT |

Legend: 🟢 mostly ready · 🟡 partial / known gaps · 🔴 blocking gap.

---

## 1. QA contract suite results (27 / 30 passed)

Ran each script independently (the `platform:audit` chain stops at first failure with `&&`, so individual runs were used). Raw: `scripts/_audit/qa-results.json`.

**3 failures — all pre-existing debt, not introduced here:**

| Script | Why it fails | Owner / follow-up PR |
|--------|--------------|----------------------|
| `qa:sso-auth-contracts` | `src/pages/Login.tsx` missing `handleOAuthSignIn`, `signInWithOAuth`, `provider:"google"/"apple"`, `redirectTo: getEmailRedirectTo()`; e2e `auth-sso-role-matrix.spec.ts` missing SSO-callback/role-redirect coverage | **PR 8** (Continue with Zivosmedia entrypoints) |
| `qa:legal-policy-contracts` | `BusinessLandingPage.tsx` (WIP) missing `marketing-interest-submit` + `/legal/privacy`/`/legal/terms` links; legal pages missing `privacy@zivosmedia.com` string; `privacy-request-submit` fn missing `withSecurity(...)` wrapper | **PR 6/29** (business landing + legal polish) |
| `qa:storage-media-contracts` | `supabase/functions/shop-ops-record-manage/index.ts` missing `withSecurity("shop-ops-record-manage")` wrapper | **PR 30** (release-gate cleanup) |

**27 passing** include: platform-readiness matrix, workflow coverage/test-plan, frontend-visual, native-app, push-notification, email-marketing, payments-refunds, payouts-earnings, api-operations, database-storage, security-anti-abuse, ads-monetization, customer-booking, shop-owner, client-staff contracts, safe-area, perf media report, and the two secret scanners (`security:check-secrets`, `…token-fragments` — **no secrets leaked**).

---

## 2. Repo-hygiene finding (new)

`eloquent-liskov-159913/` is a **full nested duplicate** of an older Lovable scaffold (its `package.json` name is the default `vite_react_shadcn_ts`) containing a second `src/`, `android/`, a `.pptx`, and stray `booking-*.json` data dumps. It bloats the repo, confuses tooling/agents (one investigator drifted into it and falsely reported "no domain pages"), and should be removed or extracted. **Recommended: dedicated cleanup PR (not this one).** P2.

---

## 3. Status of the 10 known P0/P1 items

| # | Known item | Audit verdict | Where it lands |
|---|------------|---------------|----------------|
| 1 | zivoadmin.com unreachable / admin control down | **Confirmed.** DNS NXDOMAIN; canonical host is `admin.zivosmedia.com` (per `src/config/zivoAdminDomain.ts`), also down. Control plane is a **separate Zivo-Admin repo**. | PR 3, PR 11 |
| 2 | zivodriver live routing | **Landing code exists** (`src/pages/ZivoDriverHome.tsx`, routed at `App.tsx:1682` via `isCurrentZivoDriverHost`) but is **WIP/uncommitted + undeployed**. Pure deploy/verify. | PR 4 |
| 3 | zivobusiness/zivoemployee generic feed | Same pattern — `ZivoBusinessHome.tsx`/`ZivoEmployeeHome.tsx` exist as WIP; not built/deployed. | PR 6, PR 7 |
| 4 | zivoschat Supabase env vars | **Confirmed** via console (`Missing VITE_SUPABASE_URL…`). Host config, not code. | PR 5 |
| 5 | /travel/checkout crash | **Already fixed in committed HEAD** (`App.tsx` wraps route in `<TravelCartProvider>`); live is stale. Deploy clears it. | PR 1 + deploy |
| 6 | emrld.ltd script injection | **Not present in repo source** (grep clean). Injected at edge/CDN/tag-manager/browser layer. CSP already blocks it. | PR 2 |
| 7 | Continue with Zivosmedia missing | **Confirmed.** Backend exists (PR#67 authorize codes + dispatch); `Login.tsx` has no OAuth UI → `sso-auth-contracts` fails. | PR 8, PR 12 |
| 8 | App switcher missing | **Confirmed.** `GlobalDesktopNav`/megaMenu are internal-route nav, not an 8-domain switcher. | PR 9 |
| 9 | ZivoChat support entry missing across domains | **Confirmed.** Chat product is complete; no cross-surface "Open ZivoChat" launcher. | PR 10, PR 13 |
| 10 | ZivoPay payment identity not visible | Schema complete; needs admin-visible status placeholders + surfacing. | PR 19 |

---

## 4. Cross-cutting P0/P1 (newly surfaced by this audit)

**P0**
- **Android push is broken** — `send-push-notification` uses Google's decommissioned legacy `/fcm/send` endpoint; missing FCM key returns `success:true` silently. (NOTIFICATIONS doc.)
- **Auth emails never delivered** — `auth-email-hook` enqueues to a queue with **no consumer**; password-reset/magic-link/signup-confirm don't send. (EMAIL doc.)
- **SSO login UI absent** — backend authorize flow merged but no `/authorize` UI route or OAuth buttons; SSO contract fails. (SEO_SSO doc.)
- **Migration drift unverifiable** — drift report claims a large pending/unsynced set + duplicate timestamps; no `SUPABASE_ACCESS_TOKEN` to confirm remote state. Must verify before any deploy. (DATABASE doc.)

**P1**
- SMS opt-out flag not enforced + no STOP/HELP handler (TCPA risk).
- Travel→Driver job creation + ZivoChat thread creation are cross-repo stubs (no dispatch/webhook contract live).
- Inconsistent admin RLS (`has_role` vs `is_admin`) + binary admin role (no tiers) + 51/90 edge functions skip JWT.
- Business payouts: documented, **no table/functions**.
- Webhook + job retry crons not wired (`platform_webhook_events`/`jobs_queue` schemas exist, no scheduler).

**Compliant / good (do not "fix"):** no raw card storage; no Stripe/service-role secrets in frontend (secret scanners pass); RLS broadly enabled; security headers + CSP set by worker; native + chat/call stacks are genuinely mature.

---

## 5. Recommended next PRs
Full sequenced list with dependencies + guardrails in **`ZIVO_NEXT_30_PRS_ROADMAP.md`**. The first five (checkout deploy-fix, emrld investigation, admin access page/runbook, driver deploy verify, zivoschat env) are all unblockers that need no new schema and no live payment.

*Do not implement code in this audit PR.*
