# MiMo run — 2026-06-14T01:34:15.959Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + responsive QA on ONE customer-facing page: src/pages/CreatorGoalsPage.tsx (283 lines, route /creator-goals -- set & track creator milestones. Live follower/following/post counts via useQuery key ["creator-goals-counts", user?.id] (3 Supabase count head queries: followers by following_id, followers by follower_id, user_posts by user_id). Targets persisted to localStorage GOALS_KEY "zivo:creator:goals:v1" (loadGoals/saveGoals); inline edit via editingKey/draftValue useState + startEdit/commitEdit/cancelEdit useCallback). Layout: sticky header (shadcn back <Button> + Trophy badge + "Creator Goals" title); a gradient summary banner motion.div (reached/total, NO onClick); a list of 3 goal cards (each motion.div [NO onClick] with icon tile + label + "current of target" + an Edit icon btn that toggles to an inline editor [number <input> + Save icon btn + Cancel icon btn]); a progress bar motion.div per card; footer hint text.

Reference standard for tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): exactly 3 raw <button type="button">, 0 motion.button. shadcn back <Button aria-label="Back" variant="ghost" size="icon"> (L142) => SKIP (ships tokens). The summary banner motion.div (L162), each goal card motion.div (L191), each progress-bar motion.div (L260) have entrance initial/animate but NO onClick => presentational, leave alone. The number <input> (L223) ALREADY has focus:outline-none focus:ring-2 focus:ring-primary/40 + aria-label => leave as-is (valid focus treatment, don't churn, not a button). Icons decorative.

TOKEN TIERS (this repo): wide/primary/cards active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. DON'T-CHURN: if a raw <button> ALREADY has active:scale + a transition, ADD ring (+aria) ONLY -- don't change existing scale/transition. EXCEPTION: flip transition-colors->transition-all when a newly-added active:scale (a transform) must animate alongside an existing hover color-bg. ring-inset ONLY when a control is flush inside an overflow-hidden rounded parent.

HARD RULE: className + display-only attr ONLY. Do NOT change any onClick / startEdit / commitEdit / cancelEdit / setGoals / saveGoals / navigate / useQuery / useState / useCallback / localStorage / supabase / any logic.

MY PLAN -- validate or correct each (before->after; cite classNames):

(1) Edit button (L212, icon-only Pencil; onClick={() => startEdit(card.key)}; ALREADY aria-label={`Edit ${card.label} goal`}; className="shrink-0 h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors") -> NO existing active:scale. FLIP transition-colors->transition-all (so newly-added scale transform eases alongside hover:bg-secondary) + APPEND " active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring". Icon-only tier => active:scale-95. aria already present => NO aria change. Ring: h-9 w-9 rounded-full inside card motion.div "rounded-2xl bg-card border border-border p-4" (NOT overflow-hidden), button is shrink-0 at end of a flex items-center gap-3 row => NORMAL OUTWARD ring, rounded-full gives shape, gap-3+p-4 clearance. OK?

(2) Save button (L237, icon-only Check; onClick={commitEdit}; ALREADY aria-label="Save goal"; className="h-9 w-9 rounded-full bg-ig-gradient flex items-center justify-center text-white shadow-sm active:scale-95 transition-transform") -> APPEND ring ONLY. DON'T-CHURN: already has active:scale-95 (icon tier, correct) + transition-transform (scale is the SOLE animated property -- no hover color/bg -- so transition-transform is correct, do NOT flip to transition-all). aria present => no change. In editing div "flex items-center gap-1.5 shrink-0" inside the card (NOT overflow-hidden) => NORMAL OUTWARD ring (rounded-full present; gap-1.5 siblings don't clip, only overflow-hidden parents clip). OK?

(3) Cancel button (L245, icon-only X; onClick={cancelEdit}; ALREADY aria-label="Cancel edit"; className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-all") -> APPEND ring ONLY. DON'T-CHURN: already has active:scale-95 + transition-all (eases hover:text-foreground + scale). aria present => no change. Same editing div => NORMAL OUTWARD ring. OK?

QUESTIONS:
(1) Edit (#1) is the only one getting new tokens (no prior scale): flip transition-colors->transition-all + add active:scale-95 + ring. Agree the flip is correct (transform must animate alongside hover:bg-secondary)? Or keep transition-colors and use transition-transform separately (no -- one transition util, transition-all covers both)?
(2) Save (#2): keep transition-transform (NOT flip to transition-all) since there's no hover color/bg -- scale is the only animated prop. Agree? Cancel (#3): keep transition-all (it has hover:text-foreground). Agree both are ring-only don't-churn?
(3) Normal OUTWARD ring for all 3 (cards are motion.div "rounded-2xl bg-card border", NOT overflow-hidden; buttons rounded-full) -- agree, no ring-inset? Note Save/Cancel sit in a tight gap-1.5 cluster -- does a 2px outward ring clip against the adjacent input/button (I say no -- siblings don't clip, parent isn't overflow-hidden)?
(4) The number <input> (L223) already has focus:outline-none focus:ring-2 focus:ring-primary/40 + aria-label -- leave as-is (don't churn to focus-visible:ring-ring)? Agree it's a valid existing focus treatment?
(5) Responsive 375/768/1280: header (back h-10 w-10 + Trophy badge + title); banner p-5; goal card "flex items-center gap-3 p-4" (icon tile h-10 w-10 + label flex-1 min-w-0 + Edit h-9 w-9 OR [input w-20 + Save h-9 w-9 + Cancel h-9 w-9] cluster). Any crush @375 in EDITING state (icon 40 + gap + input 80 + Save 36 + Cancel 36 + gaps)? Inventory exhaustive (exactly 3 raw <button>, no missed control)? shadcn back => correctly SKIP? motion.divs (no onClick) => correctly presentational? sub-44px tap targets to FLAG (Edit/Save/Cancel h-9 w-9 ~36px; back h-10 w-10 40px)?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/CreatorGoalsPage.tsx

---

## Plan

**Page:** `src/pages/CreatorGoalsPage.tsx` — 3 raw `<button>` to touch, all className-only. 1 shadcn back SKIP, 1 input SKIP, all `motion.div` presentational.

---

## Answers to your questions

**(1) Edit — flip `transition-colors` → `transition-all`:** ✅ Correct. New `active:scale-95` (transform) must animate alongside existing `hover:bg-secondary` (color). One `transition-all` covers both. No separate utilities needed.

**(2) Save keep `transition-transform`; Cancel keep `transition-all`:** ✅ Both correct. Save has no hover color — scale is the sole animated prop, so `transition-transform` is precise (don't churn to `transition-all`). Cancel has `hover:text-foreground` (color) + scale → `transition-all` already covers both. Both are ring-only don't-churn.

**(3) Normal OUTWARD ring, all 3:** ✅ Correct. Card `motion.div` is `rounded-2xl bg-card border border-border p-4` — no `overflow-hidden`. Buttons `rounded-full` with `gap-3` / `p-4` clearance. Save/Cancel in `gap-1.5` cluster: siblings don't clip each other; only a parent's `overflow-hidden` clips. No ring-inset needed.

**(4) Number `<input>` leave as-is:** ✅ Correct. `focus:outline-none focus:ring-2 focus:ring-primary/40` + `aria-label` is a valid existing focus treatment. Don't churn.

**(5) Responsive 375 in editing state:** No crush. 343px inner − 32px card padding = 311px → fixed: icon 40 + `gap-3` 12 + input `w-20` 80 + `gap-1.5` 6 + Save 36 + `gap-1.5` 6 + Cancel 36 = **216px** fixed, leaving **95px** for `flex-1 min-w-0` label — labels are short ("Followers"/"Posts"/"Following") and counts fit. Inventory exhaustive (exactly 3 raw `<button>` + 1 shadcn SKIP + 1 input SKIP + `motion.div`s presentational). Sub-44px tap targets flagged (h-9 w-9 ~36px; back h-10 ~40px) — established repo compact pattern.

---

## Diff

**File:** `src/pages/CreatorGoalsPage.tsx`

3 className edits, **+0 net lines**. Every `onClick` / `startEdit` / `commitEdit` / `cancelEdit` / `useQuery` / `useState` / `useCallback` / `localStorage` / `supabase` byte-identical.

```diff
--- a/src/pages/CreatorGoalsPage.tsx
+++ b/src/pages/CreatorGoalsPage.tsx
@@ (Edit button — L212)
-                      className="shrink-0 h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors"
+                      className="shrink-0 h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
@@ (Save button — L237)
-                        className="h-9 w-9 rounded-full bg-ig-gradient flex items-center justify-center text-white shadow-sm active:scale-95 transition-transform"
+                        className="h-9 w-9 rounded-full bg-ig-gradient flex items-center justify-center text-white shadow-sm active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
@@ (Cancel button — L245)
-                        className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-all"
+                        className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

| # | Control | Action | Scale | Transition | Ring | Notes |
|---|---------|--------|-------|------------|------|-------|
| 1 | Edit (Pencil) | flip + add scale + ring | `active:scale-95` [icon] | `transition-colors` → `transition-all` | outward, `rounded-full` | new scale needs `transition-all` to ease alongside `hover:bg-secondary` |
| 2 | Save (Check) | ring-only | keep `active:scale-95` | keep `transition-transform` | outward, `rounded-full` | no hover color — scale sole prop |
| 3 | Cancel (X) | ring-only | keep `active:scale-95` | keep `transition-all` | outward, `rounded-full` | `hover:text-foreground` + scale both covered |

**SKIPPED:** shadcn back `<Button aria-label="Back">` (ships tokens, labeled); number `<input>` (existing `focus:ring-2 focus:ring-primary/40`); all `motion.div` (summary banner, goal cards, progress bars — entrance-only, no `onClick`); decorative icons.

---

## Verification

After applying, run:

```bash
npm run update
```

Must pass with **TRUE EXIT 0** (type-check + worker type-check + production build). No preview verification possible (shared dev server contended by parallel agents); rely on green gate + guard-clean 3-line className-only diff + byte-identical token patterns proven live on 25+ prior slices.
