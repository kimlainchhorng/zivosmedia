# Verification 2 implementation and production evidence

## Realtime diagnosis

On 9 September 2026 the main endpoint and Driver control endpoint both returned HTTP401 without a key. Main project status was ACTIVE_HEALTHY; Management API Realtime health reported database and replication connected. A fresh public-key WebSocket subscription, random-channel broadcast round-trip and presence synchronization all passed. Thus the reported HTTP500/1101 outage was not reproducible at repair time; no tenant shutdown, restart, key rotation or reprovisioning was performed. Management configuration reports `suspend:false` and `presence_enabled:false`, but the actual presence synchronization succeeds. Do not infer broken presence from that flag alone or claim we changed it.

A 24-hour aggregate of Realtime logs included 12 replication disconnect warnings, plus tenant reconnect/publication lifecycle messages. There was no error-level event in the returned aggregates. These do not identify the earlier edge 1101's root cause. No raw customer messages, JWTs or IPs were collected.

The `supabase_realtime` publication existed. Existing chat, notification and food-order subscriptions were included. Added only reviewed core social tables: user_posts, stories, story_views, friendships. The post SELECT policy previously ignored visibility; a restrictive policy now protects drafts, hidden posts, friends-only content and excluded viewers before publishing updates. Existing public post data is preserved. No rows or account identities were changed. The repository also contains subscriptions for other verticals/projects; this repair does not indiscriminately publish those tables.

Client: one circuit per shared Supabase client, surviving route changes; exponential delay 1/2/4/8/16 seconds capped at 30 seconds; five failed attempts stop automatic connection attempts. Explicit Retry resets the circuit after the previous connection stops. A single EN/KM notice tells visitors that live updates are unavailable. The heartbeat option moved from an ineffective URL parameter to the SDK's top-level option. The adapter access is isolated and covered against the installed SDK; SDK upgrades must keep this test passing.

## Active monitoring and hiring backend

Deployed `media-operations` to slirphzzwcogdbkeicff. The existing bot token and team-chat credentials remain only in Supabase secrets. Signed readiness returned HTTP200 with `ready:true`, `roundTrip:true`, `telegramReady:true`; it used getMe/getChat, not a test message. Activated `media-realtime-health-5min` (`*/5 * * * *`) only after readiness passed. Manual execution and the scheduled 01:00 UTC run saved a healthy WebSocket result. Normal healthy checks do not send messages; failures alert the configured Telegram chat, repeat at most hourly, and send a recovery notice after an alert. A database lease prevents concurrent ticks. Cron uses the existing HMAC envelope and nonce replay protection; the private enqueue function can target only media-operations. No service secret is placed in pg_net's queue.

The same tick drains the private hiring notification queue, at most five per run. Telegram receives an application reference and a secure dashboard destination, not applicant contact details or experience text. Failed notifications stay pending. Delivery is at least once: an ambiguous network/send acknowledgement can produce a duplicate reference notification. No test application was submitted into production and no fabricated hiring alert was sent.

Public intake validates lengths, consent, working-time choices and contact syntax. Persistent rate limiting caps five submissions per IP hash per hour. Random application references make retries idempotent; a conflicting payload is rejected. Public/client roles cannot insert directly or read other applicants; authorized admins can review applications in Supabase. The frontend only confirms a saved reference returned by the server, prevents double submits, and retains drafts/reference after uncertain failures.

## Business list audit

The named account owns 267 store_profiles: 248 hotels, 18 resorts, one grocery placeholder. 266 are active/setup-complete. 265 were created on May 16 within 6m45s; 115 descriptions contain external booking/directory source links and none contain demo/seed/test markers. This supports a bulk-import interpretation, but source licensing, merchant authorization and the original import event are not established by those counts. The matching sidebar examples are THE RIVERFRONT CENTRAL Hotel (September 1) and Sela Home - Private Rental (May 16), both assigned to the named owner.

RLS is enabled. Active profiles are intentionally public directory data. Ownership is enforced for management, with existing admin/support roles; inactive unrelated profiles are not visible to an unrelated identity. Therefore it would be incorrect to claim that nobody else can see any of these public listings. The sidebar now uses explicit owner filtering, stable six-row server pagination and literal search, with separate loading/empty/error/retry states and account-keyed queries. No imported records were deleted, marked demo, reassigned or deactivated. A cleanup migration would require verified provenance and an explicit record selection; the current evidence does not justify one.

## Payment warning and careers

Changed Stripe to its pure loader and removed initialization at module load / closed coin-sheet mount. Stripe initializes when a payment UI is actually rendered. Payment permissions were not broadened across origins.

The careers page uses the supplied Toul Kork, Phnom Penh location, full-time $250/month and part-time availability in EN/KM. It links https://t.me/Zivo_Media and includes the private application form. Specific role titles and part-time hours/pay were not supplied, so the page truthfully labels opportunities and directs applicants to the hiring team for those details. Previous unconfirmed remote-work/equity/perk claims were removed from this page.

## Validation and rollback

Eight focused frontend tests passed, including installed-SDK reconnect limiting, retained hiring drafts/idempotent retries, localized hiring facts, bounded owner queries and held responses across account changes. Six Deno tests passed (validation, 500 rejection, actual protocol acknowledgement and HMAC/replay boundaries). Isolated PGlite PostgreSQL fixtures passed for visibility, private applications, denied direct writes and the monitor lease. Live unrelated-identity reads returned zero inactive businesses, hiring applications, drafts/hidden posts and private posts; no positive private production fixtures exist, so the isolated tests provide that positive coverage. Deno type-check passed.

Supabase advisors report no new warning/error for these objects. The service-only media_operations_state table has an informational RLS-enabled/no-policy notice intentionally: browser roles have no privileges and service_role is the only reader/writer. Do not add public access to silence that notice.

Migration versions: 20260909005356 media_operations_hiring_and_monitor; 20260909005359 media_social_realtime_visibility; 20260909005602 activate_media_operations_monitor. Preserve applied versions. Roll back frontend to Worker 6207f0b7-9f85-48af-a125-0977d176ebd2 if needed; keep the visibility protections and stored applications. To stop notifications/checks, set only this cron job inactive; do not rotate shared tokens or stop other jobs. Dropping application tables is not a rollback strategy.

References: [Realtime settings](https://supabase.com/docs/guides/realtime/settings), [Management config API](https://supabase.com/docs/reference/api/v1-get-realtime-config), [service health API](https://supabase.com/docs/reference/api/v1-get-services-health), [RLS information notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Final release validation: `npm run update` passed on the final source. The public production-build suite passed 12/12. Careers browser tests passed EN/KM at 1366×900 and 390×844, with no horizontal overflow, no Stripe network requests, no payment-permission warnings, and retained/idempotent form recovery. These form responses were intercepted fixtures; no application rows or team messages were created for the UI tests. Screenshots are under artifacts/verification-2. `scripts/qa/realtime-roundtrip.mjs` passed both the backend protocol and a WebSocket round-trip from a browser page on zivosmedia.com. The initial careers probe waited for networkidle and timed out on background activity; it now waits for the rendered heading, which is the behavior under test.

Strict technical preflight, release:gate and the fresh production summary passed. npm's advisory service interrupted one check with a socket hang-up; a retry passed. The normal business-identity check remains unchanged and still identifies the registered address/support phone deferred under the owner's earlier deploy-first instruction.

## Website deployment and final live verification

Published Cloudflare Worker `zivo` version **4974a1f3-174b-4612-93f7-1f296f21a244**, created **2026-09-09T01:35:30.016Z**, and confirmed it serves **100%** of traffic. The deployment uses `wrangler deploy --keep-vars`, preserving existing bindings. The first upload exhausted retries with network write errors; a fresh attempt with IPv4-first DNS completed all 1,610 changed assets and the Worker deployment. No application code or release checks were bypassed to recover the transfer. The previously verified Worker remains the rollback target specified above.

Final live results against https://zivosmedia.com:

- Public Playwright suite: **12/12 passed**, 44.8 seconds, EN/KM at 1366×900 and 390×844. English startup: 29 requests, 361,774–362,174 transferred bytes. Khmer startup: 31 requests, 449,648–449,726 transferred bytes. All remain below the 45-request / 450,000-byte limits. These are startup resource measurements, not new Lighthouse LCP or field Core Web Vitals measurements.
- Careers: **4/4 passed**, both languages and widths, no horizontal overflow, zero Stripe requests, zero payment-permission warnings and zero page errors. Failed-submit/retry tests retained the draft and request reference. Responses were intercepted fixtures; these tests did not create production applications or send team notifications. Screenshots under `artifacts/verification-2` now show the live page.
- Realtime: unauthenticated endpoint **401**, actual backend protocol round-trip **passed**, browser WebSocket round-trip from the production origin **passed**. Random ephemeral channels carried only the probe nonce.
- HTTP: homepage and `/jobs` **200**; `/nope-404` **404**; `www` **301** to apex preserving `/jobs?lang=km`.
- The five-minute monitor remains active. The most recent read showed scheduled runs at 01:30 and 01:35 UTC succeeded; the stored 01:35:01.770Z check was healthy with endpoint 401 and successful round-trip. Telegram bot/chat readiness passed earlier; no synthetic failure alert or applicant notification was sent as a probe.

Evidence logs: `/tmp/zivo-verification2-web-deploy-retry.log`, `/tmp/zivo-verification2-deployment-confirmed.log`, `/tmp/zivo-verification2-live-public.log`, `/tmp/zivo-verification2-careers-live.log`, `/tmp/zivo-verification2-realtime-live.log`. The working tree remains uncommitted, preserving concurrent work. Dedicated credential sign-in and a real applicant notification delivery were not exercised in this release verification.
