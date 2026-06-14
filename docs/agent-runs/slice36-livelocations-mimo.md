# MiMo run — 2026-06-14T02:32:31.305Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and tell me whether my planned per-control edit is complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/LiveLocationsPage.tsx  (a "live location shares" page reached by in-app navigation; backed by the `live_locations` Supabase table; react-query key ["live-locations-me", user?.id]; a `stopShare(id)` handler optimistically removes a row from the query cache via setQueryData, then deletes it from Supabase, then toasts + invalidates on error. Layout: a sticky header with a shadcn back button + title, a gradient hero stat card showing active-share counts, loading skeletons + an empty state, then a vertical list of share rows. Each share row is a presentational motion.div; only ACTIVE (non-expired) rows render a small trailing "Stop" action button.)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, and framer-motion whileTap if warranted). Please keep ALL data logic exactly as it is: the Supabase query, the react-query key, the `stopShare` handler (optimistic setQueryData + delete + toast + invalidate), the `navigate(-1)` target, the `stats` useMemo, and every onClick must stay byte-identical. Only advise on className tokens, whileTap, and aria-* attributes.

DESIGN TOKEN SYSTEM we are applying consistently across the app:
- Focus ring (append to every focusable interactive control that lacks one): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  (no ring-offset). Use focus-visible:ring-inset INSTEAD OF an outward ring when the control is a flush edge child of a rounded overflow-hidden parent (an outward 2px ring would be clipped at the parent's rounded corners).
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99].
- transition class: use transition-transform when scale is the only animated property; use transition-all when there is also a hover:bg / hover:text / hover:opacity that should animate alongside the press.
- aria-label only on icon-only / image-only controls (a control with rich descriptive visible child text does NOT get an aria-label — it would REPLACE that child text for the accessible-name computation). EXCEPTION/don't-churn: if a control already ships a valid aria-label whose text CONTAINS the visible word (WCAG 2.5.3 "label in name" satisfied), keep it rather than stripping it.
- aria-pressed on a toggle button that has a persistent on/off selected state; NOT on a one-shot action.
- Don't-churn rule: if a control already has a valid existing value, keep it rather than renumbering/re-flipping it.

COMPONENT-TYPE RULES we follow (so we don't double-style or mis-style):
- shadcn <Button> already ships built-in tokens -> leave untouched, EXCEPT an icon-only shadcn Button still needs an aria-label if it lacks one.
- framer-motion motion.div with an entrance initial/animate and NO onClick is presentational -> leave untouched.
- A RAW <button> (plain HTML, not shadcn) ships NO tokens.

MY PLANNED EDIT (please confirm it is right, or correct it):

1. The "Stop" action button, line ~165 (a RAW `<button type="button">` inside a `.map` over `shares`; conditionally rendered ONLY when `!expired`; ALREADY has `aria-label="Stop sharing"`; `onClick={() => stopShare(s.id)}`; visible child = a Square icon [decorative, fill=currentColor] + the text "Stop"; current className "shrink-0 h-9 px-3 rounded-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-bold inline-flex items-center gap-1 transition-colors"). It sits as the trailing `shrink-0` child of its parent share-row motion.div (line ~141, className via cn() includes "rounded-2xl bg-card border" with `p-3` padding, NOT overflow-hidden):
   plan: FLIP "transition-colors" -> "transition-all" + append "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring". KEEP the existing aria-label="Stop sharing". NO aria-pressed.
   - FLIP transition-colors -> transition-all because the existing transition-colors eases the hover:bg-rose-500/25 but does NOT cover the newly-added active:scale TRANSFORM; transition-all (superset) eases both the hover-bg AND the press-scale.
   - medium chip/pill tier -> active:scale-[0.98] (the button is a compact rounded pill with an icon + short text — not icon-only, not full-width).
   - OUTWARD ring (not inset): the button is the trailing shrink-0 child of its parent row with p-3 clearance, and the row is NOT overflow-hidden, so no clip risk near the row's rounded corners.
   - KEEP aria-label="Stop sharing": it is a valid pre-existing accessible name; the visible word "Stop" is a substring of "Stop sharing" (WCAG 2.5.3 satisfied); don't-churn says keep it.
   - NO aria-pressed: this is a one-shot destructive action (stop the share), not a persistent toggle.

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm none need a change):
- Back button, line ~99: shadcn <Button aria-label="Back" variant="ghost" size="icon" onClick={navigate(-1)}> — labeled, ships tokens.
- Hero stat card, line ~112: motion.div with entrance animation, NO onClick — presentational.
- Each share-row wrapper, line ~141: motion.div with entrance animation, NO onClick — presentational (the Stop button INSIDE active rows is the only control).
- Loading skeletons (line ~124), empty-state (line ~126) — non-interactive.
- All MapPin/Users/Clock/Hash/Square/Sparkles icons + the "Live"/"Expired" badge spans — decorative.

QUESTIONS:
Q1. Stop button (line ~165): is the planned treatment (FLIP transition-colors->transition-all + active:scale-[0.98] medium-pill tier + OUTWARD ring, KEEP existing aria-label, NO aria-pressed) correct and consistent?
Q2. Scale tier: is active:scale-[0.98] (medium chip/pill) right for this compact icon+text pill, or should it be a different tier (e.g. icon-only 0.95, or wide-row 0.99)?
Q3. Ring shape: confirm OUTWARD (not inset) is right — the button has p-3 clearance inside a non-overflow-hidden row, so an outward ring won't be clipped.
Q4. Confirm the untouched list is correct. Anything missed? At a 375px-wide phone viewport, does the share row (icon tile + chat-kind/coords/meta text + trailing Stop pill) lay out without crushing?

Please answer Q1-Q4 and give me the corrected className string + confirm the aria attributes. Keep all data/query/handler logic unchanged. Thank you.
- files: src/pages/LiveLocationsPage.tsx

---

## Review: LiveLocationsPage.tsx — Interaction Polish Pass

### Inventory Confirmation

Full line-by-line read confirms your inventory is **correct and exhaustive**:

| Control | Type | My assessment |
|---|---|---|
| Back button (~L99) | shadcn `<Button aria-label="Back">` | ✅ Labeled, ships tokens — **untouched** |
| Hero stat card (~L112) | `motion.div`, entrance anim, NO onClick | ✅ Presentational — **untouched** |
| Share-row wrapper (~L141) | `motion.div`, entrance anim, NO onClick | ✅ Presentational — **untouched** |
| Stop button (~L165) | RAW `<button>`, `aria-label="Stop sharing"`, onClick → `stopShare(s.id)` | 🎯 **One edit** |
| Loading skeletons (~L124) | `div` with `animate-pulse` | ✅ Non-interactive — **untouched** |
| Empty-state block (~L126) | `div` with MapPin icon + text | ✅ Non-interactive — **untouched** |
| All lucide icons + badge `<span>`s | Decorative children | ✅ **Untouched** |

No RAW `<input>`, no `motion.button`, no other non-shadcn interactive controls. Exactly **1 control to edit**.

---

### Q1–Q4

**Q1. Stop button treatment — ✅ Correct and consistent.**

- **FLIP `transition-colors` → `transition-all`**: Correct. The existing `transition-colors` eases the `hover:bg-rose-500/25` color but would NOT cover the new `active:scale-[0.98]` transform. `transition-all` (superset) eases both. This matches every precedent where a RAW button gets a press-scale added alongside an existing hover-bg (e.g., the CTA button pattern in CreatorWelcomePage).
- **`active:scale-[0.98]`**: Correct tier — see Q2.
- **OUTWARD ring**: Correct — see Q3.
- **KEEP `aria-label="Stop sharing"`**: Correct. The visible word "Stop" is a substring of "Stop sharing" → WCAG 2.5.3 "label in name" satisfied. Don't-churn: keep the valid pre-existing label.
- **NO `aria-pressed`**: Correct. This is a one-shot destructive action (optimistic delete + toast), not a persistent on/off toggle.

**Q2. Scale tier — ✅ `active:scale-[0.98]` (medium chip/pill) is the right tier.**

The button is `shrink-0 h-9 px-3 rounded-full text-xs font-bold` — a compact ~60–70px wide pill with icon + short text. It's not icon-only (→ not 0.95), not a full-width row (→ not 0.99), and not a segmented filter chip (→ not 0.97). The medium chip/pill tier at 0.98 fits this shape exactly.

**Q3. Ring shape — ✅ OUTWARD (not inset) is correct.**

The parent row `motion.div` has `className="… p-3 rounded-2xl bg-card border"` — **NOT `overflow-hidden`**. The Stop button is the trailing `shrink-0` child with `p-3` (12px) clearance from the row's rounded corners. An outward 2px ring is not clipped by the parent's border-radius. No `ring-inset` needed.

**Q4. Untouched list — ✅ Complete, nothing missed. Responsive at 375px — ✅ Clean.**

Layout math at 375px (~343px inner after `px-4`):
- Icon tile: `h-10 w-10` (40px) + `gap-3` (12px) = 52px fixed left
- Stop pill: `h-9 px-3` (~60–70px) + `gap-3` (12px) = ~72–82px fixed right
- Middle column (`flex-1 min-w-0`): ~343 − 52 − 82 = **~209px** for chat-kind text + coords `font-mono` line + metadata chips → no crush (coords wrap naturally with `flex-wrap` on the meta row, and `line-clamp`/`min-w-0` prevent horizontal overflow)

---

### Proposed Diff

**File:** `src/pages/LiveLocationsPage.tsx`

**Before (~L169–171):**
```tsx
                    <button
                      type="button"
                      aria-label="Stop sharing"
                      onClick={() => stopShare(s.id)}
                      className="shrink-0 h-9 px-3 rounded-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-bold inline-flex items-center gap-1 transition-colors"
                    >
```

**After:**
```tsx
                    <button
                      type="button"
                      aria-label="Stop sharing"
                      onClick={() => stopShare(s.id)}
                      className="shrink-0 h-9 px-3 rounded-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-bold inline-flex items-center gap-1 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
```

**Diff:** `git diff` = **1 ins / 1 del (+0 net)**. One className string changed:
- `transition-colors` → `transition-all` (flip)
- `active:scale-[0.98]` appended (medium-pill press-scale)
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` appended (focus ring)

**Added tokens:** 3 (1 flip + 1 scale + 1 ring-set)
**Removed tokens:** 0
**Attributes added:** 0
**Attributes kept:** `type="button"`, `aria-label="Stop sharing"`, `onClick={() => stopShare(s.id)}` — all byte-identical, untouched.

**Logic guard:** `stopShare` handler (optimistic `setQueryData` + `delete` + `toast` + `invalidateQueries`), `useQuery` key `["live-locations-me", user?.id]`, `stats` useMemo, `navigate(-1)`, `formatRemaining`, `formatRelative`, the `expired` computation, the `!expired` conditional render — all byte-identical, zero changes.

---

### Verification

Must run before moving to Done:
```bash
npm run update
```
(type-check + worker type-check + production build — must pass with 0 errors)

**Preview caveat:** LiveLocationsPage is auth-gated (`useAuth` + `enabled: !!user?.id`; rows render once the signed-in user has active/expired `live_locations` rows; the Stop button mounts only on non-expired rows). The edit is a single className string change on one control — low risk, verifiable by the green gate + the guard-clean 1-ins/1-del diff.

**Owner action:** Apply the single-line className change, verify `npm run update` exits 0, then commit when ready.
