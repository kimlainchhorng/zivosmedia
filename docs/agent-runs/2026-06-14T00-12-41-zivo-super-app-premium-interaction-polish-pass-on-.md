# DeepSeek run — 2026-06-14T00:12:41.312Z

- model: deepseek-chat
- task: ZIVO super-app — premium INTERACTION-POLISH pass on the customer-facing Eats order-flow cluster: src/pages/EatsOrdersPage.tsx (order history + receipt modal) and src/pages/EatsTrackingPage.tsx (realtime order tracking). React + Vite + TS + Tailwind + shadcn/ui + framer-motion + react-router v7.

GOAL: bring every interactive control up to our house interaction-token standard for tap feedback + keyboard focus + screen-reader labelling. This is a polish pass, NOT a refactor.

THE HARD RULE (non-negotiable): className changes + display-only attributes ONLY. You may add/append: Tailwind classes, aria-label / aria-pressed / aria-expanded / aria-haspopup, and framer-motion whileTap. You may NOT change: any supabase query/RPC/functions.invoke call, react-query keys, onClick/onChange handler bodies, navigate() targets, routing, state logic, pricing/fee math, filter/sort logic, data shapes, or component structure. No new components, no moved JSX. If a change isn't purely visual/a11y, do not propose it.

HOUSE TOKEN STANDARD (reference page: src/pages/hubs/JobPostingDetailPage.tsx):
- Focus ring (ALL interactive controls): append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. No ring-offset (we dropped it).
- Press-scale tiers: icon-only -> active:scale-95 ; medium/contained chip -> active:scale-[0.98] ; large/full-width flush card -> active:scale-[0.99] ; small inline text-link -> active:scale-[0.97] + rounded-sm.
- transition: use `transition-transform` if press-scale is the ONLY animated prop; use `transition-all` if there's also a hover:bg-* / underline / hover:border that must animate.
- EDIT-SHAPE by control type:
  * RAW <button>/<a>/<Link> (not framer-motion): CSS active:scale WORKS -> ensure full set (transition + active:scale-[tier] + ring; + aria-label if icon-only).
  * framer-motion motion.button with whileTap: CSS active:scale is DEAD (motion inline transform overrides) -> add focus RING ONLY (box-shadow ring is safe on motion); do NOT add active:scale or a transition for the press; + aria-label if icon-only.
  * shadcn <Button>/<Input>/<Badge>: ship built-in tokens -> DO NOT TOUCH (exception: icon-only shadcn Button still needs aria-label).
- aria-label discipline: add ONLY to icon-only controls (no visible text). A control with rich visible TEXT must NOT get aria-label (it clobbers the accessible name). Use aria-pressed for toggle/filter tabs, aria-expanded for disclosures.
- Ring nuance: a control flush against an overflow-hidden rounded parent needs `focus-visible:ring-inset`; a control whose own element is the rounded one (parent not overflow-hidden) uses a normal outward ring.

MY CONTROL AUDIT — please confirm or correct each, and flag anything I missed. For each control give the EXACT final className string (and any aria-* attrs) you recommend.

=== EatsOrdersPage.tsx ===
A1) Header back button — L151, motion.button whileTap={{scale:0.88}}, onClick navigate("/eats"), icon-only ArrowLeft. Current className: `w-10 h-10 rounded-xl bg-card/80 border border-border/40 flex items-center justify-center touch-manipulation`. PLAN: add aria-label="Go back" + append ring only (motion -> no active:scale, no press transition). Parent is not overflow-hidden -> outward ring.

A2) Filter tabs — L174, raw <button> x4 in a .map, onClick setFilter(f.id). Current className via cn(): base `px-3 py-1.5 rounded-full text-[10px] font-bold transition-all touch-manipulation active:scale-95` then active/inactive branch. These are mutually-exclusive filter chips. PLAN: add aria-pressed={filter === f.id}; append ring to the base string; keep active:scale-95 + transition-all. One edit covers all 4.

A3) Order card — L210, raw <button>, onClick setSelectedOrder(order), rich visible content (logo, name, price, items, status). Wrapped in a motion.div (NOT overflow-hidden). Current className: `w-full text-left rounded-2xl bg-card border border-border/40 p-4 hover:border-primary/20 transition-all touch-manipulation active:scale-[0.99] space-y-3`. PLAN: append ring only; keep active:scale-[0.99] + transition-all (hover:border present); NO aria-label (rich text). Open question: is aria-haspopup="dialog" warranted since it opens the receipt modal? (display-only; optional.)

A4) Receipt-modal close — L280, raw <button>, onClick setSelectedOrder(null), icon-only X, NO transition currently. Current className: `w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center touch-manipulation active:scale-90`. PLAN: add aria-label="Close"; add transition-transform; append ring; keep active:scale-90.

A5) Rate-stars — L381, raw <button> x5 in a .map, ALREADY has aria-label={`Rate ${s} star...`}, disabled={savingRating}, onMouseEnter/Leave, onClick handleRate. Current className: `flex-1 flex items-center justify-center py-2 rounded-xl border border-border/40 bg-muted/30 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors active:scale-90 touch-manipulation`. PLAN: upgrade transition-colors -> transition-all (so press-scale animates too); append ring; keep active:scale-90 + existing aria-label. One edit covers all 5.

NOT TOUCHED (shadcn Button): "Browse Restaurants" (L195), in-card "Track Order" (L253, has e.stopPropagation), modal "Reorder" (L402), modal "Track Order" (L410). Modal backdrop motion.div (L269, onClick close) is a non-focusable click-catcher -> skip.

=== EatsTrackingPage.tsx ===
B1) Header back button — L154, byte-identical to A1 (motion.button whileTap 0.88, navigate("/eats"), icon-only ArrowLeft, same className). PLAN: identical to A1 — aria-label="Go back" + ring only.

B2) Rate-stars — L321, raw <button> x5 in a .map, onClick async (setRating + functions.invoke + toast), icon-only Star, currently NO aria-label. Current className: `touch-manipulation active:scale-90 transition-transform`. PLAN: add aria-label={`Rate ${s} star${s !== 1 ? "s" : ""}`}; append ring; keep active:scale-90 + transition-transform. One edit covers all 5. (Note: this rate-stars block LACKS aria-label, unlike A5 which already has it.)

B3) Share-live-order — L350, raw <button>, onClick async (navigator.share / clipboard), visible text ("Share live order" + description). Current className: `w-full flex items-center gap-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3 text-left active:scale-[0.99] transition-transform touch-manipulation`. PLAN: append ring only; keep active:scale-[0.99] + transition-transform; NO aria-label (visible text).

NOT TOUCHED (shadcn Button): not-found "Back to Eats" (L142), footer "Back to Eats" (L386) + "Help" (L390), DownloadReceiptButton (L437), CancelOrderButton trio (L495/L521/L529).

OPEN QUESTIONS for you:
1. A3 order card: aria-haspopup="dialog" — add it or leave it? (it opens a receipt modal)
2. A4 close button: is transition-transform the right call (press-scale only) or transition-all? It has no hover-bg.
3. Any control I mislabeled re: motion vs raw, or any tier mismatch?
4. Responsive/visual QA at 375px (iPhone SE) and 414px — any of these controls clip, overflow, or have too-small a tap target (<44px)? The filter chips (py-1.5 text-[10px]) and rate-stars are the candidates. Flag ONLY if it's a real issue; do not propose layout rewrites.

ALSO NOTED (out of scope — do NOT fix, just acknowledge): EatsOrdersPage L106 uses a wrong react-query key `["eats-order-history", queryClient]` (should key on user?.id per L58) so the optimistic rating cache update misses — that's a logic bug, owner-flagged, leave it. Stray TAB indent at L214.

Deliver: a tight per-control verdict (confirm / correct, with the exact final className + aria) plus anything I missed. Keep it concrete and copy-pasteable. No prose padding.
- files: src/pages/EatsOrdersPage.tsx, src/pages/EatsTrackingPage.tsx

---

# Eats Order-Flow Interaction Polish — Plan & Diff

## Plan

Two files, **7 controls** total across both pages. Every edit is className-only or display-only aria-* attribute. No logic, no queries, no handlers touched.

### EatsOrdersPage.tsx — 5 controls

| ID | Control | Type | Edit |
|----|---------|------|------|
| A1 | Header back button (L151) | `motion.button` whileTap | `aria-label="Go back"` + ring ONLY |
| A2 | Filter tabs ×4 (L174) | raw `<button>` | `aria-pressed` + ring + keep `active:scale-95` + `transition-all` |
| A3 | Order card (L210) | raw `<button>` | ring ONLY + `aria-haspopup="dialog"`; keep `active:scale-[0.99]` + `transition-all` |
| A4 | Receipt-modal close (L280) | raw `<button>` | `aria-label="Close"` + `transition-transform` + ring; keep `active:scale-90` |
| A5 | Rate-stars ×5 (L381) | raw `<button>` | `transition-colors`→`transition-all` + ring; keep `active:scale-90` + existing `aria-label` |

### EatsTrackingPage.tsx — 2 controls

| ID | Control | Type | Edit |
|----|---------|------|------|
| B1 | Header back button (L154) | `motion.button` whileTap | `aria-label="Go back"` + ring ONLY |
| B2 | Rate-stars ×5 (L321) | raw `<button>` | `aria-label` (dynamic) + ring; keep `active:scale-90` + `transition-transform` |

**NOT TOUCHED:** B3 Share-live-order (L350) — has visible text "Share live order" → no aria-label needed; already has `active:scale-[0.99]` + `transition-transform` → just needs ring appended. Wait — I missed this in my plan. Let me add it.

**Corrected total: 8 controls.** B3 also needs ring.

---

## Diff

### File: `src/pages/EatsOrdersPage.tsx`

**A1 — Header back button (L151–153)**
```diff
-          <motion.button whileTap={{ scale: 0.88 }} onClick={() => navigate("/eats")}
-            className="w-10 h-10 rounded-xl bg-card/80 border border-border/40 flex items-center justify-center touch-manipulation">
+          <motion.button whileTap={{ scale: 0.88 }} onClick={() => navigate("/eats")}
+            aria-label="Go back"
+            className="w-10 h-10 rounded-xl bg-card/80 border border-border/40 flex items-center justify-center touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**A2 — Filter tabs (L174–178)**
```diff
            <button type="button" key={f.id} onClick={() => setFilter(f.id)}
-              className={cn("px-3 py-1.5 rounded-full text-[10px] font-bold transition-all touch-manipulation active:scale-95",
+              aria-pressed={filter === f.id}
+              className={cn("px-3 py-1.5 rounded-full text-[10px] font-bold transition-all touch-manipulation active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
```

**A3 — Order card (L210–211)**
```diff
              <button type="button" onClick={() => setSelectedOrder(order)}
-                className="w-full text-left rounded-2xl bg-card border border-border/40 p-4 hover:border-primary/20 transition-all touch-manipulation active:scale-[0.99] space-y-3">
+                aria-haspopup="dialog"
+                className="w-full text-left rounded-2xl bg-card border border-border/40 p-4 hover:border-primary/20 transition-all touch-manipulation active:scale-[0.99] space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**A4 — Receipt-modal close (L280–281)**
```diff
                  <button type="button" onClick={() => setSelectedOrder(null)}
-                    className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center touch-manipulation active:scale-90">
+                    aria-label="Close"
+                    className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center touch-manipulation active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**A5 — Rate-stars (L381–383)**
```diff
                        <button key={s} type="button" aria-label={`Rate ${s} star${s !== 1 ? "s" : ""}`} disabled={savingRating}
                          onMouseEnter={() => setHoverRating(s)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => handleRate(selectedOrder.id, s)}
-                          className="flex-1 flex items-center justify-center py-2 rounded-xl border border-border/40 bg-muted/30 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors active:scale-90 touch-manipulation">
+                          className="flex-1 flex items-center justify-center py-2 rounded-xl border border-border/40 bg-muted/30 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all active:scale-90 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### File: `src/pages/EatsTrackingPage.tsx`

**B1 — Header back button (L154–156)**
```diff
-          <motion.button whileTap={{ scale: 0.88 }} onClick={() => navigate("/eats")}
-            className="w-10 h-10 rounded-xl bg-card/80 border border-border/40 flex items-center justify-center touch-manipulation">
+          <motion.button whileTap={{ scale: 0.88 }} onClick={() => navigate("/eats")}
+            aria-label="Go back"
+            className="w-10 h-10 rounded-xl bg-card/80 border border-border/40 flex items-center justify-center touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**B2 — Rate-stars (L321–323)**
```diff
                <button type="button" key={s} onClick={async () => {
                   setRating(s);
                   await supabase.functions.invoke("eats-order-state-update", {
                     body: { order_id: order.id, action: "rate_order", rating: s },
                   });
                   toast.success(`Rated ${s} stars! Thank you!`);
-                }} className="touch-manipulation active:scale-90 transition-transform">
+                }} aria-label={`Rate ${s} star${s !== 1 ? "s" : ""}`}
+                  className="touch-manipulation active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**B3 — Share live order (L350–352)**
```diff
            className="w-full flex items-center gap-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3 text-left active:scale-[0.99] transition-transform touch-manipulation"
+            className="w-full flex items-center gap-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3 text-left active:scale-[0.99] transition-transform touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

## Answers to your open questions

1. **A3 `aria-haspopup="dialog"`** — **Add it.** It's a display-only attribute that tells screen readers "this button opens a dialog." Correct and in-scope.

2. **A4 `transition-transform` vs `transition-all`** — **`transition-transform` is correct.** The close button has no `hover:bg-*` or `hover:border-*` — the only animated property is the press scale. `transition-all` would be overkill (and would animate the ring appearance, which we want instant).

3. **Motion vs raw tier check** — All correct. A1/B1 are `motion.button` with `whileTap` → ring only. A2/A3/A4/A5/B2/B3 are raw `<button>` → full token set. No mislabels.

4. **Responsive QA at 375px/414px:**
   - **Filter chips** (`px-3 py-1.5 text-[10px]`): 4 chips × ~55px each + 3 × 8px gaps = ~244px. Fits in 375px with 131px to spare. Tap target ~24px height — below the 44px Apple HIG minimum. **This is a real issue** but it's a layout/design choice (the chips are intentionally compact, matching the GroceryOrderHistory precedent). Flag only — do not fix.
   - **Rate-stars** (5 × `flex-1` in a `flex gap-2`): at 375px each star button ≈ 67px wide × 36px tall. Tap target passes 44px on width but fails on height (36px). Same flag — consistent with the GroceryOrderHistory pattern.
   - **Order card** (full-width `w-full`): trivially fits.
   - **Receipt modal** (`max-w-md`): scrolls vertically, no horizontal crush.

5. **Out-of-scope items acknowledged:** L106 wrong query key (uses `queryClient` instead of `user?.id`), L214 stray TAB indent. Left untouched.

---

## Verification

After applying, run:
```bash
npm run update
```

This must pass (type-check + worker type-check + production build) before the task is considered done.
