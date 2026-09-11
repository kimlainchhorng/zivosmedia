# September 8 site audit implementation

## Current release status

This document distinguishes source implementation from production restoration. Earlier dated sections are historical evidence and are superseded by the final completion pass below.

| Requested work | Current implementation | Remaining proof / input |
| --- | --- | --- |
| Production Supabase configuration | Build guard, recovery UI, local public configuration and GitHub build variables configured | Fresh guarded deployment and test-account login |
| Anonymous homepage | One EN/KM marketing hub, real service links, signed-in feed routing, prerendered content | Fresh production verification |
| 404 and www redirect | Worker route-aware 404 and apex 301, regression tests | Live HTTP check after deployment |
| Khmer | Homepage/guides, primary travel forms, filters/calendar/passengers/footer, metadata/font/alternates | Desktop/mobile public-page checks passed; provider content is not machine-translated |
| Performance | Lightweight anonymous entry, deferred consent code, PDF/chart startup guard, Lighthouse budgets | Local measured budgets passed; production field performance remains unverified |
| Cambodia locale | Edge country, KH/KHR defaults, saved choices, Khmer phone digits | Production edge geo check; transaction currencies remain service-owned |
| Cambodia SEO | 12 guides, 305 sitemap URLs, language alternates, WebSite/Organization and visible guide FAQ schema | Fresh deployment and crawler checks |
| Error recovery and monitoring | Global/page boundaries, optional lazy Sentry, deploy smoke and Telegram failure workflow | Sentry DSN, QA account, approved Telegram destination and bot/chat secrets; activation/delivery |
| Business identity release gate | Existing strict gate preserved | Real registered address and public support phone; Cambodia operating address supplied |
| Authenticated-area audit (§3) | Test harness prepared | Working production login and a dedicated test account; booking/payment/provider/device flows require their own proof |

The final `npm run update` gate passed. Strict technical preflight and `release:gate` passed; `release:production-gate` stops at the existing business-identity check. No deployment, scheduler activation, Telegram message, Sentry event, commit or push has been performed in this work.

## Verified local changes

- All-mode Supabase build validation, deferred application boot and unavailable
  screen, environment inventory, deployment smoke/Telegram workflow: previous
  configuration slice; see `DEPLOY.md`.
- Browser `/` now shows a Cambodia marketing homepage for signed-out users at
  every viewport. Signed-in web users go to `/feed`; native Capacitor behavior
  and other product-domain homepages retain their existing routing.
- EN/KM copy, language toggle, persisted language, explicit `?lang=km` startup,
  `html lang`, on-demand Noto Sans Khmer, localized homepage title/description/OG,
  canonical `/`, hreflang alternates and WebSite structured data. Authored bilingual
  content opts out of automatic DOM translation so brand names and the language
  toggle cannot be rewritten after page load.
- Real service links to Ride, Eats, hotels, flights, delivery and Business;
  Driver, contact, legal and PWA installation links. No fake store-release badges
  or unverified Telegram handle were added.
- Cloudflare 301 www-to-apex redirect preserving path/query. Unknown SPA fallback
  routes return HTTP 404 with noindex and no-store. The generated manifest lists
  708 routes, including real generic legal policies, while excluding the retired
  country catch-all and development-only pages. Existing dynamic route patterns
  remain valid; nonexistent records within valid routes still require data-aware
  status handling. Run `node scripts/seo/generate-worker-routes.mjs` after route
  changes; a regression test detects stale output.
- Removed bluetooth, document-domain and interest-cohort Permissions-Policy
  directives. Cookie consent waits for the first pointer/key/scroll interaction;
  this does not grant consent or enable analytics/marketing.

## Earlier implementation evidence

- `npm run update`: exit 0, including app and Worker types, required contracts,
  boundary QA, and configured production build.
- Focused homepage, auth routing, cookie interaction, Worker route/status and
  legacy redirect suites: 26 passed.
- Scoped frontend ESLint: no errors. Worker policy is covered by Worker typecheck;
  the frontend ESLint configuration excludes Cloudflare source files.
- `git diff --check`: passed.
- Mac Chrome visibly opened at `http://127.0.0.1:5199/?lang=en`; Khmer toggle
  verified via visible page content, title, URL and links.
- Browser plugin had no available connection. An isolated Playwright browser
  additionally checked 1366x900 English and 390x844 Khmer. Both had one main H1,
  correct title/language/canonical and no horizontal overflow. Screenshots were
  visually inspected for spacing, typography, wrapping, image and link layout.
- Strict local deployment env still fails for the six settings in `DEPLOY.md`.
  No commit, deployment, live authenticated test or Telegram send was performed.

## Audit backlog recorded before the follow-up passes

- Restore the live deployment and verify real sign-in/feed data with a dedicated
  test account; configure and activate scheduled monitoring and alert delivery.
- Full `/flights` and `/hotels` translation/content acceptance, consent UI
  translations, and server-rendered/localized homepage metadata and content for
  non-JavaScript crawlers. The new homepage is a React page, not prerendered HTML.
- Route bundle analysis and measured request/transfer/LCP budgets. No landing
  performance-budget claim is made by the responsive QA.
- Geo-derived KH/KHR defaults, remembered currency choice and market-specific
  currency verification. Language changes do not change transaction currency.
- Cambodia content and sitemap prioritization, further structured data and
  public-page SEO validation.
- Confirm the intended official Telegram contact destination before adding it.

## Follow-up: travel entry screens and country defaults

- Flights desktop/mobile and Hotels now have authored Khmer primary headings and metadata. Hotels destination input, dates/guest labels and primary action, plus remaining FlightSearchFormPro date/traveler/cabin labels, respond to the existing language preference. Flights mobile has a localized page H1 and a separate search H2. Secondary travel promotions, results/card copy and date-picker internals still need a complete translation pass.
- Display currency initialization now follows URL currency, saved currency, then visitor country. Language no longer determines currency. Saved country wins over edge country; Media falls back to KH when neither exists. Conversion base and booking/payment currencies are unchanged.
- Main-host Cloudflare HTML includes validated country metadata, with private/no-store caching and original validators removed. Other hosts remain outside the HTML rewrite. The client skips the extra geo-detect call when edge metadata exists.
- Fixed optional vendor ownership in Vite 8/Rolldown: shared runtime/class-name helpers and React dependencies are assigned before optional libraries can capture them. A build guard traverses emitted startup imports and fails if PDF or chart vendor chunks are reachable. Production build and independent es-module-lexer scan passed: App startup graph has 77 JS chunks, 1,460,779 raw JS bytes, and no PDF/chart vendors. This is a static graph measurement, not transferred bytes or a Lighthouse score; the 60-request budget is not yet met.
- Focused validation: 28 country/currency/Worker route tests passed. Scoped lint has no remaining errors; existing hook warnings remain. Final `npm run update` passed after the last label changes (including 165 boundary checks and the guarded production build). Built-preview checks passed for desktop EN homepage/Flights (1366x900) and mobile KM Hotels/Flights (390x844): correct language/title/headings, Khmer font, no horizontal overflow, no pageerror events during the smoke, and zero PDF/chart vendor requests. The final Flights follow-up confirms exactly one H1 and Khmer origin/destination placeholders and swap control.

This is local source work. Production deployment and authenticated production smoke remain outstanding as described in DEPLOY.md.

Preview remains open at http://127.0.0.1:5199/flights?lang=km, served by Vite preview from the built dist. Screenshot artifacts: /tmp/zivo-travel-hotels-km.png and /tmp/zivo-travel-flights-km-final.png. These checks do not verify authenticated bookings, production headers/deployment, or mobile Lighthouse budgets.

Visible handoff: opened and verified the rendered Khmer Flights page in a fresh Chrome Incognito window. The existing normal-profile tab stayed on its startup shell after the dev-to-preview switch; the clean browser and isolated Playwright sessions rendered correctly. Persistent-profile/service-worker upgrade behavior needs separate investigation before claiming that deployment transition is verified.


## Release completion validation (September 8)

The current configured production build passed `npm run update`, including frontend and Worker types, required contract tests, boundary checks and the Vite build. The six previous local environment blockers are resolved. The main-project auth settings endpoint responds HTTP 200; this is a public configuration check, not authenticated login evidence. Migration history was refreshed through read-only Supabase MCP (1780 remote entries); no migration was applied.

The web homepage now uses a lightweight entry before the full application shell. Signed-in sessions redirect to `/feed`; native/installed apps, sibling domains, OAuth callbacks and shared links retain the full router. New public visitors do not precache the whole app. Existing service-worker registrations are checked for updates.

Measured built-preview results (Chromium, three seconds after H1):

| Viewport | Language | Requests including document | Resource transfer bytes | Full App chunk | PDF/charts | Page errors / overflow |
| --- | --- | ---: | ---: | --- | --- | --- |
| 1366 × 900 | English | 44 | 493443 | absent | absent | none |
| 390 × 844 | Khmer | 45 | 494265 | absent | absent | none |

Resource transfer totals use Resource Timing and exclude the initial HTML document; cross-origin timing visibility can limit totals. These local compressed-transfer measurements are not a throttled production Lighthouse score or an LCP guarantee. The global decoded CSS remains large. Screenshots were inspected for Khmer rendering and responsive layout. A real link click from the lightweight homepage reached the full Hotels route successfully, and the language toggle and interaction-triggered cookie banner worked.

Cookie consent now has authored Khmer labels, descriptions and accessible control names. Five focused service-worker/consent tests passed. A real controlled-browser regression passed: changed HTML is fetched online, while cached shell HTML remains available offline. The fix registers network-first navigation routing before precache route matching. This verifies the new service worker, not every previously deployed worker version or every offline app feature.

Scoped ESLint and `git diff --check` passed. Dedicated test-account credentials are still absent, so real sign-in/feed data and scheduled alert delivery are not certified. Full secondary travel translations, Cambodia content expansion, server-rendered localized content and mobile Lighthouse acceptance remain follow-up work; the release fix does not imply every original audit recommendation is complete.


Final local release check: strict preflight and `release:gate` passed. `release:production-gate` stopped at the pre-existing business-identity check because registered office address, Cambodia operating address and support phone are blank. Owner input is required; the gate was not bypassed. No production deployment occurred. See DEPLOY.md for the exact remaining inputs and commands.


## Public release regression follow-up

Added `playwright.public.config.ts` and `tests/public/home.spec.ts`, with post-deploy workflow integration before credential validation. Complete encoded-transfer measurements (including HTML and cross-origin fonts, cache disabled) supersede the earlier resource-only figures: EN desktop/mobile 45 requests and 552179 bytes; KM desktop 50 requests and 721667 bytes, KM mobile 50 requests and 721665 bytes. Each passes the 60-request / 800000-byte startup budgets. LCP remains unmeasured.

The live Worker deployment history was rechecked and still shows the September 8 version `53df35d3-dfbe-450c-a491-12d70da4a9dd` at 100%. Business identity history contains no approved street addresses or support number, so those owner inputs remain required. No release gate was removed and no deployment occurred.

Public regression verification: all six Playwright cases passed in 2.0 minutes; scoped ESLint, workflow immutable-reference check and git diff --check passed.


## Public metadata at the edge

The Media Worker now supplies localized title, description, canonical, Open Graph/Twitter metadata and EN/KM/x-default alternatives for `/`, `/flights` and `/hotels` in the initial HTML. Explicit `?lang=km` sets `html lang="km"`; other language values use English without reflecting arbitrary query data. Country metadata and private/no-store behavior are preserved. Client boot removes the edge-owned language alternatives before route components install their current alternatives, avoiding stale route links.

Only successful HTML responses on the Media apex and fixed public entry paths are rewritten. Sibling domains, unknown paths, auth callback/share parameters and error-page SEO stay outside the rewrite. Existing script, security and structured-data elements remain present. This supplies metadata to non-JavaScript crawlers; it does not prerender the page body.

Thirty focused Worker SEO/country/routing tests passed. The connected Stripe app was considered as a source of verified public business details, but its OAuth connection requires reauthentication; no Stripe account data was read or changed. The missing business identity fields remain unresolved.

Edge SEO validation: full npm run update passed after the code change, including frontend/Worker types, required contract suites, 165 production boundaries and the production build. Actual index.html template checks also confirmed one title/canonical, three language alternatives and preservation of all scripts on all three Khmer routes.

Fresh-build browser acceptance: all six public Playwright cases passed (40.1 seconds). EN desktop/mobile remain at 45 requests and about 552230 bytes; KM at 50 requests and about 721696 bytes. Both startup budgets still pass. No production deployment or authenticated login is claimed.

## Final completion pass — source implemented, integration validation in progress

- Extracted shared homepage/guide views and added production build prerendering: 26 English/Khmer HTML artifacts, guarded Worker selection, functional language/service links without JavaScript. Callback/share and sibling-domain handling preserved.
- Added 12 Cambodia destination/airport/route guides, current SAI search support, FAQ schema and 305 sitemap URLs with language alternates. Static Worker route manifest is now 720 entries. SEO contract check: 1630 checks, zero failures.
- Expanded authored Khmer copy across travel filters, sort choices, fares, FAQs, footer, date picker and passenger controls. Added Khmer date formatting and local phone-digit acceptance with Cambodia default for new numbers. Existing international numbers retain their country code.
- Removed unsupported public promises about free cancellation, instant tickets, universal payment availability and fixed booking times. Available fare/payment terms remain provider-dependent.
- The anonymous homepage defers cookie banner code (including animation-heavy dependencies) until interaction; analytics remains consent-gated. Added bilingual error recovery and optional lazy Sentry reporting with redacted diagnostics.
- Configured GitHub public Supabase build variables. Added mobile Lighthouse CI (three samples per language) with LCP/request/byte assertions; no performance claim until fresh-build measurements finish.
- New/updated focused suites: **49 tests passed** across seven files covering prerenderable content and routing, Sentry privacy/failure recovery, phone country/digits, cookie interaction and homepage language behavior.
- Full `npm run update` is being rerun; earlier results in this document do not establish this final pass. No production release, authenticated smoke, Telegram alert or Sentry event has occurred.


## Final verified handoff

- `npm run update`: **passed**, including app/Worker type checks, Ride 52 tests, six production-boundary tests, six schema contracts, four linked-device tests, four native splash tests, 165 boundary checks with zero failures, production/PWA build and 26 prerendered pages. A transient Vitest configuration startup failure in an intermediate run was followed by a passing focused retry and passing complete gates.
- Focused website/configuration follow-up: **89 tests passed across 12 files**. Scoped ESLint: zero errors, one nonblocking Fast Refresh export warning in the translation helper.
- Public Playwright suite: **12 passed**, across 1366×900 desktop and 390×844 mobile. Covers EN/KM content, actual Khmer font loading, one H1, canonical, no horizontal overflow, original hero retained during hydration, service navigation, first-interaction CSS/consent, installed-shell stylesheet loading and usable no-JavaScript pages.
- Five rendered page captures (desktop home; Khmer mobile home, Flights and Hotels; Khmer Siem Reap guide with JavaScript disabled) had one H1, correct language, no document overflow and no uncaught page errors. Screenshots were visually inspected. Flight guide seeds resolve to KTI and SAI in the form.
- Separate loopback-only stylesheet failure test passed: one bounded automatic reload, visible error recovery, working explicit retry, no consent recorded. External requests were blocked during this deliberate fault test.
- Lighthouse CI: **all assertions passed over six runs**, using actual DevTools slow-4G throttling and 4x CPU. English LCP samples: 1391.496 / 1395.895 / 1412.730 ms; median **1.396 s**. Khmer: 1530.524 / 1547.525 / 1586.305 ms; median **1.548 s**. Lighthouse transfers: **30 requests / 313638 bytes EN**, **32 / 399424 bytes KM**. These are local lab measurements, not PageSpeed Insights simulated scores or production field data. See `artifacts/site-audit/performance.json` and `DEPLOY.md` for exact settings and the earlier simulated-run limitation.
- Cold Playwright transfers are **298180 bytes / 27 requests EN** and **443015 bytes / 30 requests KM** on both viewports, including HTML and fonts. The final public smoke log is `/tmp/zivo-audit-public-complete.log`; its exact byte totals include the final recovery timeout.
- SEO validation: **1630 checks, zero failures**; generated sitemap matches **305 URLs** and Worker route manifest **720 routes**. All 26 generated public HTML documents have one H1 and no loading overlay.
- Strict technical preflight: zero API/environment/database/current-gate blockers and no failed commands. This does **not** clear the separate business-identity release check. No database migrations were applied.
- Live read-only check: apex **200**, www **200**, unknown `/nope-404` **200**. The new www/404 behavior is not live. Authenticated sign-in has not been proved because the QA account is missing.
- The verified Khmer homepage is open in Chrome at **http://127.0.0.1:5202/?lang=km**; its local preview server remains running.

### Inputs still required to finish the original audit on production

1. `COMPANY_INFO` in `src/config/legalContent.ts`: real registered street/city/postal address and reachable public support phone. These are business facts; do not invent them or bypass the release check.
2. Dedicated non-admin QA credentials in local ignored configuration or GitHub secrets for the login/feed smoke and authenticated-area audit. Never paste passwords into source or this report. Rotation of any password previously shared in chat is also unverified; no account password was changed here.
3. Approved public Telegram contact URL and Telegram bot/chat secrets; optional Sentry project DSN. Integration code exists, but live delivery and the ten-minute schedule are not activated.
4. GitHub Cloudflare account/API credentials for automated releases. Local authorized CLI deployment can proceed through `node scripts/deploy/local-release.mjs --deploy` after the business-identity gate is legitimately cleared.

The section-3 Feed/Reels/Chat/Wallet/order/booking/provider flows and real production login still require their separate authenticated audit after deployment. Local public-page checks do not establish those outcomes.

### Owner-supplied Cambodia address — September 8 follow-up

Recorded the address supplied by the owner in the Google Maps link: Building 18, VANN Office Premises, Street 578, Phnom Penh 12152, Cambodia. This fills only `COMPANY_INFO.operationsAddress`; the registered entity address and public support phone still require owner input. Earlier notes about the operating address being blank are superseded by this update. No production publication occurred.

Address follow-up verification: `npm run update` passed (exit 0; `/tmp/zivo-address-update.log`). `npm run check:business-identity` now reports only the missing registered office address and public support phone.

## Production deployment completed — September 8, 2026

Owner explicitly requested deployment before supplying the remaining registered office/phone. Final Cloudflare Worker `zivo` version **abfb40f3-cf07-474c-a2ca-a5bf8f73d447**, created 2026-09-08T22:23:48Z, confirmed at **100%**. Used `wrangler deploy --keep-vars`; existing bindings preserved. No commit/push, database migration or scheduled monitoring activation. Earlier deployment-blocked notes are superseded for this owner-authorized release only; the business identity check remains unchanged and incomplete.

Validation: fresh `npm run update` passed, strict technical preflight/release:gate passed, current production summary passed, zero dependency vulnerabilities. Patched workflow action pins, js-yaml/sharp dependencies. Live QA exposed a second-pass SEO rewrite bug caused by tag text inside a comment; fixed by removing comments only in the HTML head, preserving React body markers. Twelve SEO tests and EN/KM browser replay of the real edge rewrite passed. Final live public browser suite **12/12 passed** (49.9 seconds), including EN/KM desktop/mobile, canonical, font loading, hydration, cookie controls, hotel navigation, installed-shell styles and no-JavaScript navigation. Live startup measured EN 29 requests / 361194–361439 bytes; KM 31 requests / 425322–448953 bytes.

Live www path/query redirect is HTTP301 to apex; unknown `/nope-404` is HTTP404. Login account picker opens email form, no placeholder requests observed; main Supabase auth settings returns HTTP200. Cambodia operating address is visible on Contact. Actual credential sign-in remains unverified because dedicated QA credentials are absent. Registered address/phone and monitoring inputs remain follow-ups.

Evidence: `/tmp/zivo-final-hydration-update.log`, `/tmp/zivo-deploy-owner-first-check.log`, `/tmp/zivo-edge-comment-test.log`, `/tmp/zivo-final-hydration-deploy.log`, `/tmp/zivo-deployment-final-confirmed.log`, `/tmp/zivo-live-public-verified.log`. Prior pre-session rollback version: `53df35d3-dfbe-450c-a491-12d70da4a9dd`.
