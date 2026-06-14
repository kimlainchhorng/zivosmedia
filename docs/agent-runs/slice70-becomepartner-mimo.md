# MiMo run — 2026-06-14T06:51:32.649Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + a11y QA on ONE customer-facing page: src/pages/BecomePartnerPage.tsx (347 lines, "Partner onboarding landing — driver/restaurant/hotel/property/employer"; NO auth, NO Supabase — static OPTIONS/PILLARS/TESTIMONIALS/FAQS arrays + useState faqOpen/hoursPerWeek + a driver earnings estimator [hoursPerWeek*$18 weekly, *4.3 monthly]). Sections: Hero; partner-type card grid; earnings estimator (range slider + 2 result tiles + CTA); Why-ZIVO pillars; testimonials; FAQ accordion; footer CTA.

Reference standard: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): interactive controls = (1) L164 partner-type motion.button mapped x5 (whileTap scale 0.98 + whileHover y:-2 + entrance anim, onClick navigate `/partner-with-zivo?type=${opt.type}`, className "relative overflow-hidden rounded-3xl p-5 text-left bg-card border border-border hover:border-foreground/30 transition-colors touch-manipulation", NO focus); (2) L215 range input type=range (onChange setHoursPerWeek, ALREADY aria-label="Hours per week", accent-emerald-500); (3) L236 Start-driving CTA button (onClick navigate, className "...w-full rounded-2xl bg-ig-gradient text-white font-bold py-3 ...hover:opacity-90 active:scale-[0.98] transition-all", NO focus); (4) L301 FAQ accordion button mapped x5 (onClick setFaqOpen toggle, ChevronDown rotate-180, FLUSH inside "rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border", className "w-full flex items-center justify-between px-4 py-4 text-left hover:bg-muted/20 transition-colors touch-manipulation", NO scale/focus/aria); (5) L336 Contact-sales CTA button (onClick navigate("/contact"), className "...inline-flex...rounded-xl bg-foreground text-background...active:scale-[0.98] transition-transform", NO focus). PILLARS/TESTIMONIALS = non-interactive divs. Stars/icons decorative. NO shadcn Button/Input on this page (all raw).

TOKEN TIERS: wide/primary/cards/full-width active:scale-[0.98]; links/chips/pills active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. FLIP RULE: ADDING a NEW CSS scale to a transition-colors/no-transition control that ALSO has hover color/bg/border → FLIP transition-colors→transition-all. DON'T-CHURN: control ALREADY has press (CSS active:scale OR framer whileTap) + transition → ring (+aria) ONLY (no 2nd scale, no flip, no renumber). aria-expanded for disclosure. aria-label for icon-only. OUTWARD ring-ring default on neutral surfaces; ring-inset for control FLUSH inside an overflow-hidden parent.

EDITS APPLIED (validate exact):
(A) L164 partner-type motion.button — DON'T-CHURN ring-ONLY append "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (has whileTap scale 0.98 press already; kept transition-colors — NO flip since no new CSS scale; OUTWARD ring-ring — card's own overflow-hidden clips descendants NOT the box-shadow ring, grid gap-3 leaves room; NO aria — visible text label).
(B) L236 Start-driving CTA — DON'T-CHURN ring-ONLY append (already active:scale-[0.98] + transition-all; NO flip, NO 2nd scale; OUTWARD ring-ring; NO aria — visible text).
(C) L301 FAQ accordion — ADD aria-expanded={faqOpen === i} + ring with focus-visible:ring-inset (disclosure control; INSET because flush inside overflow-hidden divide-y container — outward ring would be clipped; KEPT transition-colors, NO scale — flush divided rows scale badly, no new CSS scale so no flip needed).
(D) L336 Contact-sales CTA — DON'T-CHURN ring-ONLY append (already active:scale-[0.98] + transition-transform; NO flip, NO 2nd scale; OUTWARD ring-ring; NO aria — visible text).
LEAVE: L215 range input (native, already aria-label="Hours per week"); PILLARS/TESTIMONIALS divs; stars/icons decorative.

QUESTIONS:
(1) (A) partner-type motion.button: DON'T-CHURN ring-ONLY correct (has whileTap)? KEEP transition-colors (no new CSS scale → no flip)? OUTWARD ring-ring OK on overflow-hidden card in grid gap-3 (ring is box-shadow not clipped)? NO aria (visible label)?
(2) (B) Start-driving CTA: DON'T-CHURN ring-ONLY correct (already active:scale-[0.98] + transition-all)?
(3) (C) FAQ accordion: aria-expanded correct for disclosure? ring-INSET correct (flush inside overflow-hidden divide-y)? NO scale + KEEP transition-colors correct?
(4) (D) Contact-sales CTA: DON'T-CHURN ring-ONLY correct (already active:scale-[0.98] + transition-transform)?
(5) Inventory exhaustive (4 buttons edited, range input LEFT)? PILLARS/TESTIMONIALS/stars/icons presentational?
(6) Owner flags (logic/out of scope, FLAG not fix): (a) earnings estimator hardcodes $18/hr HOURLY_RATE + 4.3 weeks/mo — purely illustrative, no real data; (b) all 5 partner cards + both driver CTAs route to /partner-with-zivo (driver CTA forces type=driver) — correct; anything else?
(7) Responsive 375/768/1280: hero; partner card grid (grid-cols-1 sm:grid-cols-2); estimator (range + 2 tiles grid-cols-2); pillars (grid-cols-1 sm:grid-cols-3); testimonials (sm:grid-cols-3); FAQ accordion; footer CTA. Any crush @375? sub-44px tap targets to FLAG (FAQ rows py-4 ~52px OK; CTAs py-3/py-2 OK; partner cards big OK; range slider native)?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/BecomePartnerPage.tsx

---

## (1) Plan

Four className edits + one aria attr on `src/pages/BecomePartnerPage.tsx`. All are additive display-only; zero logic lines touched. Two don't-churn ring-only (A, B, D), one disclosure fix with ring-inset (C). Range input and all non-interactive sections left untouched.

---

## (2) Proposed diff

**File:** `src/pages/BecomePartnerPage.tsx`

### (A) L164 — partner-type `motion.button` (template, hits all 5 cards)

**Before:**
```
className="relative overflow-hidden rounded-3xl p-5 text-left bg-card border border-border hover:border-foreground/30 transition-colors touch-manipulation"
```
**After:**
```
className="relative overflow-hidden rounded-3xl p-5 text-left bg-card border border-border hover:border-foreground/30 transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
Ring-only append. `whileTap={{ scale: 0.98 }}` is the press — no second CSS scale. No flip — no new CSS scale on `transition-colors`. OUTWARD `ring-ring` — `overflow-hidden` clips descendant content, not the element's own `box-shadow` ring; `grid gap-3` leaves room. No aria — visible text label.

### (B) L236 — Start-driving CTA `<button>`

**Before:**
```
className="mt-4 w-full rounded-2xl bg-ig-gradient text-white font-bold py-3 text-sm shadow-sm hover:opacity-90 active:scale-[0.98] transition-all"
```
**After:**
```
className="mt-4 w-full rounded-2xl bg-ig-gradient text-white font-bold py-3 text-sm shadow-sm hover:opacity-90 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
Ring-only. Already `active:scale-[0.98]` + `transition-all` — no flip, no second scale. OUTWARD `ring-ring`. No aria — visible text.

### (C) L301 — FAQ accordion `<button>` (template, hits all 5 items)

**Before:**
```
onClick={() => setFaqOpen(faqOpen === i ? null : i)}
className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-muted/20 transition-colors touch-manipulation"
```
**After:**
```
onClick={() => setFaqOpen(faqOpen === i ? null : i)}
aria-expanded={faqOpen === i}
className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-muted/20 transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
```
Disclosure → `aria-expanded={faqOpen === i}`. Ring-INSET because the button is flush inside the parent `rounded-2xl overflow-hidden divide-y` container — an outward ring (box-shadow beyond the button's border box) would be clipped by the parent's `overflow-hidden`. Kept `transition-colors` — no new CSS scale → no flip.

### (D) L336 — Contact-sales CTA `<button>`

**Before:**
```
className="mt-3 inline-flex items-center gap-1 rounded-xl bg-foreground text-background font-bold px-4 py-2 text-sm active:scale-[0.98] transition-transform"
```
**After:**
```
className="mt-3 inline-flex items-center gap-1 rounded-xl bg-foreground text-background font-bold px-4 py-2 text-sm active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
Ring-only. Already `active:scale-[0.98]` + `transition-transform` — no flip, no second scale. OUTWARD `ring-ring`. No aria — visible text.

---

## (3) Verification checklist

**Guard grep over the diff:**
- `−`/`+` className edits = 4 (A, B, C, D)
- aria attrs added = 1 (`aria-expanded` on C)
- `focus-visible:ring` = 4, `ring-ring` = 4 (3 OUTWARD, 1 INSET)
- `ring-inset` = 1 (C only)
- `active:scale` = 0 new (B/D kept existing, A uses framer whileTap)
- FLIPs = 0
- `onClick`/`navigate`/`setFaqOpen`/`setHoursPerWeek` — all byte-identical, 0 logic lines touched

**Answers to your specific questions:**

**(1)** All correct. `whileTap` IS the press → ring-only, no flip, no aria. Outward ring on `overflow-hidden` is fine (box-shadow is the element's own rendering, not clipped by its own overflow or its parent's — the parent clips descendants, but the ring is on the button itself which is a direct child with no overflow issue at the ring level).

**(2)** Correct. Already has press + transition → ring-only.

**(3)** `aria-expanded` correct for disclosure. `ring-inset` correct — the button is flush inside the `overflow-hidden divide-y` parent with no gap/border-radius of its own; outward ring would be clipped. No scale correct (flush divided rows). Keep `transition-colors` (for `hover:bg-muted/20`). No flip (no new CSS scale).

**(4)** Correct. Already has press + transition → ring-only.

**(5)** Exhaustive. 4 controls edited (2 templates + 2 individuals). Range input LEFT (already `aria-label`). PILLARS/TESTIMONIALS non-interactive `<div>`s. Stars/icons decorative.

**(6)** Both flags noted and correct as-is: (a) `$18/hr × 4.3 wks/mo` is illustrative copy, not real data; (b) all partner cards + driver CTAs route to `/partner-with-zivo` — consistent. **Additional flag:** Contact-sales `py-2` yields ~36px tap height (sub-44px) — pre-existing compact pattern, not introduced here.

**(7)** Responsive clean. At 375: hero `px-5` single column; partner cards `grid-cols-1`; estimator tiles `grid-cols-2` (two ~165px tiles fit); pillars/testimonials single column; FAQ full-width; footer CTA full-width. No crush. Sub-44px flags: Contact-sales `py-2` (~36px), range slider thumb (native, ~20px but platform-standard). All pre-existing.

**Owner verify:** `npm run update` must pass (type-check + worker type-check + production build). No deploy — owner commits.
