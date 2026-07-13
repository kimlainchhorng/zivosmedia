# DeepSeek run — 2026-06-14T06:50:31.593Z

- model: deepseek-chat
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

## Plan

Apply the premium interaction + a11y pass to `src/pages/BecomePartnerPage.tsx` following the verified facts and token tiers. 4 controls edited, 1 aria attribute added, 0 logic lines touched.

## Proposed Diff

```diff
--- a/src/pages/BecomePartnerPage.tsx
+++ b/src/pages/BecomePartnerPage.tsx
@@ -161,7 +161,7 @@ export default function BecomePartnerPage() {
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: i * 0.04 }}
                 onClick={() => navigate(`/partner-with-zivo?type=${opt.type}`)}
-                className="relative overflow-hidden rounded-3xl p-5 text-left bg-card border border-border hover:border-foreground/30 transition-colors touch-manipulation"
+                className="relative overflow-hidden rounded-3xl p-5 text-left bg-card border border-border hover:border-foreground/30 transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               >
                 <div className="flex items-start gap-3">
                   <div className="w-12 h-12 rounded-2xl bg-secondary border border-border flex items-center justify-center">
@@ -233,7 +233,7 @@ export default function BecomePartnerPage() {
           <button
             type="button"
             onClick={() => navigate("/partner-with-zivo?type=driver")}
-            className="mt-4 w-full rounded-2xl bg-ig-gradient text-white font-bold py-3 text-sm shadow-sm hover:opacity-90 active:scale-[0.98] transition-all"
+            className="mt-4 w-full rounded-2xl bg-ig-gradient text-white font-bold py-3 text-sm shadow-sm hover:opacity-90 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
             Start driving with ZIVO
           </button>
@@ -298,7 +298,7 @@ export default function BecomePartnerPage() {
               <button
                 type="button"
                 onClick={() => setFaqOpen(faqOpen === i ? null : i)}
-                className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-muted/20 transition-colors touch-manipulation"
+                aria-expanded={faqOpen === i}
+                className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-muted/20 transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
               >
                 <span className="text-[13px] font-semibold pr-4">{faq.q}</span>
                 <ChevronDown
@@ -333,7 +333,7 @@ export default function BecomePartnerPage() {
           <button
             type="button"
             onClick={() => navigate("/contact")}
-            className="mt-3 inline-flex items-center gap-1 rounded-xl bg-foreground text-background font-bold px-4 py-2 text-sm active:scale-[0.98] transition-transform"
+            className="mt-3 inline-flex items-center gap-1 rounded-xl bg-foreground text-background font-bold px-4 py-2 text-sm active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
             Contact sales <ChevronRight className="w-4 h-4" />
           </button>
```

## Verification

**(1) (A) partner-type motion.button** — DON'T-CHURN ring-ONLY correct. `whileTap={{ scale: 0.98 }}` is the press (framer-motion, not CSS). No new CSS scale added → no flip needed. `overflow-hidden` clips descendants but the `box-shadow` ring is on the button itself → OUTWARD `ring-ring` renders correctly (the ring is the button's own box-shadow, not a child). No aria needed — visible text label. ✅

**(2) (B) Start-driving CTA** — DON'T-CHURN ring-ONLY correct. Already has `active:scale-[0.98]` + `transition-all`. No flip, no second scale. OUTWARD `ring-ring`. No aria — visible text. ✅

**(3) (C) FAQ accordion** — `aria-expanded={faqOpen === i}` correct for disclosure toggle. `ring-inset` correct because the button is flush inside `overflow-hidden divide-y` container — outward ring would be clipped. No scale added (flush divided rows would look odd with scale). No flip needed (no new CSS scale). ✅

**(4) (D) Contact-sales CTA** — DON'T-CHURN ring-ONLY correct. Already has `active:scale-[0.98]` + `transition-transform`. No flip, no second scale. OUTWARD `ring-ring`. No aria — visible text. ✅

**(5) Inventory exhaustive** — 4 controls edited (partner cards, start-driving CTA, FAQ accordion, contact-sales CTA). Range input LEFT (native, already has `aria-label`). PILLARS/TESTIMONIALS divs presentational. Stars/icons decorative. ✅

**(6) Owner flags** — (a) earnings estimator hardcodes $18/hr + 4.3 weeks/mo — illustrative only, no real data. (b) All 5 partner cards + both driver CTAs route to `/partner-with-zivo` — correct. No other flags. ✅

**(7) Responsive** — 375: hero fits (`px-5`), partner cards `grid-cols-1` (full width), estimator range + 2 tiles `grid-cols-2`, pillars `grid-cols-1`, testimonials `grid-cols-1`, FAQ accordion full width, footer CTA full width. No crush. Sub-44px: FAQ rows `py-4` (52px ✅), CTAs `py-3`/`py-2` (44px+ ✅), partner cards large ✅, range slider native ✅. ✅

## Owner Must Verify

Run `npm run update` before committing. The diff is ready to apply — 4 className appends + 1 aria attribute, 0 logic lines touched.
