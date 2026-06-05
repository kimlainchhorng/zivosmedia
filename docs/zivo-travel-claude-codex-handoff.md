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
- `src/config/zivoTravelDomain.ts` - travel host gating and target Supabase config.
- `src/integrations/supabase/client.ts` - shared Supabase browser client; now supports the gated travel backend switch.
- `src/integrations/supabase/travelClient.ts` - telemetry/config client for the travel project.
- `docs/zivo-travel-backend-cutover.md` - migration/cutover runbook.
- `docs/zivo-travel-supabase-inventory.md` - live source/target Supabase inventory comparison.
- `docs/zivo-travel-migration-manifest.md` - service-by-service migration batches and smoke tests.
- `scripts/supabase/zivo-travel-readiness-audit.mjs` - local readiness audit.

## Commands

- `npm run zivo-travel:backend-readiness`
- `npm run zivo-travel:migration-manifest`
- `npm run test -- --run src/test/deployEnvPreflight.test.ts`
- `npx eslint src/config/zivoTravelDomain.ts src/integrations/supabase/client.ts src/pages/ZivoTravelHome.tsx`
- `npm run type-check` when the machine has enough time/resources.

## Safe next work

1. Keep improving `/zivo-travel`, `/flights`, `/hotels`, `/cars`, and `/bus` UX without changing the live payment provider behavior.
2. Build target-project migrations in small groups: flight first, then hotel/lodging, car rental, bus, wallet/payout.
3. Deploy Edge Functions to a branch or staging target before production.
4. Smoke-test reads and sandbox payments before live cutover.

## Do not do yet

- Do not bulk-copy live bookings/payments without an export/import plan and backups.
- Do not enable the dedicated travel backend flag before the target project has the required schema and functions.
- Do not run end-to-end live payment tests casually. Existing Stripe/live payment keys can charge real money.
