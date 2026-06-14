# MiMo run — 2026-06-14T10:31:00.179Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/shop/MerchantBoostEngine.tsx (238-line merchant "Merchant Boost" ad-engine page; useAuth + supabase reads (merchant_ad_spend, merchant_boosts) + insert into ad_boost_bids; framer-motion motion.button). RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) + interaction-anim prop (whileTap) ONLY; preserve ALL logic, onClick, navigate, supabase, .insert, useState, useEffect, disabled, setState byte-identical. Don't add a SECOND COMPETING press effect. Don't churn controls that ALREADY ship press+transition (whileTap + transition-all). Don't add role/tabIndex/onKeyDown (structural — FLAG). SKIP shadcn Button/Card/CardHeader/CardTitle/CardContent.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. An OUTWARD ring on a control with its OWN tinted fill (bg-primary/5, bg-card) STILL renders against the neutral PARENT (bg-background) → ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99]. (NOTE: these motion.button cards ALREADY have framer-motion whileTap scale — do NOT add a competing CSS active:scale.)
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO a hover:/active: bg/text(color)/border/opacity pseudo ON THE ELEMENT ITSELF (or an existing transition-* animating such a change ON ITSELF).
- DON'T-CHURN rule: a control that ALREADY has press (active:scale OR framer whileTap) + a transition → ADD ring (+aria if missing) ONLY; don't renumber, no redundant 2nd scale, no flip.
- aria: aria-label ONLY on icon-only/glyph-only controls. aria-pressed ONLY on a persistent single-select toggle/segmented filter. aria-expanded on a disclosure.

TWO edits applied (DON'T-CHURN: ring + aria-pressed only) — confirm each CORRECT or NEEDS-FIX:

1) L115 CONTENT-TYPE buttons (reel / map_pin) — was a `motion.button` that ALREADY had `whileTap={{ scale: 0.97 }}` + `className={`rounded-2xl border-2 p-4 text-left transition-all ${contentType === key ? "border-primary bg-primary/5" : "border-border/40 bg-card"}`}` (PERSISTENT SINGLE-SELECT toggle; setContentType(key); visible text labels "Boost Reel"/"Boost Map Pin"; ALREADY ships whileTap press + transition-all animating the conditional border/bg ON ITSELF; NO ring; NO aria) → **DON'T-CHURN: ADDED `aria-pressed={contentType === key}` (single-select segmented toggle) + ring INTO the static part of the className; KEPT whileTap (the existing press — did NOT add a competing CSS active:scale); KEPT transition-all (already animates the conditional border/bg)**. Final className static part: `rounded-2xl border-2 p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + conditional ternary. **CONFIRM: ring + aria-pressed only (no 2nd press, no flip, transition-all preserved); OUTWARD ring-ring against the bg-background grid parent (correct despite own bg-primary/5 fill)?**

2) L141 BUDGET-TIER buttons ($10/$50/$100) — was a `motion.button` that ALREADY had `whileTap={{ scale: 0.95 }}` + `className={`rounded-2xl border-2 p-3 text-center transition-all ${selectedTier === i ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : "border-border/40 bg-card"}`}` (PERSISTENT SINGLE-SELECT toggle; setSelectedTier(i); visible text "$10"/tagline/days; ALREADY ships whileTap press + transition-all animating the conditional border/bg/shadow ON ITSELF; NO ring; NO aria) → **DON'T-CHURN: ADDED `aria-pressed={selectedTier === i}` + ring INTO the static part; KEPT whileTap; KEPT transition-all**. Final className static part: `rounded-2xl border-2 p-3 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + conditional ternary. **CONFIRM same as #1.**

ALSO CONFIRM I should LEAVE/SKIP: L95 BACK button = shadcn `<Button aria-label="Back" variant="ghost" size="icon">` (own tokens + already aria-label — SKIP); L224 "Boost … " PAY button = shadcn `<Button>` (own tokens — SKIP); all Card/CardHeader/CardTitle/CardContent (shadcn); all the stat/metric divs (presentational, no onClick); all lucide icons (decorative); h1 + all <p>/<span> text. No raw <a>, no onClick divs, no role="button"/cursor-pointer divs.

Be concise and exact. Return the precise final className after-string for each of #1–#2 + the aria-pressed attr. Flag any other in-scope raw interactive control I missed. KEY QUESTIONS: (1) DON'T-CHURN correct — ring + aria-pressed only, KEEP whileTap (no competing CSS active:scale), KEEP transition-all (no flip needed since it already animates the conditional border/bg)? (2) aria-pressed (NOT aria-label) correct on these visible-text single-select segmented toggles? (3) OUTWARD ring-ring against bg-background parent correct despite own bg-primary/5 / bg-card fill? (4) confirm both shadcn Buttons + all Cards are correctly SKIPPED.
- files: src/pages/app/shop/MerchantBoostEngine.tsx

---

## Verdict: BOTH EDITS CORRECT — ZERO fixes needed

### Edit #1 — Content-Type toggle (reel / map_pin)

**Final className static part:**
```
rounded-2xl border-2 p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
**Attribute:** `aria-pressed={contentType === key}`

✅ DON'T-CHURN correct — `whileTap={{ scale: 0.97 }}` preserved (no competing CSS `active:scale`); `transition-all` preserved (already animates conditional `border-primary bg-primary/5` ON ITSELF); ring + aria-pressed only.
✅ `aria-pressed` correct — persistent single-select segmented toggle with visible text labels ("Boost Reel" / "Boost Map Pin").
✅ OUTWARD `ring-ring` correct — cards have own tinted fill (`bg-primary/5` selected, `bg-card` unselected) but the ring renders against the parent `bg-background` grid container → `ring-ring`.

### Edit #2 — Budget-Tier toggle ($10 / $50 / $100)

**Final className static part:**
```
rounded-2xl border-2 p-3 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
**Attribute:** `aria-pressed={selectedTier === i}`

✅ Identical analysis — `whileTap={{ scale: 0.95 }}` preserved, `transition-all` preserved, ring + aria-pressed only.
✅ `aria-pressed` correct — persistent single-select segmented toggle with visible text.
✅ OUTWARD `ring-ring` correct — same parent-governed ring color.

### SKIP confirmations — all correct

| Control | Reason | Verdict |
|---------|--------|---------|
| L95 Back `<Button>` | shadcn, already `aria-label="Back"` | ✅ SKIP |
| L224 "Boost …" `<Button>` | shadcn | ✅ SKIP |
| All `Card`/`CardHeader`/`CardTitle`/`CardContent` | shadcn | ✅ SKIP |
| 4× stat metric `<div>`s (impressions/clicks/sales/ROI) | presentational, no `onClick` | ✅ SKIP |
| CPS highlight + historical CPS `<div>`s | presentational | ✅ SKIP |
| All lucide icons | decorative | ✅ SKIP |
| `h1` + all `<p>`/`<span>` | text | ✅ SKIP |
| No raw `<a>`, no `onClick` divs, no `role="button"` divs | confirmed absent | ✅ |

### Key questions answered

1. **DON'T-CHURN?** ✅ Ring + `aria-pressed` only. No competing CSS `active:scale`. `transition-all` kept (not a flip — already animates conditional border/bg on itself).
2. **`aria-pressed` not `aria-label`?** ✅ Correct — visible-text single-select segmented toggles, not icon-only.
3. **OUTWARD `ring-ring` despite own fill?** ✅ The ring is painted by the PARENT surface (`bg-background`), not the control's own `bg-primary/5`/`bg-card`.
4. **Shadcn Buttons + Cards skipped?** ✅ All have own design tokens; both `<Button>`s already carry accessibility props where needed.

### Diff summary

The file already has both edits applied in the provided source. No additional changes needed. **2 className edits (ring appended to static part) + 2 new aria attributes; 0 logic lines touched; all `onClick`/`navigate`/`supabase`/`.insert`/`useState`/`useEffect`/`disabled` byte-identical.**

**Verify:** `npm run update` must pass green before marking done.
