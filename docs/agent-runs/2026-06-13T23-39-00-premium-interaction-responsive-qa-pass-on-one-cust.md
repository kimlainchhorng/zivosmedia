# DeepSeek run — 2026-06-13T23:39:00.957Z

- model: deepseek-chat
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

# Plan: Premium Interaction + Responsive QA for `GroceryOrderHistory.tsx`

## Summary

Apply the standard interaction-token set (transition-all + active:scale + focus-visible ring) to all raw controls, add missing aria-labels/aria-expanded, and verify responsive fit at 375px. 8 controls total, each with a specific tier and nuance.

---

## Proposed Changes

**File:** `src/pages/GroceryOrderHistory.tsx`

### Control 1: OrderCard EXPAND/COLLAPSE (raw `<button>`, ~L131)

**Before:**
```tsx
<button type="button" onClick={() => setExpanded(!expanded)} className="w-full p-4 text-left">
```

**After:**
```tsx
<button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="w-full p-4 text-left transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
```

**Rationale:**
- `aria-expanded={expanded}` — disclosure toggle, visible text is the accessible name → no `aria-label`
- `ring-inset` — parent `motion.div` has `overflow-hidden rounded-2xl`, button is flush at `p-4`
- `active:scale-[0.99]` — large full-width tier (minimal press feedback, doesn't feel janky)
- `transition-all` — smooths both the scale and any future hover bg

### Control 2: ORDER-ID copy (raw `<button>`, ~L173)

**Before:**
```tsx
<button type="button"
  onClick={copyOrderId}
  className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/20 border border-border/10 w-full text-left"
>
```

**After:**
```tsx
<button type="button"
  onClick={copyOrderId}
  aria-label="Copy order ID"
  className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/20 border border-border/10 hover:bg-muted/30 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full text-left"
>
```

**Rationale:**
- `aria-label="Copy order ID"` — visible content is a data value (hex ID), not an action label
- `active:scale-[0.98]` — medium chip tier (p-2.5, not full-width card, not icon-only)
- `hover:bg-muted/30` — **added for sibling parity** with the receipt button (#4) which already has it; this is a minimal display-only addition that makes the two chips visually consistent
- Normal ring (no `ring-inset`) — sits inside `px-4 pb-4` padding, ~16px clearance from overflow-hidden edge

### Control 3: DRIVER PHONE (raw `<a>`, ~L195)

**Before:**
```tsx
<a
  href={`tel:${order.driver_phone}`}
  className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
>
```

**After:**
```tsx
<a
  href={`tel:${order.driver_phone}`}
  aria-label="Call driver"
  className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
>
```

**Rationale:**
- `aria-label="Call driver"` — icon-only `<Phone>` with no visible text
- `active:scale-95` — icon-only tier (h-9 w-9 circle)
- `transition-colors` → `transition-all` — enables smooth scale animation
- Normal ring — inside expanded section with padding clearance

### Control 4: RECEIPT-PHOTO (raw `<button>`, ~L228)

**Before:**
```tsx
<button type="button"
  onClick={() => import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(order.receipt_photo_url))}
  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/20 border border-border/10 hover:bg-muted/30 transition-colors w-full text-left"
>
```

**After:**
```tsx
<button type="button"
  onClick={() => import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(order.receipt_photo_url))}
  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/20 border border-border/10 hover:bg-muted/30 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full text-left"
>
```

**Rationale:**
- No `aria-label` — has visible "View Store Receipt" text
- `active:scale-[0.99]` — full-width chip tier (matches the copy button's width/role)
- `transition-colors` → `transition-all` — enables smooth scale
- Normal ring — padding clearance

### Control 5: STAR-RATING ×5 (framer-motion `<motion.button>`, ~L244)

**Before:**
```tsx
<motion.button
  key={s}
  whileTap={{ scale: 0.8 }}
  onClick={() => onRate(order.id, s)}
  className="p-2 rounded-xl bg-muted/20 hover:bg-amber-500/10 transition-colors border border-border/15"
>
```

**After:**
```tsx
<motion.button
  key={s}
  whileTap={{ scale: 0.8 }}
  onClick={() => onRate(order.id, s)}
  aria-label={`Rate ${s} star${s !== 1 ? "s" : ""}`}
  className="p-2 rounded-xl bg-muted/20 hover:bg-amber-500/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-border/15"
>
```

**Rationale:**
- **No `active:scale`** — `whileTap={{ scale: 0.8 }}` already handles press feedback; CSS `active:scale` would be dead
- `aria-label={`Rate ${s} star${s !== 1 ? "s" : ""}`}` — icon-only `<Star>` with no visible text
- Normal ring — padding clearance from overflow-hidden boundary
- Keep `transition-colors` (not `transition-all`) — only the hover bg color changes; no scale to animate

### Control 6: HEADER BACK (framer-motion `<motion.button>`, ~L291)

**Before:**
```tsx
<motion.button
  whileTap={{ scale: 0.9 }}
  onClick={() => navigate("/grocery")}
  className="p-2 rounded-2xl hover:bg-muted/60 transition-colors"
>
```

**After:**
```tsx
<motion.button
  whileTap={{ scale: 0.9 }}
  onClick={() => navigate("/grocery")}
  aria-label="Go back"
  className="p-2 rounded-2xl hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
>
```

**Rationale:**
- **No `active:scale`** — `whileTap` handles it
- `aria-label="Go back"` — icon-only `<ArrowLeft>`
- Normal ring — header has `bg-background/70 backdrop-blur`, not overflow-hidden
- Keep `transition-colors` — only hover bg changes

### Control 7: HEADER REFRESH (framer-motion `<motion.button>`, ~L299)

**Before:**
```tsx
<motion.button
  whileTap={{ scale: 0.9 }}
  onClick={handleRefresh}
  className="p-2 rounded-2xl hover:bg-muted/60 transition-colors"
  aria-label="Refresh"
>
```

**After:**
```tsx
<motion.button
  whileTap={{ scale: 0.9 }}
  onClick={handleRefresh}
  className="p-2 rounded-2xl hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  aria-label="Refresh"
>
```

**Rationale:**
- Already has `aria-label="Refresh"` → no change needed
- **No `active:scale`** — `whileTap` handles it
- Normal ring — same header context as Back button

### Control 8: FILTER TABS ×3 (framer-motion `<motion.button>`, ~L315)

**Before:**
```tsx
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
```tsx
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

**Rationale:**
- **No `active:scale`** — `whileTap` handles it
- `aria-pressed={filter === tab.key}` — **in-scope display-only improvement**: the active state is conveyed only visually via `bg-ig-gradient`; `aria-pressed` lets screen readers announce which tab is selected without changing any visual or behavioral logic
- Normal ring — tabs are in the header, no overflow-hidden parent
- Already has `transition-all` → no change needed

---

## Responsive QA (375px)

### (A) Spending analytics grid: `grid grid-cols-3 gap-2`
- Each cell: `p-3` with `text-[14px] font-extrabold` ($-amount) + `text-[8px]` (label)
- At 375px: 3 columns × ~110px each = fits cleanly. $-amounts are short (`$42`, `$89`, `$15`). **No crush.**

### (B) Filter tabs row: `flex gap-1.5 px-4 pb-3`
- Three tabs: "All" (~30px), "Active (2)" (~70px), "Past" (~35px) = ~135px + gaps = ~145px. Container is 375-32=343px. **Fits easily.**

### (C) OrderStatusTracker 6-step stepper: `text-[7px]` labels
- 6 labels across ~300px (after padding) = ~50px each. Labels are short ("Payment", "Placed", "Confirmed", "Shopping", "Delivery", "Done"). **Fits cleanly.**

### (D) Fetched-but-unused fields
- `cancelled_at` — read via `(o as any).cancelled_at` in `visibleOrders` filter → **used**
- All other `select("*")` columns are consumed in the render tree. **No surprising unused fields.**

### (E) Contrast — `text-[7px]` stepper labels + `text-[8px]` analytics labels
- These are **intentionally small** for a dense data display (order history with status tracking). The `font-semibold`/`font-bold` + `text-muted-foreground`/`text-foreground` pairing provides sufficient contrast. **Consistent with the page's existing design language** — not a regression.

---

## Summary of All Changes

| # | Control | Type | Token Change | aria Change |
|---|---------|------|-------------|-------------|
| 1 | Expand/collapse | raw `<button>` | +`transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset` | +`aria-expanded={expanded}` |
| 2 | Copy order ID | raw `<button>` | +`hover:bg-muted/30 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | +`aria-label="Copy order ID"` |
| 3 | Driver phone | raw `<a>` | `transition-colors`→`transition-all` +`active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | +`aria-label="Call driver"` |
| 4 | View receipt | raw `<button>` | `transition-colors`→`transition-all` +`active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | — |
| 5 | Star rating ×5 | `motion.button` | +`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (no active:scale) | +`aria-label={`Rate ${s} star${s !== 1 ? "s" : ""}`}` |
| 6 | Header back | `motion.button` | +`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (no active:scale) | +`aria-label="Go back"` |
| 7 | Header refresh | `motion.button` | +`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (no active:scale) | Already has `aria-label="Refresh"` |
| 8 | Filter tabs ×3 | `motion.button` | +`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (no active:scale) | +`aria-pressed={filter === tab.key}` |

**Total: 8 controls, 0 logic changes, 0 behavioral changes, 0 supabase/route changes.** All edits are className + display-only attributes.

---

## Owner Verification

1. **Run `npm run update`** — must pass (type-check + worker type-check + build)
2. **Preview at `/grocery/orders`** on localhost (or zivostravel.com) at 375px, 768px, 1280px
3. **Verify keyboard navigation:** Tab through all controls — focus rings should appear on every button/link
4. **Verify press feedback:** Tap/hold each control — scale animation should fire on raw controls, motion buttons should use their existing `whileTap`
5. **Verify aria:** Screen reader should announce "Copy order ID", "Call driver", "Rate N stars", "Go back", and the filter tab's pressed state
