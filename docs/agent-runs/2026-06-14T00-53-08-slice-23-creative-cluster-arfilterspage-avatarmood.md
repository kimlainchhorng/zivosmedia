# DeepSeek run — 2026-06-14T00:53:08.853Z

- model: deepseek-chat
- task: SLICE 23 — CREATIVE CLUSTER: ARFiltersPage + AvatarMoodsPage
======================================================================

ROLE: You are a senior front-end reviewer. I am applying a className-ONLY interaction-token + a11y polish pass to two customer-facing React (Vite + Tailwind v4 + shadcn/ui + framer-motion) pages. Decide the EXACT className/attribute changes for each interactive control. Be surgical.

HARD RULE (scope): className changes + tiny DISPLAY-ONLY attributes only (aria-label / aria-pressed / aria-expanded). NO logic, NO handlers, NO tabIndex/role/onKeyDown, NO state, NO routing, NO supabase. If a control is keyboard-inaccessible because it lacks role/tabIndex, FLAG it for the owner — do NOT add the keyboard logic yourself. If a real <button> is missing an onClick (no-op), FLAG it — do NOT wire the handler.

TOKEN RULES (house style, parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button>/<a>/<Link> (NOT shadcn) get the full set: active:scale-[X] + transition-(all|transform) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Tier scales: wide/card [0.98]; chips/small/segmented-pill-tabs [0.97]; icon-only scale-95; full-width/menu-rows/wide-rows [0.99].
- transition-all when the control ALSO has hover:bg-* (color fade) or underline; transition-transform for pure icon-scale with no hover color. If transition-all already present, just append active:scale + ring.
- shadcn <Button>/<Input>/<Textarea> already ship tokens -> DO NOT add tokens.
- framer-motion motion.button WITH whileTap -> focus RING ONLY (CSS active:scale is DEAD under motion's inline transform). motion.button WITHOUT whileTap -> CSS active:scale is LIVE.
- Non-interactive div/span/img with no onClick -> NOTHING. But a real <button> is natively focusable even without onClick -> a focus ring is still correct (and FLAG the missing onClick to the owner).
- ring-inset ONLY inside overflow-hidden rounded parents where a plain OUTWARD ring would clip at the rounded corner. KEY CSS FACT: `overflow-hidden` clips an element's DESCENDANTS, NOT the element's OWN box-shadow/ring — so a ring on the overflow-hidden element ITSELF is NOT clipped; ring-inset is only needed when the focusable control sits a few px INSIDE a SEPARATE overflow-hidden rounded ancestor.
- overflow-x-auto scroller rows: a plain outward focus ring on a chip is NOT clipped when the row has ample vertical padding (py-4 >> ring 2-4px) — precedent GroceryPage store tabs / EventsPage category tabs use NORMAL outward ring, NOT ring-inset.
- Toggle/selection controls whose pressed-state is conveyed ONLY by background also get aria-pressed (display-only). Controls with visible text get their accessible name from the text (no aria-label needed); icon-only controls need aria-label.

============================================================
FILE 1: src/pages/ARFiltersPage.tsx (150 lines, /filters, SwipeBackContainer, NOT ProtectedRoute)
============================================================
SKIP: Back (shadcn Button L59); hero banner motion.div L74 (no onClick -> presentational -> nothing). TWO controls:

(A) Category chip, L90-103 — RAW <button type="button">, .map'd over CATEGORIES, onClick={() => setActive(c)}. className = cn("shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all", active === c ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted"). transition-all ALREADY present. Selection conveyed ONLY by bg (bg-ig-gradient vs bg-secondary). Visible category text = accessible name. Parent row = `flex gap-2 overflow-x-auto scrollbar-hide px-4 py-4` (NOT overflow-hidden; ample py-4).

Q-A1: append active:scale-[0.97] (chip/segmented tier) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring to the cn base, and add aria-pressed={active === c}? Confirm chip tier [0.97].
Q-A2: NORMAL OUTWARD ring (overflow-x-auto row with py-4, GroceryPage/EventsPage precedent) — NOT ring-inset. Confirm.

(B) Filter grid card, L112-139 — motion.button WITH whileTap={{ scale: 0.96 }}, onClick={() => setSavedId(isSaved ? null : f.id)}. ALREADY has aria-pressed={isSaved}. className = "relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted shadow-sm text-left active:opacity-90". Element ITSELF is rounded-2xl overflow-hidden (clips its inner <img>/overlay/badges, NOT its own ring). Selection shown by a "Saved" badge (top-right) + aria-pressed — NO selection ring. Visible filter name/creator/uses text = accessible name. Parent grid `grid grid-cols-2 sm:grid-cols-3 gap-3 px-4` (NOT overflow-hidden). Note existing active:opacity-90 (CSS opacity press feedback; not a transform, so it coexists with framer's whileTap scale).

Q-B1: motion.button WITH whileTap -> focus RING ONLY (no active:scale)? Confirm. Keep the existing active:opacity-90 untouched?
Q-B2: NORMAL OUTWARD ring (own overflow-hidden clips descendants not own ring; parent grid not overflow-hidden) — NOT ring-inset, and NO ring-offset (no selection ring to match)? i.e. append exactly `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Confirm.
Q-B3: aria-pressed already present + visible text name -> NO aria-label needed? Confirm (or do you want aria-label="Save filter <name>" for clarity? I lean NO — visible text suffices).

============================================================
FILE 2: src/pages/AvatarMoodsPage.tsx (70 lines, /avatar-moods, SwipeBackContainer, NOT ProtectedRoute)
============================================================
SKIP: Back (shadcn Button L41); hero banner motion.div L49 (no onClick -> nothing); loading skeleton divs (non-interactive). ONE control:

(C) Mood grid button, L60-63 — motion.button WITH whileTap={{ scale: 0.95 }}. **NO onClick handler** (the page is an "orphan public catalog" per the file header — tapping does nothing yet; the hero says "Tap to set as your avatar's mood" but no handler is wired). className = "aspect-square rounded-2xl bg-ig-gradient/5 border border-border hover:bg-ig-gradient/10 transition-all flex flex-col items-center justify-center gap-1". Real <button> (natively focusable). transition-all ALREADY present. Content = emoji <span> + label <span> (= accessible name). Element rounded-2xl, NOT overflow-hidden. Parent grid `grid grid-cols-3 gap-2` NOT overflow-hidden. No selection state exists (no `selected`/`savedId` binding).

Q-C1: Since it's a real focusable <button>, append focus RING ONLY (whileTap owns scale) = `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`, NORMAL outward ring (rounded-2xl, parent grid not overflow-hidden), NO ring-offset? Confirm.
Q-C2: NO aria-pressed (no selection state to reflect) and NO aria-label (emoji+label visible text = name)? Confirm.
Q-C3: FLAG to owner: the mood button has NO onClick (no-op tap) — owner should wire the set-mood handler + a selected state (then aria-pressed + a selection ring become applicable). Agree this is owner-scope, not mine? Confirm. (And: is adding a focus ring to a currently-no-op button still correct? I say YES — it's a real focusable button, keyboard users land on it, and the ring is ready when the handler is wired.)

============================================================
DELIVERABLE: For each control (A)(B)(C) give the EXACT final className string + any attrs. Note where you DIVERGE from my proposals and why. Keep it tight.
- files: src/pages/ARFiltersPage.tsx, src/pages/AvatarMoodsPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

# SLICE 23 — CREATIVE CLUSTER: ARFiltersPage + AvatarMoodsPage

## Plan

Two customer-facing creative surfaces, both with minimal interactive controls:

**ARFiltersPage** (150 lines, `/filters`): 2 controls — (A) category chips ×5, (B) filter grid cards ×8 (motion.button with whileTap).

**AvatarMoodsPage** (70 lines, `/avatar-moods`): 1 control — (C) mood grid buttons (motion.button with whileTap, **no onClick handler**).

All 3 controls are real `<button>` elements (natively focusable). The ring additions are functional, not dead CSS.

---

## Proposed changes

### FILE 1: `src/pages/ARFiltersPage.tsx`

#### (A) Category chip — L90-103

**Before:**
```tsx
className={cn(
  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
  active === c
    ? "bg-ig-gradient text-white shadow-sm"
    : "bg-secondary text-foreground hover:bg-muted",
)}
```

**After:**
```tsx
className={cn(
  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  active === c
    ? "bg-ig-gradient text-white shadow-sm"
    : "bg-secondary text-foreground hover:bg-muted",
)}
aria-pressed={active === c}
```

**Rationale:**
- Chip/segmented tier → `active:scale-[0.97]` ✓
- `transition-all` already present → just append scale + ring ✓
- Normal outward ring — `overflow-x-auto` row has `py-4` (16px padding), ring is ~2px, no clipping risk. GroceryPage/EventsPage precedent ✓
- `aria-pressed` — selection conveyed only by background color ✓

#### (B) Filter grid card — L112-139

**Before:**
```tsx
className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted shadow-sm text-left active:opacity-90"
```

**After:**
```tsx
className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted shadow-sm text-left active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Rationale:**
- `motion.button` WITH `whileTap={{ scale: 0.96 }}` → CSS `active:scale` would be dead → **ring ONLY** ✓
- Keep existing `active:opacity-90` untouched — it's an opacity feedback, not a transform, coexists with framer's scale ✓
- Normal outward ring — element's own `overflow-hidden` clips its descendants (the `<img>`, overlays), NOT its own box-shadow/ring. Parent grid `grid grid-cols-2 gap-3` is NOT overflow-hidden ✓
- No `ring-offset` needed — no selection ring to match ✓
- `aria-pressed` already present + visible text (name/creator/uses) → no `aria-label` needed ✓

---

### FILE 2: `src/pages/AvatarMoodsPage.tsx`

#### (C) Mood grid button — L60-63

**Before:**
```tsx
className="aspect-square rounded-2xl bg-ig-gradient/5 border border-border hover:bg-ig-gradient/10 transition-all flex flex-col items-center justify-center gap-1"
```

**After:**
```tsx
className="aspect-square rounded-2xl bg-ig-gradient/5 border border-border hover:bg-ig-gradient/10 transition-all flex flex-col items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Rationale:**
- `motion.button` WITH `whileTap={{ scale: 0.95 }}` → **ring ONLY** ✓
- Normal outward ring — `rounded-2xl`, NOT `overflow-hidden`, parent grid `grid grid-cols-3 gap-2` NOT overflow-hidden ✓
- No `ring-offset` — no selection state exists ✓
- No `aria-pressed` — no selection state to reflect ✓
- No `aria-label` — emoji + visible label text = accessible name ✓
- **YES, add the focus ring to a no-op button** — it's a real focusable `<button>`, keyboard users land on it, and the ring is ready when the handler is wired ✓

---

## Owner flags

1. **AvatarMoodsPage mood buttons have NO onClick handler** (L60-63). The hero text says "Tap to set as your avatar's mood" but tapping does nothing. Owner should wire the set-mood handler (likely a mutation to update the user's avatar profile) and add a selected state (then `aria-pressed` + a selection ring become applicable). The focus ring I added is correct and ready for when the handler is wired.

2. **ARFiltersPage filter grid cards** — the save toggle (`setSavedId(isSaved ? null : f.id)`) is a mock toggle with no persistence. If/when connected to a real `ar_effects` table or user preferences, the `aria-pressed` will correctly reflect the saved state.

---

## Verify gate

After applying these changes, run:
```bash
npm run update
```

Expected: TRUE EXIT 0 (type-check + worker type-check + production build all pass). The changes are purely additive className strings + one `aria-pressed` attribute — zero logic risk.
