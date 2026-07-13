# DeepSeek run — 2026-06-13T23:27:00.987Z

- model: deepseek-chat
- task: Premium interaction + responsive QA pass on ONE customer-facing page: src/pages/grocery/GroceryOrderPlaced.tsx (the LIVE /grocery/order-placed post-checkout confirmation page — shows a PartyPopper success burst, an Order-ID card with a copy button, an order-items preview strip, a delivery-address card, a 4-step "What's next" stepper, two ETA info cards, and an actions block). It uses framer-motion motion.div for ENTRANCE animations only. Its interactive controls are: (a) ONE raw <button> — the copy-order-ID button (onClick={copyOrderId}, className "flex items-center gap-1.5 mt-0.5 group", contains the truncated order-ID text + a <Copy> icon); (b) FOUR shadcn <Button> components in the actions block — "Track My Order" (text+icons), "Shop More" (icon+text), "Home" (icon+text), and a SHARE button that is ICON-ONLY (just <Share2 className="h-4 w-4" />, no text label, onClick opens openShareToChat).

Reference standard for interaction tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

HARD RULE: className and display-only attribute (aria-label) changes ONLY — do NOT change any supabase query/select/maybeSingle, the shopping_orders/grocery_orders fallback fetch, the openShareToChat({...}) payload, any navigate target (/grocery/track/${orderId}, /grocery, /), useState/useEffect/handlers, the copyOrderId clipboard logic, the STEPS array, the itemCount reduce, or the ETA text.

Identify genuine gaps ONLY:
(1) the raw copy-order-ID <button> — missing focus-visible keyboard ring + press feedback (active:scale) + transition. Note it has NO padding/rounded currently (gap-1.5 mt-0.5), so a ring would hug the text tightly — recommend whether to add rounded-md (and whether to add aria-label="Copy order ID", BUT NOTE the button's visible content is the order-ID value itself, so weigh whether an aria-label improves or clobbers the accessible name).
(2) icon-only controls without aria-label — the SHARE shadcn <Button> is icon-only (<Share2/> only) and has NO aria-label → screen reader announces just "button". shadcn Button ships interaction tokens but NOT a name for icon-only usage. This is the primary a11y gap. (The other 3 Buttons have visible text.)
(3) responsive crush/overflow at 375px — check the actions row "<div className='flex gap-2.5'>" holding Shop More (flex-1) + Home (flex-1) + the Share icon button (px-4) when an order is present; the page container is max-w-md mx-auto px-6. Does "Shop More" (icon + mr-1.5 + text) crush at ~125px available?
(4) fetched-but-unused data fields — the select cols are store, total_amount, items, delivery_address, customer_name. Check each against what is rendered. (My read: all five are rendered — store in the ID card + SEO + share, total_amount in the ID card + share, items in the preview strip + itemCount, delivery_address + customer_name in the address card. Confirm or refute.)
(5) contrast/legibility — note any text below readable size (there is text-[8px] on the item quantity and text-[9px] on ETA labels) but only flag if it's a genuine regression vs the design system, do NOT fix.

Do NOT touch the 3 shadcn <Button>s that already have visible text (Track My Order / Shop More / Home) beyond noting they're fine. Do NOT change the motion.div entrance props. Be concise; cite exact classNames not line numbers. Give me a tight punch list of the genuine className/aria edits with before→after for each.
- files: src/pages/grocery/GroceryOrderPlaced.tsx

---

# GroceryOrderPlaced.tsx — Premium Interaction + Responsive QA

## Plan

Apply the `JobPostingDetailPage` interaction token set to the **one raw `<button>`** (copy-order-ID) and fix the **icon-only a11y gap** on the Share button. No other changes needed — the 3 text-labeled shadcn Buttons already ship tokens, all 5 fetched fields are rendered, and the responsive layout holds at 375px.

## Proposed Changes

**File:** `src/pages/grocery/GroceryOrderPlaced.tsx`

### Edit 1: Raw copy-order-ID `<button>` — add interaction tokens + `rounded-md` + `aria-label`

**Before:**
```tsx
<button type="button" onClick={copyOrderId} className="flex items-center gap-1.5 mt-0.5 group">
```

**After:**
```tsx
<button type="button" onClick={copyOrderId} aria-label="Copy order ID" className="flex items-center gap-1.5 mt-0.5 group rounded-md transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
```

**Rationale:**
- `rounded-md` — gives the focus ring a visible boundary (without it, the ring would hug the text tightly with no padding, looking broken)
- `transition-all` — smooths the press scale + hover color transitions
- `active:scale-[0.97]` — press feedback (matches the back-link pattern used across all other pages)
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` — keyboard focus ring with offset so it doesn't clip against the text
- `aria-label="Copy order ID"` — **safe to add** because the button's visible text is a truncated uppercase ID (`ORDERID1`), not a human-readable label like "Copy order ID". The `aria-label` provides a proper accessible name without clobbering the visible text (screen readers announce the `aria-label` instead of the child text content when both are present, which is the correct behavior here since "ORDERID1" is meaningless out of context)

### Edit 2: Icon-only Share `<Button>` — add `aria-label`

**Before:**
```tsx
<Button variant="outline" onClick={() => openShareToChat({...})} className="rounded-2xl h-11 px-4">
  <Share2 className="h-4 w-4" />
</Button>
```

**After:**
```tsx
<Button variant="outline" onClick={() => openShareToChat({...})} aria-label="Share order" className="rounded-2xl h-11 px-4">
  <Share2 className="h-4 w-4" />
</Button>
```

**Rationale:** shadcn Button ships interaction tokens but provides **no accessible name** for icon-only usage. Without `aria-label`, a screen reader announces just "button". This is the primary a11y gap on the page.

## Responsive QA at 375px

The actions row `<div className="flex gap-2.5">` holds:
- `Shop More` (flex-1) — icon + `mr-1.5` + text "Shop More" ≈ ~80px at 375px
- `Home` (flex-1) — icon + `mr-1.5` + text "Home" ≈ ~60px at 375px
- Share icon button (`px-4`) — fixed ~48px

Available width at 375px: `375 - 48px (container px-6×2) - 10px (gap-2.5) = 317px`. Each flex-1 gets ~134px. **No crush** — both buttons have ample room. ✅

## Fetched-but-unused fields check

| Column | Rendered? |
|--------|-----------|
| `store` | ✅ ID card: `from {order.store}` |
| `total_amount` | ✅ ID card: `$X.XX` + share payload |
| `items` | ✅ Preview strip + `itemCount` |
| `delivery_address` | ✅ Address card |
| `customer_name` | ✅ Address card |

**All 5 fields are rendered.** No unused data. ✅

## Contrast/legibility note

- `text-[8px]` on item quantity — very small but matches the compact preview strip design; not a regression
- `text-[9px]` on ETA labels — small but readable in the card context; matches the design system's compact info-card pattern

Both are intentional design choices, not regressions. **Do not change.**

## Summary — exact diff

```diff
--- a/src/pages/grocery/GroceryOrderPlaced.tsx
+++ b/src/pages/grocery/GroceryOrderPlaced.tsx
@@ -82,7 +82,7 @@ export default function GroceryOrderPlaced() {
               <div>
                 <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Order ID</p>
-                <button type="button" onClick={copyOrderId} className="flex items-center gap-1.5 mt-0.5 group">
+                <button type="button" onClick={copyOrderId} aria-label="Copy order ID" className="flex items-center gap-1.5 mt-0.5 group rounded-md transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                   <p className="text-[14px] font-mono font-bold text-foreground">{orderId.slice(0, 8).toUpperCase()}</p>
                   <Copy className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                 </button>
@@ -166,7 +166,7 @@ export default function GroceryOrderPlaced() {
             {order && (
-              <Button variant="outline" onClick={() => openShareToChat({...})} className="rounded-2xl h-11 px-4">
+              <Button variant="outline" onClick={() => openShareToChat({...})} aria-label="Share order" className="rounded-2xl h-11 px-4">
                 <Share2 className="h-4 w-4" />
               </Button>
             )}
```

## Owner verification

1. Run `npm run update` — must pass (type-check + worker type-check + build)
2. Preview at `/grocery/order-placed?id=<valid-uuid>` on the dev server
3. Tab to the copy-order-ID button — confirm the focus ring appears with `ring-offset-2` spacing
4. Inspect the Share button in dev tools — confirm `aria-label="Share order"` is present in the DOM
5. Resize to 375px — confirm the actions row (Shop More / Home / Share) fits without wrapping or text truncation
