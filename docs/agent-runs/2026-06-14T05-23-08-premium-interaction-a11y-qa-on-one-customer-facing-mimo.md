# MiMo run — 2026-06-14T05:23:08.940Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## (1) Plan

Single control to edit (the board-selector pill). Validate the already-applied diff in the provided code against the standard. Confirm inventory, responsiveness, and flag owner-level items.

## (2) Validation — the diff is **correct as-is**

The code already has the edit applied. Confirming each element:

**Before cn() base (L159):**
```
"shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5"
```

**After cn() base (L159):**
```
"shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**+ new attr:** `aria-pressed={b.id === activeBoardId}`

**Verdict per item:**

| Decision | Correct? | Why |
|----------|----------|-----|
| `aria-pressed` on the pill | ✅ | Persistent single-select filter, bg-conveyed, constant label `{b.name}` per button. One is always pressed (`activeBoardId = selectedId ?? boards[0]?.id`). Exact OrderDisputesPage/MyJobApplicationsPage/ReelEffectsPage precedent. |
| `active:scale-[0.97]` (segmented tier) | ✅ | Inline shrink-0 pills in a horizontal scroll row — chip/segmented tier. |
| APPEND-not-flip | ✅ | `transition-all` already present in the base — eases both existing `hover:bg-muted` (inactive) and new scale. |
| OUTWARD `ring-ring` (not ring-inset) | ✅ | `overflow-x-auto` sets overflow-x only (overflow-y stays visible); `gap-2` horizontal clearance between `shrink-0` pills; parent is NOT `overflow-hidden` rounded card. Ring extends into the gap against neutral page bg. |
| NO aria-label | ✅ | Visible text `{b.name}` + optional `Globe2` icon. |
| NO `aria-expanded` | ✅ | Not an expandable disclosure. |

**Diff counts:** 1 className APPEND, 1 new `aria-pressed` attr, 0 logic lines, 0 transition flips, 0 ring-inset.

## (3) Inventory — exhaustive ✅

| Control | Type | Action |
|---------|------|--------|
| Board pill (L159) | RAW `<button>` | **EDITED** — aria-pressed + scale + ring |
| Back (L129) | shadcn `<Button aria-label="Back">` | SKIP — ships tokens, labeled |
| Hero stat (L142) | `motion.div` | Presentational (entrance anim, NO onClick) ✅ |
| Entry rows (L202) | `motion.div` ×N | Presentational (entrance anim, NO onClick) ✅ |
| Top-3 `ring-1 ring-amber-500/20` | decorative | NOT a focus ring — leave ✅ |
| "You" badge | `<span>` | Non-interactive text badge ✅ |
| Skeletons (L154, L180) | `animate-pulse` divs | Non-interactive ✅ |
| Empty-state (L183) | card with Trophy | Non-interactive ✅ |
| Period/reset meta (L173) | text + Calendar/Clock icons | Non-interactive ✅ |

No hidden interactive controls found. Entry rows have NO tap-through — presentational only (FLAG for owner, see §4).

## (4) Responsive 375/768/1280 — clean ✅

- **Body:** `max-w-2xl mx-auto px-4` (672px cap).
- **Header:** Back `h-10 w-10` + Trophy badge `h-7 w-7` + title — fits at 375.
- **Hero stat:** `text-4xl` rank + `p-5` within `rounded-2xl` — fits at 375.
- **Board pill row:** `flex gap-2 overflow-x-auto scrollbar-hide` with `shrink-0` pills — scrolls, never crushes.
- **Period/reset meta:** `text-[11px]` inline flex with `·` separator — wraps gracefully.
- **Entry row:** rank tile `w-8` (32px) + avatar `h-9 w-9` (36px) + `flex-1 min-w-0` name `line-clamp-1` + score `tabular-nums` — `min-w-0` prevents overflow; at 375 the total is ~32 + 8 + 36 + 8 + ~flex + ~score ≈ fine within 343px content width.

**Sub-44px tap targets (FLAG, repo-wide pattern):**
- Back `h-10 w-10` = 40px
- Board pills `py-1.5` ≈ 28px tall

Both are repo-wide compact patterns, not introduced here.

## (5) Owner flags (logic / out of scope — FLAG not fix)

1. **`supabase as unknown as {…}` hand-rolled casts ×3 queries** — clean up when types regenerate.
2. **`.or()` CSV interpolation** in the profiles query (`id.in.(${csv}),user_id.in.(${csv})`) — the UUIDs come from DB-sourced `leaderboard_entries.user_id`, so injection risk is low, but string interpolation into a Supabase filter is worth noting for a future parameterized approach.
3. **Top-50 cap** — the entries query `.limit(50)` means `myRank` falls back to `findIndex` within those 50. A user ranked outside the top 50 shows `myRank = null` → hero displays "—". If rank visibility beyond top-50 matters, a separate count/rank query is needed.
4. **`formatRelative` bug** (L34): both branches of `< 86_400_000` return `"today"` regardless of sign — the `ms > 0` vs `ms < 0` distinction is lost. Minor display issue, pre-existing, not introduced here.
5. **Entry rows have no tap-through** to a user profile — fully presentational. If profile drill-down is desired, that's a product decision.
6. **`user` from `useAuth`** used only for "You" highlighting + `myRank` — if signed out, `myEntry` is undefined, `myRank` is null, hero shows "—". No auth gate blocks the page (public leaderboard viewing). Correct behavior.

## Summary

**The edit is correct as-applied.** Exactly 1 RAW `<button>` edited (aria-pressed + `[0.97]` scale + outward ring appended onto existing `transition-all`). 0 logic lines touched. Inventory exhaustive. Responsive clean. `npm run update` must pass green before marking Done.
