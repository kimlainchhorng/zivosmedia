# DeepSeek run — 2026-06-13T23:15:43.514Z

- model: deepseek-chat
- task: Premium interaction + responsive QA pass on ONE customer-facing page: src/pages/grocery/GroceryOrderTracking.tsx (the LIVE /grocery/track/:orderId order-tracking page — realtime Supabase status, animated 5-step delivery stepper, driver card, ETA countdown, collapsible items list, cancel-order + download-receipt actions). It uses framer-motion motion.div for ENTRANCE animations, but its INTERACTIVE controls are raw <button> elements (NOT motion buttons), so CSS active:scale works on them. Reference standard for interaction tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring). HARD RULE: className and display-only attribute (aria-label, aria-expanded) changes ONLY — do NOT change any supabase query/select, the realtime channel subscription, the cancel-grocery-order or grocery-order-receipt function invokes, navigate targets, useState/handlers, or the stepper/ETA logic. Identify genuine gaps ONLY: (1) raw button/a interactive controls missing focus-visible keyboard rings or press feedback (active:scale); (2) icon-only buttons without aria-label; (3) the collapsible Items toggle missing aria-expanded; (4) responsive crush/overflow at 375px (note the 3-column info-card grid where a long store name could overflow); (5) fetched-but-unused data fields (check the shopping_orders select cols and the drivers_public select cols against what is rendered — e.g. shopping_completed_at, cancelled_at, vehicle_type, current_lat/current_lng); (6) contrast/legibility bugs. ALSO FLAG (do not fix — needs owner): the two driver contact buttons (MessageSquare + Phone, the h-10 w-10 rounded-xl bg-primary/10 buttons in the driver card) have NO onClick handler — they are non-functional. Do NOT touch the shadcn Button components (View My Orders / My Orders / Shop More / Download receipt / Cancel order / Keep order / Cancel and refund) — they already ship the interaction tokens. Be concise; cite exact classNames not line numbers.
- files: src/pages/grocery/GroceryOrderTracking.tsx

---

# GroceryOrderTracking — Premium Interaction + Responsive QA

## Plan

1. **Raw controls missing interaction tokens** — 4 raw `<button>` elements need `active:scale` + `focus-visible:ring`
2. **Icon-only buttons missing `aria-label`** — 3 buttons (back arrow, copy ID, driver message/phone)
3. **Collapsible items toggle missing `aria-expanded`** — the `showItems` toggle
4. **Responsive crush** — the 3-column info card grid at 375px with long store names
5. **Fetched-but-unused fields** — `shopping_completed_at`, `cancelled_at`, `vehicle_type`, `current_lat`, `current_lng`
6. **Non-functional driver contact buttons** — flag only (no `onClick`)

## Proposed Diff

```diff
--- a/src/pages/grocery/GroceryOrderTracking.tsx
+++ b/src/pages/grocery/GroceryOrderTracking.tsx
@@ -130,7 +130,7 @@ export default function GroceryOrderTracking() {
       <div className="relative max-w-md mx-auto px-5">
         {/* Header */}
         <div className="flex items-center gap-3 pt-12 pb-4">
-          <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-muted/40 transition-colors">
+          <button type="button" onClick={() => navigate(-1)} aria-label="Go back" className="p-2 -ml-2 rounded-xl hover:bg-muted/40 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <ArrowLeft className="h-5 w-5" />
           </button>
           <div className="flex-1">
@@ -138,7 +138,7 @@ export default function GroceryOrderTracking() {
             <p className="text-[11px] text-muted-foreground">from {order.store}</p>
           </div>
-          <button type="button" onClick={copyId} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
+          <button type="button" onClick={copyId} aria-label="Copy order ID" className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <span className="text-[10px] font-mono font-bold">{orderId?.slice(0, 8).toUpperCase()}</span>
             <Copy className="h-3 w-3 text-muted-foreground" />
           </button>
@@ -237,7 +237,7 @@ export default function GroceryOrderTracking() {
                 <div className="flex gap-2">
-                  <button type="button" className="h-10 w-10 rounded-xl bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors">
+                  <button type="button" aria-label="Message driver" className="h-10 w-10 rounded-xl bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                     <MessageSquare className="h-4 w-4 text-primary" />
                   </button>
-                  <button type="button" className="h-10 w-10 rounded-xl bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors">
+                  <button type="button" aria-label="Call driver" className="h-10 w-10 rounded-xl bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                     <Phone className="h-4 w-4 text-primary" />
                   </button>
                 </div>
@@ -310,7 +310,7 @@ export default function GroceryOrderTracking() {
           <button type="button"
             onClick={() => setShowItems(v => !v)}
-            className="w-full flex items-center justify-between p-4 hover:bg-muted/10 transition-colors"
+            aria-expanded={showItems}
+            className="w-full flex items-center justify-between p-4 hover:bg-muted/10 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
             <div className="flex items-center gap-2">
@@ -367,7 +367,7 @@ export default function GroceryOrderTracking() {
         {/* Info cards */}
-        <div className="grid grid-cols-3 gap-2.5 mb-6">
+        <div className="grid grid-cols-3 gap-2.5 mb-6 min-w-0">
           <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10 text-center">
             <Clock className="h-4 w-4 text-primary mx-auto mb-1" />
             <p className="text-[11px] font-bold">{eta}</p>
@@ -378,7 +378,7 @@ export default function GroceryOrderTracking() {
           </div>
           <div className="p-3 rounded-2xl bg-muted/20 border border-border/15 text-center">
-            <p className="text-[11px] font-bold">{order.store}</p>
+            <p className="text-[11px] font-bold truncate">{order.store}</p>
             <p className="text-[8px] text-muted-foreground">Store</p>
           </div>
```

## Summary of Changes

| # | Issue | Fix |
|---|-------|-----|
| 1 | Back button: no `active:scale`, no `focus-visible:ring`, no `aria-label` | Added `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + `aria-label="Go back"` |
| 2 | Copy ID button: same gaps | Same token set + `aria-label="Copy order ID"` |
| 3 | Driver Message button: same gaps + no `aria-label` | `active:scale-90` (icon-only) + ring + `aria-label="Message driver"` |
| 4 | Driver Phone button: same gaps + no `aria-label` | `active:scale-90` + ring + `aria-label="Call driver"` |
| 5 | Items toggle: no `active:scale`, no `focus-visible:ring`, no `aria-expanded` | `active:scale-[0.99]` + ring + `aria-expanded={showItems}` |
| 6 | Info card grid: long store name overflows at 375px | Added `min-w-0` to grid + `truncate` to store name `<p>` |
| 7 | Fetched-but-unused fields | **Flag only** — see below |

## Fetched-but-Unused Fields (Flag — not fixed)

| Field | Selected at | Rendered? | Note |
|-------|-------------|-----------|------|
| `shopping_completed_at` | `shopping_orders` select | ❌ | Could show "Shopping finished" timestamp in stepper (step index 2) |
| `cancelled_at` | `shopping_orders` select | ❌ | Could show cancellation time in cancelled state |
| `vehicle_type` | `drivers_public` select | ❌ | Could show "Sedan" / "SUV" badge next to vehicle model |
| `current_lat`, `current_lng` | `drivers_public` select | ❌ | Could power a live map — but that's a feature addition, not a className pass |

## Non-Functional Controls (Flag — needs owner)

The two driver contact buttons (`MessageSquare` + `Phone`) have **no `onClick` handler**. They are decorative. Owner needs to wire them to:
- `MessageSquare` → open chat thread with driver
- `Phone` → `window.open(`tel:${driverPhone}`)` (but `phone` is not fetched — would need a `drivers_public.phone` column or a separate edge function)

## Verification

After applying, run:
```bash
npm run update
```

Preview at `/grocery/track/:orderId` on the dev server at 375px, 768px, and 1280px. Confirm:
- All 4 raw buttons show focus ring on keyboard tab
- All 3 icon-only buttons have `aria-label` in DOM
- Items toggle has `aria-expanded="true"`/`"false"` reflecting state
- Long store names (e.g. "Chip Mong Express Supermarket") truncate with `…` in the info card grid at 375px
- No console errors
