# DeepSeek run — 2026-06-14T11:46:40.420Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/AppTravel.tsx (439-line customer-facing **Travel** search page INSIDE `<AppLayout title="Travel">`. A sticky `top-14 bg-background/95 backdrop-blur-xl` tab switcher (Flights/Hotels/Cars), a per-tab search form of shadcn `<Input>`s (wrapped in an AnimatePresence motion.div), a shadcn "Search" `<Button>`, and a results area (AnimatePresence) rendering presentational `motion.div` result cards [flight/hotel/car] each with a shadcn "View Deal" `<Button>`. State via `useState` (activeTab/hasSearched/loading/form fields/results) + `useSearchParams` (?tab=); `handleSearch` queries `(supabase as any).from("flights"|"hotels"|"rental_cars")`; `handleBookNow` lazy-imports openExternalUrl→skyscanner; sonner toast. RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) ONLY; preserve ALL logic, onClick, handleTabChange/handleSearch/handleBookNow, useState/useSearchParams/useEffect, supabase queries, `to`/href, `disabled`, byte-identical. Don't add role/tabIndex/onKeyDown (structural — FLAG). SKIP shadcn Button/Input/Badge (own tokens), AppLayout (layout), all presentational motion.divs/divs/spans, lucide icons.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. OUTWARD ring renders against the PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills/segmented filter chip/tab/single-select active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; wide full-width row WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99]. (A framer whileTap is already a press → ring-ONLY; this control has NO whileTap → a FRESH CSS active:scale is appropriate.)
- transition rule: transition-transform when scale is the ONLY animated CSS prop; transition-all when a color/bg/border/opacity ALSO animates. FLIP transition-colors→transition-all when adding a NEW CSS active:scale. ALREADY transition-all → append the scale WITHOUT flipping.
- aria: aria-label ONLY on icon-only/glyph-only controls (visible text → NO aria-label). aria-pressed on a PERSISTENT single-select segmented filter/tab whose on/off is bg-conveyed. aria-expanded on a disclosure.

ONE edit applied — confirm CORRECT or NEEDS-FIX:

1) L156 TAB-SWITCHER `<button type="button">` ×3 (tabs.map over Flights/Hotels/Cars; single-select, selection bg-conveyed via cn() `activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"`; `onClick={() => handleTabChange(tab.id)}`; visible icon+label; cn() STATIC base `flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 touch-manipulation` [ALREADY transition-all]; NO whileTap, NO scale, NO ring, NO aria; container = `flex gap-1.5 bg-muted/50 rounded-xl p-1` [rounded-xl but NOT overflow-hidden; tabs inside p-1=4px padding]) — **segmented-tab tier**: ADDED `aria-pressed={activeTab === tab.id}` (persistent single-select tab, bg-conveyed) + APPENDED `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the cn() STATIC arg. **NO FLIP** (already transition-all → covers the new transform). FRESH CSS active:scale (no whileTap present). NO aria-label (visible text). OUTWARD `ring-ring` (the bg-card selected-fill tab on the neutral `bg-muted/50` track; container is p-1 padded, NOT overflow-hidden → a 2px outward ring is not clipped). Static cn() arg after: `flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 touch-manipulation active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (the conditional selected-state second arg UNCHANGED).

SKIP confirmed: L277 "Search" shadcn `<Button>` (own tokens, visible text, has `disabled={loading}`); L349/L392/L422 "View Deal" shadcn `<Button size="sm">` ×3 (own tokens, visible text, onClick={handleBookNow}); all shadcn `<Input>`s (own tokens); the per-tab AnimatePresence form motion.div + the results AnimatePresence motion.div + every flight/hotel/car result `motion.div` card (presentational, NO onClick — the "View Deal" shadcn Buttons INSIDE are skipped); the partner-disclosure div + no-results/loading divs (non-interactive); `<AppLayout>` (layout); all lucide icons (decorative); all `<p>`/`<h3>`/`<span>` text.

KEY QUESTIONS: (1) the 1 edit correct? (2) is `aria-pressed={activeTab === tab.id}` the right ARIA for these single-select bg-conveyed tabs (vs no aria, vs structural role=tablist/tab)? (3) is `active:scale-[0.97]` the right tier (segmented tab) and is a FRESH CSS active:scale correct here (no framer whileTap on this control)? (4) NO FLIP correct (already transition-all)? (5) OUTWARD `ring-ring` correct given the `p-1`-padded, rounded-xl-but-NOT-overflow-hidden `bg-muted/50` track? (6) did I miss any raw interactive control or mis-tier? (Confirm all "View Deal"/"Search" shadcn Buttons + Inputs are correctly SKIPPED.) Be concise and exact; return precise final className after-string + aria attr.
- files: src/pages/app/AppTravel.tsx

---

# AppTravel.tsx — Premium Interaction + A11y Pass

## Plan

**Single edit**: Add `aria-pressed`, `active:scale-[0.97]`, and focus ring to the 3 tab-switcher `<button>`s. All other controls are shadcn (Button/Input) — correctly skipped.

## Proposed Change

**File**: `src/pages/app/AppTravel.tsx`

**Before** (L156, the `className` static arg):
```
"flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 touch-manipulation"
```

**After**:
```
"flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 touch-manipulation active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Plus** add `aria-pressed={activeTab === tab.id}` to the `<button>` element (already present in the file you provided — confirmed).

## Verification

1. **Edit correct?** ✅ Yes — single edit, className-only, no logic touched.
2. **`aria-pressed` correct?** ✅ Yes — persistent single-select segmented tabs with bg-conveyed selection. This is the house pattern (see MyTripsPage, ShopDashboard, etc.). A structural `role="tablist"`/`role="tab"` upgrade would be more semantically precise but is correctly FLAGGED as out-of-scope.
3. **`active:scale-[0.97]` correct tier?** ✅ Yes — segmented tab/chip tier. No framer `whileTap` present → fresh CSS `active:scale` is appropriate.
4. **NO FLIP correct?** ✅ Yes — already `transition-all`, which covers the new transform.
5. **OUTWARD `ring-ring` correct?** ✅ Yes — the `bg-muted/50` track has `rounded-xl` but NOT `overflow-hidden`, and the tabs sit inside `p-1` (4px padding), so a 2px outward ring renders within the padding, not clipped.
6. **Missed controls?** ✅ None — all shadcn Buttons (Search, 3× View Deal) and Inputs correctly skipped. No other raw `<button>`s or `<a>`s in the file.

## Owner Must Verify

- Run `npm run update` (type-check + worker type-check + build) — must pass.
- Preview at `/app/travel` on localhost (or the travel host) — verify tab switcher has keyboard focus rings and press scale.
- Confirm the `aria-pressed` attribute is present on all 3 tab buttons (it's already in the file you provided — the diff is just the className append).
