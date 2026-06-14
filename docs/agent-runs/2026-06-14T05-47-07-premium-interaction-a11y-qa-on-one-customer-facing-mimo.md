# MiMo run — 2026-06-14T05:47:07.438Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + a11y QA on ONE customer-facing page: src/pages/OnboardingProgressPage.tsx (171 lines, "Gamified checklist of onboarding steps", REAL Supabase user_onboarding (orphan, per-user), AUTH-aware via useAuth [user.id scopes query + upsert]). One useQuery ["user-onboarding", user.id] (maybeSingle own row, enabled !!user.id). useQueryClient qc. useState busy. toggleStep(id) = optimistic qc.setQueryData + upsert completed_steps. useMemo completed Set + percent. Static STEPS array (8 steps). Layout: SwipeBackContainer + SEOHead noIndex; sticky header (shadcn back <Button> + ListChecks badge + title); gradient hero progress motion.div (completed.size/total + percent + progress bar, NO onClick); loading skeletons; list of step rows (each motion.div [entrance anim + transition-colors done-bg, NO onClick on the div]); 100% trophy card.

Reference standard: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): exactly 2 RAW <button type="button"> per step row (toggle checkbox L132 + nav label L148) + 1 shadcn back <Button> (L89). 0 motion.button. The step row motion.div L125 is presentational (entrance anim + transition-colors done-bg, NO onClick). Hero motion.div L102 NO onClick. icon tile L145 + ChevronRight L152 decorative (NO onClick).
- shadcn back <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full"> (L89) => SKIP (ships tokens, labeled).
- (A) toggle checkbox button (L132, RAW, icon-only): aria-label={done ? "Mark incomplete" : "Mark complete"} (DYNAMIC, action-describing), onClick toggleStep(step.id), disabled={busy}. State conveyed by ICON SWAP (done = gradient circle + CheckCircle2; not done = empty Circle). Base BEFORE: "shrink-0" (NO transition, NO scale, NO ring).
- (B) step nav label button (L148, RAW): onClick navigate(step.path), VISIBLE text (step.label + step.desc), flex-1 min-w-0 text-left. ONE-SHOT NAV (not a toggle). Base BEFORE: "flex-1 min-w-0 text-left" (NO transition, NO scale, NO ring).

TOKEN TIERS: wide/primary/cards active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. transition-transform when scale is the SOLE animated property (no hover bg/color). aria-pressed ONLY for persistent toggle/segmented/filter conveyed by bg/color/icon-state — NOT one-shot nav. OUTWARD ring default.

HARD RULE: className + display-only attr (aria-*) ONLY. Do NOT change any onClick / navigate / toggleStep / useQuery / useMemo / useState / useQueryClient / qc.setQueryData / upsert / disabled / useAuth / any logic. Do NOT add onClick to a no-op control (FLAG it).

EDITS APPLIED (validate exact):
(A) toggle checkbox button (L132): ADD aria-pressed={done} (keep dynamic aria-label) + APPEND "rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" to base (icon-only tier scale-95; transition-transform since scale is sole animated prop, no hover; rounded-full so ring hugs the 28px circle; OUTWARD ring-ring). aria-pressed VALID (persistent toggle, state by icon swap; combining with action-label aria-label is acceptable — label = action, pressed = state). NEW base: "shrink-0 rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring".
(B) step nav label button (L148): NO aria (visible text, one-shot nav) + APPEND "rounded-lg transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (wide row tier scale-[0.98]; transition-transform sole prop; rounded-lg so ring rounds the text block; OUTWARD ring-ring). NEW base: "flex-1 min-w-0 text-left rounded-lg transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring".

QUESTIONS:
(1) Toggle (A): aria-pressed={done} VALID for an icon-swap toggle that ALSO has a dynamic action-describing aria-label? icon-only scale-95 + transition-transform (no hover, scale sole prop) + rounded-full for the ring correct?
(2) Nav (B): scale-[0.98] (wide row tier) vs [0.97] (link tier) — which fits a flex-1 text-left row-nav button better? transition-transform (sole prop) + rounded-lg + outward ring-ring correct? Confirm NO aria-pressed (one-shot nav)?
(3) Inventory exhaustive (2 RAW per row + 1 shadcn back)? hero motion.div L102 + step row motion.div L125 correctly presentational (NO onClick)? icon tile L145 + ChevronRight L152 + skeletons L117 + trophy card L160 correctly LEFT (decorative/non-interactive)? Should the ChevronRight imply the WHOLE row is tappable nav (currently only the label button navigates) — FLAG as UX gap or leave?
(4) Responsive 375/768/1280: header; hero (text-3xl + percent + progress bar); step row (toggle 28px + icon tile h-9 w-9 + flex-1 min-w-0 label/desc line-clamp-1 + chevron). Any crush @375? sub-44px tap targets to FLAG (back h-10 40px; toggle 28px; nav button row height ~64px ok)?
(5) Owner flags (logic/out of scope, FLAG not fix): supabase cast type-workaround; optimistic qc.setQueryData spread order (...(old ?? {}) AFTER completed_at — does old.completed_at override the new allDone value? POTENTIAL BUG: completed_steps is set last so it wins, but completed_at set before spread gets overwritten by old's completed_at); no error handling on upsert (await but error ignored); busy disables ALL toggles globally during one upsert; anything else?

Be concise. Cite classNames. If correct as-is, say so per item. FLAG the qc.setQueryData spread-order bug (logic — do NOT fix, just flag).
- files: src/pages/OnboardingProgressPage.tsx

---

## (1) Toggle (A) — ALL CORRECT

- **`aria-pressed={done}`** — VALID. The toggle is a persistent single-select state (done/not-done) conveyed by icon swap (gradient CheckCircle2 vs empty Circle). Combining with the dynamic action-describing `aria-label` is fine: label = action verb ("Mark complete/incomplete"), pressed = boolean state. This is the exact icon-toggle pattern precedent.
- **`icon-only scale-95`** — correct tier for the 28px icon control.
- **`transition-transform`** — correct. No hover bg/color on this button; scale is the sole animated property.
- **`rounded-full`** — correct. Hugs the 28px circle icon so the focus ring is circular.
- **OUTWARD `ring-ring`** — correct. Button sits inside the neutral `p-3 rounded-2xl border` row (not overflow-hidden), so the ring renders outward against the row surface.

**NEW base confirmed:** `"shrink-0 rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` ✓

---

## (2) Nav (B) — ALL CORRECT

- **`scale-[0.98]`** — correct. This is a `flex-1 min-w-0 text-left` row-level button that takes most of the card width (analogous to the MonetizationPage workflow-step rows at `[0.98]`). Not a pill/chip (`[0.97]`), not a bare full-width row with no surface (`[0.99]`). The `[0.98]` wide-row tier fits.
- **`transition-transform`** — correct. No hover effect on this button; scale sole prop.
- **`rounded-lg`** — correct. Gives the focus ring a tidy rectangular shape around the text block.
- **`ring-ring` outward** — correct. Same neutral parent as (A).
- **NO `aria-pressed`** — correct. One-shot `navigate(step.path)`, not a persistent toggle/segmented/filter.

**NEW base confirmed:** `"flex-1 min-w-0 text-left rounded-lg transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` ✓

---

## (3) Inventory — EXHAUSTIVE ✓

**Controls covered:**
| Control | Location | Treatment |
|---------|----------|-----------|
| shadcn back `<Button>` | L89 | SKIP — ships tokens + `aria-label="Back"` ✓ |
| Toggle checkbox | L132 | (A) full treatment ✓ |
| Nav label button | L148 | (B) full treatment ✓ |

**Correctly LEFT untouched (presentational / decorative / non-interactive):**
- Hero `motion.div` L102 — entrance anim, NO onClick → presentational ✓
- Step row `motion.div` L125 — entrance anim + `transition-colors` done-bg, NO onClick → presentational ✓
- Icon tile L145 (`h-9 w-9 rounded-xl`) — decorative icon badge ✓
- `ChevronRight` L152 — decorative, NO onClick ✓
- Loading skeletons L117 — non-interactive ✓
- Trophy card L160 — non-interactive ✓

**⚑ ChevronRight UX gap:** The `ChevronRight` visually implies "this row navigates," but only the label button (B) actually handles navigation. The toggle (A) is a separate action. Practically, the `flex-1` label button covers most of the row width so tapping the row body almost always hits the nav button. The ChevronRight being inert is a minor UX inconsistency — **FLAG, do not fix** (the toggle+nav being intentionally separate controls on the same row is a deliberate layout choice, and making the whole `motion.div` clickable would conflict with the toggle).

---

## (4) Responsive — CLEAN ✓

**375px:** Header (Back `h-10` 40px + badge `h-7 w-7` + "Get Started" text) — fits in `px-4`. Hero (`text-3xl` count + percent + progress bar in `p-5 rounded-2xl`) — full-width, no crush. Step row: toggle 28px + `gap-3` + icon tile 36px + `gap-3` + `flex-1 min-w-0` text (label+desc both `line-clamp-1`) + `gap-3` + ChevronRight 16px + `p-3` padding = ~140px fixed, ~235px for text. No crush.

**768/1280:** Same within `max-w-2xl mx-auto` cap. Clean.

**⚑ Sub-44px tap targets (FLAG):**
- **Toggle checkbox: 28px** — significantly under the 44px minimum. The bare `<button>` wraps a 28px icon (`h-7 w-7`) with no explicit hit-area padding. This is a real accessibility concern. **FLAG** — adding `p-1.5` or `min-h-[44px] min-w-[44px]` with flex centering would fix it, but that's a layout change outside the className-only hard rule.
- Back button: `h-10 w-10` (40px) — sub-44px but repo-wide compact pattern, not introduced here.
- Nav button: row height ~56px (icon tile 36px + `p-3` × 2) — the `flex-1` button inherits the row height, so tap area is ≥48px. OK ✓.

---

## (5) Owner Flags

**⚑ POTENTIAL BUG — `qc.setQueryData` spread order (logic — do NOT fix, just flag):**

```js
qc.setQueryData<OnboardingRow | null>(["user-onboarding", user.id], (old) => ({
  user_id: user.id,
  completed_at: allDone ? new Date().toISOString() : null,  // ← set here
  ...(old ?? {}),                                             // ← spread AFTER: old.completed_at OVERRIDES
  completed_steps: arr,                                       // ← wins (after spread)
}));
```

`completed_at` is placed **before** the spread, so `old.completed_at` (stale server value, likely `null`) overwrites the freshly computed value. Consequence: when the user completes the last step (`allDone = true`), the optimistic data shows `completed_at: null` instead of the new timestamp. The trophy card (gated on `percent === 100`, computed from `completed.size`) still renders correctly. But the hero "all done 🎉" text (gated on `row?.completed_at`) won't show until the upsert refetch resolves. Fix would be moving `completed_at` after the spread — but that's a logic change, **flag only**.

**Other flags:**
- **No error handling on upsert:** `await sb.from("user_onboarding").upsert(…)` — the error is discarded. If the upsert fails, the optimistic data stays stale (rollback doesn't happen). `setBusy(false)` runs regardless (no try/finally, but no early return either — it does run after await). **FLAG.**
- **`busy` disables ALL toggles globally:** If the user clicks step A, every checkbox is disabled until the upsert resolves. Prevents rapid-fire conflicts but blocks concurrent interaction. **FLAG** (minor UX trade-off, not a bug).
- **`supabase as unknown as {…}`** type workaround — existing repo pattern.
- **Optimistic update has no rollback on error** — if the upsert fails, `completed_steps` remains stale in the cache until a manual refetch. **FLAG** (same pattern as MutedBlockedUsersPage `undo` but without the `onError` invalidation rollback).

---

## Summary

**Both edits (A) and (B) are correct as-is.** Tokens, tiers, aria semantics, transition choice, ring direction, and inventory are all validated. No changes needed.

**Verified:** the file in the working tree contains exactly 2 className edits + 1 `aria-pressed` addition, 0 logic lines touched, 0 `aria-label` added (the dynamic one was pre-existing). This diff passes the hard-rule guard.

**Run `npm run update` to confirm green gate before marking done.**
