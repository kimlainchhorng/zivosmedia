# MiMo run — 2026-06-13T23:17:54.459Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Analyze a customer-facing PUBLIC collaborative to-do page — src/pages/SharedTodosPage.tsx (lists from chat_todos via react-query; expand/collapse per list, toggle item done, 'Open in chat' deep-link) — for PREMIUM + RESPONSIVE refinements toward parity with reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change any supabase chat_todos query/mutation, react-query keys, the useAuth/navigate/toggleItem/toggleExpand logic, or routing — propose ONLY JSX/Tailwind className changes plus tiny display-only logic. Control inventory: (a) header Back is a shadcn Button variant=ghost size=icon (~L124) — ALREADY ships active:scale + focus-visible:ring, SKIP. (b) RAW full-width list expand/collapse button (~L193) — has aria-label, className 'w-full flex items-center gap-3 p-3.5 hover:bg-secondary/40 transition-colors text-left', NO active:scale, NO focus ring; its parent card motion.div (~L191) is overflow-hidden. (c) RAW full-width todo-item toggle button (~L237) — cn base 'w-full ... rounded-xl text-left transition-colors active:scale-[0.99]', ALREADY has active:scale-[0.99] but NO focus ring; sits inside a p-3 padded panel. (d) RAW full-width 'Open in chat' button (~L259) — 'w-full mt-2 h-9 rounded-lg bg-secondary hover:bg-muted ... transition-colors', NO active:scale, NO focus ring; inside the same p-3 panel. Tasks: (1) interaction consistency — add active:scale-[0.99] (full-width press tier) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring to the raw buttons lacking them (b: also decide if parent overflow-hidden warrants focus-visible:ring-inset; c: focus ring ONLY, it already has scale; d: scale + ring). Decide: keep transition-colors or upgrade to transition-all so the active:scale press animates smoothly — note item (c) already ships transition-colors+active:scale, so match it or upgrade? Flag any control I missed. (2) responsive issues at 375/768/1280 (single max-w-2xl centered column). (3) any display-only polish worth doing. Return a CONCISE line-referenced punch list of exact className edits with before/after. Do NOT reprint the whole component. Keep under ~800 tokens.
- files: src/pages/SharedTodosPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

Three raw interactive controls need the premium interaction-token pass (scale + keyboard focus ring). The shadcn Back button (a) is already covered — skip. No missed controls (the icons/chevrons are decorative children inside the buttons, the progress bar and empty-state are non-interactive). The page is already a clean single `max-w-2xl px-4` column — no responsive crush at 375/768/1280. One latent bug: (c) uses `transition-colors` with `active:scale`, but `transition-colors` doesn't animate `transform` — the scale snaps. All three should use `transition-all`.

---

## Punch list — `src/pages/SharedTodosPage.tsx`

### Edit 1 · Expand/collapse button (~L193)

`ring-inset` because the parent `motion.div` (L191) is `overflow-hidden` (AnimatePresence height animation) — a normal outer ring would be clipped.

**Before:**
```
"w-full flex items-center gap-3 p-3.5 hover:bg-secondary/40 transition-colors text-left"
```
**After:**
```
"w-full flex items-center gap-3 p-3.5 hover:bg-secondary/40 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring text-left"
```

### Edit 2 · Todo-item toggle button (~L237)

Ring only (already has `active:scale-[0.99]`). Upgrade `transition-colors` → `transition-all` so the existing scale actually animates (latent bug: `transition-colors` skips `transform`). Normal `ring` (safe — the `p-3` wrapper gives 12px clearance from the `overflow-hidden` ancestor).

**Before:**
```
"w-full flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors active:scale-[0.99]",
```
**After:**
```
"w-full flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
```

### Edit 3 · "Open in chat" button (~L259)

Same `transition-colors` → `transition-all` upgrade + scale + ring.

**Before:**
```
"w-full mt-2 h-9 rounded-lg bg-secondary hover:bg-muted text-foreground text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
```
**After:**
```
"w-full mt-2 h-9 rounded-lg bg-secondary hover:bg-muted text-foreground text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

## Summary

| Control | `active:scale` | Focus ring | `transition` upgrade | Notes |
|---|---|---|---|---|
| (b) Expand list | **add** `[0.99]` | **add** `ring-inset` | `colors` → `all` | `ring-inset` — parent `overflow-hidden` |
| (c) Toggle item | already `[0.99]` | **add** `ring` | `colors` → `all` | **bug fix**: scale wasn't animating |
| (d) Open in chat | **add** `[0.99]` | **add** `ring` | `colors` → `all` | — |

**Net: 3 className edits, 0 logic/query/mutation changes.**

No responsive issues found (single `max-w-2xl` column with `px-4` holds cleanly at all widths). No display-only polish needed — the hero gradient card, progress bar, empty state, and skeleton loaders are already premium.

### Owner verify
Run `npm run update` (type-check + worker + build). Preview `/shared-todos` at 375/768/1280 — confirm the three buttons' rings are visible on keyboard Tab (especially (b)'s inset ring inside the `overflow-hidden` card) and the press scale animates smoothly (not snapping, which was the pre-existing bug on (c)).
