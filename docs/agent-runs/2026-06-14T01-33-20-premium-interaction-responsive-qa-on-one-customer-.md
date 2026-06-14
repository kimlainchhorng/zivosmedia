# DeepSeek run — 2026-06-14T01:33:20.779Z

- model: deepseek-chat
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

Apply the standard premium interaction tokens to the 3 raw `<button>` controls on `CreatorGoalsPage.tsx`. All 3 are icon-only buttons in the goal card editing row. The page has exactly 3 raw buttons (Edit, Save, Cancel) — the shadcn back `<Button>` ships its own tokens, and all `motion.div` elements are presentational.

## Proposed diff

**File:** `src/pages/CreatorGoalsPage.tsx`

### Change 1 — Edit button (L212)

**Before:**
```tsx
className="shrink-0 h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors"
```

**After:**
```tsx
className="shrink-0 h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### Change 2 — Save button (L237)

**Before:**
```tsx
className="h-9 w-9 rounded-full bg-ig-gradient flex items-center justify-center text-white shadow-sm active:scale-95 transition-transform"
```

**After:**
```tsx
className="h-9 w-9 rounded-full bg-ig-gradient flex items-center justify-center text-white shadow-sm active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### Change 3 — Cancel button (L245)

**Before:**
```tsx
className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-all"
```

**After:**
```tsx
className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

## Validation of your plan

1. **Edit (#1):** ✅ Correct — flip `transition-colors` → `transition-all` (the new `active:scale-95` transform must animate alongside the existing `hover:bg-secondary`). `active:scale-95` is the correct icon-only tier. Normal outward ring is correct (card `rounded-2xl bg-card border border-border p-4` is NOT `overflow-hidden`; the button has `rounded-full` and sits with `gap-3` + `p-4` clearance).

2. **Save (#2):** ✅ Correct — ring-only don't-churn. Keep `transition-transform` (no hover color/bg, scale is the sole animated prop). Keep `active:scale-95`. Normal outward ring.

3. **Cancel (#3):** ✅ Correct — ring-only don't-churn. Keep `transition-all` (eases both `hover:text-foreground` and the existing `active:scale-95`). Normal outward ring.

4. **Ring clipping in gap-1.5 cluster:** ✅ Correct — siblings don't clip each other. Only `overflow-hidden` parents clip outward rings. The card parent is NOT `overflow-hidden`.

5. **Number `<input>` (L223):** ✅ Correct — leave as-is. It already has `focus:outline-none focus:ring-2 focus:ring-primary/40` + `aria-label`. Valid existing focus treatment, don't churn.

6. **Responsive @375:** ✅ Clean. Editing state worst-case: icon tile (40px) + gap (12px) + input (80px) + gap (6px) + Save (36px) + gap (6px) + Cancel (36px) = **216px** in a ~343px inner → comfortable. Non-editing: icon (40px) + gap (12px) + label `flex-1 min-w-0` (~200px) + Edit (36px) = **288px** → fits.

7. **Inventory:** ✅ Exhaustive — exactly 3 raw `<button>`. shadcn back `<Button>` correctly SKIPped. All `motion.div` elements (summary banner, goal cards, progress bars) have no `onClick` → correctly presentational.

8. **Sub-44px tap targets to FLAG:** Edit/Save/Cancel `h-9 w-9` (~36px), back `h-10 w-10` (40px). Standard repo pattern, flag for owner awareness.

## Owner must verify

- Run `npm run update` — must pass (type-check + worker type-check + production build).
- Preview at `/creator-goals` on localhost (auth-gated, needs logged-in user).
- Confirm the 3 raw buttons have visible focus rings on keyboard tab navigation.
