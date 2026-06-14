# DeepSeek run — 2026-06-14T06:43:08.164Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/ZivoPlusPage.tsx (654-line ZIVO+ membership/subscription page: sticky header + Back, an amber hero card, a "Connected workflow" status grid, an Active-membership card [shadcn Manage button], a Member-Benefits list, a 2x2 PRICING-CARD grid [motion.button plan selector, single-select], a shadcn CTA Subscribe button, a fine-print line with inline Terms + Privacy text buttons that open a bottom-sheet LegalSheet overlay [own close X], and a Plan-Comparison table). RULES: className strings + display-only attributes (aria-*) ONLY; preserve ALL logic, onClick, navigate, setState, useSearchParams, useQuery, supabase reads + functions.invoke (checkout/portal), toast, byte-identical. Don't add a SECOND competing press effect (framer whileTap IS the press — if present, append focus-ring ONLY, no CSS active:scale). Don't churn already-polished controls. Don't renumber an existing scale.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a flush edge child of a rounded overflow-hidden PARENT.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring; saturated/dark/image surface AS THE PARENT = ring-white/70. A gradient/tinted-FILLED button (bg-amber-500/5, bg-ig-gradient, bg-foreground) sitting ON a neutral parent still uses ring-ring (ring renders against the neutral parent, not the fill).
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip active:scale-[0.97]; wide full-width row/card WITH its own bordered/filled surface active:scale-[0.98].
- transition rule: transition-transform when scale is the ONLY animated prop; transition-all when ALSO hover:bg/text/border. The bare `transition` utility includes transform+colors+box-shadow. FLIP RULE: a control with transition-colors GAINING a NEW active:scale MUST flip to transition-all. transition-transform already includes transform → NO flip when only adding scale. If a control ALREADY has a framer whileTap press, do NOT add a CSS active:scale (would double-press) — append the focus ring ONLY (and the ring needs no transition to appear).
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select segmented filter OR a two-way toggle whose on/off is bg-conveyed. aria-expanded on a disclosure/accordion trigger. NOT aria-pressed on one-shot actions (nav, set-value, delete, close). aria-haspopup="dialog" ONLY when the target is a semantic role="dialog".

CONTROLS (give me per control: exact final after-string of appended classes, ring color + reason, press tier, transition class + whether a FLIP is needed, and any aria-* attr; flag any to LEAVE):

A) L232 LegalSheet close button (raw `<button>`, icon-only X, onClick onClose): `p-2 rounded-xl hover:bg-muted/60 transition-colors`. Has transition-colors, NO scale/focus/label. Parent is the LegalSheet `bg-background rounded-t-3xl` panel (neutral). → plan: ADD aria-label="Close" + FLIP transition-colors→transition-all + APPEND `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (icon-only 95; FLIP — transition-colors gaining new scale; OUTWARD ring-ring neutral panel). Confirm.

B) L382 Header Back button (`motion.button`, icon-only, ALREADY `whileTap={{ scale: 0.9 }}`, ALREADY `aria-label="Go back"`, onClick navigate(-1)): `min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-2xl hover:bg-muted/60 touch-manipulation`. Has whileTap press, NO transition/focus. Parent sticky header `bg-background/80` (neutral). → plan: append the focus ring ONLY `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (whileTap IS the press — do NOT add a CSS active:scale; aria-label already present; OUTWARD ring-ring neutral header). Confirm ring-only / no second press.

C) L525 Pricing plan card (`motion.button`, mapped over planCards, single-select plan picker, selection bg-conveyed `border-amber-500/50 bg-amber-500/5 shadow-md` when `selectedPlan === p.id`, ALREADY `whileTap={{ scale: 0.97 }}`, onClick setSelectedPlan(p.id)): base `relative p-3.5 rounded-2xl border-2 text-left transition-all duration-200`. Has whileTap + transition-all, NO focus/aria. Parent: the 2-col grid on the page `bg-background` (neutral). → plan: ADD `aria-pressed={selectedPlan === p.id}` (persistent single-select segmented selector) + APPEND into base `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (ring ONLY — whileTap is the press, transition-all present, no second scale, no flip; OUTWARD ring-ring — the amber tint is the card's OWN selected fill, ring renders against the neutral grid). Confirm aria-pressed vs none, and ring-only.

D) L602 Terms inline text button (raw `<button>`, onClick setLegalSheet("terms") opens a bottom-sheet overlay): `text-primary/60 underline hover:text-primary transition-colors`. Has transition-colors + hover:text-color, NO scale/focus. Small inline text-link. → plan: FLIP transition-colors→transition-all + APPEND `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (small text-link 0.97; FLIP — transition-colors gaining new scale; OUTWARD ring-ring). ARIA QUESTION: it opens a custom LegalSheet motion overlay that has NO role="dialog" — so NO aria-haspopup (target isn't a semantic dialog)? Confirm no-aria + FLIP.

E) L603 Privacy inline text button — identical shape to D (onClick setLegalSheet("privacy")). Same treatment. Confirm.

ALSO CONFIRM I should LEAVE these: shadcn `<Button>` Manage-subscription L480 + CTA Subscribe L581 (ship own focus/scale tokens); the CTA wrapper `motion.div` L580 (presentational whileTap wrapper); the inline `<a href="mailto:support@zivosmedia.com">` links inside TermsContent L140 + PrivacyContent L203 (body-copy links in shared legal content — flag as optional/leave to avoid churning shared components?); the hero/workflow/benefit/comparison cards (plain non-interactive `<div>`s, no onClick); the motion.div plan-check layoutId indicator L543 (animation); all icons/badges (decorative).

Be concise and exact. Return the precise final className after-string per control + any aria attr. Note B/C are framer whileTap controls (ring-only, no second press); C is mapped (single edit hits all 4 plan cards); D/E are a matched text-link pair.
- files: src/pages/ZivoPlusPage.tsx

---

# Plan: ZivoPlusPage premium interaction + a11y pass

## Controls inventory

| # | Line | Control | Type | Has whileTap? | Has transition? | Has scale? | Has aria? |
|---|------|---------|------|---------------|-----------------|------------|-----------|
| A | L232 | LegalSheet close X | raw `<button>` icon-only | No | `transition-colors` | No | No |
| B | L382 | Header Back | `motion.button` icon-only | **Yes** (0.9) | No | No | `aria-label="Go back"` |
| C | L525 | Pricing plan card (mapped ×4) | `motion.button` | **Yes** (0.97) | `transition-all duration-200` | No | No |
| D | L602 | Terms inline text | raw `<button>` | No | `transition-colors` | No | No |
| E | L603 | Privacy inline text | raw `<button>` | No | `transition-colors` | No | No |

## Per-control plan

### A) LegalSheet close X (L232)
- **Parent**: `bg-background rounded-t-3xl` panel (neutral)
- **Action**: ADD `aria-label="Close"` + FLIP `transition-colors`→`transition-all` + APPEND `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Final className**: `p-2 rounded-xl hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Ring**: OUTWARD `ring-ring` (neutral parent)
- **Press**: `active:scale-95` (icon-only tier)
- **Transition**: FLIP `transition-colors`→`transition-all` (gaining new scale)
- **Aria**: `aria-label="Close"` (icon-only)

### B) Header Back (L382)
- **Parent**: sticky header `bg-background/80` (neutral)
- **Action**: APPEND focus ring ONLY — `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Final className**: `min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-2xl hover:bg-muted/60 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Ring**: OUTWARD `ring-ring` (neutral parent)
- **Press**: NO CSS scale — `whileTap={{ scale: 0.9 }}` IS the press
- **Transition**: No change needed (no transition class present, ring needs no transition)
- **Aria**: Already has `aria-label="Go back"` — keep

### C) Pricing plan card (L525, mapped ×4)
- **Parent**: 2-col grid on `bg-background` (neutral)
- **Action**: ADD `aria-pressed={selectedPlan === p.id}` + APPEND focus ring ONLY — `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Final className**: `relative p-3.5 rounded-2xl border-2 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Ring**: OUTWARD `ring-ring` (amber tint is the card's OWN selected fill, ring renders against neutral grid parent)
- **Press**: NO CSS scale — `whileTap={{ scale: 0.97 }}` IS the press
- **Transition**: `transition-all` already present — no flip needed
- **Aria**: `aria-pressed={selectedPlan === p.id}` (persistent single-select segmented selector)

### D) Terms inline text (L602)
- **Parent**: fine-print paragraph on `bg-background` (neutral)
- **Action**: FLIP `transition-colors`→`transition-all` + APPEND `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Final className**: `text-primary/60 underline hover:text-primary transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Ring**: OUTWARD `ring-ring` (neutral parent)
- **Press**: `active:scale-[0.97]` (small text-link tier)
- **Transition**: FLIP `transition-colors`→`transition-all` (gaining new scale)
- **Aria**: NO `aria-haspopup` — the LegalSheet overlay has NO `role="dialog"` (it's a `motion.div` with no semantic role)

### E) Privacy inline text (L603)
- **Identical to D** — same treatment

## Controls to LEAVE (no changes)

- **shadcn `<Button>` Manage-subscription L480** — ships own focus/scale tokens
- **shadcn `<Button>` CTA Subscribe L581** — ships own focus/scale tokens
- **CTA wrapper `motion.div` L580** — presentational `whileTap` wrapper, no interactive control
- **Inline `<a href="mailto:...">` links** inside TermsContent/PrivacyContent — body-copy links in shared legal content, leave to avoid churning shared components
- **Hero/workflow/benefit/comparison cards** — plain non-interactive `<div>`s, no onClick
- **`motion.div` plan-check `layoutId` indicator L543** — animation, not interactive
- **All icons/badges** — decorative

## Diff

```diff
--- a/src/pages/ZivoPlusPage.tsx
+++ b/src/pages/ZivoPlusPage.tsx
@@ -229,7 +229,7 @@ function LegalSheet({ title, onClose, children }: { title: string; onClose: () =
           <div className="flex items-center justify-between">
             <h2 className="text-[16px] font-bold text-foreground">{title}</h2>
-            <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-muted/60 transition-colors">
+            <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-xl hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
               <X className="h-4 w-4 text-muted-foreground" />
             </button>
           </div>
@@ -379,7 +379,7 @@ export default function ZivoPlusPage() {
       <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-2xl border-b border-border/20">
         <div className="flex items-center gap-3 px-4 py-3">
-          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} aria-label="Go back" className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-2xl hover:bg-muted/60 touch-manipulation">
+          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} aria-label="Go back" className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-2xl hover:bg-muted/60 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <ArrowLeft className="h-5 w-5" />
           </motion.button>
           <div className="flex items-center gap-2">
@@ -522,7 +522,7 @@ export default function ZivoPlusPage() {
               {!isPlanLoading && planCards.map((p) => (
                 <motion.button
                   key={p.id}
                   whileTap={{ scale: 0.97 }}
+                  aria-pressed={selectedPlan === p.id}
                   onClick={() => setSelectedPlan(p.id)}
-                  className={`relative p-3.5 rounded-2xl border-2 text-left transition-all duration-200 ${
+                  className={`relative p-3.5 rounded-2xl border-2 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                     selectedPlan === p.id
                       ? "border-amber-500/50 bg-amber-500/5 shadow-md shadow-amber-500/10"
                       : "border-border/20 bg-card hover:border-border/40"
@@ -599,7 +599,7 @@ export default function ZivoPlusPage() {
             <p className="text-[9px] text-muted-foreground/60 text-center leading-relaxed px-4">
               Secure checkout opens with Stripe. Cancel anytime from your account settings. By subscribing you agree to our{" "}
-              <button type="button" onClick={() => setLegalSheet("terms")} className="text-primary/60 underline hover:text-primary transition-colors">Terms</button> and{" "}
-              <button type="button" onClick={() => setLegalSheet("privacy")} className="text-primary/60 underline hover:text-primary transition-colors">Privacy Policy</button>.
+              <button type="button" onClick={() => setLegalSheet("terms")} className="text-primary/60 underline hover:text-primary transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Terms</button> and{" "}
+              <button type="button" onClick={() => setLegalSheet("privacy")} className="text-primary/60 underline hover:text-primary transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Privacy Policy</button>.
             </p>
           </div>
```

## Summary

| Control | Edits | Aria | Press | Transition | Ring |
|---------|-------|------|-------|------------|------|
| A) Close X | 3 | `aria-label="Close"` | `active:scale-95` | FLIP→`transition-all` | OUTWARD `ring-ring` |
| B) Header Back | 1 (ring only) | Keep existing | whileTap (no CSS) | None needed | OUTWARD `ring-ring` |
| C) Plan cards ×4 | 2 (ring + aria) | `aria-pressed={...}` | whileTap (no CSS) | Already `transition-all` | OUTWARD `ring-ring` |
| D) Terms | 2 | None | `active:scale-[0.97]` | FLIP→`transition-all` | OUTWARD `ring-ring` |
| E) Privacy | 2 | None | `active:scale-[0.97]` | FLIP→`transition-all` | OUTWARD `ring-ring` |

**Total**: 5 controls edited, 3 new aria attrs, 0 logic lines touched. Must pass `npm run update`.
