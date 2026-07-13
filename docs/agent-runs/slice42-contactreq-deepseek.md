# DeepSeek run — 2026-06-14T03:34:02.527Z

- model: deepseek-chat
- task: SLICE 42 — ContactRequestsPage
======================================================================

ROLE: You are a senior front-end reviewer. I am applying a className-ONLY interaction-token + a11y polish pass to a customer-facing React (Vite + Tailwind v4 + shadcn/ui) page. Decide the EXACT className/attribute changes for each interactive control. Be surgical.

HARD RULE (scope): className changes + tiny DISPLAY-ONLY attributes only (aria-label / aria-pressed / aria-expanded). NO logic, NO handlers, NO tabIndex/role/onKeyDown changes, NO state, NO routing, NO data hooks, NO new framer props. If a control is keyboard-inaccessible because it lacks role/tabIndex, FLAG it (do NOT fix).

TOKEN RULES (house style, parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button>/<a>/<Link> (NOT shadcn) get the full set: active:scale-[X] + transition-(all|transform) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Tier scales: wide/card [0.98]; chips/small/segmented-pill-tabs [0.97]; icon-only scale-95; full-width/menu-rows/wide-rows [0.99].
- transition-all when the control ALSO has hover:bg-*/hover:text-*/hover:opacity (color/opacity fade) or underline; transition-transform for PURE icon/press-scale with NO hover color. **State-driven color flips that SNAP (e.g. an active/inactive bg keyed off React state, NOT a `hover:` class) do NOT count as a hover fade → use transition-transform and do NOT churn the snap into a fade.** If transition-all already present, just append the missing tokens (DON'T-CHURN). If a control has NO transition but HAS a hover color and we add active:scale -> add transition-all fresh.
- shadcn <Button> already ships tokens -> DO NOT add className tokens.
- ring-inset KEY CSS FACT: overflow-hidden clips DESCENDANTS, not an element's OWN box-shadow/ring. ring-inset only when a focusable control sits FLUSH inside a SEPARATE overflow-hidden rounded ancestor. A control in a padded (p-1/p-3) non-overflow-hidden container -> OUTWARD ring.
- Controls with visible text get their accessible name from text (no aria-label needed); icon-only controls NEED aria-label. **aria-pressed ONLY for toggle/segmented controls conveying state ONLY by bg AND that DON'T already use the tab pattern. A button that ALREADY has `role="tab"` + `aria-selected` MUST NOT also get `aria-pressed` (that double-encodes/breaks the tab semantics) — keep its existing role+aria-selected untouched.**

PAGE: src/pages/chat/ContactRequestsPage.tsx (118 lines, chat sub-page reached via in-app nav, plain `<div>` root [NO SwipeBackContainer / NO SEOHead], `useContactRequests()` hook supplies incoming/outgoing/accept/decline/cancel/resend, `tab` useState "in"|"out"). "Contact Requests" — incoming + outgoing contact requests w/ resend. Layout: a sticky `<header>` (RAW back button + "Contact Requests" h1); a segmented `role="tablist"` pill container (`grid grid-cols-2 gap-1 p-1 rounded-full bg-muted/60`) holding 2 RAW tab buttons; then a scrollable list — loading text, an empty-state (shadcn "Find friends" Button), and request rows (each a plain presentational `<div>` `flex items-center gap-3 p-3 rounded-2xl bg-card border`, NO onClick: Avatar + name/message/meta + conditional action buttons).

SEVEN edits to resolve (all 7 are RAW <button type="button"> that currently have NO transition + NO ring):

(A) Back button, L37 — RAW, icon-only (ArrowLeft), `aria-label="Back"`, `onClick={goBack}`. className = "h-9 w-9 rounded-full hover:bg-muted/60 flex items-center justify-center". In the `<header>` (not overflow-hidden).
Q-A: ADD `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (FRESH `transition-all` because it HAS `hover:bg-muted/60` color fade → the new transform AND the hover-bg both need easing; icon-only tier scale-95; KEEP aria-label; OUTWARD ring). Agree?

(B) "Incoming" tab, L45 + (C) "Sent" tab, L53 — RAW, **ALREADY `role="tab"` + `aria-selected={tab === "in"/"out"}`**, visible text ("Incoming · N" / "Sent · N", the WORD constant per tab), `onClick={() => setTab("in"/"out")}`. className = `` `h-9 rounded-full text-sm font-medium ${tab === "in" ? "bg-background shadow-sm" : "text-muted-foreground"}` `` (a STATE-DRIVEN active/inactive bg, NO `hover:` class). Both sit FLUSH-ish inside the `grid grid-cols-2 gap-1 p-1 rounded-full bg-muted/60` segmented container (p-1 = 4px, NOT overflow-hidden).
Q-BC: append `transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` into each template-literal BASE (before the `${...}`). Confirm: **segmented-pill-tab tier `[0.97]`**; **`transition-transform` NOT `transition-all`** (the bg change is a STATE-driven snap keyed off `tab`, NOT a `hover:` fade → there is no color fade to ease, only the press transform → transition-transform; transition-all would be churn easing a state snap that's meant to be instant); **KEEP the existing `role="tab"` + `aria-selected`, add NO `aria-pressed`** (tab pattern already encodes selection; aria-pressed would conflict); visible text → NO aria-label; **OUTWARD ring** (container is `p-1 rounded-full` but NOT overflow-hidden → ring not clipped → no ring-inset). Agree, and is `[0.97]` + transition-transform + NO-aria-pressed correct here?

(D) Accept button, L93 + (E) Decline button, L96 — RAW, icon-only (Check / X), `aria-label="Accept request"` / `aria-label="Decline request"`, `onClick={() => accept(r.id)}` / `decline(r.id)`. className = "h-9 w-9 rounded-full bg-ig-gradient text-white flex items-center justify-center" / "h-9 w-9 rounded-full bg-muted flex items-center justify-center" (NO hover color). In the `p-3` request row (not overflow-hidden).
Q-DE: append `transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to each. Confirm: icon-only scale-95; **transition-transform** (no hover color → pure press); KEEP aria-labels; OUTWARD ring. Agree?

(F) Cancel button, L102 — RAW, visible text "Cancel", `onClick={() => cancel(r.id)}`. className = "px-3 h-9 rounded-full bg-muted text-xs font-medium" (NO hover color). Same row.
Q-F: append `transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Confirm: small-pill tier `[0.97]`; transition-transform (no hover color); visible text → NO aria-label; NO aria-pressed (one-shot action); OUTWARD ring. Agree?

(G) Resend button, L105 — RAW, visible text "Resend" + RotateCw icon, ALREADY `aria-label="Resend declined request"` (more descriptive than the visible word — KEEP, don't churn), `onClick={() => handleResend(r.id)}`. className = "px-3 h-9 rounded-full bg-emerald-500 text-white text-xs font-medium flex items-center gap-1" (NO hover color). Same row.
Q-G: append `transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Confirm: small-pill tier `[0.97]`; transition-transform (no hover color); KEEP the existing aria-label; NO aria-pressed; OUTWARD ring. Agree?

SKIP (confirm): shadcn "Find friends" `<Button variant="outline" size="sm">` (L70, ships tokens, visible text + onClick nav); the `role="tablist"` container `<div>` (L44, non-interactive wrapper); each request-row `<div>` (L81, NO onClick → presentational); Avatar/AvatarImage/AvatarFallback (L82); all ArrowLeft/Check/X/UserPlus/RotateCw icons + h1/p text (decorative/display).

============================================================
DELIVERABLE: Give the EXACT final className string (+ confirm attrs untouched) for (A)-(G). Resolve esp.: (A) fresh transition-all (hover:bg) vs transition-transform; (B/C) tabs — `[0.97]` + transition-transform (state snap, no hover) + KEEP role=tab/aria-selected + NO aria-pressed + OUTWARD-vs-inset ring (flush in p-1 rounded-full non-overflow-hidden container); (D/E) icon scale-95 + transition-transform; (F/G) small-pill `[0.97]` + transition-transform + (G) keep existing aria-label. Confirm the SKIP list. Note any keyboard/responsive flags. Keep it tight.
- files: src/pages/chat/ContactRequestsPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

# SLICE 42 — ContactRequestsPage: Plan & Diff

## Plan

Seven RAW `<button>` controls need interaction tokens + a11y polish. All are in `src/pages/chat/ContactRequestsPage.tsx`. No logic changes, no new state, no routing changes.

## Proposed Changes

### (A) Back button (L37)
**Before:**
```tsx
className="h-9 w-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
```
**After:**
```tsx
className="h-9 w-9 rounded-full hover:bg-muted/60 flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
**Rationale:** Fresh `transition-all` (has `hover:bg-muted/60` color fade → both hover-bg and press-scale need easing). Icon-only tier → `active:scale-95`. OUTWARD ring (header not overflow-hidden). KEEP `aria-label="Back"`.

### (B) "Incoming" tab (L45) + (C) "Sent" tab (L53)
**Before:**
```tsx
className={`h-9 rounded-full text-sm font-medium ${tab === "in" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
```
**After:**
```tsx
className={`h-9 rounded-full text-sm font-medium transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tab === "in" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
```
**Rationale:** Segmented-pill-tab tier → `[0.97]`. **`transition-transform`** (the bg change is a STATE-driven snap, NOT a `hover:` fade → no color fade to ease; `transition-all` would churn by easing an instant state snap). **KEEP `role="tab"` + `aria-selected`** (tab pattern already encodes selection). **NO `aria-pressed`** (would conflict with tab semantics). OUTWARD ring (container `p-1 rounded-full` but NOT `overflow-hidden` → ring not clipped). Visible text → NO `aria-label`.

### (D) Accept button (L93)
**Before:**
```tsx
className="h-9 w-9 rounded-full bg-ig-gradient text-white flex items-center justify-center"
```
**After:**
```tsx
className="h-9 w-9 rounded-full bg-ig-gradient text-white flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
**Rationale:** Icon-only tier → `active:scale-95`. **`transition-transform`** (no hover color → pure press). KEEP `aria-label="Accept request"`. OUTWARD ring.

### (E) Decline button (L96)
**Before:**
```tsx
className="h-9 w-9 rounded-full bg-muted flex items-center justify-center"
```
**After:**
```tsx
className="h-9 w-9 rounded-full bg-muted flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
**Rationale:** Same as (D). Icon-only tier → `active:scale-95`. `transition-transform` (no hover color). KEEP `aria-label="Decline request"`. OUTWARD ring.

### (F) Cancel button (L102)
**Before:**
```tsx
className="px-3 h-9 rounded-full bg-muted text-xs font-medium"
```
**After:**
```tsx
className="px-3 h-9 rounded-full bg-muted text-xs font-medium transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
**Rationale:** Small-pill tier → `[0.97]`. `transition-transform` (no hover color). Visible text "Cancel" → NO `aria-label`. NO `aria-pressed` (one-shot action). OUTWARD ring.

### (G) Resend button (L105)
**Before:**
```tsx
className="px-3 h-9 rounded-full bg-emerald-500 text-white text-xs font-medium flex items-center gap-1"
```
**After:**
```tsx
className="px-3 h-9 rounded-full bg-emerald-500 text-white text-xs font-medium flex items-center gap-1 transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
**Rationale:** Small-pill tier → `[0.97]`. `transition-transform` (no hover color). **KEEP existing `aria-label="Resend declined request"`** (more descriptive than visible "Resend" text). NO `aria-pressed`. OUTWARD ring.

## SKIP List (confirmed)
- shadcn "Find friends" `<Button>` (L70) — ships tokens, visible text, onClick nav
- `role="tablist"` container `<div>` (L44) — non-interactive wrapper
- Each request-row `<div>` (L81) — NO onClick → presentational
- Avatar/AvatarImage/AvatarFallback (L82) — decorative
- All icons (ArrowLeft/Check/X/UserPlus/RotateCw) + h1/p text — decorative/display

## Flags
- **Keyboard:** All 7 edited controls are real `<button>`s (natively Tab-focusable). Added rings make keyboard focus visible. No `tabIndex`/`role` changes needed.
- **Responsive:** Page uses `min-h-screen bg-background flex flex-col` with `px-4` padding. At 375px: header fits (back button 36px + title), tablist `grid grid-cols-2` fits, request rows `flex items-center gap-3 p-3` with Avatar (48px) + `flex-1 min-w-0` text column + action buttons → no crush. All good.
- **Sub-44px tap targets (repo-wide pattern, not per-page fix):** Back button `h-9 w-9` (36px), Accept/Decline `h-9 w-9` (36px), Cancel/Resend `h-9` (36px), tabs `h-9` (36px).

## Diff

```diff
--- a/src/pages/chat/ContactRequestsPage.tsx
+++ b/src/pages/chat/ContactRequestsPage.tsx
@@ -34,7 +34,7 @@ export default function ContactRequestsPage() {
     <div className="min-h-screen bg-background flex flex-col">
       <header className="flex items-center gap-3 px-4 h-14 border-b border-border/30 sticky top-0 bg-background/95 backdrop-blur z-10 pt-safe">
         <button type="button" onClick={goBack} aria-label="Back" className="h-9 w-9 rounded-full hover:bg-muted/60 flex items-center justify-center">
+          className="h-9 w-9 rounded-full hover:bg-muted/60 flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
           <ArrowLeft className="h-5 w-5" />
         </button>
         <h1 className="font-semibold text-lg">Contact Requests</h1>
@@ -47,7 +47,7 @@ export default function ContactRequestsPage() {
             role="tab"
             aria-selected={tab === "in"}
             onClick={() => setTab("in")}
-            className={`h-9 rounded-full text-sm font-medium ${tab === "in" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
+            className={`h-9 rounded-full text-sm font-medium transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tab === "in" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
           >
             Incoming{incoming.length ? ` · ${incoming.length}` : ""}
           </button>
@@ -55,7 +55,7 @@ export default function ContactRequestsPage() {
             role="tab"
             aria-selected={tab === "out"}
             onClick={() => setTab("out")}
-            className={`h-9 rounded-full text-sm font-medium ${tab === "out" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
+            className={`h-9 rounded-full text-sm font-medium transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tab === "out" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
           >
             Sent{sentPending ? ` · ${sentPending}` : ""}
           </button>
@@ -90,17 +90,17 @@ export default function ContactRequestsPage() {
             {tab === "in" && r.status === "pending" && (
               <div className="flex gap-1.5">
                 <button type="button" onClick={() => accept(r.id)} aria-label="Accept request" className="h-9 w-9 rounded-full bg-ig-gradient text-white flex items-center justify-center">
+                  className="h-9 w-9 rounded-full bg-ig-gradient text-white flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                   <Check className="h-4 w-4" />
                 </button>
                 <button type="button" onClick={() => decline(r.id)} aria-label="Decline request" className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
+                  className="h-9 w-9 rounded-full bg-muted flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                   <X className="h-4 w-4" />
                 </button>
               </div>
             )}
             {tab === "out" && r.status === "pending" && (
-              <button type="button" onClick={() => cancel(r.id)} className="px-3 h-9 rounded-full bg-muted text-xs font-medium">Cancel</button>
+              <button type="button" onClick={() => cancel(r.id)} className="px-3 h-9 rounded-full bg-muted text-xs font-medium transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Cancel</button>
             )}
             {tab === "out" && r.status === "declined" && (
               <button type="button"
                 onClick={() => handleResend(r.id)}
                 aria-label="Resend declined request"
-                className="px-3 h-9 rounded-full bg-emerald-500 text-white text-xs font-medium flex items-center gap-1"
+                className="px-3 h-9 rounded-full bg-emerald-500 text-white text-xs font-medium flex items-center gap-1 transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               >
                 <RotateCw className="h-3.5 w-3.5" /> Resend
               </button>
```

## Verification
After applying, run `npm run update` to confirm type-check + worker type-check + production build pass (0 errors).
