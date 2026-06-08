# ALL ZIVO Live Website Audit

**Date:** 2026-06-08
**Branch:** `docs/all-zivo-live-website-audit`
**Scope:** Audit only — no UI code, auth, payment, migrations, secrets, or production changes.
**Method:** Live HTTP checks (curl) + Playwright headless Chromium rendering of every domain and key path.
**Viewports:** Desktop 1440×900 · Mobile iPhone 13 (390×844) · Tablet iPad gen-7 (768×1024, landing pages only).
**Evidence:** 78 screenshots in `docs/live-audit-screenshots/{desktop,mobile,tablet}/`; raw machine data in `scripts/tmp-audit-results.json`.

> ⚠️ These sites are **client-rendered SPAs**. Static HTML titles are misleading (most share one default `<title>`); the findings below are based on the **JS-rendered DOM**, not raw HTML.

---

## 1. Executive Summary

| # | Finding | Severity |
|---|---------|----------|
| 1 | **zivoadmin.com fails DNS** (`ERR_NAME_NOT_RESOLVED`) — domain does not resolve at all. | **P0** |
| 2 | **`/hotels` shows "Rides available in Cambodia"**, not hotels — exactly the flagged P0. | **P0** |
| 3 | **zivodriver.com serves the generic Zivosmedia super-app**, not the merged PR #2 Driver landing → deployment/publish issue. | **P0** |
| 4 | **zivobusiness.com & zivoemployee.com serve the generic super-app feed**, not their own landing pages. | **P0/P1** |
| 5 | **`/travel/checkout` crashes** (`useTravelCart must be used within a TravelCartProvider`) → "Checkout Error". | **P1** |
| 6 | **Unknown third-party script `emrld.ltd/...js` injected** on travel pages (blocked by CSP) — possible unauthorized/tracker/supply-chain script. | **P1 (security)** |
| 7 | **"Continue with Zivosmedia" appears on ZERO pages** across all 8 domains. | **P1** |
| 8 | **ZivoChat support entry missing** everywhere except zivoschat.com. | **P1** |
| 9 | **zivoschat.com missing Supabase env vars** (running on bundled public fallback). | **P1** |
| 10 | **No cross-domain app switcher** linking the 8 products. | **P2** |

**What works well:** `zivostravel.com` (all 7 paths render correct, distinct travel content — the reference model), `zivosoftware.com` (proper Software landing), `zivoschat.com` (proper ZIVO Chat sign-in), and the `zivosmedia.com` core (feed, login, signup, flights, cars, bus, business, support, legal).

---

## 2. Domain-by-Domain Results

Screenshot path convention: `docs/live-audit-screenshots/<viewport>/<domain>__<slug>.png`
(e.g. desktop `/` for zivosmedia → `docs/live-audit-screenshots/desktop/zivosmedia_com__root.png`).

### 2.1 zivosmedia.com — Zivosmedia super-app
- **DNS/Load:** ✅ resolves, HTTP 200, Cloudflare. No redirect.
- **Identity:** Correctly hosts the all-in-one super-app. Desktop root renders the **Feed**; mobile/tablet root renders the **"ZIVO – Your Travel Super-App"** landing (responsive route difference — confirm it's intentional).
- **Continue with Zivosmedia:** ❌ not present on any page.
- **ZivoChat support:** ❌ not surfaced (no chat support widget/entry).
- **App switcher / cross-app links:** Internal service nav only (Feed, Reels, Flights, Hotels, Cars, Delivery, Shopping…). No links to the other 7 ZIVO domains.
- **Mobile:** no horizontal overflow on any path.

| Path | Status | Heading (rendered) | Notes |
|------|--------|--------------------|-------|
| `/` | ✅ pass | Feed | Desktop=Feed, mobile=Travel super-app landing. 401 resource (API while logged-out). |
| `/login` | ✅ pass | Zivo | Sign-in form, magic-link option. |
| `/signup` | ✅ pass | Zivo | Create-account form, 18+ DOB. |
| `/feed` | ✅ pass | Feed | 401 resource (expected logged-out). |
| `/business` | ✅ pass | Software Business Page for local operators | "ZIVO SOFTWARE" workspace landing. |
| `/chat` | 🔒 needs login | Zivo | Redirects to Sign in to ZIVO. |
| `/travel` | 🔒 needs login | Zivo | Redirects to Sign in. |
| `/flights` | ✅ pass | Search & Compare Flights | 500+ airlines UI. ⚠️ emrld.ltd CSP violation. |
| `/hotels` | ❌ **WRONG CONTENT** | **Rides available in Cambodia** | **P0** — ride/Cambodia geo-gate, not hotels. ⚠️ emrld.ltd CSP. |
| `/cars` | ✅ pass | Find Your Perfect Ride | P2P car marketplace. ⚠️ emrld.ltd CSP. |
| `/bus` | ✅ pass | Book a Bus | Intercity bus search. |
| `/travel/checkout` | ❌ **fail** | Checkout Error | **P1** — JS crash: `useTravelCart must be used within a TravelCartProvider`. |
| `/wallet` | 🔒 needs login | Zivo | Redirects to Sign in. |
| `/support/new` | ✅ pass | Get help | Support ticket form. |
| `/legal/privacy` | ✅ pass | Privacy Policy | Updated 2026-03-13, CCPA. |
| `/settings` | 🔒 needs login | Zivo | Redirects to Sign in. |

### 2.2 zivobusiness.com — expected: Zivo Business landing
- **DNS/Load:** ✅ resolves, HTTP 200, Cloudflare.
- **Result:** ❌ **WRONG CONTENT** — renders the identical Zivosmedia super-app **Feed** (desktop) / Travel super-app (mobile). No business landing, no business-profile creation, no billing/subscription concept.
- **Continue with Zivosmedia:** ❌ · **ZivoChat:** ❌ · **App switcher:** ❌
- **Priority:** **P0/P1** — domain points at the generic super-app deployment; no dedicated Business surface exists.
- Screenshots: `desktop|mobile|tablet/zivobusiness_com__root.png`.

### 2.3 zivodriver.com — expected: NEW Driver landing (merged PR #2)
- **DNS/Load:** ✅ resolves, HTTP 200, Cloudflare.
- **Result:** ❌ **WRONG CONTENT / NOT DEPLOYED** — `/` and `/join` render the generic Zivosmedia super-app **Feed**, **not** the merged-PR-#2 Driver landing.
  - It does **not** show the old "delivery partner app" placeholder either; it shows the full super-app shell.
  - **Per the task rule: this is a P0 deployment/publish issue, not a UI-code issue** — the Driver landing code is not being served on this domain.
- **Become a Driver / earnings / payout copy:** ❌ not present.
- **Continue with Zivosmedia:** ❌ · **ZivoChat:** ❌ · **App switcher / 8 links:** ❌
- **Working sub-paths:** `/signup`, `/login`, `/privacy`, `/terms` resolve to standard ZIVO (Travel-Platform-branded) pages.

| Path | Status | Heading | Notes |
|------|--------|---------|-------|
| `/` | ❌ wrong content | Feed | Generic super-app, not Driver landing. **P0 deploy.** |
| `/join` | ❌ wrong content | Feed | Should be "Become a Driver". **P0.** |
| `/signup` | ✅ pass | Zivo | Generic ZIVO signup. |
| `/login` | ✅ pass | Zivo | Generic ZIVO sign-in. |
| `/support` | 🔒 needs login | Zivo | Redirects to Sign in. |
| `/privacy` | ✅ pass | Privacy Policy | ZIVO Travel Platform legal. |
| `/terms` | ✅ pass | Terms of Service | ZIVO Travel Platform legal. |

### 2.4 zivoemployee.com — expected: Employee/staff workflow landing
- **DNS/Load:** ✅ resolves, HTTP 200, Cloudflare.
- **Result:** ❌ **WRONG CONTENT** — renders the generic Zivosmedia super-app Feed. No employee scheduling / payroll / time-clock / training concept.
- **Continue with Zivosmedia:** ❌ · **ZivoChat:** ❌ · **App switcher:** ❌
- **Priority:** **P0/P1** — no dedicated Employee surface exists.
- Screenshots: `…/zivoemployee_com__root.png`.

### 2.5 zivoschat.com — expected: ZivoChat landing/app
- **DNS/Load:** ✅ resolves, HTTP 200, Cloudflare. `/` redirects to `/chat`.
- **Result:** ✅ **CORRECT PRODUCT** — renders **"ZIVO Chat"** sign-in: *"Use your ZIVO Media account."* Closest domain to its expected SSO/identity story.
- **Continue with Zivosmedia:** ⚠️ concept present in copy ("Use your ZIVO Media account") but not the literal "Continue with Zivosmedia" CTA.
- **ZivoChat support:** ✅ (this *is* the chat product).
- **Issue:** ⚠️ console error — *"[supabase/client] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY — using bundled public fallback until the site is re-published with env vars."* → **P1 config/deploy**.
- Screenshots: `…/zivoschat_com__root.png`.

### 2.6 zivosoftware.com — expected: ZivoSoftware business software
- **DNS/Load:** ✅ resolves, HTTP 200, Cloudflare. `/` → **302** → `/business`.
- **Result:** ✅ **CORRECT PRODUCT** — *"ZIVO Software for local businesses … setup, customers, invoices, operations, reports, secure team access."* CTAs: Create Business Software, View Software. Nav: Software / Workflow / Business Page / Security.
- **Continue with Zivosmedia:** ❌ · **ZivoChat:** ❌
- **Connection to Zivo Business:** shares the Business workspace surface seen at `zivosmedia.com/business`.
- Screenshots: `…/zivosoftware_com__root.png`.

### 2.7 zivostravel.com — expected: Zivo Travel
- **DNS/Load:** ✅ resolves, HTTP 200, Cloudflare. **Separate, well-built app (zivostravel repo) — the reference quality bar.**
- **Result:** ✅ **CORRECT PRODUCT on every path.** Flights, Hotels, Rental cars, Bus, Deals, My trips, Wallet, Support all render distinct, correct content with live search results. Has a "Live bridge … zivosmedia" handoff.
- **`/hotels` correctly shows "Hotels in Siem Reap"** (contrast with the broken zivosmedia.com/hotels).
- **Continue with Zivosmedia:** ❌ literal CTA absent; Support page says *"continue in Zivos Media chat"* (concept present).
- **ZivoChat support:** ⚠️ Support page references handing off to Zivos Media chat but no embedded ZivoChat entry.
- **Travel → Driver connection:** `/cars` mentions driver/pickup; no explicit Travel→Driver workflow link.

| Path | Status | Heading |
|------|--------|---------|
| `/` | ✅ pass | Where will you go next? |
| `/flights` | ✅ pass | Flights from Phnom Penh to Siem Reap |
| `/hotels` | ✅ pass | **Hotels in Siem Reap** |
| `/cars` | ✅ pass | Rental cars in Siem Reap |
| `/bus` | ✅ pass | Buses from Phnom Penh to Siem Reap |
| `/support` | ✅ pass | Travel support |
| `/trips` | ✅ pass | My trips |

### 2.8 zivoadmin.com — expected: Admin landing/login/control center
- **DNS/Load:** ❌ **FAILS DNS** — `net::ERR_NAME_NOT_RESOLVED` / `curl: (6) Could not resolve host`. No A record.
- **Result:** Total failure — site does not exist on the network. No login, no "access restricted" page.
- **Security note:** because it does not resolve, no private admin data is exposed; but the domain is fully non-functional.
- **Priority:** **P0** — DNS must be created/pointed before any UI work.
- Screenshots: `…/zivoadmin_com__root.png` (blank `about:blank`).

---

## 3. Console Errors & Security Notes

| Page(s) | Console error | Assessment |
|---------|---------------|------------|
| zivosmedia `/`, `/feed`, business/driver/employee roots | `Failed to load resource: 401` | Expected-ish: an API call returns 401 while logged out. Noisy; should be silenced. |
| zivosmedia `/flights` `/hotels` `/cars` | `Loading the script 'https://emrld.ltd/NDkzNzQ1.js' violates … CSP script-src` | ⚠️ **Security.** `emrld.ltd` is **not** a known ZIVO/Stripe/Supabase/Google origin. CSP correctly blocks it, but its injection should be investigated (unauthorized tracker / supply-chain / compromised dependency). |
| zivosmedia `/travel/checkout` | `useTravelCart must be used within a TravelCartProvider` | **Bug** — checkout route mounts outside its required provider when reached directly. |
| zivoschat `/` | `Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY — using bundled public fallback` | **Config/deploy** — env vars not set on the zivoschat deployment. |

**Layout:** No horizontal overflow / clipping detected on desktop, mobile, or tablet on any captured page.

---

## 4. Likely Repo Owner (from `docs/DOMAINS_AND_REPOS.md` + live behavior)

| Domain | Live serves | Likely repo | Access | Ownership action |
|--------|-------------|-------------|--------|------------------|
| zivosmedia.com | super-app | `kimlainchhorng/zivosmedia` | ✅ | none |
| zivostravel.com | Zivo Travel | `kimlainchhorng/zivostravel` | ✅ | none |
| zivobusiness.com | zivosmedia super-app | zivosmedia (host alias) or TBD | — | confirm intended repo / host routing |
| zivodriver.com | zivosmedia super-app | `kimlainchhorng/zivodriver` (404) | ❌ | **confirm** — where does PR #2 live? why not served? |
| zivoemployee.com | zivosmedia super-app | TBD | — | confirm repo |
| zivoschat.com | ZIVO Chat | `kimlainchhorng/ZIVO-CHAT` (404) | ❌ | confirm repo + set env vars |
| zivosoftware.com | ZIVO Software | `kimlainchhorng/zivosoftware` (404) | ❌ | confirm repo |
| zivoadmin.com | nothing (DNS fail) | `kimlainchhorng/Zivo-Admin` (404) | ❌ | confirm repo + create DNS |

> 404 = GitHub connector could not access the repo in this session. Do not guess alternate names; owner should confirm spelling/access or create the repo.

---

## 5. Validation Report (answers to the 9 required questions)

1. **Load correctly:** zivosmedia.com, zivostravel.com, zivoschat.com, zivosoftware.com (7/8 return HTTP 200).
2. **Fail DNS/load:** **zivoadmin.com** (DNS does not resolve).
3. **Wrong app content:** **zivosmedia.com/hotels** (rides/Cambodia), **zivobusiness.com**, **zivodriver.com** (+`/join`), **zivoemployee.com** (all serve generic super-app).
4. **Placeholder/generic content:** zivobusiness / zivodriver / zivoemployee roots (generic super-app shell standing in for a real landing).
5. **Need deployment/publish fixes:** zivodriver.com (PR #2 not live), zivoschat.com (env vars), zivoadmin.com (DNS), business/employee (point to real surface).
6. **Need UI fixes:** zivosmedia.com/hotels (route → wrong component), /travel/checkout (provider bug); Business/Employee landing pages must be built.
7. **Need repo-ownership confirmation:** zivodriver, zivoschat, zivosoftware, zivoadmin (all 404), plus business/employee repo identity.
8. **Top 10 P0/P1:** see `docs/LIVE_WEBSITE_P0_ISSUES.md`.
9. **Recommended next PR:** see `docs/LIVE_WEBSITE_FIX_ROADMAP.md` §"Recommended next PR".

See also: `DOMAIN_STATUS_MATRIX.md`, `CROSS_DOMAIN_NAVIGATION_STATUS.md`, `LIVE_WEBSITE_P0_ISSUES.md`, `LIVE_WEBSITE_FIX_ROADMAP.md`.

---

## 6. Independent live re-verification (2026-06-08, second pass)

The findings above were independently re-checked live this session via `curl` (DNS/HTTP + served-HTML inspection). Results matched the original audit:

| Check | Method | Result |
|-------|--------|--------|
| 7/8 domains reachable | `curl -sI` each host | ✅ HTTP **200** via Cloudflare on media/business/driver/employee/chat/software/travel |
| zivoadmin.com down | `curl` + `nslookup` | ✅ HTTP **000** — host does not serve; no working A record / not reachable |
| `/chat`, `/business` redirects | `-L` final URL | ✅ zivoschat→`/chat`, zivosoftware→`/business` confirmed |
| **Domain↔product mismatch is host-routing** | md5 of root HTML per host | ✅ zivosmedia / zivobusiness / zivodriver / zivoemployee all serve a **byte-identical** root document (`md5 e7248906…`). They are the **same deployment** behind 4 hostnames — confirming the mismatch is a host-routing/deploy issue, not 4 separate broken apps. |
| **`emrld.ltd` script — located in committed source** | `git show origin/main:index.html` + live HTML | ⚠️ **Correction:** the loader `script.src = 'https://emrld.ltd/NDkzNzQ1.js?t=493745'` **IS committed in the app source** — an inline IIFE in `index.html` (`origin/main` line 442), plus a stray duplicate `eloquent-liskov-159913/index.html`. It is gated to web (non-Capacitor) `/flight`, `/hotel`, `/car` routes and deferred via `requestIdleCallback`, with a comment calling it a "third-party tracker / partner script". It is **not** an edge/host injection. `emrld.ltd` with an obfuscated `NDkzNzQ1.js` path is not a recognizable analytics/ads vendor (contrast the clearly-named gtag / Facebook / TikTok / Twitter / AdSense loaders in the same file), so it still warrants a **security review of who added it and what it does** — but the fix is to **remove it from the committed `index.html` (and the stray `eloquent-liskov-159913/index.html`)**, not to chase the hosting layer. CSP currently blocks it at runtime. (A concurrent change titled "remove tracker" already drops it from source.) |

**Net:** the audit is accurate and current. Correction from this pass: `emrld.ltd` is **committed application code in `index.html`** (an inline loader gated to travel routes), **not** an edge/deploy-layer injection as first stated. Action: remove it from the committed HTML (and the `eloquent-liskov-159913/index.html` duplicate) and review its provenance — it is the one finding here that looks like a possibly-unwanted/unvetted third-party script shipped in source.
