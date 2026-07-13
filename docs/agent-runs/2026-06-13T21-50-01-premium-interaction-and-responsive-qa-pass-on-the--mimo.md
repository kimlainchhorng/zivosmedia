# MiMo run — 2026-06-13T21:50:01.814Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction and responsive QA pass on the public cafe ordering storefront at src/pages/cafe/PublicCafeOrderPage.tsx (route /cafe/:slug). Reference standard for interaction tokens: src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: className and display-only changes ONLY. Do NOT change any supabase query or RPC call (cafe_place_public_order, cafe_is_open_now, cafe_popular_items, cafe_public_review_summary, cafe_public_loyalty_balance, etc.), any mutation, state logic, routing, or pricing math. Identify genuine gaps only: (1) interactive controls missing active:scale press feedback or focus-visible rings — note the Pickup-time ASAP and Schedule buttons around line 1396-1413 use transition-colors only, unlike the tip preset buttons just above them which have active:scale-[0.97] plus a focus-visible ring; (2) responsive crush or overflow at 375px width; (3) any fetched-but-unused data fields; (4) contrast or legibility bugs; (5) accessibility gaps. For each finding give the exact line and exact before/after className. Keep it concise: this page is already heavily polished, so flag only real gaps, not a speculative redesign.
- files: src/pages/cafe/PublicCafeOrderPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

The page is heavily polished already — most custom controls have proper `active:scale` + `focus-visible:ring` tokens. The file was truncated at ~line 1400 in my context, so my primary review covers the visible portion plus the one explicit finding the task calls out.

**One confirmed gap:** The ASAP/Schedule toggle buttons (~lines 1396–1413) use `transition-colors` only, lacking the `active:scale-[0.97]` + `focus-visible:ring` tokens that the tip preset buttons immediately above them already have. This is an inconsistency within the same section.

**Visible-portion audit (clean):**
- ✅ Featured hero buttons: `active:scale-[0.98]` + `focus-visible:ring-2` 
- ✅ Bundle buttons: `active:scale-[0.98]` + `focus-visible:ring-2`
- ✅ Category chips: `active:scale-[0.97]` + `focus-visible:ring-2`
- ✅ Menu item cards: `active:scale-[0.98]` + `focus-visible:ring-2`
- ✅ Modifier picker buttons: `active:scale-[0.98]` + `focus-visible:ring-2`
- ✅ Search clear button: `active:scale-[0.95]` + `focus-visible:ring-2`
- ✅ "Reserve a table" / "About" links: `focus-visible:ring-2`
- ✅ Responsive: `grid-cols-1 sm:grid-cols-2` items, horizontal-scroll rails, `max-w-md` dialogs — no crush at 375px
- ✅ Contrast: all text/background pairs (warning banners, badges, dietary pills) use semantic dark-mode-aware tones
- ✅ Fetched data consumed: categories, items, modifiers, groups, links, loyalty, settings, popular IDs, review summary, open status, bundles, bundle items, table label, customer summary, loyalty balance — no orphan fields

**No other gaps found in the visible portion.**

---

## Proposed Diff

**File:** `src/pages/cafe/PublicCafeOrderPage.tsx`
**Lines:** ~1396–1413 (ASAP and Schedule buttons — the exact line numbers may differ since my copy is truncated; search for `setScheduleMode("asap")` and `setScheduleMode("later")`)

### Button 1 — ASAP

**Before:**
```
transition-colors
```
(or whatever the current transition + scale-less token is)

**After:**
```
transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

### Button 2 — Schedule for later

**Before:** (same pattern as ASAP)
```
transition-colors
```

**After:**
```
transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

**Rationale:** `transition-colors` → `transition-all` so the scale transform animates smoothly. The `active:scale-[0.97]` matches the tip preset buttons just above. The `focus-visible:ring` matches every other custom control on the page.

### Concrete find-and-fix instructions

Since I can't see the exact lines, search for:

```
setScheduleMode("asap")
setScheduleMode("later")
```

Each `<button>` calling those will have a className containing `transition-colors`. Replace `transition-colors` with `transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` on both, preserving all other existing classes (the selected/unselected border/background conditionals).

---

## Anything the owner must verify or deploy

1. **Applier: get the full file** — my copy was truncated at ~line 1400. After applying the ASAP/Schedule fix, scan the remaining portion (tip section, promo/gift-card inputs, customer info form, submit button, reorder button, loyalty section) for any other custom `<button>` elements (not shadcn `<Button>`) that lack `active:scale` + `focus-visible:ring`. Shadcn `<Button>` components are fine as-is (they have built-in focus-visible rings).
2. **Verify:** `npm run update` must pass.
3. **Preview** at 375 / 768 / 1280 — confirm the ASAP/Schedule buttons animate on press and show ring on Tab focus.
4. **Minor a11y note (optional, outside core scope):** The dialog's icon-only `<Button size="icon">` (Minus/Plus quantity) lack `aria-label` — consider adding `aria-label="Decrease quantity"` / `aria-label="Increase quantity"` if touching those lines anyway. This doesn't affect the interaction pass.
