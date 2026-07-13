# MiMo advisor — Workflow-correctness review of the CUSTOMER-FACING car-rental booking detail page (PublicCarRentalBookingDetailPage.tsx). This page is reached via a long-lived emailed/SMS link (/car-rental-booking/:code) and lets the renter self-CANCEL (sets status=cancelled) and self-RESCHEDULE (rewrites pickup/dropoff/rental_days/base_total/total). Focus ONLY on real correctness/safety bugs, not styling. Specifically evaluate: (1) Both supabase .update() calls filter on .eq('id', r.id) with NO status guard — can a customer clobber an already picked_up/returned/cancelled reservation (TOCTOU) because the page state is stale (link left open, second tab, merchant changed status after load)? Should we add .in('status',[...]) + .select() to detect 0-rows-updated and refuse + refresh? (2) Is the error handling adequate (toast.error + dialog stays open + backdrop guarded by !cancelling/!rescheduling + disabled buttons)? (3) Reschedule recomputes total = base + addons + insurance + taxes + fees - discount with taxes/fees held constant while base changes — correctness concern or acceptable by-design? (4) Any other real bug. Rank by severity P0/P1/P2 and give the minimal diff for each real bug only.

Files: /Users/kimlain/Documents/GitHub/zivosmedia/src/pages/car-rental/PublicCarRentalBookingDetailPage.tsx

## Findings

### P0 — TOCTOU: Both `.update()` calls have no status guard

Both cancel and reschedule write to **any** row matching `r.id` regardless of current status. If the page was loaded when status was `confirmed` and a merchant (or second tab) later changed it to `picked_up`, `returned`, or `cancelled`, the customer's click silently overwrites it. No row-count is checked either, so the UI happily reports success.

**Minimal diff (cancel handler, ~line 280):**
```diff
-              const { error: err } = await supabase
+              const { data: updated, error: err } = await supabase
                 .from("car_rental_reservations")
                 .update({
                   status: "cancelled",
                   cancellation_reason: reason,
                   cancelled_at: new Date().toISOString(),
                 } as never)
-                .eq("id", r.id);
+                .eq("id", r.id)
+                .in("status", ["pending", "confirmed"])
+                .select("id");
               setCancelling(false);
               if (err) {
                 toast.error("Couldn't cancel — please contact the rental team directly.");
                 return;
               }
+              if (!updated?.length) {
+                toast.error("The booking status changed — refreshing.");
+                setCancelOpen(false);
+                void lookup(r.confirmation_code);
+                return;
+              }
               toast.success("Booking cancelled");
```

**Minimal diff (reschedule handler, ~line 254):**
```diff
-    const { error: err } = await supabase
+    const { data: updated, error: err } = await supabase
       .from("car_rental_reservations")
       .update({
         pickup_at: newPickup.toISOString(),
         dropoff_at: newDropoff.toISOString(),
         rental_days: rentalDays,
         base_total_cents: newBase,
         total_cents: newTotal,
       } as never)
-      .eq("id", r.id);
+      .eq("id", r.id)
+      .in("status", ["pending", "confirmed"])
+      .select("id");
     setRescheduling(false);
     if (err) {
       toast.error("Couldn't reschedule — please contact the rental team directly.");
       return;
     }
+    if (!updated?.length) {
+      toast.error("The booking status changed — refreshing.");
+      setRescheduleOpen(false);
+      void lookup(r.confirmation_code);
+      return;
+    }
     toast.success("Dates updated");
```

---

### P2 — Reschedule holds taxes/fees constant while base changes

```ts
const newTotal = newBase + r.addons_total_cents + r.insurance_total_cents + r.taxes_cents + r.fees_cents - r.discount_cents;
```

If taxes are percentage-based on the base, a 3→10 day reschedule makes `taxes_cents` materially wrong. This is **acceptable by-design** if taxes/fees are flat per-booking surcharges set by the merchant, but should be documented or (ideally) recomputed server-side via an RPC. No code change needed now — flag for a future server-side reschedule endpoint.

---

### Everything else: solid

- Error handling: `toast.error` + dialog stays open + backdrop guard + disabled buttons — all correct.
- Button/card visibility gated on stale-but-fetched `r.status` — fine since the P0 fix now guards the write.
- Client-side validation (dates, 24h window) — correct.
- No accessibility gaps or missing semantics relevant to correctness.
