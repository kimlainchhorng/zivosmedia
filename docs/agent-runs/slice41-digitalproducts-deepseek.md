# DeepSeek run — 2026-06-14T03:24:43.998Z

- model: deepseek-chat
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

# Review: DigitalProductsPage.tsx — Premium Interaction Pass

## Short Plan

Apply focused accessibility + tactile polish to 6 interactive controls on the Digital Products creator hub. All changes are className-only or display-only ARIA attributes — zero logic changes. Respect the two CSS utility classes (`zivo-card-organic`, `zivo-btn-signature`) that already ship press-scales and transitions.

## Answers to Q1–Q6

**Q1. Header back + back-to-types raw icon buttons (#1/#5):**
- ✅ `aria-label="Back"` correct (icon-only)
- ✅ `active:scale-95` correct (icon-only tier)
- ✅ **`transition-all` is the right call** — the button has `hover:bg-muted/50` that currently snaps. Adding `transition-all` eases BOTH the existing hover-bg fade AND the new press-scale. This is consistent with our icon-button precedent (DevicesPage, LiveLocationsPage, etc.) and is a deliberate polish, not unwanted churn. The alternative (`transition-transform`) would leave the hover-bg snapping, which looks inconsistent when the ring and scale are animated.

**Q2. Tabs (#2):**
- ✅ `aria-pressed={i === activeTab}` correct (persistent selected state, constant label word)
- ✅ FLIP `transition-colors`→`transition-all` correct (new press-scale needs transform easing)
- ✅ `active:scale-[0.97]` correct (segmented-chip tier)
- ✅ OUTWARD ring correct (`overflow-x-auto` doesn't clip box-shadow)
- ✅ Consistent with PlacesPage/CouponsPage/ChallengesPage precedent

**Q3. zivo-btn-signature CTA (#3) + zivo-card-organic product cards (#4):**
- ✅ **RING-ONLY is correct** — both CSS classes already ship `transition: all` + `:active { transform: scale(0.97) }`. Adding Tailwind `active:scale-*` or `transition-*` would double up / churn. The focus ring is the only missing piece.

**Q4. Product cards (#4): OUTWARD ring vs ring-inset:**
- ✅ **OUTWARD ring is correct.** The element's own `overflow: hidden` clips its CHILDREN, not its own `box-shadow`. The ring is drawn on the `motion.button` itself, which is not a child of an `overflow-hidden` parent. No `ring-inset` needed.

**Q5. aria-pressed: tabs YES, product-type cards NO:**
- ✅ **Correct.** Tabs: persistent selected state (clicking tab 1 keeps it selected until you click tab 2). Product-type cards: one-shot selection that advances the create flow (clicking "Online Course" immediately shows the form — there's no "unselect" state). `aria-pressed` on the cards would be semantically wrong.

**Q6. Quick Action `<Link>` cards (#6):**
- ✅ Adding `className="rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` to the `<Link>` is the correct approach. The `<Link>` renders a native `<a>` that needs a visible focus ring. `rounded-[20px]` matches the inner card's `border-radius: 20px` so the ring corners align. No `active:scale` on the anchor (the inner `zivo-card-organic` div handles press). No `aria-label` (visible label text).
- **Responsive at 375px:** All layouts fit cleanly:
  - Stats grid: 2-col, each card `p-3.5` → ~156px wide → fine
  - Tab row: `overflow-x-auto` scrolls 3 tabs → fine
  - Product-type cards: full-width, `p-3.5` → fine
  - Create form: single-column `Input`/`Textarea` → fine
  - Quick Actions: 2-col grid, each card `p-3.5` → ~156px wide → fine

## Controls Left Untouched — Confirmed Correct

- ✅ Stats grid cards (motion.div, no onClick → presentational)
- ✅ Platform Features cards (motion.div, no onClick → presentational)
- ✅ shadcn Input/Textarea/Button (ship built-in tokens)
- ✅ All lucide icons + submitted-state check card (decorative/non-interactive)

## Proposed Diff

```diff
--- a/src/pages/DigitalProductsPage.tsx
+++ b/src/pages/DigitalProductsPage.tsx
@@ -116,7 +116,7 @@ export default function DigitalProductsPage() {
       <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-xl border-b border-border/30 zivo-ribbon">
         <div className="flex items-center gap-3 px-4 py-3">
-          <button type="button" onClick={() => navigate("/more")} className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation">
+          <button type="button" onClick={() => navigate("/more")} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <ArrowLeft className="h-5 w-5" />
           </button>
           <h1 className="text-lg font-extrabold flex-1 tracking-tight">Digital Products</h1>
@@ -147,7 +147,7 @@ export default function DigitalProductsPage() {
         {/* Tabs */}
         <div className="flex gap-2 overflow-x-auto scrollbar-hide">
           {tabs.map((tab, i) => (
-            <button type="button"
+            <button type="button" aria-pressed={i === activeTab}
               key={tab}
               onClick={() => setActiveTab(i)}
-              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors touch-manipulation ${
+              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all touch-manipulation active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                 i === activeTab ? "bg-foreground text-background" : "bg-muted/60 text-muted-foreground"
               }`}
             >
@@ -170,7 +170,7 @@ export default function DigitalProductsPage() {
             <p className="text-xs text-muted-foreground mb-4">Start selling by creating your first digital product.</p>
             <button type="button"
               onClick={() => setActiveTab(1)}
-              className="zivo-btn-signature px-5 py-2.5 text-xs inline-flex items-center gap-1.5 touch-manipulation"
+              className="zivo-btn-signature px-5 py-2.5 text-xs inline-flex items-center gap-1.5 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             >
               <Plus className="w-3 h-3" /> Create Product
             </button>
@@ -192,7 +192,7 @@ export default function DigitalProductsPage() {
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: i * 0.04 }}
-                        className="w-full zivo-card-organic flex items-start gap-3 p-3.5 text-left touch-manipulation"
+                        className="w-full zivo-card-organic flex items-start gap-3 p-3.5 text-left touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                       >
                         <div className="zivo-icon-pill w-10 h-10 rounded-xl shrink-0" style={{ color: type.accent, background: `${type.accent}15` }}>
                           <type.icon className="w-5 h-5" style={{ color: type.accent }} />
@@ -215,7 +215,7 @@ export default function DigitalProductsPage() {
                   <div className="flex items-center gap-3">
-                    <button type="button" onClick={() => setSelectedType(null)} className="p-2 rounded-full hover:bg-muted/50 touch-manipulation">
+                    <button type="button" onClick={() => setSelectedType(null)} aria-label="Back" className="p-2 rounded-full hover:bg-muted/50 touch-manipulation transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                       <ArrowLeft className="w-4 h-4" />
                     </button>
                     <div className="flex items-center gap-2 flex-1">
@@ -302,7 +302,7 @@ export default function DigitalProductsPage() {
         {/* Quick Actions */}
         <div className="grid grid-cols-2 gap-2.5">
           {[
             { label: "Monetization", icon: DollarSign, href: "/monetization", accent: "hsl(142 71% 45%)" },
             { label: "Affiliate Hub", icon: TrendingUp, href: "/affiliate-hub", accent: "hsl(172 66% 50%)" },
             { label: "Dashboard", icon: BarChart3, href: "/creator-dashboard", accent: "hsl(198 93% 59%)" },
             { label: "ZIVO Shop", icon: Package, href: "/shop-dashboard", accent: "hsl(142 71% 45%)" },
           ].map((a) => (
-            <Link key={a.label} to={a.href}>
+            <Link key={a.label} to={a.href} className="rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
               <div className="zivo-card-organic p-3.5 flex items-center gap-3 touch-manipulation">
                 <div className="zivo-icon-pill w-9 h-9 rounded-xl" style={{ color: a.accent, background: `${a.accent}15` }}>
                   <a.icon className="w-4 h-4" style={{ color: a.accent }} />
```

## Summary of Changes

| # | Control | Changes | Type |
|---|---------|---------|------|
| 1 | Header back button (L119) | +`aria-label="Back"` +`transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | className + ARIA |
| 2 | Tab buttons (L150) | +`aria-pressed={i === activeTab}` FLIP `transition-colors`→`transition-all` +`active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | className + ARIA |
| 3 | "Create Product" CTA (L173) | +`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | className only |
| 4 | Product-type cards (L192) | +`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | className only |
| 5 | "Back to type list" button (L215) | +`aria-label="Back"` +`transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | className + ARIA |
| 6 | Quick Action `<Link>` cards (L305) | +`className="rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` | className only |

**Diff stats:** 6 controls edited, 0 logic lines touched, 0 `ring-inset`, 0 unnecessary `active:scale`/`transition` on CSS-classed elements.

## Owner Verification

1. Run `npm run update` — must pass (type-check + worker type-check + build)
2. Preview at 375px, 768px, 1280px — verify no layout crush
3. Tab through all 6 controls — verify focus rings appear on keyboard focus
4. Verify `aria-pressed` on tabs announces correctly in screen reader
5. Verify the two `aria-label="Back"` buttons announce correctly
