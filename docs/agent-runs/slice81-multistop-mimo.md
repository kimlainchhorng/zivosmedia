# MiMo run — 2026-06-14T07:48:22.220Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + a11y QA on ONE customer-facing page: src/pages/MultiStopRideBuilder.tsx (363 lines, "Build your route" — the multi-stop ride builder at /rides/multi-stop; chain up to 4 stops [pickup + 1–3 drops], persists the sequence in the URL `?from=&stops=a|b|c`, then forwards into the legacy booking flow with leg-1 pre-filled + remaining as `multi` querystring). REAL Supabase: a useEffect fetch of favorite restaurants/hotels (`supabase.from("restaurants"/"hotels").select("id,name").in("id", ids)`, cancelled-flag + .catch guarded) feeding a quick-pick row; useNetworkFavorites + useMultiLegQueue hooks; useState pickup/stops/favorites; useSearchParams URL sync useEffect; estimateFare pure helper; startBooking seeds the queue + navigates `/rides/hub?...`.

Reference standard: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

RAW interactive controls EDITED (5 raw <button>):
(1) L159 header Back <button> (icon-only ChevronLeft, one-shot navigate(-1), base "w-10 h-10 rounded-xl bg-muted flex items-center justify-center", ALREADY aria-label="Back", NO transition/scale/focus, NO hover).
(2) L214 Move-up <button> (icon-only "↑" text, onClick moveStop(i,i-1), disabled={i===0}, base "w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-[11px] font-bold disabled:opacity-40", ALREADY aria-label="Move up", NO transition/scale/focus, NO hover).
(3) L222 Move-down <button> (same as move-up, onClick moveStop(i,i+1), disabled={i===stops.length-1}, aria-label="Move down").
(4) L242 Remove-stop <button> (icon-only Trash2, onClick removeStop(i), base "w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center", ALREADY aria-label="Remove stop", NO transition/scale/focus, NO hover).
(5) L273 Quick-pick chip <button> (mapped over favorites, onClick fills the first empty stop / appends, visible text = an emoji + the place NAME, base "rounded-full border border-border/50 bg-card hover:bg-muted/40 px-3 py-1.5 text-[11px] font-bold text-foreground transition-colors", HAS hover:bg-muted/40 + transition-colors ON ITSELF, NO scale/focus/aria).

SHADCN (SKIP): Input L184 (pickup) + L234 (per-stop) + Label; Button L255 "Add a stop" (variant outline, ships own tokens); Button L344 sticky CTA "Start route" (ships own tokens). Sparkles/Navigation/MapPin/ChevronLeft/Plus/Trash2 icons decorative. AnimatePresence/motion.* entrance/layout anim wrappers (NO onClick) presentational.

TOKEN TIERS: wide/primary/cards/full-width active:scale-[0.98]; links/chips/pills active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. Transition rule: transition-transform when scale is the SOLE animated property on the element (no hover on it); transition-all when a hover bg/color/border animates alongside the scale ON THE SAME element. FLIP RULE: ADDING a NEW CSS scale to a transition-colors/no-transition control that ALSO has hover color/bg/border ON ITSELF -> FLIP transition-colors->transition-all. aria-label for icon-only. OUTWARD ring-ring default on neutral surfaces. shadcn Button SKIP.

EDITS APPLIED (validate exact):
(A) L159 Back — APPEND "transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (icon-only tier scale-95; NEW scale, the button had NO transition; transition-transform NOT transition-all — scale is the SOLE animated property, NO hover on the element; NO flip — nothing to flip from + no self-hover; aria-label="Back" already present; OUTWARD ring-ring on neutral header bg-background/90).
(B) L214 Move-up — APPEND same "transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (icon-only scale-95; NEW scale; transition-transform — scale sole animated prop, NO hover [the disabled:opacity-40 is a binary STATE not a hover-animated property, so transition-transform keeps the scale isolated — QUESTION: is transition-transform right here, or should it be transition-all to also smooth the disabled-opacity jump?]; NO flip; aria present; OUTWARD ring-ring on neutral bg-card stop-row, button fill bg-muted).
(C) L222 Move-down — identical to B (aria-label="Move down").
(D) L242 Remove-stop — APPEND same "transition-transform active:scale-95 focus-visible:..." (icon-only scale-95; NEW scale; transition-transform — scale sole, NO hover; NO flip; aria present; OUTWARD ring-ring on neutral bg-card parent, button fill is the bg-destructive/10 tint).
(E) L273 Quick-pick chip — **FLIP transition-colors -> transition-all** + APPEND "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (chip/pill tier [0.97]; FLIP because ADDING a NEW scale to a control that ALREADY has hover:bg-muted/40 + transition-colors ON ITSELF; OUTWARD ring-ring on neutral page surface, button fill bg-card; NO aria — visible text = place name under a "Quick picks from your saved places" heading [chip pattern], QUESTION: is NO-aria correct, or does the add-to-route action warrant aria-label like "Add {name} to route"?).

QUESTIONS:
(1) (A) Back: transition-transform + active:scale-95 + ring correct? NO flip (nothing to flip, no self-hover)?
(2) (B)/(C) Move-up/down: transition-transform vs transition-all given the disabled:opacity-40 state — which is correct? scale-95 icon-only tier + ring?
(3) (D) Remove-stop: transition-transform + scale-95 + ring + OUTWARD ring-ring (over the bg-destructive/10 tint, rendered against neutral bg-card)?
(4) (E) Quick-pick chip: FLIP transition-colors->transition-all correct (self-hover:bg + new scale)? [0.97] chip tier? aria-label warranted ("Add {name} to route") or is the visible place-name + section heading sufficient (NO aria)?
(5) Inventory exhaustive (5 raw buttons edited; shadcn Inputs/Labels/2 Buttons SKIP; motion wrappers presentational)?
(6) Owner flags (logic/out of scope, FLAG not fix): (a) GripVertical imported (L20) but NEVER rendered — unused import (lint/dead code); (b) the favorites fetch uses bare `supabase.from(...)` (NOT (supabase as any)) but casts rows via `(r as any).data` — typing gap; (c) URL-sync useEffect has eslint-disable exhaustive-deps; (d) quick-pick chip silently no-ops when all stops full AND at MAX (firstEmpty===-1 && length>=MAX-1 → neither branch fires); anything else?
(7) Responsive 375/768/1280: sticky header; pickup/stops cards; stop-row (2 move buttons + index chip + Input + remove button — does the row crush @375 with all 5 elements in a flex row?); quick-pick flex-wrap; sticky CTA. sub-44px tap targets to FLAG (Back w-10 h-10=40px; move w-7 h-7=28px; remove w-9 h-9=36px; chip py-1.5)?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/MultiStopRideBuilder.tsx

---

## QA Verdict: All 5 edits correct. 1 recommended improvement. File is ready.

---

### (1)–(4) Edit-by-edit validation

**(A) Back — ✅ CORRECT as-is.**
`transition-transform active:scale-95` + ring. No flip — the button has zero self-hover (no `hover:` on the `<button>`, only `bg-muted` static). `aria-label="Back"` pre-existing. OUTWARD `ring-ring` on the sticky header `bg-background/90`.

**(B)/(C) Move-up/down — ✅ `transition-transform` IS correct.**
The `disabled:opacity-40` is a **binary state toggle**, not a user-initiated hover/press animation. Instant opacity on enable/disable is fine (the layout reflow from `AnimatePresence layout` provides the visual context). `transition-transform` isolates the active:scale press feedback without needlessly smoothing the disabled transition. `active:scale-95` icon-only tier ✅. Ring ✅.

**(D) Remove-stop — ✅ CORRECT.**
`transition-transform active:scale-95` + ring. No self-hover → no flip. `bg-destructive/10` is the button's **own fill**; ring renders against the parent `bg-card` (neutral). ✅

**(E) Quick-pick chip — ✅ FLIP correct, tier correct. One aria improvement recommended.**
- **FLIP `transition-colors` → `transition-all`**: ✅ the button already has `hover:bg-muted/40` ON ITSELF. Adding a new scale means `transition-all` must replace `transition-colors` to animate both.
- **`[0.97]` chip tier**: ✅ — `rounded-full border ... px-3 py-1.5 text-[11px] font-bold` is the chip/pill pattern.
- **Ring**: ✅ OUTWARD `ring-ring` on neutral page surface.
- **aria: Recommend adding `aria-label`** — the visible text is the place name ("🍽️ Phnom Penh Palace"), not the action. For sighted users the section heading makes the purpose clear; for screen readers, `aria-label={`Add ${p.name} to route`}` is more informative. The click handler's dual-branch logic (fill empty / append new) makes the intent non-obvious from the name alone. **Verdict: acceptable as-is but the owner should add the aria-label in a follow-up.**

---

### (5) Inventory: ✅ Exhaustive

| Count | What | Disposition |
|-------|------|-------------|
| 5 | Raw `<button>` (A–E) | All edited |
| 2 | `<Input>` (L184 pickup, L234 per-stop) | SKIP — shadcn |
| 1 | `<Label>` (×3 instances) | SKIP — shadcn |
| 2 | `<Button>` (L255 "Add a stop", L344 sticky CTA) | SKIP — shadcn |
| — | `AnimatePresence` / `motion.div` | SKIP — presentational (no onClick) |
| — | ChevronLeft/Plus/Trash2/GripVertical/Navigation/MapPin/Sparkles | SKIP — decorative |

**Total: 5 raw buttons edited. Nothing missed.**

---

### (6) Owner flags (logic / out of scope — FLAG not fix)

**(a)** `GripVertical` imported (L20) **never rendered** — dead import. Lint warning, not a runtime issue. Remove in a cleanup pass.

**(b)** Favorites fetch: `supabase.from("restaurants")...` returns typed rows, but results are cast via `(r as any).data` — typing gap. Pre-existing pattern.

**(c)** URL-sync `useEffect` has `eslint-disable-next-line react-hooks/exhaustive-deps` (L69) — intentionally excludes `params` from deps to avoid infinite loops (setParams changes params). Standard guard.

**(d)** Quick-pick chip silently no-ops when **all stops are filled AND at MAX**: `firstEmpty === -1` and `stops.length >= MAX_STOPS - 1` → neither branch fires. No toast/haptic feedback. UX gap — user taps a chip and nothing happens.

**(e)** `GripVertical` suggests drag-to-reorder was planned but not built. The move-up/down buttons are the current reorder mechanism.

**(f)** Stops are stored as **text names** (not IDs). If two favorites share a name, they're indistinguishable. Design decision.

---

### (7) Responsive 375/768/1280 — ✅ Clean

**Stop row crush analysis at 375px:**
The row is `flex items-center gap-2` with: move-up `w-7` + move-down `w-7` + index chip `w-6` + Input `flex-1 min-w-0` + remove `w-9`. At 375px with `px-4` (16px×2) and `p-3` (12px×2), available width ≈ 319px. Fixed elements: 28+28+24+36 = 116px + gaps (2px×4 = 8px) = 124px. Input gets ~195px — **no crush**. `min-w-0` on the flex-1 input prevents overflow. ✅

**Quick-pick chips:** `flex flex-wrap gap-2` with `rounded-full px-3 py-1.5 text-[11px]` — natural wrap at all widths. ✅

**Sticky CTA:** `fixed bottom-0 left-0 right-0 px-4` — full-width at all breakpoints. `pb-[calc(var(--zivo-safe-bottom,0px)+12px)]` respects safe areas. ✅

**Sub-44px tap targets (FLAG — repo-wide, not introduced here):**
- Back `w-10 h-10` = 40px (≤44)
- Move-up/down `w-7 h-7` = 28px (≤44, the smallest in the page)
- Remove `w-9 h-9` = 36px (≤44)
- Chip `py-1.5 text-[11px]` ≈ 24px height (≤44)

Flagged for an owner-wide tap-target sweep. Not changed here (consistent with repo compact scale).

---

### Proposed change (1 optional improvement)

If the owner wants to add the recommended aria-label on the quick-pick chips:

**File:** `src/pages/MultiStopRideBuilder.tsx`

**Before (L273):**
```jsx
<button type="button"
  key={`${p.kind}-${p.id}`}
  onClick={() => {
```

**After:**
```jsx
<button type="button"
  key={`${p.kind}-${p.id}`}
  aria-label={`Add ${p.name} to route`}
  onClick={() => {
```

**Diff:**
```diff
               <button type="button"
                   key={`${p.kind}-${p.id}`}
+                  aria-label={`Add ${p.name} to route`}
                   onClick={() => {
```

Single attribute addition. 0 logic lines touched. `npm run update` will pass (display-only attribute on a `<button>`).

---

### Summary

| Item | Status |
|------|--------|
| Edits A–E | ✅ All correct as applied |
| FLIP (E) | ✅ Correct (`transition-colors` → `transition-all`) |
| transition-transform (B/C) | ✅ Correct (disabled:opacity is binary state, not hover) |
| Ring direction | ✅ All OUTWARD on neutral surfaces |
| Inventory | ✅ Exhaustive (5 edited, rest skipped) |
| Responsive | ✅ Clean at 375/768/1280 |
| Optional improvement | `aria-label="Add {name} to route"` on chip (E) |
| `npm run update` | Will pass (no logic changes) |

**Owner: commit as-is or with the one aria-label addition above.**
