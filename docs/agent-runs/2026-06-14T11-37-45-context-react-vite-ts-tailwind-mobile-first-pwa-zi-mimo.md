# MiMo run — 2026-06-14T11:37:45.059Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Audit Result — UnifiedDashboard.tsx

**ALL 7 EDITS CORRECT ✅ — Zero fixes needed. File is ready to commit as-is.**

---

### Per-edit verification

| # | Control | Tier / Pattern | className / aria / whileTap | Verdict |
|---|---------|---------------|----------------------------|---------|
| **1** | Wallet `<Link to="/wallet">` | Wrapper-ring + whileTap on child | Link: `block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` · motion.div: `whileTap={{ scale: 0.98 }}` (wide card, own gradient surface) | ✅ |
| **2** | Enabled service `<Link>` ×5 | Wrapper-ring only (inner Card already `active:scale-95`) | Link: `block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` · NO 2nd scale on wrapper | ✅ |
| **3** | Disabled service `<button>` | Wrapper-ring only (inner Card already `active:scale-95`) | `w-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | ✅ |
| **4** | Spending Breakdown disclosure | Bare row, `aria-expanded` | `…touch-manipulation rounded-lg active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + `aria-expanded={showSpendingBreakdown}` | ✅ |
| **5** | Travel Stats disclosure | Bare row, `aria-expanded` | same + `aria-expanded={showTravelStats}` | ✅ |
| **6** | Safety Alerts disclosure | Bare row, `aria-expanded` | same + `aria-expanded={showSafetyAlerts}` | ✅ |
| **7** | Carbon Footprint disclosure | Bare row, `aria-expanded` | same + `aria-expanded={showCarbonTracker}` | ✅ |

### Key questions answered

**(1) All 7 correct?** Yes. Every className string, aria attribute, and whileTap value matches the token vocabulary exactly.

**(2) Wrapper-ring + no 2nd scale?** Correct. The focusable `<a>`/`<button>` gets `block rounded-2xl` + ring. The inner `<Card>`/`motion.div` owns the press (`active:scale-95` / `whileTap`). Adding scale to both would create a competing double-scale. Textbook pattern.

**(3) `whileTap={{ scale: 0.98 }}` on wallet card?** Correct. The card is a wide element with its own gradient surface (`bg-gradient-to-br from-primary …`) → 0.98 tier. `whileTap` is the sanctioned framer-motion prop (no CSS `transition` needed — framer handles the spring). The `overflow-hidden` is on the `motion.div` (child), not the `<a>` (parent), so the ring on the `<a>` renders outward normally.

**(4) Disclosure `aria-expanded` + `active:scale-[0.99]` + no FLIP?** All correct. `aria-expanded={showX}` is the proper ARIA for show/hide toggles. Bare full-width row (transparent, only `hover:text-foreground`) → 0.99 tier. Already `transition-all` → covers the added transform, no FLIP needed.

**(5) `block` on Links layout-safe?** Yes. Each Link's sole child is a full-width block Card — `block` on the `<a>` makes the ring trace the card's dimensions identically.

**(6) Missed / mis-tiered controls?** None. Full interactive-control scan:

| Control | Type | Action |
|---------|------|--------|
| Help header Button | shadcn (own tokens, aria-label) | SKIP ✓ |
| Profile header Button | shadcn (own tokens, aria-label) | SKIP ✓ |
| Wallet Link | raw `<Link>` | Edit #1 ✓ |
| Enabled service Links ×5 | raw `<Link>` wrapping Card | Edit #2 ✓ |
| Disabled service button | raw `<button>` wrapping Card | Edit #3 ✓ |
| 4 disclosure buttons | raw `<button>` | Edits #4–7 ✓ |
| "View All" Button | shadcn (own tokens) | SKIP ✓ |
| Quick Links Buttons ×4 | shadcn (own tokens) | SKIP ✓ |
| TripCards, panels, icons, text | presentational / decorative | SKIP ✓ |

No clickable `onClick` divs, no `cursor-pointer` divs, no raw `<a>` tags beyond the React Router `<Link>`s. Zero missed controls.

### Guard-tally summary

```
className edits:  7  (#1 Link, #2 Link ×5 via map, #3 button, #4–7 ×4 disclosure)
new aria:         5  (4 aria-expanded, 0 aria-label, 0 aria-pressed — #1–3 have visible text)
focus-visible:ring: 7  ring-ring: 7 (all OUTWARD)  ring-inset: 0
whileTap:         1  (#1 scale 0.98)
active:scale-[0.99]: 4  (#4–7 bare row)
DON'T-CHURN:      2  (#2 wrapper-ring-only ×5, #3 wrapper-ring-only)
FLIPs:            0  (#4–7 already transition-all)
disabled touched: 0
logic lines touched: 0
```

**Verified** — the file as provided is the correct after-state. Ready for `npm run update` gate and owner commit.
