# MiMo run — 2026-06-14T04:48:41.825Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Plan

All 7 controls are icon-only `<button>`s, all already have `aria-label`, all share the same situation: `hover:bg-muted` color fade (→ FRESH `transition-all`), no existing scale/ring. No overflow-hidden ancestors. Parity with the BotFatherPage back-button + remove-button precedent.

**Per-control:**

| # | Line | Current className | Add |
|---|------|------------------|-----|
| 1 | 481 | `p-2 -ml-2 rounded-full hover:bg-muted` | `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| 2 | 707 | `p-1 rounded hover:bg-muted` | same token block |
| 3 | 754 | `p-1 rounded hover:bg-muted` | same token block |
| 4 | 849 | `p-1 rounded hover:bg-muted` | same token block |
| 5 | 909 | `p-1 rounded hover:bg-muted` | same token block |
| 6 | 1019 | `p-1 rounded hover:bg-muted` | same token block |
| 7 | 1060 | `p-1 rounded hover:bg-muted` | same token block |

- **Transition:** `transition-all` (all 7 have `hover:bg-muted` color fade → needs the broader transition)
- **Scale:** `active:scale-95` (all icon-only → icon tier)
- **Ring:** outward `focus-visible:ring-ring` (all sit on `bg-card` or neutral header bg; none inside `overflow-hidden` ancestors)
- **Aria:** KEEP all 7 existing `aria-label`, ADD none

---

## Diff

**File:** `src/pages/chat/BotDetailPage.tsx`

**7 className edits, 0 logic lines, 0 new attrs.**

```diff
 #1 — L481 Back arrow
-          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted">
+          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">

 #2 — L707 Remove tool
-                    <button onClick={() => removeTool(t.id)} className="p-1 rounded hover:bg-muted" aria-label="Remove">
+                    <button onClick={() => removeTool(t.id)} className="p-1 rounded hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Remove">

 #3 — L754 Remove command
-                <button onClick={() => removeCommand(c.id)} className="p-1 rounded hover:bg-muted" aria-label="Remove">
+                <button onClick={() => removeCommand(c.id)} className="p-1 rounded hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Remove">

 #4 — L849 Remove schedule
-                <button onClick={() => removeSchedule(s.id)} className="p-1 rounded hover:bg-muted" aria-label="Remove">
+                <button onClick={() => removeSchedule(s.id)} className="p-1 rounded hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Remove">

 #5 — L909 Remove workflow
-                <button onClick={() => removeWorkflow(w.id)} className="p-1 rounded hover:bg-muted" aria-label="Remove">
+                <button onClick={() => removeWorkflow(w.id)} className="p-1 rounded hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Remove">

 #6 — L1019 Remove payment-link
-                <button onClick={() => removePay(p.id)} className="p-1 rounded hover:bg-muted" aria-label="Remove">
+                <button onClick={() => removePay(p.id)} className="p-1 rounded hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Remove">

 #7 — L1060 Remove mini-app
-                <button onClick={() => removeApp(a.id)} className="p-1 rounded hover:bg-muted" aria-label="Remove">
+                <button onClick={() => removeApp(a.id)} className="p-1 rounded hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Remove">
```

**Diff counts:** 7 `−`/`+` className line swaps, 0 logic, 0 new aria (7 KEPT), 7 FRESH `transition-all`, 7 FRESH `active:scale-95`, 7 outward `ring-ring`, 0 `ring-inset`, 0 `ring-white/70`, 0 `aria-pressed`/`aria-expanded`.

**Skipped (correctly):** all shadcn `Button`/`Input`/`Textarea`/`Switch`/`Dialog`; the two native `<select>` elements (L635 category, L675 AI model — native focus, no `focus:outline-none` → leave); all `<option>` elements; all presentational `div`s; the `Sparkline` child component.

---

## Owner verify / deploy

1. Run `npm run update` — must exit 0 (both type-checks + production build).
2. Preview at 375/768/1280 — the back button and remove-X buttons should show the press-scale + focus-ring; the native `<select>` dropdowns should keep their browser-native focus indicator.
3. Keyboard: Tab through the header and each section's remove-X button — the outward ring should appear on focus-visible.
4. All 7 `aria-label` attributes are preserved unchanged (`"Back"` on #1, `"Remove"` on #2–7).
