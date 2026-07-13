# DeepSeek run — 2026-06-14T01:38:33.723Z

- model: deepseek-chat
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and tell me whether my planned per-control changes are complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/PlacesPage.tsx  (route /places — a Foursquare-style place directory; backed by the real `places` table, react-query key ["places-catalog"]; a search input, a horizontal category filter-chip row, and a list of result cards that deep-link to a place via /places/:id)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, framer-motion whileTap). Please keep all data logic exactly as it is: the Supabase query, the react-query key, the setQuery/setActiveCategory state, the navigate() targets, the categories/filtered useMemo derivations, and all prop wiring should stay byte-identical. Only advise on className tokens and the display-only attributes listed above.

DESIGN TOKEN SYSTEM we are applying consistently across the app:
- Focus ring (append to every focusable interactive control): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  (no ring-offset)
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] + rounded-sm ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99].
- transition class: use transition-transform when scale is the only animated property; use transition-all when there is also a hover:bg / hover:text / hover:opacity that should animate alongside the press.
- aria-label only on icon-only / image-only controls (visible-text controls do not need it).
- aria-pressed only on a control that shows a persistent SELECTED/toggle state AND is a real button (native <button> or role="button"); not on one-shot actions.
- Don't-churn rule: if a control already has a valid existing active:scale (or whileTap) or transition value, keep it rather than renumbering/reflipping it to the nominal tier.

COMPONENT-TYPE RULES we follow (so we don't double-style or mis-style):
- shadcn <Button> already ships built-in tokens -> leave untouched, EXCEPT an icon-only shadcn Button still needs an aria-label if it lacks one.
- A native <input> that already has its own focus ring -> leave untouched (never add active:scale to an input).
- A raw <button>/<a> gets the full token set; if it already has a valid transition (e.g. transition-all), we keep it and only add the missing pieces (scale + ring + any aria).
- A framer-motion element WITH whileTap: CSS active:scale is overridden by motion's inline transform, so we do NOT add a CSS scale; we add the focus ring via box-shadow ring only. If the element already has a CSS transition that animates only color/background (e.g. transition-colors for a hover:bg), that does not conflict with motion's transform, so we keep it as-is.

MY PLANNED EDITS (please confirm each is right, or correct it):

1. Category filter chips, line ~123 (a .map over `categories`; each is a RAW <button type="button"> with onClick={() => setActiveCategory(c)} and a cn() className: base "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize" + conditional `${activeCategory === c ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted"}`; the selected chip is conveyed ONLY by background; the visible label is the category text c):
   plan: add aria-pressed={activeCategory === c} AND insert  active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  into the cn() base (segmented filter-chip tier [0.97]); DON'T-CHURN the existing transition-all (already present, animates the hover:bg-muted alongside the press); visible text -> NO aria-label; the chip row (line ~121) is `flex gap-2 overflow-x-auto scrollbar-hide` so I plan a normal OUTWARD ring (overflow-x-auto clips horizontal content, not the element's own ~2px box-shadow ring). Correct?

2. Result cards, line ~163 (a .map over `filtered`; each is a framer-motion motion.button WITH whileTap={{ scale: 0.985 }} + a per-row entrance/stagger animation, onClick={() => navigate(`/places/${p.id}`)}, className "w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left"; content = cover image + place name + optional verified badge + category + address + rating; NO existing aria-label):
   plan: append  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  ONLY (ring-only — whileTap already owns the press-scale, so no CSS active:scale); KEEP whileTap={{ scale: 0.985 }} (don't-churn); KEEP the existing transition-colors (it animates only the hover:bg-secondary/40 and does not conflict with motion's transform); NO aria-label (the row has visible child text — name/category/address/rating — which provides the accessible name naturally); normal OUTWARD ring (the row is itself rounded-2xl and is a direct child of a space-y-2 list that is NOT overflow-hidden). Correct?

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm none of these need a change):
- Back button, line ~82: shadcn <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full"> — labeled, ships tokens.
- Search input, line ~111: a native <input type="search"> that ALREADY has focus:outline-none focus:ring-2 focus:ring-rose-500/30 — leave as-is, never active:scale an input.
- Hero stat card, line ~95: a motion.div with an entrance animation and NO onClick — presentational.
- Loading skeletons (line ~139), empty-state (line ~147), and the no-match text (line ~156) — non-interactive.
- The cover <img> (line ~175), the verified <ShieldCheck aria-label="Verified"> (line ~186), and the MapPin/Star/ChevronRight icons — decorative children inside the row button, not separate controls.

QUESTIONS:
Q1. Category chips (edit #1): is aria-pressed={activeCategory === c} + active:scale-[0.97] + ring + DON'T-CHURN transition-all correct for a RAW <button> selection chip? And is a normal OUTWARD ring right for a chip inside an overflow-x-auto row (no ring-inset)?
Q2. Result cards (edit #2): is ring-ONLY correct (whileTap owns the scale)? Is KEEPING transition-colors right (it only animates the hover bg, doesn't touch transform)? And — since this row has NO existing aria-label and relies on its visible child text (name/category/address/rating) for its accessible name — is leaving it WITHOUT an aria-label the right call (vs adding one)? Is whileTap={{ scale: 0.985 }} a sensible press for these full-width cards, or would you nudge it?
Q3. Confirm the untouched list is correct (back shadcn Button labeled; search input with its own focus ring; hero/skeleton/empty/no-match non-interactive; cover img + verified ShieldCheck + decorative icons are children of the row button).
Q4. Anything missed? At a 375px-wide phone viewport: does the category chip row (overflow-x-auto) scroll cleanly, and do the result cards (16x16 cover + name/verified/category/address/rating column + trailing chevron) lay out without crushing?

Please answer Q1-Q4 and give me any corrected className strings. Keep all data/query logic unchanged. Thank you.
- files: src/pages/PlacesPage.tsx

---

# Review: PlacesPage Premium Interaction Pass

## Short Plan

Two controls need changes: (1) category filter chips (raw `<button>`) get `aria-pressed` + press-scale + ring, (2) result cards (`motion.button` with `whileTap`) get ring-only. All other controls are correctly left untouched. The diff is 2 className edits + 1 `aria-pressed` attribute — minimal and safe.

---

## Proposed Changes

**File:** `src/pages/PlacesPage.tsx`

### Edit 1: Category filter chips (line ~123)

**Before:**
```tsx
className={cn(
  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize",
  activeCategory === c ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
)}
```

**After:**
```tsx
aria-pressed={activeCategory === c}
className={cn(
  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring capitalize",
  activeCategory === c ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
)}
```

### Edit 2: Result cards (line ~163)

**Before:**
```tsx
className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left"
```

**After:**
```tsx
className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

## Answers to Q1–Q4

### Q1: Category chips — ✅ Correct

- **`aria-pressed={activeCategory === c}`** — correct. This is a persistent selection toggle (one chip is always "pressed"), and it's a real `<button>`. The visible text label provides the accessible name, so no `aria-label` needed.
- **`active:scale-[0.97]`** — correct for segmented filter-chip tier.
- **Ring: normal OUTWARD** — correct. `overflow-x-auto` clips horizontal *content overflow*, not the element's own `box-shadow` ring. The chip has `px-3.5` padding, so the ring has ~14px clearance from the row edges. No `ring-inset` needed.
- **DON'T-CHURN `transition-all`** — correct. It already animates `hover:bg-muted` and will now also ease the press-scale.

### Q2: Result cards — ✅ Correct

- **Ring-ONLY** — correct. `whileTap={{ scale: 0.985 }}` owns the press-scale; a CSS `active:scale` would be overridden by motion's inline transform.
- **KEEP `transition-colors`** — correct. It only animates `hover:bg-secondary/40` (color/background), never `transform`. No conflict with motion's scale.
- **NO `aria-label`** — correct. The row has visible child text (name, category, address, rating) that provides the accessible name naturally. Adding `aria-label` would *replace* that rich content with a static string, making it *less* accessible.
- **`whileTap={{ scale: 0.985 }}`** — correct. This is a sensible press for full-width cards (matches the wide-row `[0.99]` tier closely). Don't-churn — it's already set and works well.

### Q3: Untouched list — ✅ Correct

| Control | Reason |
|---------|--------|
| Back shadcn `<Button>` | Ships tokens, has `aria-label="Back"` |
| Search `<input>` | Has its own `focus:ring-2 focus:ring-rose-500/30` — leave as-is |
| Hero `motion.div` | Presentational, no `onClick` |
| Loading skeletons | Non-interactive |
| Empty-state | Non-interactive |
| No-match text | Non-interactive |
| Cover `<img>` | Child of the row button |
| Verified `<ShieldCheck>` | Has `aria-label="Verified"` — decorative inside the button |
| Icons (MapPin, Star, ChevronRight) | Decorative children |

### Q4: 375px viewport — ✅ Clean

**Category chips:** `flex gap-2 overflow-x-auto scrollbar-hide` — chips are `shrink-0` with `px-3.5 py-1.5` (~60-100px each). At 375px (~343px inner), 3-4 chips fit before scrolling. The `overflow-x-auto` provides smooth horizontal scroll. Clean.

**Result cards:** `flex items-center gap-3 p-3` inside `max-w-2xl mx-auto px-4`:
- Inner width: ~343px − 24px (p-3×2) = **~319px**
- Cover: `w-16 h-16` = 64px + `gap-3` = 12px → **76px fixed**
- Trailing chevron: `h-4 w-4` = 16px + `gap-3` = 12px → **28px fixed**
- Remaining for content column: **~215px**
- Content: name (`line-clamp-1`) + category + address + rating — all `text-[11px]` or smaller, comfortably fit in 215px. No crush.

---

## Summary

**2 edits, 1 new attribute, 0 data/logic changes.** The diff is minimal and follows every established pattern from the 27+ prior slices. Ready for `npm run update` verification.
