# MiMo run — 2026-06-14T06:01:02.854Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + a11y QA on ONE customer-facing page: src/pages/RecommendationScoresPage.tsx (115 lines, "Transparency: what we recommend for you + scores", REAL Supabase recommendation_scores (orphan, user-owned), AUTH-aware via useAuth [user.id scopes query]). Read-only transparency view + a segmented kind filter (useState tab). One useQuery ["recommendation-scores-me", user.id] (own rows, order score desc, limit 200, enabled !!user.id). useMemo kinds (Map count per item_kind, sorted desc), filtered (tab==="all"?all:filter by kind), stats (avg/max). Layout: SwipeBackContainer + SEOHead noIndex; sticky header (shadcn back <Button> + Brain badge + title); gradient hero stat motion.div (count + avg/top score, NO onClick); segmented filter pill row (overflow-x-auto scrollbar-hide); loading skeletons; empty-state card; list of score rows (each presentational motion.div [entrance anim, NO onClick]: TrendingUp icon tile + kind chip + truncated item_id + relative time + score).

Reference standard: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): exactly 2 RAW <button type="button"> (the segmented filter pills: "All (n)" L79 + mapped kind tabs L81) + 1 shadcn back <Button> (L62). 0 motion.button. The score rows L96 are motion.div with NO onClick (presentational). Hero motion.div L70 NO onClick. The kind chip L100 is a <span> (decorative, NO onClick).
- shadcn back <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full"> (L62) => SKIP (ships tokens, labeled).
- (A) "All (n)" filter pill (L79, RAW, segmented): onClick setTab("all"), selection conveyed by bg (selected = bg-ig-gradient text-white shadow-sm; unselected = bg-secondary text-foreground hover:bg-muted). CONSTANT label word "All" (count badge in parens does NOT disqualify aria-pressed). Base BEFORE: "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all" (transition-all ALREADY present, NO scale, NO ring).
- (B) mapped kind filter pills (L81, RAW, segmented): onClick setTab(k), same bg-conveyed selection. CONSTANT label word per button (kind name; count badge in parens does NOT disqualify). Base BEFORE: "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold capitalize transition-all".

TOKEN TIERS: wide/primary/cards active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. FLIP transition-colors→transition-all when ADDING a NEW scale to a button that ALSO has a hover bg/color. APPEND-not-flip when transition-all already present. aria-pressed for persistent toggle/segmented/filter conveyed by bg/color with a CONSTANT label word (a count badge in parens does NOT disqualify). OUTWARD ring default; overflow-x-auto keeps overflow-y visible so OUTWARD ring is fine.

EDITS APPLIED (validate exact):
(A) "All (n)" pill (L79): ADD aria-pressed={tab === "all"} + APPEND "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" after transition-all (segmented tier [0.97]; APPEND-not-flip — transition-all already present; aria-pressed — persistent filter conveyed by bg, constant label "All"; OUTWARD ring-ring — overflow-x-auto row keeps overflow-y visible). NEW base: "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring".
(B) mapped kind pills (L81): ADD aria-pressed={tab === k} + APPEND same tokens after transition-all. NEW base: "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold capitalize transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring".

QUESTIONS:
(1) Filter pills (A)+(B): aria-pressed correct (persistent filter, bg-conveyed selection, constant label word — count badge in parens does NOT disqualify)? segmented tier [0.97]? APPEND-not-flip (transition-all already present)? OUTWARD ring-ring (overflow-x-auto keeps overflow-y visible)?
(2) Inventory exhaustive (2 RAW segmented + 1 shadcn back)? hero motion.div L70 + each score motion.div L96 correctly presentational (NO onClick)? skeletons L85 + empty-state L86 non-interactive? kind chip span L100 + icon tile L97 decorative?
(3) Responsive 375/768/1280: header; hero (text-3xl count + avg/top subline); filter pill row (overflow-x-auto scrollbar-hide — scrolls horizontally, OK @375?); score row (icon tile h-9 w-9 + flex-1 min-w-0 [kind chip + mono item_id line-clamp-1 + relative time] + score). Any crush @375? sub-44px tap targets to FLAG (back h-10 40px; filter pills py-1.5 ~28px)?
(4) Owner flags (logic/out of scope, FLAG not fix): supabase cast type-workaround; query limit 200 (reasonable cap — note it); item_id truncated slice(0,12) (transparency view, fine); no realtime (static staleTime 60s); anything else?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/RecommendationScoresPage.tsx

---

**Assessment: the diff is already applied in the working tree. No further edits needed. Validation below.**

---

## (1) Filter pills — all correct

| Check | Verdict | Rationale |
|-------|---------|-----------|
| `aria-pressed` | ✅ | Persistent single-select filter; bg-conveyed (`bg-ig-gradient text-white shadow-sm` vs `bg-secondary … hover:bg-muted`); constant label word ("All" / kind name); count `(n)` in parens is display-only, not a label mutation. Default `"all"` → exactly one always pressed. |
| Segmented tier `[0.97]` | ✅ | Pills/chips/segmented row — correct tier. |
| APPEND-not-flip | ✅ | `transition-all` already in base; just appending scale + ring. |
| OUTWARD `ring-ring` | ✅ | Parent `overflow-x-auto scrollbar-hide` keeps `overflow-y: visible` → outward ring not clipped. |

New classNames (both already in the file):
- **(A)** `"shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
- **(B)** `"shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold capitalize transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

---

## (2) Inventory — exhaustive

| Control | Type | Verdict |
|---------|------|---------|
| Back `<Button>` L62 | shadcn | SKIP — ships tokens, `aria-label="Back"` ✅ |
| "All (n)" pill L79 | RAW `<button>` | EDIT (A) ✅ |
| Mapped kind pills L81 | RAW `<button>` | EDIT (B) ✅ |
| Hero `motion.div` L70 | presentational | NO onClick — correct SKIP ✅ |
| Score `motion.div` ×N L96 | presentational | NO onClick — correct SKIP ✅ |
| Skeletons L85 | non-interactive | SKIP ✅ |
| Empty-state L86 | non-interactive | SKIP ✅ |
| Kind chip `<span>` L100 | decorative | NO onClick — correct SKIP ✅ |
| Icon tile `div` L97 | decorative | SKIP ✅ |

**2 RAW + 1 shadcn = 3 controls total. 2 edited, 1 skipped. Exhaustive.**

---

## (3) Responsive — clean

- **375:** Header reflows fine. Hero single-column `max-w-2xl`, `text-3xl` count + subline wraps cleanly. Filter pill row scrolls horizontally as designed (`overflow-x-auto scrollbar-hide`, each pill `shrink-0`). Score rows: `h-9 w-9` icon + `flex-1 min-w-0` text (kind chip + `line-clamp-1` mono ID + relative time) + `shrink-0` score — no crush.
- **768/1280:** Widens within the centered `max-w-2xl` column. No layout change.

**Sub-44px tap targets (FLAG, repo-wide pattern, not introduced here):**
- Back `h-10 w-10` = 40px
- Filter pills `py-1.5` ≈ ~28px

---

## (4) Owner flags

- **Supabase `as unknown as {...}` cast** — existing type-workaround pattern, throughout the repo.
- **`limit(200)`** — reasonable cap for a transparency dashboard; note it.
- **`item_id.slice(0, 12)`** — truncation fine for opaque IDs in a transparency view.
- **`staleTime: 60_000`** — static cache, no realtime; appropriate for this read-only view.
- **No explicit error UI** beyond the query's default behavior — existing pattern.

---

## Final verdict

**The 2-className + 2-aria-pressed + 0-logic diff is already applied in the working tree. No changes to propose.** The page is a clean 115-line read-only transparency view with a single segmented filter — edits are minimal and correct.

**Owner action:** run `npm run update` to verify the build is green, then commit.
