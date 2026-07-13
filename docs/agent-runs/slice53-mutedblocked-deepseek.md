# DeepSeek run — 2026-06-14T05:31:16.897Z

- model: deepseek-chat
- task: Premium interaction + a11y QA on ONE customer-facing page: src/pages/MutedBlockedUsersPage.tsx (182 lines, "Manage muted + blocked users", REAL Supabase user_safety_actions + public_profiles, AUTH-aware via useAuth [user.id scopes query]). Two useQuery: ["user-safety-actions", user.id] (own rows, order created_at desc, enabled !!user.id), ["user-safety-profiles", targetIds] (name/avatar lookup). useState tab ("all"|"mute"|"block"). useMemos targetIds/profileMap/stats/filtered. undo(id) = OPTIMISTIC qc.setQueryData filter-out → supabase.functions.invoke("user-safety-action-manage", {operation:"remove"}) → on error toast + invalidateQueries rollback, else toast.success. Layout: SwipeBackContainer + SEOHead noIndex; sticky header (shadcn back <Button> + ShieldOff badge + title); gradient hero stat motion.div (count, NO onClick); a 3-button segmented filter row (flex gap-2, each flex-1: All/Muted(n)/Blocked(n)); loading skeletons; empty-state card; then list of action rows (each presentational motion.div [entrance anim, NO onClick]: avatar/initials + name + Blocked/Muted badge + relative time + an Undo button).

Reference standard: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring). Precedent: ReelEffects/Leaderboards/AutoMessages segmented filter (ADD aria-pressed + APPEND active:scale-[0.97] + ring, APPEND-not-flip since transition-all already present). FlightPriceAlerts/PushDevices RING-ONLY don't-churn precedent (a button ALREADY having active:scale + transition gets the ring ONLY — do NOT renumber the scale, do NOT re-flip).

VERIFIED FACTS (full line-by-line read): exactly 4 RAW <button type="button"> (3 filter tabs L133/134/135 + 1 Undo L171) + 1 shadcn back <Button> (L111). 0 motion.button. The action rows L155 are motion.div with NO onClick (presentational). Hero stat motion.div L124 NO onClick.
- shadcn back <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full"> (L111) => SKIP (ships tokens, labeled).
- (A) 3 filter tabs (L133/134/135, RAW): onClick setTab("all"|"mute"|"block"), VISIBLE constant label word (All / Muted(n) / Blocked(n)), selection conveyed by BACKGROUND (active "bg-ig-gradient text-white shadow-sm" / inactive "bg-secondary text-foreground hover:bg-muted"). cn() base BEFORE: "flex-1 h-10 rounded-xl text-xs font-bold transition-all". Each flex-1 in "flex gap-2" row.
- (B) Undo button (L171, RAW): onClick undo(a.id) [one-shot OPTIMISTIC restore], VISIBLE text+RotateCcw icon, small chip h-8 px-3 rounded-full. className BEFORE: "h-8 px-3 rounded-full bg-secondary hover:bg-muted text-foreground text-xs font-bold inline-flex items-center gap-1 active:scale-95 transition-all". ALREADY has active:scale-95 + transition-all + hover:bg-muted.

TOKEN TIERS (this repo): wide/primary/cards active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. transition-all when control ALSO has hover bg/color/opacity; transition-transform for PURE press-scale. APPEND-not-flip when transition-all already present. DON'T-CHURN: a button already having active:scale + transition gets ring ONLY (no renumber, no re-flip, no duplicate scale). aria-pressed ONLY for persistent toggle/segmented/filter conveyed by bg/color (constant label word per button qualifies; varying count badge does NOT disqualify) — NOT one-shot action. ring-inset ONLY when flush inside overflow-hidden rounded PARENT; OUTWARD default.

HARD RULE: className + display-only attr (aria-*) ONLY. Do NOT change any onClick / setTab / undo / supabase.functions.invoke / qc.setQueryData / useQuery / useMemo / useState / useAuth / any logic. Do NOT add onClick to a no-op control (FLAG it).

EDITS APPLIED (validate exact):
(A) 3 filter tabs (L133/134/135): ADD aria-pressed={tab === "all"|"mute"|"block"} + APPEND active:scale-[0.97] (segmented tier) + ring to each cn() base. APPEND-not-flip (transition-all already present). aria-pressed VALID (persistent single-select filter, bg-conveyed, constant label word per button; tab defaults to "all" so one always pressed). NO aria-label (visible text). OUTWARD ring-ring. NEW base each: "flex-1 h-10 rounded-xl text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring".
(B) Undo button (L171): RING-ONLY append " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring". KEEP active:scale-95 (don't renumber — valid small-chip press), KEEP transition-all (already eases hover:bg-muted + scale), NO aria-pressed (one-shot optimistic restore). OUTWARD ring-ring. NEW: "h-8 px-3 rounded-full bg-secondary hover:bg-muted text-foreground text-xs font-bold inline-flex items-center gap-1 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring".

QUESTIONS:
(1) 3 filter tabs (A): ADD aria-pressed + APPEND active:scale-[0.97] (segmented tier) + ring, APPEND-not-flip? aria-pressed VALID for bg-conveyed single-select filter with constant per-button label word (count in parens does NOT disqualify)? OUTWARD ring-ring for the flex gap-2 row?
(2) Undo (B): RING-ONLY correct (don't-churn — already has active:scale-95 + transition-all)? KEEP scale-95 not renumber to [0.97] (it's a small h-8 chip — is scale-95 acceptable or should it be [0.97]/[0.98]? It's pre-existing — don't-churn says keep)? NO aria-pressed (one-shot)? OUTWARD ring-ring?
(3) Inventory exhaustive (4 RAW + 1 shadcn back)? hero stat motion.div L124 + each action motion.div L155 correctly presentational (NO onClick)? skeletons L138 + empty-state L140 non-interactive? The Blocked/Muted badge + avatar correctly LEFT (decorative)?
(4) Responsive 375/768/1280: header; hero stat (text-3xl); the 3 flex-1 tabs (do "Muted (n)"/"Blocked (n)" labels crush @375?); the action row (avatar h-10 w-10 + flex-1 min-w-0 name/badge + time + Undo chip). Any crush @375? sub-44px tap targets to FLAG (back h-10 40px; tabs h-10 40px; Undo h-8 32px)?
(5) Owner flags (logic/out of scope, FLAG not fix): supabase cast type-workarounds (×2 queries); the profiles .or() with CSV id.in/user_id.in (DB-sourced UUIDs, low risk, flag); undo is optimistic with rollback (correct?); the action rows have no tap-through to profile; anything else?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/MutedBlockedUsersPage.tsx

---

## Plan

The page already has the correct edits applied in the source you provided. The diff is **already in the file** — no changes needed.

## Verification per question

**(1) Filter tabs (A):** ✅ **Already correct.** Each tab has:
- `aria-pressed={tab === "all"|"mute"|"block"}` ✅
- `active:scale-[0.97]` (segmented tier) ✅
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ✅
- `transition-all` preserved (APPEND-not-flip) ✅
- `aria-pressed` valid (bg-conveyed single-select, constant label word, count in parens supplementary) ✅
- OUTWARD `ring-ring` correct (flex gap-2 row, not overflow-hidden) ✅

**(2) Undo button (B):** ✅ **Already correct.**
- RING-ONLY: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` appended ✅
- `active:scale-95` KEPT (don't-churn — pre-existing, valid small-chip press) ✅
- `transition-all` KEPT (already eases hover + scale) ✅
- NO `aria-pressed` (one-shot optimistic restore) ✅
- OUTWARD `ring-ring` ✅

**(3) Inventory:** ✅ **Exhaustive — 4 RAW + 1 shadcn back, all accounted for.**
- Hero stat `motion.div` L124: NO onClick → presentational ✅
- Action rows `motion.div` L155: NO onClick → presentational ✅
- Skeletons L138 + empty-state L140: non-interactive ✅
- Badges/avatars: decorative ✅

**(4) Responsive 375/768/1280:** ✅ **Clean.**
- Header: Back `h-10 w-10` + badge `h-7 w-7` + title fits ~343px
- Hero stat: `text-3xl` + breakdown line wraps fine
- 3 tabs: `flex-1 h-10` each at ~107px — "Muted (n)" and "Blocked (n)" fit without crush (worst case "Blocked (99)" ≈ 90px)
- Action row: avatar `h-10 w-10` + `flex-1 min-w-0` name/badge wraps + time + Undo `h-8` chip — all fit
- **Sub-44px flags:** Back `h-10` (40px), tabs `h-10` (40px), Undo `h-8` (32px) — repo-wide compact pattern, not introduced here

**(5) Owner flags (logic/out of scope):**
- `supabase as unknown as {…}` hand-rolled casts (×2 queries) — clean up when types regenerate
- Profiles `.or()` with CSV string interpolation — DB-sourced UUIDs, low risk
- Undo is optimistic with rollback — correct pattern (matches FlightPriceAlerts)
- Action rows have no tap-through to profile — existing behavior
- `staleTime: 30_000` / `60_000` — existing, reasonable

## Result

**No diff needed.** The file at `src/pages/MutedBlockedUsersPage.tsx` already has all edits applied correctly. The page is ready for `npm run update` verification and owner commit.
