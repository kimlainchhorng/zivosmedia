# zivosmedia.com deployment and sign-in recovery

The production site is the Cloudflare Worker **`zivo`**, configured by
`wrangler.toml`, with Vite assets in `dist`. This is not the `zivo-preview`
Pages project or a Vercel project. The canonical pipeline is
`.github/workflows/deploy-cloudflare-production.yml`.

## Current local release preparation (September 8 continuation)

The six earlier local environment blockers are resolved using verified public
keys from the existing authenticated Supabase CLI session. Public release values
are in the ignored, permission-restricted `.env.local`. No service-role key or
management token was added to browser configuration or committed source.
The main project's migration-history evidence was refreshed through **read-only
Supabase MCP**: 1780 remote migrations, with all seven listed required entries
present. No migration or database mutation was executed.

On this Mac, use the existing Supabase CLI credential without copying its token:

```sh
node scripts/deploy/local-release.mjs --check
node scripts/deploy/local-release.mjs --deploy
```

`--check` runs strict preflight and the production release gate; run `npm run
update` separately to verify source and build changes. `--deploy` runs the existing
`cloudflare:deploy` command, including strict preflight, the production gate, a
fresh build and Wrangler. On other systems securely configure
`SUPABASE_ACCESS_TOKEN` in the process environment. The helper never prints tokens
or writes them to environment files.

Before the next release, the recorded production Worker version is
`53df35d3-dfbe-450c-a491-12d70da4a9dd` (100% traffic, September 8). Recheck deployment
history immediately before publishing. Cloudflare supports rollback using the
previous version; no binding or database migrations are part of this website
release.

Authenticated smoke still requires the owner's dedicated non-admin test account:
set `QA_TEST_EMAIL` and `QA_TEST_PASSWORD` securely in `.env.local` for local
verification, or GitHub Actions secrets for CI. Do not paste a password into chat.
No production login, deployment, Telegram alert, or monitoring activation is
implied by these configuration and source checks.

## Current final gate result

`npm run update` passed. `node scripts/deploy/local-release.mjs --check` completed strict preflight and `release:gate` successfully, then stopped at the existing `check:business-identity` gate. The production preflight summary has zero environment/API/database/command blockers. This is **not** a completed production release gate.

The only observed remaining release-gate failure is missing owner-supplied public identity in `src/config/legalContent.ts`:

- `COMPANY_INFO.registeredAddress`: registered street, city and postal code.
- `COMPANY_INFO.supportPhone`: reachable customer support number.

The owner supplied the Cambodia operating address on September 8: Building 18, VANN Office Premises, Street 578, Phnom Penh 12152, Cambodia. It is now recorded in `COMPANY_INFO.operationsAddress`.

Use verified company details. The deployment command retains this gate; no placeholder identity or gate bypass was introduced. After supplying these details, rerun `npm run update` and the local release check above, then use the canonical deploy command. Dedicated QA credentials are a separate requirement for authenticated smoke verification.

No production deploy has been performed by this audit session. The recorded Worker version remains the pre-release baseline, not a new deployment.

## Required browser build configuration

| Variable | Source and purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Main identity project: `https://slirphzzwcogdbkeicff.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | The same project's public `sb_publishable_…` key, or its legacy `anon` JWT |
| `VITE_ZIVO_RIDE_APP_URL` | `https://ride.zivosmedia.com`, required by deployment preflight |
| `VITE_ZIVO_SOFTWARE_SUPABASE_URL` / `VITE_ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY` | Dedicated Software configuration required by the existing production multi-domain preflight |

The first two variables are mandatory in **every Vite build mode**. Vite's
resolved environment is checked before bundling, including `.env`, `.env.local`,
mode-specific files and CI process environment. Blank values, placeholder
endpoints, invalid origins, secret/service-role/management keys and mismatched
legacy anon project references fail the build. Diagnostics never print values.
The guard checks configuration shape, not remote key validity; deployment
preflight and the authenticated smoke remain necessary.

`VITE_SUPABASE_PROJECT_ID` is optional for the client (it derives the project
reference from the URL). Keep it aligned with the main identity project when set.
Never substitute Driver's separate data-project credentials. Never put a service
role key, management token, test password or Telegram token in a `VITE_` variable.

Copy `.env.example` for local setup. The literal browser environment reads are
listed in [the environment inventory](docs/build-environment-inventory.md).
Most of those variables control optional integrations and flags, not boot.
Deployment also requires the existing server-side and release credentials checked
by `scripts/deploy/env-preflight.mjs` and `scripts/deploy/preflight.mjs`; the two
browser variables alone do not satisfy every release gate.

## Restore production

1. In the **main identity Supabase project's** API settings, obtain its public
   project URL and publishable key. Verify the project reference above.
2. For GitHub deployment, set `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY` in repository Actions variables (with secrets as a compatibility fallback), or the
   `production` environment. Check for empty or stale environment overrides.
   Use the secure GitHub UI or interactive `gh secret set NAME`; do not paste
   credentials in commit messages, shell arguments or chat.
3. Supply `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` to the same deployment
   environment, plus the existing strict preflight's required credentials.
   If Cloudflare Workers Builds runs independently of GitHub, set the public
   `VITE_` variables in **that build's environment** too. Worker runtime bindings
   cannot change already-built frontend JavaScript.
4. Review the source changes and run `npm run update`. Then use the existing
   reviewed commit/CI release process. `Deploy Cloudflare Production` accepts a
   successful **push CI run ID on main** via `ci_run_id` and verifies its authority.
   A skipped deployment is not a publish. Do not bypass failed CI/preflight gates.
5. The supported local release command is `npm run cloudflare:deploy`, after
   setting the required deployment environment and reviewing the working tree.
   It includes strict preflight, release gating, a fresh build and
   `wrangler deploy --keep-vars`. It publishes the current working tree, so do
   not use it to accidentally release unrelated unreviewed changes.
6. Verify the new public artifact, `/login`, actual sign-in and authenticated
   `/feed` data. Test a fresh browser and an existing PWA session (which may have
   cached the old shell). A build passing, a URL returning 200, or a placeholder
   string occurring in a fallback branch is not proof of working authentication.

## Post-deployment and scheduled authentication smoke

`production-auth-smoke.yml` runs after successful Cloudflare deployment workflows
on main and supports manual dispatch. Configure these **non-VITE** secrets:

- `QA_TEST_EMAIL` and `QA_TEST_PASSWORD`: a dedicated, email-verified standard
  test account on the main project. Do not use an administrator or founder account.
  If device verification/MFA challenges the account, the smoke fails; it never
  bypasses those controls. Resolve test-account setup through the normal auth flow.
- `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`: the intended operations destination.

Run `npx playwright install chromium`, then
`npx playwright test --config playwright.deploy.config.ts` with the test secrets
in the process environment. The config always targets `https://zivosmedia.com`;
it does not start a local dev server. It uses a fresh session, enters credentials
through `/login`, expects `/feed`, requires a real authenticated REST response
with status 200 from the main project, and fails on observed REST errors or
placeholder requests. It does not make purchases or post content. Sign-in may
create normal server-owned auth/device audit records.

The test disables traces, screenshots, video and saved auth state, and suppresses
raw action errors that might contain filled credentials. Failure alerts contain
only a fixed operational message. Missing test secrets fail visibly rather than
silently skipping. Missing Telegram configuration reports that no alert was sent.

After a manual smoke succeeds, set the repository variable
`PRODUCTION_AUTH_SMOKE_ENABLED=true` to enable the ten-minute scheduled run.
GitHub scheduled jobs are best effort, not a guaranteed ten-minute uptime SLA.
The workflow must first exist on main. This source change alone does not activate
monitoring or prove Telegram delivery.

## Initial September 8 configuration slice

For the subsequent homepage, localization, Worker routing and browser QA work,
see [the continuation report](docs/site-audit-implementation-2026-09-08.md).
The status below records the initial configuration pass.

This change addresses Prompt 1's build prevention, runtime recovery, environment
documentation and smoke implementation. Prompts 2–5 remain separate work:
logged-out EN/KM marketing homepage, real route-aware 404s and www redirect,
site-wide language/metadata/font behavior, route performance budgets, locale
defaults, Cambodia SEO content/sitemap and permission/consent cleanup.
Existing dirty SEO, Worker, native and app-shell changes must be reviewed before
implementing overlapping files. Do not defer legally required consent until
after nonessential tracking starts.

Read-only deployment inspection on September 8 found the two main Supabase
secret **names** in GitHub repository secrets; values cannot be read back.
No secrets were listed in the `production` environment, and the three latest
Cloudflare deployment workflow runs were skipped. These observations do not
establish the configuration of an independently deployed Cloudflare build.


## Initial investigation (historical; superseded by current preparation above)

- `npm run update`: passed, including app/Worker types, required contract suites,
  boundary QA and a configured production build.
- Focused validator, recovery component and direct Vite build-rejection tests:
  18 passed. Missing-env builds fail in production and development modes.
- Playwright deployment test discovery: one smoke test registered. Actual live
  sign-in was not run because dedicated test-account credentials are not configured.
- Immutable GitHub Action reference check and scoped ESLint: passed.
- Browser discovery returned no available browser; desktop/mobile visual and
  real network verification of the recovery screen remain pending.
- Local Wrangler OAuth is available. The strict local environment check fails
  on six missing settings: `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `SUPABASE_ACCESS_TOKEN`, `ZIVO_DRIVER_SUPABASE_PUBLISHABLE_KEY`,
  `ZIVO_TRAVEL_SUPABASE_PUBLISHABLE_KEY`, and
  `ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY`. These are distinct from the browser
  config, which is present locally. No gate was bypassed and no deploy was made.
- GitHub repository/production secret-name inspection did not find
  `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `QA_TEST_EMAIL`,
  `QA_TEST_PASSWORD`, `TELEGRAM_BOT_TOKEN` or `TELEGRAM_CHAT_ID`.
- The publicly served client chunk `client-wy1S_aUa.js` contains the placeholder
  endpoint and missing-config warning, with no main-project URL or publishable
  key literal. This supports the supplied outage report; no successful live login
  is claimed. Secrets, passwords and tokens were not copied into these documents.


## Public regression check

The production smoke workflow runs public checks before validating test-account secrets, so public failures are independently visible. To validate a local production preview without any credentials:

```sh
PUBLIC_SMOKE_URL=http://127.0.0.1:5199 npx playwright test --config playwright.public.config.ts
```

Without the override, the target is `https://zivosmedia.com`. Only that production origin and loopback HTTP origins are accepted. The suite uses clean desktop/mobile Chromium contexts, checks English/Khmer content, canonical URL, overflow, startup errors, optional-vendor exclusion, language switching and navigation into Hotels. Startup budgets are at most 60 requests and less than 800000 encoded bytes. CDP measures document and cross-origin transfers with the cache disabled through three seconds after the page settles. This is not a throttled LCP measurement.

Local measurements: English 45 requests / 552179 bytes on each viewport; Khmer 50 requests / 721667 bytes desktop and 721665 bytes mobile. These supersede the earlier incomplete Resource Timing totals. No production smoke or Telegram delivery is implied by the local run.


## Initial HTML metadata

The Worker now emits English/Khmer metadata for `/`, `/flights` and `/hotels` before JavaScript runs, including canonical and language alternatives. Verify both `?lang=en` and `?lang=km` after deployment by inspecting the HTTP response HTML as well as the rendered page. This is metadata rendering, not full page-body prerendering.

The Stripe connector was also checked as a possible source of approved business profile details, but it requires reconnection. No account information could be retrieved. Reconnect it or provide the missing business identity directly; the production business-identity gate remains unchanged.


## Final audit completion work (September 8, validation in progress)

The public Supabase URL and publishable key are now configured as GitHub repository **variables** for `kimlainchhorng/zivosmedia`; the build and deployment workflows read variables first, with the existing secrets fallback. This does not update the currently deployed Worker. No private management key or test password was copied into these variables.

`npm run build` now runs a postbuild renderer that creates 26 English/Khmer HTML documents for the homepage and 12 Cambodia guides. The Worker serves these before JavaScript and returns 503 if a required prerender artifact is missing. Deploy the complete `dist` directory, including `_prerender`; direct `vite build` alone is not the release command. Callback/share URLs preserve their existing app flow.

The Cambodia sitemap now includes 305 URLs, English/Khmer alternates, higher-priority destination/airport guides and lower-priority legal pages. Guides use current KTI/SAI airport references and explain legacy PNH/REP references. Airport sources: https://www.techoairport.com.kh/news/airport-certification and https://english.sai-airport.com/jcjj/38953.jhtml. The SAI search entry uses coordinates from https://ourairports.com/airports/VDSA/.

Lighthouse CI (`lighthouserc.cjs`) runs three mobile samples in each language against the production build. It enforces median LCP <= 2.5 seconds, <= 60 requests and < 800000 transferred bytes. Reports stay in `artifacts/lighthouse` and the private GitHub workflow artifacts. Run with `npx --yes @lhci/cli@0.15.1 autorun`. Measured results are recorded in the audit implementation report after validation.

Optional `VITE_SENTRY_DSN` enables an error-only SDK loaded on the first production error. Add the browser DSN to local build configuration / the GitHub variable of that name, rebuild, and verify a deliberate staging error after approval. No replay, automatic integrations or tracing are enabled. User/request details, breadcrumbs, source context, error messages and stack URL query strings are stripped. No Sentry project or delivery has been activated or verified here.

Remaining release inputs: the real registered address and public support phone in COMPANY_INFO; a dedicated non-admin QA account stored in secrets; the approved public Telegram destination and alert bot/chat configuration. The actual login smoke, ongoing monitoring and authenticated-area audit require those inputs and a successful production release. Do not bypass `check:business-identity` or claim deployment from a local build.


### Public rendering and performance measurement

The homepage now reuses its generated HTML through React hydration. Its visible styles are inlined from the shared view classes. The full app stylesheet loads when interactive cookie controls need it; installed web shells load it before mounting the full app. `public-home-boot.js` starts enhancement after the initial page has had a paint opportunity, with a one-second fallback. Links and language navigation remain usable without JavaScript. Keep `public-home-boot.js`, `public-page-styles.js`, `_prerender`, and the `fonts` directory with the deployed build.

Noto Sans Khmer v29 is served locally as unmodified Google Fonts WOFF2 subsets with `font-display: swap`; the license and source record are in `public/fonts/noto-sans-khmer-v29/`. Khmer prerenders include font definitions and preload the Khmer subset, avoiding a third-party stylesheet round trip.

The final Lighthouse CI method is **DevTools throttling**, which measures actual browser paints under 4x CPU slowdown, 562.5 ms request latency, 1474.56 Kbps download and 675 Kbps upload. Thresholds stay at 2.5 seconds / 60 requests / 800000 bytes and use three samples per language. The earlier default simulated runs predicted roughly 3–4 seconds; those are a different benchmark and are not reported as passing. Neither local mode establishes production field Core Web Vitals. Method reference: https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md.

Repository secret names were rechecked: Supabase management/public configuration names are present; `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `QA_TEST_EMAIL`, `QA_TEST_PASSWORD`, `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_CHAT_ID` are absent. Local CLI authorization can support a guarded owner-requested release, but GitHub automatic deployment/monitoring still requires its own credentials. No secret values were printed or copied during this check.


### Final local verification

The final complete `npm run update` passed. The website follow-up suite passed 89 tests, and the public browser suite passed 12 desktop/mobile cases. The six-run actual-throttling Lighthouse check passed with median LCP 1.396 s (EN) / 1.548 s (KM), about 314/399 KB and 30/32 requests. Local fault injection also verified bounded stylesheet-load recovery without sending external telemetry. Screenshots and machine-readable measurements are in `artifacts/site-audit/`.

The fresh strict technical preflight and `release:gate` passed, then `release:production-gate` stopped at the business-identity check. Live read-only HTTP checks still return 200 for www and `/nope-404`; no publication is claimed. See the current table and final handoff in `docs/site-audit-implementation-2026-09-08.md` for all remaining owner/provider inputs.

## Owner-directed publication before identity completion — September 8

The owner explicitly requested deployment first after being informed of the missing registered office address and support phone. For this release only, run the strict technical preflight, `release:gate`, production-summary validation and full `npm run update`, then publish the existing `zivo` Worker with `wrangler deploy --keep-vars`. The business-identity check stays unchanged and remains failing; missing facts remain blank. This does not claim merchant identity completion. The prior live rollback version is `53df35d3-dfbe-450c-a491-12d70da4a9dd`.

Fresh preflight exposed unpinned actions in the new business-identity workflow and dependency advisories for js-yaml/sharp. Applied repository-standard action pins, js-yaml >=4.3.2 and sharp >=0.35.4 (including the transitive sharp via override). npm install reports zero vulnerabilities. Deployment and live verification results follow when complete.

## Production deployment completed — September 8, 2026

Owner explicitly requested deployment before supplying the remaining registered office/phone. Final Cloudflare Worker `zivo` version **abfb40f3-cf07-474c-a2ca-a5bf8f73d447**, created 2026-09-08T22:23:48Z, confirmed at **100%**. Used `wrangler deploy --keep-vars`; existing bindings preserved. No commit/push, database migration or scheduled monitoring activation. Earlier deployment-blocked notes are superseded for this owner-authorized release only; the business identity check remains unchanged and incomplete.

Validation: fresh `npm run update` passed, strict technical preflight/release:gate passed, current production summary passed, zero dependency vulnerabilities. Patched workflow action pins, js-yaml/sharp dependencies. Live QA exposed a second-pass SEO rewrite bug caused by tag text inside a comment; fixed by removing comments only in the HTML head, preserving React body markers. Twelve SEO tests and EN/KM browser replay of the real edge rewrite passed. Final live public browser suite **12/12 passed** (49.9 seconds), including EN/KM desktop/mobile, canonical, font loading, hydration, cookie controls, hotel navigation, installed-shell styles and no-JavaScript navigation. Live startup measured EN 29 requests / 361194–361439 bytes; KM 31 requests / 425322–448953 bytes.

Live www path/query redirect is HTTP301 to apex; unknown `/nope-404` is HTTP404. Login account picker opens email form, no placeholder requests observed; main Supabase auth settings returns HTTP200. Cambodia operating address is visible on Contact. Actual credential sign-in remains unverified because dedicated QA credentials are absent. Registered address/phone and monitoring inputs remain follow-ups.

Evidence: `/tmp/zivo-final-hydration-update.log`, `/tmp/zivo-deploy-owner-first-check.log`, `/tmp/zivo-edge-comment-test.log`, `/tmp/zivo-final-hydration-deploy.log`, `/tmp/zivo-deployment-final-confirmed.log`, `/tmp/zivo-live-public-verified.log`. Prior pre-session rollback version: `53df35d3-dfbe-450c-a491-12d70da4a9dd`.

## Post-deploy repair release — 8 September 2026

Published Worker `zivo` version `6207f0b7-9f85-48af-a125-0977d176ebd2` at 100% after the full update gate, strict technical preflight, release gate and six tighter Lighthouse runs passed. Live public browser checks passed 12/12. Includes story/read-contract migration, Eats relationship repair, account-hub login correction and recovery UI; identity diagnostics remain off. Rollback: `abfb40f3-cf07-474c-a2ca-a5bf8f73d447`. The existing deploy-first registered-address/support-phone deferral remains explicit; normal checks were not changed. See [repair evidence](docs/postdeploy-api-verification-2026-09-08.md) for backend privacy tests, exact performance results and the draft-only CI publication boundary.

## Verification 2 production release — 9 September 2026

Published Worker `zivo` version **4974a1f3-174b-4612-93f7-1f296f21a244** at **100%**, created 01:35:30 UTC. Rollback: `6207f0b7-9f85-48af-a125-0977d176ebd2`. Full `npm run update`, strict technical preflight, release gate and a fresh production summary passed before publication. A network upload failure recovered on a fresh `wrangler deploy --keep-vars` attempt; application code and technical gates were unchanged.

This release adds capped shared Realtime retries and an EN/KM status notice, owner-filtered business search/pagination, deferred Stripe initialization and the EN/KM Toul Kork careers form. The `media-operations` Edge Function and migrations `20260909005356`, `20260909005359`, `20260909005602` are applied in the main project. The signed five-minute health monitor is **active**, with healthy scheduled round-trips and existing Telegram bot/chat readiness confirmed. This supersedes the earlier missing-monitoring-input notes for this specific monitor and hiring queue; other draft CI workflows keep their existing status. The monitor alerts on failure/recovery and drains pending hiring notifications. No applicant contact details are sent in Telegram notifications.

Live public checks **12/12 passed**, careers checks **4/4 passed**, and backend/browser Realtime round-trips passed. Homepage startup remains 29 EN / 31 KM requests and below 450,000 bytes in both desktop/mobile checks. www301 and unknown404 are preserved. Careers form recovery used intercepted responses; no production applicant or synthetic team alert was created. The earlier owner-directed registered-address/support-phone deferral remains explicit and normal identity checks remain unchanged. See [Verification 2 evidence](docs/qa/verification-2-2026-09-09.md) for the business provenance findings, database privacy tests, exact measurements and rollback procedure.

## Check 3 production release — 9 September 2026

Final Worker **`5b179937-bfd4-4a57-a9e0-76dc54875809`**, deployed **03:57:22 UTC**, is confirmed at **100%**. Rollback: `d07fe26c-7d6e-443e-858e-691b67c2d0f9` (the first Check 3 release, before the final homepage-size correction). Full `npm run update`, strict technical preflight, release checks and fresh production-summary validation passed; existing registered-address/support-phone deferral remains explicit. Upload connection failures recovered using the existing Node 22 runtime and `wrangler deploy --keep-vars`; the production bundle was built with Node 24. No repository dependency/CLI patch, commit or push was made.

Includes bounded Realtime retry timers that survive route changes, static-route socket suppression, EN/KM wallet read recovery and route boundary, per-user/session card caching, separate backend card-read/write limits, minimal card responses, friendly Worker HTML throttling responses, build-asset quota separation and consent timing that preserves the initiating click. `manage-payment-methods` **459** and `media-operations` **2** are ACTIVE on Main. No new schema migration was required.

Final live checks: public **12/12**, wallet **4/4**, real backend/browser protocol-2.0.0 broadcast round-trips passed. Public startup: EN **29 requests / about 338 KB**, KM **31 / 426–428 KB**, below the unchanged limits. Removed the full application translation catalog from the public startup path while preserving EN/KM content and language synchronization. The five-minute monitor is active and healthy; the final 04:00 UTC scheduled round-trip passed. www301, unknown404 and Jobs200 verified.

Equivalent non-upgrade HTTPS probes return 500/1101 on **both Main and Driver** when keyed, and 401 on both without a key. This differs from the successful actual WebSocket tests. Supabase Support **SU-467601** is acknowledged and updated with that comparison; provider diagnosis remains pending. No tenant restart/reprovisioning or real wallet mutation was performed. See [Check 3 release evidence](docs/qa/check-3-2026-09-09.md) for test scope, network retries, exact metrics and remaining provider follow-up.
