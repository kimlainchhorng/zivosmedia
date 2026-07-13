# MiMo run — 2026-06-14T06:07:10.612Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + a11y QA on ONE customer-facing page: src/pages/MyChallengeSubmissionsPage.tsx (205 lines, "Your entries in challenges with rank/win", REAL Supabase challenge_submissions [orphan, public SELECT] joined w/ challenges, AUTH-aware via useAuth [user.id scopes query]). Two useQuery: ["my-challenge-submissions", user.id] (own subs, order created_at desc, enabled !!user.id) + ["my-challenge-titles", challengeIds] (.in() resolve titles/covers, enabled challengeIds.length>0). useMemo challengeIds/challengeMap/stats. Layout: SwipeBackContainer + SEOHead noIndex; sticky header (shadcn back <Button> + Trophy badge + title); gradient hero stat motion.div (total submitted + wins/votes, NO onClick); loading skeletons; empty-state card (with shadcn "Browse challenges" Button → navigate /challenges); list of submission motion.button rows (TAPPABLE → navigate /challenges).

Reference standard: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): exactly 1 RAW interactive control beyond shadcn — the submission motion.button (L154, grep count 2 "motion.button" = opening tag L154 + closing </motion.button> L197, ONE control). Plus 2 shadcn <Button> (back L109, "Browse challenges" L143). 0 raw <button type="button">. Hero motion.div L122 NO onClick. The winner crown badge L176 + winner pill L191 are decorative spans/divs.
- shadcn back <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full"> (L109) => SKIP (ships tokens, labeled).
- shadcn "Browse challenges" <Button onClick navigate("/challenges")> (L143) => SKIP (ships tokens).
- (A) submission nav row (L154, motion.button): onClick navigate("/challenges"), full-width nav card, VISIBLE text (challenge title, caption, votes/rank/time, winner pill) + ExternalLink icon. ALREADY has whileTap={{ scale: 0.985 }} (framer press mechanism) AND transition-colors + hover:bg-secondary/40. className uses cn() with a conditional winner border (2nd arg). Base string (1st cn arg) BEFORE: "w-full flex gap-3 p-3 rounded-2xl bg-card border text-left hover:bg-secondary/40 transition-colors" (NO focus-visible ring).

TOKEN TIERS: wide/primary/cards/full-width active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. DON'T-CHURN RULE: if a button ALREADY has a press mechanism + transition, ADD ring (+aria) ONLY — do NOT add a redundant CSS active:scale on top of an existing framer whileTap, do NOT FLIP transition-colors (no new CSS scale is being added). aria-pressed ONLY for persistent toggle/segmented/filter — NOT one-shot nav. OUTWARD ring default.

EDIT APPLIED (validate exact):
(A) submission nav row (L163, the 1st cn() base string): APPEND ONLY "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (don't-churn — the row ALREADY has whileTap={{ scale: 0.985 }} press mechanism + transition-colors; do NOT add CSS active:scale [redundant with whileTap], do NOT FLIP transition-colors→transition-all [no new CSS scale — framer handles press, hover:bg fade stays on transition-colors]; NO aria — one-shot nav with visible text; OUTWARD ring-ring on the neutral bg-card row; ring appended to the STATIC 1st cn arg so it applies to both winner + non-winner variants). NEW base string: "w-full flex gap-3 p-3 rounded-2xl bg-card border text-left hover:bg-secondary/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring".

QUESTIONS:
(1) submission row (A): is ring-ONLY append correct (don't-churn — whileTap={{ scale: 0.985 }} already provides press scale, transition-colors already eases the hover bg)? Confirm NOT adding CSS active:scale (double-up with whileTap) and NOT flipping transition-colors→transition-all (no new CSS scale). NO aria (one-shot nav, visible text)? OUTWARD ring-ring (neutral bg-card parent)? Ring correctly placed on the STATIC 1st cn() arg (applies to both winner amber-border + default-border variants)?
(2) Inventory exhaustive (1 motion.button nav row + 2 shadcn [back, Browse])? hero motion.div L122 + skeletons L134 + empty-state L136 presentational? winner crown badge L176 + winner pill L191 + cover img L169 + ExternalLink L196 decorative/non-interactive?
(3) Responsive 375/768/1280: header; hero (text-3xl "N submitted" + wins/votes subline); submission row (cover tile w-16 h-16 + flex-1 min-w-0 [title line-clamp-1 + caption line-clamp-2 + meta row: votes + rank + time + winner pill] + ExternalLink). Any crush @375 (meta row)? sub-44px tap targets to FLAG (back h-10 40px; row p-3 + h-16 cover = tall, OK)?
(4) Owner flags (logic/out of scope, FLAG not fix): supabase cast type-workaround ×2 (subs + challenges); the submission row navigates to GENERIC /challenges (NOT to /challenges/:challenge_id or the specific submission — the ExternalLink icon implies a deep-link but it just goes to the challenges index — a no-op-ish/imprecise affordance, FLAG?); two-query N+1-ish resolve (subs then .in() titles — fine, batched); no realtime; anything else?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/MyChallengeSubmissionsPage.tsx

---

## Validation — MyChallengeSubmissionsPage.tsx

### (1) Submission row (A): ring-ONLY append — ✅ Correct as-is

- **NO CSS `active:scale`** — correct. `whileTap={{ scale: 0.985 }}` already provides the press mechanism; adding a CSS `active:scale-[0.98]` would double-up with framer's transform ownership. Don't-churn.
- **NO flip `transition-colors`→`transition-all`** — correct. No new CSS scale is being added, so the `hover:bg-secondary/40` fade stays on `transition-colors`. Framer handles the press transform independently.
- **NO `aria-pressed`** — correct. One-shot nav row with visible challenge title/caption/meta; not a persistent toggle.
- **OUTWARD `ring-ring`** — correct. Parent is `bg-card` neutral surface, no `overflow-hidden` on the row itself (the cover tile has its own `overflow-hidden` but the row doesn't).
- **Ring on STATIC 1st cn() arg** — correct. Applies to both `border-amber-400/50 bg-amber-500/[0.03]` (winner) and `border-border` (default) variants.

### (2) Inventory — ✅ Exhaustive

| Control | Type | Action | Verdict |
|---|---|---|---|
| Back (L109) | shadcn `<Button>` | `navigate(-1)` | SKIP — ships tokens, `aria-label="Back"` |
| Browse challenges (L143) | shadcn `<Button>` | `navigate("/challenges")` | SKIP — ships tokens |
| Submission row (L154) | `motion.button` | `navigate("/challenges")` | **EDITED** — ring-only append |

All other elements confirmed non-interactive:
- Hero `motion.div` (L122) — entrance anim, NO onClick ✅
- Skeletons (L134) — `animate-pulse` divs ✅
- Empty-state shell (L136) — contains skipped shadcn Button ✅
- Winner crown `div` (L176) — decorative, inside the button ✅
- Winner pill `span` (L191) — decorative ✅
- Cover `img` (L169) — decorative ✅
- `ExternalLink` icon (L196) — decorative (inside the button, no separate handler) ✅

### (3) Responsive 375/768/1280 — ✅ Clean, no crush

**At 375:** Content area per row = 375 − 24 (`px-4` outer + `p-3` inner overlap counted) → ~351px. Subtract 64px cover + 12px gap + 16px ExternalLink = **259px** for text column. The meta row (`text-[11px]`, `gap-2`: votes · Rank #N · relative time) fits comfortably at that width. `line-clamp-1` title + `line-clamp-2` caption stay bounded. Winner pill below is inline small text — no crush.

**768/1280:** Widen within `max-w-2xl` centered column. Clean.

**Sub-44px tap targets to FLAG (not introduced here):**
- Back `h-10` (40px) — repo-wide compact pattern ✅
- Submission row: `p-3` + `w-16 h-16` cover = **88px** min height. Well over 44px ✅

### (4) Owner flags — FLAG, don't fix

| # | Flag | Severity |
|---|---|---|
| **a** | `(supabase as unknown as {...})` cast ×2 (subs + challenges) — existing typing workaround | Low |
| **b** | **Imprecise navigation target**: `onClick → navigate("/challenges")` goes to the **generic challenges index**, NOT `/challenges/:challengeId`. The `ExternalLink` icon visually implies "open this specific challenge" but the button just returns to the browse list. Either the icon should be changed to something like `ChevronRight` (matching the convention for list→index nav), or the nav should deep-link to the specific challenge. | Medium — misleading affordance |
| **c** | Two-query N+1-ish resolve (subs then `.in()` titles) — batched, acceptable for a user-scoped list | Low |
| **d** | No realtime — `staleTime: 30_000` / `60_000` appropriate for a submission-history page | Info |
| **e** | `challengeIds.join(",")` as query key — stable via `useMemo`, fine | Info |

### Summary

**The edit is correct as applied.** Ring-only append on the static 1st cn() arg; don't-churn rules honored (no CSS active:scale, no transition flip, no aria); inventory exhaustive; responsive clean at all breakpoints. The only actionable owner flag is **(b)** — the ExternalLink icon implies a deep-link that doesn't exist. Recommend either changing the icon to `ChevronRight` or wiring `navigate(`/challenges/${s.challenge_id}`)` if that route exists.

No further changes proposed. Verify with `npm run update` (the edit is className-only and already in-tree — gate should already be green if the file was saved).
