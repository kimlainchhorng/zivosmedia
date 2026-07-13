# MiMo run — 2026-06-14T00:53:57.891Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Plan

**3 controls across 2 files.** All className + display-only attrs only. Zero logic changes.

| # | File | Control | Change |
|---|------|---------|--------|
| A | `ARFiltersPage.tsx` | Category chip (raw `<button>`) | `aria-pressed` + `active:scale-[0.97]` + `focus-visible:ring` (outward) |
| B | `ARFiltersPage.tsx` | Filter card (`motion.button` w/ `whileTap`) | `focus-visible:ring` only (outward) — motion owns press-scale |
| C | `AvatarMoodsPage.tsx` | Mood button (`motion.button` w/ `whileTap`, **no onClick**) | `focus-visible:ring` only (outward) — motion owns press-scale |

**Advisory gate:** run both DeepSeek + MiMo for three-way convergence before applying.

---

## Convergence with your proposals

### (A) Category chip — **ALL THREE CONFIRMED**

- **Q-A1 ✅** chip tier `[0.97]`, `aria-pressed={active === c}`, visible text = name (no `aria-label`). `transition-all` already present — just append scale + ring.
- **Q-A2 ✅** **normal outward ring** — `overflow-x:auto` clips overflowing *content*, not the button's ~2px box-shadow ring. Precedent: GroceryPage store tabs, EventsPage category tabs both use outward ring in identical `overflow-x-auto` scrollers.

### (B) Filter grid card — **ALL THREE CONFIRMED**

- **Q-B1 ✅** `motion.button` w/ `whileTap={{ scale: 0.96 }}` → CSS `active:scale` is DEAD under framer's inline transform → **ring ONLY**. Keep existing `active:opacity-90` untouched (coexists — framer's transform overrides during press; on programmatic focus-without-tap the opacity applies; zero cost to keep).
- **Q-B2 ✅** **normal outward ring** — element's own `overflow-hidden` clips its descendants (`<img>`/overlay), NOT its own `box-shadow` ring. Parent grid NOT overflow-hidden. NO `ring-offset` (no selection ring to match).
- **Q-B3 ✅** **NO `aria-label`** — the card's visible text (filter name + creator + uses) provides the accessible name. `aria-pressed` already present. (Screen readers read all child text content as the button's accessible name.)

### (C) Avatar mood button — **ALL THREE CONFIRMED**

- **Q-C1 ✅** `motion.button` w/ `whileTap` → **ring ONLY**, **normal outward ring** (element `rounded-2xl` NOT `overflow-hidden`, parent grid NOT `overflow-hidden`), NO `ring-offset`.
- **Q-C2 ✅** **NO `aria-pressed`** (no selection state), **NO `aria-label`** (emoji `<span>` + label `<span>` = accessible name).
- **Q-C3 ✅** **Owner flag:** the `<button>` has **no `onClick`** — keyboard users land on it but activation does nothing. Owner must wire a set-mood handler + selected state. Adding a focus ring now is still correct: it's a real focusable `<button>`, keyboard users *do* land on it, and the ring is ready when the handler arrives.

---

## Proposed diffs

### `src/pages/ARFiltersPage.tsx`

#### (A) Category chip — lines 90-103

**Before:**
```tsx
            <button
              key={c}
              type="button"
              onClick={() => setActive(c)}
              className={cn(
                "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                active === c
                  ? "bg-ig-gradient text-white shadow-sm"
                  : "bg-secondary text-foreground hover:bg-muted",
              )}
            >
```

**After:**
```tsx
            <button
              key={c}
              type="button"
              onClick={() => setActive(c)}
              aria-pressed={active === c}
              className={cn(
                "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active === c
                  ? "bg-ig-gradient text-white shadow-sm"
                  : "bg-secondary text-foreground hover:bg-muted",
              )}
            >
```

**Net: 1 new line (`aria-pressed`), 1 className edit (+38 chars in the base string).**

#### (B) Filter grid card — lines 120-127

**Before:**
```tsx
              <motion.button
                key={f.id}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setSavedId(isSaved ? null : f.id)}
                className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted shadow-sm text-left active:opacity-90"
                aria-pressed={isSaved}
              >
```

**After:**
```tsx
              <motion.button
                key={f.id}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setSavedId(isSaved ? null : f.id)}
                className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted shadow-sm text-left active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-pressed={isSaved}
              >
```

**Net: 1 className edit (+53 chars appended). Zero new lines.**

---

### `src/pages/AvatarMoodsPage.tsx`

#### (C) Mood grid button — lines 60-63

**Before:**
```tsx
              <motion.button key={m.id} type="button" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: Math.min(idx, 20) * 0.02 }} whileTap={{ scale: 0.95 }} className="aspect-square rounded-2xl bg-ig-gradient/5 border border-border hover:bg-ig-gradient/10 transition-all flex flex-col items-center justify-center gap-1">
```

**After:**
```tsx
              <motion.button key={m.id} type="button" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: Math.min(idx, 20) * 0.02 }} whileTap={{ scale: 0.95 }} className="aspect-square rounded-2xl bg-ig-gradient/5 border border-border hover:bg-ig-gradient/10 transition-all flex flex-col items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**Net: 1 className edit (+53 chars appended). Zero new lines.**

---

## Summary of changes

| # | Type | What | `aria-*` added | Scale | Ring |
|---|------|------|----------------|-------|------|
| A | Raw `<button>` | Category chip | `aria-pressed` | `active:scale-[0.97]` (chip tier) | Outward |
| B | `motion.button` + `whileTap` | Filter card | (already has `aria-pressed`) | None (motion owns) | Outward |
| C | `motion.button` + `whileTap` | Mood button (⚠ no onClick) | None (no state) | None (motion owns) | Outward |

**Total: 2 className edits + 1 new `aria-pressed` attr on (A). 0 logic changes. 0 new lines beyond the standalone `aria-pressed`.**

---

## Owner flags (NOT fixed — out of scope)

1. **AvatarMoodsPage mood button has NO `onClick`** — it's a real focusable `<button>` that keyboard users land on, but tapping/pressing does nothing. The hero text says "Tap to set as your avatar's mood" but no handler or selection state is wired. Owner should add a `setMood` mutation + `selectedMoodId` state + `aria-pressed={selectedMoodId === m.id}`, at which point the focus ring is already in place.

---

## Verification

Run before marking done:
```bash
npm run update
```
Must pass (0 type errors + worker type-check + production build). Both pages are NOT `ProtectedRoute` so they render without auth; preview at `/filters` and `/avatar-moods` should show the category chips with focus-visible rings on Tab, filter cards with focus-visible rings on Tab, and mood buttons with focus-visible rings on Tab.
