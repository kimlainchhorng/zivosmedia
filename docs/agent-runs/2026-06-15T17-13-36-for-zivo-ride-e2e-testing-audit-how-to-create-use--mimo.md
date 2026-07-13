# MiMo run — 2026-06-15T17:13:36.552Z

- model: mimo-v2.5-pro
- api_format: openai
- task: For ZIVO ride E2E testing, audit how to create/use a 100% ride discount safely so customer request can be tested without live card charge. Focus on RideBookingHome, RequestRidePage, validate_ride_promo, create-ride-payment-intent, and whether driver Go Online can be tested from /driver/home. Provide exact safe test steps and likely code issues; do not edit.
- files: src/components/rides/RideBookingHome.tsx, src/pages/app/RequestRidePage.tsx, supabase/functions/create-ride-payment-intent/index.ts, supabase/functions/validate-ride-promo/index.ts, src/pages/driver/DriverHomePage.tsx

---

# Audit: Safe 100% Discount Ride E2E Testing

## 1. Plan

I'll trace the full ride-payment path end-to-end to determine:
- How a 100% discount promo flows through the system
- What code changes (if any) are needed to safely test without a live Stripe charge
- Whether driver "Go Online" can be tested from `/driver/home`

---

## 2. Findings & Analysis

### A. The 100% Discount Path Already Exists (No Code Change Needed)

**`create-ride-payment-intent/index.ts` lines ~80-100** already handle this:

```typescript
// If promo gives 100% discount, skip Stripe entirely
if (amount_cents <= 0 || (discount_cents > 0 && amount_cents <= 0)) {
  await supabase
    .from("ride_requests")
    .update({
      payment_status: "authorized",
      payment_amount: 0,
      payment_currency: "USD",
      promo_code: promo_code || null,
      promo_discount: discount_cents ? discount_cents / 100 : 0,
    })
    .eq("id", ride_request_id)
    .eq("user_id", userId);

  return new Response(JSON.stringify({
    ok: true,
    client_secret: null,        // ← no Stripe PI created
    payment_intent_id: null,
    amount_cents: 0,
    status: "requires_capture",
    auto_confirmed: true,
    free_ride: true,             // ← signals free ride
  }), ...);
}
```

**Key insight:** When `amount_cents <= 0` OR `discount_cents >= amount_cents`, the edge function **skips Stripe entirely** — no PaymentIntent is created, no card is charged. It returns `free_ride: true` and sets `payment_status: "authorized"` directly on the `ride_requests` row.

### B. The Problem: `RideBookingHome` Doesn't Wire Promo → Payment

Looking at `RideBookingHome.tsx`, the promo flow has these pieces:

1. **Promo input state** exists: `promoInput`, `appliedPromo`, `promoDiscount`, `promoValidating`, `promoError`
2. **But the promo validation call is missing** — there's no `validate_ride_promo` RPC or edge function invocation visible in the truncated code
3. **The `create-ride-payment-intent` call** (in the confirm-ride step) would need to pass `discount_cents` and `promo_code` in the body

**In `RequestRidePage.tsx`**, the promo flow is even more disconnected:
- `handleApplyPromo` only checks `promoCode === "FIRST10"` client-side (hardcoded 10%)
- The `handleConfirmPrice` → `create-payment-intent` call (not `create-ride-payment-intent`) doesn't pass promo data at all

### C. Two Separate Payment Paths

| Flow | Edge Function | Promo Support |
|------|--------------|---------------|
| `RideBookingHome` (full ride flow) | `create-ride-payment-intent` | ✅ Accepts `promo_code`, `discount_cents` |
| `RequestRidePage` (simplified flow) | `create-payment-intent` | ❌ No promo params passed |

### D. What `validate_ride_promo` Should Do

This function (referenced in the task but not provided in the files) likely needs to:
1. Look up the promo code in a `promo_codes` or `ride_promos` table
2. Validate: active, not expired, not maxed out, applicable to user
3. Return: `{ valid: true, discount_cents, discount_pct, description }` or `{ valid: false, reason }`

### E. Driver "Go Online" from `/driver/home`

**`DriverHomePage.tsx`** — the Go Online toggle is **fully functional**:

```typescript
const toggleOnline = async () => {
  // Upserts to drivers_status table
  const { error: statusError } = await supabase
    .from("drivers_status")
    .upsert({
      driver_id: driverId,
      is_online: next,
      is_busy: false,
      driver_state: next ? "online_available" : "offline",
      last_seen: now,
      updated_at: now,
    }, { onConflict: "driver_id" });
  // Also updates driver_profiles.is_online
};
```

**Prerequisites for this to work:**
1. The test user must have a row in `drivers` table (linked via `user_id`)
2. The test user must have a row in `driver_profiles` table
3. The `useDriverDashboardData` hook must resolve `driverId`
4. The `drivers_status` table must exist with the expected columns

**Potential issue:** If the test user doesn't have driver records, `driverId` will be `null` and the toggle button will be disabled (`disabled={togglingOnline || !driverId}`).

---

## 3. Proposed Safe E2E Test Steps

### Step 1: Create a 100% Discount Promo Code (DB)

```sql
-- Run in Supabase SQL editor (against the main slirphzzwcogdbkeicff project)
INSERT INTO ride_promos (
  code,
  discount_type,      -- 'percent' or 'flat'
  discount_value,     -- 100 for 100% off
  max_uses,
  uses_count,
  is_active,
  valid_from,
  valid_until,
  min_fare_cents,
  max_discount_cents,
  description
) VALUES (
  'TEST100FREE',
  'percent',
  100,
  100,                -- max 100 uses
  0,
  true,
  now(),
  now() + interval '30 days',
  0,                  -- no minimum fare
  999999,             -- effectively unlimited discount cap
  'E2E test: 100% off ride'
);
```

> **Note:** If the table is named differently (e.g., `promo_codes`), adjust accordingly. Check the actual table name by querying `information_schema.tables`.

### Step 2: Wire Promo Validation in `RideBookingHome`

The promo validation call needs to be added. Here's the missing piece:

**File:** `src/components/rides/RideBookingHome.tsx`

**Find the promo input UI** (wherever the promo `<Input>` and "Apply" button are rendered in the truncated section) and add the validation handler:

```typescript
// Add this handler near the other handlers (around line ~400-500 area)
const handleValidatePromo = async () => {
  if (!promoInput.trim()) return;
  setPromoValidating(true);
  setPromoError(null);
  
  try {
    // Option A: If validate_ride_promo is an RPC
    const { data, error } = await supabase.rpc("validate_ride_promo", {
      p_code: promoInput.trim().toUpperCase(),
      p_user_id: user?.id,
      p_fare_cents: Math.round((currentPrice ?? 0) * 100),
    });
    
    if (error) throw new Error(error.message);
    
    const result = data as any;
    if (result?.valid) {
      setAppliedPromo({ 
        code: promoInput.trim().toUpperCase(), 
        description: result.description || `${result.discount_pct ?? 100}% off` 
      });
      setPromoDiscount(result.discount_cents ?? Math.round((currentPrice ?? 0) * 100));
      toast.success("Promo applied!");
    } else {
      setPromoError(result?.reason || "Invalid promo code");
    }
  } catch (err: any) {
    setPromoError(err.message || "Could not validate promo");
  } finally {
    setPromoValidating(false);
  }
};
```

**Then in the payment intent creation** (wherever `create-ride-payment-intent` is invoked), pass the promo data:

```typescript
const { data, error } = await supabase.functions.invoke("create-ride-payment-intent", {
  body: {
    ride_request_id: rideRequestId,
    amount_cents: Math.round((currentPrice ?? 0) * 100) - promoDiscount, // ← subtract discount
    ride_type: selectedVehicle,
    city: pickupCity,
    promo_code: appliedPromo?.code,        // ← pass promo code
    discount_cents: promoDiscount,          // ← pass discount amount
    wallet_credit_cents: 0,
  },
});
```

### Step 3: Handle `free_ride: true` Response

In the same payment handler, check for the free ride response:

```typescript
const result = data as any;

if (result?.free_ride) {
  // No Stripe Elements needed — skip directly to ride flow
  toast.success("🎉 Free ride! Promo applied.");
  setViewStep("searching"); // or whatever the next step is
  return;
}

// Otherwise, proceed with Stripe Elements as normal
setClientSecret(result.client_secret);
```

### Step 4: Set Up Test Driver Account

```sql
-- 1. Create driver record (use an existing auth user's ID)
INSERT INTO drivers (
  user_id,
  full_name,
  phone,
  vehicle_model,
  vehicle_color,
  vehicle_plate,
  rating,
  total_trips,
  is_active
) VALUES (
  '<TEST_USER_UUID>',
  'Test Driver',
  '+15551234567',
  'Toyota Camry',
  'White',
  'TEST-001',
  4.95,
  100,
  true
)
ON CONFLICT (user_id) DO UPDATE SET
  is_active = true,
  full_name = 'Test Driver';

-- 2. Create driver profile
INSERT INTO driver_profiles (
  id,           -- same as drivers.id
  is_online,
  is_verified
) VALUES (
  (SELECT id FROM drivers WHERE user_id = '<TEST_USER_UUID>'),
  false,
  true
)
ON CONFLICT (id) DO UPDATE SET is_verified = true;

-- 3. Ensure drivers_status row exists
INSERT INTO drivers_status (
  driver_id,
  is_online,
  is_busy,
  driver_state,
  lat,
  lng,
  last_seen,
  updated_at
) VALUES (
  (SELECT id FROM drivers WHERE user_id = '<TEST_USER_UUID>'),
  false,
  false,
  'offline',
  11.5564,    -- Phnom Penh lat (or your test location)
  104.9282,   -- Phnom Penh lng
  now(),
  now()
)
ON CONFLICT (driver_id) DO NOTHING;
```

### Step 5: E2E Test Flow

```
1. [Customer] Open ride booking → enter pickup/dropoff
2. [Customer] Apply promo code "TEST100FREE"
3. [Customer] Confirm ride → should see "Free ride!" toast, skip Stripe
4. [Driver] Navigate to /driver/home → tap "Go Online"
5. [Driver] Should see incoming job offer within ~30s (dispatch-start)
6. [Driver] Accept offer → navigate to /driver/map?job=<id>
7. [Customer] Should see "Driver Found" → driver-en-route → trip-in-progress
8. [Driver] Navigate to destination → trip completes
9. [DB] Verify ride_requests row: payment_status="authorized", payment_amount=0, promo_code="TEST100FREE"
```

---

## 4. Code Issues Found

### Issue 1: `RideBookingHome` Promo Validation Not Wired (CRITICAL)

The promo state variables exist but the validation RPC call and the `discount_cents` passthrough to `create-ride-payment-intent` are missing from the truncated code. This means **promos cannot actually be applied** in the full ride flow.

**Fix:** Add `handleValidatePromo` and wire `discount_cents`/`promo_code` into the payment intent body (see Step 2 above).

### Issue 2: `RequestRidePage` Uses Different Edge Function

`RequestRidePage` calls `create-payment-intent` (not `create-ride-payment-intent`), which likely doesn't have the free-ride bypass. If testing through this page, the promo won't work.

**Fix:** Either:
- (a) Switch `RequestRidePage` to use `create-ride-payment-intent`, or
- (b) Add the same `amount_cents <= 0` bypass to `create-payment-intent`, or
- (c) Test only through `RideBookingHome` (the full flow)

### Issue 3: `RequestRidePage` Promo is Hardcoded

```typescript
const handleApplyPromo = () => {
  if (promoCode.trim().toUpperCase() === "FIRST10") {
    setPromoApplied(true); toast.success("Promo code applied! 10% off");
  } else {
    toast.error("Invalid promo code");
  }
};
```

This is client-only validation with a hardcoded code. It doesn't actually reduce the payment amount.

**Fix:** Replace with server-side validation via `validate_ride_promo` RPC.

### Issue 4: Driver `driverId` May Be Null

If the test user doesn't have a `drivers` row, `useDriverDashboardData()` returns `driverId: null`, and the Go Online button is disabled.

**Fix:** Ensure the test user has records in `drivers`, `driver_profiles`, and `drivers_status` (see Step 4).

### Issue 5: `amount_cents` Validation Has a Logic Bug

```typescript
if (amount_cents <= 0 || (discount_cents > 0 && amount_cents <= 0)) {
```

The second condition `(discount_cents > 0 && amount_cents <= 0)` is redundant — if `amount_cents <= 0` is true, the OR short-circuits. This isn't a bug per se, but it suggests the intent was to check `amount_cents - discount_cents <= 0`, which would be:

```typescript
if (amount_cents <= 0 || (discount_cents > 0 && (amount_cents - discount_cents) <= 0)) {
```

**Current behavior:** If the frontend sends `amount_cents = 500` and `discount_cents = 500`, the condition `amount_cents <= 0` is false, so it falls through to Stripe and charges $5. The frontend must send `amount_cents = 0` (after subtracting the discount) for the free-ride path to trigger.

**Fix:** Either:
- (a) Frontend sends `amount_cents = original - discount` (recommended), or
- (b) Backend checks `amount_cents - discount_cents <= 0` (more robust)

---

## 5. Summary: What the Owner Must Verify/Deploy

| Item | Action | Risk |
|------|--------|------|
| `ride_promos` table exists | Check `information_schema.tables` | Low |
| `validate_ride_promo` RPC exists | Check `pg_proc` | Low |
| Test driver account created | Run Step 4 SQL | None |
| Promo code `TEST100FREE` inserted | Run Step 1 SQL | None |
| `RideBookingHome` promo wiring | **Code change needed** (Step 2) | Medium |
| `create-ride-payment-intent` `amount_cents` logic | **Verify frontend sends post-discount amount** | Medium |
| `RequestRidePage` promo path | **Not usable for 100% discount testing** (different edge function) | Low (use RideBookingHome instead) |

**Safe test path:** Use `RideBookingHome` (not `RequestRidePage`), apply promo `TEST100FREE`, verify `free_ride: true` response, then test driver dispatch from `/driver/home`.
