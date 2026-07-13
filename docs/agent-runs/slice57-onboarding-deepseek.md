# DeepSeek run — 2026-06-14T05:45:36.547Z

- model: deepseek-chat
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

## Plan

Apply the premium interaction + a11y pass to `src/pages/OnboardingProgressPage.tsx` — exactly 2 className edits + 1 new `aria-pressed` attr, 0 logic lines touched.

## Answers to your questions

**(1) Toggle (A): `aria-pressed={done}` VALID.** The toggle has both a dynamic action-describing `aria-label` ("Mark incomplete"/"Mark complete") AND `aria-pressed` for state. This is the correct pattern: `aria-label` tells the user what action the button performs, `aria-pressed` tells them the current state. The icon swap (CheckCircle2 vs Circle) is visual-only — `aria-pressed` ensures screen readers get the state even if CSS fails. **icon-only tier `scale-95` + `transition-transform` (sole prop, no hover) + `rounded-full` for ring = correct.**

**(2) Nav (B): `scale-[0.98]` (wide row tier) is correct.** This is a `flex-1` text-left row button that spans most of the step card width — it's a wide/primary tier, not a small link. `transition-transform` (sole prop, no hover bg/color) + `rounded-lg` + outward `ring-ring` = correct. **NO `aria-pressed`** — one-shot nav, not a toggle.

**(3) Inventory exhaustive.** 2 RAW buttons per row (toggle + nav) + 1 shadcn back = 3 interactive controls per row × 8 rows = 16 RAW + 1 shadcn = 17 total. Hero `motion.div` L102 (no onClick), step row `motion.div` L125 (no onClick), icon tile L145, ChevronRight L152, skeletons L117, trophy card L160 — all correctly left as presentational/non-interactive. **ChevronRight is decorative** — the nav button inside the row is the actual tap target. **FLAG as UX gap (not a fix):** the ChevronRight visually suggests the whole row is tappable, but only the label button navigates. The toggle button and icon tile are not part of the nav. This is a pre-existing design choice.

**(4) Responsive 375/768/1280 — clean.** At 375: sticky header (back `h-10 w-10` + badge + title), hero (`text-3xl` + percent + progress bar), step row (toggle 28px + icon tile `h-9 w-9` + `flex-1 min-w-0` label/desc `line-clamp-1` + chevron) all lay out without crush. **Sub-44px tap targets to FLAG:** back button `h-10` (40px), toggle `h-7` (28px) — repo-wide compact pattern, not introduced here. Nav button row height ~64px is fine.

**(5) Owner flags (logic, do NOT fix):**
- **POTENTIAL BUG — `qc.setQueryData` spread order:** `completed_at: allDone ? new Date().toISOString() : null` is set BEFORE `...(old ?? {})`, so `old.completed_at` (which is `null` for incomplete or a past timestamp for done) **overwrites** the new `completed_at`. This means `completed_at` is never updated in the cache — it always stays as whatever `old` had. The DB upsert correctly sets `completed_at` on the write, but the optimistic cache is wrong. Fix: move `completed_at` AFTER the spread: `{ ...(old ?? {}), user_id: user.id, completed_steps: arr, completed_at: allDone ? new Date().toISOString() : null }`.
- `supabase as unknown as {...}` hand-rolled cast (existing pattern).
- `busy` disables ALL toggles globally during one upsert (existing).
- No error handling on upsert (error ignored, existing).

## Proposed diff

```diff
--- a/src/pages/OnboardingProgressPage.tsx
+++ b/src/pages/OnboardingProgressPage.tsx
@@ -129,7 +129,7 @@ export default function OnboardingProgressPage() {
                     aria-label={done ? "Mark incomplete" : "Mark complete"}
+                    aria-pressed={done}
                     onClick={() => toggleStep(step.id)}
                     disabled={busy}
-                    className="shrink-0"
+                    className="shrink-0 rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                   >
@@ -145,7 +145,7 @@ export default function OnboardingProgressPage() {
-                  <button type="button" onClick={() => navigate(step.path)} className="flex-1 min-w-0 text-left">
+                  <button type="button" onClick={() => navigate(step.path)} className="flex-1 min-w-0 text-left rounded-lg transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

## Verify

Run `npm run update` — must pass (0 type errors, worker builds, production build succeeds).
