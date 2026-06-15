# MiMo run — 2026-06-15T17:05:11.476Z

- model: mimo-v2.5-pro
- api_format: openai
- task: Audit the ZIVO ride-hailing + driver end-to-end flow. Find likely frontend/backend breakpoints for customer ride request -> driver availability/dashboard -> accept/track lifecycle. Focus on routes src/pages/app/RideHubPage.tsx, src/pages/app/RequestRidePage.tsx, src/pages/app/RideTrackingPage.tsx, src/pages/driver/DriverHomePage.tsx, src/config/zivoDriverDomain.ts, and relevant ride services/hooks. Provide concise bug hypotheses and exact files to inspect; do not edit.
- files: src/pages/app/RideHubPage.tsx, src/pages/app/RequestRidePage.tsx, src/pages/app/RideTrackingPage.tsx, src/pages/driver/DriverHomePage.tsx, src/config/zivoDriverDomain.ts

---

# Ride-Hailing + Driver E2E Flow Audit

## Plan

I'll trace the full lifecycle: **Customer requests ride → pricing → payment → dispatch → driver receives offer → driver accepts → tracking → completion**, identifying breakpoints at each transition. I'll focus on the files provided plus the key backend touchpoints (edge functions, RPCs, tables).

---

## Architecture Trace

### 1. Customer Request Flow (`RequestRidePage.tsx`)

**Step 1 — Address → Pricing:**
```
handleGetPrice()
  → supabase.from("jobs").insert({ job_type: "ride", status: "created", ... })
  → supabase.functions.invoke("trip-estimate", { job_id })
  → supabase.rpc("assign_job_zone_and_surge_postgis", { p_job_id })
  → supabase.rpc("apply_pricing_to_job", { p_job_id })
  → supabase.from("jobs").select("*").eq("id", jobId)
```

**Step 2 — Pricing → Payment:**
```
handleConfirmPrice()
  → supabase.functions.invoke("create-payment-intent", { job_id: draftJobId })
  → sets clientSecret → Stripe Elements <PaymentForm>
```

**Step 3 — Payment → Dispatch:**
```
handlePaymentSuccess()
  → supabase.from("jobs").update({ status: "requested" }).eq("id", draftJobId)
  → supabase.functions.invoke("dispatch-start", { job_id, offer_ttl_seconds: 25 })
  → setTimeout(() => navigate(`/trip-status/${draftJobId}`), 7000)
```

### 2. Driver Offer Flow (`DriverHomePage.tsx`)

```
toggleOnline() → driver_profiles.update({ is_online: true })
  → subscribes to job_offers INSERT where driver_id = current
  → fetchPendingOffer() reads job_offers + joins jobs table
  → acceptOffer() → supabase.rpc("accept_job_offer", { p_offer_id, p_driver_id })
  → navigate(`/driver/map?job=${job_id}`)
```

### 3. Tracking Flow (`RideTrackingPage.tsx`)

```
Reads from ride_requests (NOT jobs) by tripId
  → subscribes to ride_requests postgres_changes UPDATE
  → fetches driver info from drivers table
  → useCustomerLocationBroadcast() for live GPS
  → DriverEnRouteTracker renders status
```

---

## Bug Hypotheses (Ranked by Severity)

### 🔴 P0 — Table Name Mismatch: `jobs` vs `ride_requests`

**The most critical finding.** `RequestRidePage` creates and updates rows in the **`jobs`** table. `RideTrackingPage` reads from the **`ride_requests`** table. `DriverHomePage` reads from **`job_offers`** (joined with `jobs`).

| Stage | Table Used | File |
|-------|-----------|------|
| Create draft | `jobs` | `RequestRidePage.tsx` L~470 |
| Price lookup | `jobs` | `RequestRidePage.tsx` L~490 |
| Status update to "requested" | `jobs` | `RequestRidePage.tsx` L~510 |
| Dispatch trigger | `jobs` (via `dispatch-start`) | `RequestRidePage.tsx` L~513 |
| Driver offer | `job_offers` → `jobs` | `DriverHomePage.tsx` L~80 |
| **Tracking** | **`ride_requests`** | **`RideTrackingPage.tsx` L~50** |

**Hypothesis:** Either:
- **(a)** There's a trigger/edge function that copies `jobs` → `ride_requests` on status change (needs verification), OR
- **(b)** The tracking page silently fails — `supabase.from("ride_requests").eq("id", tripId)` returns null because the row lives in `jobs`, and the user sees a blank tracking screen.

**Files to inspect:**
- `supabase/migrations/` — any trigger on `jobs` that inserts into `ride_requests`
- `supabase/functions/dispatch-start/` — does it create a `ride_requests` row?
- The `accept_job_offer` RPC — does it insert into `ride_requests`?

### 🔴 P0 — Navigation Path Mismatch

`RequestRidePage.handlePaymentSuccess()` navigates to:
```js
navigate(`/trip-status/${draftJobId}`)
```

But `RideTrackingPage` is mounted at:
```tsx
// In App.tsx or router config — need to verify
const { tripId } = useParams();  // expects /trip/:tripId or similar
```

**Hypothesis:** The route `/trip-status/:tripId` may not be registered, or it maps to a different component. The `RideTrackingPage` uses `useParams()` expecting `tripId` — if the route pattern is `/trip-status/:tripId` but the router defines `/ride-tracking/:tripId` or `/rides/tracking/:tripId`, the page 404s.

**Files to inspect:**
- `src/App.tsx` or the router config — find where `RideTrackingPage` is mounted and what param name it expects
- Confirm `/trip-status/:tripId` is a registered route

### 🟠 P1 — Driver Offer: `estimated_fare` May Be Null

`DriverHomePage` displays `incomingOffer.estimated_fare` but the `fetchPendingOffer` query does:
```js
.select("id, job_id, expires_at, jobs(pickup_address, dropoff_address, distance_km, estimated_fare)")
```

The `estimated_fare` column on `jobs` is read, but `RequestRidePage` stores the price as `pricing_total_estimate` (in cents). If `estimated_fare` is a separate column that's never populated by the pricing RPC, the driver sees `$0.00` or null.

**Files to inspect:**
- The `apply_pricing_to_job` RPC — does it set `estimated_fare` on the `jobs` row, or only `pricing_total_estimate`?
- The `jobs` table schema — is `estimated_fare` a real column or a view alias?

### 🟠 P1 — Dispatch Race Condition

```js
// RequestRidePage.handlePaymentSuccess()
await supabase.from("jobs").update({ status: "requested" });
await supabase.functions.invoke("dispatch-start", { job_id, offer_ttl_seconds: 25 });
setTimeout(() => navigate(`/trip-status/${draftJobId}`), 7000);
```

**Issues:**
1. **No error handling on dispatch failure** — if `dispatch-start` fails (no available drivers, function error), the user is navigated to a tracking page for a ride that was never dispatched. The `console.error` is swallowed.
2. **Hardcoded 7-second delay** — if dispatch is instant, the user stares at the "finding" animation for 7 seconds. If dispatch takes longer (driver network is slow), the user arrives at the tracking page before a driver is assigned, seeing no driver info.
3. **No polling/subscription for driver assignment** — the "finding" step shows a fake `DriverPreviewCard` (hardcoded "Marcus T." after 3.5s) with no connection to actual dispatch. The user gets a fabricated driver preview that has nothing to do with reality.

### 🟠 P1 — `ride_requests` Status Values May Not Match

`RideTrackingPage` maps statuses:
```js
const statusMap = {
  driver_assigned: "arriving",
  en_route: "arriving",
  arrived: "waiting",
  in_progress: "in_transit",
  completing: "almost_there",
};
```

But `RequestRidePage` sets `jobs.status = "requested"`. The dispatch/accept flow must transition through `driver_assigned → en_route → arrived → in_progress → completed`. If the `accept_job_offer` RPC sets a different status string (e.g., `"accepted"` instead of `"driver_assigned"`), the tracking page shows the default "arriving" state incorrectly or falls through.

**Files to inspect:**
- `accept_job_offer` RPC — what status does it write?
- `dispatch-start` edge function — what status transitions does it manage?

### 🟡 P2 — Driver Domain Auth Isolation

`zivoDriverDomain.ts` points to a **separate Supabase project** (`yiedlgoxwjmansszdypf`), but `DriverHomePage` uses the **shared** `supabase` client (imported from `@/integrations/supabase/client`, which points to `slirphzzwcogdbkeicff`).

**Hypothesis:** If the driver is on `zivodriver.com`, the app's host-gating may switch the Supabase client to the driver project. But `DriverHomePage` imports the shared client directly. This means:
- On `zivodriver.com`: the shared client may be swapped by the host-gating in `client.ts`, OR the driver page uses the wrong project
- On `zivosmedia.com/driver`: the shared client is correct, but the driver project's `driver_profiles` table doesn't exist there

**Files to inspect:**
- `src/integrations/supabase/client.ts` — does it swap based on host?
- `src/integrations/supabase/driverClient.ts` — does this exist?
- The `driver_profiles` and `job_offers` tables — which project are they in?

### 🟡 P2 — Customer Location Broadcast Uses `tripId` But Data Is in `jobs`

```js
// RideTrackingPage
useCustomerLocationBroadcast({
  tripId: isRideActive ? tripId ?? null : null,
  enabled: Boolean(isRideActive),
});
```

If the broadcast hook writes to a `trip_locations` or similar table keyed by `tripId`, but the actual row ID is a `jobs.id`, the driver may not receive the customer's GPS.

**Files to inspect:**
- `src/hooks/useCustomerLocationBroadcast.ts` — what table does it write to?

### 🟡 P2 — `RideTrackingPage` Subscribes to `ride_requests` But Driver Updates `jobs`

The realtime subscription:
```js
supabase.channel(`trip-${tripId}`)
  .on("postgres_changes", { table: "ride_requests", filter: `id=eq.${tripId}` }, ...)
```

If the driver's status updates go to `jobs` (not `ride_requests`), the customer's tracking page never receives realtime updates. The page would be static after initial fetch.

### 🟡 P2 — Fake Data in `RequestRidePage`

Several features use hardcoded data that will confuse users in production:
- `routeAlternatives` — static array with fake times/distances
- `driverMemory` — hardcoded driver names ("Marcus T.", "Sarah L.")
- `commuteInsights` — static analytics data
- `surgePredictions` — static surge predictions
- `carbonDashboard` — static carbon data
- `DriverPreviewCard` — shows "Marcus T." after 3.5s regardless of actual dispatch

These are cosmetic but the `DriverPreviewCard` is actively misleading — it shows a specific driver name/vehicle/rating that has no relation to the actual matched driver.

### 🟢 P3 — Minor Issues

1. **`RideHubPage` tab count mismatch** — `PRIMARY_TAB_IDS` has 8 items but `primaryTabs` array also has 8; the `tabs` array has ~57 entries. The "features" tab in `primaryTabs` doesn't exist in `tabs`, so `selectTab("features")` sets `activeTab="features"` but the URL param sync may behave oddly.

2. **`RequestRidePage` promo code** — only `"FIRST10"` is accepted (hardcoded). No backend validation.

3. **`RequestRidePage` surge detection** — queries `surge_zones` table but the result only sets a boolean `surgeActive` that's never used in the UI (no surge indicator shown to the user).

4. **`DriverHomePage` countdown** — uses local state for the 25s offer TTL. If the driver's phone clock drifts or the app is backgrounded, the countdown desyncs from the server-side `expires_at`. The `expires_at` field is fetched but never compared.

---

## Files to Inspect (Priority Order)

| Priority | File | Why |
|----------|------|-----|
| 🔴 | `src/App.tsx` (router config) | Confirm `RideTrackingPage` route pattern + param name |
| 🔴 | `supabase/functions/dispatch-start/` | Does it create `ride_requests` from `jobs`? |
| 🔴 | `supabase/functions/dispatch-start/` or migration | Does `accept_job_offer` RPC write to `ride_requests`? |
| 🔴 | `src/integrations/supabase/client.ts` | Host-gating logic for driver domain |
| 🟠 | `supabase/migrations/` | Triggers that sync `jobs` → `ride_requests` |
| 🟠 | `src/hooks/useCustomerLocationBroadcast.ts` | What table/row does it key on? |
| 🟠 | `src/components/rides/DriverEnRouteTracker.tsx` | How does it handle missing driver data? |
| 🟠 | `supabase/functions/trip-estimate/` | Does it set `estimated_fare` on `jobs`? |
| 🟡 | `src/hooks/useDriverDashboardData.ts` | Which Supabase client does it use? |
| 🟡 | `src/integrations/supabase/driverClient.ts` | Does this exist? Is it used? |
| 🟡 | `src/components/rides/RideBookingHome.tsx` | The actual booking form inside the hub — does it share state correctly? |

---

## Summary

The **highest-risk finding** is the `jobs` ↔ `ride_requests` table split. The entire customer flow writes to `jobs`, but the tracking page reads from `ride_requests`. Unless there's a trigger/RPC that bridges them (which I can't verify from the frontend code alone), the tracking page will show empty data after a successful ride request. The second critical issue is the navigation path `/trip-status/${id}` — if that route doesn't exist or maps to a different component, the user hits a 404 after paying.

**Owner must verify:**
1. Does a DB trigger or `dispatch-start` function copy `jobs` → `ride_requests`?
2. Is `/trip-status/:tripId` a registered route for `RideTrackingPage`?
3. Which Supabase project do `driver_profiles`/`job_offers`/`ride_requests` live in?
4. Does `accept_job_offer` RPC set `ride_requests.status = 'driver_assigned'`?
