# DeepSeek run — 2026-06-14T06:13:34.050Z

- model: deepseek-chat
- task: Premium interaction + a11y QA on ONE customer-facing page: src/pages/PlaceClicksPage.tsx (202 lines, "Stores you've tapped on the map — recent browsing history", REAL Supabase map_pin_clicks [orphan] joined w/ store_profiles, AUTH-aware via useAuth [user.id scopes query]). Two useQuery: ["map-pin-clicks", user.id] (own clicks, order created_at desc, limit 200, enabled !!user.id) + ["map-pin-clicks-stores", storeIds] (.in() resolve store_profiles, enabled storeIds.length>0). useMemo storeIds/storeMap/byStore (group by store, count taps, sort by recency). Layout: SwipeBackContainer + SEOHead noIndex; sticky header (shadcn back <Button> + MapPin badge + title "Places Tapped"); gradient hero stat motion.div (place count + total taps, NO onClick); loading skeletons; empty-state card (shadcn "Explore nearby" Button → navigate /nearby); list of store-group motion.button rows (TAPPABLE → deep-link to the specific store).

Reference standard: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): exactly 1 RAW interactive control beyond shadcn — the store-group motion.button (L162, grep count 2 "motion.button" = opening tag L162 + closing </motion.button> L194, ONE control). Plus 2 shadcn <Button> (back L117, "Explore nearby" L151). 0 raw <button type="button">. Hero motion.div L130 NO onClick. ChevronRight L193 (decorative, wrapped in a single-arg cn() — harmless). Store logo img L174 + Store fallback icon L176 decorative.
- shadcn back <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full"> (L117) => SKIP (ships tokens, labeled).
- shadcn "Explore nearby" <Button onClick navigate("/nearby")> (L151) => SKIP (ships tokens).
- (A) store-group nav row (L162, motion.button): onClick navigate(s?.slug ? `/store/${s.slug}` : `/store-profile/${g.store_id}`) — a PRECISE store deep-link (good affordance), full-width nav card, VISIBLE text (store name, tap count, last-tapped relative time, sources) + ChevronRight. ALREADY has whileTap={{ scale: 0.985 }} (framer press) AND transition-colors + hover:bg-secondary/40. Base BEFORE: "w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left" (NO focus-visible ring).

TOKEN TIERS: wide/primary/cards/full-width active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. DON'T-CHURN RULE: if a button ALREADY has a press mechanism + transition, ADD ring (+aria) ONLY — do NOT add a redundant CSS active:scale on top of an existing framer whileTap, do NOT FLIP transition-colors (no new CSS scale is being added). aria-pressed ONLY for persistent toggle/segmented/filter — NOT one-shot nav. OUTWARD ring default.

EDIT APPLIED (validate exact):
(A) store-group nav row (L170 className): APPEND ONLY "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (don't-churn — the row ALREADY has whileTap={{ scale: 0.985 }} press + transition-colors; do NOT add CSS active:scale [redundant with whileTap], do NOT FLIP transition-colors→transition-all [no new CSS scale — framer handles press, hover:bg fade stays on transition-colors]; NO aria — one-shot nav with visible text; OUTWARD ring-ring on the neutral bg-card row). NEW base: "w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring".

QUESTIONS:
(1) store-group row (A): is ring-ONLY append correct (don't-churn — whileTap={{ scale: 0.985 }} already provides press scale, transition-colors already eases the hover bg)? Confirm NOT adding CSS active:scale (double-up with whileTap) and NOT flipping transition-colors→transition-all (no new CSS scale). NO aria (one-shot nav, visible text)? OUTWARD ring-ring (neutral bg-card parent)?
(2) Inventory exhaustive (1 motion.button nav row + 2 shadcn [back, Explore nearby])? hero motion.div L130 + skeletons L142 + empty-state L144 presentational? ChevronRight L193 + store logo img L174 + Store fallback icon L176 decorative? (note ChevronRight is wrapped in a single-arg cn() — harmless, leave it?)
(3) Responsive 375/768/1280: header; hero (text-3xl place count + total-taps subline); store row (logo tile h-10 w-10 + flex-1 min-w-0 [name line-clamp-1 + meta row: tap count + last-tapped time + sources] + chevron). Any crush @375 (meta row with sources)? sub-44px tap targets to FLAG (back h-10 40px; row p-3 + h-10 logo ~64px tall, OK)?
(4) Owner flags (logic/out of scope, FLAG not fix): supabase cast type-workaround ×2 (clicks + stores); the row deep-links correctly to the specific store (s?.slug ? /store/:slug : /store-profile/:id — GOOD affordance, note it); two-query resolve (clicks then .in() stores — batched, fine); client-side grouping by store (byStore useMemo); limit 200; no realtime; anything else?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/PlaceClicksPage.tsx

---

## Plan

One edit: append focus-visible ring tokens to the store-group `motion.button` nav row (L170 className). No other changes needed.

## Proposed Change

**File:** `src/pages/PlaceClicksPage.tsx`

**Before (L170):**
```tsx
className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left"
```

**After (L170):**
```tsx
className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

## Answers to Questions

**(1) Ring-ONLY append is correct.** The row already has `whileTap={{ scale: 0.985 }}` (framer press) + `transition-colors` (eases the `hover:bg` fade). Do NOT add CSS `active:scale` (would double-up with `whileTap`). Do NOT flip `transition-colors`→`transition-all` (no new CSS scale being introduced — framer handles press, hover bg stays on `transition-colors`). NO `aria` needed (one-shot nav with visible store name text). OUTWARD `ring-ring` is correct (neutral `bg-card` parent).

**(2) Inventory exhaustive.** Exactly 1 RAW control edited (store-group `motion.button` L162). 2 shadcn `<Button>`s correctly SKIPPED (back L117 ships tokens + `aria-label`; "Explore nearby" L151 ships tokens). Hero `motion.div` L130 (entrance anim, no onClick) — presentational. Loading skeletons L142 — presentational. Empty-state card L144 — presentational. `ChevronRight` L193 wrapped in `cn()` — decorative, leave as-is. Store logo `img` L174 + Store fallback icon L176 — decorative.

**(3) Responsive 375/768/1280 — clean.** `max-w-2xl mx-auto px-4 py-6 space-y-5`. At 375: sticky header (Back `h-10 w-10` + MapPin badge + title) fits; hero (`text-3xl` count + subline) wraps cleanly; each store row (logo `h-10 w-10` [40px] + `flex-1 min-w-0` [name `line-clamp-1` + meta row: tap count + `·` + relative time + `·` + sources — wraps gracefully at 375] + `ChevronRight shrink-0`) has ~64px row height (well over 44px). **Flag:** back `h-10` (40px) is sub-44px — repo-wide compact pattern, not introduced here.

**(4) Owner flags (FLAG not fix):**
- Supabase `as unknown as {...}` cast workaround ×2 (clicks + stores queries) — existing.
- **Good affordance noted:** row deep-links correctly to the specific store (`s?.slug ? /store/:slug : /store-profile/:id`) — precise, not a generic index.
- Two-query resolve (clicks → `.in()` stores) — batched, acceptable for ≤200 rows.
- Client-side grouping by store (`byStore` `useMemo`) — fine.
- `limit(200)` — reasonable cap.
- No realtime subscription — `staleTime` 30s/60s appropriate for a history page.

## Verify Gate

Run `npm run update` (type-check + worker type-check + production build) before marking done.
