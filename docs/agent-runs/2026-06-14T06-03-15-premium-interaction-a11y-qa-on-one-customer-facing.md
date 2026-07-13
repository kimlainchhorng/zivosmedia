# DeepSeek run — 2026-06-14T06:03:15.740Z

- model: deepseek-chat
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

## Plan

One edit, one file: `src/pages/SurveysPage.tsx`.

**Edit (A):** open-survey `motion.button` nav row (L137) — **ring-ONLY append** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.  
- **Don't-churn:** row already has `whileTap={{ scale: 0.985 }}` (framer press) + `transition-colors` (hover bg fade). No CSS `active:scale` added (would double with whileTap). No `transition-colors→transition-all` flip (no new CSS scale introduced).  
- **No aria:** one-shot nav with visible text description.  
- **Outward `ring-ring`:** neutral `bg-card` parent, not overflow-hidden.

---

## Diff

```diff
--- a/src/pages/SurveysPage.tsx
+++ b/src/pages/SurveysPage.tsx
@@ -134,7 +134,7 @@ export default function SurveysPage() {
                     whileTap={{ scale: 0.985 }}
                     onClick={() => navigate(`/surveys/${s.id}`)}
-                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left"
+                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                   >
```

---

## Verification

1. **Ring-ONLY append correct?** ✅ Yes. `whileTap={{ scale: 0.985 }}` is the press mechanism; `transition-colors` eases the hover bg. No CSS `active:scale` added (no double-up). No `transition-all` flip (no new CSS scale).  
2. **Inventory exhaustive?** ✅ Yes. 1 `motion.button` nav row (A) + 1 shadcn back `<Button>` (L78, skipped). Closed rows L177 are `<div>` with `opacity-60`, no `onClick` — correctly left as-is. Hero `motion.div` L91, skeletons L103, empty-state L111 — all presentational. Icon tiles L139/L181 — decorative.  
3. **Responsive @375?** ✅ Clean. Header: back `h-10 w-10` + badge + title. Hero: `text-3xl` count + responses subline. Open row: icon `h-11 w-11` + `flex-1 min-w-0` [description `line-clamp-1` + flex-wrap meta row (question count + responses + `ml-auto` expiry + audience below)] + chevron. The flex-wrap meta row at 375: question count + responses + expiry with `ml-auto` — if all three fit on one line (~200px after icon+chevron) they do; if not, the `flex-wrap` drops the audience line below. No crush. Tap targets: back `h-10` (40px) is repo-wide compact pattern; the open row is `p-3` with `h-11` icon — full row height is ~60px, well above 44px.  
4. **Owner flags (logic, out of scope):**  
   - `(supabase as unknown as {...})` cast workaround (existing).  
   - Query fetches **all** `user_surveys` with no `status` filter — a `status="draft"` survey with a future `ends_at` would appear in "Open" (partitioned client-side by `ends_at` only). Owner may want `.eq("status", "published")` or similar.  
   - No auth scoping — public surveys list (fine for a browse page).  
   - No realtime subscription (fine for a browse page with `staleTime: 60_000`).  

**Owner must:** run `npm run update` (type-check + worker type-check + build) before committing.
