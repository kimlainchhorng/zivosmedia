# MiMo run — 2026-06-14T07:09:59.523Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/NutritionPage.tsx (308-line "Nutrition" — a LOCAL-ONLY daily meal & macro logger: localStorage `zivo:nutrition:v1` food entries + `zivo:nutrition:water:v1` water counter, NO Supabase/auth; useState entries/water/adding/draft; sticky header [shadcn ghost icon Back + ig-gradient Nutrition title] + a daily-totals ig-gradient banner [calories + macro row + progress bar] + a Water tracker card [−/+ counter + glass pips] + 4 meal-slot SECTIONS (Breakfast/Lunch/Dinner/Snacks) each with an add-icon button, a list of logged entries each with a remove-icon button, and an inline add-form [text + 4 numeric inputs + shadcn Log/Cancel]). RULES: className strings + display-only attributes (aria-*) ONLY; preserve ALL logic, onClick, navigate, setState (setEntries/setWater/setAdding/setDraft), addEntry/removeEntry/adjustWater, localStorage calls, byte-identical. Don't add a SECOND competing press effect (framer whileTap vs CSS active:scale). Don't churn already-polished controls. Don't churn shadcn <Button> (ships own focus/scale tokens). Don't renumber an existing scale (several buttons already carry active:scale-90 — LEAVE that number).

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD default. `focus-visible:ring-inset` ONLY when the control is a flush edge child of a rounded overflow-hidden PARENT, OR a flush media tile in a near-gapless grid.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring; saturated/dark/image surface AS THE PARENT = ring-white/70. A gradient-FILLED button (bg-ig-gradient) sitting on a NEUTRAL parent still uses ring-ring (the ring renders against the neutral parent, not the button's own fill).
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; wide full-width row/card WITH its own surface active:scale-[0.98]; BARE full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop; transition-all when ALSO hover:bg/text/border OR existing color/opacity wash. FLIP RULE: transition-colors/transition-opacity GAINING a NEW active:scale MUST flip to transition-all. ALREADY transition-all (or bare `transition`, which already covers transform) → append without flipping. ALREADY framer whileTap → append the focus ring ONLY.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select segmented filter/tab/picker OR a two-way toggle whose on/off is bg-conveyed. NOT aria-pressed on one-shot actions (nav, +/- counter step, open-add-form, remove/delete).

CONTROLS (give me per control: exact final after-string of appended classes, ring color + reason, press tier, transition class + whether a FLIP is needed, ring-inset vs outward + reason, and any aria-* attr; flag any to LEAVE):

A) L185 WATER "Remove a glass" icon button (raw `<button>`, icon-only Minus, ALREADY `aria-label="Remove a glass"`, one-shot `onClick={() => adjustWater(-1)}`, `disabled={water === 0}`): base `h-9 w-9 rounded-full border border-border flex items-center justify-center disabled:opacity-40 hover:bg-secondary active:scale-90 transition`. ALREADY `active:scale-90` + bare `transition` + `hover:bg-secondary`, NO focus. Parent = water-tracker card `bg-card`, button group `gap-1.5`. → plan: ring-ONLY append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (LEAVE the existing active:scale-90 — don't renumber; bare `transition` already covers transform+colors so NO flip; OUTWARD ring-ring on neutral bg-card; NO new aria — already labeled). Confirm.

B) L194 WATER "Add a glass" icon button (raw `<button>`, icon-only Plus, ALREADY `aria-label="Add a glass"`, one-shot `onClick={() => adjustWater(1)}`): base `h-9 w-9 rounded-full bg-ig-gradient text-white flex items-center justify-center shadow-sm active:scale-90 transition`. ALREADY `active:scale-90` + bare `transition`, NO hover, NO focus. Parent = water-tracker card `bg-card`. → plan: ring-ONLY append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (LEAVE active:scale-90; bare `transition` covers transform, NO flip; OUTWARD ring-ring — bg-ig-gradient is the button's OWN fill, ring renders against neutral bg-card parent; NO new aria). Confirm ring COLOR (ring-ring vs ring-white/70 for a gradient-filled button on neutral parent) + no-flip + no-aria.

C) L235 MEAL-SLOT "Add {label}" icon button (raw `<button>`, mapped ×4 over SLOTS, icon-only Plus, ALREADY `aria-label={`Add ${label}`}`, one-shot `onClick={() => setAdding(key)}` reveals the inline add-form): base `h-8 w-8 rounded-full bg-ig-gradient text-white flex items-center justify-center shadow-sm active:scale-90 transition`. Same shape as B. Parent = section header on `bg-card`. → plan: ring-ONLY append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (LEAVE active:scale-90; NO flip; OUTWARD ring-ring; NO new aria — already labeled; single edit hits all 4 slots). OPEN QUESTION: this button toggles a disclosure (reveals an inline add-form) — does it warrant `aria-expanded={isAdding}`, or LEAVE aria as-is (it's a one-shot "open the form", and the button is REPLACED by the form when open: `{!isAdding && (<button .../>)}` — it unmounts rather than persisting as a toggle)? Resolve.

D) L255 ENTRY "Remove {name}" icon button (raw `<button>`, mapped per logged entry, icon-only X, ALREADY `aria-label={`Remove ${e.name}`}`, one-shot `onClick={() => removeEntry(e.id)}`): base `h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors`. Has `transition-colors` + `hover:text`/`hover:bg`, NO scale, NO focus. Parent = entry row inside section on `bg-card`. → plan: FLIP `transition-colors`→`transition-all` + APPEND `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (icon-only tier active:scale-95; FLIP mandatory — transition-colors gaining a NEW scale; OUTWARD ring-ring on neutral bg-card; NO new aria — already labeled). Confirm tier + FLIP + ring + no-aria.

ALSO CONFIRM I should LEAVE these: the shadcn ghost-icon Back `<Button>` L125 (aria-label="Back" already, own tokens); the shadcn "Log" `<Button>` L287 + "Cancel" `<Button>` L290 (inline add-form actions, own tokens); the add-form text/numeric `<input>`s L278/281-284 (already have `focus:outline-none focus:ring-2 focus:ring-rose-500/30`); SwipeBackContainer/SEOHead (wrappers/non-visual); the totals banner motion.div L139 + progress motion.div L151 + add-form motion.div L267 (entrance/disclosure anim, NO onClick); the glass-pip indicator divs L206 + macro progress bars (decorative); Apple/Droplets/Coffee/Soup/Pizza/Cookie/Minus/Plus/X icons (decorative).

Be concise and exact. Return the precise final className after-string per control + any aria attr. C/D are mapped templates (single edit hits every slot / every entry). Resolve C's aria-expanded open question explicitly.
- files: src/pages/NutritionPage.tsx

---

## Plan

Four raw `<button>` controls need the focus-ring append. Three already carry `active:scale-90` + bare `transition` (ring-only, no flip, no renumber). One has `transition-colors` gaining its first scale (FLIP to `transition-all`). Zero new aria attrs. Zero logic touched.

---

## Per-control resolution

### A) Water "Remove a glass" (L185) — ring-only

| | value |
|---|---|
| **ring** | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| **ring color** | `ring-ring` — neutral `bg-card` parent |
| **inset/outward** | OUTWARD — `gap-1.5` clearance, not flush-edge |
| **press** | LEAVE existing `active:scale-90` (don't renumber) |
| **transition** | LEAVE bare `transition` (covers transform+colors already) → **NO flip** |
| **aria** | none new — already `aria-label="Remove a glass"` |

Before → after:
```diff
- className="h-9 w-9 rounded-full border border-border flex items-center justify-center disabled:opacity-40 hover:bg-secondary active:scale-90 transition"
+ className="h-9 w-9 rounded-full border border-border flex items-center justify-center disabled:opacity-40 hover:bg-secondary active:scale-90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### B) Water "Add a glass" (L194) — ring-only

| | value |
|---|---|
| **ring** | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| **ring color** | `ring-ring` — gradient is the button's OWN fill; ring renders against neutral `bg-card` parent (per vocab rule) |
| **inset/outward** | OUTWARD — `gap-1.5` clearance |
| **press** | LEAVE existing `active:scale-90` |
| **transition** | LEAVE bare `transition` → **NO flip** |
| **aria** | none new — already `aria-label="Add a glass"` |

```diff
- className="h-9 w-9 rounded-full bg-ig-gradient text-white flex items-center justify-center shadow-sm active:scale-90 transition"
+ className="h-9 w-9 rounded-full bg-ig-gradient text-white flex items-center justify-center shadow-sm active:scale-90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### C) Meal-slot "Add {label}" (L235, mapped ×4) — ring-only

| | value |
|---|---|
| **ring** | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| **ring color** | `ring-ring` — same gradient-fill-on-neutral-parent as B |
| **inset/outward** | OUTWARD — section header row has clearance |
| **press** | LEAVE existing `active:scale-90` |
| **transition** | LEAVE bare `transition` → **NO flip** |
| **aria** | none new — already `aria-label={...}` |

**C's open question resolved: LEAVE `aria-expanded`.** The button **unmounts** when the form opens (`{!isAdding && (<button.../>)}`) — it's not a persistent disclosure trigger that coexists with the revealed content. `aria-expanded` semantically requires the trigger to remain in the DOM alongside the expanded region. This is a one-shot "replace self with form" pattern. No `aria-expanded`.

```diff
- className="h-8 w-8 rounded-full bg-ig-gradient text-white flex items-center justify-center shadow-sm active:scale-90 transition"
+ className="h-8 w-8 rounded-full bg-ig-gradient text-white flex items-center justify-center shadow-sm active:scale-90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### D) Entry "Remove {name}" (L255, mapped per entry) — FLIP + scale + ring

| | value |
|---|---|
| **ring** | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| **ring color** | `ring-ring` — neutral `bg-card` parent |
| **inset/outward** | OUTWARD — entry rows inside `px-4` section, not flush-edge |
| **press** | NEW `active:scale-95` (icon-only tier) |
| **transition** | **FLIP** `transition-colors` → `transition-all` (gaining first CSS scale) |
| **aria** | none new — already `aria-label={...}` |

```diff
- className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
+ className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

## LEAVE list (confirmed)

| Control | Reason |
|---|---|
| shadcn Back `<Button>` L125 | `aria-label="Back"` already; own focus/scale tokens |
| shadcn "Log" `<Button>` L287 | own tokens |
| shadcn "Cancel" `<Button>` L290 | own tokens |
| `<input>` fields L278/281–284 | already `focus:outline-none focus:ring-2 focus:ring-rose-500/30` |
| `SwipeBackContainer` / `SEOHead` | wrappers, non-visual |
| `motion.div` totals banner L139 | entrance anim, no onClick |
| `motion.div` progress bar L151 | entrance anim, no onClick |
| `motion.div` add-form L267 | disclosure anim, no onClick |
| Glass-pip `div`s L206 | decorative indicator |
| Macro progress bars | decorative |
| All icons (ArrowLeft, Apple, Droplets, Minus, Plus, X, Coffee, Soup, Pizza, Cookie) | decorative |

---

## Guard-rail diff summary

| metric | count |
|---|---|
| className edits | 4 (A, B, C, D) |
| `focus-visible:ring` | 4 |
| `ring-ring` | 4 (all OUTWARD on neutral `bg-card`) |
| `ring-inset` | 0 |
| `ring-white/70` | 0 |
| new `aria-label` | 0 |
| new `aria-pressed` | 0 |
| new `aria-expanded` | 0 |
| new `active:scale` | 1 (D only — `95`; A/B/C kept existing `90`) |
| FLIPs | 1 (D: `transition-colors` → `transition-all`) |
| logic lines touched | 0 |

---

## Full proposed diff (`src/pages/NutritionPage.tsx`)

```diff
*** a/src/pages/NutritionPage.tsx
--- b/src/pages/NutritionPage.tsx
@@ Water Remove button (L185)
-                className="h-9 w-9 rounded-full border border-border flex items-center justify-center disabled:opacity-40 hover:bg-secondary active:scale-90 transition"
+                className="h-9 w-9 rounded-full border border-border flex items-center justify-center disabled:opacity-40 hover:bg-secondary active:scale-90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
@@ Water Add button (L194)
-                className="h-9 w-9 rounded-full bg-ig-gradient text-white flex items-center justify-center shadow-sm active:scale-90 transition"
+                className="h-9 w-9 rounded-full bg-ig-gradient text-white flex items-center justify-center shadow-sm active:scale-90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
@@ Meal-slot Add button (L235)
-                    className="h-8 w-8 rounded-full bg-ig-gradient text-white flex items-center justify-center shadow-sm active:scale-90 transition"
+                    className="h-8 w-8 rounded-full bg-ig-gradient text-white flex items-center justify-center shadow-sm active:scale-90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
@@ Entry Remove button (L255)
-                      className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
+                      className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

Four single-line `className` substitutions. No other lines touched.

---

## Owner verify

1. `npm run update` — must pass (type-check + worker type-check + build, 0 errors).
2. Tab through the page at 375px: every raw `<button>` should show a black outward 2px focus ring on keyboard focus.
3. The water +/− and meal-slot + buttons keep their existing `active:scale-90` press (no visual change).
4. The entry remove X buttons gain `active:scale-95` + a color-to-destructive hover wash (all under `transition-all`).
5. Shadcn Back/Log/Cancel buttons are untouched.
