# MiMo run — 2026-06-14T06:56:11.935Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + a11y QA on ONE customer-facing page: src/pages/DriverOrdersPage.tsx (235 lines, "Dashboard for drivers to see available and assigned shopping orders"; useDriverShoppingOrders hook → available/assigned/isLoading/acceptOrder/updateStatus/refetch; useEatsNotifications; useState tab/acceptingId/advancingId; handlers handleAdvance (updateStatus → toast), handleAccept (acceptOrder → notifyEats + setTab); PullToRefresh wrapper; OrderCard sub-component mapped over orders). Layout: PullToRefresh root; sticky header (Back icon-btn + "Shopping Orders" title + Refresh icon-btn) + shadcn Tabs (Available/My Orders); content = OrderCard list (motion.div clickable cards) or loading/empty states.

Reference standard: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): interactive controls = (1) L57 OrderCard motion.div (onClick onTap → navigate `/driver/shopping/${order.id}`, cursor-pointer, base "transition-all" + "hover:border-primary/30", NO whileTap/role/tabIndex/focus; CONTAINS nested interactive children: the Accept shadcn Button L97 with onClick stopPropagation, and the advance <button> L109 with onClick stopPropagation); (2) L97 Accept Order shadcn <Button> (onClick stopPropagation + onAccept, disabled isAccepting); (3) L109 advance-status raw <button> (onClick stopPropagation + onAdvance, disabled isAdvancing, dynamic visible label STATUS_ADVANCE_LABEL ["Start Shopping →"/"Shopping Done →"/"Picked Up →"]/"Updating…", className "w-full py-2 rounded-xl bg-ig-gradient text-white text-xs font-bold touch-manipulation active:scale-[0.98] transition-all disabled:opacity-50", NO focus); (4) L178 header Back raw <button> (icon-only ArrowLeft, onClick navigate(-1), className "p-1.5 rounded-xl hover:bg-muted", NO transition/scale/focus/label); (5) L182 Refresh raw <button> (icon-only RefreshCw [animate-spin when isLoading], onClick refetch, disabled isLoading, className "p-1.5 rounded-xl hover:bg-muted", NO transition/scale/focus/label); (6) L188 shadcn Tabs/TabsTrigger (Available/My Orders). Status pills/icons decorative.

TOKEN TIERS: wide/primary/cards/full-width active:scale-[0.98]; links/chips/pills active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. FLIP RULE: ADDING a NEW CSS scale to a transition-colors/no-transition control that ALSO has hover color/bg/border → FLIP transition-colors→transition-all (or add transition-all if none). DON'T-CHURN: control ALREADY has press (CSS active:scale OR framer whileTap) + transition → ring (+aria) ONLY (no 2nd scale, no flip, no renumber). aria-label for icon-only. OUTWARD ring-ring default on neutral surfaces. shadcn Button/Tabs SKIP (ship tokens).

EDITS APPLIED (validate exact):
(A) L109 advance-status <button> — DON'T-CHURN ring-ONLY append "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (already active:scale-[0.98] + transition-all → NO 2nd scale, NO flip; OUTWARD ring-ring — bg-ig-gradient is the button's OWN fill, ring renders against neutral card; NO aria — visible dynamic text label, one-shot advance action not a toggle).
(B) L178 header Back <button> — ADD aria-label="Back" + APPEND "transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (icon-only tier 95; transition-all — hover:bg + new scale both animate, no prior transition → add transition-all; OUTWARD ring-ring on neutral sticky header bg-background/95).
(C) L182 Refresh <button> — ADD aria-label="Refresh" + APPEND "transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (icon-only tier 95; transition-all — hover:bg + new scale; OUTWARD ring-ring; the RefreshCw animate-spin is a child-icon anim independent of the button transition; native disabled untouched).
LEAVE: (1) L57 OrderCard motion.div — clickable card but a <div> (not focusable), CONTAINS nested interactive buttons (Accept + advance, both stopPropagation) → adding active:scale would conflict with nested press (parent active: fires on descendant activation = double-anim), and a focus-visible ring is a no-op without structural role="button"+tabIndex+onKeyDown; LEFT, flagged as owner structural keyboard-a11y item; (2) shadcn Button L97 + Tabs L188 (ship own tokens); status pills/icons decorative; PullToRefresh own component.

QUESTIONS:
(1) (A) advance button: DON'T-CHURN ring-ONLY correct (already active:scale-[0.98] + transition-all)? NO aria (visible dynamic text, one-shot action)? OUTWARD ring-ring on bg-ig-gradient own fill?
(2) (B) Back icon: aria-label="Back" + transition-all (hover:bg + scale) + active:scale-95 + ring correct?
(3) (C) Refresh icon: aria-label="Refresh" + transition-all + active:scale-95 + ring correct? animate-spin child independent of button transition? disabled untouched?
(4) (1) OrderCard motion.div: LEAVE correct? Is adding active:scale-[0.98] to a clickable card that CONTAINS nested stopPropagation buttons a churn/double-anim risk (parent active: triggers on descendant activation)? Is focus-visible:ring a no-op without role/tabIndex? Should this be FLAGGED as a structural keyboard-a11y owner fix (role="button" + tabIndex + onKeyDown) rather than touched?
(5) Inventory exhaustive (3 raw buttons edited; shadcn Button/Tabs SKIP; OrderCard div LEFT+flagged)? status pills/icons presentational?
(6) Owner flags (logic/out of scope, FLAG not fix): (a) OrderCard is a clickable <div> with onClick but NO role="button"/tabIndex/onKeyDown → not keyboard-operable (structural a11y gap); (b) accept/advance race — handleAccept toast "may have been taken" already handles the optimistic race; (c) any others?
(7) Responsive 375/768/1280: sticky header (Back + title + Refresh + Tabs); OrderCard list (store + status pill + items/price/address/time + Accept OR advance+View-details). Any crush @375? sub-44px tap targets to FLAG (Back/Refresh p-1.5 ~28px; advance button py-2 ~32px; Accept shadcn size sm; OrderCard big)?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/DriverOrdersPage.tsx

---

## Validation — DriverOrdersPage.tsx

All 3 edits are **already applied in the file**. Validation below.

---

### (1) Advance button (A) — ✅ CORRECT

Current className (L109): `"w-full py-2 rounded-xl bg-ig-gradient text-white text-xs font-bold touch-manipulation active:scale-[0.98] transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

- Already has `active:scale-[0.98]` + `transition-all` → ring-only append is correct DON'T-CHURN. ✅
- NO aria — visible dynamic label (`STATUS_ADVANCE_LABEL` or `"Updating…"`), one-shot advance, not a toggle. ✅
- OUTWARD ring — `bg-ig-gradient` is the button's own fill, ring renders against the neutral `bg-card` OrderCard. ✅

### (2) Back icon (B) — ✅ CORRECT

Current (L178): `aria-label="Back"` + `"p-1.5 rounded-xl hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

- `aria-label="Back"` — icon-only. ✅
- `transition-all` — `hover:bg-muted` + new `active:scale` both animate, no prior transition class. ✅
- `active:scale-95` — icon-only tier. ✅
- OUTWARD ring on neutral sticky header `bg-background/95`. ✅

### (3) Refresh icon (C) — ✅ CORRECT

Current (L182): `aria-label="Refresh"` + `"p-1.5 rounded-xl hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` + `disabled={isLoading}`

- `aria-label="Refresh"`. ✅
- `transition-all` + `active:scale-95`. ✅
- `RefreshCw animate-spin` is a child-icon keyframe animation, independent of the button's `transition-all`/`active:scale`. ✅
- `disabled={isLoading}` untouched. ✅

### (4) OrderCard motion.div (L57) — ✅ LEAVE + FLAG is correct

Current: `"p-4 rounded-2xl border border-border/50 bg-card hover:border-primary/30 transition-all cursor-pointer"` — no `active:scale`, no `role`, no `tabIndex`.

- **`active:scale` = double-anim risk**: CSS `:active` propagates to ancestors independently of `stopPropagation`. When the nested Accept `<Button>` or advance `<button>` is pressed, the parent `motion.div` would also fire `active:scale-[0.98]` → visible double-press. **Correct to leave.**
- **`focus-visible:ring` = no-op**: a `<div>` without `role="button"` + `tabIndex={0}` is not keyboard-focusable, so the ring never triggers. **Correct to leave.**
- **Structural fix needed**: `role="button"` + `tabIndex={0}` + `onKeyDown` (Enter/Space → `onTap`) is a real structural a11y change, not a display-only edit. **Correct to FLAG.**

### (5) Inventory — ✅ EXHAUSTIVE

| Control | Decision | Reason |
|---|---|---|
| L109 advance `<button>` | EDIT (ring-only) | DON'T-CHURN |
| L178 Back `<button>` | EDIT (aria + tokens) | New icon-only |
| L182 Refresh `<button>` | EDIT (aria + tokens) | New icon-only |
| L57 OrderCard `motion.div` | LEAVE + FLAG | Nested children risk |
| L97 shadcn `<Button>` Accept | SKIP | Ships own tokens |
| L188 shadcn `<Tabs>` | SKIP | Ships own tokens |
| Status pills `<span>` | SKIP | Decorative text |
| Icons (ShoppingCart, Package, MapPin, Clock, ChevronRight) | SKIP | Decorative |
| "View details" `<div>` + ChevronRight | SKIP | Non-interactive, parent card handles tap |
| PullToRefresh | SKIP | Own component |

**3 raw buttons edited, 2 shadcn skipped, 1 div left+flagged, rest decorative. Exhaustive.** ✅

### (6) Owner flags — ✅

**(a)** OrderCard is a clickable `<div>` with `onClick` but **no `role="button"` / `tabIndex={0}` / `onKeyDown`** → not keyboard-operable. **Structural a11y owner fix.** ✅

**(b)** Accept race handled: `toast.error("Could not accept — it may have been taken.")` + the hook presumably returns `false` on conflict. ✅

**(c) Additional flag — PullToRefresh wraps sticky header**: per AGENTS.md guardrail, `PullToRefresh` should wrap the page **body below any sticky header** because its `y` transform breaks `position: sticky`. Currently `<PullToRefresh onRefresh={handlePullRefresh}>` is the root wrapping the entire page including the `sticky top-0` header div. **FLAG** — the header may lose sticky behavior during pull-to-refresh gesture. Owner should restructure to:
```tsx
<div className="min-h-screen bg-background pb-20">
  {/* sticky header here, OUTSIDE PullToRefresh */}
  <PullToRefresh onRefresh={handlePullRefresh}>
    {/* content only */}
  </PullToRefresh>
</div>
```

### (7) Responsive + tap targets — ✅

**Layout at 375**: sticky header (Back `p-1.5` + `flex-1` title + Refresh `p-1.5`) — flex row, no crush. Tabs `w-full` with `flex-1` triggers. OrderCards `p-4` with `line-clamp-1` on address. Clean. ✅

**Sub-44px tap targets (FLAG — repo-wide compact patterns, NOT introduced here)**:
- Back/Refresh `p-1.5` → ~32px / ~28px (icon 20px/16px + 12px padding)
- advance `py-2` → ~28px height (`text-xs` 12px + 16px padding)
- Accept shadcn `size="sm"` → ~36px
- OrderCard `p-4` → big ✅

---

### Summary

**All 3 applied edits are validated correct. Zero changes needed.** Two owner flags:

1. **OrderCard** `<div>` → structural keyboard-a11y fix (`role="button"` + `tabIndex={0}` + `onKeyDown`)
2. **PullToRefresh** wraps sticky header → restructure so sticky header is outside the pull-to-refresh wrapper

This file's premium interaction pass is **done**. Ready for `npm run update` verification and owner commit.
