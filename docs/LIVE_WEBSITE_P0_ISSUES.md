# ZIVO Live Website — P0 / Top Issues

**Date:** 2026-06-08 · **Scope:** audit only — no fixes applied.
Ordered by the prioritization rule supplied for this audit.

## Top 10 P0 / P1 issues

### P0-1 — zivoadmin.com fails DNS (total outage)
- **Evidence:** `net::ERR_NAME_NOT_RESOLVED`; `curl: (6) Could not resolve host: zivoadmin.com`. No A record.
- **Impact:** Admin control center is entirely unreachable. No login, no "access restricted" page.
- **Type:** DNS / infrastructure (not UI code).
- **Fix:** Create/point DNS for zivoadmin.com to a deployment; until then publish a proper admin login or "access restricted" page. Confirm `Zivo-Admin` repo (currently 404).
- **Owner:** infra/DNS + Zivo-Admin repo owner.

### P0-2 — zivodriver.com serves the generic super-app, not the merged PR #2 Driver landing
- **Evidence:** `zivodriver.com/` and `/join` render the Zivosmedia super-app **Feed**, not a Driver landing. No "Become a Driver", earnings/payout copy, or driver app switcher. (Not the old "delivery partner" placeholder either.)
- **Impact:** Merged Driver work is invisible to users; domain is effectively a Zivosmedia alias.
- **Type:** **Deployment/publish issue, not UI code** (per task rule). The Driver build is not being served on this domain.
- **Fix:** Verify where PR #2 was merged and which deployment zivodriver.com points to; republish/point the domain at the Driver build.
- **Owner:** confirm `zivodriver` repo (404) + hosting owner.

### P0-3 — `/hotels` shows "Rides available in Cambodia", not hotels
- **Evidence:** `zivosmedia.com/hotels` heading = **"Rides available in Cambodia"**, body = *"ZIVO Rides currently operates in Cambodia 🇰🇭 only…"*. Generic super-app `<title>`.
- **Impact:** The exact flagged P0 — a hotel/resort route serves ride/geo-gate content. Confusing and wrong for a travel funnel.
- **Type:** UI / routing — `/hotels` resolves to the Rides geo-gate component instead of a Hotels landing.
- **Note:** Correct hotel content **does** exist at `zivostravel.com/hotels` ("Hotels in Siem Reap"). Consider routing/redirect to the working travel surface or porting it.
- **Owner:** `zivosmedia` repo.

### P0-4 — zivobusiness.com serves the generic super-app, not a Business landing
- **Evidence:** root renders super-app Feed; no business-profile creation, software connection, or billing/subscription concept.
- **Type:** Deployment + UI (no dedicated Business surface exists; domain aliases the super-app).
- **Fix:** Decide host-based routing in zivosmedia vs. dedicated Business build; then build/point the Business landing.
- **Owner:** confirm Business repo / zivosmedia.

### P0-5 — zivoemployee.com serves the generic super-app, not an Employee landing
- **Evidence:** root renders super-app Feed; no scheduling/payroll/time-clock/training concept.
- **Type:** Deployment + UI (no dedicated Employee surface exists).
- **Owner:** confirm Employee repo / zivosmedia.

### P1-6 — `/travel/checkout` crashes (provider error)
- **Evidence:** `zivosmedia.com/travel/checkout` → "Checkout Error"; console `Error: useTravelCart must be used within a TravelCartProvider`.
- **Impact:** Direct navigation / refresh on checkout breaks the page (error boundary catches it). Checkout reliability risk.
- **Type:** UI bug — checkout route mounted outside `TravelCartProvider`.
- **Owner:** `zivosmedia` repo. *(Do not modify payment logic without explicit approval — this is a provider-tree/routing fix.)*

### P1-7 — Unknown third-party script `emrld.ltd/...js` injected on travel pages
- **Evidence:** on `/flights`, `/hotels`, `/cars` (zivosmedia): `Loading the script 'https://emrld.ltd/NDkzNzQ1.js?t=493745' violates … CSP script-src`.
- **Impact:** **Security.** `emrld.ltd` is not a known ZIVO/Stripe/Supabase/Google origin. CSP is correctly blocking it, but something is *trying* to inject it — possible unauthorized tracker, leftover/compromised dependency, or injected snippet.
- **Type:** Security investigation (no code change yet — needs source identification).
- **Owner:** `zivosmedia` repo + security review. **Do not ignore.**

### P1-8 — "Continue with Zivosmedia" missing on all 8 domains
- **Evidence:** the literal CTA appears on 0/8 domains; only zivoschat expresses the concept in copy.
- **Impact:** No unified sign-in story across the product family.
- **Type:** Cross-domain UI/identity foundation.
- **Owner:** zivosmedia (identity) + each app repo.

### P1-9 — ZivoChat support entry missing on 7/8 domains
- **Evidence:** ZivoChat support visible only on zivoschat.com; zivostravel only references it in copy.
- **Type:** Cross-domain UI.
- **Owner:** each app repo + ZIVO-CHAT.

### P1-10 — zivoschat.com missing Supabase env vars
- **Evidence:** console `Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY — using bundled public fallback until the site is re-published with env vars`.
- **Impact:** Chat running on a bundled public fallback config rather than its own env — fragile / wrong-project risk.
- **Type:** Deployment/config (set env + re-publish). **Do not commit secrets** — set in the host dashboard.
- **Owner:** confirm ZIVO-CHAT repo + hosting.

## Lower-priority (P2)
- No cross-domain app switcher (8-app grid) on any domain.
- 401 resource error noise on logged-out super-app pages (zivosmedia/business/driver/employee roots & feed).
- Responsive route divergence at zivosmedia root (desktop=Feed vs mobile=Travel landing) — confirm intent.
- Auth-gated routes (`/chat`, `/travel`, `/wallet`, `/settings`) correctly redirect to sign-in (working as designed; listed for completeness).

## Priority order (per supplied rule)
1. **DNS/load failure:** zivoadmin.com (P0-1).
2. **Old deployment / wrong repo served:** zivodriver.com (P0-2), zivobusiness.com (P0-4), zivoemployee.com (P0-5).
3. **`/hotels` wrong content:** P0-3.
4. **Missing "Continue with Zivosmedia":** P1-8.
5. **Missing ZivoChat support:** P1-9.
6. **Business/Employee/Software/Chat domain-specific landings:** P0-4/P0-5 (build) + zivoschat env (P1-10).
7. **Zivo Admin platform registry:** after DNS (P0-1).
8. **Zivosmedia identity foundation:** P1-8 underpins this.

*(Security item P1-7 and the checkout crash P1-6 should be triaged alongside step 3 since they live in the zivosmedia repo already in scope.)*
