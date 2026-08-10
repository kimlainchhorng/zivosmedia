# ZIVO Full Platform Update Roadmap

Generated: 2026-05-31

## Live verification checkpoint — 2026-08-09

The local four-app preview pass now covers `zivodriver`, `Zivo-Admin`, `ZIVO-ride`, and
`zivosmedia` together. This is a development verification checkpoint, not a production
deployment approval.

Verified in the running previews:

- `zivosmedia`: car-rental search → filters → results → detail → traveler-information
  surfaces render; the Electric Only quick filter becomes active. `/hotels` renders the
  Hotels & Resorts directory, and direct `/travel/checkout` returns a usable empty-cart
  recovery state. Travel homepage defaults and popular-search deep links now roll forward
  from the current day instead of shipping past dates, including the live itinerary card.
  Final browser QA also covers `/flights`, `/hotels`, `/cars`, and `/bus`; the Bus hero now
  keeps its dark media scrim and white copy readable inside the light Travel skin, while Cars
  reaches its truthful empty-results state without an unresolved loading overlay. The
  Promotions Offers tab no longer shows the expired hardcoded Hotel + Flight Bundle promise
  (`20% OFF`, `Mar 2026`); browser QA confirmed the remaining cards and copy-code interaction.
  The `/network/saved` favorites surface now keeps card navigation and removal as valid,
  independent controls; its empty-state recovery returns to the live partner network route.
  Notification preferences now keep device-local opt-outs scoped to the authenticated account,
  expose toggle state on the native control, and avoid presenting a dead category action for
  required-only templates; server sync remains a future backend/RLS task.
  The current frontend hardening pass also scopes Rider announcement dismissals, Driver
  announcement/search/history state, and zivosmedia creator targets, service favorites, and
  personal More-page shortcuts to the authenticated account. These are intentionally device-local
  fallbacks; the next platform step is a server-owned preference/history sync with RLS, explicit
  account fixtures, conflict handling, retention limits, and cross-device recovery.
- `zivodriver`: first paint, auth/session preparation, onboarding data loading, vehicle
  selection, and the completed onboarding screen render without console errors. Loading
  states now use the ZIVO mark, explanatory copy, and responsive skeleton structure.
- `Zivo-Admin`: sign-in surface renders and password visibility toggles locally.
- `ZIVO-ride`: booking surface renders after a clean Rider preview restart and the English →
  Khmer locale switch remains interactive. The app-level crash fallback now stays usable even
  when the router itself is unavailable. The only current preview warning is the expected
  Stripe-over-HTTP localhost notice.

Recommended next build order, based on those checks:

1. **Release truth:** reconcile the live Edge Function inventory, finish the Android SDK/native
   build setup, and keep sandbox payment/refund/webhook replay green before production release.
2. **Trip truth:** make ride, delivery, and travel booking transitions one authoritative,
   idempotent state machine with visible recovery states for timeout, cancellation, and supplier
   handoff failures.
3. **Operations:** finish the Admin control center for driver/document review, dispatch health,
   payment/refund reconciliation, support cases, and an auditable event timeline.
4. **Marketplace quality:** add upfront quote + ETA freshness, scheduled/multi-stop rides,
   driver earnings/incentive visibility, and rider safety/support flows with real end-to-end tests.
5. **Travel retention:** complete itinerary storage, booking-change/refund status, supplier
   callback reconciliation, and a unified My Trips view across flights, hotels, cars, and buses.
6. **Growth:** add business/fleet accounts, loyalty/membership, referrals, and localized Khmer
   onboarding only after the reliability and support foundations above are release-ready.

These priorities follow the durable marketplace lessons ZIVO is adopting from leading ride
platforms: make every state truthful, show the next action, protect both sides of the trip,
and measure the full request → match → pickup → completion → payout lifecycle. They are product
patterns, not a request to copy another company's branding or implementation.

Promotion rule for the next build: dated or limited-time offer claims should be Admin/Supabase-
owned records with server-side expiry filtering and an auditable owner, rather than hardcoded
marketing cards in the customer bundle.

Retention follow-up: move network favorites from client-only ids to a server-owned, stale-id-aware
model with last-known partner availability and a recoverable removal path. Until that exists, the
customer copy must continue to say that favorites are device-only and the UI must not imply synced
cross-device access.

## Current State

ZIVO already has broad product coverage across web, mobile shells, backend functions, and legal pages:

- Social/feed: feed, reels, chat, creator pages, subscriptions, tips, payouts, wallet, affiliate pages.
- Commerce/travel: rides, eats, hotels/lodging, flights, car rental, checkout, booking, tracking, refunds.
- Business tools: shop owner dashboards, staff/employee flows, marketing campaigns, ads analytics, Google Ads and Meta Ads admin pages.
- Trust/legal: terms, privacy, refund, cancellation, acceptable use, cookie, DMCA, renter/owner terms, social media policy, data retention, security policy.
- Backend: Supabase migrations, Edge Functions, Stripe/payment webhooks, wallet/payout functions, marketing and ads functions, notification functions.
- Native: Capacitor iOS and Android projects are present; iOS builds on this Mac, Android needs SDK configuration.

The biggest update need is connection quality: prove every major button, role, checkout, webhook, notification, policy promise, and revenue flow works end to end.

## Priority 1 - Release And Native Builder

Needed:

- Configure Android SDK locally so Android builds run. Setup guide: `docs/native-android-setup.md`.
- Keep iOS and Android versions aligned for each release.
- Use one repeatable native pipeline after every web update.

Commands:

```bash
npm run native:doctor
npm run native:sync
npm run ios:build:sim
npm run android:build:debug
```

Current blocker:

- Android SDK is missing or not configured. Follow `docs/native-android-setup.md`, then add `android/local.properties` with `sdk.dir=/Users/kimlain/Library/Android/sdk` after installing Android Studio/SDK.

## Priority 2 - End-To-End Workflow Coverage

The generated workflow audit says production is not ready because targeted tests are missing. Build these first:

1. Legal/policy workflow:
   - Routes render.
   - Account export/delete/privacy controls are linked.
   - Policy acceptance, consent, export, and deletion promises have backend evidence.

2. Staff/client/employee workflow:
   - Invite acceptance.
   - Schedule/payroll/client data permissions.
   - Owner-only settings denied to staff/client users.

3. Customer booking/order/trip workflow:
   - Browse, checkout/book, confirmation, cancel, refund.
   - Verify rides, eats, hotel, flight, and car rental separately.

4. Payments/refunds/webhooks:
   - Stripe webhook replay/idempotency.
   - Refund/dispute/cancel state transitions.
   - Wallet and payout ledger integrity.

5. Creator monetization:
   - Video/reel monetization eligibility.
   - Tips/subscriptions/pay-per-view.
   - Creator payout states and audit logs.

6. Ads and monetization tracking:
   - Browser analytics event IDs, offline queue, and dedupe.
   - Google Ads click conversion upload.
   - Meta server-side purchase/registration events.
   - Ads Studio attribution from click/creative to order revenue.
   - Creator subscriptions, paid video, affiliate tracking, and payouts.

Verification:

```bash
npm run platform:test:ads-monetization
```

## Priority 3 - Ads, Marketing, And Tracking

Needed platform connections:

- Google Ads:
  - Google tag / Google Ads conversion actions.
  - AdSense publisher client plus per-placement slot IDs through deployment env:
    `VITE_GOOGLE_ADSENSE_CLIENT`, `VITE_ADSENSE_SLOT_HOME_FEED`,
    `VITE_ADSENSE_SLOT_SEARCH_RESULTS`, and `VITE_ADSENSE_SLOT_ARTICLE_INLINE`.
  - `public/ads.txt` must be updated from the placeholder `pub-0000000000000000`
    to the real AdSense publisher number before live revenue can be trusted.
  - Enhanced conversions for web where consent allows first-party user data.
  - Purchase, booking, lead, subscribe, and app install/open events.
  - Source: https://developers.google.com/google-ads/api/docs/conversions/enhanced-conversions/web

- Meta/Facebook/Instagram:
  - Pixel for browser events.
  - Conversions API for server-side purchase/booking/lead/subscription events.
  - Domain verification, event deduplication IDs, and consent handling.
  - Official reference: https://developers.facebook.com/docs/marketing-api/conversions-api/

- TikTok:
  - TikTok Pixel for web events.
  - Events API for server-to-server web/app/offline event sharing.
  - Source: https://ads.tiktok.com/help/article/events-api

- X:
  - X Pixel for consent-based web conversion measurement.
  - Lead, checkout, purchase, share, and app-install campaign attribution.
  - Source: https://business.x.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites.html

ZIVO already has evidence of ads/marketing surfaces and Meta bridge functions. Next update should be a unified event pipeline:

- One event schema: `view_content`, `search`, `lead`, `add_to_cart`, `checkout_start`, `purchase`, `booking`, `subscribe`, `tip`, `video_view`, `creator_follow`.
- One frontend tracker.
- One Supabase Edge Function that fans out allowed events to Meta, Google, TikTok, X, and internal analytics.
- Consent gates for marketing, tracking, email, SMS, and push.
- Admin diagnostics page showing which providers received each event.

## Priority 4 - UX/UI And Graphics Design

Needed:

- Visual regression tests for mobile and desktop.
- Screenshots for auth, feed, chat, shop dashboard, checkout, legal, settings, rides, eats, hotels, flights, rental.
- No safe-area clipping, button overlap, header collision, or half-visible controls.
- Loading/error/empty states for every money-making flow.
- Consistent mobile bottom navigation and desktop side-by-side layouts.

Commands:

```bash
npm run build
npm run test:visual
npm run qa:safe-area:all
npm run perf:media-report
```

## Priority 5 - Backend Connections

Needed:

- Confirm every frontend call maps to a protected backend/RLS path.
- Confirm every Edge Function has auth, rate limits, error reporting, and idempotency where money or bookings are involved.
- Add observability for function 5xx, webhook failures, slow queries, payment spikes, and auth abuse.
- Add storage/media tests for public, owner-only, client-only, and protected media.
- Current storage/media workflow guard: `npm run platform:test:storage-media`.
- Current media optimization backlog: `npm run perf:media-report` reports raw image/video usage and should be burned down from feed, reels, PPV, chat, and admin media surfaces first.

Commands:

```bash
npm run test:rls
npm run platform:test:storage-media
npm run security:api-readiness:report
npm run deploy:preflight:strict
npm run supabase:migrations:linked:strict
```

## Priority 6 - Law, Policy, Terms

Needed:

- Legal page inventory and route test.
- Policy version acceptance logging.
- Consent logs for marketing/tracking.
- Data export/delete promises verified against backend behavior.
- Refund/cancellation policy tested against actual booking/refund states.
- Creator monetization terms tied to payout eligibility and content rules.

This is important before running ads or monetized video at scale.

## Priority 7 - Revenue Features

Highest-value revenue connections to finish:

- Ads platform event tracking for all bookings, purchases, leads, subscriptions, and creator payments.
- Creator subscriptions, tips, paid video, and payout dashboards.
- Business ads/boosted posts for shops, hotels, rides, eats, flights, and rental.
- Affiliate links and attribution.
- ZIVO+ memberships.
- Sponsored listing placements for hotels, eats, car rental, shops, and creators.
- Wallet, ledger, refund, and payout reconciliation.

## Build Order

1. Configure Android SDK.
2. Run `npm run native:doctor`.
3. Run `npm run deploy:preflight:strict`.
4. Add missing workflow tests from `docs/workflow-test-plan.md`.
5. Add visual QA for core mobile/desktop pages.
6. Build/sync native apps with `npm run native:sync`.
7. Build iOS and Android.
8. Only then scale ads, marketing, creator monetization, and app store releases.
