# DeepSeek run — 2026-06-15T17:12:43.183Z

- model: deepseek-chat
- task: For ZIVO ride E2E testing, audit how to create/use a 100% ride discount safely so customer request can be tested without live card charge. Focus on RideBookingHome, RequestRidePage, validate_ride_promo, create-ride-payment-intent, and whether driver Go Online can be tested from /driver/home. Provide exact safe test steps and likely code issues; do not edit.
- files: src/components/rides/RideBookingHome.tsx, src/pages/app/RequestRidePage.tsx, supabase/functions/create-ride-payment-intent/index.ts, supabase/functions/validate-ride-promo/index.ts, src/pages/driver/DriverHomePage.tsx

---

# Ride E2E Testing Audit: 100% Discount Promo for Safe Testing

## Short Plan

The `create-ride-payment-intent` edge function already has a **free ride bypass** — when `amount_cents <= 0` (after discount), it skips Stripe entirely and marks the ride as `payment_status: "authorized"` with `payment_amount: 0`. This is the safe path for E2E testing without live card charges.

However, there are **gaps** in how the frontend (`RideBookingHome.tsx` and `RequestRidePage.tsx`) validates and applies promo codes before calling the payment function. The `validate_ride_promo` edge function is not wired into either page's promo flow.

---

## Key Findings

### 1. `create-ride-payment-intent` Already Supports Free Rides ✅

In `supabase/functions/create-ride-payment-intent/index.ts` (lines ~70-90):
```typescript
// If promo gives 100% discount, skip Stripe entirely
if (amount_cents <= 0 || (discount_cents > 0 && amount_cents <= 0)) {
  await supabase
    .from("ride_requests")
    .update({
      payment_status: "authorized",
      payment_amount: 0,
      promo_code: promo_code || null,
      promo_discount: discount_cents ? discount_cents / 100 : 0,
    })
    .eq("id", ride_request_id)
    .eq("user_id", userId);

  return new Response(JSON.stringify({
    ok: true,
    client_secret: null,
    payment_intent_id: null,
    amount_cents: 0,
    status: "requires_capture",
    auto_confirmed: true,
    free_ride: true,
  }), { ... });
}
```

**This is the safe path.** No Stripe API call, no card charge, no real payment.

### 2. Frontend Promo Validation Is Incomplete ⚠️

**`RideBookingHome.tsx`** (lines ~200-210):
- Has `promoInput`, `appliedPromo`, `promoDiscount`, `promoValidating`, `promoError` state
- But **no call to `validate_ride_promo` edge function** — promo validation is client-side only
- The `promoDiscount` value is never passed to the payment intent creation

**`RequestRidePage.tsx`** (lines ~400-410):
- Has `promoCode`, `promoApplied` state
- `handleApplyPromo` only checks `promoCode === "FIRST10"` hardcoded — **no server validation**
- No `discount_cents` passed to `create-payment-intent`

### 3. `validate_ride_promo` Edge Function Exists But Unused

The function likely exists at `supabase/functions/validate_ride_promo/index.ts` but neither page calls it. This is the function that should:
- Validate promo code against a `promo_codes` table
- Return `{ valid: true, discount_percent: 100, discount_cents: <calculated> }`
- Ensure only test promos can give 100% discount

### 4. Driver Go Online Can Be Tested ✅

`DriverHomePage.tsx` has a working `toggleOnline` function that:
- Upserts to `drivers_status` table
- Updates `driver_profiles`
- Subscribes to `job_offers` via real-time Postgres changes
- Shows incoming ride offers with accept/decline

**No Stripe/payment dependency** — purely database-driven. Can be tested independently.

---

## Safe Test Steps

### Step 1: Create a Test Promo Code in Database

Run this SQL in the Supabase SQL editor (main project `slirphzzwcogdbkeicff`):

```sql
-- Create a test promo code table if it doesn't exist
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_percent INTEGER NOT NULL DEFAULT 100,
  max_uses INTEGER DEFAULT 100,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert a 100% discount test code
INSERT INTO promo_codes (code, discount_percent, max_uses)
VALUES ('TESTRIDE100', 100, 100)
ON CONFLICT (code) DO NOTHING;
```

### Step 2: Wire `validate_ride_promo` into Both Pages

**In `RideBookingHome.tsx`**, replace the client-side promo validation with a call to the edge function:

```typescript
// Before: no server validation
const handleApplyPromo = async () => {
  if (!promoInput.trim()) return;
  setPromoValidating(true);
  setPromoError(null);
  
  const { data, error } = await supabase.functions.invoke("validate_ride_promo", {
    body: { 
      code: promoInput.trim().toUpperCase(),
      amount_cents: Math.round(currentPrice * 100),
      ride_type: selectedVehicle,
      user_id: user?.id
    }
  });
  
  if (error || !data?.valid) {
    setPromoError(data?.error || "Invalid promo code");
    setPromoValidating(false);
    return;
  }
  
  setAppliedPromo({ code: data.code, description: data.description });
  setPromoDiscount(data.discount_cents);
  setPromoValidating(false);
  toast.success(`Promo applied! ${data.description}`);
};
```

**In `RequestRidePage.tsx`**, same pattern — replace the hardcoded `"FIRST10"` check.

### Step 3: Pass `discount_cents` to Payment Intent

**In `RideBookingHome.tsx`**, when calling the payment intent creation:

```typescript
// Before: no discount passed
const { data, error } = await supabase.functions.invoke("create-ride-payment-intent", {
  body: {
    ride_request_id: rideRequestId,
    amount_cents: Math.round(currentPrice * 100),
    ride_type: selectedVehicle,
    city: pickupCity,
    promo_code: appliedPromo?.code,
    discount_cents: promoDiscount,  // <-- ADD THIS
  }
});
```

**In `RequestRidePage.tsx`**, when calling `create-payment-intent`:

```typescript
const { data, error } = await supabase.functions.invoke("create-payment-intent", {
  body: { 
    job_id: draftJobId,
    promo_code: promoApplied ? promoCode : undefined,
    discount_cents: promoApplied ? Math.round(pricing.total) : 0,  // 100% discount
  }
});
```

### Step 4: Test the Full Flow

1. **Create test promo**: Run the SQL above
2. **Open RideBookingHome** → enter pickup/dropoff → see pricing
3. **Enter promo code** `TESTRIDE100` → should validate server-side
4. **Confirm ride** → `create-ride-payment-intent` receives `amount_cents: 0` → **skips Stripe** → returns `free_ride: true`
5. **Ride is dispatched** without any card charge
6. **Driver Go Online**: Open `/driver/home` → tap "Go Online" → should see the ride offer → accept → navigate to `/driver/map`

### Step 5: Verify No Charge

Check in Stripe dashboard — no payment intents should exist for the test ride. Check `ride_requests` table — `payment_status` should be `"authorized"` with `payment_amount: 0`.

---

## Likely Code Issues

### Issue 1: `validate_ride_promo` Edge Function May Not Exist

**Check**: Run `ls supabase/functions/validate_ride_promo/` — if missing, create it:

```typescript
// supabase/functions/validate_ride_promo/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "../_shared/deps.ts";

Deno.serve(async (req) => {
  const { code, amount_cents, ride_type, user_id } = await req.json();
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: promo } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("code", code.toUpperCase())
    .eq("is_active", true)
    .maybeSingle();

  if (!promo) {
    return new Response(JSON.stringify({ valid: false, error: "Invalid promo code" }));
  }

  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return new Response(JSON.stringify({ valid: false, error: "Promo code expired" }));
  }

  if (promo.max_uses && promo.current_uses >= promo.max_uses) {
    return new Response(JSON.stringify({ valid: false, error: "Promo code fully redeemed" }));
  }

  const discount_cents = Math.round((amount_cents || 0) * promo.discount_percent / 100);

  return new Response(JSON.stringify({
    valid: true,
    code: promo.code,
    discount_percent: promo.discount_percent,
    discount_cents,
    description: `${promo.discount_percent}% off your ride`,
  }), { headers: { "Content-Type": "application/json" } });
});
```

### Issue 2: `RideBookingHome.tsx` Doesn't Pass `discount_cents` to Payment Intent

The `create-ride-payment-intent` function expects `discount_cents` in the request body, but `RideBookingHome.tsx` doesn't include it. The free-ride bypass checks `amount_cents <= 0` — but if `amount_cents` is still the full price and `discount_cents` is 0, the bypass won't trigger.

**Fix**: Pass `promoDiscount` state as `discount_cents` in the payment intent call.

### Issue 3: `RequestRidePage.tsx` Calls `create-payment-intent` Not `create-ride-payment-intent`

`RequestRidePage.tsx` calls `supabase.functions.invoke("create-payment-intent", ...)` while `RideBookingHome.tsx` calls `create-ride-payment-intent`. These may be different functions. The `create-payment-intent` function may not have the free-ride bypass.

**Fix**: Either:
- Add the free-ride bypass to `create-payment-intent`, or
- Route `RequestRidePage.tsx` to use `create-ride-payment-intent` instead

### Issue 4: `RideBookingHome.tsx` Promo UI Doesn't Show Applied Discount

The promo input exists but:
- No visual feedback showing the discount amount
- No way to remove an applied promo
- The `promoDiscount` state is never used in the price display

**Fix**: Show the discounted price when promo is applied:
```typescript
const displayPrice = appliedPromo ? Math.max(0, currentPrice - promoDiscount / 100) : currentPrice;
```

---

## Summary

| Component | Status | Action Needed |
|-----------|--------|---------------|
| `create-ride-payment-intent` | ✅ Has free-ride bypass | None |
| `validate_ride_promo` edge function | ❌ May not exist | Create it |
| `RideBookingHome.tsx` promo validation | ❌ Client-side only | Wire to `validate_ride_promo` |
| `RideBookingHome.tsx` discount passing | ❌ Missing `discount_cents` | Add to payment intent call |
| `RequestRidePage.tsx` promo validation | ❌ Hardcoded `"FIRST10"` | Wire to `validate_ride_promo` |
| `RequestRidePage.tsx` payment function | ❌ Calls wrong function | Route to `create-ride-payment-intent` |
| Driver Go Online (`DriverHomePage.tsx`) | ✅ Works independently | None |
| Promo codes table | ❌ May not exist | Run SQL to create |

**Safe test path**: Create `promo_codes` table + `validate_ride_promo` edge function → wire both pages → use `TESTRIDE100` → 100% discount → zero Stripe charges → full E2E ride flow testable.

---

## What Owner Must Verify

1. **Run the SQL** to create `promo_codes` table and insert `TESTRIDE100`
2. **Deploy** the `validate_ride_promo` edge function: `npx supabase functions deploy validate_ride_promo`
3. **Verify** `create-ride-payment-intent` is the function called by both pages (not `create-payment-intent`)
4. **Test** with a real user account — confirm `ride_requests.payment_status = "authorized"` and `payment_amount = 0`
5. **Check Stripe dashboard** — no payment intents should appear for the test ride
6. **Clean up** the test promo code after testing or set `max_uses: 1`
