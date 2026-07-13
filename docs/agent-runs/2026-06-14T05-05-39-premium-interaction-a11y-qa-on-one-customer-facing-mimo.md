# MiMo run — 2026-06-14T05:05:39.383Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + a11y QA on ONE customer-facing page: src/pages/MutedChatsPage.tsx (143 lines, "Chats you've muted (notifications silenced)", REAL Supabase muted_conversations table + supabase.functions.invoke("muted-conversation-manage") edge fn — NOT mock; AUTH-GATED via useAuth). Backed by one useQuery ["muted-conversations", user?.id] from muted_conversations (.select/.eq("user_id", user.id)/.order("created_at" desc), enabled !!user?.id). unmute(id) = OPTIMISTIC qc.setQueryData (filter out the row) -> functions.invoke("muted-conversation-manage", {body:{action:"unmute", mute_id:id}}) -> on error toast.error + qc.invalidateQueries (rollback); else toast.success. stats useMemo (total/indefinite/expiring/expired). formatRelative util. Layout: SwipeBackContainer + SEOHead noIndex; sticky header (shadcn back <Button> + VolumeX badge + "Muted Chats" title); gradient hero stat motion.div ({stats.total} silenced + indefinite/timed counts, NO onClick); loading skeletons; empty-state card; then a list of mute rows (each presentational motion.div [entrance anim, NO onClick] containing: a VolumeX icon tile + a flex-1 column [conversation_id truncated + muted-until/expired meta] + a RAW "Unmute" button). NO bottom nav.

Reference standard for tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): exactly 1 RAW <button type="button"> (the Unmute pill) + 1 shadcn back <Button>. 0 motion.button.
- shadcn back <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={navigate(-1)}> (L85) => SKIP (ships tokens, labeled).
- (A) Unmute button (L132, RAW, pill): onClick={() => unmute(m.id)}, VISIBLE TEXT "Unmute" + a Volume2 icon, className "h-8 px-3 rounded-full bg-secondary hover:bg-muted text-foreground text-xs font-bold inline-flex items-center gap-1 active:scale-95 transition-all" — ALREADY HAS active:scale-95 + transition-all + hover:bg-muted, NO ring. Sits right-aligned in the per-mute-row flex (the row is "flex items-center gap-3 p-3 rounded-2xl bg-card border" — NOT overflow-hidden).

TOKEN TIERS (this repo): wide/primary/cards/full-width active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. transition-all when the control ALSO has hover:bg/text/opacity OR underline; transition-transform for PURE press-scale with NO hover. DON'T-CHURN: if a raw button ALREADY has active:scale + a transition, ADD ring (+aria) ONLY — do NOT renumber a valid existing scale, do NOT re-flip an existing valid transition. aria-pressed ONLY for persistent toggle/segmented/filter state conveyed by bg/color — NOT for one-shot actions. ring-inset ONLY when flush inside an overflow-hidden rounded PARENT; OUTWARD default.

HARD RULE: className + display-only attr (aria-*) ONLY. Do NOT change any onClick / unmute / qc.setQueryData / functions.invoke / qc.invalidateQueries / navigate / useQuery / useMemo / useAuth / any logic. Do NOT add onClick to a no-op control (FLAG it).

MY PLAN -- validate or correct:

(A) Unmute button (L132; RAW pill; ALREADY active:scale-95 + transition-all + hover:bg-muted; working onClick unmute): RING-ONLY (DON'T-CHURN) -> append " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring". KEEP active:scale-95 (DON'T renumber to [0.97] even though it's a pill — don't-churn protects a valid pre-existing scale; matches the ReactionPacks Get-pill precedent that kept scale-95 ring-only), KEEP transition-all (eases hover:bg-muted + the press). NO aria-label (visible "Unmute" text). NO aria-pressed (one-shot action — the row is optimistically removed from the list on unmute, NOT a persistent toggle). OUTWARD ring (pill right-aligned in the per-row flex inside the bg-card list card, NOT overflow-hidden → ring-ring on the neutral surface).

QUESTIONS:
(1) Unmute button (A): RING-ONLY don't-churn (pre-existing active:scale-95 + transition-all)? KEEP active:scale-95 (don't renumber a pill to [0.97] — don't-churn protects the valid existing scale, ReactionPacks-Get precedent)? Or advise renumber to [0.97]? I lean KEEP-95.
(2) NO aria-pressed (one-shot unmute — the row is removed from the DOM optimistically, NOT a persistent toggle)? Confirm.
(3) Inventory exhaustive (1 RAW Unmute pill + 1 shadcn back)? hero stat motion.div L98 + mute-row motion.div L121 correctly presentational (NO onClick)? loading skeletons L106 + empty-state L108 non-interactive?
(4) Responsive 375/768/1280: header; hero stat; mute row (VolumeX tile 40px + flex-1 [conversation_id line-clamp-1 + meta] + the Unmute pill h-8). Any crush @375 (the flex row with a right-aligned Unmute pill alongside a truncating conversation_id)? sub-44px tap targets to FLAG (back h-10 40px; Unmute h-8 32px)?
(5) Owner flags (logic/out of scope, FLAG not fix): the mute row shows a raw truncated conversation_id (no human-readable chat name — no join to the conversation, existing data shape); the row has no tap-through to the chat; the supabase cast type-workaround; the optimistic unmute rolls back via invalidateQueries; anything else?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/MutedChatsPage.tsx

---

## Validation

Your plan is **correct as-is**. All five answers are affirmatives; no corrections needed.

### (1) Unmute — RING-ONLY, KEEP `active:scale-95`

**Yes, KEEP `scale-95`.** Don't-churn protects a valid pre-existing scale. The pill tier is `[0.97]` for *new* scales; when a button already ships a value within the valid range, renumbering is pure noise. Matches the ReactionPacks Get-pill, BugReports-Submit, and TaxInfo-Download-PDF precedents exactly.

The `className` before → after:

```
"h-8 px-3 rounded-full bg-secondary hover:bg-muted text-foreground text-xs font-bold inline-flex items-center gap-1 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

Three tokens **appended** (all one word-group at the end): `focus-visible:outline-none`, `focus-visible:ring-2`, `focus-visible:ring-ring`. Everything else byte-identical.

### (2) NO `aria-pressed` — confirmed

One-shot unmute; the row is optimistically removed from the list (`setQueryData` filters it out). It's not a persistent toggle — `aria-pressed` would be misleading.

### (3) Inventory exhaustive — confirmed

| Instance | Type | Decision |
|---|---|---|
| Back `Button` L85 | shadcn, `aria-label="Back"`, `h-10 w-10` | SKIP — ships tokens + labeled |
| Unmute `button` L132 | RAW pill, visible "Unmute" text, `onClick={unmute}` | **EDIT — ring-only** |
| Hero stat `motion.div` L98 | `initial`/`animate`, NO onClick | Presentational — SKIP |
| Mute-row `motion.div` L121 | `initial`/`animate`, NO onClick | Presentational — SKIP |
| Skeletons L106 | `animate-pulse` divs | Non-interactive — SKIP |
| Empty-state L108 | `rounded-2xl border bg-card p-8` | Non-interactive — SKIP |

All icons (`VolumeX`, `Volume2`, `MessageSquare`, `Clock`, `Sparkles`) — decorative/non-interactive.

### (4) Responsive — clean, with two tap-target flags

At 375px the mute row (`flex items-center gap-3 p-3`) holds the VolumeX tile (40px), a `flex-1 min-w-0` column (`line-clamp-1` truncates the conversation_id), and the Unmute pill (`h-8` auto-width ~75px). The `gap-3` (12px) + `min-w-0` prevent crush — the ID truncates before the pill is pushed off. At 768/1280 same layout wider within `max-w-2xl`.

**Owner flags (tap targets):**
- **Back button `h-10 w-10` (40px)** — sub-44px. Repo-wide compact pattern, not introduced here.
- **Unmute button `h-8` (32px)** — sub-44px. Repo-wide compact pattern, not introduced here.

### (5) Owner flags (logic / out of scope — FLAG not fix)

**(a)** The mute row shows a raw truncated `conversation_id` (no human-readable chat name — no join to the `conversations` table). Existing data shape.  
**(b)** The row has no tap-through to the chat (the `motion.div` is purely presentational). Existing behavior.  
**(c)** `supabase as unknown as {…}` hand-rolled cast for `muted_conversations`. Clean up when types regenerate.  
**(d)** The optimistic unmute rolls back on error via `qc.invalidateQueries` + `toast.error`. Correct pattern — no confirm step on the single-tap unmute (existing logic).  
**(e)** The muted-row `motion.div` carries `border-border` (not `border-border/40`) — minor visual inconsistency with other list pages that use `/40` opacity. Not introduced here.

---

## Proposed change

**File:** `src/pages/MutedChatsPage.tsx` — **1 edit, 3 tokens appended, 0 logic**

```diff
-                  <button type="button" onClick={() => unmute(m.id)} className="h-8 px-3 rounded-full bg-secondary hover:bg-muted text-foreground text-xs font-bold inline-flex items-center gap-1 active:scale-95 transition-all">
+                  <button type="button" onClick={() => unmute(m.id)} className="h-8 px-3 rounded-full bg-secondary hover:bg-muted text-foreground text-xs font-bold inline-flex items-center gap-1 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**What this does:** Adds keyboard focus visibility (outward ring on the neutral `bg-card` mute-row surface) to the only interactive control that was missing it. No scale renumbering, no transition flip, no new ARIA attributes, no logic touched.

### What the owner must verify

1. **`npm run update`** — must pass (type-check + worker type-check + production build, exit 0).
2. **Visual check at 375/768/1280** — Tab through the page; the Unmute pill should show a visible ring on keyboard focus only (not on mouse click). The ring is outward on the `bg-card` row surface.
3. **Functional check** — Unmute still fires the optimistic removal + `functions.invoke("muted-conversation-manage")` edge call + toast. No regression to the `setQueryData` / `invalidateQueries` flow.
