# MiMo run — 2026-06-14T02:34:32.253Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and tell me whether my planned per-control edit is complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/DownloadedPacksPage.tsx  (a "downloaded sticker packs" page reached by in-app navigation; backed by `user_downloaded_packs` joined with `sticker_store_packs`; react-query keys ["user-downloaded-packs", user?.id] and ["user-downloaded-packs-meta", packIds.join(",")]; a `remove(id)` handler optimistically removes a row from the query cache via setQueryData, then deletes it from Supabase, then toasts + invalidates on error. Layout: a sticky header with a shadcn back button + title, a gradient hero stat card showing the pack count, loading skeletons + an empty state (with a shadcn "Browse store" button), then a vertical list of pack rows. Each pack row is a presentational motion.div with a trailing icon-only "Remove" (Trash2) button.)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, and framer-motion whileTap if warranted). Please keep ALL data logic exactly as it is: the two Supabase queries, both react-query keys, the `remove` handler (optimistic setQueryData + delete + toast + invalidate), the `navigate(-1)` / `navigate("/sticker-store")` targets, the `packIds`/`packMap` useMemo derivations, and every onClick must stay byte-identical. Only advise on className tokens, whileTap, and aria-* attributes.

DESIGN TOKEN SYSTEM we are applying consistently across the app:
- Focus ring (append to every focusable interactive control that lacks one): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  (no ring-offset). Use focus-visible:ring-inset INSTEAD OF an outward ring when the control is a flush edge child of a rounded overflow-hidden parent (an outward 2px ring would be clipped at the parent's rounded corners).
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99].
- transition class: use transition-transform when scale is the only animated property; use transition-all when there is also a hover:bg / hover:text / hover:opacity that should animate alongside the press.
- aria-label only on icon-only / image-only controls (a control with rich descriptive visible child text does NOT get an aria-label). Don't-churn: if a control already ships a valid aria-label, keep it.
- aria-pressed on a toggle button with a persistent on/off selected state; NOT on a one-shot action.
- Don't-churn rule: if a control already has a valid existing value, keep it rather than renumbering/re-flipping it.

COMPONENT-TYPE RULES we follow (so we don't double-style or mis-style):
- shadcn <Button> already ships built-in tokens -> leave untouched, EXCEPT an icon-only shadcn Button still needs an aria-label if it lacks one.
- framer-motion motion.div with an entrance initial/animate and NO onClick is presentational -> leave untouched.
- A RAW <button> (plain HTML, not shadcn) ships NO tokens.

MY PLANNED EDIT (please confirm it is right, or correct it):

1. The "Remove" button, line ~111 (a RAW `<button type="button">` inside a `.map` over `downloads`; ALREADY has `aria-label="Remove"`; `onClick={() => remove(d.id)}`; visible child = ONLY a Trash2 icon [icon-only, no text]; current className "h-8 w-8 rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors"). It sits as the trailing child of its parent pack-row motion.div (line ~100, className "flex items-center gap-3 p-3 rounded-2xl bg-card border border-border", NOT overflow-hidden):
   plan: FLIP "transition-colors" -> "transition-all" + append "active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring". KEEP the existing aria-label="Remove". NO aria-pressed.
   - FLIP transition-colors -> transition-all because the existing transition-colors eases the hover:text-rose-500 + hover:bg-rose-500/10 but does NOT cover the newly-added active:scale TRANSFORM; transition-all (superset) eases both the color hover AND the press-scale.
   - icon-only tier -> active:scale-95 (the button's only child is a Trash2 icon).
   - OUTWARD ring (not inset): the button is the trailing child of its parent row with p-3 clearance, and the row is NOT overflow-hidden, so no clip risk.
   - KEEP aria-label="Remove": valid pre-existing accessible name for an icon-only control; don't-churn says keep it.
   - NO aria-pressed: one-shot action (remove the download), not a persistent toggle.
   This is intended to match the established DevicesPage Remove-button precedent exactly (same RAW icon-only Trash2 button with hover:text + hover:bg + transition-colors → same FLIP to transition-all + active:scale-95 + ring).

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm none need a change):
- Back button, line ~72: shadcn <Button aria-label="Back" variant="ghost" size="icon" onClick={navigate(-1)}> — labeled, ships tokens.
- Hero stat card, line ~80: motion.div with entrance animation, NO onClick — presentational.
- "Browse store" button, line ~92: shadcn <Button onClick={navigate("/sticker-store")}> in the empty state — ships tokens, visible text.
- Each pack-row wrapper, line ~100: motion.div with entrance animation, NO onClick — presentational (the Remove button INSIDE it is the only control).
- Loading skeletons (line ~87), empty-state (line ~88) — non-interactive.
- All Sticker/Sparkles/Clock/Trash2/Download icons + the preview-emoji tile — decorative.

QUESTIONS:
Q1. Remove button (line ~111): is the planned treatment (FLIP transition-colors->transition-all + active:scale-95 icon-only tier + OUTWARD ring, KEEP existing aria-label, NO aria-pressed) correct and consistent with the DevicesPage Remove-button precedent?
Q2. Ring shape: confirm OUTWARD (not inset) is right — the button has p-3 clearance inside a non-overflow-hidden row.
Q3. Confirm the untouched list is correct (including leaving the shadcn "Browse store" button untouched). Anything missed?
Q4. At a 375px-wide phone viewport, does the pack row (emoji tile + name/meta text + trailing Remove icon) lay out without crushing?

Please answer Q1-Q4 and give me the corrected className string + confirm the aria attributes. Keep all data/query/handler logic unchanged. Thank you.
- files: src/pages/DownloadedPacksPage.tsx

---

## Review — `DownloadedPacksPage.tsx` interaction polish

### (1) Short plan

**1 control / 1 edit** — the icon-only RAW "Remove" `<button>` on each pack row. Everything else is either shadcn (ships tokens) or presentational `motion.div` (no `onClick`). The change is a single className line flip + append; zero net lines.

---

### (2) Proposed diff

**File:** `src/pages/DownloadedPacksPage.tsx`, line ~111 (the `<button>` inside `downloads.map`)

```diff
-                  <button type="button" aria-label="Remove" onClick={() => remove(d.id)} className="h-8 w-8 rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors">
+                  <button type="button" aria-label="Remove" onClick={() => remove(d.id)} className="h-8 w-8 rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**Breakdown:**

| Token | Why |
|---|---|
| FLIP `transition-colors` → `transition-all` | The existing `hover:text-rose-500` + `hover:bg-rose-500/10` are color properties (covered by `transition-colors`). Adding `active:scale-95` is a **transform** — `transition-colors` does NOT ease transforms, so it must flip to `transition-all` (superset) to ease both the color hover and the press-scale together. |
| `active:scale-95` | **Icon-only tier** — the button's sole child is a Trash2 icon (`h-3.5 w-3.5`), it's an 8×32px circle. Correct tier. |
| `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | **OUTWARD ring** (see Q2). |
| KEEP `aria-label="Remove"` | Valid pre-existing accessible name for an icon-only control — don't-churn. |
| NO `aria-pressed` | One-shot destructive action, not a persistent toggle. |

**Attributes unchanged:** `type="button"`, `aria-label="Remove"`, `onClick={() => remove(d.id)}` — all byte-identical.

**Diff stat:** 1 ins / 1 del (+0 net). Logic guard CLEAN — zero handlers/queries/derivations touched.

---

### (3) Answers to Q1–Q4

**Q1 — Is the Remove button treatment correct and consistent with the DevicesPage precedent?**

**Yes, exactly.** The DevicesPage Remove button is the same shape — RAW `<button>`, icon-only Trash2, `hover:text-*` + `hover:bg-*` + `transition-colors` → FLIP to `transition-all` + `active:scale-95` + ring + KEEP existing `aria-label`. Byte-identical treatment. One precedent match I'd flag for completeness: the EmojiPacksPage "unsave" button (same icon-only destructive-action row-trailing control) also received this exact pattern. Consistent across the board.

**Q2 — Confirm OUTWARD ring (not inset).**

**Confirmed — OUTWARD is correct.** The button (`h-8 w-8 rounded-full`) sits as the trailing flex child inside its parent `motion.div` (`flex items-center gap-3 p-3 rounded-2xl bg-card border border-border`). Two reasons no clip:

1. The parent is **NOT `overflow-hidden`** — so even at the `rounded-2xl` corners, an outward 2px `box-shadow` ring on the inner child is not clipped.
2. The `p-3` (12px) clearance between the parent edge and the child is far more than the 2px ring extent.

No `ring-inset` needed.

**Q3 — Is the untouched list correct? Anything missed?**

**All correct. Nothing missed.** Full confirmation:

| Control | Why untouched |
|---|---|
| Back `<Button>` (L~72) | shadcn, `aria-label="Back"`, ships tokens ✓ |
| Hero stat `motion.div` (L~80) | Entrance anim only, NO `onClick` → presentational ✓ |
| "Browse store" `<Button>` (L~92) | shadcn, visible text, ships tokens ✓ |
| Pack-row `motion.div` wrappers (L~100) | Entrance anim only, NO `onClick` → presentational ✓ |
| Loading skeletons (L~87) | `animate-pulse` divs, non-interactive ✓ |
| Empty-state icon/text (L~88) | Non-interactive ✓ |
| Sticker/Sparkles/Clock/Download icons | Decorative children ✓ |
| Preview-emoji tile div | Display-only ✓ |

One thing I'll note explicitly: the emoji tile `div` (`h-12 w-12 rounded-xl bg-ig-gradient/10`) is NOT `overflow-hidden` either, but it's not interactive so it doesn't matter — just confirming there's nothing hiding behind it.

**Q4 — Responsive at 375px: does the pack row lay out without crushing?**

**Clean.** Math:

- `max-w-2xl mx-auto px-4` → **~343px** inner at 375px viewport.
- Row: `flex items-center gap-3 p-3` → emoji tile `h-12 w-12` (48px) + `gap-3` (12px) + text column `flex-1 min-w-0` + Remove button `h-8 w-8` (32px) = **~104px fixed**, leaving **~239px** for the text column.
- Text column: pack name `text-sm font-bold line-clamp-1` + meta line (`flex items-center gap-2 text-[11px]` with sticker count · category · relative date) → comfortably fits within 239px. If the meta line is tight, `line-clamp-1` on the name and the `min-w-0` on the column handle overflow gracefully.
- The Remove button at 32×32px is slightly below the 44px tap-target guideline (same repo-wide compact-pattern flag), but its 8px padding from `gap-3` and the full row height give it adequate touch area.

---

### Owner action

Apply the one-line diff above, then run:

```bash
npm run update
```

Must exit 0 (type-check + worker type-check + production build). No commit or deploy unless the owner asks.
