# DeepSeek run — 2026-06-15T17:04:01.533Z

- model: deepseek-chat
- task: Audit the ZIVO ride-hailing + driver end-to-end flow. Find likely frontend/backend breakpoints for customer ride request -> driver availability/dashboard -> accept/track lifecycle. Focus on routes src/pages/app/RideHubPage.tsx, src/pages/app/RequestRidePage.tsx, src/pages/app/RideTrackingPage.tsx, src/pages/driver/DriverHomePage.tsx, src/config/zivoDriverDomain.ts, and relevant ride services/hooks. Provide concise bug hypotheses and exact files to inspect; do not edit.
- files: src/pages/app/RideHubPage.tsx, src/pages/app/RequestRidePage.tsx, src/pages/app/RideTrackingPage.tsx, src/pages/driver/DriverHomePage.tsx, src/config/zivoDriverDomain.ts

---

# Audit: ZIVO Ride-Hailing + Driver End-to-End Flow

## Short Plan

I've analyzed the 5 files provided. Below are the **critical breakpoints** in the customer ride request → driver availability → accept/track lifecycle, with exact files and line ranges to inspect.

---

## Critical Bug Hypotheses

### 1. 🚨 **Race Condition: `dispatch-start` fires before payment intent is confirmed**

**Files:** `src/pages/app/RequestRidePage.tsx` (lines ~L580-L600)

**Problem:** `handlePaymentSuccess` immediately calls `dispatch-start` after the Stripe `confirmPayment` resolves, but the payment intent status is only `requires_capture` or `processing` — not yet `succeeded`. The driver gets dispatched before the payment is fully settled. If the payment later fails, the driver is already en route.

**Fix:** Only dispatch after `paymentIntent.status === "succeeded"`, or add a webhook listener that dispatches on `payment_intent.succeeded`.

---

### 2. 🚨 **`job_offers` table vs `ride_requests` table — dual-table inconsistency**

**Files:**
- `src/pages/app/RequestRidePage.tsx` — inserts into `jobs` table, then dispatches
- `src/pages/driver/DriverHomePage.tsx` — reads from `job_offers` table
- `src/pages/app/RideTrackingPage.tsx` — reads from `ride_requests` table

**Problem:** The customer flow creates a `jobs` row (line ~L530), then `dispatch-start` presumably creates a `job_offers` row for the driver. But `RideTrackingPage` queries `ride_requests` (line ~L35), not `jobs`. If `dispatch-start` creates a `ride_requests` row (not a `jobs` row), the tracking page works but the driver's `job_offers` subscription never fires. If it creates a `job_offers` row, the tracking page never loads.

**Fix:** Trace the `dispatch-start` edge function to confirm which table(s) it writes to. Ensure a single source of truth — either `jobs` → `ride_requests` via a DB trigger, or both pages read the same table.

---

### 3. 🚨 **Driver offer countdown resets on every Re-render**

**File:** `src/pages/driver/DriverHomePage.tsx` (lines ~L60-L80)

**Problem:** `fetchPendingOffer` is called inside a `useEffect` that depends on `[isOnline, driverId, fetchPendingOffer]`. Every time `fetchPendingOffer` runs, it resets `countdown` to `OFFER_TTL` (25s). If the component re-renders (e.g., stats update from `useDriverDashboardData`), the countdown resets, giving the driver an artificially long time to accept.

**Fix:** Move the countdown reset out of `fetchPendingOffer` — only set it when a *new* offer arrives (compare `incomingOffer.job_id`).

---

### 4. 🚨 **`useCustomerLocationBroadcast` fires even when no driver is assigned**

**File:** `src/pages/app/RideTrackingPage.tsx` (lines ~L20-L24)

**Problem:** `isRideActive` is `true` when `status` is `"driver_assigned"` through `"in_progress"`. But the broadcast hook starts broadcasting the customer's GPS immediately on `driver_assigned`, before the driver has confirmed they're en route. This leaks the customer's precise location to a driver who hasn't started moving yet.

**Fix:** Only broadcast when `status === "en_route"` or later (not `"driver_assigned"`).

---

### 5. 🚨 **No fallback if `dispatch-start` edge function is missing or errors**

**File:** `src/pages/app/RequestRidePage.tsx` (line ~L590)

```typescript
const { error: dispatchError } = await supabase.functions.invoke("dispatch-start", { body: { job_id: draftJobId, offer_ttl_seconds: 25 } });
if (dispatchError) console.error("[RequestRide] dispatch-start error:", dispatchError);
```

**Problem:** The error is only logged, not surfaced to the user. The customer sees "finding driver" UI but no driver ever receives the offer. The 7-second timeout navigates to `/trip-status/:jobId` which shows a blank page because no driver was dispatched.

**Fix:** Show a toast error and allow the customer to retry or cancel.

---

### 6. 🚨 **`accept_job_offer` RPC — no idempotency or race condition handling**

**File:** `src/pages/driver/DriverHomePage.tsx` (line ~L115)

```typescript
const { error } = await (supabase as any).rpc("accept_job_offer", { p_offer_id: incomingOffer.id, p_driver_id: driverId });
```

**Problem:** If two drivers both call `accept_job_offer` simultaneously for the same `job_offers` row, there's no server-side guard preventing double-acceptance. The RPC must use a `SELECT ... FOR UPDATE SKIP LOCKED` or an atomic `UPDATE ... WHERE status = 'pending'` check.

**Fix:** Inspect the `accept_job_offer` RPC definition in Supabase to confirm it has a race-condition guard.

---

### 7. 🚨 **`RideTrackingPage` doesn't subscribe to driver GPS updates**

**File:** `src/pages/app/RideTrackingPage.tsx`

**Problem:** The page subscribes to `ride_requests` table changes (line ~L55), but driver GPS coordinates are likely stored in a separate `driver_locations` table or broadcast via Realtime. The `DriverEnRouteTracker` component receives `driverId` but there's no Realtime subscription for the driver's live position.

**Fix:** Add a Realtime channel subscription to `driver_locations` filtered by `driver_id`, or use the `useCustomerLocationBroadcast` hook's counterpart (`useDriverLocationBroadcast`) on the driver side.

---

### 8. 🚨 **`zivodriver.com` uses a separate Supabase project but auth is on the main project**

**File:** `src/config/zivoDriverDomain.ts` (lines ~L10-L15)

**Problem:** The driver domain points to `yiedlgoxwjmansszdypf` (Zivo Driver project), but per `AGENTS.md` rule: *"auth ALWAYS on the main project (`slirphzzwcogdbkeicff`)"*. If the driver app authenticates against the driver project, the JWT won't be valid for the main project's `ride_requests`/`jobs` tables. The driver won't see any ride offers.

**Fix:** Ensure the driver app uses the **main Supabase client** for auth (same as the rider app), and only uses the driver project for driver-specific data (profiles, earnings, etc.). This is the same dual-client pattern described in `AGENTS.md` for the travel domain.

---

### 9. 🚨 **`RideHubPage` `submitRateAndTip` queries `ride_requests` but `RequestRidePage` inserts into `jobs`**

**Files:**
- `src/pages/app/RideHubPage.tsx` (line ~L80): queries `ride_requests` for the most recent completed ride
- `src/pages/app/RequestRidePage.tsx` (line ~L530): inserts into `jobs`

**Problem:** If the ride lifecycle creates a `jobs` row but never creates a corresponding `ride_requests` row, the rating/tip flow in `RideHubPage` will always return "no recent ride" because it queries the wrong table.

**Fix:** Either: (a) ensure `dispatch-start` or a DB trigger creates a `ride_requests` row from the `jobs` row, or (b) make `submitRateAndTip` query `jobs` instead.

---

## Files to Inspect (in priority order)

| Priority | File | Why |
|----------|------|-----|
| 🔴 P0 | `supabase/functions/dispatch-start/index.ts` | Must confirm which tables it writes to (jobs vs ride_requests vs job_offers) |
| 🔴 P0 | `supabase/functions/accept_job_offer/index.ts` or the RPC definition | Must confirm race-condition guard |
| 🔴 P0 | `src/integrations/supabase/client.ts` | Must confirm driver app uses main project for auth |
| 🟡 P1 | `src/hooks/useCustomerLocationBroadcast.ts` | Must confirm it doesn't broadcast before driver is en route |
| 🟡 P1 | `src/components/rides/DriverEnRouteTracker.tsx` | Must confirm it subscribes to driver GPS updates |
| 🟡 P1 | `supabase/functions/create-payment-intent/index.ts` | Must confirm it creates a PaymentIntent, not just a SetupIntent |
| 🟢 P2 | `src/hooks/useDriverDashboardData.ts` | Must confirm it queries the correct project (driver vs main) |

---

## Owner Verification Required

1. **Run `npm run update`** after any fix — must pass with 0 type errors.
2. **Test the full flow end-to-end** on a staging environment (not production with live Stripe):
   - Customer requests ride → payment intent created → dispatch-start fires → driver sees offer → driver accepts → customer sees tracking → ride completes → rating/tip flow works
3. **Inspect the `accept_job_offer` RPC** in Supabase SQL editor for race condition guards.
4. **Confirm the driver app's Supabase client** uses the main project (`slirphzzwcogdbkeicff`) for auth, not the driver project (`yiedlgoxwjmansszdypf`).
5. **Do NOT deploy** until the dual-table inconsistency (bug #2) is resolved — this will cause silent failures in production.
