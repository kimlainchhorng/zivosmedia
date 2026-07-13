# Zivo End-to-End Upgrade — Synthesized Architecture Roadmap

## Verification note
Five P0-severity claims were spot-checked against source before writing this report and all confirmed accurate:
- `src/App.tsx:1361` — `forcedTheme="light"` (dark mode is a dead control).
- `supabase/functions/send-push-notification/index.ts:643` — legacy `https://fcm.googleapis.com/fcm/send` with `Authorization: key=` (line 646); missing-key returns `success: true` (line 618).
- `public/.well-known/assetlinks.json` — `REPLACE_WITH_*` placeholder fingerprints, wrong `com.myzivo.app` package (line 6) alongside the real `com.hizovo.app` (line 17).
- `supabase/functions/auth-email-hook/index.ts:264` — enqueues via `enqueue_email`; no dispatcher function exists anywhere.
- `incoming_call` appears only in send-push-notification (category inference), never as a send — confirming calls never push.

The codebase is genuinely mature; the blockers are **silent failures that QA reports green**, which is exactly why an "upgrade" cannot start with cosmetics.

---

## Per-area summary

### UI/UX & design system
Strong, IG-flavored token layer in `src/index.css`, but cohesion has drifted: `AppHome.tsx` uses product-color candy gradients + 3D effects while Feed/Reels/Chat/Profile use mono `zivo-social-*` glass. The "system" has sprawled into ~122 bespoke classes in a 3641-line file, many hard-coding light-mode HSL/rgba. Dark mode is fully authored but globally disabled (`App.tsx:1361`), making the theme switcher dead. **The token consolidation is the highest-leverage maintainability win and is a hard prerequisite for both dark mode and the Home restyle.**

### Auth / SSO / OTP / email
Custom Resend OTP path is solid. But **Supabase auth emails dead-end** — `auth-email-hook` enqueues into a queue with no consumer, so password reset, magic-link login, and signup confirmation are never delivered. Native Apple Sign In is declared (`@capawesome/capacitor-apple-sign-in`) but unused → App Store 4.8 risk. Three sender identities across two domains hurt deliverability; no List-Unsubscribe headers; OTP rate-limit is non-atomic; `verify-otp-code` uses a `listUsers(1000)` scan that fails past 1000 users.

### Push notifications
**Android push is 100% broken** — legacy FCM `/fcm/send` (decommissioned 2024-06-20) and missing-key returns `success:true`. **Incoming calls never ring backgrounded** — no server emits `incoming_call`, only Realtime (dead when WebView suspended). No `google-services.json` in CI, iOS `aps-environment=development`, no Android channels, and `enqueue_notification` silently no-ops if the service-role GUC is unset.

### Backend / API / DB
Unusually mature: 407 functions on a shared `withSecurity` wrapper, payment handlers re-derive amounts server-side, RESTRICTIVE RLS + server-gate RPCs. Outstanding: 7 anon-executable `admin_*` SECURITY DEFINER RPCs, 1 ERROR-level `security_definer_view` (`bots_directory`), 2085 unused indexes, 1981 multiple-permissive policies, 67 unindexed FKs, unverifiable migration drift, and `create-bus-payment-intent` bypassing the security wrapper.

### SEO & marketing
Rich static `index.html` SEO and a mature marketing backend, but **no SSR/prerender** — all 87+ programmatic pages depend on JS for unique meta. Sitemap lists 18 dead `/hotels/in-*` URLs; `post-og`/`profile-og` aren't reachable from the public domain (only `/share/c/` is wired). `cart_abandoned` automation writes emails into a `user_id` column.

### Native platform
Capacitor 8, production-hardened config. But **Android App Links can't verify** (placeholder fingerprints + wrong package), AASA/entitlements claim an unverifiable lovable.app host, iOS pins certs that Android deliberately stopped pinning (cert-rotation outage risk), and OTA has no post-activation rollback.

### Dependencies, tooling & security health
Bleeding-edge but clean (0 audit vulns). Risks are documentation drift (SECURITY.md stale), a non-blocking production preflight (`continue-on-error`), no CodeQL/SHA-pinned actions, and `^` ranges on build-critical majors.

---

## Prioritized findings table

| # | Finding | Area | Sev | Effort | File / evidence |
|---|---------|------|-----|--------|-----------------|
| 1 | Android push broken — legacy FCM API | Push | P0 | M | send-push-notification/index.ts:643,646 |
| 2 | Missing FCM/APNs creds return success:true | Push | P0 | S | send-push-notification/index.ts:618 |
| 3 | Auth emails dead-end in no-op queue | Auth | P0 | M | auth-email-hook/index.ts:264; migration 20260408020628 |
| 4 | Incoming-call push never sent | Push | P0 | L | no `incoming_call` sender exists |
| 5 | enqueue_notification GUC unset → silent no-op | Push | P0 | M | migration 20260509120000 |
| 6 | Android App Links can't verify (placeholders + wrong pkg) | Native | P0 | S | public/.well-known/assetlinks.json:6,8,17 |
| 7 | No google-services.json in CI | Push/Android | P0 | S | android/app/build.gradle |
| 8 | iOS aps-environment=development | Native/Push | P0 | S | ios/App/App/App.entitlements:5 |
| 9 | 7 anon-executable admin_* SECURITY DEFINER RPCs | Backend | P0 | S | security advisor |
| 10 | security_definer_view on bots_directory (ERROR) | Backend | P0 | S | advisor |
| 11 | Production preflight is continue-on-error | CI | P0 | M | deploy-production.yml:58-69 |
| 12 | Dark-mode toggle dead (forcedTheme="light") | UI | P1 | M | App.tsx:1361 |
| 13 | Native Apple Sign In unused (4.8 risk) | Auth/iOS | P1 | L | package.json:135; Login.tsx |
| 14 | 3 sender identities / 2 domains | Auth | P1 | S | send-otp-email/transactional/auth-email-hook |
| 15 | No List-Unsubscribe headers | Auth | P1 | S | send-transactional-email/index.ts:345 |
| 16 | OTP throttle non-atomic; listUsers(1000) fallback | Auth | P1 | M | send-otp-email:46-83; verify-otp-code:59-71 |
| 17 | No Android notification channels | Push/Android | P1 | M | AndroidManifest |
| 18 | iOS cert pinning vs Android removal mismatch | Native | P1 | M | Info.plist:57-90; network_security_config.xml |
| 19 | ~122 bespoke glass classes / 3641-line index.css | UI | P1 | XL | src/index.css |
| 20 | Social glass hard-codes light-mode colors | UI | P1 | L | src/index.css ~2182-2850 |
| 21 | No SSR/prerender for per-route meta | SEO | P1 | L | SEOHead.tsx (client-only) |
| 22 | Sitemap lists 18 dead /hotels/in-* URLs | SEO | P1 | M | public/sitemap.xml; App.tsx:1781 |
| 23 | post-og/profile-og not reachable publicly | SEO | P1 | M | cloudflare/worker.ts |
| 24 | cart_abandoned writes email into user_id | Marketing | P1 | M | marketing-automations-tick:61-124 |
| 25 | OTP_CODE_PEPPER falls back to service key | Auth | P0 | S | _shared/otp.ts:51-62 |
| 26 | Home diverges from social design language | UI | P2 | L | AppHome.tsx |
| 27 | 2085 unused indexes / 1981 policies / 67 FKs | Backend | P2 | L | performance advisor |
| 28 | OTA has no post-activation rollback | Native | P1 | M | useOTAUpdate.ts |
| 29 | PWA manifest divergence | SEO | P2 | S | manifest.webmanifest vs vite.config.ts |
| 30 | SECURITY.md stale; no CodeQL/SHA pins | Deps | P2 | M | SECURITY.md; workflows |

---

## Recommended phased execution plan

**Phase 0 — Stop the silent bleeding (P0, ~1 sprint).** These deliver no visible feature but everything else is wasted until they land. Start with the one-line `success:false` fixes (#2) so the broken state becomes observable, then FCM v1 (#1), the email dispatcher decision (#3), the call-push trigger (#4), and the GUC (#5). In parallel, the native release-config quick wins: assetlinks fingerprints (#6), google-services.json in CI (#7), aps-environment=production (#8). Close the security-advisor items (#9, #10, #25) and make the deploy preflight blocking (#11) so the gate can't be bypassed.

**Phase 1 — Native wiring on the now-working backend (P1).** With push backends fixed, wire the native side: Apple Sign In (#13), Android channels (#17), CallKit/PushKit for the new call-push, iOS cert-pinning decision (#18), and OTA rollback (#28) — required before shipping any of this via OTA. Tighten the push QA contracts so these can't regress green again.

**Phase 2 — Email professionalization (P1).** On the now-delivering pipeline, unify sender identity (#14), add List-Unsubscribe (#15), harden OTP issuance (#16). This is the "professional templates + resend" goal — but it depends on Phase 0 #3 actually sending.

**Phase 3 — Design-system tokenization (P1, the gate for UI).** Extract the glass/elevation/story-ring primitives and collapse the 122 classes (#19), reauthor social glass on tokens (#20). **Only after this** re-enable dark mode (#12) and restyle Home onto the social language (#26). Doing Home or dark mode first means redoing the work.

**Phase 4 — SEO & marketing correctness (P1).** Prerender public routes (#21), regenerate the sitemap from the route table + CI check (#22), wire post-og/profile-og into the worker (#23), fix cart_abandoned user_id resolution (#24).

**Phase 5 — Performance & polish (P2).** DB advisor cleanup in validated batches (#27 — see risks), a11y/motion/button cleanup, PWA manifest single-sourcing (#29), docs + supply-chain hardening (#30), and migration-history reconciliation.

---

## Dependency ordering (do-not-violate)
- **Email dispatcher (#3) before** any template/resend polish (Phase 2).
- **Push backend (#1, #2, #4, #5) before** native push wiring (channels, CallKit, badges).
- **Design tokens (#19, #20) before** dark mode re-enable (#12) and Home restyle (#26).
- **Migration-history reconciliation before** any production schema push (index drops, policy consolidation).
- **OTA rollback guard (#28) before** shipping native changes via an immediate OTA bundle.

---

## Quick wins (do first, all S-effort)
- Flip the two FCM/web missing-credential branches to `success:false` (send-push-notification:618) — instant observability of the broken state.
- Real assetlinks.json fingerprints + remove wrong `com.myzivo.app`.
- aps-environment → production for release.
- REVOKE EXECUTE FROM anon on 7 admin_* RPCs + bots_directory security_invoker.
- List-Unsubscribe headers; OTP_CODE_PEPPER mandatory.
- Hide Dark/System until dark mode ships.
- Refresh SECURITY.md; align Node source-of-truth; trim robots.txt + drop keywords meta.