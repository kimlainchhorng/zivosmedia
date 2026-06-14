# MiMo run — 2026-06-14T00:14:21.508Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Plan

**8 className/display-only edits** across 2 files. All changes append tokens or add aria attributes — zero logic/handler/query changes.

| # | File | Control | Change | Tier |
|---|------|---------|--------|------|
| A1 | EatsOrdersPage | Header back `motion.button` | aria-label + ring | ring-only (motion) |
| A2 | EatsOrdersPage | Filter tabs `×4` raw `<button>` | aria-pressed + ring | scale-95 (chip) |
| A3 | EatsOrdersPage | Order card raw `<button>` | aria-haspopup + ring | scale-[0.99] kept |
| A4 | EatsOrdersPage | Modal close raw `<button>` | aria-label + transition + ring | scale-90 (icon) |
| A5 | EatsOrdersPage | Rate stars `×5` raw `<button>` | transition upgrade + ring | scale-90 kept |
| B1 | EatsTrackingPage | Header back `motion.button` | aria-label + ring | ring-only (motion) |
| B2 | EatsTrackingPage | Rate stars `×5` raw `<button>` | aria-label + ring | scale-90 kept |
| B3 | EatsTrackingPage | Share live order raw `<button>` | ring | scale-[0.99] kept |

---

## Open Questions — Answers

**1. A3 `aria-haspopup="dialog"` — add it.** The receipt modal is an `AnimatePresence` overlay acting as a dialog. `aria-haspopup="dialog"` is display-only and correctly signals the interaction pattern. Consistent with how the app labels modal triggers elsewhere.

**2. A4 transition — `transition-transform` is correct.** `bg-muted/50` is static (no `hover:bg-*`), so the only animated prop is the press-scale transform. `transition-transform` also means the focus ring appears **instantly** on keyboard focus (box-shadow isn't in the transition set), which is the desired behavior. `transition-all` would cause the ring to fade in.

**3. Motion vs raw + tiers — all correct, zero mismatches.** Verified every control against the source. A1/B1 are `motion.button` with `whileTap` → ring-only. A2/A3/A4/A5/B2/B3 are raw `<button>` → full CSS token set at the right tier.

**4. Responsive at 375px — no real issues.**
- Filter chips: 4 × ~50px + 3 × 8px gaps = ~224px in 343px available. Clean.
- Rate stars: 5 × flex-1 in 343px ≈ 62px/cell, well above 44px.
- **A4 close button is `w-8 h-8` (32px)** — below the 44px WCAG touch-target guideline. This is the established modal-close pattern across the repo (same size everywhere). Flag-only for owner, not a regression vs. the rest of the app.
- Filter chip vertical height (~25px with `py-1.5 text-[10px]`) is also below 44px — same pattern as CoinTransfers, GroceryOrderHistory, Achievements, Challenges, Badges. System-wide, not Eats-specific.

---

## Exact Diffs

### File: `src/pages/EatsOrdersPage.tsx`

**A1 — L151: motion.button back**

```diff
-          <motion.button whileTap={{ scale: 0.88 }} onClick={() => navigate("/eats")}
-            className="w-10 h-10 rounded-xl bg-card/80 border border-border/40 flex items-center justify-center touch-manipulation">
+          <motion.button whileTap={{ scale: 0.88 }} onClick={() => navigate("/eats")} aria-label="Go back"
+            className="w-10 h-10 rounded-xl bg-card/80 border border-border/40 flex items-center justify-center touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**A2 — L174: filter tab base string in cn()**

```diff
-              className={cn("px-3 py-1.5 rounded-full text-[10px] font-bold transition-all touch-manipulation active:scale-95",
+              className={cn("px-3 py-1.5 rounded-full text-[10px] font-bold transition-all touch-manipulation active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
```

Add to the `<button>` element:
```diff
-            <button type="button" key={f.id} onClick={() => setFilter(f.id)}
+            <button type="button" key={f.id} onClick={() => setFilter(f.id)} aria-pressed={filter === f.id}
```

**A3 — L210: order card button**

```diff
-              <button type="button" onClick={() => setSelectedOrder(order)}
-                className="w-full text-left rounded-2xl bg-card border border-border/40 p-4 hover:border-primary/20 transition-all touch-manipulation active:scale-[0.99] space-y-3">
+              <button type="button" onClick={() => setSelectedOrder(order)} aria-haspopup="dialog"
+                className="w-full text-left rounded-2xl bg-card border border-border/40 p-4 hover:border-primary/20 transition-all touch-manipulation active:scale-[0.99] space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**A4 — L280: modal close button**

```diff
-                  <button type="button" onClick={() => setSelectedOrder(null)}
-                    className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center touch-manipulation active:scale-90">
+                  <button type="button" onClick={() => setSelectedOrder(null)} aria-label="Close"
+                    className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center touch-manipulation active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**A5 — L381: rate stars base className**

```diff
-                          className="flex-1 flex items-center justify-center py-2 rounded-xl border border-border/40 bg-muted/30 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors active:scale-90 touch-manipulation">
+                          className="flex-1 flex items-center justify-center py-2 rounded-xl border border-border/40 bg-muted/30 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all active:scale-90 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

---

### File: `src/pages/EatsTrackingPage.tsx`

**B1 — L154: motion.button back** (byte-identical pattern to A1)

```diff
-          <motion.button whileTap={{ scale: 0.88 }} onClick={() => navigate("/eats")}
-            className="w-10 h-10 rounded-xl bg-card/80 border border-border/40 flex items-center justify-center touch-manipulation">
+          <motion.button whileTap={{ scale: 0.88 }} onClick={() => navigate("/eats")} aria-label="Go back"
+            className="w-10 h-10 rounded-xl bg-card/80 border border-border/40 flex items-center justify-center touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**B2 — L321: rate stars button**

```diff
-                <button type="button" key={s} onClick={async () => {
+                <button type="button" key={s} aria-label={`Rate ${s} star${s !== 1 ? "s" : ""}`} onClick={async () => {
```

```diff
-                  }} className="touch-manipulation active:scale-90 transition-transform">
+                  }} className="touch-manipulation active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**B3 — L350: share live order button**

```diff
-            className="w-full flex items-center gap-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3 text-left active:scale-[0.99] transition-transform touch-manipulation"
+            className="w-full flex items-center gap-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3 text-left active:scale-[0.99] transition-transform touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

## What's NOT touched (confirmed correct skips)

| Control | Reason |
|---------|--------|
| Browse Restaurants / Track Order (card) / Reorder / Track Order (modal) — EatsOrdersPage | shadcn `<Button>` — ships tokens |
| Modal backdrop `motion.div` — EatsOrdersPage | Non-focusable click-catcher |
| Not-found Back / footer Back + Help / DownloadReceiptButton / CancelOrderButton trio — EatsTrackingPage | shadcn `<Button>` — ships tokens |
| CrossServiceCTAs — EatsTrackingPage | Shared component — owns its own controls |

## Owner flags (NOT applied — out of scope)

1. **EatsOrdersPage L106 react-query key bug**: `["eats-order-history", queryClient]` should key on `user?.id` (per L58) so the optimistic rating cache update `setQueryData` targets the wrong key. Logic bug, owner-confirmed, left untouched.
2. **Stray TAB indent** at EatsOrdersPage L214. Cosmetic.
3. **A4 close button 32px tap target** (below 44px WCAG guideline). Established repo-wide pattern for modal × buttons. Could bump to `w-10 h-10` in a future pass.

## Hard Rule compliance

Every `supabase.from("food_orders").select(...)` / `.eq(...)` / `.order(...)` / `.single()` / `functions.invoke("eats-order-state-update", ...)` / `functions.invoke("eats-order-receipt", ...)` / `functions.invoke("cancel-eats-order", ...)` / realtime channel `eats-order-${orderId}` / `setQueryData` / `invalidateQueries` / `navigate(...)` / `setFilter` / `setSelectedOrder` / `setHoverRating` / `handleRate` / `navigator.share` / `navigator.clipboard` / every `useState`/`useEffect`/`useCallback`/`useQuery` — left byte-identical. The diff is pure className + 5 standalone aria-attribute additions.

## Verify gate

After applying: `npm run update` must pass (type-check + worker type-check + production build, exit 0). No new imports, no structural changes, no new components — this should pass cleanly.
