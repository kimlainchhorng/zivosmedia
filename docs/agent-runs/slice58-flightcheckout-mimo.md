# MiMo run — 2026-06-14T05:17:24.101Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: SLICE 58 — src/pages/FlightCheckout.tsx (single page, 451 lines, Stripe-embedded flight checkout). PREMIUM responsive interaction-token + a11y polish. CLASSNAME-ONLY + display-only aria attrs (aria-label/aria-pressed/aria-expanded only). NO logic, NO handlers, NO state, NO routing, NO Stripe/supabase changes.

Apply the project's standing interaction-token rules to RAW <button>/<a>/<Link> only:
- active:scale-[X] press feedback (tiers: icon-only scale-95; small/pill chips & segmented [0.97]; cards [0.98]; full-width/wide-rows [0.99]).
- transition-all when control ALSO has a real hover:bg-*/hover:text-*/hover:border-*/hover:opacity COLOR fade; transition-transform for pure press-scale with no hover color. Flip transition-colors→transition-all when adding a scale alongside a color hover.
- focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (OUTWARD ring-ring; ring-inset ONLY if flush inside a SEPARATE overflow-hidden rounded ancestor).
- aria: icon-only no-text+no-label button -> ADD aria-label. aria-pressed ONLY for segmented selection. Do NOT add aria-expanded to dialog/sheet openers.

SKIP (ship tokens / native / not mine): all shadcn <Button> (the "Back" ghost icon Button L202 [aria-label="Back", ships tokens]; the desktop "Continue to Payment" Button L376 [ships tokens + ALREADY wrapped in a motion.div whileTap={{scale:0.97}}]; the mobile sticky "Continue" Button L420 [ships tokens]); all child components (Header/Footer, CheckoutOrderSummary, FlightPriceBreakdown, AcceptedPaymentMethods, CheckoutTermsAcceptance, CheckoutTrustFooter, InlineLegalSheet, FlightInlinePaymentForm); presentational step-dots/notice divs/motion.divs without onClick.

The ONLY RAW <button> controls under review — 5 IDENTICAL inline legal-link buttons (L334/338/342/346/350):
- Each: className="text-primary hover:underline", onClick={() => openSheet("<Title>", FLIGHT_LEGAL_LINKS.<key>)} which opens an InlineLegalSheet (a sheet/dialog).
- Distinct VISIBLE TEXT per button: "Flight Terms" / "Partner Disclosure" / "Terms of Service" / "Privacy Policy" / "Refund Policy".
- They sit INLINE in a `flex items-center gap-3 text-[11px] flex-wrap` row, separated by "·" dot spans, inside a notices card section (px-4 py-3). They are LINK-STYLED text buttons (text-primary + hover:underline), NOT buttons with a bg/border/padding surface. NO transition, NO scale, NO ring currently; they retain the NATIVE focus outline (no focus:outline-none present).

KEY QUESTIONS — resolve explicitly:
(Q1) Do inline TEXT-LINK buttons (text-primary hover:underline, no bg/border/padding surface) get an active:scale press? My lean = NO — scaling inline text in a wrapping row looks wrong and there is no tactile surface; press-scale is for surface controls (buttons/cards/chips), not inline links. Confirm NO scale (and therefore NO transition class needed, since there's no scale and `hover:underline` is not a color/transform fade).
(Q2) The FOCUS RING: should we ADD `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to these link-buttons, and if so should we also add `rounded-sm` so the ring has rounded corners around the inline text (currently no border-radius → the ring would be a sharp rectangle)? OR leave the NATIVE focus outline intact (the "native-focus precedent" — these never stripped outline)? My lean = ADD outward `ring-ring` + `rounded-sm` (they're clearly link-STYLED interactive controls, a tokenized ring matches the rest of the app and rounded-sm tidies the corners) — but confirm vs just leaving native focus. If you'd ADD a ring, also confirm whether to keep `hover:underline` (yes) and whether any transition class is warranted (lean: none).
(Q3) aria: distinct visible text per button → NO aria-label. These open an InlineLegalSheet (a sheet/dialog) → NO aria-expanded (dialog-opener rule). Confirm.

All 5 are byte-identical className so the fix is a single replace_all. Confirm the EXACT final className string. Match the parity reference JobPostingDetailPage.tsx conventions for inline text-link buttons if any exist there. Reply concise.
- files: src/pages/FlightCheckout.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

**5 identical inline text-link buttons** — the only RAW `<button>` controls in this file. Resolve Q1–Q3, apply a single replace_all, done.

### Q1: No scale (confirmed)

These are inline text-link buttons at `text-[11px]` in a wrapping `flex gap-3 flex-wrap` row with "·" separators — no bg/border/padding surface. Press-scale is for surface controls; scaling inline text in a wrapping row causes visual displacement. **No `active:scale`, therefore no `transition` class** (`hover:underline` is a text-decoration, not a color/transform fade).

### Q2: Add outward ring + `rounded-sm` (confirmed)

They are clearly interactive (open an InlineLegalSheet). The project tokenizes focus on every interactive control. Native outline (a blue/black rectangle) clashes with the `ring-ring` pattern used across 50+ slices. Add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm` — the `rounded-sm` gives the ring tidy rounded corners around the tiny text. No transition needed.

### Q3: No aria changes (confirmed)

- Distinct visible text per button → NO `aria-label`.
- Opens a sheet/dialog → NO `aria-expanded` (dialog-opener rule).
- Not a segmented selection → NO `aria-pressed`.

---

## Diff

**File:** `src/pages/FlightCheckout.tsx`

All 5 buttons share the identical className. Single replace_all:

```
- className="text-primary hover:underline"
+ className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
```

That's it. 5 className edits, 0 logic, 0 new attrs, 0 new imports.

---

## Verify

- `npm run update` must pass (type-check + worker type-check + production build — 0 errors).
- No Stripe/supabase/handler/state/routing changes — purely visual focus tokens.
- The diff is guard-clean: exactly 5 identical `−`/`+` className swaps, all `onClick`/`openSheet`/`FLIGHT_LEGAL_LINKS` references preserved byte-for-byte.
