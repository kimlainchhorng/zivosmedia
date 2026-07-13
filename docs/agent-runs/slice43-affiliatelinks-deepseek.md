# DeepSeek run — 2026-06-14T03:37:44.618Z

- model: deepseek-chat
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and tell me whether my planned per-control edits are complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/AffiliateLinksPage.tsx (a link-in-bio affiliate dashboard reached by in-app navigation; `useAuth` + one `useQuery` against the real `affiliate_links` table [key ["affiliate-links", user?.id], .eq("owner_id", user.id)]; `activeCategory` useState; `categories`/`filtered`/`totals` useMemo; `copyLink` helper [navigator.clipboard + sonner toast]. Layout: sticky header [shadcn back Button + Link2 icon + title]; a gradient earnings banner motion.div [NO onClick]; a 3-stat grid of plain divs; a horizontal-scroll category-chip row [RAW buttons, shown only if categories.length>1]; loading skeletons; an empty-state card; then a list of link-row motion.div cards [entrance anim, NO onClick] each holding a Copy RAW button + an Open RAW button.)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, framer-motion whileTap if warranted). Keep ALL logic byte-identical: the `useQuery`, every `setActiveCategory`, `copyLink`, the `window.open(...)`, the `categories`/`filtered`/`totals` useMemo, `navigate(-1)`. Only advise on className tokens, whileTap, and aria-* attributes.

DESIGN TOKEN SYSTEM we are applying consistently across the app:
- Focus ring (append to every focusable interactive control that lacks one): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  (no ring-offset). Use focus-visible:ring-inset when the control is a flush edge child of a rounded overflow-hidden parent.
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99].
- transition class: transition-transform when scale is the only animated property; transition-all when there is also a hover:bg/hover:text/hover:opacity that should animate alongside the press. If a control ALREADY ships transition-all, append the ring (don't re-add/re-flip).
- aria-label only on icon-only / image-only controls (a control with rich descriptive visible child text does NOT get an aria-label). aria-pressed on a segmented/toggle control with a persistent on/off selected state; NOT on a one-shot action or navigation.
- Don't-churn: if a control already has a valid focus ring / aria-label / press-scale, keep it rather than re-adding/re-flipping.

COMPONENT-TYPE RULES we follow:
- shadcn <Button>/<Input>/<Textarea> ship built-in tokens -> leave untouched.
- A framer-motion motion.div with an entrance initial/animate and NO onClick is presentational -> leave untouched.
- A RAW <button> (plain HTML) ships NO tokens.

MY PLANNED EDITS (please confirm each is right, or correct it):

1. Category chips, line ~168 (RAW <button> in categories.map, onClick={() => setActiveCategory(c)}, visible child = the category WORD [constant per chip, capitalize], cn() base "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize" + active/inactive conditional bg [bg-ig-gradient text-white vs bg-secondary hover:bg-muted]; parent row flex gap-2 overflow-x-auto scrollbar-hide):
   plan: ADD `aria-pressed={activeCategory === c}` + APPEND `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the cn() base. transition-all already present -> APPEND-only (don't re-flip). Segmented-chip tier -> [0.97]. aria-pressed valid (constant WORD, selection conveyed by bg). NO aria-label (visible text). OUTWARD ring (overflow-x-auto does not clip box-shadow).

2. Copy button, line ~248 (RAW <button>, visible "Copy" text + Copy icon, onClick={() => copyLink(l.slug)}, className "flex-1 h-8 rounded-lg bg-secondary hover:bg-muted text-foreground text-xs font-bold inline-flex items-center justify-center gap-1 active:scale-95 transition-all" — ALREADY active:scale-95 + transition-all):
   plan: APPEND `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ONLY. NO aria-label (visible text). NO aria-pressed (one-shot action).

3. Open button, line ~255 (RAW <button>, visible "Open" text + ExternalLink icon, onClick={() => window.open(l.target_url, "_blank", "noopener,noreferrer")}, className "flex-1 h-8 rounded-lg bg-ig-gradient text-white text-xs font-bold inline-flex items-center justify-center gap-1 hover:opacity-90 active:scale-95 transition-all shadow-sm" — ALREADY active:scale-95 + transition-all; the hover:opacity-90 is already eased by transition-all):
   plan: APPEND `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ONLY. NO aria-label (visible text). NO aria-pressed.
   - QUESTION (Q3): the Open button sits on the bg-ig-gradient (the button itself is the gradient). The ring token `ring-ring` resolves to black in this app. Should this gradient-FILLED button use the standard `ring-ring` (black ring, visible on the warm gradient) or a white-tinted `ring-white/70` to match the card's design language? Note: on the same page's earnings BANNER (a separate gradient surface) there are no interactive controls; the only gradient-filled control is THIS Open button. Please advise the ring color.

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm):
- Header back button, line ~112 (shadcn <Button aria-label="Back" variant="ghost" size="icon">): ships tokens, labeled.
- Earnings banner motion.div (line ~126): entrance anim, NO onClick -> presentational.
- 3-stat grid divs (line ~142): plain non-interactive divs.
- Link-row motion.div cards (line ~206): entrance anim, NO onClick -> presentational (the row itself is not clickable; only the Copy/Open buttons inside are).
- All Link2/Copy/ExternalLink/TrendingUp/DollarSign/MousePointerClick/Target/Sparkles icons: decorative.

QUESTIONS:
Q1. Category chips (#1): aria-pressed + append-only (transition-all already) + active:scale-[0.97] + OUTWARD ring — correct & consistent with the segmented-filter-chip precedent?
Q2. Copy button (#2): ring-only append (already has active:scale-95 + transition-all), no aria — correct?
Q3. Open button (#3): ring-only append; AND what ring color for a gradient-FILLED button — standard ring-ring (black) or ring-white/70? Please give the exact token.
Q4. The link-row motion.div cards (#leave): confirm they are presentational (NO onClick on the row -> leave, do not add a ring to the card; only the inner Copy/Open buttons are interactive).
Q5. At 375px, do the 3-stat grid (grid-cols-3 gap-2), the category chip row, and the Copy+Open button pair (flex gap-1.5, two flex-1 buttons) lay out without crushing?

Please answer Q1-Q5 and give me the corrected className strings + confirm the aria attributes. Keep all logic unchanged. Thank you.
- files: src/pages/AffiliateLinksPage.tsx

---

## Review: AffiliateLinksPage — Premium Interaction Pass

### Short Plan

Three controls need className/ARIA changes. All are RAW `<button>` elements. The page is clean — no existing focus rings, no missing aria on icon-only controls, and the existing `active:scale-95` + `transition-all` on Copy/Open are already correct. The plan is sound with one correction on the Open button's ring color.

---

### Q1–Q5 Answers

**Q1. Category chips — CORRECT.** `aria-pressed` + append-only (existing `transition-all`) + `active:scale-[0.97]` (segmented-chip tier) + OUTWARD ring. Matches the established precedent (PlacesPage, CouponsPage, FitnessActivitiesPage, etc.). The `overflow-x-auto` parent does not clip box-shadow.

**Q2. Copy button — CORRECT.** Ring-only append. Already has `active:scale-95` + `transition-all`. Visible text → no `aria-label`. One-shot action → no `aria-pressed`.

**Q3. Open button — CORRECT on ring-only append. RING COLOR: use `ring-white/70`.** The button is filled with `bg-ig-gradient` (a warm rose-to-purple gradient). The standard `ring-ring` resolves to `hsl(var(--ring))` which in this app is black (`hsl(0 0% 0%)`). On a gradient-filled button, a black ring creates poor contrast and looks harsh. Use `ring-white/70` — it's visible on the warm gradient, matches the white text, and follows the same logic as the earnings banner's white-on-gradient design language. Exact token: `focus-visible:ring-2 focus-visible:ring-white/70`.

**Q4. Link-row motion.div — CORRECT.** Presentational (no `onClick`). Only the inner Copy/Open buttons are interactive. Leave untouched.

**Q5. 375px layout — YES, fits without crushing.** Math:
- `max-w-2xl mx-auto px-4` → ~343px inner
- 3-stat grid: `grid-cols-3 gap-2` → each cell ≈ 107px (343 - 4 gap) / 3. The content (icon + label + number) fits easily.
- Category chips: `flex gap-2 overflow-x-auto` → scrolls if needed.
- Copy+Open button pair: `flex gap-1.5`, each `flex-1 h-8` → each ≈ 165px. Text "Copy" + icon ≈ 50px, "Open" + icon ≈ 55px. No crush.

---

### Proposed Diff

**File:** `src/pages/AffiliateLinksPage.tsx`

```diff
--- a/src/pages/AffiliateLinksPage.tsx
+++ b/src/pages/AffiliateLinksPage.tsx
@@ -163,7 +163,8 @@ export default function AffiliateLinksPage() {
               <button
                 key={c}
                 type="button"
                 onClick={() => setActiveCategory(c)}
+                aria-pressed={activeCategory === c}
                 className={cn(
                   "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize",
                   activeCategory === c ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
+                  "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                 )}
               >
                 {c}
@@ -245,7 +246,8 @@ export default function AffiliateLinksPage() {
                     <button
                       type="button"
                       onClick={() => copyLink(l.slug)}
-                      className="flex-1 h-8 rounded-lg bg-secondary hover:bg-muted text-foreground text-xs font-bold inline-flex items-center justify-center gap-1 active:scale-95 transition-all"
+                      className="flex-1 h-8 rounded-lg bg-secondary hover:bg-muted text-foreground text-xs font-bold inline-flex items-center justify-center gap-1 active:scale-95 transition-all
+                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                     >
                       <Copy className="h-3 w-3" /> Copy
                     </button>
@@ -253,7 +255,8 @@ export default function AffiliateLinksPage() {
                     <button
                       type="button"
                       onClick={() => window.open(l.target_url, "_blank", "noopener,noreferrer")}
-                      className="flex-1 h-8 rounded-lg bg-ig-gradient text-white text-xs font-bold inline-flex items-center justify-center gap-1 hover:opacity-90 active:scale-95 transition-all shadow-sm"
+                      className="flex-1 h-8 rounded-lg bg-ig-gradient text-white text-xs font-bold inline-flex items-center justify-center gap-1 hover:opacity-90 active:scale-95 transition-all shadow-sm
+                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                     >
                       <ExternalLink className="h-3 w-3" /> Open
                     </button>
```

**Diff stats:** 3 rings added, 1 `aria-pressed` added, 1 `active:scale-[0.97]` added. 0 logic lines touched. 0 existing tokens churned.

---

### Owner Verification

1. **Run `npm run update`** — must pass (type-check + worker type-check + build).
2. **Preview at 375px** — verify the category chip row scrolls, the 3-stat grid doesn't wrap, and the Copy/Open buttons sit side-by-side.
3. **Tab through the page** — confirm focus rings appear on all three controls (category chips, Copy, Open). The Open button's ring should be white/translucent on the gradient.
4. **Commit** — the change is ready to deploy.
