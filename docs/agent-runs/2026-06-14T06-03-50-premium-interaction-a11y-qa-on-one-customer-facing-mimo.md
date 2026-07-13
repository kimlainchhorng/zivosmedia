# MiMo run — 2026-06-14T06:03:50.618Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + a11y QA on ONE customer-facing page: src/pages/SurveysPage.tsx (199 lines, "Browse open user surveys", REAL Supabase user_surveys table). One useQuery ["user-surveys"] (order created_at desc, staleTime 60s). useMemo open/closed (partition by expiryLabel(ends_at).expired). Layout: SwipeBackContainer + SEOHead noIndex; sticky header (shadcn back <Button> + ClipboardList badge + title); gradient hero stat motion.div (open count + total responses, NO onClick); loading skeletons; empty-state card; "Open" section = list of motion.button survey rows (TAPPABLE, navigate to /surveys/:id); "Closed" section = list of plain non-interactive <div> rows (opacity-60, NO onClick).

Reference standard: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): exactly 1 RAW interactive control beyond the back button — the open-survey motion.button (L129, the grep count of 2 "motion.button" = its opening tag L129 + closing </motion.button> L163, ONE control). Plus 1 shadcn back <Button> (L78). 0 raw <button type="button">. The CLOSED rows L177 are plain <div> with NO onClick (presentational). Hero motion.div L91 NO onClick.
- shadcn back <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full"> (L78) => SKIP (ships tokens, labeled).
- (A) open-survey nav row (L129, motion.button): onClick navigate(`/surveys/${s.id}`), full-width nav card, VISIBLE text (description, question/response counts, expiry, audience) + ChevronRight. ALREADY has whileTap={{ scale: 0.985 }} (framer press mechanism) AND transition-colors + hover:bg-secondary/40. Base BEFORE: "w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left" (NO focus-visible ring — keyboard users get NO focus indicator).

TOKEN TIERS: wide/primary/cards/full-width active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. DON'T-CHURN RULE: if a button ALREADY has a press mechanism + transition, ADD ring (+aria) ONLY — do NOT add a redundant CSS active:scale on top of an existing framer whileTap, do NOT FLIP transition-colors (no new CSS scale is being added). aria-pressed ONLY for persistent toggle/segmented/filter — NOT one-shot nav. OUTWARD ring default.

EDIT APPLIED (validate exact):
(A) open-survey nav row (L137 className): APPEND ONLY "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (don't-churn — the row ALREADY has whileTap={{ scale: 0.985 }} as its press mechanism + transition-colors; do NOT add a CSS active:scale [redundant with whileTap], do NOT FLIP transition-colors→transition-all [no new CSS scale added — the hover:bg fade stays on transition-colors, framer handles the press scale]; NO aria — one-shot nav with visible text; OUTWARD ring-ring on the neutral bg-card row). NEW base: "w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring".

QUESTIONS:
(1) open-survey row (A): is ring-ONLY append correct (don't-churn — whileTap={{ scale: 0.985 }} already provides the press scale, transition-colors already eases the hover bg)? Confirm NOT adding a CSS active:scale (would double-up with whileTap) and NOT flipping transition-colors→transition-all (no new CSS scale is introduced). NO aria (one-shot nav, visible text)? OUTWARD ring-ring (neutral bg-card parent)?
(2) Inventory exhaustive (1 motion.button nav row + 1 shadcn back)? CLOSED rows L177 correctly LEFT as non-interactive <div> (opacity-60, NO onClick)? hero motion.div L91 + skeletons L103 + empty-state L111 presentational? icon tiles L139/L181 decorative?
(3) Responsive 375/768/1280: header; hero (text-3xl open count + responses subline); open row (icon tile h-11 w-11 + flex-1 min-w-0 [description line-clamp-1 + flex-wrap meta: question count + responses + expiry ml-auto + audience] + chevron); closed row. Any crush @375 (the flex-wrap meta line)? sub-44px tap targets to FLAG (back h-10 40px; open row p-3 h-11 icon — full row is tall, OK)?
(4) Owner flags (logic/out of scope, FLAG not fix): supabase cast type-workaround; query has NO status filter (fetches all user_surveys regardless of status column — partitioned client-side by ends_at only, so a status="draft" survey would still show if not expired — intended?); no auth scoping (public surveys list — fine); no realtime; anything else?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/SurveysPage.tsx

---

## (1) Plan

Single edit — append focus-visible ring to the open-survey nav row. Everything else is already correct.

## (2) Answers + proposed diff

### (A) open-survey row — **Confirmed correct as described.**

Ring-ONLY append is the right call:
- **Don't add CSS `active:scale`** — `whileTap={{ scale: 0.985 }}` is the press mechanism; a CSS `active:scale` would double-up and fight framer for transform ownership.
- **Don't flip `transition-colors` → `transition-all`** — no new CSS scale is introduced, so the `hover:bg-secondary/40` fade just needs `transition-colors` as-is.
- **NO aria** — one-shot nav with visible text (`description`, counts, expiry). Not a toggle or filter.
- **OUTWARD `ring-ring`** — `bg-card border` row sits on the neutral `bg-background` page; no `overflow-hidden` clipping.

```diff
--- a/src/pages/SurveysPage.tsx
+++ b/src/pages/SurveysPage.tsx
@@ -137,1 +137,1 @@
-                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left"
+                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

That's it — one line, one token appended, zero logic touched.

### (2) Inventory — **Exhaustive, confirmed.**

| Control | Action | Decision |
|---------|--------|----------|
| shadcn back `<Button>` L78 | Ships tokens + `aria-label="Back"` | **SKIP** ✓ |
| open-survey `motion.button` L129 | `navigate(/surveys/:id)` | **EDIT (ring append)** |
| closed row `<div>` L177 | NO onClick, `opacity-60` | **PRESENTATIONAL ✓** |
| hero `motion.div` L91 | NO onClick | **PRESENTATIONAL ✓** |
| skeletons L103 | `animate-pulse` divs | **PRESENTATIONAL ✓** |
| empty-state L111 | NO onClick | **PRESENTATIONAL ✓** |
| icon tiles L139, L181 | Decorative `h-11 w-11` bg-gradient divs | **DECORATIVE ✓** |

No missed controls. Closed rows correctly left as inert `<div>`.

### (3) Responsive — **Clean, one flag.**

- **Header**: sticky, `px-4 py-3`, flex row — no crush at 375.
- **Hero**: `p-5`, `text-3xl` open count + responses subline — single column, fine.
- **Open row at 375**: icon tile `h-11 w-11` (44px) + `flex-1 min-w-0` (description `line-clamp-1` truncates) + `flex-wrap` meta line (question count + responses + expiry `ml-auto`) + chevron `shrink-0`. The `flex-wrap` lets the meta line break gracefully — the `ml-auto` expiry drops to its own line if the row gets tight. No crush.
- **Closed row**: same layout, no interactivity concern.

**Flag:** back button `h-10` = 40px sub-44px — repo-wide compact pattern, not introduced here. The open-survey row itself is tall enough (`p-3` + `h-11` icon = ~56px row height, well over 44px).

### (4) Owner flags

**(a)** `supabase as unknown as {...}` cast on the `user_surveys` query — existing typing workaround. Fine.

**(b)** **No status filter — partitioned client-side by `ends_at` only.** The query fetches ALL rows from `user_surveys` regardless of `status` column. The `useMemo` partitions by `expiryLabel(ends_at).expired`. This means a survey with `status = "draft"` or `status = "paused"` that hasn't reached `ends_at` would render in the "Open" section and be tappable (navigating to a detail page that may not be ready). **FLAG** — owner may want to add `.eq("status", "active")` or `.in("status", ["active", "open"])` to the query filter, or add a `status` check in the `useMemo` partition. Not fixing — logic change, out of scope.

**(c)** No auth scoping — `user_surveys` is public list, fine.

**(d)** No realtime — `staleTime: 60_000` is reasonable for a browse page. Fine.

**(e)** `target_audience` displayed as raw string with `capitalize` — if the DB stores multi-word values like `"new users"`, only the first word gets capitalized. Minor, existing.

## (3) Verification

**Diff:** exactly 1 line changed (className append), 0 logic, 0 imports, 0 aria changes.

**Verify command:** `npm run update` must pass (both type-checks + production build). The change is a string-only className edit with zero runtime impact.

**Owner deploys** after verifying the gate is green.
