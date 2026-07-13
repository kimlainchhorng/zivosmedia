# MiMo run — 2026-06-14T08:26:55.437Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/personal/PersonalHelpPage.tsx (127-line "Help & Support" — customer help/FAQ/contact at the personal help route; REAL Supabase: submitTicket invokes the edge function support-ticket-submit; useState openFaq/subject/message/submitting; layout: AppLayout [hideHeader] + a manual header [raw icon Back + "Help & Support"] + a 3-up quick-contact grid [3 raw card buttons: Live Chat→navigate, Call Us→tel:, Email→mailto:] + an FAQ accordion card [7 raw toggle buttons, each expands a motion.div panel] + a "Still need help?" ticket form [raw <input> + <textarea> + shadcn Submit Button] + a "Browse Help Center" raw card button→navigate("/support")). RULES: className strings + display-only aria-* ONLY; preserve ALL logic, onClick, navigate, setOpenFaq, supabase.functions.invoke, byte-identical. Don't add a SECOND competing press effect. Don't churn shadcn <Button> (own tokens). Don't churn the raw <input>/<textarea> (ALREADY have native focus:ring-1 focus:ring-primary/40). Don't renumber an existing scale. Don't add role/tabIndex/onKeyDown.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when the control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; wide full-width row/card WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE BUTTON; transition-all when ALSO hover:bg/text/border/opacity ON THE BUTTON ITSELF.
- DON'T-CHURN: a control that ALREADY has active:scale + transition → ADD ring (+aria) ONLY (no scale renumber, no redundant 2nd scale, no flip).
- A control that ALREADY presses via active:bg (background wash) + transition-colors → ADD ring ONLY (do NOT add a competing scale; keep transition-colors, no flip).
- aria: aria-label ONLY on icon-only/image-only controls. aria-expanded on a disclosure/accordion toggle. aria-pressed ONLY on a persistent single-select toggle/segmented filter.

FOUR edits applied — confirm each CORRECT or NEEDS-FIX:

A) L55 HEADER BACK button (icon-only ArrowLeft, one-shot onClick={() => navigate(-1)}, ALREADY aria-label="Go back", base `w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform` [ALREADY active:scale-90 + transition-transform], NO focus; parent = the page column on bg-background neutral) → applied: DON'T-CHURN — APPENDED `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ONLY (already active:scale-90 + transition-transform → ring-only; KEEP active:scale-90 [DON'T renumber to 95]; no flip [transition-transform stays — ring adds no animated prop]; OUTWARD ring-ring on neutral bg-background; KEPT aria-label). Confirm DON'T-CHURN ring-only + keep active:scale-90 + OUTWARD ring-ring + keep aria-label.

B) L70 QUICK-CONTACT tiles (raw <button>, MAPPED ×3 over [Live Chat/Call Us/Email], one-shot onClick={c.action} [navigate OR tel:/mailto:], VISIBLE text label + an icon tile, base `flex flex-col items-center gap-2 rounded-2xl border border-border/40 bg-card py-4 active:scale-95 transition-transform` [ALREADY active:scale-95 + transition-transform], NO focus/aria; container = `grid grid-cols-3 gap-2` on bg-background) → applied: DON'T-CHURN — APPENDED `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ONLY (already active:scale-95 + transition-transform → ring-only; KEEP active:scale-95 [DON'T renumber]; no flip; OUTWARD ring-ring — the tiles have their own bg-card fill but the OUTWARD ring renders in the grid gap against the neutral page bg; NO aria — visible text labels). Confirm DON'T-CHURN ring-only + keep active:scale-95 + OUTWARD ring-ring + no-aria.

C) L89 FAQ ACCORDION toggle (raw <button>, MAPPED ×7, one-shot onClick={() => setOpenFaq(openFaq === i ? null : i)} [expand/collapse], VISIBLE question text + a Chevron Up/Down, base `w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-muted/20 transition-colors` [ALREADY presses via active:bg-muted/20 background wash + transition-colors], NO scale/focus/aria; this button is a FLUSH child of the FAQ card `rounded-2xl bg-card border overflow-hidden` [an OVERFLOW-HIDDEN rounded parent]) → applied: ADDED `aria-expanded={openFaq === i}` + APPENDED `focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (ring-ONLY — DON'T add a competing scale, the row ALREADY presses via active:bg-muted/20; keep transition-colors, NO flip [ring adds no animated prop]; ring-INSET — the button is a flush edge child of the rounded-2xl OVERFLOW-HIDDEN FAQ card, so an OUTWARD ring would be CLIPPED; the inset ring renders over the control's OWN bg-card row [text, neutral] → ring-ring; aria-expanded — accordion disclosure toggle). Confirm ring-ONLY (no competing scale) + ring-INSET (flush child of overflow-hidden card) + ring-ring + aria-expanded.

D) L119 "BROWSE HELP CENTER" card button (raw <button>, one-shot onClick={() => navigate("/support")}, VISIBLE text + an ExternalLink icon, base `flex items-center justify-between p-4 rounded-2xl bg-card border border-border/40 active:bg-muted/20 transition-colors` [ALREADY presses via active:bg-muted/20 + transition-colors], NO scale/focus/aria; this is a STANDALONE rounded-2xl card, a direct child of the px-4 page column on bg-background — NOT inside an overflow-hidden parent) → applied: APPENDED `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ONLY (ring-ONLY — DON'T add a competing scale, ALREADY presses via active:bg-muted/20; keep transition-colors, NO flip; OUTWARD ring-ring — a standalone card on the neutral page bg, the outward ring traces against bg-background [NOT inset — not inside an overflow-hidden parent]; NO aria — visible text "Browse Help Center"). Confirm ring-ONLY (no competing scale) + OUTWARD ring-ring (standalone card, NOT inset) + no-aria.

ALSO CONFIRM I should LEAVE: the shadcn Submit <Button> L113 (own focus/scale tokens); the raw <input> L109 + <textarea> L111 (ALREADY native focus:outline-none focus:ring-1 focus:ring-primary/40 — leave to avoid churn); the FAQ answer motion.div panels L96 (anim, NO onClick); AppLayout (wrapper, hideHeader); the section header <div>s + <span>s + <p>s (non-interactive); ArrowLeft/HelpCircle/Chevron/MessageSquare/Phone/Mail/ExternalLink icons (decorative).

Be concise and exact. Return the precise final className after-string per control + any aria attr. Flag any other in-scope raw interactive control I missed. Note especially: is aria-expanded correct on the FAQ toggle (vs aria-pressed)? And should the FAQ toggle ring be inset vs outward?
- files: src/pages/app/personal/PersonalHelpPage.tsx

---

**Plan:** Verify all 4 applied edits against the token vocabulary. No code changes needed — the file is already correct.

---

## Verification

### A) Header Back — ✅ CORRECT
```
w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
`aria-label="Go back"` kept. DON'T-CHURN ring-only: already `active:scale-90` + `transition-transform` → append ring, no renumber to 95, no flip. OUTWARD `ring-ring` on neutral `bg-background`.

### B) Quick-Contact tiles (×3) — ✅ CORRECT
```
flex flex-col items-center gap-2 rounded-2xl border border-border/40 bg-card py-4 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
No aria. DON'T-CHURN ring-only: already `active:scale-95` + `transition-transform`. OUTWARD `ring-ring` — the outward ring renders in the `gap-2` against neutral page `bg-background`.

### C) FAQ Accordion toggle (×7) — ✅ CORRECT
```
w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-muted/20 transition-colors focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
`aria-expanded={openFaq === i}` added. Ring-only: already presses via `active:bg-muted/20` → no competing scale. Keep `transition-colors`, no flip (ring adds no animated prop). `ring-inset` — correct: each toggle `<button>` is a direct child of the `<div>` wrapping row, which is inside the `rounded-2xl overflow-hidden` FAQ card — an outward ring would clip at the card's rounded corners. `ring-ring` on the neutral `bg-card` surface.

**`aria-expanded` is correct, not `aria-pressed`:** this is a disclosure/accordion (toggles visibility of a content panel below). `aria-expanded` semantically describes show/hide. `aria-pressed` would be for a persistent on/off state or segmented single-select — wrong here.

### D) Browse Help Center — ✅ CORRECT
```
flex items-center justify-between p-4 rounded-2xl bg-card border border-border/40 active:bg-muted/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
No aria (visible text). Ring-only: already presses via `active:bg-muted/20`. **OUTWARD**, not inset — this is a standalone `rounded-2xl` card sitting directly in the `px-4` page column on `bg-background`; it is NOT inside an `overflow-hidden` parent, so no clipping risk. `ring-ring` on neutral `bg-background`.

### Leave list — ✅ ALL CORRECT
- Shadcn `<Button>` L113 (own tokens) ✓
- Raw `<input>` L109 + `<textarea>` L111 (native `focus:ring-1 focus:ring-primary/40`) ✓
- `motion.div` FAQ panels (anim, no onClick) ✓
- `AppLayout` wrapper ✓
- All decorative icons, section headers, `<span>`s, `<p>`s ✓

### Missed controls — NONE
Scanned every element: 1 back button + 3 quick-contact buttons + 7 FAQ toggles + 1 shadcn Button + 1 input + 1 textarea + 1 Browse card = **all accounted for**. No other raw interactive controls exist.

---

**Verdict: All 4 edits are correct. Zero changes needed. File is ready to verify and commit.**

Run `npm run update` to confirm gate green, then hand the owner the deploy.
