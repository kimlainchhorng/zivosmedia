# MiMo run — 2026-06-14T03:48:26.267Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and tell me whether my planned per-control edits are complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/BrandDealsPage.tsx (a creator brand-partnerships marketplace reached by in-app navigation; MOCK DATA v1 [header comment: a `brand_campaigns` table can populate without UI changes] + one real `useQuery` for live follower count [key ["brand-deals-followers", user?.id], .eq("following_id", user.id), drives eligibility]; `activeCategory` useState<Category>; `filtered`/`eligibleCount`/`maxEarning` derived. Layout: sticky header [shadcn back Button + Handshake badge + "Brand Deals" title + shadcn Filter Button]; a gradient earnings-potential banner motion.div [bg-ig-gradient, NO onClick]; a horizontal-scroll category-chip row [RAW buttons, CATEGORIES = All/Travel/Hospitality/Lifestyle/Tech/Food, constant WORD per chip]; then a list of campaign cards [each a presentational motion.div with `overflow-hidden`, NO onClick, holding brand logo img + title/description/payout/deadline text + a full-width "Apply now"/"Locked" RAW button at the bottom edge].)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, framer-motion whileTap if warranted). Keep ALL logic byte-identical: the `useQuery`, every `setActiveCategory`, the `disabled={!eligible}` prop, `filtered`/`eligibleCount`/`maxEarning`, `navigate(-1)`, `formatPayout`. Only advise on className tokens, whileTap, and aria-* attributes.

DESIGN TOKEN SYSTEM we are applying consistently across the app:
- Focus ring (append to every focusable interactive control that lacks one): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (no ring-offset). Use focus-visible:ring-inset when the control is a flush edge child of a rounded overflow-hidden parent.
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99].
- transition class: transition-transform when scale is the only animated property; transition-all when there is also a hover:bg/hover:text/hover:opacity that should animate alongside the press. If a control ALREADY ships transition-all, append the ring (don't re-add/re-flip).
- aria-label only on icon-only / image-only controls (a control with rich descriptive visible child text does NOT get an aria-label). aria-pressed on a segmented/toggle control with a persistent on/off selected state; NOT on a one-shot action or navigation.
- Don't-churn: if a control already has a valid focus ring / aria-label / press-scale, keep it rather than re-adding/re-flipping.
- No-op control policy: a RAW button with NO onClick (a v1 placeholder) STILL gets a focus ring (pure keyboard-a11y win) but does NOT get a manufactured active:scale press (that would fake feedback for a dead control). If it already ships a press affordance, keep it (don't churn).

RING COLOR on gradient surfaces: in this app --ring resolves to BLACK (hsl 0 0% 0%) and bg-ig-gradient is a warm orange->pink->purple gradient. Rule: a control whose focus ring renders ON a gradient surface should use focus-visible:ring-white/70 (black is harsh there); a control whose ring renders against a neutral bg-card/bg-background uses ring-ring. KEY DISTINCTION: an OUTWARD ring (no ring-inset) renders OUTSIDE the border-box, so its contrast is against the PARENT surface; a ring-INSET renders INSIDE the box, on top of the element's own fill.

COMPONENT-TYPE RULES we follow:
- shadcn <Button>/<Input>/<Textarea> ship built-in tokens -> leave untouched.
- A framer-motion motion.div with an entrance initial/animate and NO onClick is presentational -> leave untouched.
- A RAW <button> (plain HTML) ships NO tokens.

MY PLANNED EDITS (please confirm each is right, or correct it):

1. Category chips, line ~211 (RAW <button> in CATEGORIES.map, onClick={() => setActiveCategory(cat)}, visible child = the category WORD [constant per chip], cn() base "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all" + active/inactive conditional bg [bg-ig-gradient text-white shadow-sm vs bg-secondary text-foreground hover:bg-muted]; parent row flex gap-2 overflow-x-auto scrollbar-hide on the neutral page bg):
   plan: ADD `aria-pressed={activeCategory === cat}` + APPEND `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the cn() base (transition-all already present -> APPEND-only, don't re-flip). Segmented-chip tier -> [0.97]. aria-pressed valid (constant WORD, selection conveyed by bg). NO aria-label (visible text). OUTWARD ring-ring (chips sit on neutral page bg, not on the gradient; overflow-x-auto does not clip box-shadow).

2. Apply button, line ~280 (RAW <button>, `disabled={!eligible}`, NO onClick [v1 placeholder — footer "Brand applications open in beta"], visible text "Apply now" + ExternalLink icon when eligible / "Locked" when not, cn() base "w-full h-11 flex items-center justify-center gap-1.5 text-sm font-bold transition-opacity" + conditional [eligible: "bg-ig-gradient text-white hover:opacity-90 active:opacity-80" / not: "bg-muted text-muted-foreground cursor-not-allowed"]). This button is the BOTTOM FLUSH EDGE child of the campaign card motion.div which is `rounded-2xl ... overflow-hidden`. When eligible it is gradient-FILLED; when not eligible it is bg-muted + disabled (disabled buttons are not focusable):
   plan: APPEND `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70` ONLY (RING-INSET because it's a flush edge child of the overflow-hidden card -> an outward ring would be clipped; ring-white/70 because with ring-inset the ring renders on top of the button's own gradient fill when eligible/focusable). NO active:scale (no-op control + it already ships active:opacity-80 press feedback -> don't manufacture/churn). NO aria-label (visible text). NO aria-pressed (not a toggle). KEEP transition-opacity (no transform added, so no flip needed). KEEP disabled prop byte-identical.
   - QUESTION (Q2): for the disabled/not-eligible state the button is bg-muted (neutral) but it is also `disabled` so not keyboard-focusable -> the focus ring only ever shows in the eligible (gradient) state -> ring-white/70 inset is correct for the only focusable state. Confirm ring-inset + ring-white/70, and confirm NO active:scale (don't fake press on a no-op).

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm):
- Header back button, line ~153 (shadcn <Button aria-label="Back" variant="ghost" size="icon">): ships tokens, labeled.
- Header Filter button, line ~168 (shadcn <Button aria-label="Filter deals" variant="ghost" size="icon"> with NO onClick): ships tokens, labeled -> leave token-wise; FLAG the missing onClick as an out-of-scope owner note (not a className fix).
- Earnings-potential banner motion.div (line ~182): entrance anim, NO onClick -> presentational.
- Campaign-card motion.div (line ~232): entrance anim, NO onClick -> presentational (only the Apply button inside is interactive; the card is overflow-hidden).
- brand logo <img>, all Handshake/Sparkles/Users/CheckCircle2/DollarSign/Filter/ExternalLink/ArrowLeft icons: decorative.

QUESTIONS:
Q1. Category chips (#1): aria-pressed + append-only (transition-all already) + active:scale-[0.97] + OUTWARD ring-ring (neutral page bg) — correct & consistent with the segmented-filter-chip precedent?
Q2. Apply button (#2): ring-only append, RING-INSET + ring-white/70 (flush edge child of overflow-hidden card, gradient-filled in its only focusable state), NO active:scale (no-op + pre-existing active:opacity), KEEP transition-opacity, KEEP disabled — correct? Or should the ring be ring-ring instead of ring-white/70 given the disabled state is bg-muted?
Q3. The Filter shadcn Button (#leave) with no onClick — confirm leave token-wise + FLAG missing onClick (out of scope).
Q4. The banner + campaign-card motion.divs (#leave): confirm presentational (NO onClick -> leave, no ring on the card).
Q5. At 375px, do the gradient banner, the 6-chip category row (overflow-x-auto), and the campaign cards (logo 48px + flex-1 text column + full-width Apply button) lay out without crushing? And at iPad 768/1024 + desktop 1280 within max-w-2xl?

Please answer Q1-Q5 and give me the corrected className strings + confirm the aria attributes. Keep all logic unchanged. Thank you.
- files: src/pages/BrandDealsPage.tsx

---

# BrandDealsPage — Interaction Polish Review

**Inventory** (full file read, 304 lines): 2 RAW `<button>` (category chip L~211, Apply/Locked L~280), 2 shadcn `<Button>` (back L~153, Filter L~168 — both ship tokens), 2 `motion.div` (banner L~182, campaign card L~232 — both presentational, entrance anim, NO onClick), all icons + `<img>` — decorative. **2 controls to edit, confirmed.**

---

## Q1 — Category chips: ✅ Fully correct

| Aspect | Verdict |
|--------|---------|
| `aria-pressed={activeCategory === cat}` | ✅ Valid — persistent bg-only selection, constant WORD per chip, tab-pattern is NOT used here (these are toggle chips, not tabs) |
| `active:scale-[0.97]` segmented-chip tier | ✅ Correct tier |
| `transition-all` already present → APPEND-only | ✅ Don't re-flip; eases the inactive `hover:bg-muted` color fade alongside the new scale |
| OUTWARD `ring-ring` | ✅ Chips sit on neutral `bg-background` page surface (the gradient banner is *above* the chip row, not behind it); `overflow-x-auto` does NOT clip `box-shadow` (it clips *paint* of children overflowing horizontally, not the box-shadow of an in-flow child) |
| Visible text → NO `aria-label` | ✅ |
| `aria-pressed` (not `aria-selected`) | ✅ These are toggle-filter chips, not `role="tab"` segmented tabs — `aria-pressed` is the correct pattern |

**Matches precedent exactly**: same token combo as `PodcastsPage` category chips, `SoundsPage` genre chips, `ExchangeRatesPage` — all converged on `aria-pressed` + `[0.97]` + ring-only append on `transition-all`.

---

## Q2 — Apply button: ✅ Fully correct

Your reasoning is airtight on every point:

1. **RING-INSET** ✅ — The button is a direct child, flush at the bottom edge, of a `rounded-2xl overflow-hidden` card. An **outward** ring would render outside the border-box and be clipped by the card's `overflow-hidden`. `ring-inset` renders *inside* the button's own box, always visible.

2. **`ring-white/70`** ✅ — The ring is inset, so its contrast is against the **element's own fill**, not the parent surface. The only focusable state is `eligible` → `bg-ig-gradient text-white` (warm gradient fill). Black `ring-ring` (`hsl(0 0% 0%)`) on a warm orange→pink→purple gradient is harsh; `ring-white/70` is correct. The disabled/not-eligible state (`bg-muted`, `cursor-not-allowed`, `disabled`) is **never keyboard-focusable**, so the ring never renders against `bg-muted`. The color choice is therefore correct for the only state where it matters.

3. **NO `active:scale`** ✅ — No-op control (NO `onClick`, footer confirms "Brand applications open in beta"). Per the NO-OP CONTROL POLICY: ring for keyboard-a11y, but don't manufacture press feedback. The existing `active:opacity-80` is already there from the author's code (it's a visual affordance they put on, not something we're adding) — we don't touch it.

4. **KEEP `transition-opacity`** ✅ — No transform is being added, so no flip is needed. The class eases the existing `hover:opacity-90` → `active:opacity-80` opacity transitions.

5. **KEEP `disabled={!eligible}`** ✅ — Logic, byte-identical.

---

## Q3 — Filter shadcn Button: ✅ Leave + FLAG

Confirmed: ships built-in tokens (`aria-label="Filter deals"`, `variant="ghost"`, `size="icon"`, `h-10 w-10 rounded-full`) → leave token-wise. **FLAG for owner**: has NO `onClick` — it's a v1 placeholder. Not a className fix.

---

## Q4 — Banner + Campaign card motion.divs: ✅ Confirm presentational

- **Banner** (`motion.div`, entrance anim `opacity 0→1, y 8→0`, `bg-ig-gradient`, NO onClick) → purely presentational. Leave.
- **Campaign card** (`motion.div`, entrance anim with staggered delay, `rounded-2xl bg-card border overflow-hidden`, NO onClick) → presentational container. The `overflow-hidden` is layout (clips the card's rounded corners), not a concern for non-interactive parents. Leave.

---

## Q5 — Responsive: ✅ Clean at all breakpoints

| Breakpoint | Analysis |
|-----------|----------|
| **375px** | `px-4` → ~343px inner. Banner: `p-5` + text wraps (`text-3xl` + span `text-base` → single line or wraps safely). Chips: `flex gap-2 overflow-x-auto scrollbar-hide` → 6 chips (~70px each) scroll smoothly, no crush. Cards: `p-4` → logo 48px + `gap-3` (12px) + `flex-1 min-w-0` text (~283px) → title/desc/payout-meta all fit; Apply `w-full h-11` sits below the `p-4` content area, flush at card bottom, no horizontal contention. |
| **768px / 1024px** | `max-w-2xl` (672px) → identical inner layout as 375px but centered with more side margin. Banner + chips + cards unchanged. iPad safe. |
| **1280px** | Same `max-w-2xl` cap → centered with generous side margins. No layout change. |

---

## Final proposed changes (2 controls, 2 edits)

**Control 1 — Category chips (L~211)**

```diff
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
+             aria-pressed={activeCategory === cat}
              className={cn(
-               "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
+               "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeCategory === cat
                  ? "bg-ig-gradient text-white shadow-sm"
                  : "bg-secondary text-foreground hover:bg-muted",
              )}
            >
```

**Control 2 — Apply/Locked button (L~280)**

```diff
                <button
                  type="button"
                  disabled={!eligible}
                  className={cn(
-                   "w-full h-11 flex items-center justify-center gap-1.5 text-sm font-bold transition-opacity",
+                   "w-full h-11 flex items-center justify-center gap-1.5 text-sm font-bold transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70",
                    eligible
                      ? "bg-ig-gradient text-white hover:opacity-90 active:opacity-80"
                      : "bg-muted text-muted-foreground cursor-not-allowed",
                  )}
                >
```

**Summary of diffs**:
- **2 `aria-pressed` added** (chip only), **0 `aria-label` changed**, **0 `aria-pressed` on Apply** (not a toggle)
- **2 rings added** (chip: outward `ring-ring`; Apply: `ring-inset ring-white/70`)
- **1 `active:scale-[0.97]` added** (chip), **0 `active:scale` on Apply** (no-op)
- **0 transition flips** (chip appends onto existing `transition-all`; Apply keeps `transition-opacity`)
- **0 logic lines touched** — every `setActiveCategory`, `disabled`, `useQuery`, `formatPayout`, `navigate(-1)` byte-identical
- **3 new attributes total**: 1 `aria-pressed` + 1 focus ring string (chip) + 1 focus ring string (Apply)

---

## Owner verification / deploy checklist

1. **Run `npm run update`** — must pass (types + worker types + build, 0 errors).
2. **Preview at 375px / 768px / 1280px** — verify category chip ring visible on Tab, Apply button ring visible on Tab when eligible (not visible when locked/disabled, expected).
3. **FLAG** (out of scope, not fixed): Filter shadcn Button has no `onClick` — v1 placeholder.
4. **No commit** — owner commits & deploys.
