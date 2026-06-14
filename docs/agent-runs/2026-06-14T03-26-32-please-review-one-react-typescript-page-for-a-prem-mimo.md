# MiMo run — 2026-06-14T03:26:32.227Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and tell me whether my planned per-control edits are complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/DigitalProductsPage.tsx  (a "create & sell digital products" creator hub reached by in-app navigation; `useAuth` + two `useQuery`s [creator earnings + active subscribers]; `activeTab` useState [My Products / Create New / Analytics]; a create-flow with `selectedType` + form fields + `handleCreateProduct` [supabase.functions.invoke "shop-ops-record-submit"]. Layout: sticky header [raw back button + title + PenTool icon]; a 2-col stats grid of motion.div cards; a horizontal-scroll tab row; tab-0 empty-state card with a "Create Product" CTA; tab-1 create flow [product-type list of motion.button cards -> a form with shadcn Input/Textarea/Button]; tab-2 empty analytics; a Platform Features grid of motion.div cards; a Quick Actions grid of react-router <Link> cards; a footer. Has a ZivoMobileNav bottom nav.)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, framer-motion whileTap if warranted). Keep ALL logic byte-identical: every onClick (`navigate("/more")`, `setActiveTab(i)`, `setSelectedType(type)`, `setSelectedType(null)`), `handleCreateProduct`, the two `useQuery` blocks, the `supabase.functions.invoke`, all useState, the `<Link to={...}>` targets, the AnimatePresence. Only advise on className tokens, whileTap, and aria-* attributes.

IMPORTANT CONTEXT — two custom CSS utility classes are used (I read their definitions in src/index.css):
- `.zivo-card-organic` ALREADY ships `transition: transform 0.25s ..., box-shadow 0.3s ease;` AND `.zivo-card-organic:active { transform: scale(0.97); }` — i.e. it ALREADY has a transition AND a press-scale baked into the CSS. It is also `border-radius: 20px; overflow: hidden;` (overflow:hidden clips its CHILDREN, not its own box-shadow).
- `.zivo-btn-signature` ALREADY ships `transition: all 0.3s ease;` AND `.zivo-btn-signature:active { transform: scale(0.97); }` — ALREADY has transition + press-scale baked in.
=> So any control carrying `zivo-card-organic` or `zivo-btn-signature` should NOT get a Tailwind `active:scale-*` or `transition-*` class (it already presses + transitions via CSS) — it only needs a focus ring if it lacks one. Adding `active:scale`/`transition` there would double up / churn.

DESIGN TOKEN SYSTEM we are applying consistently across the app:
- Focus ring (append to every focusable interactive control that lacks one): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  (no ring-offset). Use focus-visible:ring-inset INSTEAD OF an outward ring when the control is a flush edge child of a rounded overflow-hidden parent.
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99].
- transition class: transition-transform when scale is the only animated property; transition-all when there is also a hover:bg/hover:text/hover:opacity that should animate alongside the press. If a control ALREADY ships transition-all (or a CSS transition), append the ring (don't re-add).
- aria-label only on icon-only / image-only controls (a control with rich descriptive visible child text does NOT get an aria-label).
- aria-pressed on a toggle/segmented control with a persistent on/off selected state; NOT on a one-shot action or a navigation.
- Don't-churn: if a control already has a valid focus ring / aria-label / press-scale (including a CSS-level one), keep it rather than re-adding/re-flipping.

COMPONENT-TYPE RULES we follow:
- shadcn <Button>/<Input>/<Textarea> ship built-in tokens -> leave untouched (an icon-only shadcn Button still needs an aria-label if it lacks one).
- A framer-motion motion.div with an entrance initial/animate and NO onClick is presentational -> leave untouched.
- A RAW <button>/<input>/<select> (plain HTML) ships NO tokens.
- A motion.button is a real, natively-focusable <button> element.
- A react-router <Link> renders a real, natively-focusable <a>.

MY PLANNED EDITS (please confirm each is right, or correct it):

1. Header back button, line ~119 (RAW `<button type="button">`, icon-only [ArrowLeft], `onClick={() => navigate("/more")}`, className `"p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation"` — NO aria-label, NO focus ring, NO transition, NO active:scale):
   plan: ADD `aria-label="Back"` + APPEND `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.
   - QUESTION (Q1): it currently has `hover:bg-muted/50` with NO transition (the hover bg snaps today). For the new press-scale I planned `transition-all` (so the hover bg AND the new scale both ease). The alternative is `transition-transform` (ease ONLY the new scale, leave the hover-bg snapping as-is = don't-churn the existing snap). Which is the better consistency call for a raw icon-only button that had no transition at all? My lean: transition-all (consistent with our icon-button precedent where hover:bg + a press-scale ride together), but please advise — is adding transition-all here an acceptable polish or an unwanted behavior change to the hover snap?

2. Tab row buttons, line ~150 (RAW `<button type="button">` in `tabs.map`, `onClick={() => setActiveTab(i)}`, template-literal className base `"shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors touch-manipulation"` + an active/inactive conditional [`bg-foreground text-background` vs `bg-muted/60 text-muted-foreground`]; visible child = constant tab WORD; parent row `flex gap-2 overflow-x-auto scrollbar-hide`):
   plan: ADD `aria-pressed={i === activeTab}` + FLIP `transition-colors`->`transition-all` + APPEND `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the base.
   - FLIP rationale: the existing `transition-colors` eases the active/inactive bg+text change but NOT the new `active:scale` transform; `transition-all` (superset) eases both.
   - segmented-chip tier -> active:scale-[0.97]; aria-pressed valid (constant WORD, selection conveyed by bg); NO aria-label (visible text); OUTWARD ring (overflow-x-auto does not clip box-shadow).

3. "Create Product" empty-state CTA, line ~173 (RAW `<button type="button">`, `onClick={() => setActiveTab(1)}`, className `"zivo-btn-signature px-5 py-2.5 text-xs inline-flex items-center gap-1.5 touch-manipulation"`; visible child = "Create Product" text + Plus icon):
   plan: APPEND `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ONLY. NO aria-label (visible text). NO active:scale, NO transition (zivo-btn-signature already ships transition:all + :active scale 0.97 via CSS).

4. Product-type cards, line ~192 (`motion.button` in `productTypes.map`, `onClick={() => setSelectedType(type)}`, className `"w-full zivo-card-organic flex items-start gap-3 p-3.5 text-left touch-manipulation"`; rich visible content [icon + title + desc + chevron]; NO whileTap):
   plan: APPEND `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ONLY. NO active:scale, NO transition (zivo-card-organic already ships them via CSS). NO aria-label (rich visible text). NO aria-pressed (one-shot selection that advances a flow, not a persistent toggle).
   - QUESTION (Q4): the card carries `zivo-card-organic` which is `overflow: hidden` + `border-radius: 20px`. The focus ring goes on the card element ITSELF (which is the motion.button, NOT a child of an overflow-hidden parent). My understanding: an element's own `overflow: hidden` clips its CHILDREN, not its own outward box-shadow ring, so an OUTWARD ring is correct here (no ring-inset). Please confirm OUTWARD vs ring-inset.

5. "Back to type list" button, line ~215 (RAW `<button type="button">`, icon-only [ArrowLeft], `onClick={() => setSelectedType(null)}`, className `"p-2 rounded-full hover:bg-muted/50 touch-manipulation"`):
   plan: ADD `aria-label="Back"` + APPEND `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (same treatment as control #1).

6. Quick Action cards, line ~305 (a react-router `<Link to={a.href}>` with NO className, wrapping a `<div className="zivo-card-organic p-3.5 flex items-center gap-3 touch-manipulation">` [icon + label]; 4 of them in a 2-col grid):
   plan: the FOCUSABLE element is the `<Link>`'s `<a>` (no ring today). My lean: add `className="rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` to the `<Link>` (rounded-[20px] to match the inner card's 20px radius so the ring corners align). Keep the inner `zivo-card-organic` div as-is (it already provides the press-scale + transition on press). NO aria-label (visible label text). NO active:scale on the anchor (the inner card handles the press).
   - QUESTION (Q6): is adding a className (rounded + ring) to a previously-className-less `<Link>` the right way to give the anchor a visible focus ring, or is there a cleaner established pattern (e.g. ring on the inner div via focus-within, or leaving the Link to a future logic pass)? Is `rounded-[20px]` the right radius to match `zivo-card-organic`?

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm):
- Stats grid cards (line ~131), Platform Features cards (line ~280): motion.div, NO onClick — presentational.
- shadcn Input (title line ~238, price line ~246), Textarea (line ~242), Submit Product Button (line ~248): ship tokens.
- All lucide icons + the submitted-state check card (line ~227) — decorative / non-interactive.

QUESTIONS:
Q1. Header back + back-to-types raw icon buttons (#1/#5): aria-label="Back" + ring + active:scale-95 — and is transition-all (vs transition-transform) the right transition choice when the button previously had NO transition but DOES have hover:bg?
Q2. Tabs (#2): aria-pressed + FLIP transition-colors->transition-all + active:scale-[0.97] + OUTWARD ring — correct & consistent with the segmented-filter-chip precedent?
Q3. zivo-btn-signature CTA (#3) + zivo-card-organic product cards (#4): RING-ONLY (no active:scale / no transition, since the CSS classes already ship both) — correct don't-churn call?
Q4. Product cards (#4): OUTWARD ring vs ring-inset, given the element itself is overflow:hidden + rounded-20px (but is NOT a child of an overflow-hidden parent)?
Q5. aria-pressed: should the TABS get it (my plan: yes — persistent selected tab) but the product-type cards NOT (my plan: no — one-shot selection that advances the create flow)? Confirm.
Q6. Quick Action <Link> cards (#6): best in-scope way to give the anchor a focus ring — className (rounded-[20px] + ring) on the Link? And at 375px, do the stats grid, the tab row, the product-type cards, the create form, and the 2-col Quick Actions grid lay out without crushing?

Please answer Q1-Q6 and give me the corrected className strings + confirm the aria attributes. Keep all logic unchanged. Thank you.
- files: src/pages/DigitalProductsPage.tsx

---

## Review: DigitalProductsPage.tsx — Interaction Polish Pass

### Inventory verification

Your inventory is **exhaustive and correct**. Every interactive control is accounted for:

| Control | Type | Your plan | Verdict |
|---------|------|-----------|---------|
| Header back (L119) | RAW `<button>`, icon-only | aria-label + full set | ✅ |
| Tab buttons (L150) | RAW `<button>`, visible WORD | aria-pressed + FLIP + full set | ✅ |
| "Create Product" CTA (L173) | RAW `<button>`, `zivo-btn-signature` | Ring-only | ✅ |
| Product-type cards (L192) | `motion.button`, `zivo-card-organic` | Ring-only | ✅ |
| Back-to-types (L215) | RAW `<button>`, icon-only | aria-label + full set | ✅ |
| Quick Action Links (L305) | `<Link>` → real `<a>`, `zivo-card-organic` inner | Ring on `<a>` | ✅ |
| shadcn Input/Textarea/Button (L238/242/246/248) | shadcn | Leave untouched | ✅ |
| Stats/Features cards + empty states | `motion.div`, no `onClick` | Leave untouched | ✅ |

---

### Answers to Q1–Q6

**Q1 — `transition-all` vs `transition-transform` on the two raw icon back buttons (#1, #5):**

**Use `transition-all`.** Rationale: (a) it matches the established icon-button precedent across 39+ slices (MedicationsPage, MusicStickersPage, etc. — raw icon buttons with `hover:bg` consistently got `transition-all`); (b) a snap-hover-bg next to an eased press-scale on the *same element* looks visually inconsistent to the user (the hover color jumps while the scale glides); (c) `transition-transform` would leave the `hover:bg-muted/50` snapping, which is actually *less* premium — the whole point of this pass is polish. Adding an ease to the hover bg is a side-effect, but it's the *correct* side-effect. **`transition-all` is a polish, not a churn.**

**Q2 — Tabs (#2):**

**All correct.** FLIP `transition-colors`→`transition-all` (the new `active:scale` transform isn't covered by `transition-colors`). `aria-pressed={i === activeTab}` (persistent selected tab, constant WORD, selection conveyed by bg only). `active:scale-[0.97]` (segmented-chip tier). OUTWARD ring (`overflow-x-auto` scroll does NOT clip `box-shadow`). NO `aria-label` (visible text). Exact match to FitnessActivitiesPage/PlacesPage/CouponsPage/RecentlyViewedPage precedent.

**Q3 — `zivo-btn-signature` CTA (#3) + `zivo-card-organic` cards (#4):**

**Correct don't-churn on both.** `zivo-btn-signature` already ships `transition: all 0.3s ease` + `:active { scale(0.97) }` via CSS. `zivo-card-organic` already ships `transition: transform 0.25s..., box-shadow 0.3s ease` + `:active { scale(0.97) }` via CSS. Adding Tailwind `active:scale-*` or `transition-*` would double up. **Ring-only append is the right call for both.**

**Q4 — OUTWARD ring on product-type cards (#4) despite `zivo-card-organic` having `overflow: hidden`:**

**OUTWARD ring is correct.** `overflow: hidden` clips an element's **descendant** content to the padding box. It does **not** clip the element's **own** `box-shadow` (which is what `ring-2` generates — `box-shadow: 0 0 0 2px var(--ring)`). The ring extends outside the element's own border-box and is painted independently of the element's overflow clipping context. No `ring-inset` needed.

**Q5 — `aria-pressed` on tabs (yes) vs product-type cards (no):**

**Correct on both counts.**
- **Tabs → `aria-pressed`:** persistent selected state (the tab stays highlighted), constant WORD per tab, selection conveyed ONLY by background color → `aria-pressed` is the correct disclosure.
- **Product-type cards → NO `aria-pressed`:** one-shot selection that immediately advances the flow (clicking "Online Course" moves to the create form via `setSelectedType(type)` + AnimatePresence transition). It's a **navigation/action**, not a persistent toggle. The selected state is transient (the card disappears).

**Q6 — Focus ring on Quick Action `<Link>` cards:**

**`className="rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` on the `<Link>` is the cleanest in-scope approach.** The `<a>` is the focusable element; the ring belongs on it. `rounded-[20px]` matches `zivo-card-organic`'s `border-radius: 20px` so the ring corners align with the visual card shape. The `<a>` itself has NO `overflow: hidden` (only the inner child div does, via `zivo-card-organic`), so the ring extends outward freely.

Alternatives rejected: (a) `focus-within` on the inner div — more complex, and the div isn't the focusable element; (b) leaving it to a future logic pass — the ring is a className-only change, in-scope now.

**Responsive at 375px — no crush:** Stats grid `grid-cols-2` (cards `p-3.5 text-center`, compact stat values) → fine. Tab row `flex gap-2 overflow-x-auto` → scrolls if needed → fine. Product-type cards `w-full` vertical stack → fine. Create form single-column inputs → fine. Quick Actions `grid grid-cols-2` (icon + short label, 3–4 words max) → fine.

---

### Corrected className strings — exact before/after

**Control #1 — Header back button (L119):**

```
// BEFORE
className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation"

// AFTER
className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
Add attribute: `aria-label="Back"` (after `type="button"`)

**Control #2 — Tab buttons (L150):**

```
// BEFORE (base in template literal)
`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors touch-manipulation ${ ... }`

// AFTER (base in template literal)
`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation ${ ... }`
```
Add attribute: `aria-pressed={i === activeTab}` (after `key={tab}`)

**Control #3 — "Create Product" CTA (L173):**

```
// BEFORE
className="zivo-btn-signature px-5 py-2.5 text-xs inline-flex items-center gap-1.5 touch-manipulation"

// AFTER
className="zivo-btn-signature px-5 py-2.5 text-xs inline-flex items-center gap-1.5 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Control #4 — Product-type cards (L192):**

```
// BEFORE
className="w-full zivo-card-organic flex items-start gap-3 p-3.5 text-left touch-manipulation"

// AFTER
className="w-full zivo-card-organic flex items-start gap-3 p-3.5 text-left touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Control #5 — Back-to-type-list button (L215):**

```
// BEFORE
className="p-2 rounded-full hover:bg-muted/50 touch-manipulation"

// AFTER
className="p-2 rounded-full hover:bg-muted/50 touch-manipulation transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
Add attribute: `aria-label="Back"` (after `type="button"`)

**Control #6 — Quick Action `<Link>` (L305):**

```
// BEFORE
<Link key={a.label} to={a.href}>

// AFTER
<Link key={a.label} to={a.href} className="rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```
Inner `zivo-card-organic` div — **unchanged** (it already provides transition + press-scale + visual card).

---

### Summary of changes

| Metric | Count |
|--------|-------|
| Controls edited | 6 |
| Focus rings added | 6 |
| `aria-label` added | 2 (back buttons) |
| `aria-pressed` added | 1 (tab buttons) |
| Transitions added (from none) | 2 (`transition-all`, back buttons) |
| Transitions flipped | 1 (`transition-colors`→`transition-all`, tabs) |
| Transitions kept (don't-churn) | 2 (`zivo-btn-signature` + `zivo-card-organic` CSS) |
| `active:scale-*` added | 4 (2× `-95` icon-only, 1× `-[0.97]` tabs; but only on controls that lacked CSS press-scale) |
| `ring-inset` used | 0 |
| Logic lines touched | 0 |

**Expected diffstat:** ~6 ins / 6 del (+0 net) for className lines, plus 3 new display-only ARIA attributes.

---

### Owner must verify

1. **Run `npm run update`** — must pass (0 type errors + production build).
2. **Visual check at 375px** — Quick Actions 2-col grid with `rounded-[20px]` ring should align cleanly with the inner `zivo-card-organic` card corners.
3. **Keyboard Tab** — confirm the 6 focus rings appear in the correct tab order (header back → tabs → CTA or product-type cards → back-to-types → Quick Action links).
4. **Do NOT commit** — build ready to deploy, hand over to owner.
