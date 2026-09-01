# ZIVO Release Readiness Audit — 2026-08-30

## Release decision

**HOLD production deployment and iOS/Android store upload.**

The current application source is locally verified, and the exact final web
payload is synchronized into both native project trees. Production is not ready
because required deployment and push credentials are absent, owner-supplied
business identity is incomplete, reviewed backend protections are not all live,
several public bearer-link privacy boundaries still need a product-compatible
redesign, and there is no signed package containing the final payload.

The previously exported IPA, AAB, and APK are conclusively stale and must not be
uploaded.

This pass did not deploy the website or Worker, apply or repair a production
migration, deploy an Edge Function, change a secret, create an order, charge a
payment method, move money, modify customer data, submit a store build, commit,
or push.

## Verified current source

The one coordinated Node 24.19.0 `npm run update` completed successfully on the
frozen application snapshot:

- Application TypeScript: passed.
- Cloudflare Worker TypeScript: passed.
- Ride source contracts: **52/52**.
- Production-boundary contracts: **6/6**.
- Supabase schema contracts: **6/6**.
- Linked-device contracts: **4/4**.
- Native splash contracts: **4/4**.
- Production-boundary QA: **165/165**, zero failures.
- Production/PWA build: **7,801 modules**, **18** precache entries,
  **2544.50 KiB**.

The complete unit suite also passed:

- **472** test files passed and **1** skipped.
- **3,184** tests passed, **17** skipped, and **0** failed.
- **3,201** total tests.

The post-gate security scan passed:

- **77** immutable GitHub Action references across **20** workflows.
- Strict CORS/method/security-wrapper checks across **465** Edge Function files.
- postMessage, committed-secret, Supabase token-fragment, and CSP checks passed.
- `npm audit`: **0 vulnerabilities**.

One legacy API-operations QA check initially failed three brittle source-text
assertions. The runtime boundaries were already present: two `withSecurity`
calls had simply been formatted across multiple lines, and the marketing cron
had intentionally moved from direct `x-cron-secret` handling to the shared
signed-HMAC/nonce boundary. The QA contract now recognizes multiline wrappers
and verifies `isAuthorizedInternalCron`, `INTERNAL_CRON_SECRET`, the signed
headers, and nonce claim. Its focused result is now **5/5 contracts, zero
failures**. The obsolete direct-secret behavior was not reintroduced.

Documentation, the task board, generated native payloads, and that focused QA
contract changed after the coordinated gate; none is shipped application
runtime code. No duplicate full gate was started.

## Final rendered mobile smoke

The already-built production preview was checked at **390×844** without signing
in or mutating backend data:

- `/` rendered the mobile ZIVO Home service grid, including the Ride tile and
  bottom navigation.
- Tapping the Home Ride tile stayed inside ZIVO and reached the protected route,
  landing at `/login?redirect=%2Frides%2Fhub` for a signed-out customer.
- The guarded screen showed a visible **Back** control; selecting it returned to
  `/` and the Ride tile was visible again.
- The standalone `/login` surface completed its loading state and rendered
  email, Google, Apple, sign-up, and back-to-ZIVO actions.
- Browser console warnings/errors across these checks: **0**.

This is public login-guard and return-navigation evidence. It is not an
authenticated Ride/map, location-permission, dispatch, payment, or real-device
test; those remain required before store release.

## Security and authority fixes completed in source

### Login boundary and truthful administration

- The browser no longer calls the public login-precheck or attempt-recording
  helpers and no longer receives an `email_exists` signal.
- Invalid credentials use the same customer-facing response.
- Migration
  `20260831000449_harden_auth_login_attempt_boundary.sql` revokes the exact
  helper signatures from `PUBLIC`, `anon`, and `authenticated`, retaining
  only trusted service-role access.
- The Admin Auth Shield screen no longer presents force-quarantine or
  clear-lockout controls as live enforcement. Legacy observations are labeled
  historical/stale, and the page states that custom enforcement is unavailable.
- Supabase Auth provider throttling remains active. Custom Auth Shield quarantine
  must not be described as active until a trusted server hook exists.
- Focused auth/admin contracts: **14/14**; auth QA: **6/6**; anti-abuse QA:
  **6/6**; Playwright source contracts: **8/8**.

### Car-rental payment authority

- `create-car-rental-deposit` and `capture-car-rental-balance` now stop with
  HTTP `503` and code `car_rental_payment_authority_unavailable` before
  parsing customer input, opening service-role access, or calling Stripe.
- Rental browsing, historical reads, and reservation requests remain available.
- Online rental payment stays disabled until price calculation and
  reservation/store ownership are server-authoritative.
- Focused contracts: **3/3**; adjacent payment/security contracts: **60/60**;
  payment/security QA: **5/5 + 6/6**.
- Production remains exposed until both exact Edge Functions are deployed and
  probed.

### Backend helper caller identity

- Migration `20260831000607_harden_backend_helper_caller_identity.sql` moves
  the lodging diagnostic implementation private and limits its wrapper to
  service/admin/super-admin callers.
- Referral creation and interest tracking are bound to `auth.uid()` unless the
  caller is the service role.
- `cafe_prep_forecast` rejects a null identity while preserving store-owner
  and service operation.
- Inherited `PUBLIC` and anonymous execution is revoked from the hardened
  helpers.
- Focused contracts: **6/6**; database source blockers: **0**; API critical
  findings: **0**.

### Cafe customer privacy and loyalty ownership

- Migration
  `20260831002349_harden_cafe_customer_lookup_and_loyalty_ownership.sql`
  binds summary, last-order, and loyalty-balance reads to `auth.uid()` instead
  of browser-supplied phone text.
- Anonymous and inherited `PUBLIC` execution is removed; the service role
  retains a trusted phone-recovery path.
- Guests can still place an order, but cannot redeem another person's
  phone-linked loyalty balance.
- Read-only production inspection found **2** cafe orders, **1** signed-in
  order, **1** phone-only loyalty balance, and **0** redemptions. That legacy
  phone-only balance needs verified account linking before redemption.
- Focused/adjacent contracts: **17/17**; database/storage contracts: **5/5**.

### Other frozen release hardening

The verified worktree also contains the previously reviewed private-PWA cache,
push authorization, native notification routing, marketing-consent, account
isolation, payout/payment fail-closed, Eats authority, Wallet cash-out tombstone,
native privacy, safe-area, deep-link/return-navigation, and release-workflow
guards covered by the green unit and release suites. Those source changes are
not evidence that their matching production functions, flags, secrets, or
migrations are live.

## Native payload and signed-package status

The final green `dist` was copied without rebuilding into:

- `ios/App/App/public`
- `android/app/src/main/assets/public`

Exact hash parity now passes:

- Web `dist`: **2,572 files**.
- iOS native web root: **2,572 files**, exact match.
- Android native web root: **2,572 files**, exact match.
- `dist/index.html`, iOS `index.html`, and Android `index.html` SHA-256:
  `8d4594f840003ec8f62e62a676ee8530bda03718b05f94910e8252dfe9eb357a`.

A macOS `.DS_Store` was found in `public` and the three generated payloads.
All four copies were moved, not deleted, to the recoverable directory
`/tmp/zivo-release-metadata-hold.VSxA5b`. Exact iOS/Android parity was
rechecked after removal.

The local store-signing preflight passes all **22** capability checks for
`com.hizovo.app`, including the Android signing material/Firebase package,
Apple Distribution identity, main App Store profile, Notification Service
Extension profile, and export configuration. This proves signing capability,
not candidate freshness or store acceptance.

### Stale packages — do not upload

These files were signed before the final login/Auth Shield source and contain an
older embedded `index.html` hash
`314b79fde78c9ad5c2d89418e86261ba811bb374c84aee8bbd5afa8c1cbabefe`.
Their freshness/installability validators correctly fail against the current
payload:

| Package                                                                       | Existing SHA-256                                                   | Status                    |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------- |
| `ios/build/export/zivosmedia/App.ipa`                                         | `bfc92a9a94e7abc309ba4a286c81406f5709715f9779b91bac0a2ec3455e9909` | **STALE — DO NOT UPLOAD** |
| `android/app/build/outputs/bundle/release/app-release.aab`                    | `5e7fe0b1043d1ebd612c35ec5960dd5532420d3efa05bccbe1361029eb618d85` | **STALE — DO NOT UPLOAD** |
| `android/app/build/outputs/apk_from_bundle/release/app-release-universal.apk` | `3474fe69a81518156a137614c602efe4c8289f0518a85b58406f52054f28f950` | **STALE — DO NOT UPLOAD** |

Version metadata remains `1.3.0`, Android code `2026083001`, and iOS build
`5`. A fresh IPA/AAB/APK must be built and signed only after production
configuration is frozen. New hashes must then replace the stale fingerprints.

Additional local native evidence:

- Android optimization/R8 check: passed.
- Android Restore Credentials foundation check: passed, but the feature remains
  disabled pending relying-party configuration and real transfer/restore QA.
- Live public privacy and account-deletion policy pages: HTTP 200 checks passed.
- Android installability/freshness check: intentionally failed because the old
  AAB/APK payload does not match current `dist`.
- Native doctor reached Xcode's read-only build-settings probe but exceeded its
  30-second diagnostic window; its owned process exited and no duplicate was
  started.

A prior local simulator run on 2026-08-26 recorded approximately **13.97
seconds** to cold-root first content, with a white screen until Home. That
historical measurement was not rerun against this snapshot and may be stale; a
fresh signed candidate must be cold-launched and timed on physical devices
before release rather than treating the source gate as a startup-performance
pass.

The data volume fluctuated between about **2.2 and 5.2 GiB available** during
the checks and remains near capacity. No cache or user-file cleanup was
performed. Create safe disk headroom before a new Xcode archive plus Android
release build.

## Strict production preflight

The strict preflight was rerun with build/type-check skipped because the single
coordinated gate had already passed:

- **8/10** preflight steps passed.
- Supabase deploy environment: failed.
- Supabase runtime-settings SQL: failed.
- `readyForCurrentGate`: false.
- `readyForProductionGate`: false.
- Database blockers/warnings: **0/0**.
- API critical findings/warnings: **0/1**.
- Edge deploy-contract failures: **0**.
- Edge browser-gate failures: **0**.
- Generated readiness artifacts: **11/11** present.

The environment checker reports **6 critical findings**:

1. `SUPABASE_URL` missing.
2. `SUPABASE_ANON_KEY` missing.
3. `SUPABASE_ACCESS_TOKEN` missing.
4. Driver-domain Supabase publishable key missing.
5. Travel-domain Supabase publishable key missing.
6. Software-domain Supabase publishable key missing.

The API warning is a stale MCP migration-history snapshot: that report recorded
**1,166** local migrations while the current tree contains **1,169**. The
read-only drift reader saw **1,622** remote versions. Refresh the live report
immediately before any approved schema rollout.

Database and API source checks remain green:

- Strict database upgrade readiness: exit 0, **0 blockers**, **0 warnings**,
  **1,169** local migrations, six allowlisted duplicate versions, no new
  duplicates, and zero pending table/RLS/grant/search-path/URL/JWT gates.
- Strict API readiness: exit 0, **465/465** functions with the shared security
  wrapper and strict CORS/method boundaries; **177** high-risk functions;
  **0 critical** and **1 stale-report warning**.
- Database/storage contracts: **5/5**.
- API operations contracts after focused reconciliation: **5/5**.

## Live backend blockers

Source readiness must not be confused with production protection.

- The latest read-only production migration snapshot has **1,622** history rows;
  latest observed remote version:
  `20260830180554 cutover_internal_cron_hmac_jobs`.
- Reviewed Eats authority migrations newer than the observed remote range and
  the three new login/helper/cafe migrations in this audit are not confirmed
  live.
- Production has **526** active historical Edge Functions, while **465**
  source/shared Edge files were scanned and **145** functions are declared in
  the repository configuration. This inventory drift requires a deliberate
  allowlist/decommission review.
- `create-eats-order`, `eats-payout-admin`, and
  `payout-method-verification` are absent from the observed production
  inventory.
- Three browser-gated live-critical functions are also absent:
  `analytics-event-track`, `talent-invite-notification`, and
  `admin-broadcast-notification`.
- The five legacy Wallet cash-out functions are still active with older
  money-moving implementations:
  `process-withdrawal`, `connect-instant-payout`, `paypal-payout`,
  `wallet-instant-payout`, and `stripe-instant-payout`. Deploy and probe the
  reviewed tombstones before release.
- The two car-rental payment functions do not become safe in production until
  the exact 503 tombstone source is deployed and checked.
- The prior live advisor snapshot contains **314** SECURITY DEFINER execution
  warnings (**105** anonymous, **209** authenticated). These require
  signature-by-signature allowlisting and ownership review; the number alone
  does not prove every function vulnerable or safe.
- The prior performance snapshot contains **4,023** notices, mainly unused
  indexes and overlapping permissive policies. Handle these through measured
  query/policy work, never blind index or policy deletion.

### Remaining public bearer-link privacy redesigns

These release blockers were intentionally not blanket-revoked because current
customer flows need an expiring signed token, OTP, or authenticated-ownership
replacement:

- Salon booking detail PII, cancellation, and review by booking UUID.
- Car-rental customer/financial detail and payment status by code or UUID.
- Cafe receipt, payment reference, status, reorder, and review operations by
  order UUID.
- Dealership VIN/customer review bootstrap by sale UUID.

## Configuration, operations, and store blockers

1. **GitHub and deployment secrets.** The repository currently exposes only
   `SUPABASE_ANON_KEY` in repository secrets, with no secrets in the checked
   production/preview/copilot environments. Workflows additionally require the
   reviewed Supabase, Cloudflare, Stripe publishable, Ride URL, VAPID, Android,
   iOS, and store-upload inputs as applicable. Never place secret/service keys
   in `VITE_*` variables.
2. **Push credentials.** The production push preflight reports **12 blockers**:
   no production push environment file; incomplete FCM project/client/private
   key; missing APNs key/team/private key/bundle/environment; and missing VAPID
   public/private/subject. No secret values were printed.
3. **Published business identity.** The registered address, Cambodia operations
   address, and reachable support phone are incomplete. These are owner-provided
   facts and must not be invented.
4. **Operations readiness.** Keep Eats ordering, new payout paths, Wallet
   cash-out, and car-rental online payment off until their server authority,
   functions, migrations, credentials, inventory/capacity, and safe production
   probes are complete. Two active restaurants were previously reported without
   coordinates and need real operational data.
5. **Store/device acceptance.** There is no current signed candidate, App Store
   upload authentication was unavailable, and no exact-candidate TestFlight or
   Play internal-track run has been completed on physical devices.
6. **Software identity architecture.** The locked architecture says account
   authentication stays on the main Supabase project, while current
   `useDedicatedSoftwareAuth` routing appears to authenticate the Software
   domain against its dedicated project. This remains an explicit owner
   decision; do not silently change it during release.

## Dependency assessment

`npm outdated` previously reported **26** packages with newer releases, while
`npm audit` currently reports **0** vulnerabilities. No dependency upgrade is
required to remediate a known npm vulnerability in this release candidate.

- Apply compatible patch/minor updates in a separate post-release slice with the
  full web/native gate.
- Treat Electron `43 → 44` and TypeScript `6 → 7` as independent major
  compatibility projects.
- Do not mix broad upgrades into the security/backend deployment or mobile
  re-signing window.

## Required release order

1. Owner supplies the real business addresses/support phone and all missing
   production, push, signing, and store credentials through approved secret
   stores.
2. Owner resolves or explicitly accepts the Software-domain auth architecture
   deviation.
3. Refresh production migration history, Edge inventory, RPC ACLs, and advisors;
   back up before approved schema work.
4. Review and apply the login/helper/cafe and Eats migrations in a controlled
   order. Deploy matching Edge Functions while affected customer and
   money-moving features remain off.
5. Verify the five Wallet functions and both car-rental payment functions return
   their exact reviewed `503` codes. Run non-money-moving anonymous,
   cross-account, owner/admin, and service-role probes for every new boundary.
6. Replace UUID-only PII/value operations with expiring signed tokens, OTP, or
   authenticated ownership, then test expiry, replay, cross-account access, and
   recovery.
7. Rerun strict preflight, live inventory/advisors, business-identity and push
   checks, then one quiet-window Node 24.19.0 release gate.
8. Create safe disk headroom. Copy the final `dist`, build/sign fresh IPA and
   AAB/APK packages, record new hashes, and rerun exact embedded-payload checks.
9. Test those exact hashes through TestFlight and Play internal testing on
   physical iOS/Android devices, including login/MFA, Ride in-app return,
   maps/location permission, push open/deep links, camera/photos, restore/sign
   out, offline/update behavior, payments-disabled states, and account deletion.
10. Complete store metadata/privacy declarations, upload only the exact tested
    hashes, and roll out gradually with logs, payment/webhook, crash, and
    rollback owners present.

## Bottom line

The frontend, Worker, source backend boundaries, unit suite, security scan, and
native project payloads are locally in strong shape. The responsible next step
is **not** an upload: it is a controlled production-backend and credentials
closure, followed by fresh signing and real-device/store-track verification.
