# DeepSeek run — 2026-06-14T05:22:15.072Z

- model: deepseek-chat
- task: Premium interaction + a11y QA on ONE customer-facing page: src/pages/LeaderboardsPage.tsx (232 lines, "Browse global leaderboards with my rank", REAL Supabase leaderboards + leaderboard_entries + public_profiles, AUTH-aware via useAuth [user used only to highlight "You" + compute myRank]). Three useQuery: ["leaderboards"] (active boards), ["leaderboard-entries", activeBoardId] (top 50 by score, enabled !!activeBoardId), ["leaderboard-profiles", userIds] (name/avatar lookup). useState selectedId; activeBoardId = selectedId ?? boards[0]?.id. useMemos: activeBoard, userIds, profileMap, myEntry, fallbackRank, myRank. Layout: SwipeBackContainer + SEOHead noIndex; sticky header (shadcn back <Button> + Trophy badge + title); gradient hero stat motion.div (your rank, NO onClick); a horizontal board-selector pill row (overflow-x-auto scrollbar-hide); a period/reset meta line; loading skeletons; empty-state card; then a ranked list of entry rows (each presentational motion.div [entrance anim, NO onClick]: rank icon/number + avatar/initials + name + "You" badge + score). NO bottom nav.

Reference standard: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring). Precedent: ReelEffectsPage/OrderDisputesPage/MyJobApplicationsPage segmented filter pill (ADD aria-pressed + APPEND active:scale-[0.97] + ring, APPEND-not-flip since transition-all already present, OUTWARD ring-ring).

VERIFIED FACTS (full line-by-line read): exactly 1 RAW <button type="button"> (board-selector pill L159) + 1 shadcn back <Button> (L129). 0 motion.button. The leaderboard entry rows L202 are motion.div with NO onClick (presentational). The top-3 rows carry a DECORATIVE ring-1 ring-amber-500/20 (NOT a focus ring — leave).
- shadcn back <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full"> (L129) => SKIP (ships tokens, labeled).
- (A) Board-selector pill (L159, RAW): onClick={() => setSelectedId(b.id)}, VISIBLE constant per-button label = board name {b.name} (+ optional Globe2 icon for type==="global"), selection conveyed by BACKGROUND (active "bg-ig-gradient text-white shadow-sm" / inactive "bg-secondary text-foreground hover:bg-muted"). cn() base BEFORE: "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5". Sits in a "flex gap-2 overflow-x-auto scrollbar-hide" row (gap-2 between shrink-0 pills).

TOKEN TIERS (this repo): wide/primary/cards active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. transition-all when control ALSO has hover bg/color/opacity; transition-transform for PURE press-scale. APPEND-not-flip when transition-all already present and you add a scale. aria-pressed ONLY for persistent toggle/segmented/filter state conveyed by bg/color (constant label WORD per button qualifies) — NOT one-shot nav. ring-inset ONLY when flush inside an overflow-hidden rounded PARENT; OUTWARD default.

HARD RULE: className + display-only attr (aria-*) ONLY. Do NOT change any onClick / setSelectedId / navigate / useQuery / useMemo / useState / useAuth / activeBoardId logic / any logic. Do NOT add onClick to a no-op control (FLAG it).

EDIT APPLIED (validate exact):
(A) Board-selector pill (L159): ADD aria-pressed={b.id === activeBoardId} + APPEND " active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" to the cn() base. Segmented/pill tier [0.97]. APPEND-not-flip (transition-all already present, eases inactive hover:bg-muted + new scale). aria-pressed VALID (persistent single-select board filter, bg-conveyed selection, constant board-name label per button). NO aria-label (visible text). OUTWARD ring-ring (overflow-x-auto sets overflow-x only — overflow-y stays visible; gap-2 horizontal clearance; not flush, not overflow-hidden rounded card). NEW base: "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring".

QUESTIONS:
(1) Board pill (A): ADD aria-pressed + APPEND active:scale-[0.97] (segmented tier) + ring, APPEND-not-flip? aria-pressed VALID for a bg-conveyed single-select board filter with constant per-button label (the activeBoardId = selectedId ?? boards[0]?.id default-selects the first board, so one pill is always pressed)? OUTWARD ring-ring (NOT ring-inset) for the overflow-x-auto row? Or advise.
(2) Inventory exhaustive (1 RAW pill + 1 shadcn back)? hero stat motion.div L142 + each leaderboard entry motion.div L202 correctly presentational (NO onClick)? skeletons L154/L180 + empty-state L183 + the period/reset meta line L173 non-interactive? The top-3 decorative ring-1 ring-amber-500/20 + the "You" badge correctly LEFT (decorative, not focus/interactive)?
(3) Responsive 375/768/1280: header; hero stat (text-4xl rank); the overflow-x-auto board pill row; the period/reset meta line; the entry row (rank tile w-8 + avatar h-9 w-9 + flex-1 min-w-0 name/You badge + score tabular-nums). Any crush @375? sub-44px tap targets to FLAG (back h-10 40px; pills py-1.5 ~28px)?
(4) Owner flags (logic/out of scope, FLAG not fix): supabase cast type-workarounds (×3 queries); the profiles join uses an .or() with a CSV id.in/user_id.in (potential injection surface if user_ids weren't UUIDs — they're DB-sourced UUIDs so low risk, but flag); entries limited to top 50 (myRank falls back to findIndex within those 50 — a user outside the top 50 shows rank "—" even if ranked, since the query caps at 50); the entry rows have no tap-through to a profile; anything else?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/LeaderboardsPage.tsx

---

## Plan

The page has exactly **1 RAW `<button>`** (board-selector pill L159) + 1 shadcn `<Button>` (back, L129). The single edit is:

**Board-selector pill (L159):** ADD `aria-pressed` + APPEND `active:scale-[0.97]` + ring. This follows the exact segmented-filter precedent from `OrderDisputesPage`/`MyJobApplicationsPage`/`ReelEffectsPage`.

## Proposed Change

**File:** `src/pages/LeaderboardsPage.tsx`

**Line 159 — before:**
```tsx
className={cn("shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5", b.id === activeBoardId ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}
```

**Line 159 — after:**
```tsx
aria-pressed={b.id === activeBoardId}
className={cn("shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", b.id === activeBoardId ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}
```

**Diff:**
```diff
--- a/src/pages/LeaderboardsPage.tsx
+++ b/src/pages/LeaderboardsPage.tsx
@@ -156,7 +156,8 @@ export default function LeaderboardsPage() {
             {boards.map((b) => (
               <button
                 key={b.id}
                 type="button"
+                aria-pressed={b.id === activeBoardId}
                 onClick={() => setSelectedId(b.id)}
-                className={cn("shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5", b.id === activeBoardId ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}
+                className={cn("shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", b.id === activeBoardId ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}
               >
```

## Answers to Questions

**(1) Board pill (A):** ✅ **Correct as-is.** ADD `aria-pressed` + APPEND `active:scale-[0.97]` (segmented tier) + ring. `aria-pressed` is VALID — persistent single-select board filter, bg-conveyed selection, constant board-name label per button. `activeBoardId = selectedId ?? boards[0]?.id` ensures one pill is always pressed. **OUTWARD `ring-ring`** — `overflow-x-auto` sets overflow-x only (overflow-y stays visible), `gap-2` provides 8px horizontal clearance between `shrink-0` pills, not flush, not an overflow-hidden rounded card. APPEND-not-flip (`transition-all` already present).

**(2) Inventory exhaustive:** ✅ **Correct.** Exactly 1 RAW `<button>` (pill L159) + 1 shadcn `<Button>` (back L129). Hero stat `motion.div` L142 + entry rows `motion.div` L202 are correctly presentational (NO onClick). Skeletons L154/L180 + empty-state L183 + period/reset meta line L173 are non-interactive. Top-3 decorative `ring-1 ring-amber-500/20` + "You" badge correctly left as-is (decorative, not focus/interactive).

**(3) Responsive 375/768/1280:** ✅ **Clean.** Body capped `max-w-2xl mx-auto px-4`. At 375: header (Back `h-10 w-10` + Trophy badge `h-7 w-7` + title), hero stat (`p-5`/`text-4xl` rank), the `overflow-x-auto` board pill row (scrolls, `shrink-0` pills never crush), period/reset meta line, and entry row (rank tile `w-8` + avatar `h-9 w-9` + `flex-1 min-w-0` name/You badge + score `tabular-nums`) all lay out without crush. At ≥768 same within the 672px cap. **Sub-44px tap targets to FLAG:** Back `h-10 w-10` (40px) + pills `py-1.5` (~28px tall) — repo-wide compact pattern, not introduced here.

**(4) Owner flags (logic/out of scope):**
- `supabase as unknown as {…}` hand-rolled casts on all 3 queries — clean up when types regenerate.
- Profiles join uses `.or(\`id.in.(${csv}),user_id.in.(${csv})\`)` — CSV injection surface if `userIds` weren't UUIDs (they're DB-sourced UUIDs, low risk, but flag).
- Entries limited to top 50 — `myRank` falls back to `findIndex` within those 50; a user outside the top 50 shows rank "—" even if ranked.
- Entry rows have no tap-through to a profile (existing behavior).
- The `activeBoardId = selectedId ?? boards[0]?.id` default-selects the first board — one pill is always pressed, `aria-pressed` correctly reflects this.

## Verification

Run `npm run update` — this is a single className + aria-pressed addition, 0 logic lines touched, should pass cleanly.
