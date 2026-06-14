# DeepSeek run — 2026-06-14T04:47:47.184Z

- model: deepseek-chat
- task: SLICE 53 — src/pages/chat/BotDetailPage.tsx (single page, 1213 lines, bot-management detail page). PREMIUM responsive interaction-token + a11y polish. CLASSNAME-ONLY + display-only aria attrs. NO logic, NO handlers, NO state, NO routing changes.

Apply the project's standing interaction-token rules to RAW <button>/<a>/<Link> only:
- active:scale-[X] press feedback (tiers: icon-only scale-95; small/pill chips [0.97]; cards [0.98]; full-width/wide-rows [0.99]).
- transition-* : use transition-all when the control ALSO has a real hover:bg-*/hover:text-*/hover:opacity color fade; transition-transform for pure press-scale with no hover color.
- focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (OUTWARD ring-ring; use ring-inset ONLY if focusable control sits FLUSH inside a SEPARATE overflow-hidden rounded ancestor).
- aria: icon-only button with no visible text and no aria-label -> ADD a concise aria-label. Do not add aria-expanded to dialog openers.

SKIP (already tokenized / native focus intact / not mine): all shadcn Button/Input/Textarea/Switch/Label; RAW native <select> that keep native focus (no focus:outline-none) -> leave; presentational divs without onClick; the Sparkline child component.

The 7 RAW <button> controls under review (all icon-only, ALL already have aria-label):
1. L481 Back ArrowLeft, aria-label="Back", className "p-2 -ml-2 rounded-full hover:bg-muted" (sticky header, neutral bg).
2. L707 Remove tool X, aria-label="Remove", className "p-1 rounded hover:bg-muted" (inside a rounded-lg border list row, NOT overflow-hidden).
3. L754 Remove command X, aria-label="Remove", className "p-1 rounded hover:bg-muted".
4. L849 Remove schedule X, aria-label="Remove", className "p-1 rounded hover:bg-muted".
5. L909 Remove workflow X, aria-label="Remove", className "p-1 rounded hover:bg-muted".
6. L1019 Remove payment-link X, aria-label="Remove", className "p-1 rounded hover:bg-muted".
7. L1060 Remove mini-app X, aria-label="Remove", className "p-1 rounded hover:bg-muted".

(Controls 2-7 share the byte-identical className "p-1 rounded hover:bg-muted".)

Confirm per control: exact className change, transition-all vs transition-transform, scale tier, ring (outward vs inset), and any aria add (expected: KEEP all 7 existing aria-labels, ADD none). Match the parity reference JobPostingDetailPage.tsx conventions. Reply concise.
- files: src/pages/chat/BotDetailPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

# SLICE 53 — BotDetailPage.tsx interaction-token + a11y polish

## Plan

Apply the project's standing interaction-token rules to the **7 RAW `<button>` controls** (all icon-only, all already have `aria-label`). No logic, no handlers, no state, no routing changes.

## Control-by-control analysis

| # | Line | Control | Current className | Change | Scale tier | Transition | Ring |
|---|------|---------|------------------|--------|------------|------------|------|
| 1 | 481 | Back ArrowLeft | `"p-2 -ml-2 rounded-full hover:bg-muted"` | Append `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | `scale-95` (icon) | `transition-all` (has `hover:bg-muted` color fade) | outward `ring-ring` (neutral header bg) |
| 2 | 707 | Remove tool X | `"p-1 rounded hover:bg-muted"` | Append `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | `scale-95` (icon) | `transition-all` (has `hover:bg-muted` color fade) | outward `ring-ring` (inside `rounded-lg border` row, NOT overflow-hidden) |
| 3 | 754 | Remove command X | Same as 2 | Same | Same | Same | Same |
| 4 | 849 | Remove schedule X | Same as 2 | Same | Same | Same | Same |
| 5 | 909 | Remove workflow X | Same as 2 | Same | Same | Same | Same |
| 6 | 1019 | Remove payment-link X | Same as 2 | Same | Same | Same | Same |
| 7 | 1060 | Remove mini-app X | Same as 2 | Same | Same | Same | Same |

**Key decisions:**
- **All 7 controls have `hover:bg-muted`** → use `transition-all` (not `transition-transform`) so the hover color fade eases alongside the press scale.
- **All 7 are icon-only** → `scale-95` tier.
- **All 7 already have `aria-label`** → KEEP all, ADD none.
- **Controls 2-7 sit inside `rounded-lg border` list rows** — these rows are NOT `overflow-hidden`, so the outward `ring-ring` won't be clipped. No `ring-inset` needed.
- **No `aria-expanded`** — none of these open dialogs/disclosures.

## Diff

**File:** `src/pages/chat/BotDetailPage.tsx`

### Change 1 (L481 — Back button)
```diff
-          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted">
+          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### Change 2 (L707 — Remove tool)
```diff
-                    <button onClick={() => removeTool(t.id)} className="p-1 rounded hover:bg-muted" aria-label="Remove">
+                    <button onClick={() => removeTool(t.id)} className="p-1 rounded hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Remove">
```

### Change 3 (L754 — Remove command)
```diff
-                <button onClick={() => removeCommand(c.id)} className="p-1 rounded hover:bg-muted" aria-label="Remove">
+                <button onClick={() => removeCommand(c.id)} className="p-1 rounded hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Remove">
```

### Change 4 (L849 — Remove schedule)
```diff
-                <button onClick={() => removeSchedule(s.id)} className="p-1 rounded hover:bg-muted" aria-label="Remove">
+                <button onClick={() => removeSchedule(s.id)} className="p-1 rounded hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Remove">
```

### Change 5 (L909 — Remove workflow)
```diff
-                <button onClick={() => removeWorkflow(w.id)} className="p-1 rounded hover:bg-muted" aria-label="Remove">
+                <button onClick={() => removeWorkflow(w.id)} className="p-1 rounded hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Remove">
```

### Change 6 (L1019 — Remove payment link)
```diff
-                <button onClick={() => removePay(p.id)} className="p-1 rounded hover:bg-muted" aria-label="Remove">
+                <button onClick={() => removePay(p.id)} className="p-1 rounded hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Remove">
```

### Change 7 (L1060 — Remove mini-app)
```diff
-                <button onClick={() => removeApp(a.id)} className="p-1 rounded hover:bg-muted" aria-label="Remove">
+                <button onClick={() => removeApp(a.id)} className="p-1 rounded hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Remove">
```

## Summary

- **7 className edits** (all append-only, no flips)
- **0 new `aria-label`** (all 7 pre-existing, KEPT)
- **0 `aria-pressed`/`aria-expanded`** added
- **0 logic lines touched**
- **7 outward `ring-ring`** (no `ring-inset` needed — none of the parent rows are `overflow-hidden`)
- **7 `transition-all`** (all have `hover:bg-muted` color fade)
- **7 `active:scale-95`** (all icon-only tier)

## Verify

Run `npm run update` — must pass with 0 errors. The diff is 7 insertions, 7 deletions (className-only).
