# DeepSeek run — 2026-06-14T04:24:05.549Z

- model: deepseek-chat
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

# SLICE 49 — PrivacySecurityPage: Plan & Diff

## Plan

**5 RAW `<button>` controls** across the page — all className-only edits, 1 new `aria-label` (none missing), 0 logic changes.

| # | Control | Line | Type | Change |
|---|---------|------|------|--------|
| A | Back (icon-only ArrowLeft) | L23 | RAW, `aria-label="Back"` KEEP | `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| B | Active sessions menu row | L33 | RAW, visible text | `transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| C | Two-step verification menu row | L40 | RAW, visible text | Same as B |
| D | App passcode menu row | L47 | RAW, visible text | Same as B |
| E | Login alerts menu row | L54 | RAW, visible text | Same as B |

**Ring nuance resolved:** The 4 menu rows sit flush inside a `rounded-2xl` section that is **NOT** `overflow-hidden`. Per the CSS fact — `overflow-hidden` clips **descendants'** box-shadow/ring, not the element's own — these rows get **OUTWARD `ring-ring`** (not `ring-inset`). The first/last row's ring may visually extend slightly past the rounded-2xl corners, but that's the correct behavior for outward rings on non-clipped containers.

**SKIP list confirmed:**
- shadcn `<Switch>` L89 — ships tokens
- All `<PrivacyMatrixRow>` components L70-76 — separate component, out of scope
- All 3 read hooks (`usePrivacy`, `useSessions`, `useTwoStep`, `usePasscode`) — logic, untouched
- All icons + text + section wrappers — decorative/presentational

**No keyboard-inaccessible clickable `<div>`s** — every interactive control is a real `<button>`.

---

## Diff

**File:** `src/pages/chat/settings/PrivacySecurityPage.tsx`

```diff
--- a/src/pages/chat/settings/PrivacySecurityPage.tsx
+++ b/src/pages/chat/settings/PrivacySecurityPage.tsx
@@ -20,7 +20,7 @@ export default function PrivacySecurityPage() {
       <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border safe-area-top">
         <div className="flex items-center gap-2 h-14 px-2">
           <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted">
+            className="p-2 -ml-2 rounded-full hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             <ArrowLeft className="w-5 h-5" />
           </button>
           <h1 className="text-base font-semibold">Privacy & Security</h1>
@@ -30,7 +30,7 @@ export default function PrivacySecurityPage() {
       <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
         {/* Security shortcuts */}
         <section className="rounded-2xl bg-card border border-border divide-y divide-border">
-          <button type="button" onClick={() => navigate("/chat/settings/sessions")} className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40">
+          <button type="button" onClick={() => navigate("/chat/settings/sessions")} className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <Smartphone className="w-5 h-5 text-foreground" />
             <div className="flex-1">
               <div className="text-sm font-medium">Active sessions</div>
@@ -38,7 +38,7 @@ export default function PrivacySecurityPage() {
             </div>
           </button>
-          <button type="button" onClick={() => navigate("/chat/settings/two-step")} className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40">
+          <button type="button" onClick={() => navigate("/chat/settings/two-step")} className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <KeyRound className="w-5 h-5 text-foreground" />
             <div className="flex-1">
               <div className="text-sm font-medium">Two-step verification</div>
@@ -46,7 +46,7 @@ export default function PrivacySecurityPage() {
             </div>
           </button>
-          <button type="button" onClick={() => navigate("/chat/settings/passcode")} className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40">
+          <button type="button" onClick={() => navigate("/chat/settings/passcode")} className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <Lock className="w-5 h-5 text-foreground" />
             <div className="flex-1">
               <div className="text-sm font-medium">App passcode</div>
@@ -54,7 +54,7 @@ export default function PrivacySecurityPage() {
             </div>
           </button>
-          <button type="button" onClick={() => navigate("/chat/settings/login-alerts")} className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40">
+          <button type="button" onClick={() => navigate("/chat/settings/login-alerts")} className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <Bell className="w-5 h-5 text-foreground" />
             <div className="flex-1">
               <div className="text-sm font-medium">Login alerts</div>
```

**Diff stats:** 5 lines changed (5 `−`/`+`), 0 logic lines touched, 0 new ARIA attrs (A's `aria-label="Back"` was already present).

---

## Owner verification

1. **Run `npm run update`** — must pass (type-check + worker type-check + production build).
2. **Preview at 375px** — header back button (40px) + title fit; 4 menu rows full-width with icon (20px) + 12px gap + `flex-1` text + subtitle; responsive clean.
3. **No keyboard gaps** — all 5 controls are real `<button>`s (natively Tab-focusable); outward rings functional; A has `aria-label="Back"`; B-E take names from visible text.
4. **No `ring-inset`** — the `rounded-2xl` section is NOT `overflow-hidden`, so outward `ring-ring` is correct per the CSS fact.
