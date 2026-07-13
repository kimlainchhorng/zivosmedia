# MiMo run — 2026-06-14T06:14:27.071Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## (1) Ring-ONLY append — **Correct as-is.** ✅

Don't-churn fully honored:

| Check | Verdict |
|---|---|
| `whileTap={{ scale: 0.985 }}` already provides press | ✅ NO CSS `active:scale` added — no double-up |
| No new CSS scale → no reason to FLIP `transition-colors` | ✅ hover:bg fade stays on `transition-colors` |
| One-shot nav, visible text | ✅ NO `aria-pressed` |
| Neutral `bg-card` parent | ✅ OUTWARD `ring-ring` |

The appended tokens `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` are the only addition. Matches 62+ prior don't-churn nav-row slices exactly.

---

## (2) Inventory — **Exhaustive.** ✅

| Control | Action | Rationale |
|---|---|---|
| L117 shadcn `<Button>` Back | **SKIP** | Ships tokens, `aria-label="Back"` |
| L151 shadcn `<Button>` "Explore nearby" | **SKIP** | Ships tokens |
| L162 `motion.button` store-group row | **EDIT (A)** | Ring-only append ✅ |
| L130 `motion.div` hero | **SKIP** | Entrance anim, NO onClick — presentational |
| L142 skeleton `<div>`s | **SKIP** | Presentational |
| L144 empty-state card | **SKIP** | Presentational container |
| L193 `ChevronRight` | **SKIP** | Decorative, inside the motion.button tap target. Single-arg `cn("h-4 w-4 text-muted-foreground shrink-0")` — harmless, leave it ✅ |
| L174 `img` store logo | **SKIP** | Decorative (`alt=""`) |
| L176 `Store` fallback icon | **SKIP** | Decorative |

Zero interactive controls missed.

---

## (3) Responsive — **Clean at 375/768/1280.** ✅

- **Header**: Back `h-10 w-10` (40px) + MapPin badge `h-7 w-7` + title — clean at 375.
- **Hero**: `text-3xl` count + subline inside `max-w-2xl` — clean.
- **Store row at 375**: logo `h-10 w-10` + `flex-1 min-w-0` [name `line-clamp-1` + meta at `text-[11px]` with `gap-2`: "N taps · ⏱ Xm · sources"] + ChevronRight `shrink-0`. The `text-[11px]` meta comfortably fits ~190px available width (375 − 32px padding − 40px logo − 12px gap − 16px chevron − 24px row padding). Even "3 taps · 2h · map, search" is ~140px at 11px. **No crush.** If sources are unusually long, the `min-w-0` on the text container allows natural truncation behavior.
- **768/1280**: Widen within centered `max-w-2xl`. Clean.

**Sub-44px FLAG** (repo-wide, not introduced here): Back `h-10 w-10` = 40px. Row itself is `p-3` + `h-10` logo = ~64px min-height — well over 44px ✅.

---

## (4) Owner flags — **Inventory complete.** ✅

Confirmed flags:
- **supabase cast workaround ×2** — clicks query + stores `.in()` query (existing typing workaround)
- **Deep-link is correct** — `s?.slug ? /store/${s.slug} : /store-profile/${g.store_id}` — GOOD affordance, precise store navigation (unlike several other pages that dead-end to a generic index)
- **Two-query resolve** — clicks → `.in()` store_profiles (batched, fine for ≤200 clicks → ≤200 store IDs)
- **Client-side grouping** — `byStore` useMemo groups clicks by store_id, counts taps, sorts by recency
- **Limit 200** — reasonable cap
- **No realtime** — `staleTime: 30_000`/`60_000` appropriate
- **`is_verified` fetched but never rendered** — unused field in StoreRow (minor, no harm)
- **No `flex-wrap` on meta row** — mitigated by `text-[11px]` + `min-w-0`; low risk

---

## Verdict

**The edit is correct as-applied. Zero changes needed.** The single className append on the `motion.button` (A) follows the don't-churn pattern exactly, inventory is exhaustive, responsive is clean, and the store deep-link is a good affordance worth noting.

No diff to propose — ready for `npm run update` gate verification.
