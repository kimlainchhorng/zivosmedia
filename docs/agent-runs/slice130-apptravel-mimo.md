# MiMo run — 2026-06-14T11:47:07.867Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Audit Result — AppTravel.tsx tab switcher

**VERDICT: ✅ CORRECT. All 1 edit is accurate. Zero fixes needed. File is ready to commit as-is.**

---

### (1) The edit — confirmed correct

| Attribute | Before | After | Notes |
|---|---|---|---|
| `aria-pressed` | (absent) | `aria-pressed={activeTab === tab.id}` | Persistent single-select, bg-conveyed → house pattern |
| `active:scale-[0.97]` | (absent) | `active:scale-[0.97]` | Segmented tab tier; NO whileTap → FRESH CSS scale |
| `focus-visible:ring` | (absent) | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | OUTWARD ring-ring on neutral `bg-muted/50` padded track |
| `transition-all` | `transition-all duration-200` | `transition-all duration-200` (unchanged) | NO FLIP — already superset covering new transform |
| Conditional second cn() arg | `"bg-card text-foreground shadow-sm"` / `"text-muted-foreground hover:text-foreground"` | UNCHANGED | — |

**Final static cn() arg after:**
```
flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 touch-manipulation active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

**Aria attr added:** `aria-pressed={activeTab === tab.id}`

---

### (2–5) Key questions answered

| # | Question | Answer |
|---|---|---|
| 2 | `aria-pressed` right for single-select bg-conveyed tabs? | **Yes.** House pattern for custom single-select segmented filter/tab chips. `role=tablist`/`role=tab`/`aria-selected` is more semantically precise but is **structural** → correctly FLAGGED out-of-scope. |
| 3 | `active:scale-[0.97]` correct tier + FRESH CSS scale? | **Yes.** Segmented tab/filter chip = `[0.97]`. No framer `whileTap` on this control → a fresh CSS `active:scale` is appropriate (not ring-ONLY). |
| 4 | NO FLIP correct? | **Yes.** Already `transition-all duration-200` — the superset covers the new transform. No transition property change needed. |
| 5 | OUTWARD `ring-ring` correct? | **Yes.** The `bg-muted/50 rounded-xl p-1` container is **NOT** `overflow-hidden`. Tabs sit inside the 4px `p-1` padding → a 2px outward ring is not clipped. Neutral `bg-muted/50` parent → `ring-ring`. |

### (6) Control coverage scan — nothing missed

Every interactive element in the file:

| Line | Control | Disposition |
|---|---|---|
| L156 | Tab `<button>` ×3 | **EDITED** ✓ |
| L176, L183, L191, L198, L208, L219, L226, L236, L243, L253 | shadcn `<Input>` ×10 | SKIP (own tokens) ✓ |
| L259 | shadcn `<Button>` "Search" | SKIP (own tokens, `disabled={loading}`) ✓ |
| L349 | shadcn `<Button size="sm">` "View Deal" (flights) | SKIP (own tokens, onClick) ✓ |
| L392 | shadcn `<Button size="sm">` "View Deal" (hotels) | SKIP (own tokens, onClick) ✓ |
| L422 | shadcn `<Button size="sm">` "View Deal" (cars) | SKIP (own tokens, onClick) ✓ |

**No other raw `<button>`, raw `<a>`, or clickable `onClick`/`cursor-pointer` divs.** All result `motion.div` cards are presentational (no onClick — the shadcn "View Deal" Buttons inside handle the action). All `AppLayout`, `Badge`, lucide icons, `<p>`/`<h3>`/`<span>` text = non-interactive/skipped.

---

### Guard tally over the diff

```
className edits        = 1  (tab button static cn() arg)
new aria-pressed       = 3  (×3 via tabs.map, 0 aria-label — visible text, 0 aria-expanded)
focus-visible:ring     = 1  (×3 via map)
ring-ring              = 1  (×3, OUTWARD)
ring-inset             = 0
active:scale-[0.97]    = 1  (×3 via map, FRESH)
FLIPs                  = 0
DON'T-CHURN preserved  = 0
competing 2nd press    = 0
disabled touched       = 0
logic lines touched    = 0
```

### Owner note

**No structural changes, no logic changes, no new dependencies.** `npm run update` will pass (className + display-aria only). The file is ready to commit.
