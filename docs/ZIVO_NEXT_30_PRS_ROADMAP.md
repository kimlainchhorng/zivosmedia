# ZIVO — Next 30 PRs Roadmap

**Date:** 2026-06-08 · Audit only (no code here). Sequence follows the owner's directive, each grounded in this readiness audit with type, dependency, and guardrail.

**Global guardrails (every PR):** one focused PR; no push to main; no secrets/`.env` in repo (host dashboard only); no live payment until sandbox-verified + owner-approved; no auth/payment/migration changes unless the PR explicitly scopes them and they're reviewed; confirm repo ownership before targeting driver/chat/admin/software/business repos (most returned 404 in session).

## Phase A — Unblockers (no new schema, no live payment)

| PR | Title | Type | Grounding / notes | Depends |
|----|-------|------|-------------------|---------|
| 1 | Fix `/travel/checkout` TravelCartProvider crash | Deploy + verify (already fixed in HEAD `App.tsx`) | Live is stale; provider already wraps route. Mostly a deploy + confirm; add regression test | — |
| 2 | Investigate/remove unauthorized `emrld.ltd` script | Security (edge/CDN/GTM) | Not in repo source (grep clean); injected at hosting/tag-manager/browser. CSP already blocks. Find source, don't whitelist | — |
| 3 | Zivo Admin DNS/deploy runbook **or** code-side access-restricted admin landing | Infra/docs + small code | `admin.zivosmedia.com` NXDOMAIN; canonical per `zivoAdminDomain.ts`. See `INFRA_FIX_RUNBOOKS.md` | — |
| 4 | Zivo Driver live domain deploy verification | Deploy/runbook | Landing exists (WIP, `App.tsx:1682`); verify host binding + ship | host landings committed |
| 5 | ZivoChat env vars / Supabase config verify | Config/deploy | Console "Missing VITE_SUPABASE_URL…"; set in host + re-publish | — |
| 6 | Business domain landing + routing | UI (finish WIP `ZivoBusinessHome.tsx`) | Also fixes part of `legal-policy-contracts` (marketing-interest-submit + legal links) | 4 pattern |
| 7 | Employee domain landing + routing | UI (finish WIP `ZivoEmployeeHome.tsx`) | Generic feed today | 4 pattern |

## Phase B — Cross-app identity & navigation

| PR | Title | Type | Grounding | Depends |
|----|-------|------|-----------|---------|
| 8 | Continue-with-Zivosmedia CTA on login/signup + key pages | UI + auth-UI | **Fixes failing `sso-auth-contracts`**; backend ready (PR#67). Add `/authorize` UI route + OAuth entrypoints | PR#67 (merged) |
| 9 | App switcher component (zivosmedia) | UI (shared component) | `GlobalDesktopNav` is internal-only; add 8-domain switcher | — |
| 10 | ZivoChat support entry across surfaces | UI (shared launcher) | Chat product complete; no cross-surface entry | 8 |
| 11 | Start Zivo Admin platform registry | New (Zivo-Admin repo) | domain/repo/supabase/deploy health; workflow events | 3 |
| 12 | Zivo Travel Continue-with-Zivosmedia pilot | UI + SSO | First relying-party pilot of the authorize flow | 8 |
| 13 | ZivoChat shared support-thread contract | API + schema design | Unify ride/travel/business/driver/admin threads; `payment_support_threads` already references `chat_thread_id` | 10 |

## Phase C — Notifications, comms, performance, SEO

| PR | Title | Type | Grounding | Depends |
|----|-------|------|-----------|---------|
| 14 | Notifications readiness implementation plan | Plan/impl | Wire retry (`jobs_queue`+cron); per-workflow notifications | — |
| 15 | iOS/Android push implementation | Native + edge | **Fix Android FCM (HTTP v1)**, fail-loud on missing creds, incoming-call emitter, iOS prod entitlement, Android channels | 14 |
| 16 | Email/SMS alert provider abstraction | Edge | **Auth-email dispatcher (P0)**, SMS opt-out enforcement + STOP handler (P1), B2B + payout templates, List-Unsubscribe | — |
| 17 | Performance fixes for media loading | FE | Video lazy-load/range; skeletons on `fallback={null}` routes | — |
| 18 | SEO metadata/canonical/sitemap + schema.org | FE | SEOHead solid; populate JSON-LD uniformly; software/business SEO pages | — |

## Phase D — Monetization (sandbox only)

| PR | Title | Type | Grounding | Depends |
|----|-------|------|-----------|---------|
| 19 | ZivoPay admin-visible payment status placeholders | UI + read | Surface order/subscription/payout status in admin; no live | — |
| 20 | Stripe sandbox checkout foundation | Edge (test mode) | ZivoPay Stripe complete; verify sandbox scenarios | 19 |
| 21 | Driver payout sandbox foundation | Edge (test) | `driver_payouts` schema ready; Stripe Connect test | 20 |
| 22 | Business payout sandbox foundation | Schema + edge (test) | **No `business_payouts` table yet** — create + functions | 20 |
| 23 | Business ↔ Software subscription flow | Edge + UI | `business_software_entitlements` + software subscription fns exist; wire end-to-end | 6 |
| 24 | Travel ↔ Driver request/status flow | API/webhook | **Travel→Driver job creation is a stub**; define cross-repo contract + dispatch + status webhook | 4 |

## Phase E — Realtime, control, data, release

| PR | Title | Type | Grounding | Depends |
|----|-------|------|-----------|---------|
| 25 | Chat/call/video TURN/WebRTC readiness | Infra + FE | TURN fallback + metrics; call-quality adaptation | — |
| 26 | Admin audit logs | Schema + UI | Tamper-evident who-did-what + sensitive-read trail | 11 |
| 27 | Webhook logs and retries | Edge + cron | `platform_webhook_events`/`jobs_queue` schemas exist; wire backoff crons | — |
| 28 | Database indexes & RLS audit | SQL/review | Reconcile duplicate migration timestamps; verify drift (needs `SUPABASE_ACCESS_TOKEN`); admin role tiers; JWT-skip review | — |
| 29 | Mobile safe-area & cookie-banner cleanup | FE | Cookie banner first-screen risk; safe-area already E2E-tested | — |
| 30 | Production release-gate cleanup | Release | Fix `shop-ops-record-manage`/`privacy-request-submit` missing `withSecurity` (storage/legal contracts); non-code store creds checklist; remove `eloquent-liskov-159913/` duplicate | all |

## Notes
- **Fastest wins first:** PRs 1–5 need no new schema and no live payment; they clear most user-visible breakage.
- **Contract-driven:** PRs 8, 6, 30 directly clear the 3 currently-failing QA contracts (`sso-auth`, `legal-policy`, `storage-media`).
- **PR #12 vehicle SVG artwork (owner-mentioned): review later — currently not mergeable; do not merge blindly.**
- Re-run `npm run platform:audit` (or the individual `qa:*` scripts) after each phase; re-run the live Playwright harness after any deploy.
