# MiMo run — 2026-06-14T12:15:22.027Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Plan

Four controls to evaluate. Two (filter chips, PropertyCard) already have existing press effects → ring-ONLY. One (search input) is a carved-out form field. One (back button) has `active:bg-muted` → ring-ONLY. All four are straightforward single-line className appends plus one `aria-pressed` addition on the filter chips.

---

## Per-control verdict

### 1. Back button (L98) — `active:bg-muted` present → ring-ONLY

- **(a)** ADD ring. OUTWARD `ring-ring` (neutral parent `bg-background/95`).
- **(b)** SKIP press — `active:bg-muted` is an existing active:bg-wash → ring-ONLY.
- **(c)** SKIP aria-pressed — one-shot nav, `aria-label="Back"` already present ✓.
- **(d)** No flip — bare `transition` already covers everything.

**Before:**
```
"min-h-[40px] min-w-[40px] -ml-1 rounded-full flex items-center justify-center active:bg-muted transition touch-manipulation"
```
**After:**
```
"min-h-[40px] min-w-[40px] -ml-1 rounded-full flex items-center justify-center active:bg-muted transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

### 2. Search input (L112) — SKIP

Raw `<input>` with native focus tokens (`focus:border-primary/30 focus:bg-background`). Form-field carveout → **leave entirely as-is**. `aria-label` already present ✓.

---

### 3. Filter chips ×4 (L128) — `active:bg-muted` on inactive → ring-ONLY + aria-pressed

- **(a)** ADD ring. OUTWARD `ring-ring` (neutral parent `bg-background/95` sticky header).
- **(b)** SKIP press — inactive state has `active:bg-muted` (existing active:bg-wash) → ring-ONLY. (Active state has no explicit active:, but the control-wide rule is driven by the existing press on the inactive path.)
- **(c)** ADD `aria-pressed={active}` — persistent single-select segmented filter, bg-conveyed.
- **(d)** No flip — bare `transition` already covers everything; ring-only adds no new animated prop.

**Before (string concat):**
```jsx
"shrink-0 min-h-[40px] min-w-[40px] rounded-full px-3 py-2 text-xs font-semibold transition touch-manipulation " +
(active ? "bg-ig-gradient text-white" : "bg-muted/70 text-muted-foreground active:bg-muted")
```
**After (string concat):**
```jsx
"shrink-0 min-h-[40px] min-w-[40px] rounded-full px-3 py-2 text-xs font-semibold transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
(active ? "bg-ig-gradient text-white" : "bg-muted/70 text-muted-foreground active:bg-muted")
```
Add: `aria-pressed={active}` on the `<button>`.

---

### 4. PropertyCard `motion.button` (L189) — `active:scale-[0.99]` present → ring-ONLY

- **(a)** ADD ring. OUTWARD `ring-ring` (neutral parent `bg-background`). The card's own `overflow-hidden` does NOT clip its own `box-shadow` (Tailwind ring) — `overflow` only clips child content, not the element's own box-shadow. Outward ring renders fine.
- **(b)** SKIP press — already has `active:scale-[0.99]` → ring-ONLY.
- **(c)** SKIP aria-pressed — one-shot nav; `aria-label={`Open ${store.name}`}` already present ✓.
- **(d)** No flip — bare `transition` already covers everything.

**Before:**
```
"text-left rounded-2xl border border-border bg-card overflow-hidden shadow-sm active:scale-[0.99] transition"
```
**After:**
```
"text-left rounded-2xl border border-border bg-card overflow-hidden shadow-sm active:scale-[0.99] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

## Diff

```diff
--- a/src/pages/lodging/HotelsResortsDirectoryPage.tsx
+++ b/src/pages/lodging/HotelsResortsDirectoryPage.tsx
@@ -98,7 +98,7 @@
           <button type="button"
             onClick={() => navigate(-1)}
             aria-label="Back"
-            className="min-h-[40px] min-w-[40px] -ml-1 rounded-full flex items-center justify-center active:bg-muted transition touch-manipulation"
+            className="min-h-[40px] min-w-[40px] -ml-1 rounded-full flex items-center justify-center active:bg-muted transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
@@ -128,9 +128,10 @@
               <button type="button"
                 key={f.id}
                 onClick={() => setActiveFilter(f.id)}
+                aria-pressed={active}
                 className={
-                  "shrink-0 min-h-[40px] min-w-[40px] rounded-full px-3 py-2 text-xs font-semibold transition touch-manipulation " +
+                  "shrink-0 min-h-[40px] min-w-[40px] rounded-full px-3 py-2 text-xs font-semibold transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
                   (active
                     ? "bg-ig-gradient text-white"
                     : "bg-muted/70 text-muted-foreground active:bg-muted")
@@ -189,7 +190,7 @@
       transition={{ delay: Math.min(index, 6) * 0.04 }}
-      className="text-left rounded-2xl border border-border bg-card overflow-hidden shadow-sm active:scale-[0.99] transition"
+      className="text-left rounded-2xl border border-border bg-card overflow-hidden shadow-sm active:scale-[0.99] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
       aria-label={`Open ${store.name}`}
```

**Guard tally:** 3 className edits (controls 1, 3, 4) + 1 new `aria-pressed` (control 3). All ring-ONLY, all OUTWARD `ring-ring`, ring-inset=0. 0 new `active:scale`, 0 transition flips, 0 logic lines touched. Control 2 skipped (form-field carveout). `aria-label` on controls 1 and 4 already present, kept.

---

## Owner must-verify

- **`npm run update`** must pass (type-check + worker type-check + production build) before committing.
- Preview at `/hotels-list` at 375/768/1280 to confirm ring visibility on the filter chips (the `bg-ig-gradient` active chip on the neutral header) and PropertyCard (the `bg-card` card on `bg-background`).
- The `aria-pressed={active}` on filter chips is the house pattern for custom single-select bg-conveyed segmented filters; a structural `role="tablist"`/`role="tab"`/`aria-selected` upgrade would be more semantically precise but is OUT OF SCOPE (structural).
