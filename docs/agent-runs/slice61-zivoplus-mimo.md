# MiMo run — 2026-06-14T06:44:01.392Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Plan

5 raw controls edited. 4 className edits + 1 aria attr (`aria-pressed`) + 1 `aria-label`. Zero logic lines touched. All shadcn Buttons, presentational wrappers, legal-content mailto links, non-interactive cards, and decorative elements left.

---

## Per-control verdict

**A) LegalSheet close X button** — **CONFIRMED as proposed.**
- Final after-string: `p-2 rounded-xl hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- Add attr: `aria-label="Close"`
- Ring: `ring-ring` (neutral `bg-background` panel parent)
- FLIP: yes — `transition-colors` → `transition-all` (gaining new scale + hover:bg)
- Press: CSS `active:scale-95` (icon-only; no whileTap present)

**B) Header Back `motion.button`** — **CONFIRMED ring-only, no second press.**
- Final after-string: append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (no transition class needed — ring-only, no CSS scale, per rulebook "the ring needs no transition to appear")
- No new aria (`aria-label="Go back"` pre-existing)
- Ring: `ring-ring` (neutral sticky header `bg-background/80`)
- No FLIP, no CSS active:scale — `whileTap={{ scale: 0.9 }}` IS the press

**C) Pricing plan `motion.button`** — **CONFIRMED ring-only + `aria-pressed`.**
- Add attr: `aria-pressed={selectedPlan === p.id}` (persistent single-select segmented selector — bg-conveyed selection state)
- Final after-string: append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` into the base className (before the template-literal conditional)
- Ring: `ring-ring` (neutral `bg-background` grid parent; the amber tint is the card's OWN selected fill)
- No CSS active:scale — `whileTap={{ scale: 0.97 }}` IS the press
- No FLIP — `transition-all` already present
- Single edit hits all 4 mapped plan cards

**D) Terms text button** — **CONFIRMED, no aria.**
- Final after-string: `text-primary/60 underline hover:text-primary transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- Ring: `ring-ring` (neutral page background)
- FLIP: yes — `transition-colors` → `transition-all` (gaining new scale + hover:text)
- No `aria-haspopup` — LegalSheet overlay has no `role="dialog"`, not a semantic dialog
- Press: CSS `active:scale-[0.97]` (small inline text-link; no whileTap)

**E) Privacy text button** — **Identical to D.** Same diff, same ring/FLIP/no-aria.

---

## LEAVE list — all confirmed

| Control | Reason |
|---|---|
| shadcn `<Button>` Manage L480 | Ships own focus/scale tokens |
| shadcn `<Button>` CTA Subscribe L581 | Ships own focus/scale tokens |
| `motion.div` CTA wrapper L580 | Presentational (whileTap on wrapper only) |
| `<a href="mailto:...">` in TermsContent L140 + PrivacyContent L203 | Body-copy links in shared legal components — leave to avoid churning shared content |
| Hero / workflow / benefit / comparison `<div>` cards | Non-interactive, no onClick |
| `motion.div` plan-check `layoutId` L543 | Layout animation, presentational |
| All icons / badges | Decorative |

---

## Diff

**File:** `src/pages/ZivoPlusPage.tsx`

```diff
*** a/src/pages/ZivoPlusPage.tsx
--- b/src/pages/ZivoPlusPage.tsx
***************
*** 229,235 ****
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-bold text-foreground">{title}</h2>
!               <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-muted/60 transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
--- 229,235 ----
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-bold text-foreground">{title}</h2>
!               <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-xl hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
***************
*** 379,385 ****
          <div className="flex items-center gap-3 px-4 py-3">
!           <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} aria-label="Go back" className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-2xl hover:bg-muted/60 touch-manipulation">
              <ArrowLeft className="h-5 w-5" />
            </motion.button>
--- 379,385 ----
          <div className="flex items-center gap-3 px-4 py-3">
!           <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} aria-label="Go back" className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-2xl hover:bg-muted/60 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ArrowLeft className="h-5 w-5" />
            </motion.button>
***************
*** 522,532 ****
                <motion.button
                  key={p.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedPlan(p.id)}
!                 className={`relative p-3.5 rounded-2xl border-2 text-left transition-all duration-200 ${
--- 522,533 ----
                <motion.button
                  key={p.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedPlan(p.id)}
+                 aria-pressed={selectedPlan === p.id}
!                 className={`relative p-3.5 rounded-2xl border-2 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
***************
*** 598,606 ****
              Secure checkout opens with Stripe. Cancel anytime from your account settings. By subscribing you agree to our{" "}
!             <button type="button" onClick={() => setLegalSheet("terms")} className="text-primary/60 underline hover:text-primary transition-colors">Terms</button> and{" "}
!             <button type="button" onClick={() => setLegalSheet("privacy")} className="text-primary/60 underline hover:text-primary transition-colors">Privacy Policy</button>.
--- 599,607 ----
              Secure checkout opens with Stripe. Cancel anytime from your account settings. By subscribing you agree to our{" "}
!             <button type="button" onClick={() => setLegalSheet("terms")} className="text-primary/60 underline hover:text-primary transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Terms</button> and{" "}
!             <button type="button" onClick={() => setLegalSheet("privacy")} className="text-primary/60 underline hover:text-primary transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Privacy Policy</button>.
```

---

## Guard summary

| Metric | Count |
|---|---|
| `−`/`+` className edits | 5 (A, B, C, D, E) |
| New `aria-pressed` | 1 (C only) |
| New `aria-label` | 1 (A only) |
| `focus-visible:ring` | 5 |
| `ring-ring` | 5 (all OUTWARD on neutral parents) |
| `ring-white/70` | 0 |
| `ring-inset` | 0 |
| FLIPs | 2 (A + D/E `transition-colors` → `transition-all`) |
| CSS `active:scale` added | 3 (A `95`, D+E `[0.97]`) |
| whileTap controls given ring-only | 2 (B, C) |
| Logic lines touched | 0 |

## Owner must verify

1. **`npm run update`** — must pass (type-check + worker type-check + production build).
2. Preview `/zivo-plus` at 375/768/1280 — confirm the 4 plan cards render with the `aria-pressed` attr (inspect DOM), the focus ring appears on Tab through the LegalSheet close X and the Terms/Privacy text buttons, and the Back button ring appears on keyboard focus.
3. Open the LegalSheet overlay → Tab to the X button → confirm ring + press scale + `aria-label="Close"` in accessibility inspector.
4. The `<a href="mailto:...">` links in TermsContent/PrivacyContent are intentionally left (shared legal content). Optional follow-up: add `focus-visible:ring-2 focus-visible:ring-ring` + `transition-all active:scale-[0.97]` to those anchors if the owner wants them polished.
