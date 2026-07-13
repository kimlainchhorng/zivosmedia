# MiMo run — 2026-06-14T02:25:12.758Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + responsive QA on ONE customer-facing page: src/pages/CreatorWelcomePage.tsx (142 lines, creator onboarding "first stop"). Reads creatorType via useCreatorType() hook (creatorType, isLoading). showPicker useState; useEffect forces the CreatorTypePicker open when !isLoading && !creatorType. steps = creatorType==="of" ? OF_STEPS : CONTENT_STEPS (static arrays). Layout: plain min-h-dvh div (NO SwipeBackContainer, NO sticky header, NO bottom nav) + SEOHead(noIndex); CreatorTypePicker (modal component, controlled by showPicker); hero block (motion.div icon badge [scale/opacity entrance, NO onClick] + h1 + subtitle + a CONDITIONAL "Choose your creator type" CTA shown only when !creatorType); a CONDITIONAL steps section (shown only when creatorType) = .map of motion.button step rows + a "Skip — go to dashboard" button.

Reference standard for tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): exactly 2 RAW <button type="button"> + 1 motion.button (in .map), 0 shadcn <Button>.
- (A) "Choose your creator type" RAW button (L94): onClick={() => setShowPicker(true)}, visible text "Choose your creator type" (+ ArrowRight icon), conditionally rendered only when !creatorType. className="mt-5 h-12 px-6 rounded-2xl bg-ig-gradient text-white font-extrabold text-[14px] inline-flex items-center gap-2 active:scale-[0.98]". HAS active:scale-[0.98]; NO transition; NO ring; NO hover bg/color.
- (B) step-row motion.button (L109, inside steps.map): onClick={() => navigate(step.href)}, ENTRANCE anim (initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.05+i*0.04}}), NO whileTap. visible content (icon + label + desc + ArrowRight). className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border/40 bg-card hover:border-primary/40 active:scale-[0.99] transition-all text-left". HAS CSS active:scale-[0.99] + transition-all + hover:border-primary/40; NO ring; NO whileTap. Sits in px-4 space-y-2 container (NOT overflow-hidden).
- (C) "Skip — go to dashboard" RAW button (L130): onClick={() => navigate("/creator-dashboard")}, visible text "Skip — go to dashboard" (+ Rocket icon), rendered inside the creatorType block. className="w-full mt-4 h-12 rounded-2xl bg-muted/60 font-bold text-[13px] active:scale-[0.98] inline-flex items-center justify-center gap-2". HAS active:scale-[0.98]; NO transition; NO ring; NO hover bg/color.
- Hero icon motion.div (L71, scale/opacity entrance, NO onClick) => presentational. CreatorTypePicker (L63) => component, SKIP. All lucide icons decorative.

TOKEN TIERS (this repo): wide/primary/cards active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. transition-all when a hover bg/color animates alongside the scale; transition-transform when scale is the SOLE animated property (no hover color/bg on that button). DON'T-CHURN: if a raw button ALREADY has a valid active:scale, do NOT renumber it; if it already has a transition, do NOT re-flip it. motion.button with an ENTRANCE anim but NO whileTap => its CSS active:scale is DEAD (framer leaves an inline transform after the entrance settles, which beats the stylesheet :active rule); precedent (ProfileViewsPage/PollHistoryPage/NotificationsPage/PlacesPage rows) ADDS whileTap={{ scale: 0.99 }} + ring instead of relying on the dead CSS active. aria-pressed for toggles/segmented (state by color/bg only) -- NOT for one-shot nav/action buttons. ring-inset ONLY when flush (zero clearance) inside an overflow-hidden rounded parent; OUTWARD is default.

HARD RULE: className + display-only attr (aria-*) + interaction-anim prop (whileTap) ONLY. Do NOT change any onClick / setShowPicker / navigate / navigate(step.href) / useCreatorType / useState / useEffect / the conditional render guards (!creatorType, creatorType, isOF) / steps selection / any logic.

MY PLAN -- validate or correct each (before->after; cite classNames):

(A) "Choose your creator type" RAW button (L94; HAS active:scale-[0.98], NO transition, NO ring, NO hover): ADD transition + ring; KEEP active:scale-[0.98] (wide/primary tier correct). Since there is NO hover bg/color, scale is the SOLE animated property => transition-transform (NOT transition-all). before: "mt-5 h-12 px-6 rounded-2xl bg-ig-gradient text-white font-extrabold text-[14px] inline-flex items-center gap-2 active:scale-[0.98]" -> after: "mt-5 h-12 px-6 rounded-2xl bg-ig-gradient text-white font-extrabold text-[14px] inline-flex items-center gap-2 active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring". visible text => NO aria-label; one-shot (opens picker) => NO aria-pressed. OUTWARD ring. OK?

(B) step-row motion.button (L109; ENTRANCE anim, NO whileTap, CSS active:scale-[0.99] [DEAD], transition-all, hover:border-primary/40, NO ring): ADD whileTap={{ scale: 0.99 }} (framer-native press, since the CSS active:scale-[0.99] is dead under the lingering entrance transform) + APPEND ring; KEEP transition-all (it eases hover:border-primary/40 — a color transition); KEEP the existing className active:scale-[0.99] (harmless residue; removing it would be churn). before className: "w-full flex items-center gap-3 p-4 rounded-2xl border border-border/40 bg-card hover:border-primary/40 active:scale-[0.99] transition-all text-left" -> after className: "w-full flex items-center gap-3 p-4 rounded-2xl border border-border/40 bg-card hover:border-primary/40 active:scale-[0.99] transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" + add prop whileTap={{ scale: 0.99 }}. one-shot nav => NO aria-pressed; visible text => NO aria-label. OUTWARD ring (container px-4 space-y-2, NOT overflow-hidden). OK?

(C) "Skip — go to dashboard" RAW button (L130; HAS active:scale-[0.98], NO transition, NO ring, NO hover): ADD transition + ring; KEEP active:scale-[0.98] (w-full wide tier correct). NO hover bg/color => transition-transform. before: "w-full mt-4 h-12 rounded-2xl bg-muted/60 font-bold text-[13px] active:scale-[0.98] inline-flex items-center justify-center gap-2" -> after: "w-full mt-4 h-12 rounded-2xl bg-muted/60 font-bold text-[13px] active:scale-[0.98] inline-flex items-center justify-center gap-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring". visible text => NO aria-label; one-shot nav => NO aria-pressed. OUTWARD ring. OK?

QUESTIONS:
(1) Buttons (A) and (C): transition-transform (NOT transition-all) since neither has a hover bg/color and scale is the sole animated property — do you AGREE, or do you prefer transition-all for consistency with the reference standard? I lean transition-transform per the documented rule. KEEP both scales ([0.98]) — confirm no renumber.
(2) step-row motion.button (B): do you AGREE the CSS active:scale-[0.99] is DEAD under the framer entrance transform, so the right fix is whileTap={{ scale: 0.99 }} + ring (per the ProfileViewsPage/PollHistoryPage/NotificationsPage/PlacesPage precedent), KEEPING transition-all (eases hover:border)? Or would you remove the dead className active:scale-[0.99]? I lean KEEP it (don't-churn residue). Confirm whileTap is the correct mechanism, not CSS active:scale here.
(3) Inventory exhaustive (exactly 2 RAW buttons + 1 motion.button, 0 shadcn Button)? Hero icon motion.div (L71, no onClick) + CreatorTypePicker (L63, component) correctly SKIP/leave? Note (A) renders only when !creatorType and (B)/(C) render only when creatorType — confirm these mutually-exclusive guards don't hide any additional control.
(4) Responsive 375/768/1280: hero (px-5 pt-12, 16x16 icon badge, h1 text-[26px], subtitle max-w-sm, CTA h-12 px-6); steps section (px-4 space-y-2; each row = 40px icon + flex-1 min-w-0 label/desc + ArrowRight; Skip button h-12 w-full). NO max-w wrapper on the steps/hero (full-bleed) — any crush @375 or over-wide line length @1280 to FLAG? sub-44px tap targets to FLAG (CTAs h-12=48px OK; step rows p-4 tall OK)?
(5) Any a11y note beyond the above (visible text on all 3 => no aria-label; one-shot nav/action => no aria-pressed; modal picker controlled by showPicker)?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/CreatorWelcomePage.tsx

---

Plan is **correct as-is** on all five items. My validation with one minor clarification:

---

## Validation of each item

**(A) "Choose your creator type" — AGREE, `transition-transform`**
- `active:scale-[0.98]` present, no transition, no hover → `transition-transform` is the minimal-correct easing (scale is the sole animated property). No renumber — `[0.98]` is wide/primary tier. Visible text → no `aria-label`. One-shot → no `aria-pressed`. OUTWARD ring (hero div not `overflow-hidden`). ✓

**(B) step-row motion.button — AGREE, `whileTap` + ring, KEEP residue**
- CSS `active:scale-[0.99]` is dead under the lingering framer entrance inline `transform`. Fix: `whileTap={{ scale: 0.99 }}` (framer-native, per ProfileViewsPage/PollHistoryPage/NotificationsPage/PlacesPage precedent). KEEP the dead className `active:scale-[0.99]` (harmless residue, don't-churn). KEEP `transition-all` (eases `hover:border-primary/40` color). Append ring. One-shot nav → no `aria-pressed`. Visible text → no `aria-label`. OUTWARD ring. ✓

**(C) "Skip — go to dashboard" — AGREE, `transition-transform`**
- Identical treatment to (A). `active:scale-[0.98]` present (w-full wide tier), no transition, no hover → `transition-transform`. No renumber. ✓

**(3) Inventory — CONFIRMED exhaustive**
- Exactly 2 RAW `<button>` + 1 `motion.button`, 0 shadcn `<Button>`. Hero `motion.div` (L71) and `CreatorTypePicker` (L63) correctly SKIP. The `!creatorType` / `creatorType` mutual-exclusion guards don't hide additional controls — the static arrays and conditional blocks have been traced; no sibling buttons exist in either branch. ✓

**(4) Responsive — CLEAN at 375/768; flag for owner at 1280**
- 375: hero `px-5` (~327px inner), CTA `h-12 px-6` comfortable; steps `px-4` (~331px), each row 40px icon + 12px gap + flex-1 text + 16px arrow → ~263px for text, no crush. All tap targets ≥48px or tall rows.
- 1280: **owner flag** — no `max-w` wrapper on hero or steps section → rows stretch to ~1272px wide. Cosmetic layout concern, not an interaction-token fix. Could add `max-w-2xl mx-auto` to the steps container in a future pass.

**(5) a11y — no additional notes.** All covered by the plan.

---

## Proposed diff

**File:** `src/pages/CreatorWelcomePage.tsx`

```diff
--- a/src/pages/CreatorWelcomePage.tsx
+++ b/src/pages/CreatorWelcomePage.tsx
@@ -91,7 +91,7 @@ export default function CreatorWelcomePage() {
         {!creatorType && (
           <button
             type="button"
             onClick={() => setShowPicker(true)}
-            className="mt-5 h-12 px-6 rounded-2xl bg-ig-gradient text-white font-extrabold text-[14px] inline-flex items-center gap-2 active:scale-[0.98]"
+            className="mt-5 h-12 px-6 rounded-2xl bg-ig-gradient text-white font-extrabold text-[14px] inline-flex items-center gap-2 active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
             Choose your creator type
             <ArrowRight className="h-4 w-4" />
@@ -106,9 +106,10 @@ export default function CreatorWelcomePage() {
               initial={{ opacity: 0, y: 8 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.05 + i * 0.04 }}
+              whileTap={{ scale: 0.99 }}
-              className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border/40 bg-card hover:border-primary/40 active:scale-[0.99] transition-all text-left"
+              className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border/40 bg-card hover:border-primary/40 active:scale-[0.99] transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             >
               <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", step.accent)}>
                 <step.icon className="h-5 w-5" />
@@ -130,7 +131,7 @@ export default function CreatorWelcomePage() {
           <button
             type="button"
             onClick={() => navigate("/creator-dashboard")}
-            className="w-full mt-4 h-12 rounded-2xl bg-muted/60 font-bold text-[13px] active:scale-[0.98] inline-flex items-center justify-center gap-2"
+            className="w-full mt-4 h-12 rounded-2xl bg-muted/60 font-bold text-[13px] active:scale-[0.98] inline-flex items-center justify-center gap-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
             <Rocket className="h-4 w-4" />
             Skip — go to dashboard
```

**Summary:** 3 className in-place appends (tokens only) + 1 new `whileTap` prop line. 0 logic changes. Diffstat: **4 ins / 3 del (+1 net)**.

---

## Owner must verify

1. `npm run update` must pass (type-check + worker type-check + production build → 0 errors).
2. Preview at 375/768/1280 — the page is behind auth + `useCreatorType()`, so a logged-in creator session is needed to see the steps section (B/C). The CTA (A) renders when `!creatorType`.
3. **Layout flag (cosmetic, future pass):** no `max-w` on the steps/hero containers → rows are full-bleed at desktop widths. Consider adding `max-w-2xl mx-auto` to the steps `<div>` if the owner wants constrained width.
