# MiMo run — 2026-06-14T06:20:08.503Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + a11y QA on ONE customer-facing page: src/pages/CreatorEarningsPage.tsx (259 lines, "Daily earnings breakdown for creators — 4 revenue streams ads/content/subs/tips", REAL Supabase creator_earnings, AUTH-aware via useAuth [creator_id = user.id scopes query]). One useQuery ["creator-earnings", user.id, range] (eq creator_id, gte date rangeStartIso(range), order date desc, enabled !!user.id). useState range:"7d"|"30d"|"90d"|"ytd". useMemo totals (sum 4 streams). breakdown array, maxDaily for sparkline scale. Layout: SwipeBackContainer + SEOHead noIndex; sticky header (shadcn back Button + DollarSign badge + title "Earnings"); gradient hero total motion.div (NO onClick); range filter pill row (overflow-x-auto scrollbar-hide); sparkline (motion.div bars, decorative); revenue breakdown bars (motion.div, decorative); loading skeletons; empty-state; daily-detail rows (motion.div, NO onClick); full-width "Open live earnings & cash-out" CTA → navigate /creator-live-earnings.

Reference standard: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): exactly 2 RAW interactive controls beyond shadcn — (A) range filter pill <button> (L136, mapped over ["7d","30d","90d","ytd"]) + (B) full-width CTA <button> (L247). Plus 1 shadcn <Button> (back L107). 0 motion.button.
- shadcn back <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full"> (L107) => SKIP (ships tokens, labeled).
- (A) range filter pills (L136, <button> mapped over 4 ranges): single-select SEGMENTED filter, selection bg-conveyed via bg-ig-gradient (else bg-secondary hover:bg-muted), CONSTANT label per pill ("Last 7 days"/"Year to date"/...), onClick setRange(r), cn base 1st arg ALREADY transition-all, NO scale, NO focus-visible. In overflow-x-auto scrollbar-hide row.
- (B) full-width CTA (L247, <button>): one-shot navigate("/creator-live-earnings"), ALREADY has active:scale-[0.98] + transition-all + hover:opacity-90, NO focus-visible. bg-ig-gradient fill.

TOKEN TIERS: wide/primary/cards/full-width active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. DON'T-CHURN RULE: if a button ALREADY has press + transition, ADD ring (+aria) ONLY — do NOT add redundant CSS active:scale, do NOT flip transition. FLIP RULE: when ADDING a NEW CSS active:scale to a transition-colors/no-transition button that ALSO has hover color/bg → FLIP transition-colors→transition-all; APPEND-not-flip when transition-all already present. aria-pressed ONLY for persistent toggle/segmented/filter with constant label — NOT one-shot nav. OUTWARD ring-ring default on neutral surfaces (even when button's OWN fill is gradient, ring renders against neutral parent).

EDITS APPLIED (validate exact):
(A) range filter pills (L136): ADD aria-pressed={range === r} + APPEND into cn 1st arg "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (NO flip — transition-all already present in 1st arg; segmented-filter tier [0.97]; OUTWARD ring-ring — overflow-x-auto keeps overflow-y visible, neutral page column parent; bg-ig-gradient is the pill's OWN selected fill, ring renders against neutral parent). NEW 1st arg: "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring".
(B) full-width CTA (L247): DON'T-CHURN ring-ONLY APPEND "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (keep existing active:scale-[0.98] + transition-all + hover:opacity-90; do NOT add another scale, do NOT flip; OUTWARD ring-ring — neutral page parent, gradient is own fill; NO aria — one-shot nav). NEW base: "w-full h-12 rounded-2xl bg-ig-gradient text-white font-bold inline-flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-md shadow-rose-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring".

QUESTIONS:
(1) (A) range pills: aria-pressed + [0.97] + ring + NO flip (transition-all present) correct? OUTWARD ring-ring (overflow-x-auto, neutral parent)? Constant-label segmented filter qualifies for aria-pressed?
(2) (B) CTA: ring-ONLY don't-churn correct (active:scale-[0.98]+transition-all already present)? NOT adding 2nd scale, NOT flipping? NO aria (one-shot nav)? OUTWARD ring-ring?
(3) Inventory exhaustive (2 raw <button> [A range pills, B CTA] + 1 shadcn back)? hero motion.div L120, sparkline bars motion.div L159, breakdown bars motion.div L190, daily-detail rows motion.div L229 all presentational (NO onClick)? skeletons L205 + empty-state L212 presentational?
(4) Responsive 375/768/1280: header; hero (text-4xl total + day-count); range pill row (overflow-x-auto — 4 pills fit/scroll @375?); sparkline (flex items-end h-24); breakdown bars; daily rows; CTA. Any crush @375? sub-44px tap targets to FLAG (back h-10 40px; pills py-1.5 ~28px [filter chips, repo pattern]; CTA h-12 48px OK)?
(5) Owner flags (logic/out of scope, FLAG not fix): supabase cast type-workaround; range query refetches per range (queryKey includes range — fine); rows.slice(0,20) caps daily detail (no "show more"); sparkline reverse() to chronological; CTA deep-links to /creator-live-earnings (precise — GOOD); anything else?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/CreatorEarningsPage.tsx

---

**Plan:** Validate the two edits already present in the file. No code changes needed — the file as shown already contains the correct tokens. Confirm each item.

---

**(1) Range pills (A) — ALL CORRECT**

- `aria-pressed={range === r}` ✓ — persistent single-select segmented filter, constant labels ("Last 7 days" etc.), bg-conveyed selection. Matches RecommendationScoresPage (L79/81), VoicemailsPage (L258), StickerStorePage (L153) precedents exactly.
- `[0.97]` ✓ — segmented-filter/chip tier.
- NO flip ✓ — `transition-all` already in the cn 1st arg.
- OUTWARD `ring-ring` ✓ — parent is the neutral `bg-background` page column; `overflow-x-auto` keeps `overflow-y` visible; `bg-ig-gradient` is the pill's OWN selected fill, ring renders against neutral parent.

**(2) CTA (B) — ALL CORRECT**

- Ring-ONLY don't-churn ✓ — `active:scale-[0.98]` + `transition-all` + `hover:opacity-90` already present → only `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` appended.
- NOT adding redundant CSS scale ✓.
- NO aria ✓ — one-shot navigate, not a toggle.
- OUTWARD `ring-ring` ✓ — neutral page column parent, gradient is own fill.

**(3) Inventory — EXHAUSTIVE, confirmed**

2 RAW `<button>` (A + B) + 1 shadcn `<Button>` (back, SKIP). All `motion.div` instances are presentational (hero L120, sparkline bars L159, breakdown bars L190, daily rows L229 — none have `onClick`). Skeletons L205 + empty-state L212 presentational. Nothing missed.

**(4) Responsive — CLEAN at 375/768/1280**

- Range pills: 4 × ~80px + 3 × 8px gap = ~344px. Fits 375 without scrolling (barely). `shrink-0` + `overflow-x-auto` graceful fallback if any locale makes labels longer.
- All other sections stack cleanly in the `max-w-2xl mx-auto px-4` column.

Sub-44px tap targets to **FLAG** (not fix — repo-wide compact pattern):
- Back `h-10 w-10` = 40px.
- Range pills `py-1.5` ≈ 28px (filter chip pattern — matches every segmented filter in the app).
- CTA `h-12` = 48px ✓ (above threshold).

**(5) Owner flags (logic, out of scope — FLAG not fix):**

- `as unknown as {...}` supabase cast workaround — existing.
- `rows.slice(0, 20)` caps daily detail with no "show more" / pagination affordance — owner may want a Load More or virtual scroll for creators with >20 earning days in a range.
- `reverse()` on rows for sparkline chronological order — correct.
- CTA → `/creator-live-earnings` — precise deep-link, GOOD.
- No error UI if the query fails (react-query default error state unhandled) — minor.
- `staleTime: 60_000` — appropriate for a financial summary.

---

**Verdict: No changes needed.** The two edits are correctly applied. Run `npm run update` to verify the build gate, then move to Done.
