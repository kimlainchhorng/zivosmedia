# DeepSeek run — 2026-06-14T11:36:51.692Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/UnifiedDashboard.tsx (313-line customer-facing **super-app home** — own `min-h-screen bg-background pb-20` shell, NO AppLayout: a sticky `bg-background/95 backdrop-blur-xl border-b` header (date + "Hello, {firstName}" + two shadcn icon `<Button variant="ghost" size="icon" aria-label asChild>` Help/Profile wrapping `<Link>`); a Wallet hero (a raw `<Link to="/wallet">` wrapping a `motion.div` gradient card, balance + total spent); a "Services" `grid grid-cols-3` of 6 service tiles (`services.map` — 5 ENABLED render `<Link to={service.link}>` wrapping a shadcn `<Card active:scale-95>`, 1 DISABLED ("Delivery") renders a raw `<button onClick={() => toast.info(...)}>` wrapping a `<Card active:scale-95 opacity-50>`); an "Intelligence" section with FOUR raw disclosure `<button>`s (Spending Breakdown / Travel Stats / Travel Safety Alerts / Carbon Footprint — each toggles a `useState` boolean, has a rotate-90 chevron, reveals a motion.div/grid panel); an "Active Now" list + "Recent Activity" list of presentational `TripCard`s (motion.div→Card, NO onClick/Link — display only); a "Recent Activity" header with a shadcn "View All" `<Button variant="ghost" size="sm" asChild>`; a "Quick Links" `grid grid-cols-2` of 4 shadcn `<Button variant="outline" asChild>` wrapping `<Link>`. `useState`×4 (disclosure toggles); `useMemo`×2; `useAuth`; `useRecentActivity`/`useActiveTrips`/`useWalletSummary` hooks; sonner toast; framer-motion (motion.div, whileTap); cn(); date-fns format. RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) + whileTap ONLY; preserve ALL logic, onClick, to/href, useState/useMemo, hooks, toast, disabled byte-identical. Don't add role/tabIndex/onKeyDown (structural — FLAG). SKIP shadcn Button/Card/CardContent/Badge (own tokens).

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Neutral parent (bg-card/background/secondary/muted) = ring-ring. (shadcn Card in this repo = rounded-2xl, so a focus-ring on a Link/button wrapping a Card matches at rounded-2xl.)
- Press-scale tiers: icon-only active:scale-95; links/chips/pills/card-tiles active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface (transparent, only a hover bg/text) active:scale-[0.99]. A control whose inner child ALREADY presses (active:scale on the inner Card/motion.div) gets ring ONLY on the focusable wrapper — adding a 2nd scale to the wrapper would be a competing double-scale (DON'T).
- transition rule: transition-transform when scale is the ONLY animated prop; transition-all when a color/bg/border/opacity ALSO animates alongside. FLIP transition-colors->transition-all when adding a scale to a transition-colors element. (whileTap press via framer-motion needs no CSS transition.)
- aria: aria-label ONLY on icon-only/glyph-only controls (controls with visible text → NO aria-label). aria-pressed on a persistent toggle. **aria-expanded on a disclosure** (a button that shows/hides a panel).

SEVEN edits applied — confirm CORRECT or NEEDS-FIX:

1) L138 Wallet `<Link to="/wallet">` (wraps a `motion.div` gradient card; the Link had NO className, the card had NO press feedback + NO ring) — ADDED `className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` on the Link (the focusable `<a>`; `block` so the ring traces the full-width card cleanly, `rounded-2xl` matches the card) + ADDED `whileTap={{ scale: 0.98 }}` on the `motion.div` (wide card WITH own gradient surface → 0.98 tier; fresh press via the sanctioned framer prop, no CSS transition needed). NO aria-label (the card has visible text). OUTWARD ring-ring (neutral page bg).

2) L159 enabled-service `<Link to={service.link}>` (×5 ENABLED via services.map; wraps a shadcn `<Card ... active:scale-95 ...>` that ALREADY presses) — ADDED `className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` on the Link ONLY (ring on the focusable `<a>`; `block` + `rounded-2xl` to trace the Card). NO 2nd scale (the inner Card's `active:scale-95` already provides press — adding scale to the Link would double it). NO aria-label (visible text). OUTWARD ring-ring.

3) L170 disabled-service `<button type="button" className="w-full" onClick={() => toast.info(...)}>` (wraps a `<Card ... active:scale-95 opacity-50>` that ALREADY presses) — ADDED `rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the button's existing `w-full` (ring only — DON'T-CHURN, the inner Card already presses). NO aria-label (visible text). After: `w-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.

4–7) The FOUR "Intelligence" disclosure `<button>`s (L191 Spending Breakdown, L211 Travel Stats, L234 Safety Alerts, L250 Carbon Footprint) — each was `className="w-full flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all touch-manipulation"`, NO scale/ring/aria; each toggles a useState boolean and reveals a panel (a DISCLOSURE) with a rotate-90 chevron. Each got: **ADDED `aria-expanded={showX}`** (disclosure state — showSpendingBreakdown / showTravelStats / showSafetyAlerts / showCarbonTracker respectively); **bare-full-width-row tier `active:scale-[0.99]`** (no own surface — transparent, only a `hover:text-foreground` pseudo); `rounded-lg` (so the focus ring traces a clean rounded box on the otherwise-bare row); + ring. **NO FLIP needed** (already `transition-all`, which covers the added transform). NO aria-label (visible text). OUTWARD ring-ring. After (identical across all 4 except the aria-expanded var): `w-full flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all touch-manipulation rounded-lg active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.

SKIP confirmed: L129/L130 header Help/Profile shadcn `<Button variant="ghost" size="icon" aria-label asChild>` (own tokens, already have aria-label); L282 "View All" shadcn `<Button variant="ghost" size="sm" asChild>` (own tokens, visible text); L303 Quick-Links shadcn `<Button variant="outline" asChild>` ×4 (own tokens, visible text); all `TripCard`s (L40 — motion.div→Card, presentational, NO onClick/Link, display only — the chevron is decorative group-hover); all shadcn `<Card>`/`<CardContent>`/`<Badge>`; all lucide icons (decorative); all `<p>`/`<h1>`/`<h2>`/`<span>` text; the spending/travel/safety/carbon reveal panels (presentational divs/motion.divs, no onClick).

KEY QUESTIONS: (1) all 7 edits correct? (2) **#1 + #2 + #3 wrapper-ring pattern** — for a raw `<Link>`/`<button>` whose INNER Card/motion.div already presses (active:scale-95 / or gets whileTap), is putting the focus ring on the focusable WRAPPER (with `block rounded-2xl` to trace the card) the right call, and is it correct to NOT add a 2nd press scale to the wrapper (avoid double-scale)? (3) **#1 whileTap on the wallet card** — is `whileTap={{ scale: 0.98 }}` on the motion.div the right way to add fresh press to a wide card with its own surface (vs leaving it press-less), and is whileTap a sanctioned interaction-anim prop here? (4) **#4–7 disclosure** — is `aria-expanded={showX}` correct for these show/hide toggles, is `active:scale-[0.99]` the right tier (bare full-width row, no own surface, only hover:text), and is NO FLIP correct (already transition-all)? (5) is adding `block` to the Links layout-safe (each Link's only child is a full-width block card, so block→identical width/position)? (6) did I miss any raw interactive control or mis-tier any? Be concise and exact; return precise final className after-strings + aria/whileTap attrs.
- files: src/pages/app/UnifiedDashboard.tsx

---

# Review: UnifiedDashboard.tsx Premium Interaction + A11y Pass

## Plan

Apply the 7 edits described to `src/pages/app/UnifiedDashboard.tsx` — all className + display-only aria, 0 logic changes. Each edit follows the house design token vocabulary exactly.

## Proposed Diff

```diff
--- a/src/pages/app/UnifiedDashboard.tsx
+++ b/src/pages/app/UnifiedDashboard.tsx
@@ -135,7 +135,7 @@ export default function UnifiedDashboard() {
       <div className="px-4 py-5 space-y-6">
         {/* Wallet */}
-        <Link to="/wallet">
-          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
+        <Link to="/wallet" className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
+          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.98 }}
             className="rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-emerald-500 text-primary-foreground p-5 relative overflow-hidden shadow-xl shadow-primary/20">
@@ -159,7 +159,7 @@ export default function UnifiedDashboard() {
                 {service.enabled ? (
-                  <Link to={service.link}>
+                  <Link to={service.link} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                     <Card className="hover:shadow-lg transition-all duration-300 active:scale-95 border-border/40 hover:border-primary/15">
@@ -170,7 +170,7 @@ export default function UnifiedDashboard() {
                 ) : (
-                  <button type="button" className="w-full" onClick={() => toast.info(`${service.name} — coming soon!`)}>
+                  <button type="button" className="w-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => toast.info(`${service.name} — coming soon!`)}>
                     <Card className="transition-all duration-300 active:scale-95 border-border/40 opacity-50">
@@ -191,7 +191,7 @@ export default function UnifiedDashboard() {
           {/* Spending Breakdown */}
-          <button type="button" onClick={() => setShowSpendingBreakdown(!showSpendingBreakdown)} className="w-full flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all touch-manipulation">
+          <button type="button" aria-expanded={showSpendingBreakdown} onClick={() => setShowSpendingBreakdown(!showSpendingBreakdown)} className="w-full flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all touch-manipulation rounded-lg active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
@@ -211,7 +211,7 @@ export default function UnifiedDashboard() {
           {/* Travel Stats */}
-          <button type="button" onClick={() => setShowTravelStats(!showTravelStats)} className="w-full flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all touch-manipulation">
+          <button type="button" aria-expanded={showTravelStats} onClick={() => setShowTravelStats(!showTravelStats)} className="w-full flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all touch-manipulation rounded-lg active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
@@ -234,7 +234,7 @@ export default function UnifiedDashboard() {
           {/* Safety Alerts */}
-          <button type="button" onClick={() => setShowSafetyAlerts(!showSafetyAlerts)} className="w-full flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all touch-manipulation">
+          <button type="button" aria-expanded={showSafetyAlerts} onClick={() => setShowSafetyAlerts(!showSafetyAlerts)} className="w-full flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all touch-manipulation rounded-lg active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
@@ -250,7 +250,7 @@ export default function UnifiedDashboard() {
           {/* Carbon Tracker */}
-          <button type="button" onClick={() => setShowCarbonTracker(!showCarbonTracker)} className="w-full flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all touch-manipulation">
+          <button type="button" aria-expanded={showCarbonTracker} onClick={() => setShowCarbonTracker(!showCarbonTracker)} className="w-full flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all touch-manipulation rounded-lg active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

## Answers to Key Questions

1. **All 7 edits correct?** ✅ YES — every edit is byte-identical to the described change.

2. **#1+#2+#3 wrapper-ring pattern correct?** ✅ YES — putting the focus ring on the focusable `<Link>`/`<button>` wrapper (with `block rounded-2xl` to trace the card) is the right call. The inner Card/motion.div already provides press feedback via `active:scale-95` / `whileTap`, so adding a 2nd scale to the wrapper would create a **competing double-scale** — DON'T-CHURN is correct.

3. **#1 whileTap on wallet card correct?** ✅ YES — `whileTap={{ scale: 0.98 }}` is the sanctioned framer-motion interaction prop (no CSS transition needed). The wide card has its own gradient surface → `0.98` tier is correct. This adds fresh press to a previously press-less card.

4. **#4–7 disclosure pattern correct?** ✅ YES — `aria-expanded={showX}` is the correct ARIA for show/hide disclosure toggles. `active:scale-[0.99]` is the right tier (bare full-width row, no own surface, only `hover:text-foreground`). NO FLIP needed — already `transition-all` which covers the added transform.

5. **`block` layout-safe?** ✅ YES — each Link's only child is a full-width block card, so `block` produces identical width/position.

6. **Missed controls?** ✅ NONE — all raw interactive controls covered. shadcn Buttons/Cards/Badges correctly SKIPPED. TripCards correctly SKIPPED (presentational, no onClick/Link).

## Guard Grep Tally

| Metric | Count |
|--------|-------|
| className edits | 7 |
| New aria-label | 0 |
| New aria-pressed | 0 |
| New aria-expanded | 4 |
| focus-visible:ring | 7 |
| ring-ring (OUTWARD) | 7 |
| ring-inset | 0 |
| `active:scale-[0.98]` new (whileTap) | 1 |
| `active:scale-[0.99]` new | 4 |
| DON'T-CHURN (ring only, no 2nd scale) | 2 (#2, #3) |
| FLIPs | 0 |
| Logic lines touched | 0 |

## Owner Verification

- Run `npm run update` — must pass (type-check + worker + build).
- Preview at 375/768/1280 to confirm layout is identical (no visual regressions from `block`/`rounded-lg` additions).
- The 4 disclosure buttons now have `aria-expanded` — verify screen reader announces expanded/collapsed state correctly.
- The wallet card now has `whileTap={{ scale: 0.98 }}` — verify the press animation feels smooth and doesn't conflict with the Link navigation.
