# MiMo run — 2026-06-13T22:04:39.207Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction and responsive QA pass on TWO customer-facing public storefronts: src/pages/StoreProfilePage.tsx and src/pages/GroceryStorePage.tsx. Reference standard for interaction tokens: src/pages/hubs/JobPostingDetailPage.tsx (uses transition-all active:scale-[0.97/0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring). HARD RULE: className and display-only attribute changes ONLY (e.g. adding aria-label). Do NOT change any supabase query, RPC, mutation, react-query key, state logic, routing, cart logic, or pricing math. Both pages currently have ZERO focus-visible rings. Identify genuine gaps ONLY: (1) raw <button>/<a> controls missing active:scale press feedback or focus-visible rings; (2) icon-only buttons without aria-label; (3) responsive crush or overflow at 375px width; (4) fetched-but-unused data fields; (5) contrast/legibility bugs. For each finding give the EXACT line number, which file, and exact before/after className. Be concise and flag only REAL gaps. IMPORTANT: shadcn <Button> components already ship built-in active:scale + focus-visible:ring — do NOT flag those, only raw <button>/<a> elements.
- files: src/pages/StoreProfilePage.tsx, src/pages/GroceryStorePage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

(no answer text — the run hit max_tokens; raise --max-tokens)

--- partial thinking ---
Let me analyze both files carefully for the specific gaps mentioned in the task:

1. Raw `<button>`/`<a>` controls missing `active:scale` press feedback or `focus-visible` rings
2. Icon-only buttons without `aria-label`
3. Responsive crush or overflow at 375px width
4. Fetched-but-unused data fields
5. Contrast/legibility bugs

I need to ignore shadcn `<Button>` components since they already have built-in tokens.

Let me go through each file systematically.

## StoreProfilePage.tsx

### Raw `<button>` and `<a>` controls:

1. **Line ~370 - Back button** (banner nav):
```jsx
<motion.button
  whileTap={{ scale: 0.85 }}
  onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/grocery")}
  aria-label="Go back"
  className="h-10 w-10 rounded-2xl bg-background/90 backdrop-blur-2xl flex items-center justify-center shadow-xl border border-border"
>
```
- Has `whileTap` but no `focus-visible` ring. Missing `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Has aria-label ✅

2. **Line ~383 - Chat button** (banner nav):
```jsx
<motion.button
  whileTap={{ scale: 0.85 }}
  onClick={() => setChatOpen(true)}
  aria-label={`Open chat with ${store.name}`}
  className="h-10 w-10 rounded-2xl bg-background/90 backdrop-blur-2xl flex items-center justify-center shadow-xl border border-border"
>
```
- Has `whileTap` but no `focus-visible` ring. Has aria-label ✅

3. **Line ~390 - Cart button** (banner nav):
```jsx
<motion.button
  whileTap={{ scale: 0.85 }}
  onClick={() => setShowCart(true)}
  className="relative h-10 w-10 rounded-2xl bg-background/90 backdrop-blur-2xl flex items-center justify-center shadow-xl border border-border"
>
```
- Has `whileTap` but no `focus-visible` ring. **Missing `aria-label`** for the cart button (icon-only).

4. **Line ~420 - Logo photo lightbox button**:
```jsx
<button
  type="button"
  onClick={() => openPhotoLightboxForSrc(safeLogoUrl)}
  className="group h-full w-full cursor-zoom-in"
  aria-label={`View ${store.name} photo full screen`}
>
```
- No `active:scale` or `focus-visible` ring. Has aria-label ✅

5. **Line ~490 - Ride There button**:
```jsx
<motion.button
  whileTap={{ scale: 0.97 }}
  onClick={() => { ... }}
  className="w-full h-12 rounded-full flex items-center justify-center gap-2 font-bold text-[15px] text-white shadow-lg"
>
```
- Has `whileTap` but no `focus-visible` ring.

6. **Line ~530 - Booking status locked button**:
```jsx
<button type="button"
  onClick={() => ...}
  className="w-full inline-flex items-center justify-center gap-2 px-4 h-11 rounded-full bg-emerald-500/[0.06] border border-emerald-400/40 text-emerald-600 dark:text-emerald-300 text-[14px] font-semibold hover:bg-emerald-500/[0.10] transition-colors whitespace-nowrap"
>
```
- No `active:scale`, no `focus-visible` ring.

7. **Line ~560 - SMS fallback link**:
```jsx
<motion.a
  whileTap={{ scale: 0.96 }}
  href={`sms:${tel}?body=${smsBody}`}
  className="h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border border-white/15 bg-white/[0.04] backdrop-blur-sm text-white hover:bg-white/[0.07] transition-colors"
>
```
- Has `whileTap` but no `focus-visible` ring.

8. **Line ~590 - Call link**:
```jsx
<motion.a
  whileTap={{ scale: callDisabled ? 1 : 0.96 }}
  href={callDisabled ? undefined : `tel:${tel}`}
  className={cn(
    "h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border bg-white/[0.04] backdrop-blur-sm transition-colors",
    ...
  )}
>
```
- Has `whileTap` but no `focus-visible` ring.

9. **Line ~620 - Chat button** (mobile contact):
```jsx
<motion.button
  whileTap={{ scale: chatDisabled ? 1 : 0.96 }}
  className={cn(
    "h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border bg-white/[0.04] backdrop-blur-sm transition-colors",
    ...
  )}
>
```
- Has `whileTap` but no `focus-visible` ring.

10. **Line ~645 - Share button** (mobile contact):
```jsx
<motion.button
  whileTap={{ scale: 0.96 }}
  className="h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border border-white/15 bg-white/[0.04] backdrop-blur-sm text-white hover:bg-white/[0.07] transition-colors"
>
```
- Has `whileTap` but no `focus-visible` ring.

11. **Social links** (~line 690):
```jsx
<a
  key={s.label}
  href={s.url}
  target="_blank"
  rel="noopener noreferrer"
  aria-label={s.label}
  className="h-9 w-9 rounded-full flex items-center justify-center border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] transition-colors"
>
```
- No `active:scale`, no `focus-visible` ring. Has aria-label ✅

12. **Category tab buttons** (~line 770):
```jsx
<motion.button
  whileTap={{ scale: 0.88, rotateX: 8 }}
  whileHover={{ y: -2, scale: 1.03 }}
  onClick={() => setSelectedCategory(undefined)}
  className={cn(
    "relative px-5 py-2.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap shrink-0 transition-all duration-200",
    "border backdrop-blur-sm",
    ...
  )}
>
```
- Has `whileTap` but no `focus-visible` ring. These are repeated for each category.

13. **Auto-repair "Book" button** (~line 840):
```jsx
<motion.button
  whileTap={{ scale: 0.92 }}
  onClick={() => { navigate(`/book/${slug}?service=${encodeURIComponent(service.name)}`); }}
  className="px-3 py-1.5 rounded-lg bg-ig-gradient text-white text-[11px] font-bold shadow-sm"
>
```
- Has `whileTap` but no `focus-visible` ring.

Now let me look at the GroceryStorePage.tsx:

### GroceryStorePage.tsx

1. **Back button** (~line 28):
```jsx
<motion.button
  whileTap={{ scale: 0.9 }}
  onClick={() => navigate("/grocery")}
  className="p-2 rounded-2xl hover:bg-muted/60 transition-colors duration-200"
  aria-label="Back to stores"
>
```
- Has `whileTap` but no `focus-visible` ring. Has aria-label ✅

2. **Cart button** (~line 58):
```jsx
<motion.button
  whileTap={{ scale: 0.9 }}
  onClick={(e) => { ... }}
  className="relative p-3 -mr-1 rounded-2xl bg-muted/30 hover:bg-muted/50 active:bg-muted/70 transition-colors duration-200 min-w-[48px] min-h-[48px] flex items-center justify-center z-40 touch-manipulation cursor-pointer"
  aria-label="Shopping cart"
>
```
- Has `whileTap` but no `focus-visible` ring. Has aria-label ✅

3. **Quick filter chips** (~line 100):
```jsx
<motion.button
  key={f.label}
  whileTap={{ scale: 0.93 }}
  onClick={() => handleQuickFilter(f)}
  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all duration-200 ...`}
>
```
- Has `whileTap` but no `focus-visible` ring. These are repeated for each quick filter.

4. **Back to categories button** (~line 130):
```jsx
<motion.button
  initial={{ opacity: 0, x: -8 }}
  animate={{ opacity: 1, x: 0 }}
  whileTap={{ scale: 0.97 }}
  onClick={() => { ... }}
  className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline"
>
```
- Has `whileTap` but no `focus-visible` ring.

5. **Cart "Clear" button** (~line 150):
```jsx
<button type="button" onClick={cart.clearCart} className="text-[11px] text-destructive hover:underline font-medium">Clear</button>
```
- No `active:scale`, no `focus-visible` ring.

6. **Cart close button** (~line 155):
```jsx
<motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowCart(false)} className="p-1 rounded-lg hover:bg-muted/60 transition-colors">
```
- Has `whileTap` but no `focus-visible` ring. **Missing `aria-label`** (icon-only `ChevronUp`).

7. **SwipeableCartItem** quantity buttons (~line 120 area in the component):
```jsx
<motion.button whileTap={{ scale: 0.8 }} onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)} className="p-1.5 rounded-lg hover:bg-muted active:scale-95 transition-all"><Minus className="h-3 w-3" /></motion.button>
...
<motion.button whileTap={{ scale: 0.8 }} onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)} className="p-1.5 rounded-lg hover:bg-muted active:scale-95 transition-all"><Plus className="h-3 w-3" /></motion.button>
```
- Has `whileTap` but no `focus-visible` ring. **Missing `aria-label`** (icon-only).

8. **FeaturedProductRow** "add" button (~line 200):
```jsx
<motion.button
  whileTap={{ scale: 0.8 }}
  onClick={() => onAdd(p)}
  className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all duration-200 ...`}
>
```
- Has `whileTap` but no `focus-visible` ring. **Missing `aria-label`** (icon-only `Plus` or quantity number).

9. **Sort mode button** (~line 250):
```jsx
<motion.button
  whileTap={{ scale: 0.9 }}
  onClick={cycleSortMode}
  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/30 border border-border/20 hover:bg-muted/50 transition-colors"
>
```
- Has `whileTap` but no `focus-visible` ring.

10. **Floating cart bar button** (~line 310):
```jsx
<motion.button
  whileTap={{ scale: 0.97 }}
  onClick={() => setShowCart(true)}
  className="w-full flex items-center justify-between gap-3 p-3.5 pl-4 rounded-2xl bg-ig-gradient text-white shadow-2xl shadow-primary/30 border border-primary/20"
>
```
- Has `whileTap` but no `focus-visible` ring.

Now, let me identify the **most impactful and clear** fixes. The task says to be concise and flag only REAL gaps. Let me prioritize:

**StoreProfilePage.tsx gaps:**

1. Banner nav buttons (back, chat, cart) - missing `focus-visible` ring
2. Cart button missing `aria-label`
3. Logo lightbox button - missing `active:scale` + `focus-visible` ring
4. Ride There button - missing `focus-visible` ring
5. Booking locked button - missing `active:scale` + `focus-visible` ring
6. Mobile contact tiles (SMS, Call, Chat, Share) - missing `focus-visible` ring
7. Social links - missing `active:scale` + `focus-visible` ring
8. Category tabs - missing `focus-visible` ring
9. Auto-repair Book button - missing `focus-visible` ring

**GroceryStorePage.tsx gaps:**

1. Back button - missing `focus-visible` ring
2. Cart button - missing `focus-visible` ring
3. Quick filter chips - missing `focus-visible` ring
4. Back to categories - missing `focus-visible` ring
5. Cart "Clear" button - missing `active:scale` + `focus-visible` ring
6. Cart close button - missing `aria-label` + `focus-visible` ring
7. SwipeableCartItem +/- buttons - missing `aria-label` + `focus-visible` ring
8. FeaturedProductRow add button - missing `aria-label` + `focus-visible` ring
9. Sort mode button - missing `focus-visible` ring
10. Floating cart bar button - missing `focus-visible` ring

Now I also need to check for responsive crush issues. Let me think...

For **StoreProfilePage.tsx**:
- The category pills have `overflow-x-auto no-scrollbar` which is fine
- The auto-repair service list seems fine at 375px (flex gap-3 p-3 with a 16px image + flex-1 text + shrink-0 price/button)
- The social links row `flex items-center justify-center gap-2` with `h-9 w-9` items — fine at 375px
- The secondary contact row `grid grid-cols-3 gap-2` with `h-14` items — fine at 375px

For **GroceryStorePage.tsx**:
- The product grid `grid grid-cols-3 sm:grid-cols-4 gap-2` — at 375px, 3 columns with 2.5px padding each side. That's (375 - 5 - 4) / 3 ≈ 122px per card. Should be fine.
- The featured row is horizontal scroll — fine.
- Quick filters are horizontal scroll — fine.

No clear responsive crush issues I can identify with certainty.

**Fetched-but-unused data fields?** I'd need to look at the Supabase queries more carefully. The file is truncated so I can't see all the data usage. Let me focus on what I can see.

Actually, the task says "Be concise and flag only REAL gaps" so let me focus on the most impactful ones. The consistent pattern across both files is: **every raw `<button>`/`<a>` is missing `focus-visible` rings**. Many also lack `active:scale` on controls that don't use `whileTap`.

Let me now construct the actual proposed diffs. I'll organize by file, showing the exact line range and before/after.

Actually, since the files are very long and I need to provide exact line numbers, let me re-read them more carefully and count lines.

Let me reconsider the approach. Given the massive number of controls, I should organize this as a systematic set of className-only edits. Let me group by pattern:

### Pattern 1: `motion.button` with `whileTap` but no `focus-visible` ring
Add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to className.

### Pattern 2: Raw `<button>` with neither `active:scale` nor `focus-visible` ring  
Add `active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

### Pattern 3: `<a>` with neither `active:scale` nor `focus-visible` ring
Add `active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

### Pattern 4: Icon-only buttons missing `aria-label`
Add `aria-label="..."` attribute.

Let me now construct the precise diffs. I'll use the code as provided (though it's truncated for StoreProfilePage). Since I can't see the exact line numbers (the file starts with a BOM and the code was provided for context, not with line numbers), I'll identify controls by their surrounding code context.

Let me be very precise about each change. I'll organize by file.

---

OK, let me now write up the plan and proposed changes. Given the volume, I'll be systematic.

For StoreProfilePage.tsx, the file was truncated, but I can work with the visible portions. Let me focus on what's visible.

Actually, I realize the file is quite long and was truncated. Let me work with the provided portions only, and flag that the truncation means I can't audit the product grid section. But the task specifically says to audit both files.

Let me re-examine what's in the truncated part. The file cuts off at:
```
      {/* ── Products Grid - 3D Holographic Cards (Grocery) ── */}
      <div className="px-3 pt-1 pb-
```

So I can't see the products grid section. I should note this caveat.

Let me now write my response. I'll be thorough but concise.

Actually, for the response format, the task says:
> (1) a short plan, (2) the proposed change as a diff or clear before/after with exact file paths, (3) anything the owner must verify or deploy.

Let me draft this now.

One more thing - I need to double-check: the task says "shadcn <Button> components already ship built-in active:scale + focus-visible:ring — do NOT flag those". Let me identify all `<Button>` usages:

StoreProfilePage:
- "Back to Grocery" Button (not-found state) — shadcn, skip
- "Book a Service" Button (auto-repair) — shadcn, skip
- "Check room status" Button — shadcn, skip
- "Get directions" Button — shadcn, skip

GroceryStorePage:
- "Back to stores" Button (not-found state) — shadcn, skip
- "Place Order" Button (cart) — shadcn, skip

Good, those are all shadcn and I'll skip them.

Now let me also check for the `GroceryFilters` component's `GroceryFilterButton` - that's a separate component, so I'll skip it.

The `GroceryProductCard` component receives props and renders its own buttons - that's a separate component, skip.

The `GroceryCategoryBrowser`, `GroceryDealsSection`, etc. - separate components, skip.

OK, I think I have a comprehensive analysis. Let me write it up.

Let me count the total edits:

**StoreProfilePage.tsx**: ~13 className edits + 1 aria-label addition (cart button)
**GroceryStorePage.tsx**: ~10 className edits + 4 aria-label additions (cart close, +/- buttons, featured add button)

That's a lot. Let me present it clearly.

Wait, I should double check some of these. The `whileTap` on `motion.button` provides momentary press feedback (scale down while pressed), which is equivalent to `active:scale`. So for `motion.button` elements with `whileTap`, I should only add `focus-visible` ring, not `active:scale`.

For raw `<button>` elements (not `motion.button`), I need to add both `active:scale` and `focus-visible` ring.

Let me also think about which `active:scale` values to use:
- Card-sized buttons (contact tiles): `active:scale-[0.97]` (reference standard)
- Small icon buttons: `active:scale-[0.95]`  
- Large primary buttons: `active:scale-[0.98]`
- Chips: `active:scale-[0.97]`

Actually, looking at the reference (`JobPostingDetailPage`), it uses `active:scale-[0.99]` for the close/reopen button and `active:scale-[0.98]` for the apply button. So the range is `0.97-0.99` for raw buttons.

For consistency with the other public storefronts (salon, cafe), I'll use:
- Regular buttons: `active:scale-[0.98] transition-all`
- Chips: `active:scale-[0.97] transition-all`
- Icon-only small: `active:scale-[0.95] transition-transform`

Now let me write the final response.

Actually wait - for the contact tile buttons in StoreProfilePage (SMS, Call, Chat, Share), these are `motion.button`/`motion.a` with `whileTap={{ scale: 0.96 }}`. The `whileTap` already provides press feedback, so I only need to add `focus-visible` rings. But the `whileTap` on `motion.a` elements works differently from `active:scale` - it uses framer-motion's animation, so it should still work. I'll just add focus-visible rings to these.

Let me also reconsider the logo lightbox `<button>` - it has no `whileTap` and no `active:scale`. I should add `active:scale-[0.98] transition-all` + `focus-visible` ring. But wait, it's a `cursor-zoom-in` button - the scale feedback might be odd. Actually, image lightbox triggers typically do have subtle press feedback. I'll add a mild `active:scale-[0.98]`.

OK, let me finalize and write the response now. I'll organize it as a table-like structure with file, line reference, and exact before/after.

Given the volume, I think a structured diff-style format would be clearest. Let me group the changes.

Let me re-examine the code one more time to make sure I'm not missing anything...

For the "Ride There" button, it already has `whileTap={{ scale: 0.97 }}`, so just needs `focus-visible` ring.

For the booking status locked `<button>`, it has no `whileTap` or `active:scale`, so needs both.

For the "All" category tab and individual category tabs, they have `whileTap={{ scale: 0.88, rotateX: 8 }}`, so just need `focus-visible` ring.

For the auto-repair "Book" button, it has `whileTap={{ scale: 0.92 }}`, so just needs `focus-visible` ring.

OK now let me also check the GroceryStorePage more carefully for the truncated StoreProfilePage's products grid...

Actually, I can't see the products grid since the file is truncated. I'll note this as a caveat.

Let me write the response now. I'll be organized and precise.

One more important check: the task says to look for "fetched-but-unused data fields." Let me think about what data is fetched in each file.

**StoreProfilePage**: 
- `useStoreProfile(slug)` → `store` - heavily used
- `useStoreProducts(store?.id, selectedCategory)` → `products` - used
- `useStoreProductCategories(store?.id)` → `categories` - used
- `useLodgeRooms(isLodging ? store!.id : "")` → `allRooms` → filtered to `rooms` - used
- `useLodgePropertyProfile(isLodging ? store!.id : "")` → `propertyProfile` - used
- `useHasStoreBooking(store?.id)` → `bookingCheck` → `hasBooking` - used

Without seeing the full store profile type, I can't easily identify fetched-but-unused fields. The store object might have more fields than what's rendered. But I'd need the hook definition to confirm. Since I can only see the provided code, I'll skip this for now.

**GroceryStorePage**: 
- `useStoreSearch(storeName)` → `products, isLoading, isLoadingMore, hasMore, error, search, loadMore, clearResults` - all used
- `useGroceryCart()` → `cart` - used
- `getStoreBySlug(slug)` → `storeCfg` - used

This page doesn't fetch raw Supabase data directly, so fewer opportunities for unused fields.

OK, I think I'm ready to write the response. Let me structure it clearly.

Hmm, actually, one more thing. For the GroceryStorePage's `FeaturedProductRow`, the inner div that wraps the image area has `onClick={() => onAdd(p)}` on a `<div>`, not a `<button>`. This is an accessibility issue (non-interactive element used as a button). But the task says "className and display-only attribute changes ONLY" - so I can add `role="button"` and `tabIndex={0}` as display-only attributes, plus `aria-label`. But adding `role` and `tabIndex` could be considered behavior changes... Actually, the task says "e.g. adding aria-label" so display-only attributes are fine. Let me flag it but note it's borderline.

Actually, let me not flag that. The task is very specific about what to flag, and clicking a div to add to cart is a pre-existing pattern. Let me stick to the 5 categories.

Let me finalize my response now. I'll aim for conciseness while being thorough.

Actually, I want to make sure I have a handle on the exact className changes. Let me write them out precisely.

For the StoreProfilePage banner buttons, the current className for all three is:
```
"h-10 w-10 rounded-2xl bg-background/90 backdrop-blur-2xl flex items-center justify-center shadow-xl border border-border"
```

Adding focus-visible:
```
"h-10 w-10 rounded-2xl bg-background/90 backdrop-blur-2xl flex items-center justify-center shadow-xl border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

For the logo button:
```
"group h-full w-full cursor-zoom-in"
```
→
```
"group h-full w-full cursor-zoom-in active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

For the Ride There button:
```
"w-full h-12 rounded-full flex items-center justify-center gap-2 font-bold text-[15px] text-white shadow-lg"
```
→
```
"w-full h-12 rounded-full flex items-center justify-center gap-2 font-bold text-[15px] text-white shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```
Wait, for white buttons on colored background, the ring-offset might help visibility. But the reference standard just uses `focus-visible:ring-ring`. Let me keep it consistent.

Actually, the Ride There button is white text on a green gradient. The `ring-ring` color (which is the theme's ring color) should be visible enough. Let me use the standard pattern.

For the booking locked button:
```
"w-full inline-flex items-center justify-center gap-2 px-4 h-11 rounded-full bg-emerald-500/[0.06] border border-emerald-400/40 text-emerald-600 dark:text-emerald-300 text-[14px] font-semibold hover:bg-emerald-500/[0.10] transition-colors whitespace-nowrap"
```
→
```
"w-full inline-flex items-center justify-center gap-2 px-4 h-11 rounded-full bg-emerald-500/[0.06] border border-emerald-400/40 text-emerald-600 dark:text-emerald-300 text-[14px] font-semibold hover:bg-emerald-500/[0.10] transition-colors whitespace-nowrap active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

For the contact tiles (motion.a and motion.button with h-14), they already have `whileTap={{ scale: 0.96 }}`, just need `focus-visible`:
Current:
```
"h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border border-white/15 bg-white/[0.04] backdrop-blur-sm text-white hover:bg-white/[0.07] transition-colors"
```
→
```
"h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border border-white/15 bg-white/[0.04] backdrop-blur-sm text-white hover:bg-white/[0.07] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

For the social links:
```
"h-9 w-9 rounded-full flex items-center justify-center border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] transition-colors"
```
→
```
"h-9 w-9 rounded-full flex items-center justify-center border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] transition-colors active:scale-[0.95] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
Wait, I have `transition-colors` already. Adding `transition-transform` would conflict. Better to change to `transition-all`:
```
"h-9 w-9 rounded-full flex items-center justify-center border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] active:scale-[0.95] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

For category tabs - the className is dynamic (selected vs not). I need to add focus-visible to both variants. The base className is:
```
"relative px-5 py-2.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap shrink-0 transition-all duration-200 border backdrop-blur-sm"
```
Plus the conditional part. I'll add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the base part.

For the auto-repair Book button:
```
"px-3 py-1.5 rounded-lg bg-ig-gradient text-white text-[11px] font-bold shadow-sm"
```
→
```
"px-3 py-1.5 rounded-lg bg-ig-gradient text-white text-[11px] font-bold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

OK for GroceryStorePage, let me do the same:

Back button:
```
"p-2 rounded-2xl hover:bg-muted/60 transition-colors duration-200"
```
→
```
"p-2 rounded-2xl hover:bg-muted/60 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

Cart button:
```
"relative p-3 -mr-1 rounded-2xl bg-muted/30 hover:bg-muted/50 active:bg-muted/70 transition-colors duration-200 min-w-[48px] min-h-[48px] flex items-center justify-center z-40 touch-manipulation cursor-pointer"
```
→
```
"relative p-3 -mr-1 rounded-2xl bg-muted/30 hover:bg-muted/50 active:bg-muted/70 transition-colors duration-200 min-w-[48px] min-h-[48px] flex items-center justify-center z-40 touch-manipulation cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

Quick filter chips (dynamic className):
Active: `"bg-ig-gradient text-white shadow-sm shadow-primary/25"`
Inactive: `"bg-muted/30 text-muted-foreground hover:bg-muted/60 border border-border/20"`
Common: `"flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all duration-200"`

Add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the common part.

Back to categories:
```
"flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline"
```
→
```
"flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
```
(Adding `rounded` so the ring has a nice shape)

Cart "Clear" button:
```
"text-[11px] text-destructive hover:underline font-medium"
```
→
```
"text-[11px] text-destructive hover:underline font-medium active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
```

Cart close button:
```
"p-1 rounded-lg hover:bg-muted/60 transition-colors"
```
→
```
"p-1 rounded-lg hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
+ add `aria-label="Close cart"`

SwipeableCartItem +/- buttons:
```
"p-1.5 rounded-lg hover:bg-muted active:scale-95 transition-all"
```
→
```
"p-1.5 rounded-lg hover:bg-muted active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
+ add `aria-label="Decrease quantity"` and `aria-label="Increase quantity"`

FeaturedProductRow add button:
```
`h-8 w-8 rounded-xl flex items-center justify-center transition-all duration-200 ${inCart ? "bg-ig-gradient text-white shadow-md shadow-primary/30" : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/15"}`
```
→ add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to both branches
+ add `aria-label={inCart ? `Increase ${p.name} quantity` : `Add ${p.name} to cart`}`

Sort mode button:
```
"flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/30 border border-border/20 hover:bg-muted/50 transition-colors"
```
→
```
"flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/30 border border-border/20 hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

Floating cart bar button:
```
"w-full flex items-center justify-between gap-3 p-3.5 pl-4 rounded-2xl bg-ig-gradient text-white shadow-2xl shadow-primary/30 border border-primary/20"
```
→
```
"w-full flex items-center justify-between gap-3 p-3.5 pl-4 rounded-2xl bg-ig-gradient text-white shadow-2xl shadow-primary/30 border border-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```
Actually, for dark gradient buttons, `ring-offset-2` with a light offset background might help visibility. But let me stay consistent with the reference standard (no offset). I'll skip the offset.

OK,
