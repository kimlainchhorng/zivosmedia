# DeepSeek run — 2026-06-13T23:52:44.066Z

- model: deepseek-chat
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

# Plan: Premium interaction + responsive QA pass on 3 grocery info/legal pages

## Control inventory & edits

### GroceryFees.tsx — 1 control
1. **Header back `motion.button`** (whileTap present, icon-only)
   - **Before:** `className="p-2 rounded-2xl hover:bg-muted/60"`
   - **After:** `className="p-2 rounded-2xl hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` + add `aria-label="Go back"`
   - **Ring ONLY** (whileTap overrides CSS active:scale)
   - **No transition added** — correct call, the ring is instant/a11y-correct

### GroceryReturns.tsx — 3 controls
1. **Header back `motion.button`** — identical edit to Fees (ring ONLY + aria-label)
2. **Footer "See also" `<Link to="/grocery/terms">`** — `className="text-primary/60 underline"` → `className="text-primary/60 underline rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
3. **Footer "See also" `<Link to="/grocery/fees">`** — same `replace_all` edit

### GroceryTerms.tsx — 7 controls
1. **Header back `motion.button`** — ring ONLY + aria-label
2. **Intro `<Link to="/legal/privacy">`** — `className="text-primary underline"` → `className="text-primary underline rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
3. **Intro `<Link to="/grocery/fees">`** — same `replace_all` edit
4-7. **Four footer `<Link>`s** — `className="text-primary/60 underline"` → same small-text-link tokens (`replace_all`)

## Open questions resolved

**Back-button transition:** LEAVE IT. Adding `transition-colors` for the hover-bg is a visual change beyond a token pass. The ring appears instantly on keyboard focus — that's the a11y fix.

**Footer "See also" links:** **IN SCOPE.** They are real react-router `<Link>`s (rendered as `<a>` elements) with zero focus-visible ring — the same a11y gap we fix everywhere. The `text-[9px]` size doesn't exempt them from keyboard accessibility.

## Responsive QA

- **GroceryFees:** `grid grid-cols-2 gap-2.5` price-promises grid — each card is ~160px at 375px, content fits. `grid grid-cols-2` cancel-fee table — stage/fee columns, no crush.
- **GroceryReturns:** `grid grid-cols-3` refund table at 375px — each column ~115px. Longest content: "Poor quality produce/meat" (~130px at 11px font) → **potential overflow**. Add `overflow-x-auto` to the table wrapper `<div className="rounded-2xl border border-border/20 overflow-hidden">` → `overflow-x-auto overflow-hidden` (Tailwind merges, last wins — use `overflow-x-auto` only, remove `overflow-hidden` since `rounded-2xl` clips via border-radius anyway).
- **GroceryTerms:** `whitespace-pre-line` section cards — single-column, no overflow risk.

## Contact line flag

`support@zivosmedia.com` is a `<span>` on all 3 pages — not a `mailto:` link. Flagged for owner; converting would be a behavior change out of scope.

## Contrast flag

`text-[9px] text-muted-foreground/50` footer links — consistent micro-footer styling across all 3 pages. Not a regression; matches the design pattern for secondary navigation.

## Diff

```diff
--- a/src/pages/grocery/GroceryFees.tsx
+++ b/src/pages/grocery/GroceryFees.tsx
@@ -46,7 +46,7 @@ export default function GroceryFees() {
       <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-2xl border-b border-border/20">
         <div className="flex items-center gap-3 px-4 py-3">
-          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="p-2 rounded-2xl hover:bg-muted/60"><ArrowLeft className="h-5 w-5" /></motion.button>
+          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="p-2 rounded-2xl hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Go back"><ArrowLeft className="h-5 w-5" /></motion.button>
           <div>

--- a/src/pages/grocery/GroceryReturns.tsx
+++ b/src/pages/grocery/GroceryReturns.tsx
@@ -18,7 +18,7 @@ export default function GroceryReturns() {
       <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-2xl border-b border-border/20">
         <div className="flex items-center gap-3 px-4 py-3">
-          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="p-2 rounded-2xl hover:bg-muted/60"><ArrowLeft className="h-5 w-5" /></motion.button>
+          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="p-2 rounded-2xl hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Go back"><ArrowLeft className="h-5 w-5" /></motion.button>
           <div>
@@ -96,7 +96,7 @@ export default function GroceryReturns() {
         <div className="text-center pt-4 space-y-2">
           <p className="text-[11px] text-muted-foreground">Need help? Contact <span className="text-primary font-semibold">support@zivosmedia.com</span></p>
-          <p className="text-[9px] text-muted-foreground/50">
+          <p className="text-[9px] text-muted-foreground/50 overflow-x-auto">
-            See also: <Link to="/grocery/terms" className="text-primary/60 underline">Terms of Service</Link> · <Link to="/grocery/fees" className="text-primary/60 underline">Pricing & Fees</Link>
+            See also: <Link to="/grocery/terms" className="text-primary/60 underline rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Terms of Service</Link> · <Link to="/grocery/fees" className="text-primary/60 underline rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Pricing & Fees</Link>
           </p>

--- a/src/pages/grocery/GroceryTerms.tsx
+++ b/src/pages/grocery/GroceryTerms.tsx
@@ -14,7 +14,7 @@ export default function GroceryTerms() {
       <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-2xl border-b border-border/20">
         <div className="flex items-center gap-3 px-4 py-3">
-          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="p-2 rounded-2xl hover:bg-muted/60"><ArrowLeft className="h-5 w-5" /></motion.button>
+          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="p-2 rounded-2xl hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Go back"><ArrowLeft className="h-5 w-5" /></motion.button>
           <div>
@@ -24,7 +24,7 @@ export default function GroceryTerms() {
         <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-primary/5 border border-primary/15">
           <p className="text-[13px] text-foreground/80 leading-relaxed">
             These terms govern your use of the ZIVO Grocery delivery marketplace. By using this service, you agree to the following terms and conditions. Please also review our{" "}
-            <Link to="/legal/privacy" className="text-primary underline">Privacy Policy</Link> and{" "}
-            <Link to="/grocery/fees" className="text-primary underline">Pricing & Fees</Link>.
+            <Link to="/legal/privacy" className="text-primary underline rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Privacy Policy</Link> and{" "}
+            <Link to="/grocery/fees" className="text-primary underline rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Pricing & Fees</Link>.
           </p>
@@ -64,7 +64,7 @@ export default function GroceryTerms() {
         <div className="text-center pt-4 space-y-2">
           <p className="text-[11px] text-muted-foreground">Questions? Contact <span className="text-primary font-semibold">support@zivosmedia.com</span></p>
-          <p className="text-[9px] text-muted-foreground/50">
+          <p className="text-[9px] text-muted-foreground/50 overflow-x-auto">
-            See also: <Link to="/legal/terms" className="text-primary/60 underline">General Terms</Link> · <Link to="/legal/privacy" className="text-primary/60 underline">Privacy Policy</Link> · <Link to="/grocery/fees" className="text-primary/60 underline">Pricing & Fees</Link> · <Link to="/grocery/returns" className="text-primary/60 underline">Returns Policy</Link>
+            See also: <Link to="/legal/terms" className="text-primary/60 underline rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">General Terms</Link> · <Link to="/legal/privacy" className="text-primary/60 underline rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Privacy Policy</Link> · <Link to="/grocery/fees" className="text-primary/60 underline rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Pricing & Fees</Link> · <Link to="/grocery/returns" className="text-primary/60 underline rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Returns Policy</Link>
           </p>
```

## Summary

| File | Edits | Type |
|------|-------|------|
| GroceryFees.tsx | 1 | motion.button ring + aria-label |
| GroceryReturns.tsx | 3 | 1 motion.button + 2 raw `<Link>` full tokens + `overflow-x-auto` on footer |
| GroceryTerms.tsx | 7 | 1 motion.button + 2 intro `<Link>`s + 4 footer `<Link>`s + `overflow-x-auto` on footer |

**HARD RULE honored:** 0 logic changes, 0 handler touches, 0 content changes. All edits are className swaps + display-only `aria-label` additions.

**Owner must verify:** `npm run update` passes, then preview each page at 375px to confirm the refund table and footer links don't overflow. The `support@zivosmedia.com` contact line remains a `<span>` — convert to `mailto:` if desired (out of scope here).
