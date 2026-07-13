# DeepSeek run — 2026-06-14T04:42:27.303Z

- model: deepseek-chat
- task: SLICE 52 — chat privacy/security settings cluster (5 pages, 6 RAW button edits). PREMIUM responsive interaction-token + a11y polish. CLASSNAME-ONLY + display-only aria attrs. NO logic, NO handlers, NO state, NO routing changes.

Apply the project's standing interaction-token rules to RAW <button>/<a>/<Link> only:
- active:scale-[X] press feedback (tiers: icon-only scale-95; small/pill chips [0.97]; cards [0.98]; full-width/wide-rows [0.99]).
- transition-* : use transition-all when the control ALSO has a real hover:bg-*/hover:text-*/hover:opacity color fade; transition-transform for pure press-scale with no hover color.
- focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (OUTWARD ring-ring; use ring-inset ONLY if focusable control sits FLUSH inside a SEPARATE overflow-hidden rounded ancestor).
- aria: icon-only button with no visible text and no aria-label -> ADD a concise aria-label. Do not add aria-expanded to dialog openers.

SKIP (already tokenized / native focus intact / not mine): all shadcn Button/Input/Switch/Select/Label; RAW native <input>/<select> that keep native focus (no focus:outline-none) -> leave; presentational divs without onClick; child row components.

The 6 RAW controls under review:
1. src/pages/chat/settings/ActiveSessionsPage.tsx L24 Back ArrowLeft button "p-2 -ml-2 rounded-full hover:bg-muted" (has aria-label="Back").
2. src/pages/chat/settings/LoginAlertsPage.tsx L34 Back ArrowLeft button same pattern (has aria-label="Back").
3. src/pages/chat/settings/PasscodeSetupPage.tsx L58 Back ArrowLeft button same pattern (has aria-label="Back").
4. src/pages/chat/settings/ChatPrivacyHubPage.tsx L154 Back ChevronLeft button "p-1.5 rounded-full hover:bg-muted/60" — NO aria-label, ADD "Back". AND L237 Unblock pill "text-xs font-medium text-primary px-3 py-1.5 rounded-full hover:bg-primary/10" (visible text, onClick unblock) — small-pill tier.
5. src/pages/chat/settings/TwoStepSetupPage.tsx L51 Back ArrowLeft button same pattern (has aria-label="Back").

Confirm per control: exact className change, transition-all vs transition-transform, scale tier, ring (outward vs inset), and any aria add. Match the parity reference JobPostingDetailPage.tsx conventions. Reply concise per-file.
- files: src/pages/chat/settings/ActiveSessionsPage.tsx, src/pages/chat/settings/LoginAlertsPage.tsx, src/pages/chat/settings/PasscodeSetupPage.tsx, src/pages/chat/settings/ChatPrivacyHubPage.tsx, src/pages/chat/settings/TwoStepSetupPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

# SLICE 52 — Chat Privacy/Security Settings Cluster

## Plan

Apply the standing interaction-token rules to **6 RAW `<button>` controls** across **5 files** in the chat privacy/security settings cluster. All changes are className-only + display-only aria attrs. No logic, handlers, state, or routing changes.

### Controls inventory:

| # | File | Line | Control | Current className | Has aria-label? | Scale tier | Transition | Ring |
|---|------|------|---------|-------------------|-----------------|------------|------------|------|
| 1 | `ActiveSessionsPage.tsx` | L24 | Back ArrowLeft | `p-2 -ml-2 rounded-full hover:bg-muted` | ✅ `aria-label="Back"` | icon `scale-95` | `transition-all` (has hover:bg) | outward `ring-ring` |
| 2 | `LoginAlertsPage.tsx` | L34 | Back ArrowLeft | `p-2 -ml-2 rounded-full hover:bg-muted` | ✅ `aria-label="Back"` | icon `scale-95` | `transition-all` | outward `ring-ring` |
| 3 | `PasscodeSetupPage.tsx` | L58 | Back ArrowLeft | `p-2 -ml-2 rounded-full hover:bg-muted` | ✅ `aria-label="Back"` | icon `scale-95` | `transition-all` | outward `ring-ring` |
| 4 | `ChatPrivacyHubPage.tsx` | L154 | Back ChevronLeft | `p-1.5 rounded-full hover:bg-muted/60` | ❌ **ADD `aria-label="Back"`** | icon `scale-95` | `transition-all` | outward `ring-ring` |
| 5 | `ChatPrivacyHubPage.tsx` | L237 | Unblock pill | `text-xs font-medium text-primary px-3 py-1.5 rounded-full hover:bg-primary/10` | ❌ visible text → no aria needed | pill `[0.97]` | `transition-all` | outward `ring-ring` |
| 6 | `TwoStepSetupPage.tsx` | L51 | Back ArrowLeft | `p-2 -ml-2 rounded-full hover:bg-muted` | ✅ `aria-label="Back"` | icon `scale-95` | `transition-all` | outward `ring-ring` |

### Key decisions:
- **Controls 1-3, 6**: Identical pattern — append `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (FRESH `transition-all` since none had one; `hover:bg-muted` color fade needs it)
- **Control 4**: Same as above but ADD `aria-label="Back"` (icon-only, no visible text, no aria-label)
- **Control 5**: Small pill tier `[0.97]`; FRESH `transition-all` (has `hover:bg-primary/10`); outward `ring-ring` (pill sits in a `rounded-xl` section that is NOT overflow-hidden)
- **All rings**: OUTWARD `ring-ring` — none of these controls sit flush inside an `overflow-hidden rounded` ancestor

### SKIPPED (per rules):
- All shadcn `<Button>`, `<Switch>`, `<Select>`, `<Input>`, `<Label>` — ship tokens
- `<select>` native elements (keep native focus)
- Presentational `<div>`s without onClick
- `<SessionRow>`, `<PasscodeKeypad>`, `<ConfirmTwoStepDialog>` — child components
- `<Avatar>`, `<AvatarImage>`, `<AvatarFallback>` — presentational

---

## Proposed Changes

### File 1: `src/pages/chat/settings/ActiveSessionsPage.tsx`

**Line 24** — Back button:
```diff
-          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted">
+          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### File 2: `src/pages/chat/settings/LoginAlertsPage.tsx`

**Line 34** — Back button:
```diff
-          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted">
+          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### File 3: `src/pages/chat/settings/PasscodeSetupPage.tsx`

**Line 58** — Back button:
```diff
-          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted">
+          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### File 4: `src/pages/chat/settings/ChatPrivacyHubPage.tsx`

**Line 154** — Back button (ADD aria-label):
```diff
-        <button type="button" onClick={goBack} className="p-1.5 rounded-full hover:bg-muted/60">
+        <button type="button" onClick={goBack} aria-label="Back" className="p-1.5 rounded-full hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**Line 237** — Unblock pill:
```diff
-                <button type="button"
-                  onClick={() => unblock(b.blocked_id)}
-                  className="text-xs font-medium text-primary px-3 py-1.5 rounded-full hover:bg-primary/10"
-                >
+                <button type="button"
+                  onClick={() => unblock(b.blocked_id)}
+                  className="text-xs font-medium text-primary px-3 py-1.5 rounded-full hover:bg-primary/10 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
+                >
```

### File 5: `src/pages/chat/settings/TwoStepSetupPage.tsx`

**Line 51** — Back button:
```diff
-          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted">
+          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

---

## Verification

After applying, run:
```bash
npm run update
```

This must pass (type-check + worker type-check + production build) before the task is considered done.

### Owner notes:
- **6 RAW button edits** across 5 files — all className-only + 1 new `aria-label`
- **0 logic lines touched** — all `onClick`, `useSmartBack`, hooks, state, routing preserved
- **0 shadcn components touched** — all ship tokens
- **All rings outward `ring-ring`** — verified no `overflow-hidden` ancestors clip the rings
- **Scale tiers**: 4 icon `scale-95` (back buttons), 1 pill `[0.97]` (unblock)
- **Transition**: all `transition-all` (each has a `hover:bg-*` color fade)
- **Aria**: 1 new `aria-label="Back"` added to the ChevronLeft back button in `ChatPrivacyHubPage.tsx` (was missing); 4 others already had it (kept)
