# Zivo Travel Claude/Codex handoff

Date: 2026-06-05

## Owner request

Build the new Zivo Travel experience for `zivostravel.com` with flights, hotels, rental cars, and bus booking. The user wants a beautiful 3D-feeling customer UX, workflow wiring, payments, payouts/cashout, API, SSO, SEO, and a path to move the travel backend from the main Zivo Media Supabase project into the Zivo Travel Supabase project.

## Current backend decision

Do not flip `VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND=true` yet.

Reason: the target travel Supabase project `xbllvmpomorawkcrtbcq` currently has telemetry/config only. The live booking/payment engine is still in `slirphzzwcogdbkeicff`.

The app should keep using the shared live engine until the target project has:

- travel engine tables and RLS policies,
- RPC functions/triggers/indexes,
- storage buckets,
- Edge Functions,
- provider API secrets,
- payment/payout sandbox smoke tests,
- Supabase Auth redirect allowlists.

## Useful files

- `src/pages/ZivoTravelHome.tsx` - travel homepage and 3D-style booking front door.
- `src/components/zivo-travel/scroll3d.tsx` - shared 3D primitives for scroll turn, parallax, tilt, and horizontal rails.
- `src/styles/zivo-travel-3d.css` - scoped 3D theme utilities for the travel surface.
- `src/config/zivoTravelDomain.ts` - travel host gating and target Supabase config.
- `src/integrations/supabase/client.ts` - shared Supabase browser client; now supports the gated travel backend switch.
- `src/integrations/supabase/travelClient.ts` - telemetry/config client for the travel project.
- `docs/zivo-travel-backend-cutover.md` - migration/cutover runbook.
- `docs/zivo-travel-supabase-inventory.md` - live source/target Supabase inventory comparison.
- `docs/zivo-travel-migration-manifest.md` - service-by-service migration batches and smoke tests.
- `docs/zivo-travel-bus-cutover-plan.md` - first small backend batch plan for bus tables, RLS, routines, and payment functions.
- `scripts/supabase/zivo-travel-readiness-audit.mjs` - local readiness audit.

## Commands

- `npm run zivo-travel:backend-readiness`
- `npm run zivo-travel:migration-manifest`
- `npm run zivo-travel:bus-draft-check`
- `npm run test -- --run src/test/deployEnvPreflight.test.ts`
- `npx eslint src/config/zivoTravelDomain.ts src/integrations/supabase/client.ts src/integrations/supabase/travelClient.ts src/pages/ZivoTravelHome.tsx src/pages/app/BusBookingPage.tsx`
- `npm run type-check` when the machine has enough time/resources.

## Latest Codex UI batch

- Wired `src/styles/zivo-travel-3d.css` into the app entry.
- Scoped the Zivo Travel homepage root with `zivo-travel-3d`.
- Added a floating hero layer stack and a horizontal 3D service-layer rail.
- Added a short Zivo Travel launch/loading layer with service cards and reduced-motion fallback.
- Added a customer-facing 3D trip stack builder that ties flight, hotel, car, and bus into one itinerary while keeping each engine route separate.
- Added a live journey command deck that walks from search to checkout, wallet receipt, support, and partner payout without changing live backend routing.
- Switched the Zivo Travel surface to a scoped light theme, including the launch/loading layer and mobile `theme-color`.
- Added a light quick-action dock for My trips, Wallet, Checkout, and Support near the top of the travel homepage.
- Removed the internal backend workflow spine from the customer homepage and replaced internal backend wording with customer-safe travel copy.
- Added a customer confidence band for tickets, secure checkout, trip wallet, and support.
- Added a popular searches panel with ready-made deep links for flight, hotel, car, and bus searches.
- Kept the booking form route contracts unchanged:
  - flights: `/flights?from&to&start&end&travelers`
  - hotels: `/hotels?city&ci&co&adults`
  - cars: `/cars?city&pickup_date&return_date`
  - bus: `/bus?from&to&date`
- Kept telemetry isolated through `recordZivoTravelSearchEvent`; live bookings/payments remain on the shared engine.

## Standalone repo bridge

- Added the standalone `zivostravel` ownership repo bridge contract in `/Users/kimlain/Documents/GitHub/zivostravel/zivo-travel-bridge.json`.
- Added `/Users/kimlain/Documents/GitHub/zivostravel/docs/bridge-to-zivosmedia.md` so Claude, Codex, Cloudflare, and Supabase work use the same migration model.
- `zivostravel.com` should own the dedicated customer travel product.
- `zivosmedia.com` should still show Travel inside the all-in-one platform through shared route links or API-backed surfaces.
- Keep Zivos Media as auth, checkout, wallet, payout, and live booking authority until the travel Supabase project has verified schema, RLS, Edge Functions, secrets, and sandbox smoke tests.
- Use the travel Supabase project `xbllvmpomorawkcrtbcq` for telemetry, config, previews, and staged migrations until cutover is approved.

## Safe next work

1. Keep improving `/zivo-travel`, `/flights`, `/hotels`, `/cars`, and `/bus` UX without changing the live payment provider behavior.
2. Build target-project migrations in small groups: flight first, then hotel/lodging, car rental, bus, wallet/payout.
3. Deploy Edge Functions to a branch or staging target before production.
4. Smoke-test reads and sandbox payments before live cutover.

## Do not do yet

- Do not bulk-copy live bookings/payments without an export/import plan and backups.
- Do not enable the dedicated travel backend flag before the target project has the required schema and functions.
- Do not run end-to-end live payment tests casually. Existing Stripe/live payment keys can charge real money.
