# DeepSeek run — 2026-06-14T08:24:21.768Z

- model: deepseek-chat
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

## Review of PersonalHelpPage.tsx — All 4 edits CORRECT

### Edit-by-edit confirmation

**A) L55 Header Back** — ✅ **CORRECT**
- DON'T-CHURN ring-only: `active:scale-90` + `transition-transform` preserved
- OUTWARD `ring-ring` on neutral `bg-background` parent ✓
- `aria-label="Go back"` kept ✓
- Final className: `w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

**B) L70 Quick-contact tiles** — ✅ **CORRECT**
- DON'T-CHURN ring-only: `active:scale-95` + `transition-transform` preserved
- OUTWARD `ring-ring` (tiles have `bg-card` but gap renders against neutral page bg) ✓
- No aria (visible text labels) ✓
- Final className: `flex flex-col items-center gap-2 rounded-2xl border border-border/40 bg-card py-4 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

**C) L89 FAQ accordion toggle** — ✅ **CORRECT**
- Ring-ONLY (no competing scale — already `active:bg-muted/20` + `transition-colors`) ✓
- **`ring-inset`** — CORRECT: flush child of `rounded-2xl overflow-hidden` card ✓
- `ring-ring` (inset over neutral `bg-card` row, not image-dominant) ✓
- **`aria-expanded`** — CORRECT: disclosure accordion toggle (not a persistent single-select filter → NOT `aria-pressed`) ✓
- Final className: `w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-muted/20 transition-colors focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

**D) L119 "Browse Help Center" card** — ✅ **CORRECT**
- Ring-ONLY (no competing scale — already `active:bg-muted/20` + `transition-colors`) ✓
- **OUTWARD** `ring-ring` — CORRECT: standalone card, NOT inside overflow-hidden parent ✓
- No aria (visible text) ✓
- Final className: `flex items-center justify-between p-4 rounded-2xl bg-card border border-border/40 active:bg-muted/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

### Items to LEAVE (confirmed correct)
- ✅ shadcn `<Button>` L113 — own tokens
- ✅ raw `<input>` L109 + `<textarea>` L111 — already have `focus:ring-1 focus:ring-primary/40`
- ✅ FAQ answer `motion.div` L96 — anim only, no onClick
- ✅ `AppLayout`, section headers, icons — non-interactive

### No missed raw interactive controls
File has exactly **4 raw `<button>`s** (header back ×1, quick-contact ×3 mapped, FAQ toggle ×7 mapped, browse card ×1) — all covered. No other raw interactive elements.

### Diff (ready to apply)

**File:** `src/pages/app/personal/PersonalHelpPage.tsx`

**Line 55** — Header Back (already applied in your snippet, verify):
```diff
- className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform"
+ className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Line 70** — Quick-contact tiles (already applied, verify):
```diff
- className="flex flex-col items-center gap-2 rounded-2xl border border-border/40 bg-card py-4 active:scale-95 transition-transform"
+ className="flex flex-col items-center gap-2 rounded-2xl border border-border/40 bg-card py-4 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Line 89** — FAQ toggle (already applied, verify):
```diff
- className="w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-muted/20 transition-colors"
+ aria-expanded={openFaq === i}
+ className="w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-muted/20 transition-colors focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Line 119** — Browse Help Center (already applied, verify):
```diff
- className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/40 active:bg-muted/20 transition-colors"
+ className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/40 active:bg-muted/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### Owner verification
- Run `npm run update` — must pass (type-check + worker + build)
- Preview at 375/768/1280 — confirm no layout shift from the ring additions
- The FAQ accordion `aria-expanded` is correct — no change needed
