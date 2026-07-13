# MiMo run — 2026-06-14T12:27:11.115Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/RideHubPage.tsx (697-line customer-facing central "ZIVO Ride" hub INSIDE `<AppLayout title showBack onBack hideHeader/hideNav when book>`. The page body is mostly ~55 React.lazy feature components switched by `activeTab` (each rendered in a `<div className="p-4">`). The ONLY raw interactive controls are: a category-filter chip row, a tab-pill row, and a "Features" launcher grid. State via useState (activeCategory/tabFilter/activeTab/...); useSearchParams; useAuth; supabase.functions.invoke for rate/tip + lost-item; toast; cn(); t() i18n.

RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) ONLY; preserve ALL logic, onClick, setActiveCategory, selectTab, goToFeature, setSearchParams, navigate, useEffect, supabase calls, byte-identical. Don't add role/tabIndex/onKeyDown (structural — FLAG). SKIP AppLayout/SEOHead/BundleProgressBanner/HeartedDestinationsRail/LocalSavedPlacesRow, all React.lazy feature components, the filter `<input>` (L498, already focus:ring-1 focus:ring-primary/40 — form field), all lucide icons, all motion.div/text.

DESIGN TOKEN VOCABULARY (house standard):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent. --ring resolves BLACK. Neutral parent (bg-background/card/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills/segmented filter/tab/single-select/card-tile active:scale-[0.97]; medium active:scale-[0.98]; wide full-width active:scale-[0.98/0.99].
- transition rule: transition-transform when scale is sole animated prop; transition-all when colour/bg also animates. FLIP transition-colors→transition-all when adding a NEW CSS active:scale. ALREADY transition-all → append scale WITHOUT flipping.
- DON'T-CHURN: control already has press (active:scale OR whileTap) + transition → ADD ring (+aria if missing) ONLY; KEEP existing scale (no renumber); no competing 2nd scale.
- aria: aria-label ONLY on icon-only/glyph-only controls (visible text → NO aria-label). aria-pressed on a PERSISTENT single-select segmented filter/tab/picker whose on/off is bg-conveyed.

3 edit groups applied — confirm CORRECT or NEEDS-FIX:

A) L480 CATEGORY-FILTER chip `<button>` (mapped over `categories` ×8; single-select, selection bg-conveyed via cn() `isActive ? "bg-foreground text-background" : "bg-transparent text-muted-foreground hover:text-foreground"`; onClick setActiveCategory; visible text + a count `<span>`; cn() STATIC base `flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition-all shrink-0` [ALREADY transition-all]; NO scale/ring/aria) — ADDED `aria-pressed={isActive}` + APPENDED `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the STATIC cn() arg. NO FLIP (already transition-all). Segmented-filter tier `[0.97]`. OUTWARD `ring-ring` (chips sit on the `bg-background/95 backdrop-blur` tab bar — neutral).

B) L517 TAB-PILL `<button>` (mapped over `visibleTabs` ×N; single-select tab, selection bg-conveyed via cn() `active ? "bg-ig-gradient text-white shadow-md" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"`; onClick selectTab; visible icon+text; cn() STATIC base `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0` [ALREADY transition-all]; NO scale/ring/aria) — ADDED `aria-pressed={active}` + APPENDED `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the STATIC cn() arg. NO FLIP. Tab tier `[0.97]`. OUTWARD `ring-ring` (pills on bg-background tab bar; the selected pill is the `bg-ig-gradient` IG gradient but the RING renders on the neutral track around it → ring-ring).

C) L612 FEATURES-GRID launcher `<button>` (mapped over `group.items`; NAVIGATION action — onClick goToFeature sets activeTab; NOT a persistent toggle, active state NOT bg-conveyed on THIS button; visible icon+text; className STATIC `flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card border border-border/40 hover:border-primary/30 hover:bg-primary/5 active:scale-95 transition-all` [ALREADY active:scale-95 + transition-all]; NO ring/aria) — APPENDED ring ONLY (DON'T-CHURN: KEPT `active:scale-95`, no renumber, no 2nd scale; no flip). NO aria-pressed (launcher, not a persistent select). Visible text → no aria-label. OUTWARD `ring-ring` (bg-card tiles on page bg).

SKIP confirmed: the filter `<input>` (L498, already focus:ring-1 — form field), AppLayout/SEOHead/BundleProgressBanner/HeartedDestinationsRail/LocalSavedPlacesRow, all ~55 React.lazy feature components, all lucide icons, all motion.div/AnimatePresence wrappers/text.

KEY QUESTIONS: (1) all 3 edit groups correct? (2) A/B — aria-pressed right for the single-select category filter + tab pills (vs role=tablist/tab — structural)? (3) C — DON'T-CHURN ring-only + KEEP active:scale-95 + NO aria-pressed (it's a navigation launcher, not a persistent toggle) correct? Should C's scale-95 be renumbered to card-tile [0.97] or left as-is per DON'T-CHURN? (4) NO FLIP correct (A/B/C all already transition-all)? (5) OUTWARD ring-ring correct for all 3 (the IG-gradient selected tab pill's ring still renders on the neutral track → ring-ring)? (6) any missed raw interactive control? (Confirm the filter input + all lazy components correctly SKIPPED.) Be concise and exact; return precise final className after-strings + aria attrs + verdict per group.
- files: src/pages/app/RideHubPage.tsx

---

## Review — `src/pages/app/RideHubPage.tsx` (3 edit groups)

### Verdict: ALL 3 CORRECT — zero corrections needed.

---

### Per-group confirmation

**A) Category-filter chips ×8** — `aria-pressed={isActive}` + `active:scale-[0.97]` + ring appended to static cn() arg.
- ✅ Single-select bg-conveyed filter → `aria-pressed` correct (role=tablist/tab = STRUCTURAL → flagged)
- ✅ Already `transition-all` → NO FLIP
- ✅ Chip/segmented tier `[0.97]`
- ✅ OUTWARD `ring-ring` — chips on `bg-background/95 backdrop-blur-lg` neutral parent
- ✅ No prior scale → no DON'T-CHURN concern

**B) Tab-pills ×N** — `aria-pressed={active}` + `active:scale-[0.97]` + ring appended to static cn() arg.
- ✅ Single-select bg-conveyed tab → `aria-pressed` correct
- ✅ Already `transition-all` → NO FLIP
- ✅ Tab/pill tier `[0.97]`
- ✅ OUTWARD `ring-ring` — the IG-gradient selected pill's ring renders against the neutral `bg-background` tab bar track, not its own gradient fill
- ✅ Visible icon+text → no aria-label

**C) Features-grid launcher ×N** — ring ONLY appended, `active:scale-95` KEPT (DON'T-CHURN).
- ✅ Already has `active:scale-95` + `transition-all` → ring-only, no renumber, no 2nd competing scale
- ✅ Navigation launcher (not persistent toggle) → NO `aria-pressed` correct
- ✅ Visible text ("Demand Map", "Compare Fares", etc.) → no `aria-label`
- ✅ `scale-95` stays as-is per DON'T-CHURN — the icon+text tile in `grid-cols-4` would nominally be card-tile `[0.97]`, but renumbering existing scales is explicitly forbidden
- ✅ Already `transition-all` → NO FLIP
- ✅ OUTWARD `ring-ring` — `bg-card` tiles on page `bg-background`

---

### Key question answers

| Q | Answer |
|---|--------|
| (1) All 3 correct? | **Yes — all 3 correct, zero corrections.** |
| (2) A/B `aria-pressed` vs `role=tablist/tab`? | `aria-pressed` = house pattern for single-select bg-conveyed pickers. `role=tablist`/`aria-selected` = STRUCTURAL → FLAG only. |
| (3) C ring-only + KEEP `scale-95` + NO `aria-pressed`? | All correct. Navigation launcher, not a persistent toggle. `scale-95` stays per DON'T-CHURN (no renumber). |
| (4) NO FLIP? | Correct — all 3 already `transition-all`. |
| (5) OUTWARD `ring-ring` all 3? | Correct. The `bg-ig-gradient` selected tab pill renders its ring against the neutral track parent, not its own fill. |
| (6) Missed controls? | **None.** The filter `<input>` (L498, form field with `focus:ring-1`), AppLayout/SEOHead/BundleProgressBanner/HeartedDestinationsRail/LocalSavedPlacesRow, all ~55 React.lazy components, all lucide icons, all motion.div wrappers — all correctly skipped. No other raw `<button>` elements exist in the file outside the 3 mapped groups. |

---

### Guard tally

| Metric | Value |
|--------|-------|
| className edits | 3 |
| new `aria-pressed` | 3 (A×1, B×1) via map; C=0 — **2 map declarations produce N instances each** |
| new `aria-label` | 0 |
| `focus-visible:ring` | 3 groups (all OUTWARD `ring-ring`) |
| `ring-inset` | 0 |
| active:scale new | 2 (A `[0.97]`, B `[0.97]`) |
| active:scale kept | 1 (C `95`, NOT renumbered) |
| FLIPs | 0 |
| logic lines touched | 0 |

---

### Owner action

The diff is token-only (className + aria-pressed). Verify with `npm run update` → must exit 0. No deployment needed beyond the owner's normal commit cycle.
