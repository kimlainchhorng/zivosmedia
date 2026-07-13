# MiMo run — 2026-06-14T04:43:10.695Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Plan

Six RAW `<button>` controls across 5 files. All are either icon-only back buttons (controls 1–3, 5–6 with existing `aria-label="Back"`) or one pill button (control 5). One missing aria-label (control 4). All need press feedback + focus ring. No logic/handler/routing changes — className-only + one new `aria-label`.

---

## Per-file diffs

### 1. `src/pages/chat/settings/ActiveSessionsPage.tsx` — L24

**Back ArrowLeft** — icon-only, KEEP `aria-label="Back"`, `hover:bg-muted` → `transition-all`, icon tier, outward ring.

```diff
-          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted">
+          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### 2. `src/pages/chat/settings/LoginAlertsPage.tsx` — L34

**Back ArrowLeft** — identical pattern to #1.

```diff
-          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted">
+          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### 3. `src/pages/chat/settings/PasscodeSetupPage.tsx` — L58

**Back ArrowLeft** — identical pattern to #1.

```diff
-          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted">
+          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### 4. `src/pages/chat/settings/ChatPrivacyHubPage.tsx` — TWO controls

**L154 — Back ChevronLeft** — icon-only, **NO `aria-label` → ADD `"Back"`**, `hover:bg-muted/60` → `transition-all`, icon tier, outward ring.

**L237 — Unblock pill** — visible text "Unblock" → no aria-label. `hover:bg-primary/10` → `transition-all`, small/pill tier `[0.97]`, outward ring (sits in a flex row, no overflow-hidden ancestor).

```diff
-        <button type="button" onClick={goBack} className="p-1.5 rounded-full hover:bg-muted/60">
+        <button type="button" onClick={goBack} aria-label="Back" className="p-1.5 rounded-full hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

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

### 5. `src/pages/chat/settings/TwoStepSetupPage.tsx` — L51

**Back ArrowLeft** — identical pattern to #1.

```diff
-          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted">
+          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

---

## Summary table

| # | File | Control | Transition | Scale tier | Ring | Aria |
|---|------|---------|-----------|-----------|------|------|
| 1 | ActiveSessionsPage L24 | Back ArrowLeft | `transition-all` (has hover:bg) | `active:scale-95` icon | outward `ring-ring` | KEEP `aria-label="Back"` |
| 2 | LoginAlertsPage L34 | Back ArrowLeft | `transition-all` | `active:scale-95` icon | outward `ring-ring` | KEEP |
| 3 | PasscodeSetupPage L58 | Back ArrowLeft | `transition-all` | `active:scale-95` icon | outward `ring-ring` | KEEP |
| 4a | ChatPrivacyHubPage L154 | Back ChevronLeft | `transition-all` | `active:scale-95` icon | outward `ring-ring` | **ADD** `aria-label="Back"` |
| 4b | ChatPrivacyHubPage L237 | Unblock pill | `transition-all` (has hover:bg) | `active:scale-[0.97]` pill | outward `ring-ring` | none (visible text) |
| 5 | TwoStepSetupPage L51 | Back ArrowLeft | `transition-all` | `active:scale-95` icon | outward `ring-ring` | KEEP |

**Skipped (all 5 files):** shadcn `Button`/`Input`/`Switch`/`Label`/`Select` (ship tokens); `SessionRow` / `PasscodeKeypad` / `ConfirmTwoStepDialog` / `PrivacyMatrixRow` child components (out of scope); native `<input>` in PasscodeSetupPage (keeps native focus); native `<select>` in ChatPrivacyHubPage (keeps native focus); all presentational `div`s / `Avatar` / icon spans.

**Total diff:** 6 className appends + 1 new `aria-label`. 0 logic lines touched.

---

## Owner verification

1. Apply the 5 diffs above.
2. Run `npm run update` — must exit 0 (type-check + worker type-check + production build).
3. Preview at 375/768/1280: back buttons show press-scale + ring on Tab; Unblock pill shows `[0.97]` press + ring; screen-reader announces "Back" on the ChatPrivacyHubPage ChevronLeft.
