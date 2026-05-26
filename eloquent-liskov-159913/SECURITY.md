# ZIVO Security Policy

## Dependency Management

- **Monthly review**: All npm and Deno dependencies are reviewed monthly for security patches.
- **Edge function pinning**: All edge functions import from `supabase/functions/_shared/deps.ts` with pinned versions.
- **Stripe API version**: Standardized to `2025-08-27.basil` across all functions.
- **Supabase JS version**: Pinned to `@2.57.2` for edge functions.

## Security Architecture

- **Authentication**: Supabase Auth with Google OAuth, email OTP, password sign-in, and **TOTP MFA** (post-login challenge enforced via `MfaChallengeDialog` for users with a verified factor).
- **Authorization**: Role-based access via `user_roles` table and `has_role()` RPC (never client-side checks).
- **CORS**: Sensitive endpoints use origin allowlist via `_shared/cors.ts` (`strictCorsHeaders`); legacy public/webhook endpoints retain wildcard headers.
- **Rate limiting**: Two-tier server-side limiter in `_shared/rateLimiter.ts`:
  - In-memory sliding window per Deno isolate (synchronous fast path)
  - Cross-isolate authoritative limiter via `public.rate_limit_check` RPC (DB-backed, transactional)
- **Brute-force protection**: Tiered IP and account lockouts via `_shared/bruteForce.ts` and `public.auth_lockout_state` table.
- **WAF**: `_shared/waf.ts` blocks SQLi, XSS, path traversal, SSTI, command injection, LDAP injection, XXE, NoSQL injection, prototype pollution, and double-encoded bypass attempts. Known scanner User-Agents (sqlmap, nikto, nuclei, Burp, etc.) are blocked at `withSecurity`.
- **File upload security**: `_shared/fileUpload.ts` enforces MIME allowlist, magic-byte validation, dangerous extension blocklist, per-category size limits, and embedded-script detection.
- **Fraud detection**: Multi-tier system with GPS spoofing detection, velocity checks, and delivery PIN.

## HTTP Security Headers (2026-04 hardening)

Configured in `public/_headers`. Applied to every response:

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Content-Security-Policy` (**enforced**, no longer report-only) — strict allowlist for Supabase, Stripe, Google Maps, Duffel, Twilio, Meta Pixel, GA. Violations reported to `/functions/v1/csp-report` (logged in `csp_violations`).
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-Permitted-Cross-Domain-Policies: none`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — restricts camera/mic/geo/payment to `self`; blocks USB, Bluetooth, MIDI, Serial, FLoC, display-capture, document-domain.
- `Cross-Origin-Opener-Policy: same-origin-allow-popups` (Google OAuth)
- `Cross-Origin-Resource-Policy: same-site`
- `X-Robots-Tag: noindex` on `/admin/*`, `/account/*`, `/wallet/*`, `/chat/*`.

Edge-function responses additionally receive `Cache-Control: no-store`, `X-Frame-Options: DENY`, and the headers above via `withSecurity`.

## Data Protection (2026-04 hardening)

- **Profile PII**: `email`, `phone`, `phone_e164`, `date_of_birth`, `kyc_*`, `background_check_*`, `admin_role`, `payout_hold`, `phone_hash`, `share_code`, etc. are no longer SELECTable by `authenticated` or `anon` roles. Owners read their own profile via `public.get_my_profile()` (SECURITY DEFINER); admins via `public.admin_get_profile(uuid)`.
- **Shared CVs**: removed permissive RLS policy. CVs are now fetched only via `public.get_cv_by_share_code(text)` which requires the exact share code.
- **Audit log**: `public.security_audit_log` (admin-readable, service-role-writable) records logins, password changes, two-step toggles, payout changes, role changes, and account deletions.

## User-content link safety (2026-04-30)

Two-layer defense against phishing/scam links posted in user-generated content (post captions, comments, bios, reviews, support tickets, refund disputes, lost-item reports, community descriptions, ride feedback):

- **Client-side write gate** (`src/lib/security/contentLinkValidation.ts`):
  `confirmContentSafe(text, label)` runs `assessLinkSync` (`src/hooks/useLinkRisk.ts` + `src/lib/urlSafety.ts`) on every URL extracted from the input. Hard-blocks: ZIVO typosquats (Levenshtein ≤ 2 from `hizivo.com` / `myzivo.lovable.app`), embedded credentials, dangerous protocols, impersonation. Surfaces as suspicious: 23 URL shorteners, suspicious TLDs (`.zip`, `.tk`, etc.), punycode/IDN, raw IPs, oversized URLs.
- **Client-side render gate** (`src/components/social/SafeCaption.tsx`): all user-content surfaces (20 sites including FeedPage, ReelsFeedPage, Profile, PublicProfile, Dating, ChatContact, Communities, Stores, Hotels, Reviews, etc.) tokenize URLs through SafeCaption, rendering blocked links struck through and non-clickable, suspicious links with a Caution badge + interstitial.
- **Server-side mirror** (`supabase/functions/_shared/contentLinkValidation.ts`): port of the client validator for use in edge functions. Wire into any function that accepts user free-text — returns `422` with `{ blocked: string[] }` on hard fail. Closes the "malicious client bypasses JS gate" attack. **Currently wired in 11 endpoints**: `submit-refund-request`, `channel-broadcast`, `admin-update-profile`, `cancel-lodging-reservation`, `request-lodging-change`, `admin-post-comment`, `admin-moderate-message`, `post-to-facebook-page`, `create-tip-checkout`, `create-tip-payment-intent`, `process-refund`.
- **Blocked-attempt logging** (`public.blocked_link_attempts`): every server-side rejection is fire-and-forget logged with user_id, endpoint, blocked URLs, content preview (200 chars), and SHA-256 hash of source IP (no raw PII). Admin-readable, service-role-writable. Migration: `20260430020000_blocked_link_attempts.sql`. Helper: `logBlockedAttempt()` in `_shared/contentLinkValidation.ts`.
- **Bot user-agent detection** (`_shared/botDetection.ts`): `isLikelyMaliciousBot(headers)` flags 17 scraper UAs (curl, wget, python-requests, scrapy, headless-chrome, etc.), 15 scanner UAs (sqlmap, nikto, nuclei, ZAP, burp), and missing User-Agent. Returns **HTTP 403** before any auth/DB work.
- **Per-user abuse threshold** (`isAbuseThresholdExceeded`): user with 5+ blocked attempts in last 24h gets **HTTP 429** with `code: "abuse_threshold_exceeded"` — endpoint refuses to even read the body.
- **Per-IP abuse threshold** (`isIpAbuseThresholdExceeded`): IP with 10+ blocks in 24h gets **HTTP 429** with `code: "ip_abuse_threshold_exceeded"`. Higher threshold than per-user accounts for shared NAT/family WiFi. Catches attackers cycling through multiple accounts from one IP.
- **Admin dashboard** at `/admin/security/blocked-links`: realtime view of rejections with stat cards (total / unique users / endpoints), time window selector, endpoint filter pills, repeat-offenders panel (3+ attempts in window), per-row "open profile" + "filter by user" actions. Admin-only via `ProtectedRoute`.
- **88 unit tests** across 5 files cover URL-safety rules, content scan, lodging count aggregation, bot UA detection, and IP-helper hashing/header parsing.

Each of the 11 protected endpoints layers all 4 server-side gates in this order: `bot-UA → ip-abuse → user-abuse → content-scan`. The first check that fails returns immediately; clean requests fall through to normal processing.
- **Tests**: 47 unit tests in `src/lib/urlSafety.test.ts` + `src/lib/security/contentLinkValidation.test.ts` cover every rule. Visible demo at `/security-test`.

## Photo upload privacy (2026-04-30)

`src/utils/stripImageMetadata.ts` re-encodes uploaded images through a `<canvas>` pipeline before sending to Supabase Storage. Drops EXIF, GPS, IPTC, XMP, ICC profiles, MakerNote — anything embedded by the camera. Caps max dimension at 4096px.

Wired into 7 user-photo upload paths: feed/reel posts (`CreatePostModal`), profile content (`ProfileContentTabs`), avatar (`useUserProfile`), cover photo (`Profile`), signup avatar/cover (`Setup`), CV photos (`CreateCVPage`), channel media (`ChannelPostComposer`). Deliberately NOT applied to KYC docs / driver-onboarding docs (fraud detection needs metadata) or chat media (already private via signed URLs).

## Step-up MFA (2026-04-29)

Sensitive endpoints now require an AAL2 session (TOTP-completed). Enforcement points:

- **Server**: `requireUserMfa(req)` and `requireAal2(claims)` in `_shared/auth.ts`. On AAL1 sessions, the helper returns **HTTP 403** with body `{ error, code: "mfa_required" }`. The error wrapper translates this automatically.
- **Wired endpoints (user-initiated)**: `process-withdrawal`, `connect-instant-payout`, `lodge-payout-request`, `paypal-payout`, `account-export`, `account-delete-self`, `admin-create-user`, `admin-create-user-post`, `admin-delete-user`, `admin-delete-user-post`, `admin-update-profile`, `admin-moderate-message`, `admin-post-comment`, `admin-list-created-users`. **14 endpoints** in total. (`driver-payout` is platform-internal — invoked after a captured ride, no user session, so AAL2 does not apply.)
- **Lightweight enforcement helper**: `_shared/aalCheck.ts` exposes `enforceAal2(authHeader, corsHeaders)` for hand-rolled functions that don't go through `requireUserMfa`. Decodes the JWT inline (no DB round-trip) and returns a 403 with `code: "mfa_required"` on AAL1 sessions.
- **Client**: `useStepUpMfa()` hook returns `{ ensureAal2, dialog }`. Wrap any sensitive call site:

  ```ts
  const { ensureAal2, dialog } = useStepUpMfa();
  async function withdraw() {
    const ok = await ensureAal2("Confirm withdrawal");
    if (!ok) return;
    await invokeSensitive("process-withdrawal", { body }, ensureAal2);
  }
  ```
- **Auto-retry**: `invokeSensitive(fn, opts, ensureAal2)` in `src/lib/security/sensitiveInvoke.ts` detects `mfa_required` 403s, prompts for the code, and retries on success.

## GDPR Compliance (2026-04-29)

- **Article 15 — Right of access / portability**: `account-export` edge function returns a JSON dump of all user-owned data across 16 tables (`profiles`, `direct_messages`, `bookings`, `wallet_transactions`, etc.) plus the `auth.users` record. Requires AAL2. Rate-limited to 3 / 5 min.
- **Article 17 — Right to erasure**: `account-delete-self` edge function deletes user-owned storage objects across all chat buckets, then calls `auth.admin.deleteUser()`. Caller must POST `{ confirm: "DELETE MY ACCOUNT" }` and be at AAL2. Action is audited before deletion.

## Dependency Hygiene (verified 2026-04-29)

- **`npm audit` baseline**: 0 vulnerabilities (down from 11 — 8 high, 3 moderate).
- **Transitive override**: `package.json` now includes an `overrides` block forcing `serialize-javascript ^7.0.5`. This pins the patched version through `vite-plugin-pwa → workbox-build → @rollup/plugin-terser`, avoiding the breaking-change downgrade `npm audit fix --force` would have triggered.
- **Build verification**: `npm run build` succeeds end-to-end (vite 7.3.2, PWA service worker generation, 1296 precache entries) after every dep change.
- **Run regularly**: `npm run security:audit` (or `npm run security:scan` for audit + secret scan).

## Live SPKI Pins (computed 2026-04-29)

The mobile pins shipped in this release are real, computed against the live hosts:

| Host                                | Primary (leaf SPKI)                              | Backup (intermediate SPKI)                       |
|-------------------------------------|--------------------------------------------------|--------------------------------------------------|
| `slirphzzwcogdbkeicff.supabase.co`  | `GU2W4j1P24T3sqlI+o6YTnidzz0PI8fB/Gvd2ITfSZE=`   | `kIdp6NNEd8wsugYyyIYFsi1ylMCED3hZbSR8ZFsa/A4=`   |
| `api.stripe.com`                    | `xUUBOliw6Rgb7It2YbiSOg0ifTHlP3Lv6MXMkw//uLM=`   | `Ld64SpoeXjpLjc+/7Wahk6p5+KVyzVSUptciuWsyxeY=`   |

Refresh with `scripts/security/compute-spki-pin.sh` before each mobile release. Pins expire `2027-04-29` per the `pin-set` declaration.

## Secret-Leak Scanner

`scripts/security/check-secrets.mjs` scans the working tree for Stripe live keys, AWS keys, Google API keys, GitHub/OpenAI/Slack tokens, and private-key blocks.

- Run manually: `npm run security:check-secrets`
- Combined: `npm run security:scan` (dependency audit + secret scan)
- **CI**: `.github/workflows/security.yml` runs the audit + secret scan + production build on every PR, on push to `main`, and weekly (Mondays 09:00 UTC). The workflow blocks merge if any check fails.

## Storage Privacy (2026-04-29)

- **Chat media buckets** (`chat-media-files`, `chat_uploads`) are now **private**. RLS allows reads only by the owner (path prefix) or by message recipients (verified via `direct_messages` / `group_messages` joins). Migration: `20260429230000_security_hardening.sql`.
- **Client integration**: new uploads store the **storage path** (not a URL) on `direct_messages`, `group_messages`, `chat_media`, `call_recordings`. The `useSignedMedia` hook and `signedUrlFor` helper mint short-lived signed URLs (1 h for display, 6 h for thumbnails, 24 h for explicit downloads) and cache them in memory.
- **Voice notes** and **chat-files** continue to use signed URLs; `useChatFiles.ts` was tightened from a 1-year TTL to 1 hour.
- **Legacy backfill**: `20260429240000_backfill_storage_paths.sql` rewrites historical rows that contain full public URLs into bare storage paths, so the new client code path renders them correctly.

## Realtime Channel Hardening (2026-04-29)

Channel topic names are visible to anyone subscribed to Realtime. Naming
channels with raw user IDs (`presence-uuid-uuid`, `group-signal-<id>`) leaks
the social graph and group membership.

- **Helper**: `src/lib/security/channelName.ts` exposes
  `topicForPair(a, b)`, `topicForGroup(id)`, `topicForUser(id)` (async,
  SHA-256-based) and synchronous `topicForPairSync` / `topicForGroupSync` /
  `topicForUserSync` (FNV-1a) variants for event-handler call sites.
- **Wired**: `useChatPresence.ts` (1:1 presence channels) and `useGroupCall.ts`
  (group-call signalling) now derive topic names from a salted hash. The salt
  (`zivo:rt:v1`) can be bumped to invalidate every existing channel name.
- **Not wired yet**: `useTypingBus`, `useBulkPresence`. These use static or
  global channel names and don't leak per-user info.

## Mobile TLS Pinning (2026-04-29)

### Android
- `android/app/src/main/AndroidManifest.xml`:
  - `android:usesCleartextTraffic="false"`
  - `android:allowBackup="false"` + `android:fullBackupContent="false"`
  - `android:dataExtractionRules="@xml/data_extraction_rules"` (excludes auth
    state from cloud backup and device-to-device transfer on Android 12+)
  - `android:networkSecurityConfig="@xml/network_security_config"`
- `network_security_config.xml`:
  - HTTPS-only baseline (`cleartextTrafficPermitted="false"`)
  - SPKI-SHA256 pin sets for `*.supabase.co`, `myzivo.com`, and `*.stripe.com`
    with primary + backup pins per RFC 7469
  - Pins expire `2027-04-29` — rotate before that date.

### iOS
- `ios/App/App/Info.plist` (`NSAppTransportSecurity`):
  - `NSAllowsArbitraryLoads = false`
  - `NSAllowsArbitraryLoadsForMedia = false`
  - `NSAllowsArbitraryLoadsInWebContent = false`
  - `NSPinnedDomains` for `supabase.co` and `stripe.com` with the same SPKI hashes

### Pin maintenance
Use `scripts/security/compute-spki-pin.sh <hostname>` to compute or refresh
pins. Always ship with primary + backup pins; the backup is what keeps the app
working when the leaf certificate rotates.

## Threat intelligence + auto-block (2026-05-01)

Unified attacker-history layer that aggregates signals from every existing
security table into one decision point. "Check history before protect" — the
edge layer self-blocks IPs that already have documented hostile behaviour.

- **Migrations**: `20260501100000_threat_intel.sql`, `20260501110000_auto_block_threat.sql`, `20260501120000_blocklist_cleanup.sql`.
- **`public.ip_blocklist`**: admin-curated hard-block list keyed by SHA-256 of IP (matches the `blocked_link_attempts.ip_hash` convention so entries correlate). RLS forced; admin RW, anon/authenticated revoked.
- **`public.is_ip_blocked(ip_hash)`**: SECURITY DEFINER, fast lookup. Edge functions call it via `_shared/threatIntel.ts`'s `isIpBlocked(ip)` with a 60s in-isolate cache.
- **`public.get_threat_history(ip, ip_hash, user_id, hours)`**: admin-only RPC that aggregates `security_events`, `blocked_link_attempts`, `security_incidents`, `chat_security_events`, and `ip_blocklist` for a given subject. Returns counts, max severity, last-seen, and a 5-row sample per source.
- **`public.auto_block_if_high_threat(...)`**: service-role RPC that computes the score in-DB and inserts an `ip_blocklist` row when score ≥ threshold (default 75 over 24h). Idempotent; logs to `security_events` as `ip_blocklist.auto_added`. Wired into `withSecurity` so any WAF block or scanner-UA hit auto-escalates if the IP already has prior history.
- **`public.admin_audit_unforced_rls()`**: admin tool to find tables with RLS ENABLED but not FORCED — these allow owner/superuser bypass.
- **`public.prune_expired_ip_blocklist(_retain_days)`**: housekeeping. Deletes rows whose `expires_at` is older than 90 days (configurable). Admin or service_role.
- **Admin UI**: `/admin/security/threat-history` — search by raw IP (hashed client-side), IP hash, or user UUID; aggregated signals with a 0-100 threat score; one-click block (24h/7d/30d/permanent) with required reason; current-blocklist viewer with one-click unblock.
- **Inbound chat phishing**: `assessIncomingChatRisk(text)` in `src/lib/security/chatContentSafety.ts` runs the full `assessLinkSync` rule set (typosquats, shorteners, suspicious TLDs, raw IP, oversized URLs, embedded credentials, punycode) on **received** messages. Wired into `ChatMessageBubble.tsx`: blocked URLs trigger a red "Phishing/impersonation link blocked" warning and suppress the rich link preview; suspicious URLs surface an amber "Open carefully" warning.
- **Tests**: `src/lib/security/chatContentSafety.test.ts` — 17 tests covering typosquats, shorteners, raw IPs, suspicious TLDs, sanitization, partner allowlist.

## Known Open Risks (tracked)

- **Channel-topic migration**: `useChatPresence` and `useGroupCall` are now opaque, but `messages` Realtime subscriptions (postgres_changes) still expose table-level metadata. Switching to per-room channels with opaque names is tracked.

## Incident Response

- **Contact**: security@hizivo.com
- **Response time**: Critical issues acknowledged within 4 hours.
- **Escalation**: Critical payment/fraud alerts auto-notify admins via `send-notification` edge function.

## Responsible Disclosure

If you discover a security vulnerability, please report it to **security@hizivo.com**. Do not create public issues. We will acknowledge receipt within 48 hours and provide a timeline for resolution.

## Backup & Recovery

- **RTO**: < 4 hours
- **RPO**: < 1 hour
- **Database backups**: Hourly incremental, daily full via `run-database-backup` edge function.
- **Storage backups**: Daily manifest via `run-storage-backup` edge function.
- **Retention**: Database 30 days, storage manifests 90 days.
