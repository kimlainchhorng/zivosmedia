# MiMo run — 2026-06-14T01:12:11.747Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and tell me whether my planned per-control changes are complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/InterestsPage.tsx  (route /interests — pick content interests that personalize the feed; backed by the user_interests table; add custom interest, tap a suggested interest to add, remove a selected interest)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, framer-motion whileTap). Please keep all data logic exactly as it is: the Supabase select/insert/delete, the react-query keys, the useMutation add/remove handlers, the navigate() target, and all prop wiring should stay byte-identical. Only advise on className tokens and the display-only attributes listed above.

DESIGN TOKEN SYSTEM we are applying consistently across the app:
- Focus ring (append to every focusable interactive control): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  (no ring-offset)
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] + rounded-sm ; medium chip/pill -> active:scale-[0.98] ; wide full-width row/card -> active:scale-[0.99]
- transition class: use transition-transform when scale is the only animated property; use transition-all when there is also a hover:bg / hover:text / hover:opacity that should animate alongside the press.
- aria-label only on icon-only / image-only controls (visible-text controls do not need it).
- Don't-churn rule: if a control already has a valid existing active:scale value, keep it rather than renumbering it to the nominal tier.

COMPONENT-TYPE RULES we follow (so we don't double-style or mis-style):
- shadcn <Button> already ships built-in tokens -> leave untouched, EXCEPT an icon-only shadcn Button still needs an aria-label if it lacks one.
- A native <input> that already has its own focus ring (e.g. focus:outline-none focus:ring-2 focus:ring-rose-500/30) -> leave untouched (never add active:scale to an input).
- A raw <button>/<a> gets the full token set; if it already has active:scale + transition, we keep those and only append the focus ring.
- A framer-motion element WITH whileTap: CSS active:scale is overridden by motion's inline transform, so we do NOT add a CSS scale; we add the focus ring via box-shadow ring only. If the element already has a CSS transition (e.g. transition-all for a hover:bg), that does not conflict with motion's transform, so we keep it as-is.

MY PLANNED EDITS (please confirm each is right, or correct it):

1. Selected-interest "remove" button, line ~163 (a .map over the user's interests; each is an X button inside a gradient pill made from a motion.span):
   current: <button type="button" aria-label={`Remove ${i.interest}`} onClick={() => removeMutation.mutate(i.id)} className="h-5 w-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center active:scale-90 transition-all">
   plan: append  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  (ring ONLY — it already has active:scale-90 + transition-all, which I keep; it already has a dynamic aria-label). The parent motion.span pill is rounded-full but NOT overflow-hidden, and the X button sits ~6px from the pill's right edge (pr-1.5), so I plan a normal OUTWARD ring. (Note: existing active:scale-90 is a slightly stronger press than the nominal icon-tier active:scale-95 — per the don't-churn rule I plan to keep 0.90 rather than renumber. OK?)

2. "Add" custom-interest button, line ~189:
   current: <button type="button" onClick={() => addMutation.mutate(adding)} disabled={!adding.trim() || addMutation.isPending} className="h-10 px-4 rounded-lg bg-ig-gradient text-white font-bold text-sm inline-flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all border-0 disabled:opacity-40">
   plan: append  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  (ring ONLY — it already has active:scale-95 + transition-all, which I keep). Visible "Add" text = accessible name → no aria-label. Parent wrapper (rounded-2xl bg-card border p-3) is NOT overflow-hidden → normal OUTWARD ring.

3. Suggested-interest grid buttons, line ~206 (a .map over filteredSuggested):
   current: a framer-motion motion.button WITH whileTap={{ scale: 0.95 }} and an entrance animation; cn() base is "flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-all" + "disabled:opacity-50"; content is an icon tile + the visible interest name (= accessible name); parent grid is grid-cols-3 sm:grid-cols-4 gap-2 (NOT overflow-hidden).
   plan: append  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  into the cn() base (ring ONLY — whileTap already owns the press-scale, so no CSS active:scale); KEEP the existing transition-all (it animates the hover:bg and does not conflict with motion's transform); KEEP whileTap={{ scale: 0.95 }}; normal OUTWARD ring (button is rounded-2xl, grid not overflow-hidden, comfortable gap-2). Visible name = accessible name → no aria-label.

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm none of these need a change):
- Back button, line ~124: shadcn <Button aria-label="Back" variant="ghost" size="icon"> — labeled, ships tokens.
- Custom-interest <input type="text">, line ~180 — native input that ALREADY has focus:outline-none focus:ring-2 focus:ring-rose-500/30 — leave alone (also has onKeyDown Enter-to-add, which I keep byte-identical).
- Hero stat card, line ~137: a motion.div with an entrance animation and NO onClick — presentational.
- Selected-interest pill wrapper, line ~155: a motion.span (NOT a button — only its inner X is interactive) — presentational wrapper.
- Loading skeletons (line ~233) — non-interactive.

QUESTIONS:
Q1. Remove-X (edit #1): is ring-ONLY (keeping active:scale-90 + transition-all + the existing dynamic aria-label) correct? And is keeping the existing 0.90 press (rather than renumbering to 0.95) the right don't-churn call for a tiny 20px icon button? Outward ring OK given the pill is rounded-full but not overflow-hidden and the X is ~6px inside the edge?
Q2. Add button (edit #2): ring-ONLY (keep active:scale-95 + transition-all), no aria-label (visible "Add" text) — correct?
Q3. Suggested grid motion.button (edit #3): confirm ring-ONLY (whileTap owns scale), confirm KEEPING the existing transition-all is right (it only animates the hover bg, doesn't touch transform), and confirm no aria-label (visible name). Is the existing whileTap={{ scale: 0.95 }} a sensible press for these grid tiles, or would you nudge it?
Q4. Confirm the untouched list is correct (especially: leave the native custom-interest input alone since it ships its own focus ring; and the motion.span pill is a non-interactive wrapper).
Q5. Anything missed? At a 375px-wide phone viewport: do the "Your picks" pills wrap cleanly, does the add-row (flex input + Add button) fit without crushing, and does the suggested grid (grid-cols-3 gap-2) lay out comfortably with readable tap targets?

Please answer Q1-Q5 and give me any corrected className strings. Keep all data/query logic unchanged. Thank you.
- files: src/pages/InterestsPage.tsx

---

## Review: InterestsPage.tsx — Interaction Polish Pass

### Plan

Three raw/native controls need the focus ring appended. Zero new `aria-*` or `whileTap` props — all existing attributes are already correct and stay byte-identical. Five controls are correctly left untouched. The diff is **3 line-edits, all className-only**.

---

### Q1 — Remove-X (edit #1)

**All correct. Ring-only, outward, keep `active:scale-90`, keep `transition-all`.**

- `active:scale-90` — the don't-churn rule is clear: the control already has a valid existing press-scale. The 0.90 press on a 20px×20px button feels slightly more deliberate than the nominal 0.95 icon-tier, which is actually pleasant at that size — don't renumber.
- `transition-all` — correct because `hover:bg-white/30` needs to fade alongside the press-scale. (`transition-transform` would make the bg-swap snap.)
- Outward ring — the pill `motion.span` is NOT `overflow-hidden` (it's `inline-flex … rounded-full`), and the button sits ~6px inside with `pr-1.5`. A 2px outward ring on a 20px circle lands at ~24px effective diameter, well within the pill. No clipping risk.
- Dynamic `aria-label={`Remove ${i.interest}`}` — already present and correct (icon-only, names the specific interest). No change.

### Q2 — Add button (edit #2)

**All correct. Ring-only, outward, keep `active:scale-95`, keep `transition-all`, no `aria-label`.**

- Visible "Add" text + `Plus` icon = accessible name. ✅
- `hover:opacity-90` requires `transition-all` (opacity must ease). ✅
- Parent `rounded-2xl bg-card border p-3` is NOT `overflow-hidden`. ✅

### Q3 — Suggested grid `motion.button` (edit #3)

**All correct. Ring-only, keep `transition-all`, keep `whileTap={{ scale: 0.95 }}`, no `aria-label`.**

- `whileTap={{ scale: 0.95 }}` — this is a solid press for ~110px grid tiles. 0.95 feels tactile at this tile size without being aggressive. No nudge needed.
- `transition-all` is correct here: it animates the `hover:bg-secondary/40` color transition. The motion transform operates via inline `style.transform` which is orthogonal to CSS `transition-property` — no conflict.
- The `motion.button` gets a framer inline transform at rest (`scale(1)`) so a CSS `active:scale` would be dead. Ring-only is the right call. ✅
- Visible interest name (`<p>` inside the button) = accessible name. ✅

### Q4 — Untouched controls

**All correct, nothing missed.**

| Control | Why untouched |
|---|---|
| Back `<Button>` (L124) | shadcn, `aria-label="Back"` present, ships tokens |
| Custom-interest `<input>` (L180) | Native input with its own `focus:ring-2 focus:ring-rose-500/30` — never add `active:scale` to an input |
| Hero `motion.div` (L137) | Presentational, no `onClick` — entrance animation only |
| Selected pill `motion.span` (L155) | Non-interactive wrapper, only the inner `<button>` is interactive |
| Loading skeletons (L233) | Non-interactive `<div>`s |

### Q5 — Responsive at 375px

**Clean, no crush.**

- **Pill row:** `flex flex-wrap gap-2` wraps naturally. Each pill is `pl-3 pr-1.5 py-1.5 rounded-full` (~`interest text` + 20px X ≈ 60–100px wide). At ~343px inner they wrap to 2–3 rows. ✅
- **Add-row:** `flex gap-2` inside `p-3` container (327px inner). Input is `flex-1` (~275px) + Add button `px-4` (~70px) ≈ 345px → fits with the 8px gap. Button text "Add" with the Plus icon at `h-10` is a comfortable 44px-high tap target. ✅
- **Suggested grid:** `grid-cols-3 gap-2` at 343px inner → ~108px/col. Each tile is `p-3` with a 36px icon tile + 11px text → plenty of room. `sm:grid-cols-4` kicks in at 640px+. Tap targets ~72px tall (36px icon + ~11px text + padding) — well above 44px. ✅

---

### Proposed Diff

**File:** `src/pages/InterestsPage.tsx`

Three className-only edits. Zero new attributes, zero new props.

```diff
--- a/src/pages/InterestsPage.tsx
+++ b/src/pages/InterestsPage.tsx
@@ -163,1 +163,1 @@
-                    className="h-5 w-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center active:scale-90 transition-all"
+                    className="h-5 w-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
@@ -189,1 +189,1 @@
-              className="h-10 px-4 rounded-lg bg-ig-gradient text-white font-bold text-sm inline-flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all border-0 disabled:opacity-40"
+              className="h-10 px-4 rounded-lg bg-ig-gradient text-white font-bold text-sm inline-flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all border-0 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
@@ -206,2 +206,2 @@
                   className={cn(
-                    "flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-all",
+                    "flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                     "disabled:opacity-50",
```

**Summary of the 3 edits:**

| # | Control | What's appended | Existing tokens kept |
|---|---|---|---|
| 1 | Remove-X `<button>` | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | `active:scale-90 transition-all hover:bg-white/30 aria-label={…}` |
| 2 | Add `<button>` | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | `active:scale-95 transition-all hover:opacity-90 disabled:opacity-40` |
| 3 | Suggested `motion.button` | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | `whileTap={{ scale: 0.95 }} transition-all hover:bg-secondary/40 disabled:opacity-50` |

---

### Owner Verification

1. **Run `npm run update`** — must pass (type-check + worker type-check + production build, true exit 0).
2. **Visual spot-check at 375px:** Tab to each control type and confirm the ring appears on keyboard focus only (not on mouse click). Confirm the press-scale feels right on touch/click (0.90 on the X, 0.95 on Add and suggested tiles).
3. **Data logic is byte-identical** — no changes to `supabase` queries, react-query keys, `useMutation` handlers, `navigate(-1)`, `setAdding`, `addMutation.mutate`, `removeMutation.mutate`, or the `filteredSuggested` filter. The `onKeyDown` Enter handler on the input is untouched.
