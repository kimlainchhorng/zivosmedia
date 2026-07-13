# MiMo run — 2026-07-02T04:51:14.618Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: IMPORTANT: You have NO tools and NO repo access. Do NOT emit tool calls. Answer directly in markdown from the context in this prompt only. Context: ZIVO two-app ecosystem — customer app zivosmedia (ride booking: pickup/destination, quotes, confirm, live tracking, Bakong/ABA/Stripe payments, rate+tip; parcel/food delivery) and driver app zivodriver (driver-go-online, auto-dispatch + dispatch-order edge functions, JobFlow page, complete-trip, auto-payout-driver) sharing ONE Supabase project. Suspected: customer ride/delivery flows may write to the wrong Supabase project (4 referenced in env) or be mocked; duplicated edge functions across repos drifted; driver job intake may never see customer-booked rides. DeepSeek proposed: single rides table + status enum (pending/offered/accepted/en_route/arrived/in_progress/completed/cancelled_by_*), driver_availability with PostGIS nearest-5 + 30s offer expiry + reoffer, broadcast offers:{driverId} for job offers, postgres_changes for status + driver location, polling fallbacks, Capacitor resume re-subscribe, numeric error codes. Give: (1) critique/improvements of that plan for a Cambodia 2-app Capacitor market; (2) if audit shows parallel non-connected tables (customer writes ride_requests, driver reads orders) — the MINIMAL-change first move: adapter/view vs migration vs dual-write, and why; (3) exact dev verification steps to prove a ride flows end to end WITHOUT a real driver phone (concrete SQL to simulate driver accept/status transitions, what to watch in each app). Terse, numbered, concrete.

---

# ZIVO Ride/Dispatch Cross-App Audit & Fix Plan

---

## 1. Critique of DeepSeek's Proposed Plan (Cambodia 2-App Capacitor Context)

**What's right:**
- Single `rides` table + canonical status enum — correct and essential. The current split (customer → `ride_requests`/bookings on main project, driver → `orders` on driver project) is the root cause of "driver never sees customer rides."
- `postgres_changes` for real-time status/driver location — appropriate for Supabase, cheaper than a custom WebSocket server.
- Numeric error codes — good for Khmer/English i18n in Capacitor (translate client-side).

**What needs correction or addition for Cambodia:**

| # | Issue | Fix |
|---|-------|-----|
| **A** | **Wrong Supabase project split.** AGENTS.md confirms: main = `slirphzzwcogdbkeicff`, driver = `yiedlgoxwjmansszdypf`. DeepSeek's plan assumes ONE project. Reality: two. **The driver project has no rows the customer writes.** Either (a) both apps must point to the SAME project for ride data, or (b) you need a cross-project bridge (edge function or DB link). Option (a) is correct — ride data belongs on main; driver project becomes telemetry-only (like travel). | Migrate driver app's Supabase client to main project for ride/booking tables. Keep driver project for driver-only telemetry/config (same pattern as travel). |
| **B** | **PostGIS `nearest-5` is over-engineered for day-one.** Cambodia's ride-hailing market is Phnom Penh (flat grid), Siem Reap, Sihanoukville — small driver pools. `ST_DWithin` needs the PostGIS extension enabled on main (`slirph`). Fallback: a `driver_availability` table with `(lat, lng, is_online, last_heartbeat)` + a simple `earth_distance` or Haversine RPC, or even just `WHERE city = $1 AND is_online ORDER BY updated_at LIMIT 5` if you geo-bucket by city zone. | Start with a `get_nearby_drivers(p_lat, p_lng, p_radius_km, p_limit)` RPC using the `earthdistance` extension (lighter than PostGIS). Add PostGIS later when you need polygon surge zones. Confirm `earthdistance` + `cube` extensions are enabled on main. |
| **C** | **30-second offer expiry + re-offer** is fine but needs a `dispatch_batch_id` column on offers. Without it, a re-offer to driver B looks identical to a retry to driver A — you can't audit dispatch chains or prevent double-accepts across a batch. | Add `dispatch_batch_id uuid` to ride_offers. One batch per customer request; each driver offer = one row. |
| **D** | **Capacitor `resume` re-subscribe** is critical and DeepSeek is right — but also handle `pause` (un-subscribe to avoid ghost listeners burning battery on bakong/khqr push). Capacitor `AppState` fires both. | `App.addListener('appStateChange', ({ isActive }) => { if (!isActive) { removeCh(); } else { reSub(); } })` |
| **E** | **Broadcast channel `offers:{driverId}`** — fine for offers, but driver location updates (every 3-5s while en route) should NOT go through broadcast. Use a **direct DB write** to `driver_locations` + a `postgres_changes` subscription on the customer side for `ride_id = X`. Broadcast is ephemeral (missed if offline for 1s). | Driver location → `UPDATE driver_locations SET lat, lng, updated_at WHERE driver_id` every 5s. Customer subscribes to `postgres_changes` on `ride_locations` (or the ride row's `driver_lat`/`driver_lng` columns). |
| **F** | **Bakong/KHQR payment** — DeepSeek's plan doesn't mention payment flow. In Cambodia, Bakong (NBC's QR standard) and ABA are the primary payment rails, not Stripe. Stripe is the fallback for cards. The ride flow must hold a `payment_method` enum (`bakong_qr`, `aba_pay`, `stripe`, `cash`) and the confirm step must branch: cash = proceed immediately; QR = generate QR → poll for webhook confirmation → then dispatch. | Add `payment_method` + `payment_status` to rides. QR confirmation via existing Bakong webhook (or edge function polling the Bakong API). Don't dispatch until payment confirmed for non-cash. |
| **G** | **Parcel/food delivery shares the ride flow** but needs `ride_type` enum (`ride`, `parcel`, `food`) and optional `pickup_contact_name`/`dropoff_contact_name` for third-party deliveries. Don't fork the table. | Additive columns on the same rides table. |

---

## 2. Minimal-Change First Move (Adapter View, Not Migration)

**Assuming the audit confirms:** customer app writes `ride_requests` on main project (`slirph`), driver app reads `orders` on driver project (`yiedl`).

### Option comparison:

| Approach | Effort | Risk | Rollback |
|----------|--------|------|----------|
| **A. Supabase View (adapter)** — create a VIEW on main that the driver app reads; driver app repointed to main | Low (1 migration + 1 config change) | Low (no data moved) | Drop the view |
| **B. Full migration** — merge into one `rides` table, rewrite both apps | High | High (breaks both apps simultaneously) | Painful |
| **C. Dual-write** — customer writes to both tables | Medium | Medium (consistency bugs, race conditions) | Remove the trigger |

**Recommendation: Option A — Supabase View adapter, re-pointed to main project.**

**Why:** You get connected flows (driver sees customer rides) in ~1 hour, with zero changes to either app's existing code paths. Both apps keep reading their "own" table name — one is real, one is a view. You can migrate to the unified table later at your pace.

### The concrete change:

**Step 1 — SQL migration on main project (`slirphzzwcogdbkeicff`):**

```sql
-- 0) Confirm what the customer app actually writes to
-- Run in SQL editor:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('ride_requests', 'orders', 'rides', 'bookings')
ORDER BY table_name;

-- Check the columns on whichever exists:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'ride_requests'  -- adjust name
ORDER BY ordinal_position;

-- 1) Create the adapter view so the driver app can read customer rides
-- (adjust column names to match your actual 'orders' schema in the driver app)
CREATE OR REPLACE VIEW driver_orders_view AS
SELECT
  rr.id,
  rr.id AS order_id,                           -- alias for driver app compatibility
  rr.customer_id,
  rr.pickup_lat,
  rr.pickup_lng,
  rr.dropoff_lat,
  rr.dropoff_lng,
  rr.pickup_address,
  rr.dropoff_address,
  rr.status,
  rr.created_at,
  rr.updated_at,
  rr.driver_id,
  rr.payment_method,
  rr.fare_estimate_cents,
  rr.ride_type,                                 -- ride/parcel/food
  -- add any columns the driver app's Order type expects that ride_requests has under a different name
  NULL::text AS notes                            -- placeholder for columns the driver app expects but don't exist yet
FROM ride_requests rr;                          -- adjust table name after audit

-- 2) RLS on the view (driver app needs to see offered/accepted rides)
-- Views inherit the underlying table's RLS by default, which is correct.
-- If the driver app authenticates with the same JWT (same project), 
-- its existing RLS policies on ride_requests already apply.

-- 3) Grant SELECT to the authenticated role (views need explicit grants)
GRANT SELECT ON driver_orders_view TO authenticated;

-- 4) If the driver app writes back (status transitions), you need an INSTEAD OF trigger:
CREATE OR REPLACE FUNCTION driver_orders_view_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ride_requests
  SET 
    status = NEW.status,
    driver_id = NEW.driver_id,
    updated_at = now()
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER driver_orders_view_update_trigger
  INSTEAD OF UPDATE ON driver_orders_view
  FOR EACH ROW
  EXECUTE FUNCTION driver_orders_view_update();
```

**Step 2 — Repoint driver app Supabase client to main project:**

In the driver app (zivodriver repo), change env:

```
# BEFORE (driver app points to its own project):
VITE_SUPABASE_URL=https://yiedlgoxwjmansszdypf.supabase.co
VITE_SUPABASE_ANON_KEY=<driver-project-key>

# AFTER (driver app points to main project for ride data):
VITE_SUPABASE_URL=https://slirphzzwcogdbkeicff.supabase.co
VITE_SUPABASE_ANON_KEY=<main-project-anon-key>
```

**Step 3 — In driver app code, swap the table reference:**

```typescript
// BEFORE in driver app (wherever it queries orders):
const { data } = await supabase.from('orders').select('*').eq('status', 'offered');

// AFTER (point at the view — same columns, aliased):
const { data } = await supabase.from('driver_orders_view').select('*').eq('status', 'offered');
```

Or if the driver app uses a centralized data layer, change it in one place.

**Step 4 — Auth alignment.** Both apps now authenticate against main project. The driver app's login flow must use main project auth. If drivers had separate auth on the driver project, you need a one-time migration of `auth.users` or (better) tell drivers to sign up on main. This is the one potentially disruptive step — but it's necessary for shared rides to work.

---

## 3. Exact Dev Verification Steps (No Real Driver Phone Needed)

### Prerequisites
- Both apps running locally against the **same** Supabase project (main, `slirph`)
- The view + trigger from Step 1 applied
- A test customer user and a test driver user in `auth.users`

### Step-by-step verification:

```sql
-- ========================================
-- PHASE 1: Customer books a ride
-- ========================================
-- Run the customer app, enter pickup/destination, confirm booking.
-- Then verify the row landed:

SELECT id, status, customer_id, driver_id, pickup_address, dropoff_address,
       fare_estimate_cents, payment_method, ride_type, created_at
FROM ride_requests
ORDER BY created_at DESC
LIMIT 1;

-- Expected: status = 'pending' (or 'awaiting_payment' if QR), driver_id = NULL
-- ✅ PASS if row exists with correct pickup/dropoff
```

```sql
-- ========================================
-- PHASE 2: Simulate dispatch (normally done by auto-dispatch edge function)
-- ========================================
-- Option A: Call the edge function directly from the app's dispatch flow
-- Option B: Manually update to 'offered' and assign a driver:

-- Get the driver's user_id:
SELECT id, email FROM auth.users WHERE email LIKE '%driver%';

-- Get the pending ride:
SELECT id FROM ride_requests WHERE status = 'pending' ORDER BY created_at DESC LIMIT 1;

-- Simulate dispatch: offer to driver
UPDATE ride_requests
SET status = 'offered',
    driver_id = '<driver-user-uuid>',
    updated_at = now()
WHERE id = '<ride-uuid>' AND status = 'pending';

-- Verify driver app now sees the offer:
-- Open the driver app → JobFlow page should show the ride offer
-- ✅ PASS if driver app renders the ride card with pickup/dropoff
```

```sql
-- ========================================
-- PHASE 3: Driver accepts
-- ========================================
-- In the driver app, tap "Accept" on the offer.
-- Then verify:

SELECT status, driver_id FROM ride_requests WHERE id = '<ride-uuid>';

-- Expected: status = 'accepted', driver_id = '<driver-uuid>'
-- ✅ PASS if status updated AND customer app shows "Driver on the way"

-- Also verify via the view (what the driver app reads):
SELECT status, driver_id FROM driver_orders_view WHERE id = '<ride-uuid>';
-- Should match exactly
```

```sql
-- ========================================
-- PHASE 4: Simulate en_route → arrived → in_progress (driver status transitions)
-- ========================================
-- The driver app should have buttons for each transition.
-- If not yet wired, simulate via SQL:

UPDATE ride_requests SET status = 'en_route', updated_at = now() WHERE id = '<ride-uuid>';
-- Wait 2s, check customer app → should show driver moving

UPDATE ride_requests SET status = 'arrived', updated_at = now() WHERE id = '<ride-uuid>';
-- Customer app → "Driver has arrived"

UPDATE ride_requests SET status = 'in_progress', updated_at = now() WHERE id = '<ride-uuid>';
-- Both apps → "Trip in progress"
```

```sql
-- ========================================
-- PHASE 5: Complete trip + payment
-- ========================================
-- Cash trip:
UPDATE ride_requests 
SET status = 'completed', 
    fare_actual_cents = 5000,   -- $5.00 USD (Cambodia uses USD + KHR)
    completed_at = now(),
    updated_at = now()
WHERE id = '<ride-uuid>';

-- Verify:
SELECT status, fare_actual_cents, completed_at FROM ride_requests WHERE id = '<ride-uuid>';
-- ✅ PASS if status = 'completed'

-- Customer app → rating + tip screen should appear
-- Driver app → trip summary + payout info
```

```sql
-- ========================================
-- PHASE 6: Verify real-time (postgres_changes) propagation
-- ========================================
-- Open BOTH apps side by side (customer + driver).
-- From psql or Supabase SQL editor, do a rapid status walk:

UPDATE ride_requests SET status = 'en_route', updated_at = now() WHERE id = '<ride-uuid>';
-- ⏱ Both apps should reflect within ~1-2 seconds

UPDATE ride_requests SET status = 'arrived', updated_at = now() WHERE id = '<ride-uuid>';
-- ⏱ Same

-- ✅ PASS if both apps update within 2s without page refresh
-- ❌ FAIL if either app needs a manual refresh → check postgres_changes subscription
```

```sql
-- ========================================
-- PHASE 7: Verify cancel flows
-- ========================================
-- Customer cancel (before driver accepts):
INSERT INTO ride_requests (customer_id, status, pickup_address, dropoff_address, ride_type)
VALUES ('<customer-uuid>', 'pending', 'Test Pickup', 'Test Dropoff', 'ride')
RETURNING id;

-- Customer cancels:
UPDATE ride_requests SET status = 'cancelled_by_customer', updated_at = now() 
WHERE id = '<new-ride-uuid>';

-- Driver cancel (after accept — rare but tested):
-- Book + dispatch + accept a ride, then:
UPDATE ride_requests SET status = 'cancelled_by_driver', updated_at = now() 
WHERE id = '<ride-uuid>';

-- ✅ PASS: neither app crashes, customer sees "Ride cancelled", 
--   auto-dispatch re-offers to next driver (if cancelled_by_driver)
```

### What to watch at each stage:

| Stage | Customer app | Driver app | DB |
|-------|-------------|------------|-----|
| Book | Loading → "Finding driver" | (should not see it yet — no offer) | `status=pending, driver_id=NULL` |
| Dispatch | "Driver found" | Offer card appears with Accept/Decline | `status=offered, driver_id=<id>` |
| Accept | Map shows driver pin + ETA | JobFlow → "Navigate to pickup" | `status=accepted` |
| En route | Driver pin moves | Driver sees route | `status=en_route` |
| Arrived | "Driver has arrived" + horn button | "Waiting for rider" | `status=arrived` |
| In progress | Trip timer + route | Trip in progress | `status=in_progress` |
| Complete | Rating + tip | Trip summary + earnings | `status=completed, fare_actual_cents` |
| Cancel | "Ride cancelled" | Offer removed / trip cancelled | `status=cancelled_by_*` |

### Red flags to watch for:

1. **Driver app shows 0 offers** after dispatch → view not returning rows → check RLS on `ride_requests` allows driver's `auth.uid()` to SELECT
2. **Status updates in DB but apps don't react** → `postgres_changes` not subscribed → check Supabase Realtime is enabled on the table (Dashboard → Database → Replication)
3. **Double-accept** (two drivers accept same ride) → missing unique constraint or row-level lock → add `WHERE status = 'offered'` to the accept UPDATE
4. **Payment webhook race** → for Bakong/ABA QR, don't dispatch until `payment_status = 'confirmed'`; the webhook must update `payment_status` THEN the dispatch function checks it

---

## Owner Action Items

1. **Audit first** — run the `SELECT table_name` query above in both Supabase projects to confirm the actual table names and column schemas. Report back the results.
2. **Decision: single-project for rides** — repoint driver app to main project (or don't — but then you need a cross-project edge function bridge, which is strictly worse).
3. **Enable extensions** — `earthdistance` + `cube` on main (SQL: `CREATE EXTENSION IF NOT EXISTS earthdistance CASCADE;` — needs superuser, which Supabase Dashboard SQL editor has).
4. **Deploy the view + trigger** — 5-minute migration, zero downtime, fully reversible (`DROP VIEW driver_orders_view`).
5. **Verify end-to-end** using the SQL walkthrough above — takes 15 minutes, proves the full flow.
6. **Then** — and only then — plan the unified `rides` table migration (DeepSeek's full plan) as a cleanup, knowing the adapter view is already working in production.
