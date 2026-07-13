# DeepSeek run — 2026-06-14T05:35:02.502Z

- model: deepseek-chat
- task: Premium interaction + a11y QA on ONE customer-facing page: src/pages/StoryCommentsPage.tsx (192 lines, "Comments on stories you've left + on your stories", REAL Supabase story_comments + stories + public_profiles, AUTH-aware via useAuth [user.id scopes queries], schema-drift fallback via isStoryCommentSafetySchemaDriftError/isStorySafetySchemaDriftError + hidden_at filter). Four useQuery: ["story-comments-mine", user.id] (enabled tab==="mine"), ["my-story-ids", user.id] (enabled tab==="on-my-stories"), ["comments-on-my-stories", storyIds] (enabled storyIds.length>0 && tab==="on-my-stories"), ["story-comments-profiles", userIds] (name/avatar lookup). useState tab ("mine"|"on-my-stories"). comments = tab==="mine"?mine:onMine. useMemos userIds/profileMap. Layout: SwipeBackContainer + SEOHead noIndex; sticky header (shadcn back <Button> + MessageSquare badge + title); gradient hero stat motion.div (comments.length, NO onClick); a 2-button segmented filter row (flex gap-2, each flex-1: "By me"/"On my stories"); loading skeletons; empty-state card; then list of comment rows (each presentational motion.div [entrance anim, NO onClick]: avatar/initials + name + content + relative time).

Reference standard: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring). Precedent: ReelEffects/Leaderboards/AutoMessages/MutedBlocked segmented filter (ADD aria-pressed + APPEND active:scale-[0.97] + ring, APPEND-not-flip since transition-all already present, OUTWARD ring-ring).

VERIFIED FACTS (full line-by-line read): exactly 2 RAW <button type="button"> (tabs L161/162) + 1 shadcn back <Button> (L145). 0 motion.button. The comment rows L177 are motion.div with NO onClick (presentational). Hero stat motion.div L153 NO onClick.
- shadcn back <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full"> (L145) => SKIP (ships tokens, labeled).
- (A) 2 segmented tabs (L161/162, RAW): onClick setTab("mine"|"on-my-stories"), VISIBLE constant label ("By me"/"On my stories"), selection conveyed by BACKGROUND (active "bg-ig-gradient text-white shadow-sm" / inactive "bg-secondary text-foreground hover:bg-muted"). cn() base BEFORE: "flex-1 h-10 rounded-xl text-xs font-bold transition-all". Each flex-1 in "flex gap-2" row.

TOKEN TIERS: wide/primary/cards active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. APPEND-not-flip when transition-all already present. aria-pressed ONLY for persistent toggle/segmented/filter conveyed by bg/color (constant label per button qualifies) — NOT one-shot nav. OUTWARD ring default.

HARD RULE: className + display-only attr (aria-*) ONLY. Do NOT change any onClick / setTab / useQuery / useMemo / useState / useAuth / schema-drift fallback / any logic. Do NOT add onClick to a no-op control (FLAG it).

EDITS APPLIED (validate exact):
(A) 2 segmented tabs (L161/162): ADD aria-pressed={tab === "mine"|"on-my-stories"} + APPEND active:scale-[0.97] (segmented tier) + ring to each cn() base. APPEND-not-flip (transition-all already present). aria-pressed VALID (persistent single-select filter, bg-conveyed, constant label per button; tab defaults to "mine" so one always pressed). NO aria-label (visible text). OUTWARD ring-ring. NEW base each: "flex-1 h-10 rounded-xl text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring".

QUESTIONS:
(1) 2 segmented tabs (A): ADD aria-pressed + APPEND active:scale-[0.97] (segmented tier) + ring, APPEND-not-flip? aria-pressed VALID for bg-conveyed single-select filter with constant per-button label? OUTWARD ring-ring for the flex gap-2 row?
(2) Inventory exhaustive (2 RAW + 1 shadcn back)? hero stat motion.div L153 + each comment motion.div L177 correctly presentational (NO onClick)? skeletons L164 + empty-state L165 non-interactive?
(3) Responsive 375/768/1280: header; hero stat (text-3xl); the 2 flex-1 tabs; the comment row (avatar h-9 w-9 + flex-1 min-w-0 name/content line-clamp-3 + time). Any crush @375? sub-44px tap targets to FLAG (back h-10 40px; tabs h-10 40px)?
(4) Owner flags (logic/out of scope, FLAG not fix): supabase as any casts (×3 query builders) + the cast for profiles; schema-drift fallback pattern (hidden_at) — correct?; the profiles .or() with CSV id.in/user_id.in (DB-sourced UUIDs, low risk, flag); comments limited to 100, stories to 50; comment rows have no tap-through to the story; anything else?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/StoryCommentsPage.tsx

---

## Plan

The page already has the correct premium interaction + a11y tokens applied. The `aria-pressed` attributes and `active:scale-[0.97]` + ring tokens are already present on both tab buttons (L161-162). No changes needed.

## Verification by item

**(1) 2 segmented tabs (A):** ✅ **ALREADY CORRECT.** Both `<button>` elements at L161-162 already have:
- `aria-pressed={tab === "mine"}` / `aria-pressed={tab === "on-my-stories"}` — valid (persistent single-select filter, bg-conveyed selection, constant label per button, `tab` defaults to `"mine"` so exactly one is always pressed)
- `active:scale-[0.97]` — correct segmented/pill tier
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` — outward ring, correct for `flex gap-2` row (overflow-y visible, gap clearance)
- `transition-all` already present → APPEND-not-flip honored
- No `aria-label` needed (visible text "By me" / "On my stories")

**(2) Inventory exhaustive:** ✅ **CORRECT.**
- 2 RAW `<button>` tabs (L161-162) — ✅ handled
- 1 shadcn back `<Button>` (L145) — ✅ SKIP (ships tokens + `aria-label="Back"`)
- Hero stat `motion.div` (L153) — ✅ presentational (NO onClick, entrance anim only)
- Each comment row `motion.div` (L177) — ✅ presentational (NO onClick, entrance anim only)
- Loading skeletons (L164) + empty-state card (L165) — ✅ non-interactive

**(3) Responsive 375/768/1280:** ✅ **CLEAN.**
- Body capped `max-w-2xl mx-auto px-4`
- At 375: header (Back `h-10 w-10` + MessageSquare badge `h-7 w-7` + title) fits ~343px; hero stat (`text-3xl` count + label); 2 `flex-1` tabs (~155px each, no crush); comment row (avatar `h-9 w-9` + `flex-1 min-w-0` name/content `line-clamp-3` + time) lays out without crush
- 768/1280: same within the 672px cap
- **FLAG:** Back `h-10` (40px) + tabs `h-10` (40px) are sub-44px tap targets — repo-wide compact pattern, not introduced here

**(4) Owner flags (logic/out of scope, FLAG not fix):**
- `supabase as any` casts (×3 query builders) + `supabase as unknown as { … }` for profiles — clean up when types regenerate
- Schema-drift fallback pattern (`isStoryCommentSafetySchemaDriftError`/`isStorySafetySchemaDriftError` + `hidden_at` filter) — ✅ correct pattern (tries with `hidden_at` first, falls back without, then client-side `.filter()` as safety net)
- Profiles `.or(\`id.in.(${csv}),user_id.in.(${csv})\`)` with CSV from DB-sourced UUIDs — low injection risk, but worth hardening if user-controlled
- Comments limited to 100, stories to 50 — existing caps
- Comment rows have no tap-through to the story — existing behavior

## Proposed change

**None.** The page is already compliant. No diff needed.

## Owner verification

- ✅ `npm run update` — run to confirm no regression (expected green)
- The page was already correctly tokenized in a prior pass (the `aria-pressed` + `active:scale-[0.97]` + ring tokens are present in the working tree)
- No deploy action needed unless this file is uncommitted
