# DeepSeek run — 2026-06-13T21:13:15.858Z

- model: deepseek-chat
- task: Analyze the ListingDetail bottom-sheet component (function ListingDetail, ~lines 2080-3175) in src/pages/MarketplacePage.tsx for PREMIUM + RESPONSIVE refinements toward parity with the reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change any supabase queries, mutations, react-query keys, routing, or component logic — propose ONLY JSX/Tailwind className changes. The component is already mature (image carousel+lightbox, gradient price, trust-score seller card, offers, Q&A, reviews, similar items, sticky bottom CTA, offer/report modals). Focus on: (1) button consistency — several interactive buttons lack 'active:scale-[0.98] transition-transform' and 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring' that the sticky CTA and modals already have, e.g. the inline Message/Make Offer/Report (~2662-2687), the top fav/share (~2477-2489), owner Edit/Bump/Promote/Delete (~2722-2761), tag chips (~2525), seller card (~2545), similar-item cards (~2905); (2) any real responsive issue at 375/768/1280. Return a CONCISE, line-referenced punch list of exact className edits. Do NOT reprint the whole component. Keep under ~1500 tokens.
- files: src/pages/MarketplacePage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Analysis: ListingDetail bottom-sheet (MarketplacePage.tsx ~L2080-3175)

### Plan
Apply the same button-interaction patterns from `JobPostingDetailPage.tsx` (`.active:scale-[0.98]`, `.transition-all`, `.focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`) to the ListingDetail component's interactive elements. No logic/supabase/routing changes.

### Punch list of exact className edits

**1. Top fav/share buttons (~L2477-2489)**
```diff
- className="p-2 rounded-full hover:bg-muted/50"
+ className="p-2 rounded-full hover:bg-muted/50 active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
(Apply to both Heart and Share2 buttons)

**2. Tag chips (~L2525)**
```diff
- className="px-3 py-1 rounded-full bg-muted/40 text-xs font-medium"
+ className="px-3 py-1 rounded-full bg-muted/40 text-xs font-medium active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**3. Seller card (~L2545)**
```diff
- className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/30 cursor-pointer hover:bg-muted/30"
+ className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/30 cursor-pointer hover:bg-muted/30 active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**4. Inline Message/Make Offer/Report buttons (~L2662-2687)**
```diff
- className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-muted/40 hover:bg-muted/60"
+ className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-muted/40 hover:bg-muted/60 active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
(Apply to Message and Report buttons; Make Offer already has `active:scale-[0.98]`)

**5. Owner Edit/Bump/Promote/Delete buttons (~L2722-2761)**
```diff
- className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-muted/40 hover:bg-muted/60"
+ className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-muted/40 hover:bg-muted/60 active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
(Apply to Edit, Bump, Promote; Delete already has `active:scale-[0.98]`)

**6. Similar-item cards (~L2905)**
```diff
- className="group shrink-0 w-36 rounded-2xl overflow-hidden bg-card border border-border/30 text-left hover:shadow-md transition-all"
+ className="group shrink-0 w-36 rounded-2xl overflow-hidden bg-card border border-border/30 text-left hover:shadow-md transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### Responsive check
- **375px**: The bottom-sheet content uses `px-4` padding and `flex-wrap` for meta rows — wraps cleanly. No responsive issues found.
- **768px/1280px**: Already responsive via container max-width. No changes needed.

### Verification
- Run `npm run update` after applying these className-only edits
- Preview the listing detail at 375px to confirm buttons have proper touch targets and focus rings

### Owner action
- Deploy after verification — these are visual-only polish changes, no risk to data or routing
