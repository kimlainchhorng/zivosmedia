# DeepSeek run — 2026-06-14T10:30:21.358Z

- model: deepseek-chat
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

## Plan

Two DON'T-CHURN edits on `src/pages/app/shop/MerchantBoostEngine.tsx` — both `motion.button` elements that already ship `whileTap` press + `transition-all`. Only add `aria-pressed` + focus ring. No competing CSS `active:scale`, no flip, no churn.

---

## Edits

### Edit #1 — L115 Content-Type buttons (reel / map_pin)

**Before:**
```tsx
className={`rounded-2xl border-2 p-4 text-left transition-all ${
  contentType === key ? "border-primary bg-primary/5" : "border-border/40 bg-card"
}`}
```

**After:**
```tsx
className={`rounded-2xl border-2 p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
  contentType === key ? "border-primary bg-primary/5" : "border-border/40 bg-card"
}`}
```

Plus the already-applied `aria-pressed={contentType === key}`.

### Edit #2 — L141 Budget-tier buttons ($10/$50/$100)

**Before:**
```tsx
className={`rounded-2xl border-2 p-3 text-center transition-all ${
  selectedTier === i ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : "border-border/40 bg-card"
}`}
```

**After:**
```tsx
className={`rounded-2xl border-2 p-3 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
  selectedTier === i ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : "border-border/40 bg-card"
}`}
```

Plus the already-applied `aria-pressed={selectedTier === i}`.

---

## Confirmations

| Question | Answer |
|----------|--------|
| **DON'T-CHURN correct?** | ✅ YES — ring + aria-pressed only. `whileTap` kept (no competing CSS `active:scale`). `transition-all` kept (already animates conditional border/bg — no flip needed). |
| **aria-pressed correct?** | ✅ YES — both are persistent single-select segmented toggles (exactly one active at a time). Visible text labels → no `aria-label` needed. |
| **OUTWARD ring-ring correct?** | ✅ YES — both buttons are children of `bg-background` parents (the grid container / CardContent). The OUTWARD ring renders against the neutral parent surface, not the button's own `bg-primary/5` or `bg-card` fill. |
| **Shadcn Buttons + Cards skipped?** | ✅ YES — L95 Back `<Button>` (already `aria-label`, own tokens), L224 Pay `<Button>` (own tokens), all `<Card>`/`<CardHeader>`/`<CardTitle>`/`<CardContent>` (shadcn primitives). |
| **Other raw controls missed?** | ✅ NONE — all remaining interactive elements are shadcn primitives or presentational divs. No raw `<a>`, no `onClick` divs, no `role="button"`/`cursor-pointer` divs. |

---

## Owner must verify

1. Run `npm run update` — must pass (type-check + worker type-check + build).
2. Preview at 375px width — the two-column content-type grid and three-column budget-tier grid should fit without overflow.
3. Tab through — both `motion.button` groups should show the `ring-ring` focus ring.
4. Confirm `aria-pressed` is toggled correctly on click (single-select behavior).
