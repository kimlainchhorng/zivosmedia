# MiMo run — 2026-06-13T23:16:12.355Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + responsive QA pass on ONE customer-facing page: src/pages/grocery/GroceryOrderTracking.tsx (the LIVE /grocery/track/:orderId order-tracking page — realtime Supabase status, animated 5-step delivery stepper, driver card, ETA countdown, collapsible items list, cancel-order + download-receipt actions). It uses framer-motion motion.div for ENTRANCE animations, but its INTERACTIVE controls are raw <button> elements (NOT motion buttons), so CSS active:scale works on them. Reference standard for interaction tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring). HARD RULE: className and display-only attribute (aria-label, aria-expanded) changes ONLY — do NOT change any supabase query/select, the realtime channel subscription, the cancel-grocery-order or grocery-order-receipt function invokes, navigate targets, useState/handlers, or the stepper/ETA logic. Identify genuine gaps ONLY: (1) raw button/a interactive controls missing focus-visible keyboard rings or press feedback (active:scale); (2) icon-only buttons without aria-label; (3) the collapsible Items toggle missing aria-expanded; (4) responsive crush/overflow at 375px (note the 3-column info-card grid where a long store name could overflow); (5) fetched-but-unused data fields (check the shopping_orders select cols and the drivers_public select cols against what is rendered — e.g. shopping_completed_at, cancelled_at, vehicle_type, current_lat/current_lng); (6) contrast/legibility bugs. ALSO FLAG (do not fix — needs owner): the two driver contact buttons (MessageSquare + Phone, the h-10 w-10 rounded-xl bg-primary/10 buttons in the driver card) have NO onClick handler — they are non-functional. Do NOT touch the shadcn Button components (View My Orders / My Orders / Shop More / Download receipt / Cancel order / Keep order / Cancel and refund) — they already ship the interaction tokens. Be concise; cite exact classNames not line numbers.
- files: src/pages/grocery/GroceryOrderTracking.tsx

---

## Plan

7 interactive-control edits (4 raw buttons get focus-ring + press feedback + aria, 1 items-toggle gets `aria-expanded` + ring, 2 driver contact buttons get `aria-label` to flag the missing handler), 1 responsive truncation fix for the store-name info card, and field flags for the owner.

---

## Proposed diff — `src/pages/grocery/GroceryOrderTracking.tsx`

### Edit 1 — Header back button: press feedback + focus ring + aria-label

```diff
-          <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-muted/40 transition-colors">
+          <button type="button" aria-label="Go back" onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-muted/40 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### Edit 2 — Header copy-order-id button: press feedback + focus ring + aria-label

```diff
-          <button type="button" onClick={copyId} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
+          <button type="button" aria-label="Copy order ID" onClick={copyId} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### Edit 3 — Items toggle button: focus ring + press feedback + aria-expanded + aria-label

```diff
-          <button type="button"
+          <button type="button" aria-label={showItems ? "Collapse items" : "Expand items"} aria-expanded={showItems}
             onClick={() => setShowItems(v => !v)}
-            className="w-full flex items-center justify-between p-4 hover:bg-muted/10 transition-colors"
+            className="w-full flex items-center justify-between p-4 hover:bg-muted/10 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
           >
```

### Edit 4 — Driver message button: aria-label (non-functional — flagged to owner)

```diff
-                  <button type="button" className="h-10 w-10 rounded-xl bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors">
+                  <button type="button" aria-label="Message driver (coming soon)" className="h-10 w-10 rounded-xl bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### Edit 5 — Driver phone button: aria-label (non-functional — flagged to owner)

```diff
-                  <button type="button" className="h-10 w-10 rounded-xl bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors">
+                  <button type="button" aria-label="Call driver (coming soon)" className="h-10 w-10 rounded-xl bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### Edit 6 — Info-card store name: truncate to prevent responsive crush at 375px

The 3-column grid (`grid grid-cols-3 gap-2.5`) is tight on a 375px viewport — the store name cell has no `min-w-0` / `truncate`, so a long store name (e.g. "Chip Mong Noro Mall") can overflow and blow out the grid.

```diff
-            <MapPin className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
-            <p className="text-[11px] font-bold">{order.store}</p>
+            <MapPin className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
+            <p className="text-[11px] font-bold truncate">{order.store}</p>
```

---

## Field flags (not fixed — display-only additions out of scope for this interaction slice)

| Field | Fetched | Rendered? | Notes |
|---|---|---|---|
| `shopping_completed_at` | ✅ select col | ❌ | Not mapped to a stepper timestamp — the stepper uses `shopping_started_at` for step 2. Could show "Shopping done: Xm ago" under the Shopping step. |
| `cancelled_at` | ✅ select col | ❌ | Cancelled orders show `isCancelled` banner but not when. Could display "Cancelled Xm ago" in the hero. |
| `driver_notes` | ✅ select col | ✅ rendered | Used. |
| `driver.vehicle_type` | ✅ select col | ❌ | Could supplement the vehicle model ("Toyota Prius · Sedan"). |
| `driver.current_lat` / `current_lng` | ✅ select cols | ❌ | Supabase realtime location data fetched but never used — no map component consumes it. Future map integration candidate. |

---

## Non-functional driver contact buttons — owner action required

The two `h-10 w-10 rounded-xl bg-primary/10` buttons in the driver card (MessageSquare, Phone) have **no `onClick` handler**. They render as interactive buttons but do nothing on click. The `aria-label` was changed to `"...(coming soon)"` to signal to screen-reader users that the feature is pending. **Owner:** wire these up (deep-link to chat with the driver via `driver_id`, and a `tel:` link using a driver phone number — note that `drivers_public` doesn't expose a phone column, so this may need an RPC or a new column).

---

## Verification

Run `npm run update` (type-check + worker type-check + production build — must pass green). The changes are className/aria-only so zero TypeScript risk. Preview `/grocery/track/<any-uuid>` (lands on the "Order not found" error state in the empty local DB — confirms the back-button + error layout; the info-card truncation, stepper, driver card, and items toggle are data-gated so verify the diff visually or with a test order).
