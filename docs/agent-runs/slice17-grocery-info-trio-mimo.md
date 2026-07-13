# MiMo run — 2026-06-13T23:55:48.584Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + responsive QA pass on THREE customer-facing static grocery info/legal pages (one combined slice — they share a near-identical shell):
- src/pages/grocery/GroceryFees.tsx (187 lines, /grocery/fees — Instacart-style transparent pricing: fee-breakdown cards, example-order table, price-promises grid, cancellation-fee table)
- src/pages/grocery/GroceryReturns.tsx (157 lines, /grocery/returns — returns & refund policy: freshness-guarantee hero, 4-step how-to grid, refund-eligibility table, non-refundable list, processing + abuse cards)
- src/pages/grocery/GroceryTerms.tsx (146 lines, /grocery/terms — terms of service: intro card, 11 policy section cards with whitespace-pre-line content)

These PREDATE the interaction-token standard. Reference standard: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

CRITICAL edit-shape rule (applies throughout):
- framer-motion motion.button with whileTap={{scale:...}} → CSS active:scale is DEAD (motion's inline transform overrides) → add focus-visible ring ONLY (box-shadow is safe on motion), plus aria-label if icon-only. Do NOT add active:scale.
- RAW controls incl. react-router <Link> (renders as <a>) → CSS active:scale WORKS → full token set (transition-all + active:scale-[tier] + focus-visible ring + aria-label only if icon-only). Visible-text links → NO aria-label.
- Header is sticky bg-background/80 backdrop-blur, NOT overflow-hidden → normal outward ring (no ring-inset).

HARD RULE: className + display-only attribute (aria-label) changes ONLY. Do NOT touch any onClick/navigate(-1)/the <Link> to= targets/the FEE_BREAKDOWN/PRICE_PROMISES/CANCEL_FEES/REFUND_TABLE/STEPS/sections content arrays/the groceryPricing config imports (formatFee/calcMarkup/calcServiceFee/DELIVERY_*/SERVICE_FEE_*/MARKUP_THRESHOLD)/the example-total math/useNavigate.

THE CONTROL INVENTORY (confirm exhaustive; give before→after className/attr for each):

GroceryFees.tsx — 1 control:
1. Header back motion.button: `<motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="p-2 rounded-2xl hover:bg-muted/60"><ArrowLeft className="h-5 w-5" /></motion.button>`. whileTap present + icon-only → add aria-label="Go back" + focus-visible ring ONLY. (Note: className currently has NO transition — should we leave it, or is adding transition-colors for the hover:bg-muted/60 in scope? Advise: I lean LEAVE it — the ring is instant/a11y-correct and a hover-bg transition is a visual change beyond a token pass.)

GroceryReturns.tsx — 3 controls:
1. Same header back motion.button (byte-identical) → aria-label="Go back" + ring ONLY.
2 & 3. Two footer "See also" <Link>s, both className="text-primary/60 underline": `<Link to="/grocery/terms" ...>Terms of Service</Link>` and `<Link to="/grocery/fees" ...>Pricing & Fees</Link>`. Visible-text raw links → small-text-link tier: append `rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. (replace_all on `className="text-primary/60 underline"` covers both.)

GroceryTerms.tsx — 7 controls:
1. Same header back motion.button → aria-label="Go back" + ring ONLY.
2 & 3. Two INTRO <Link>s, both className="text-primary underline": `<Link to="/legal/privacy">Privacy Policy</Link>` + `<Link to="/grocery/fees">Pricing & Fees</Link>` → small-text-link tokens (replace_all on `className="text-primary underline"`).
4-7. Four FOOTER <Link>s, all className="text-primary/60 underline": General Terms (/legal/terms), Privacy Policy (/legal/privacy), Pricing & Fees (/grocery/fees), Returns Policy (/grocery/returns) → small-text-link tokens (replace_all on `className="text-primary/60 underline"`).

OPEN QUESTION to resolve: the small "See also" footer links are tiny (text-[9px], text-primary/60). Are they in-scope for the interaction-token pass (genuine react-router nav controls with a real keyboard-focus-ring gap) or scope creep (decorative micro-links)? I lean IN SCOPE — they are real navigational <a>s and currently have zero focus-visible ring, which is the same a11y gap we fix everywhere. Advise.

ALSO CHECK:
(A) Responsive at 375px — GroceryFees: the price-promises `grid grid-cols-2 gap-2.5` + the cancellation-fee table `grid grid-cols-2`; the fee-card amount (text-[16px] font-extrabold, e.g. "From $3.99"/"3-5%") next to the label block. GroceryReturns: the refund-eligibility table `grid grid-cols-3` (Issue/Resolution/Report-Within) with text-[11px] cells — any crush at 3 columns on 375px? GroceryTerms: section cards with `whitespace-pre-line` bullet content. Any overflow?
(B) The `support@zivosmedia.com` contact line is a plain <span className="text-primary font-semibold"> on all 3 pages (NOT a mailto: link). Flag only — converting to a mailto is a behavior/content change out of scope for a className pass; just confirm it's intentional-looking and note it.
(C) contrast — text-[9px] footer "See also" links at text-primary/60 + text-muted-foreground/50: genuine regression vs design system, or consistent micro-footer styling? Flag only.

Be concise; cite exact classNames not line numbers. For each control give before→after. Resolve the open questions (back-button transition; footer-link in-scope).
- files: src/pages/grocery/GroceryFees.tsx, src/pages/grocery/GroceryReturns.tsx, src/pages/grocery/GroceryTerms.tsx

---

## Plan

Combined slice for 3 static grocery info/legal pages. **11 controls total, 11 edits**, all className + display-only-attribute. Two `replace_all` operations per file where applicable.

**Control inventory confirmed exhaustive** — every page has a single `<motion.button>` back arrow (ring-only) and 0–6 `<Link>`s (small-text-link tokens). No raw `<button>`s, no shadcn `<Button>`s, no interactive elements beyond these.

**Open questions resolved:**
- **Back-button transition → LEAVE it.** Adding `transition-colors` for `hover:bg-muted/60` is a visual change beyond a token pass. The ring appears instantly on keyboard focus — a11y-correct as-is.
- **Footer `text-[9px]` links → IN SCOPE.** They are real react-router navigational `<a>`s with a genuine keyboard-focus-ring gap. A keyboard user has zero indication of focus. The standard fixes exactly this.

---

## Proposed Diffs

### `src/pages/grocery/GroceryFees.tsx` — 1 control, 1 edit

**Control 1:** Header back `motion.button` (whileTap → ring ONLY + `aria-label`)

```
BEFORE:
<motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="p-2 rounded-2xl hover:bg-muted/60"><ArrowLeft className="h-5 w-5" /></motion.button>

AFTER:
<motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} aria-label="Go back" className="p-2 rounded-2xl hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="h-5 w-5" /></motion.button>
```

### `src/pages/grocery/GroceryReturns.tsx` — 3 controls, 3 edits

**Control 1:** Header back `motion.button` (byte-identical to GroceryFees)

```
BEFORE:
<motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="p-2 rounded-2xl hover:bg-muted/60"><ArrowLeft className="h-5 w-5" /></motion.button>

AFTER:
<motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} aria-label="Go back" className="p-2 rounded-2xl hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="h-5 w-5" /></motion.button>
```

**Controls 2 & 3:** Footer `<Link>`s — **replace_all** on `className="text-primary/60 underline"` (affects exactly 2 occurrences: "Terms of Service" + "Pricing & Fees")

```
BEFORE:
className="text-primary/60 underline"

AFTER:
className="text-primary/60 underline rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### `src/pages/grocery/GroceryTerms.tsx` — 7 controls, 7 edits

**Control 1:** Header back `motion.button` (byte-identical)

```
BEFORE:
<motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="p-2 rounded-2xl hover:bg-muted/60"><ArrowLeft className="h-5 w-5" /></motion.button>

AFTER:
<motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} aria-label="Go back" className="p-2 rounded-2xl hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="h-5 w-5" /></motion.button>
```

**Controls 2 & 3:** Intro `<Link>`s — **replace_all** on `className="text-primary underline"` (affects exactly 2 occurrences: "Privacy Policy" + "Pricing & Fees" in the intro card)

```
BEFORE:
className="text-primary underline"

AFTER:
className="text-primary underline rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Controls 4–7:** Footer `<Link>`s — **replace_all** on `className="text-primary/60 underline"` (affects exactly 4 occurrences: "General Terms" + "Privacy Policy" + "Pricing & Fees" + "Returns Policy")

```
BEFORE:
className="text-primary/60 underline"

AFTER:
className="text-primary/60 underline rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

## Edit Summary

| File | Edits | Mechanism |
|------|-------|-----------|
| GroceryFees.tsx | 1 | 1 motion.line swap |
| GroceryReturns.tsx | 3 | 1 motion.line swap + 1 replace_all (2 hits) |
| GroceryTerms.tsx | 7 | 1 motion.line swap + 2 replace_alls (2+4 hits) |
| **Total** | **11 controls** | **11 edits (5 source-level changes)** |

Expected git diff: GroceryFees **1 ins / 1 del**, GroceryReturns **2 ins / 2 del**, GroceryTerms **3 ins / 3 del** = **6 ins / 6 del total**.

---

## Checks

**(A) Responsive at 375px:**
- **GroceryFees** price-promises `grid grid-cols-2 gap-2.5`: each column ~166px with `p-3.5`; titles are 1–3 words at 12px. Holds. Cancellation table `grid grid-cols-2`: "Items purchased & en-route" at 12px is the longest, ~160px. Fits within ~166px/col with px-4. Fee-card amount ("From $3.99" / "3–5%" / "Optional") at 16px font-extrabold next to icon+label block — all short bounded strings in a `justify-between` flex. No crush.
- **GroceryReturns** refund-eligibility `grid grid-cols-3`: ~114px/col at 375px with px-4. Longest issue "Poor quality produce/meat" at 11px ≈ 135px — will **wrap to 2 lines** at natural word boundaries. Acceptable; grid cells grow in height. No horizontal overflow. Steps grid is `sm:grid-cols-2` → single column at 375px. Clean.
- **GroceryTerms** section cards: `whitespace-pre-line` bullet content at 12px in `px-4`. Plain text with natural word-wrap, no long URLs or unbreakable tokens. No overflow.

**(B) `support@zivosmedia.com`** — plain `<span className="text-primary font-semibold">`, NOT a `mailto:` link. Appears identical on all 3 pages. Looks intentional. **Flag only: owner may want to convert to `<a href="mailto:support@zivosmedia.com">` for convenience, but that's a behavior/content change out of scope for this className pass.**

**(C) Contrast — `text-[9px] text-primary/60` and `text-muted-foreground/50`** on footer "See also" links. Below WCAG AA for normal text (needs 4.5:1 at this size). However, this is **consistent micro-footer styling** — deliberately de-emphasized secondary nav. **Flag only: owner could bump to `text-primary/70` + `text-muted-foreground/60` for AA compliance, but this is an aesthetic/a11y decision beyond the token pass.**

---

## Owner Verification

1. Apply the 5 source-level changes (3 motion.button lines + 2 replace_all operations).
2. Run `npm run update` — must pass with 0 errors.
3. Preview at `/grocery/fees`, `/grocery/returns`, `/grocery/terms` — tab through all controls to verify focus rings appear; click the footer links to verify press scale animates smoothly.
4. Commit when satisfied.
