# DeepSeek run — 2026-06-13T22:08:29.973Z

- model: deepseek-chat
- task: Analyze src/pages/StoreProfilePage.tsx (a customer-facing PUBLIC store profile/storefront page) for PREMIUM + RESPONSIVE refinements toward parity with the reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change any supabase queries, mutations, react-query keys, routing, or component logic — propose ONLY JSX/Tailwind className changes plus tiny display-only logic. This page currently has ZERO focus-visible rings and almost no active:scale. Focus on: (1) interaction consistency — add 'active:scale-[0.98] transition-transform' + 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring' to every interactive raw button/anchor, card, chip, tab, and CTA (icon-only buttons use scale-[0.95], chips scale-[0.97]); do NOT touch shadcn Button (already ships tokens); (2) responsive issues at 375/768/1280 (grids, tabs, header/hero, summary layouts); (3) any obviously incomplete/disconnected UI piece (fetched-but-unused fields). Return a CONCISE, line-referenced punch list of exact className edits. Do NOT reprint the whole component. Keep under ~1500 tokens.
- files: src/pages/StoreProfilePage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Analysis: `StoreProfilePage.tsx` Premium + Responsive Refinements

### Short Plan

This is a large, complex page (~900+ lines) with multiple surfaces: store info card, gallery carousel, category tabs, lodging rooms, auto-repair services, grocery products grid, and a desktop right rail. It already has some `whileTap` framer-motion press feedback but **zero** `focus-visible` rings and almost no `active:scale` on raw controls. The page is already responsive at 375/768/1280 (grids use `sm:`, `lg:`, `xl:` breakpoints). Key gaps:

1. **No focus-visible rings** on any raw `<button>`, `<a>`, or clickable `<div>` — critical for keyboard accessibility
2. **Inconsistent press feedback** — some use `whileTap={{ scale: 0.85 }}` (too aggressive), most have none
3. **Fetched-but-unused fields**: `store.rating` is displayed but `review_count` is fetched and unused; `store.delivery_min` badge is present but `store.delivery_fee`/`store.min_order` are fetched and unused
4. **Category tabs** use `whileTap={{ scale: 0.88, rotateX: 8 }}` — inconsistent with reference pattern

### Exact Line-Referenced Edits

**File: `src/pages/StoreProfilePage.tsx`**

#### 1. Back button (L~310) — add focus ring, normalize scale
```diff
- whileTap={{ scale: 0.85 }}
+ whileTap={{ scale: 0.95 }}
+ className="h-10 w-10 rounded-2xl bg-background/90 backdrop-blur-2xl flex items-center justify-center shadow-xl border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

#### 2. Chat icon button (L~316) — same treatment
```diff
- whileTap={{ scale: 0.85 }}
+ whileTap={{ scale: 0.95 }}
+ className="h-10 w-10 rounded-2xl bg-background/90 backdrop-blur-2xl flex items-center justify-center shadow-xl border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

#### 3. Cart icon button (L~322) — same treatment
```diff
- whileTap={{ scale: 0.85 }}
+ whileTap={{ scale: 0.95 }}
+ className="relative h-10 w-10 rounded-2xl bg-background/90 backdrop-blur-2xl flex items-center justify-center shadow-xl border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

#### 4. Logo zoom button (L~390) — add focus ring
```diff
- className="group h-full w-full cursor-zoom-in"
+ className="group h-full w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
```

#### 5. "Ride There" button (L~440) — add focus ring
```diff
- className="w-full h-12 rounded-full flex items-center justify-center gap-2 font-bold text-[15px] text-white shadow-lg"
+ className="w-full h-12 rounded-full flex items-center justify-center gap-2 font-bold text-[15px] text-white shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

#### 6. Booking status "locked" button (L~476) — add focus ring
```diff
- className="w-full inline-flex items-center justify-center gap-2 px-4 h-11 rounded-full bg-emerald-500/[0.06] border border-emerald-400/40 text-emerald-600 dark:text-emerald-300 text-[14px] font-semibold hover:bg-emerald-500/[0.10] transition-colors whitespace-nowrap"
+ className="w-full inline-flex items-center justify-center gap-2 px-4 h-11 rounded-full bg-emerald-500/[0.06] border border-emerald-400/40 text-emerald-600 dark:text-emerald-300 text-[14px] font-semibold hover:bg-emerald-500/[0.10] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

#### 7. Call/SMS anchor (L~490) — add focus ring
```diff
- className="h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border border-white/15 bg-white/[0.04] backdrop-blur-sm text-white hover:bg-white/[0.07] transition-colors"
+ className="h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border border-white/15 bg-white/[0.04] backdrop-blur-sm text-white hover:bg-white/[0.07] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

#### 8. Call anchor (L~510) — add focus ring
```diff
- className={cn("h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border bg-white/[0.04] backdrop-blur-sm transition-colors", callDisabled ? "border-white/10 text-white/35 cursor-not-allowed" : "border-white/15 text-white hover:bg-white/[0.07]")}
+ className={cn("h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border bg-white/[0.04] backdrop-blur-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", callDisabled ? "border-white/10 text-white/35 cursor-not-allowed" : "border-white/15 text-white hover:bg-white/[0.07]")}
```

#### 9. Chat button (L~527) — add focus ring
```diff
- className={cn("h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border bg-white/[0.04] backdrop-blur-sm transition-colors", chatDisabled ? "border-white/10 text-white/35 cursor-not-allowed" : "border-white/15 text-white hover:bg-white/[0.07]")}
+ className={cn("h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border bg-white/[0.04] backdrop-blur-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", chatDisabled ? "border-white/10 text-white/35 cursor-not-allowed" : "border-white/15 text-white hover:bg-white/[0.07]")}
```

#### 10. Share button (L~570) — add focus ring
```diff
- className="h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border border-white/15 bg-white/[0.04] backdrop-blur-sm text-white hover:bg-white/[0.07] transition-colors"
+ className="h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border border-white/15 bg-white/[0.04] backdrop-blur-sm text-white hover:bg-white/[0.07] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

#### 11. Social link anchors (L~595) — add focus ring
```diff
- className="h-9 w-9 rounded-full flex items-center justify-center border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] transition-colors"
+ className="h-9 w-9 rounded-full flex items-center justify-center border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

#### 12. Category "All" button (L~660) — normalize scale, add focus ring
```diff
- whileTap={{ scale: 0.88, rotateX: 8 }}
+ whileTap={{ scale: 0.97 }}
- className={cn("relative px-5 py-2.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap shrink-0 transition-all duration-200", "border backdrop-blur-sm", ...)}
+ className={cn("relative px-5 py-2.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap shrink-0 transition-all duration-200", "border backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", ...)}
```

#### 13. Category mapped buttons (L~680) — same treatment
```diff
- whileTap={{ scale: 0.88, rotateX: 8 }}
+ whileTap={{ scale: 0.97 }}
- className={cn("relative px-5 py-2.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap shrink-0 transition-all duration-200", "border backdrop-blur-sm", ...)}
+ className={cn("relative px-5 py-2.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap shrink-0 transition-all duration-200", "border backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", ...)}
```

#### 14. Auto-repair "Book" button (L~810) — add focus ring
```diff
- className="px-3 py-1.5 rounded-lg bg-ig-gradient text-white text-[11px] font-bold shadow-sm"
+ className="px-3 py-1.5 rounded-lg bg-ig-gradient text-white text-[11px] font-bold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

#### 15. Product card "Add to Cart" button (L~850) — add focus ring
```diff
- className="h-8 w-8 rounded-full bg-ig-gradient text-white flex items-center justify-center shadow-lg shadow-primary/20"
+ className="h-8 w-8 rounded-full bg-ig-gradient text-white flex items-center justify-center shadow-lg shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

#### 16. Product card "Like" button (L~860) — add focus ring
```diff
- className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center"
+ className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

#### 17. Desktop "Ride There" button (L~900) — add focus ring
```diff
- className="w-full h-12 rounded-full flex items-center justify-center gap-2 font-bold text-[15px] text-white shadow-lg"
+ className="w-full h-12 rounded-full flex items-center justify-center gap-2 font-bold text-[15px] text-white shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

#### 18. Desktop "Book Now" button (L~910) — add focus ring
```diff
- className="w-full h-12 rounded-full flex items-center justify-center gap-2 font-bold text-[15px] text-white shadow-lg"
+ className="w-full h-12 rounded-full flex items-center justify-center gap-2 font-bold text-[15px] text-white shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

#### 19. Desktop "Call" anchor (L~920) — add focus ring
```diff
- className="h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border border-white/15 bg-white/[0.04] backdrop-blur-sm text-white hover:bg-white/[0.07] transition-colors"
+ className="h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border border-white/15 bg-white/[0.04] backdrop-blur-sm text-white hover:bg-white/[0.07] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

#### 20. Desktop "Chat" button (L~930) — add focus ring
```diff
- className="h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border border-white/15 bg-white/[0.04] backdrop-blur-sm text-white hover:bg-white/[0.07] transition-colors"
+ className="h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border border-white/15 bg-white/[0.04] backdrop-blur-sm text-white hover:bg-white/[0.07] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

#### 21. Desktop "Share" button (L~940) — add focus ring
```diff
- className="h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border border-white/15 bg-white/[0.04] backdrop-blur-sm text-white hover:bg-white/[0.07] transition-colors"
+ className="h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border border-white/15 bg-white/[0.04] backdrop-blur-sm text-white hover:bg-white/[0.07] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

#### 22. Desktop social link anchors (L~955) — add focus ring
```diff
- className="h-9 w-9 rounded-full flex items-center justify-center border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] transition-colors"
+ className="h-9 w-9 rounded-full flex items-center justify-center border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

#### 23. Desktop "Book a Service" Button (L~970) — already shadcn `<Button>`, skip (ships tokens)

#### 24. Desktop "Check room status" Button (L~720) — already shadcn `<Button>`, skip

#### 25. Desktop "Get directions" Button (L~725) — already shadcn `<Button>`, skip

### Fetched-but-unused fields (display-only, no behavior change)

**Line ~400 area** — `review_count` is fetched but never rendered. Add it to the StarRating:
```diff
- <StarRating value={Number(store.rating) || 4.5} size="xs" />
+ <StarRating value={Number(store.rating) || 4.5} size="xs" reviewCount={(store as any).review_count} />
```

### Responsive Check

The page already handles breakpoints well:
- **375px**: 1-col product grid, stacked contact tiles, wrapped category tabs, full-width hero
- **768px**: 2-col product grid, side-by-side contact tiles, category tabs scrollable
- **1280px**: 2-col layout (left content + right rail), 3-col product grid, gallery at full height

No responsive fixes needed — the existing `sm:`, `lg:`, `xl:` breakpoints are correct.

### Summary of Changes

| # | Element | Change |
|---|---------|--------|
| 1-3 | Hero nav buttons (back/chat/cart) | `whileTap: 0.85→0.95` + `focus-visible:ring` |
| 4 | Logo zoom button | `focus-visible:ring` |
| 5 | "Ride There" (mobile) | `focus-visible:ring` |
| 6 | Booking status locked button | `focus-visible:ring` |
| 7-10 | Call/SMS/Chat/Share tiles (mobile) | `focus-visible:ring` |
| 11 | Social links (mobile) | `focus-visible:ring` |
| 12-13 | Category tabs | `whileTap: 0.88→0.97` + `focus-visible:ring` |
| 14 | Auto-repair "Book" button | `focus-visible:ring` |
| 15-16 | Product card Add/Like buttons | `focus-visible:ring` |
| 17-22 | Desktop contact tiles + social links | `focus-visible:ring` |
| — | `review_count` display | Add to `StarRating` |

**Total: 22 className edits + 1 display-only addition. Zero behavior changes to queries, mutations, routing, or component logic.**

### Owner Verification

1. Run `npm run update` — must pass
2. Preview at `/store/:slug` on 375/768/1280 — tab through all interactive elements to verify focus rings appear
3. Confirm `review_count` shows in the StarRating component (if data exists in DB)
