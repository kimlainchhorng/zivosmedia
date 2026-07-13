# DeepSeek run — 2026-06-14T12:17:32.763Z

- model: deepseek-chat
- task: TASK: Premium interaction-token + a11y className pass for src/pages/AITripPlanner.tsx (customer-facing public AI Trip Planner — marketing/teal-slate palette, NavBar+Footer, multi-step planner card + recommended-destination cards).

STRICT CONSTRAINTS — className-only + tiny display-only aria attrs (aria-label / aria-pressed / aria-expanded ONLY). NO logic, NO handlers, NO state, NO routing, NO new framer props, NO tabIndex/role/onKeyDown. Buttons with NO onClick (non-functional placeholders) are FLAGGED to owner — but STILL receive the className interaction tokens (they are real <button>s that render). Do NOT add the missing handler.

INTERACTION-TOKEN RULES (parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button> get: active:scale-[X] + a transition utility + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Scale tiers: icon-only = scale-95; small/pill chips & segmented = [0.97]; self-contained selectable cards = [0.98]; full-width/wide rows = [0.99].
- transition: a Tailwind BARE `transition` shorthand already covers transform → when a button has `transition` + hover:bg/text/translate, just APPEND active:scale (NO flip). transition-transform for pure press-scale with NO hover color. FLIP transition-colors->transition-all only when adding scale alongside a color hover with transition-colors.
- ring: outward ring-ring default; ring-white/70 when the ring renders OVER a photographic/image surface; ring-inset only when flush inside a SEPARATE overflow-hidden rounded ancestor.
- aria: aria-pressed for toggle buttons whose on/off (or selected) state is conveyed by BACKGROUND/BORDER fill with constant label content — applies to BOTH single-select pickers AND multi-select toggle chips (each chip is independently pressed). icon-only button with no visible text + no aria-label -> ADD aria-label; with one -> KEEP.

CONTROL INVENTORY (8 raw <button>; everything else on this page is shadcn <Button> = SKIP, ships own tokens — that includes the +/- traveler steppers L304/L318, the Back/Continue/Build/New-search L524-554, Tune-request L633, and DatePickerButton's trigger):

1. L260 quickDestinations chip (step 1, MAPPED x5). Single-select, selection bg-conveyed cn() `destination === quick.label ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-white/80"`. onClick={() => setDestination(quick.label)}. Visible img+text. cn() STATIC base: `flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-white` (has bare `transition` + hover translate/color). NO scale/ring/aria.
2. L350 budgetLevels card (step 3, MAPPED x3). Single-select, cn() `budget === level.value ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-white"`. onClick={() => setBudget(level.value)}. Visible icon+label+description, p-4 tile in grid sm:grid-cols-3. STATIC base: `rounded-lg border p-4 text-left transition hover:-translate-y-0.5 hover:border-teal-300`. QUESTION: card tier [0.98] or chip [0.97]?
3. L367 interestOptions chip (step 3, MAPPED x6). MULTI-select toggle, cn() `interests.includes(id) ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-teal-300"`. onClick={() => toggleInterest(interest.id)}. Visible icon+text. STATIC base: `flex items-center gap-2 rounded-lg border px-3 py-3 text-sm font-semibold transition`. QUESTION: aria-pressed valid for MULTI-select toggle chips?
4. L580 interestOptions chip (InsightPanel section, MAPPED x6). Same multi-select toggle as #3. cn() `interests.includes(id) ? "border-teal-500 bg-teal-600 text-white" : "...hover:border-teal-300"`. STATIC base: `flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition`.
5. L849 DestinationCard favorite heart (icon-only). HAS aria-label `Favorite ${city}`. NO onClick (non-functional placeholder — FLAG). className `absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/90 text-slate-700 shadow-sm backdrop-blur transition hover:text-rose-600`. Sits OVER the card's h-48 <img> media surface. QUESTION: ring-white/70 (over image) + icon scale-95, keep aria-label, flag missing onClick?
6. L884 DestinationCard Save (text+icon). onClick={onSave}, disabled={saving}. Segmented action bar `grid grid-cols-[1fr_1fr_auto]`. className `flex min-h-12 items-center justify-center gap-2 border-r border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60`. Visible text.
7. L893 DestinationCard Start (text+icon). onClick={onStart}. Same segmented bar. className `flex min-h-12 items-center justify-center gap-2 border-r border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50`. Visible text.
8. L901 DestinationCard Share (icon-only). HAS aria-label `Share ${city}`. NO onClick (non-functional placeholder — FLAG). Same segmented bar (auto col). className `flex min-h-12 w-12 items-center justify-center text-slate-500 transition hover:bg-slate-50 hover:text-slate-950`. NOT over media (white action bar).

DELIVERABLE: For EACH of the 8 controls give the EXACT className delta (what to append / flip) and any aria attr. Answer the lettered QUESTIONS. Confirm ring color per control (outward ring-ring vs ring-white/70 over the card image for #5). Confirm scale tier for #2. Confirm aria-pressed for the multi-select toggles #3/#4. Be concise — per-control list. Do NOT rewrite the file.
- files: src/pages/AITripPlanner.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

# AITripPlanner.tsx — Premium Interaction Token + A11y Pass

## Plan

Apply className-only interaction tokens (active:scale, focus-visible:ring, transition) and display-only aria attrs to 8 raw `<button>` controls. No logic, no handlers, no framer props, no tabIndex/role/onKeyDown. Non-functional placeholder buttons (no onClick) are FLAGGED but still receive tokens.

## Per-Control Deltas

### Control 1 — L260 quickDestinations chip (×5, single-select)
- **Scale tier**: chip/pill → `active:scale-[0.97]`
- **Transition**: already has bare `transition` → NO FLIP (covers transform)
- **Ring**: outward `ring-ring` (neutral `bg-white/80` parent)
- **Aria**: `aria-pressed={destination === quick.label}` (single-select, bg-conveyed)
- **Delta**: APPEND `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to cn() STATIC base; ADD `aria-pressed={destination === quick.label}`

### Control 2 — L350 budgetLevels card (×3, single-select)
- **Scale tier**: self-contained selectable card → `active:scale-[0.98]`
- **Transition**: already has bare `transition` → NO FLIP
- **Ring**: outward `ring-ring` (neutral `bg-white` parent)
- **Aria**: `aria-pressed={budget === level.value}` (single-select, bg-conveyed)
- **Delta**: APPEND `active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to cn() STATIC base; ADD `aria-pressed={budget === level.value}`

### Control 3 — L367 interestOptions chip (×6, multi-select toggle)
- **Scale tier**: chip/pill → `active:scale-[0.97]`
- **Transition**: already has bare `transition` → NO FLIP
- **Ring**: outward `ring-ring` (neutral `bg-white` parent)
- **Aria**: `aria-pressed={interests.includes(interest.id)}` — YES, valid for multi-select toggle chips (each chip independently pressed, bg-conveyed)
- **Delta**: APPEND `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to cn() STATIC base; ADD `aria-pressed={interests.includes(interest.id)}`

### Control 4 — L580 interestOptions chip (InsightPanel, ×6, multi-select toggle)
- **Scale tier**: chip/pill → `active:scale-[0.97]`
- **Transition**: already has bare `transition` → NO FLIP
- **Ring**: outward `ring-ring` (neutral `bg-white` parent inside `bg-teal-50` panel)
- **Aria**: `aria-pressed={interests.includes(interest.id)}` — same multi-select toggle pattern
- **Delta**: APPEND `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to cn() STATIC base; ADD `aria-pressed={interests.includes(interest.id)}`

### Control 5 — L849 DestinationCard favorite heart (icon-only, NO onClick — FLAG)
- **Scale tier**: icon-only → `active:scale-95`
- **Transition**: already has bare `transition` → NO FLIP
- **Ring**: `ring-white/70` — renders OVER the card's `h-48` `<img>` media surface (photographic image)
- **Aria**: KEEP existing `aria-label={`Favorite ${destination.city}`}` (already present)
- **Delta**: APPEND `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`
- **FLAG**: No `onClick` handler — non-functional placeholder button

### Control 6 — L884 DestinationCard Save (text+icon, has onClick)
- **Scale tier**: segmented action bar → `active:scale-[0.97]`
- **Transition**: already has bare `transition` → NO FLIP
- **Ring**: outward `ring-ring` (white action bar, not over image)
- **Aria**: visible text "Save" → no aria needed
- **Delta**: APPEND `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

### Control 7 — L893 DestinationCard Start (text+icon, has onClick)
- **Scale tier**: segmented action bar → `active:scale-[0.97]`
- **Transition**: already has bare `transition` → NO FLIP
- **Ring**: outward `ring-ring` (white action bar)
- **Aria**: visible text "Start" → no aria needed
- **Delta**: APPEND `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

### Control 8 — L901 DestinationCard Share (icon-only, NO onClick — FLAG)
- **Scale tier**: icon-only → `active:scale-95`
- **Transition**: already has bare `transition` → NO FLIP
- **Ring**: outward `ring-ring` (white action bar, NOT over image)
- **Aria**: KEEP existing `aria-label={`Share ${destination.city}`}` (already present)
- **Delta**: APPEND `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **FLAG**: No `onClick` handler — non-functional placeholder button

## Questions Answered

- **Q: Card tier for #2 budgetLevels?** → `[0.98]` (self-contained selectable card in a grid, not a chip/pill)
- **Q: aria-pressed for multi-select toggles #3/#4?** → YES, valid. Each chip is independently pressed (on/off), bg-conveyed. The house pattern uses `aria-pressed` for both single-select and multi-select toggle chips.
- **Q: ring color for #5 over image?** → `ring-white/70` (renders over the card's photographic `<img>` surface)

## Summary

| # | Control | Scale | Ring | Aria | FLIP | FLAG |
|---|---------|-------|------|------|------|------|
| 1 | quickDestinations chip (×5) | `[0.97]` | `ring-ring` | `aria-pressed` | No | — |
| 2 | budgetLevels card (×3) | `[0.98]` | `ring-ring` | `aria-pressed` | No | — |
| 3 | interestOptions chip step3 (×6) | `[0.97]` | `ring-ring` | `aria-pressed` | No | — |
| 4 | interestOptions chip insight (×6) | `[0.97]` | `ring-ring` | `aria-pressed` | No | — |
| 5 | Favorite heart icon (×3) | `scale-95` | `ring-white/70` | keep `aria-label` | No | **No onClick** |
| 6 | Save button (×3) | `[0.97]` | `ring-ring` | — | No | — |
| 7 | Start button (×3) | `[0.97]` | `ring-ring` | — | No | — |
| 8 | Share icon (×3) | `scale-95` | `ring-ring` | keep `aria-label` | No | **No onClick** |

## Diff

```diff
--- a/src/pages/AITripPlanner.tsx
+++ b/src/pages/AITripPlanner.tsx
@@ -257,7 +257,7 @@ const AITripPlanner = () => {
                   <button
                     type="button"
                     key={quick.label}
                     onClick={() => setDestination(quick.label)}
                     className={cn(
-                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-white",
+                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-white active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                       destination === quick.label ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-white/80",
                     )}
+                    aria-pressed={destination === quick.label}
                   >
@@ -347,7 +347,7 @@ const AITripPlanner = () => {
                 <button
                   type="button"
                   key={level.value}
                   onClick={() => setBudget(level.value)}
                   className={cn(
-                    "rounded-lg border p-4 text-left transition hover:-translate-y-0.5 hover:border-teal-300",
+                    "rounded-lg border p-4 text-left transition hover:-translate-y-0.5 hover:border-teal-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                     budget === level.value ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-white",
                   )}
+                  aria-pressed={budget === level.value}
                 >
@@ -364,7 +364,7 @@ const AITripPlanner = () => {
                 <button
                   type="button"
                   key={interest.id}
                   onClick={() => toggleInterest(interest.id)}
                   className={cn(
-                    "flex items-center gap-2 rounded-lg border px-3 py-3 text-sm font-semibold transition",
+                    "flex items-center gap-2 rounded-lg border px-3 py-3 text-sm font-semibold transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                     interests.includes(interest.id)
                       ? "border-slate-950 bg-slate-950 text-white"
                       : "border-slate-200 bg-white text-slate-700 hover:border-teal-300",
                   )}
+                  aria-pressed={interests.includes(interest.id)}
                 >
@@ -577,7 +577,7 @@ const AITripPlanner = () => {
                 <button
                   type="button"
                   key={interest.id}
                   onClick={() => toggleInterest(interest.id)}
                   className={cn(
-                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition",
+                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                     interests.includes(interest.id)
                       ? "border-teal-500 bg-teal-600 text-white"
                       : "border-slate-200 bg-white text-slate-600 hover:border-teal-300",
                   )}
+                  aria-pressed={interests.includes(interest.id)}
                 >
@@ -846,7 +846,7 @@ function DestinationCard({
         <button
           type="button"
           aria-label={`Favorite ${destination.city}`}
-          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/90 text-slate-700 shadow-sm backdrop-blur transition hover:text-rose-600"
+          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/90 text-slate-700 shadow-sm backdrop-blur transition hover:text-rose-600 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
         >
@@ -881,7 +881,7 @@ function DestinationCard({
         <button
           type="button"
           onClick={onSave}
           disabled={saving}
-          className="flex min-h-12 items-center justify-center gap-2 border-r border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
+          className="flex min-h-12 items-center justify-center gap-2 border-r border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
         >
@@ -890,7 +890,7 @@ function DestinationCard({
         <button
           type="button"
           onClick={onStart}
-          className="flex min-h-12 items-center justify-center gap-2 border-r border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
+          className="flex min-h-12 items-center justify-center gap-2 border-r border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
         >
@@ -898,7 +898,7 @@ function DestinationCard({
         <button
           type="button"
           aria-label={`Share ${destination.city}`}
-          className="flex min-h-12 w-12 items-center justify-center text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
+          className="flex min-h-12 w-12 items-center justify-center text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
         >
```

## Owner Verification

1. **FLAG: Controls 5 and 8 (Favorite heart + Share icon) have NO `onClick` handler** — they are non-functional placeholder buttons. They now have interaction tokens but do nothing when clicked. Owner should add handlers or remove the buttons.
2. **Run `npm run update`** — type-check + worker type-check + production build must pass.
3. **Preview at 375/768/1280** — verify the destination card action bar (`grid grid-cols-[1fr_1fr_auto]`) and the chip grids still lay out correctly.
4. **Confirm `aria-pressed` is acceptable** for the multi-select toggle chips (#3/#4) — the house pattern uses it, but a fuller `role="switch"`/`aria-checked` upgrade would be more semantically precise (structural change, out of scope here).
