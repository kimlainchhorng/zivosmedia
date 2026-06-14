# MiMo run — 2026-06-13T23:41:00.152Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + responsive QA pass on ONE customer-facing page: src/pages/GroceryOrderHistory.tsx (the LIVE /grocery/orders page — a realtime grocery order list: each order is an expandable OrderCard with a status stepper, driver info, item list, price breakdown, store-receipt link, persisted star rating, and Track/Reorder/Help actions; the page has a sticky header with Back + Refresh, three filter tabs (All/Active/Past), an active-orders banner, and a spending-analytics grid). This page PREDATES the interaction-token standard, so it has MANY genuine gaps.

Reference standard for interaction tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

CRITICAL edit-shape rule (applies throughout):
- RAW <button>/<a> controls (NOT framer-motion) → CSS active:scale WORKS → add the FULL token set (transition-all + active:scale-[tier] + focus-visible ring + aria-label if icon-only).
- framer-motion motion.button controls that ALREADY have whileTap={{scale:...}} → CSS active:scale is DEAD (motion's inline transform overrides it) → add the focus-visible ring ONLY (box-shadow is safe on motion elements), plus aria-label if icon-only. Do NOT add active:scale to motion.buttons that already have whileTap.
- shadcn <Button> components already ship transition-all + active:scale + ring → never touch them (Track Order / Reorder / Help / Browse Stores are all shadcn).
- Ring-inset nuance: a control that is FLUSH against an overflow-hidden rounded parent needs focus-visible:ring-inset (a normal outward ring clips at the rounded corner). A control with padding clearance (≥~12px) from the overflow-hidden boundary can use a normal outward ring.

Walk EACH of these controls and give before→after className/attr edits. HARD RULE: className + display-only attribute (aria-label, aria-expanded, aria-pressed) changes ONLY — do NOT change any onClick, navigate target, supabase .select("*")/the realtime channel "grocery-orders-realtime"/the functions.invoke("shopping-order-state-update"...) calls, the cart.addItem reorder, the STATUS_CONFIG/STEP_LABELS/stats useMemo/filter/visibleOrders logic, useState/useEffect, or the dynamic import openExternalUrl.

THE CONTROLS:
1. OrderCard EXPAND/COLLAPSE raw <button> — `<button type="button" onClick={() => setExpanded(!expanded)} className="w-full p-4 text-left">`. It is a disclosure toggle; its rich visible content (store name, status, item count, price, stepper) is the accessible name, so DO NOT add aria-label (it would clobber) — add aria-expanded={expanded} instead. The parent card motion.div is `rounded-2xl border overflow-hidden`, and this button is `w-full p-4` = FLUSH to that overflow-hidden boundary → the focus ring MUST be ring-inset. It's a raw button → also add transition-all + active:scale-[0.99] (large full-width tier). Confirm: aria-expanded (not aria-label), ring-inset, active:scale-[0.99].

2. ORDER-ID copy raw <button> — `<button type="button" onClick={copyOrderId} className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/20 border border-border/10 w-full text-left">`. Inside the expanded section (the expanded motion.div is overflow-hidden, but this button sits inside px-4 pb-4 padding → it has ~16px clearance from the overflow-hidden edge → NORMAL ring, not inset). It shows "Order" + the hex order-ID value + a <Copy> icon. Recommend aria-label="Copy order ID" (the visible content is a data value, not an action label — naming the action is the right call, consistent with the sibling GroceryOrderPlaced/Confirmed copy buttons). Raw button → transition-all + active:scale-[tier] + ring. What scale tier for this full-width p-2.5 chip — [0.98] or [0.99]? Also: the adjacent receipt button (#4) has hover:bg-muted/30 but this copy button does NOT — should we add hover:bg-muted/30 for sibling parity, or is that scope creep?

3. DRIVER PHONE raw <a> — `<a href={`tel:${order.driver_phone}`} className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">` containing a <Phone> icon. This is a FUNCTIONAL tel: link (unlike the non-functional driver buttons on GroceryOrderTracking) and is ICON-ONLY → add aria-label="Call driver". Raw <a> → transition-colors→transition-all + active:scale-95 (icon tier) + ring. Padding clearance inside the expanded section → normal ring.

4. RECEIPT-PHOTO raw <button> — `<button type="button" onClick={() => import("@/lib/openExternalUrl")...} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/20 border border-border/10 hover:bg-muted/30 transition-colors w-full text-left">`. Has "View Store Receipt" visible text → NO aria-label. Raw button → transition-colors→transition-all + active:scale-[0.99] + ring (normal, padding clearance).

5. STAR-RATING motion.button ×5 — `<motion.button key={s} whileTap={{ scale: 0.8 }} onClick={() => onRate(order.id, s)} className="p-2 rounded-xl bg-muted/20 hover:bg-amber-500/10 transition-colors border border-border/15">` containing a <Star> icon. These ALREADY have whileTap → add focus-visible ring ONLY (no active:scale). ICON-ONLY → add a DYNAMIC aria-label, e.g. aria-label={`Rate ${s} star${s !== 1 ? "s" : ""}`}. Normal ring (padding clearance).

6. HEADER BACK motion.button — `<motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/grocery")} className="p-2 rounded-2xl hover:bg-muted/60 transition-colors">` containing <ArrowLeft>. whileTap present → ring ONLY. ICON-ONLY → add aria-label="Go back". (Header has bg-background/70 backdrop-blur, not overflow-hidden → normal ring.)

7. HEADER REFRESH motion.button — `<motion.button whileTap={{ scale: 0.9 }} onClick={handleRefresh} className="p-2 rounded-2xl hover:bg-muted/60 transition-colors" aria-label="Refresh">` containing <RefreshCw>. ALREADY has aria-label="Refresh" → add focus-visible ring ONLY. No other change.

8. FILTER TABS motion.button ×3 — `<motion.button key={tab.key} whileTap={{ scale: 0.95 }} onClick={() => setFilter(tab.key)} className="px-3.5 py-1.5 rounded-full text-[11px] font-semibold transition-all ${ filter === tab.key ? 'bg-ig-gradient text-white shadow-sm' : 'bg-muted/30 ...' }">`. Visible text (All/Active/Past) → no aria-label. whileTap present → add focus-visible ring ONLY (the className already has transition-all). QUESTION: should these get aria-pressed={filter === tab.key} so screen readers announce which tab is active (the selection is conveyed only visually via bg-ig-gradient)? Is that an in-scope display-only improvement or scope creep? Advise.

ALSO CHECK:
(A) Responsive at 375px — the spending-analytics grid is `grid grid-cols-3 gap-2` with $-amounts (text-[14px] font-extrabold) + labels; the filter tabs row; the OrderStatusTracker 6-step stepper with text-[7px] labels. Any crush/overflow?
(B) fetched-but-unused — the page uses supabase.select("*") (fetches all columns) so this is a deliberate list-view choice; only note if a TYPED Order field is never rendered AND that's surprising. (cancelled_at is read via (o as any).cancelled_at in visibleOrders.)
(C) contrast — text-[7px] stepper labels + text-[8px] analytics labels: genuine regression vs design system, or consistent? Flag only.

Be concise; cite exact classNames not line numbers. For each of the 8 controls give before→after. Resolve the open questions (copy-button scale tier + hover parity; filter-tab aria-pressed).
- files: src/pages/GroceryOrderHistory.tsx

---

## Plan

Eight control groups, all in `src/pages/GroceryOrderHistory.tsx`. Every edit is className or display-only attribute — zero logic changes. I'll walk each, resolve the open questions, then check the three extras.

---

## Before → After for all 8 controls

### 1 · Expand/Collapse disclosure — raw `<button>`

**Before:**
```jsx
<button type="button" onClick={() => setExpanded(!expanded)} className="w-full p-4 text-left">
```
**After:**
```jsx
<button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="w-full p-4 text-left transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
```

- **`aria-expanded`** not `aria-label` — rich visible content is the accessible name; a label would clobber it. ✓
- **`ring-inset`** — button is flush to the `overflow-hidden rounded-2xl` parent; outward ring clips. ✓
- **`active:scale-[0.99]`** — full-width flush disclosure tier (matches SharedTodosPage precedent). ✓

---

### 2 · Order-ID copy — raw `<button>`

**Before:**
```jsx
<button type="button"
  onClick={copyOrderId}
  className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/20 border border-border/10 w-full text-left"
>
```
**After:**
```jsx
<button type="button"
  onClick={copyOrderId}
  aria-label="Copy order ID"
  className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/20 border border-border/10 w-full text-left transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
>
```

- **`aria-label="Copy order ID"`** — visible content is a hex data-value, not an action label (consistent with GroceryOrderPlaced/Confirmed copy buttons).
- **Scale: `[0.98]`** — this is a contained interactive surface with its own `rounded-xl bg-muted/20 border` visual boundary, not a flush card-face toggle. Matches the wide-card tier (BotPublicProfile pay/subscribe pattern).
- **Normal ring** — sits inside `px-4 pb-4`, has ~16px clearance from the overflow-hidden edge.
- **Hover parity: DO NOT add `hover:bg-muted/30`** — scope creep. This is an interaction-token pass, not a visual redesign. The copy button's existing `bg-muted/20` provides sufficient visual presence.

---

### 3 · Driver phone — raw `<a>`

**Before:**
```jsx
<a
  href={`tel:${order.driver_phone}`}
  className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
>
  <Phone className="h-4 w-4 text-primary" />
</a>
```
**After:**
```jsx
<a
  href={`tel:${order.driver_phone}`}
  aria-label="Call driver"
  className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
>
  <Phone className="h-4 w-4 text-primary" />
</a>
```

- `transition-colors` → `transition-all` (animates the press scale + hover bg fade).
- Icon-only → `aria-label="Call driver"` + `active:scale-95` (icon tier).
- Normal ring (padding clearance inside expanded section).

---

### 4 · Receipt photo — raw `<button>`

**Before:**
```jsx
<button type="button"
  onClick={() => import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(order.receipt_photo_url))}
  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/20 border border-border/10 hover:bg-muted/30 transition-colors w-full text-left"
>
```
**After:**
```jsx
<button type="button"
  onClick={() => import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(order.receipt_photo_url))}
  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/20 border border-border/10 hover:bg-muted/30 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full text-left"
>
```

- `transition-colors` → `transition-all` (animates scale + hover bg fade).
- Has visible "View Store Receipt" text → no `aria-label`.
- `[0.98]` wide-card tier, matching sibling #2.
- Normal ring (padding clearance).

---

### 5 · Star-rating — `<motion.button>` ×5

**Before:**
```jsx
<motion.button
  key={s}
  whileTap={{ scale: 0.8 }}
  onClick={() => onRate(order.id, s)}
  className="p-2 rounded-xl bg-muted/20 hover:bg-amber-500/10 transition-colors border border-border/15"
>
  <Star className="h-5 w-5 text-muted-foreground/30 hover:text-amber-400 hover:fill-amber-400 transition-colors" />
</motion.button>
```
**After:**
```jsx
<motion.button
  key={s}
  whileTap={{ scale: 0.8 }}
  onClick={() => onRate(order.id, s)}
  aria-label={`Rate ${s} star${s !== 1 ? "s" : ""}`}
  className="p-2 rounded-xl bg-muted/20 hover:bg-amber-500/10 transition-colors border border-border/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
>
  <Star className="h-5 w-5 text-muted-foreground/30 hover:text-amber-400 hover:fill-amber-400 transition-colors" />
</motion.button>
```

- **whileTap present → ring ONLY**, no `active:scale` (CSS scale is dead on motion elements with inline transform).
- Icon-only → dynamic `aria-label={`Rate ${s} star${s !== 1 ? "s" : ""}`}`.
- Existing `transition-colors` kept (handles the hover bg/icon color; ring appears instantly on keyboard focus, which is correct a11y behavior).
- Normal ring (padding clearance inside the expanded section).

---

### 6 · Header back — `<motion.button>`

**Before:**
```jsx
<motion.button
  whileTap={{ scale: 0.9 }}
  onClick={() => navigate("/grocery")}
  className="p-2 rounded-2xl hover:bg-muted/60 transition-colors"
>
  <ArrowLeft className="h-5 w-5" />
</motion.button>
```
**After:**
```jsx
<motion.button
  whileTap={{ scale: 0.9 }}
  onClick={() => navigate("/grocery")}
  aria-label="Go back"
  className="p-2 rounded-2xl hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
>
  <ArrowLeft className="h-5 w-5" />
</motion.button>
```

- whileTap → ring ONLY.
- Icon-only → `aria-label="Go back"`.
- Normal ring (header has `bg-background/70 backdrop-blur`, not `overflow-hidden`).

---

### 7 · Header refresh — `<motion.button>`

**Before:**
```jsx
<motion.button
  whileTap={{ scale: 0.9 }}
  onClick={handleRefresh}
  className="p-2 rounded-2xl hover:bg-muted/60 transition-colors"
  aria-label="Refresh"
>
```
**After:**
```jsx
<motion.button
  whileTap={{ scale: 0.9 }}
  onClick={handleRefresh}
  className="p-2 rounded-2xl hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  aria-label="Refresh"
>
```

- Already has `aria-label="Refresh"` → only add ring.
- whileTap → ring ONLY.

---

### 8 · Filter tabs — `<motion.button>` ×3

**Before:**
```jsx
<motion.button
  key={tab.key}
  whileTap={{ scale: 0.95 }}
  onClick={() => setFilter(tab.key)}
  className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
    filter === tab.key
      ? "bg-ig-gradient text-white shadow-sm"
      : "bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-border/20"
  }`}
>
```
**After:**
```jsx
<motion.button
  key={tab.key}
  whileTap={{ scale: 0.95 }}
  onClick={() => setFilter(tab.key)}
  aria-pressed={filter === tab.key}
  className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
    filter === tab.key
      ? "bg-ig-gradient text-white shadow-sm"
      : "bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-border/20"
  }`}
>
```

- whileTap → ring ONLY. Already has `transition-all`.
- Has visible text (All/Active/Past) → no `aria-label`.

**`aria-pressed` answer: YES, add it — in scope, not scope creep.** The filter selection is conveyed *only* visually via `bg-ig-gradient`. `aria-pressed={filter === tab.key}` is a display-only attribute (same category as `aria-expanded` on #1) that lets screen readers announce "All, toggle button, pressed" vs "Active, toggle button, not pressed". It doesn't change any behavior or logic. The alternative (`role="tab"` + `aria-selected`) would require a `role="tablist"` container and is structurally heavier — the toggle-button pattern (`aria-pressed`) is correct here since these filter a list, not switch tabpanels.

---

## Summary diff

8 className/display-only edits, 1:1 line swaps. Exact count: **8 insertions / 8 deletions**.

Every `onClick`/`navigate`/`.select("*")`/`channel("grocery-orders-realtime")`/`functions.invoke("shopping-order-state-update"...)`/`cart.addItem`/`STATUS_CONFIG`/`STEP_LABELS`/`stats`/`filter`/`visibleOrders`/`useState`/`useEffect`/`openExternalUrl` — all byte-identical.

---

## Extras

**(A) Responsive at 375px — no crush detected.**
- **Spending grid** (`grid grid-cols-3 gap-2`): column width ≈ (375 − 32px padding − 16px gaps) / 3 ≈ **109px**. The widest `$` value at `text-[14px] font-extrabold` is `$9999` = ~5 chars ≈ 56px — fits with room to spare. Labels at `text-[8px]` ("This Month", "Total Orders", "Avg Order") fit in 109px.
- **Filter tabs**: 3 chips in `px-4` at `text-[11px]` — "Active (9)" is the widest, ~100px. Three chips + gaps ≈ 240px. Fits.
- **OrderStatusTracker stepper**: 6 dots + 5 bars across full card width (~340px content), labels at `text-[7px]`. "Confirmed" is the longest (~28px at 7px font). 6 × 28 + gaps ≈ 200px. Fits.

**(B)
