# DeepSeek run — 2026-06-14T06:55:05.032Z

- model: deepseek-chat
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

# DriverOrdersPage — Premium Interaction + A11y QA

## Plan

3 raw controls need edits (advance button, Back icon, Refresh icon). The OrderCard `motion.div` is a structural keyboard-a11y gap that should be flagged, not patched with display-only attrs. shadcn Button/Tabs are left alone.

## Proposed Diff

File: `src/pages/DriverOrdersPage.tsx`

### Edit A — advance-status `<button>` (L109)
**DON'T-CHURN ring-ONLY** — already has `active:scale-[0.98]` + `transition-all`.

**Before:**
```tsx
className="w-full py-2 rounded-xl bg-ig-gradient text-white text-xs font-bold touch-manipulation active:scale-[0.98] transition-all disabled:opacity-50"
```

**After:**
```tsx
className="w-full py-2 rounded-xl bg-ig-gradient text-white text-xs font-bold touch-manipulation active:scale-[0.98] transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### Edit B — header Back `<button>` (L178)
**icon-only tier 95** — add `aria-label`, `transition-all`, `active:scale-95`, focus ring.

**Before:**
```tsx
<button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-xl hover:bg-muted">
```

**After:**
```tsx
<button type="button" onClick={() => navigate(-1)} aria-label="Back" className="p-1.5 rounded-xl hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### Edit C — Refresh `<button>` (L182)
**icon-only tier 95** — add `aria-label`, `transition-all`, `active:scale-95`, focus ring.

**Before:**
```tsx
<button type="button" onClick={refetch} className="p-1.5 rounded-xl hover:bg-muted" disabled={isLoading}>
```

**After:**
```tsx
<button type="button" onClick={refetch} aria-label="Refresh" className="p-1.5 rounded-xl hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" disabled={isLoading}>
```

## Answers to Questions

1. **(A) advance button: DON'T-CHURN ring-ONLY correct?** ✅ **Correct.** Already has `active:scale-[0.98]` + `transition-all` → adding a second CSS scale would double-press. No aria needed (visible dynamic text label, one-shot action, not a toggle). OUTWARD `ring-ring` on `bg-ig-gradient` own fill is correct — the ring is the element's own `box-shadow`, not clipped by its own background.

2. **(B) Back icon: correct?** ✅ **Correct.** Icon-only → `aria-label="Back"`. `transition-all` because `hover:bg-muted` + new `active:scale-95` both animate, no prior transition class. `active:scale-95` is the icon-only tier. OUTWARD `ring-ring` on neutral `bg-background/95` sticky header.

3. **(C) Refresh icon: correct?** ✅ **Correct.** `aria-label="Refresh"`. `transition-all` + `active:scale-95`. The `animate-spin` on `RefreshCw` is a CSS animation on the child icon element, independent of the button's `transition-all` (which animates `background-color` + `transform`). Native `disabled` attribute untouched — `disabled` buttons don't fire `onClick`, and the ring won't appear when disabled (browser skips `:focus-visible` on disabled elements).

4. **(1) OrderCard `motion.div`: LEAVE correct?** ✅ **Correct to LEAVE + FLAG.** Three reasons:
   - **Double-anim risk:** Adding `active:scale` to the parent card would fire when the user taps a nested button (the `active` pseudo-class propagates up the DOM during `mousedown`/`touchstart` on the descendant). The nested Accept Button and advance `<button>` both have `stopPropagation` on `onClick`, but `active:` is a CSS pseudo-class, not a React event — it fires regardless of `stopPropagation`. This would cause a competing scale animation.
   - **Focus ring is a no-op:** A `<div>` with `onClick` but no `role="button"` + `tabIndex={0}` + `onKeyDown` handler cannot receive keyboard focus. Adding `focus-visible:ring` would never activate via keyboard navigation.
   - **Structural fix needed:** The card needs `role="button"`, `tabIndex={0}`, and `onKeyDown={(e) => e.key === 'Enter' && onTap()}` to be keyboard-operable. That's a structural change beyond a display-only pass.

5. **Inventory exhaustive?** ✅ **Yes.** 3 raw controls edited (advance button, Back, Refresh). shadcn `<Button>` (Accept Order) + `<Tabs>`/`<TabsTrigger>` skipped (ship own tokens). OrderCard `motion.div` left + flagged. Status pills/icons presentational.

6. **Owner flags (logic/out of scope):**
   - **(a) OrderCard keyboard a11y gap** — the clickable `<div>` is not keyboard-operable. Owner should add `role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onTap()}` to the `motion.div`.
   - **(b) Accept race condition** — `handleAccept` already handles the optimistic race with `toast.error("Could not accept — it may have been taken.")`. Correct as-is.
   - **(c) No other logic flags.** The `handleAdvance`/`handleAccept`/`refetch` flow is clean.

7. **Responsive 375/768/1280:**
   - **Sticky header** (Back `p-1.5` ~28px + title + Refresh `p-1.5` ~28px + Tabs) — fits at 375.
   - **OrderCard list** (`p-4 rounded-2xl` cards with store/status/items/price/address/time + Accept Button or advance+View-details) — single column, no crush.
   - **Sub-44px tap targets (FLAG — repo-wide compact patterns, NOT introduced here):** Back/Refresh `p-1.5` (~28px), advance button `py-2` (~32px), Accept shadcn `size="sm"` (~36px). These are the established compact patterns used across the repo's driver surfaces.

## Verify

Run `npm run update` — this change is className-only, 0 logic lines touched, should pass cleanly.
