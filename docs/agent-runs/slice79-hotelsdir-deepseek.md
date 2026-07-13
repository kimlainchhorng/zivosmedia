# DeepSeek run — 2026-06-14T12:14:13.255Z

- model: deepseek-chat
- task: You are reviewing ONE React + Tailwind page for a premium-feel interaction + accessibility token pass. The codebase has a strict, established design-token vocabulary. Propose ONLY className-string changes and display-only ARIA attributes (aria-label / aria-pressed). DO NOT propose any logic, role, tabIndex, onKeyDown, structural, or data changes. Preserve all queries/handlers byte-identical.

FILE: src/pages/lodging/HotelsResortsDirectoryPage.tsx — a public directory list of hotels/resorts at /hotels-list. Cards navigate to /hotel/:id.

DESIGN TOKENS (house rules):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD by default; ring-inset ONLY for a flush edge child of a rounded overflow-hidden PARENT, or a flush media tile in a near-gapless grid.
- Ring color: `--ring` resolves BLACK. Outward ring renders against the control's PARENT surface: neutral parent (bg-card/background/muted) = ring-ring; saturated/dark/image parent or ring-over-media = ring-white/70. A gradient-FILLED button on a NEUTRAL parent still uses ring-ring (outward ring renders against the neutral parent, not its own fill).
- Press-scale tiers (CSS): icon-only active:scale-95; small text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip/tab/single-select active:scale-[0.97]; wide full-width row WITH own surface active:scale-[0.98]; bare full-width row active:scale-[0.99]. Don't renumber an existing scale.
- "No second competing press": a control that ALREADY has a press effect (framer whileTap, OR an existing CSS active:scale, OR active:bg-wash, OR active:opacity) gets ring-ONLY — do NOT add a second CSS active:scale.
- transition rule: `transition-transform` if scale is the only animated CSS prop; `transition-all` if also hover bg/text/border/opacity. A `transition-colors`/`transition-opacity` GAINING a new active:scale must flip to transition-all. Bare Tailwind `transition` already covers transform+colors+opacity → a new scale needs NO flip, leave as-is. Adding ONLY a focus ring (no new animated prop) → leave the transition class as-is.
- aria: aria-label ONLY on icon-only / image-only controls. aria-pressed ONLY on a PERSISTENT single-select segmented filter/tab whose on/off is bg-conveyed. NOT on one-shot actions (nav/cancel/save).
- shadcn <Button>/<Badge>/<Skeleton> ship own focus/scale tokens → LEAVE. Raw <input>/<textarea> with native focus tokens (focus:border-*, focus:bg-*) → LEAVE (form-field carveout).

CONTROLS in this file:
1. L98 Back button (icon-only <button>, lucide ArrowLeft). Existing classes: `min-h-[40px] min-w-[40px] -ml-1 rounded-full flex items-center justify-center active:bg-muted transition touch-manipulation`. aria-label="Back" already present. Parent surface = sticky header bg-background/95 (neutral).
2. L112 search <input type="text"> with `focus:border-primary/30 focus:bg-background outline-none ... transition`, aria-label present.
3. L128 filter chip ×4 (<button>), segmented single-select. className via string concat: `"shrink-0 min-h-[40px] min-w-[40px] rounded-full px-3 py-2 text-xs font-semibold transition touch-manipulation " + (active ? "bg-ig-gradient text-white" : "bg-muted/70 text-muted-foreground active:bg-muted")`. Sits in the sticky header (neutral bg-background). `active` boolean available.
4. L189 PropertyCard motion.button (whole card). Existing: `text-left rounded-2xl border border-border bg-card overflow-hidden shadow-sm active:scale-[0.99] transition`. framer `transition={{delay}}` (NOT whileTap). aria-label={`Open ${store.name}`} already present. Sits in a `grid gap-3` list on bg-background.

For EACH control: state whether to (a) add a focus ring and its exact tokens incl. ring color + inset/outward, (b) add/skip a press scale and which tier, (c) add/skip aria-pressed, (d) whether any transition class must flip. Give the EXACT final className string. Flag anything that needs a structural change as OUT OF SCOPE. Be precise and terse.
- files: src/pages/lodging/HotelsResortsDirectoryPage.tsx

---

## Review: `HotelsResortsDirectoryPage.tsx`

### Plan

Four controls need token pass. The search `<input>` and the `<Skeleton>`/`<Badge>` are left untouched (form-field carveout / shadcn tokens). The filter chips and PropertyCard need ring-only treatment (both already have press effects). The Back button needs a ring + press scale.

---

### Proposed changes

**File:** `src/pages/lodging/HotelsResortsDirectoryPage.tsx`

#### 1. L98 Back button (icon-only `<button>`)

**Analysis:**
- Already has `active:bg-muted` (a press effect) → **ring-only**, no second press scale
- Parent = `bg-background/95` (neutral) → `ring-ring`, outward
- `aria-label="Back"` already present → no new aria

**Change:** Append focus ring to existing className.

**Before:**
```tsx
className="min-h-[40px] min-w-[40px] -ml-1 rounded-full flex items-center justify-center active:bg-muted transition touch-manipulation"
```

**After:**
```tsx
className="min-h-[40px] min-w-[40px] -ml-1 rounded-full flex items-center justify-center active:bg-muted transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

#### 2. L112 search `<input>` — **LEAVE** (form-field carveout, already has `focus:border-primary/30 focus:bg-background outline-none`)

#### 3. L128 filter chips ×4 (`<button>`)

**Analysis:**
- Segmented single-select, bg-conveyed via `active` boolean → **add `aria-pressed`**
- Already has `active:bg-muted` on inactive state (a press effect) → **ring-only**, no second press scale
- Parent = `bg-background/95` (neutral) → `ring-ring`, outward
- Container is `overflow-x-auto` but chips have `gap-1.5` → not flush edge children, outward is safe

**Change:** Add `aria-pressed` + focus ring.

**Before:**
```tsx
<button type="button"
  key={f.id}
  onClick={() => setActiveFilter(f.id)}
  className={
    "shrink-0 min-h-[40px] min-w-[40px] rounded-full px-3 py-2 text-xs font-semibold transition touch-manipulation " +
    (active
      ? "bg-ig-gradient text-white"
      : "bg-muted/70 text-muted-foreground active:bg-muted")
  }
>
  {f.label}
</button>
```

**After:**
```tsx
<button type="button"
  key={f.id}
  onClick={() => setActiveFilter(f.id)}
  aria-pressed={active}
  className={
    "shrink-0 min-h-[40px] min-w-[40px] rounded-full px-3 py-2 text-xs font-semibold transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
    (active
      ? "bg-ig-gradient text-white"
      : "bg-muted/70 text-muted-foreground active:bg-muted")
  }
>
  {f.label}
</button>
```

#### 4. L189 PropertyCard `motion.button`

**Analysis:**
- Already has `active:scale-[0.99]` (existing CSS press) → **ring-only**, no second press scale
- Parent = `bg-background` (neutral) → `ring-ring`, outward
- `aria-label` already present → no new aria
- `overflow-hidden` on the card itself, but the ring is on the card's outer edge (not a flush child inside a parent's overflow-hidden) → outward is safe

**Change:** Append focus ring to existing className.

**Before:**
```tsx
className="text-left rounded-2xl border border-border bg-card overflow-hidden shadow-sm active:scale-[0.99] transition"
```

**After:**
```tsx
className="text-left rounded-2xl border border-border bg-card overflow-hidden shadow-sm active:scale-[0.99] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

### Summary of changes

| Control | Ring | Press scale | aria | Transition flip |
|---------|------|-------------|------|-----------------|
| Back button | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | None (ring-only, `active:bg-muted` exists) | None (already has `aria-label`) | None |
| Search input | **LEAVE** (form-field carveout) | — | — | — |
| Filter chips ×4 | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | None (ring-only, `active:bg-muted` exists) | `aria-pressed={active}` | None |
| PropertyCard | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | None (ring-only, `active:scale-[0.99]` exists) | None (already has `aria-label`) | None |

**Guard tally:** 3 className edits + 1 new `aria-pressed` (×4 via map) + 0 new `aria-label` + 0 logic lines touched + 0 competing press scales added.

### Owner verification

- Run `npm run update` to confirm type-check + build pass
- Preview at `/hotels-list` on localhost (375/768/1280 widths) to verify rings render correctly on the neutral backgrounds
- Confirm the filter chips' `aria-pressed` conveys state correctly (screen reader announces "pressed" for active chip)
