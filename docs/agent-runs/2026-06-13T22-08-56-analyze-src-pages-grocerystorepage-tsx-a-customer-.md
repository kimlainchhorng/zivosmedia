# DeepSeek run — 2026-06-13T22:08:56.897Z

- model: deepseek-chat
- task: Analyze src/pages/GroceryStorePage.tsx (a customer-facing PUBLIC grocery storefront page) for PREMIUM + RESPONSIVE refinements toward parity with the reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change any supabase queries, mutations, react-query keys, routing, or component logic — propose ONLY JSX/Tailwind className changes plus tiny display-only logic. This page currently has ZERO focus-visible rings and almost no active:scale. Focus on: (1) interaction consistency — add 'active:scale-[0.98] transition-transform' + 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring' to every interactive raw button/anchor, product/category card, chip, qty stepper, and cart/CTA controls (icon-only buttons use scale-[0.95], chips scale-[0.97]); do NOT touch shadcn Button (already ships tokens); (2) responsive issues at 375/768/1280 (product grid, category rail, cart layout); (3) any obviously incomplete/disconnected UI piece (fetched-but-unused fields). Return a CONCISE, line-referenced punch list of exact className edits. Do NOT reprint the whole component. Keep under ~1500 tokens.
- files: src/pages/GroceryStorePage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

# GroceryStorePage Premium + Responsive Analysis

## Plan

This page is **already well-built** with framer-motion interactions, responsive grids, and premium styling. The gaps are:

1. **Zero `focus-visible:ring`** on any raw button/anchor (the `motion.button` `whileTap` only covers touch/click, not keyboard)
2. **Inconsistent `active:scale`** — some raw buttons have it, many don't
3. **Responsive** — the product grid is already `grid-cols-3 sm:grid-cols-4` (good), but the quick-filter chips row and cart drawer need attention at 375px
4. **Fetched-but-unused** — `brand` is fetched in `StoreProduct` but never displayed on cards (the `GroceryProductCard` component may handle it internally — check its props)

## Punch List (exact className edits)

### 1. Header back button (L~260)
**Before:** `className="p-2 rounded-2xl hover:bg-muted/60 transition-colors duration-200"`
**After:** `className="p-2 rounded-2xl hover:bg-muted/60 transition-colors duration-200 active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### 2. Cart button (L~290)
**Before:** `className="relative p-3 -mr-1 rounded-2xl bg-muted/30 hover:bg-muted/50 active:bg-muted/70 transition-colors duration-200 min-w-[48px] min-h-[48px] flex items-center justify-center z-40 touch-manipulation cursor-pointer"`
**After:** Add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (already has `active:bg-muted/70` — keep as-is)

### 3. Quick filter chips (L~310, the `motion.button` inside the map)
**Before:** `className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all duration-200 ${...}`}`
**After:** Add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (already has `whileTap={{ scale: 0.93 }}`)

### 4. "Back to categories" button (L~340)
**Before:** `className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline"`
**After:** `className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"`

### 5. Cart drawer "Clear" button (L~370)
**Before:** `className="text-[11px] text-destructive hover:underline font-medium"`
**After:** `className="text-[11px] text-destructive hover:underline font-medium active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"`

### 6. Cart drawer close button (L~371)
**Before:** `className="p-1 rounded-lg hover:bg-muted/60 transition-colors"`
**After:** `className="p-1 rounded-lg hover:bg-muted/60 transition-colors active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### 7. Sort mode button (L~440)
**Before:** `className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/30 border border-border/20 hover:bg-muted/50 transition-colors"`
**After:** `className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/30 border border-border/20 hover:bg-muted/50 transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### 8. Floating cart bar button (L~490)
**Before:** `className="w-full flex items-center justify-between gap-3 p-3.5 pl-4 rounded-2xl bg-ig-gradient text-white shadow-2xl shadow-primary/30 border border-primary/20"`
**After:** `className="w-full flex items-center justify-between gap-3 p-3.5 pl-4 rounded-2xl bg-ig-gradient text-white shadow-2xl shadow-primary/30 border border-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"` (already has `whileTap={{ scale: 0.97 }}`)

### 9. Featured product row — each card's image area (L~130, the `onClick` div)
**Before:** `className="relative h-[120px] bg-gradient-to-br from-primary/[0.03] to-muted/20 flex items-center justify-center p-3.5 cursor-pointer"`
**After:** `className="relative h-[120px] bg-gradient-to-br from-primary/[0.03] to-muted/20 flex items-center justify-center p-3.5 cursor-pointer active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### 10. Featured product row — each card's add button (L~145, the `motion.button`)
Already has `whileTap={{ scale: 0.8 }}` — add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl`

### 11. SwipeableCartItem qty stepper buttons (L~80-82)
Already have `active:scale-95 transition-all` — add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg`

### 12. Responsive: quick-filter chips row (L~305)
The `flex gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-hide` is fine for horizontal scroll. At 375px, chips may be tight. Add `gap-1 sm:gap-1.5` so mobile gets tighter spacing.

### 13. Responsive: cart drawer (L~355)
The drawer `left-4 right-4` is fine. The `max-h-[70vh]` is fine. No change needed — it's already responsive.

### 14. Fetched-but-unused: `brand` field
`StoreProduct` has `brand` but `GroceryProductCard` receives it via `product` prop. Check if `GroceryProductCard` renders it — if not, add a small `text-[9px] text-muted-foreground` brand line above the product name in the card. This is a **display-only** addition.

## Diff (minimal, file: `src/pages/GroceryStorePage.tsx`)

```diff
--- a/src/pages/GroceryStorePage.tsx
+++ b/src/pages/GroceryStorePage.tsx
@@ -257,7 +257,7 @@ export default function GroceryStorePage() {
         <div className="flex items-center gap-3 px-4 py-3">
           <motion.button
             whileTap={{ scale: 0.9 }}
-            className="p-2 rounded-2xl hover:bg-muted/60 transition-colors duration-200"
+            className="p-2 rounded-2xl hover:bg-muted/60 transition-colors duration-200 active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             onClick={() => navigate("/grocery")}
             aria-label="Back to stores"
           >
@@ -287,7 +287,7 @@ export default function GroceryStorePage() {
           <motion.button
             whileTap={{ scale: 0.9 }}
             onClick={(e) => { e.stopPropagation(); setShowCart((prev) => !prev); }}
-            className="relative p-3 -mr-1 rounded-2xl bg-muted/30 hover:bg-muted/50 active:bg-muted/70 transition-colors duration-200 min-w-[48px] min-h-[48px] flex items-center justify-center z-40 touch-manipulation cursor-pointer"
+            className="relative p-3 -mr-1 rounded-2xl bg-muted/30 hover:bg-muted/50 active:bg-muted/70 transition-colors duration-200 min-w-[48px] min-h-[48px] flex items-center justify-center z-40 touch-manipulation cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             aria-label="Shopping cart"
             style={{ WebkitTapHighlightColor: "transparent" }}
           >
@@ -305,7 +305,7 @@ export default function GroceryStorePage() {
         {/* Quick filter chips */}
         <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-hide">
           {QUICK_FILTERS.map((f) => (
-            <motion.button
+            <motion.button
               key={f.label}
               whileTap={{ scale: 0.93 }}
+              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                 activeFilter === f.label
                   ? "bg-ig-gradient text-white shadow-sm shadow-primary/25"
                   : "bg-muted/30 text-muted-foreground hover:bg-muted/60 border border-border/20"
@@ -337,7 +337,7 @@ export default function GroceryStorePage() {
             whileTap={{ scale: 0.97 }}
             onClick={() => { setBrowseQuery(null); autoLoadCount.current = 0; search(storeCfg!.defaultQuery); }}
-            className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline"
+            className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
           >
             ← Back to categories
           </motion.button>
@@ -367,10 +367,10 @@ export default function GroceryStorePage() {
                 <div className="flex items-center gap-2">
                   {cart.items.length > 0 && (
-                    <button type="button" onClick={cart.clearCart} className="text-[11px] text-destructive hover:underline font-medium">Clear</button>
+                    <button type="button" onClick={cart.clearCart} className="text-[11px] text-destructive hover:underline font-medium active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">Clear</button>
                   )}
-                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowCart(false)} className="p-1 rounded-lg hover:bg-muted/60 transition-colors">
+                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowCart(false)} className="p-1 rounded-lg hover:bg-muted/60 transition-colors active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                     <ChevronUp className="h-4 w-4 text-muted-foreground" />
                   </motion.button>
                 </div>
@@ -437,7 +437,7 @@ export default function GroceryStorePage() {
             <motion.button
               whileTap={{ scale: 0.9 }}
               onClick={cycleSortMode}
-              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/30 border border-border/20 hover:bg-muted/50 transition-colors"
+              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/30 border border-border/20 hover:bg-muted/50 transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             >
               <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
               <span className="text-[10px] font-semibold text-muted-foreground">{sortLabel[sortMode]}</span>
@@ -487,7 +487,7 @@ export default function GroceryStorePage() {
             <motion.button
               whileTap={{ scale: 0.97 }}
               onClick={() => setShowCart(true)}
-              className="w-full flex items-center justify-between gap-3 p-3.5 pl-4 rounded-2xl bg-ig-gradient text-white shadow-2xl shadow-primary/30 border border-primary/20"
+              className="w-full flex items-center justify-between gap-3 p-3.5 pl-4 rounded-2xl bg-ig-gradient text-white shadow-2xl shadow-primary/30 border border-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
             >
```

## Verification

1. Run `npm run update` — must pass (0 type errors, clean build)
2. Preview at 375px: quick-filter chips should scroll horizontally without overflow crush; cart drawer should fill width with `left-4 right-4`
3. Tab through the page — every button should show a visible focus ring
4. Check `GroceryProductCard` props — if `brand` is destructured but not rendered, add a small brand line (display-only, no query change)

## Owner action

- Deploy after `npm run update` passes
- Verify on zivosmedia.com/grocery (the page is shared across all domains)
