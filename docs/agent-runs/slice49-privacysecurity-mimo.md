# MiMo run — 2026-06-14T04:24:11.319Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: SLICE 49 — PrivacySecurityPage
======================================================================

ROLE: You are a senior front-end reviewer. I am applying a className-ONLY interaction-token + a11y polish pass to a customer-facing React (Vite + Tailwind v4 + shadcn/ui) chat-settings sub-page. Decide the EXACT className/attribute changes for each interactive control. Be surgical.

HARD RULE (scope): className changes + tiny DISPLAY-ONLY attributes only (aria-label / aria-pressed / aria-expanded). NO logic, NO handlers, NO tabIndex/role/onKeyDown changes, NO state, NO routing, NO data hooks, NO new framer props. If a control is keyboard-inaccessible because it lacks role/tabIndex, FLAG it (do NOT fix).

TOKEN RULES (house style, parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button>/<a>/<Link> (NOT shadcn) get the full set: active:scale-[X] + transition-(all|transform) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Tier scales: wide/card [0.98]; chips/small/segmented-pill-tabs [0.97]; icon-only scale-95; full-width/menu-rows/wide-rows [0.99].
- transition-all when the control ALSO has a REAL hover:bg-*/hover:text-*/hover:opacity color/opacity FADE or underline; transition-transform for PURE icon/press-scale with NO hover color. If a control has NO transition but HAS a hover color and we add active:scale -> add transition-all FRESH. (disabled:opacity is a disabled-attr snap, NOT a hover fade.)
- BARE `transition` already eases transform+opacity+color -> if present, KEEP (don't-churn).
- shadcn <Button>/<Switch>/<Input> already ship tokens -> DO NOT add className tokens, SKIP.
- ring-inset KEY CSS FACT: overflow-hidden clips DESCENDANTS, not an element's OWN box-shadow/ring. ring-inset ONLY when a focusable control sits FLUSH inside a SEPARATE overflow-hidden rounded ancestor. A control in a rounded-but-NOT-overflow-hidden container -> OUTWARD ring.
- Controls with visible text get their accessible name from text (no aria-label). Icon-only controls NEED aria-label — KEEP existing. aria-pressed ONLY for toggle/segmented controls conveying selection state by bg.

PAGE: src/pages/chat/settings/PrivacySecurityPage.tsx (95 lines, Telegram-style Privacy & Security settings, plain <div> root, min-h-screen). useSmartBack; usePrivacy() -> settings/update; useSessions/useTwoStep/usePasscode read hooks. Layout: a sticky header (RAW icon-only back + "Privacy & Security" h1); a "Security shortcuts" <section className="rounded-2xl bg-card border border-border divide-y divide-border"> with 4 full-width RAW menu-row buttons (Active sessions / Two-step / App passcode / Login alerts, each navigates to a sub-route); a "Privacy matrix" section of <PrivacyMatrixRow> components (separate component); a "Read receipts" section with a shadcn <Switch>.

FIVE RAW <button> edits:

(A) Back button L23 — RAW icon-only ArrowLeft, ALREADY aria-label="Back" (KEEP), onClick={goBack}. className = "p-2 -ml-2 rounded-full hover:bg-muted". In sticky header (not overflow-hidden).
Q-A: append `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (FRESH transition-all — has hover:bg-muted color fade, no prior transition; icon tier scale-95; KEEP aria-label; OUTWARD ring). Agree?

(B)-(E) Security-shortcut menu rows L33 / L40 / L47 / L54 — RAW, VISIBLE TEXT (icon + title + subtitle), onClick={() => navigate("/chat/settings/<route>")} (sessions/two-step/passcode/login-alerts). className (identical on all 4) = "w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40". NO transition, NO scale, NO ring. They sit FLUSH inside a `section` whose className is "rounded-2xl bg-card border border-border divide-y divide-border" — the section is rounded but NOT overflow-hidden.
Q-BE: append `transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to all 4 (FRESH transition-all — has hover:bg-muted/40 color fade, no prior transition; full-width/menu-row tier [0.99]; visible text -> NO aria-label; OUTWARD ring-ring — RING NUANCE: the rows are flush in a rounded-2xl section but the section is NOT overflow-hidden, so per the ring-inset CSS fact -> OUTWARD ring [ring-inset ONLY when the rounded ancestor is overflow-hidden, which it is NOT]). Agree on [0.99] + FRESH transition-all + OUTWARD ring (NOT ring-inset)? Or would you argue the first/last rows touching the rounded-2xl corners warrant ring-inset even WITHOUT overflow-hidden? (I say OUTWARD — no overflow-hidden means the OWN ring is not clipped; ring-inset is reserved for the overflow-hidden case.)

SKIP (confirm): the shadcn <Switch> L89 (ships tokens); ALL <PrivacyMatrixRow> components L70-76 (separate component src/components/chat/settings/PrivacyMatrixRow — out of scope, its own internal controls); the 3 read hooks; all icons (ArrowLeft/ShieldCheck/Smartphone/KeyRound/Lock/Bell/Eye…) + all h1/div text + the section wrappers.

============================================================
DELIVERABLE: Give the EXACT final className string (+ confirm attrs: KEEP aria-label on A; ADD none on B-E [visible text]) for (A) and the (B)-(E) menu rows. Resolve the ring nuance on the menu rows explicitly: OUTWARD ring-ring vs ring-inset given the rounded-2xl-but-NOT-overflow-hidden section (I say OUTWARD). Confirm transition-all FRESH on all 5 (all have hover:bg, none have a prior transition). Confirm the SKIP list (esp. the shadcn Switch + the out-of-scope PrivacyMatrixRow component). Note any keyboard/responsive flags + confirm there are NO keyboard-inaccessible clickable <div>s. Keep it tight.
- files: src/pages/chat/settings/PrivacySecurityPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx
- files: src/pages/chat/settings/PrivacySecurityPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

Two surgical edits to `src/pages/chat/settings/PrivacySecurityPage.tsx` — 5 RAW `<button>` controls, all className-only (+ 1 `aria-label` addition).

**5 controls → 5 className swaps + 0 new ARIA attrs** (the menu rows have visible text; back already has `aria-label="Back"`).

---

## Proposed diff

**File:** `src/pages/chat/settings/PrivacySecurityPage.tsx`

### (A) Back button — L23

```diff
- <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted">
+ <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**Rationale:** Icon-only ArrowLeft. `hover:bg-muted` → `transition-all` FRESH (color fade). Icon tier `scale-95`. KEEP `aria-label="Back"`. OUTWARD `ring-ring` (sticky header, not overflow-hidden).

### (B)–(E) Security-shortcut menu rows — L33, L40, L47, L54

All four are identical className before/after. Per-button:

```diff
- <button type="button" onClick={() => navigate("/chat/settings/sessions")} className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40">
+ <button type="button" onClick={() => navigate("/chat/settings/sessions")} className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

(Same pattern for `/two-step`, `/passcode`, `/login-alerts` — replace the route only.)

**Rationale:**
- `hover:bg-muted/40` → `transition-all` FRESH (real color fade).
- Full-width menu-row tier → `scale-[0.99]`.
- Visible text (icon + title + subtitle) → **NO `aria-label`** (name from text content).
- **OUTWARD `ring-ring`** — the rows sit flush in a `rounded-2xl` section, but the section has **no `overflow-hidden`**. Per the ring-inset CSS fact: `overflow-hidden` clips descendants, but a rounded-only section does NOT clip its own children's box-shadow. Therefore: OUTWARD ring, NOT `ring-inset`. The rounded corners are purely decorative; they do not affect ring clipping.

**No `aria-pressed`** — these are one-shot navigations, not toggles.

---

## SKIP list (confirmed)

| Control | Why skip |
|---------|----------|
| `<Switch>` L89 | shadcn → ships tokens |
| `<PrivacyMatrixRow>` ×7 L70–76 | Separate component (`src/components/chat/settings/PrivacyMatrixRow.tsx`) → out of scope |
| All icons (ArrowLeft, ShieldCheck, Smartphone, KeyRound, Lock, Bell, Eye) | Decorative |
| All `<h1>`/`<div>` text | Decorative / non-interactive |
| Section wrappers | Non-interactive |

---

## Flags

1. **No keyboard-inaccessible clickable `<div>`s** — every interactive control is a real `<button>`. ✓
2. **Menu-row tap targets** — `p-4` ≈ 64px effective height → **passes** the 44px minimum. ✓
3. **Sub-44px back button** — `p-2` on a 20px icon = ~36px → sub-44px tap target (repo-wide compact pattern, **FLAG not fix**).
4. **Responsive 375/768/1280** — `max-w-2xl mx-auto px-4` body; header flex; menu rows `w-full`; section stacks vertically. Clean at all breakpoints. ✓

---

## Verification

After applying: `npm run update` must exit 0 (type-check + worker type-check + production build). Diff should show exactly **5 `−`/`+` className line swaps**, 0 new attributes, 0 logic changes.
