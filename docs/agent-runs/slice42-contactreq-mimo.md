# MiMo run — 2026-06-14T03:35:00.627Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Plan

All 7 controls are RAW `<button>`s with zero transitions/rings today. The diff adds interaction tokens to each, respecting: (A) has `hover:bg` → fresh `transition-all`; (B/C) `role="tab"` + state-snap bg → `transition-transform` + keep `role`/`aria-selected`, NO `aria-pressed`; (D–G) no hover color → `transition-transform`. All rings outward (no `overflow-hidden` ancestor). 7 edits, all className-only + zero attribute additions (existing `aria-label`/`role`/`aria-selected` preserved byte-for-byte).

---

## Exact changes — `src/pages/chat/ContactRequestsPage.tsx`

### (A) Back button — append tokens (FRESH `transition-all` because `hover:bg-muted/60`)

**Before (L37):**
```
className="h-9 w-9 rounded-full hover:bg-muted/60 flex items-center justify-center"
```

**After:**
```
className="h-9 w-9 rounded-full hover:bg-muted/60 flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

Attrs unchanged: `type="button"`, `onClick={goBack}`, `aria-label="Back"` ✓

---

### (B) "Incoming" tab — append tokens to template-literal BASE (`transition-transform`, NO `aria-pressed`)

**Before (L45–51):**
```jsx
className={`h-9 rounded-full text-sm font-medium ${tab === "in" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
```

**After:**
```jsx
className={`h-9 rounded-full text-sm font-medium transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tab === "in" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
```

Attrs unchanged: `type="button"`, `role="tab"`, `aria-selected={tab === "in"}`, `onClick={() => setTab("in")}` ✓ — NO `aria-pressed` added (tab pattern already encodes selection).

---

### (C) "Sent" tab — identical treatment

**Before (L53–59):**
```jsx
className={`h-9 rounded-full text-sm font-medium ${tab === "out" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
```

**After:**
```jsx
className={`h-9 rounded-full text-sm font-medium transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tab === "out" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
```

Attrs unchanged: `type="button"`, `role="tab"`, `aria-selected={tab === "out"}`, `onClick={() => setTab("out")}` ✓

---

### (D) Accept button — append tokens (`transition-transform`, no hover color)

**Before (L93):**
```
className="h-9 w-9 rounded-full bg-ig-gradient text-white flex items-center justify-center"
```

**After:**
```
className="h-9 w-9 rounded-full bg-ig-gradient text-white flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

Attrs unchanged: `type="button"`, `onClick={() => accept(r.id)}`, `aria-label="Accept request"` ✓

---

### (E) Decline button — append tokens

**Before (L96):**
```
className="h-9 w-9 rounded-full bg-muted flex items-center justify-center"
```

**After:**
```
className="h-9 w-9 rounded-full bg-muted flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

Attrs unchanged: `type="button"`, `onClick={() => decline(r.id)}`, `aria-label="Decline request"` ✓

---

### (F) Cancel button — append tokens (small-pill `[0.97]`)

**Before (L102):**
```
className="px-3 h-9 rounded-full bg-muted text-xs font-medium"
```

**After:**
```
className="px-3 h-9 rounded-full bg-muted text-xs font-medium transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

Attrs unchanged: `type="button"`, `onClick={() => cancel(r.id)}` ✓ (visible text → no `aria-label`)

---

### (G) Resend button — append tokens (KEEP existing `aria-label`)

**Before (L105–110):**
```
className="px-3 h-9 rounded-full bg-emerald-500 text-white text-xs font-medium flex items-center gap-1"
```

**After:**
```
className="px-3 h-9 rounded-full bg-emerald-500 text-white text-xs font-medium flex items-center gap-1 transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

Attrs unchanged: `type="button"`, `onClick={() => handleResend(r.id)}`, `aria-label="Resend declined request"` ✓

---

## SKIP list (confirmed)

| Control | Reason |
|---|---|
| shadcn `<Button>` "Find friends" (L70) | Ships built-in tokens |
| `role="tablist"` container `<div>` (L44) | Non-interactive wrapper |
| Request-row `<div>` (L81) | No `onClick` — presentational |
| Avatar/AvatarImage/AvatarFallback (L82) | Display |
| All ArrowLeft/Check/X/UserPlus/RotateCw icons | Decorative children |
| h1, p, span text elements | Display |

---

## Decision rationale for contested points

| Question | Decision | Why |
|---|---|---|
| (A) `transition-all` vs `transition-transform` | **`transition-all`** | Has `hover:bg-muted/60` — the bg color fade needs easing alongside the new press scale. `transition-transform` would leave the hover-bg snapping instant. |
| (B/C) `transition-transform` not `transition-all` | **`transition-transform`** | The bg flip is a **state-driven snap** (`tab === "in"` React state), NOT a `hover:` class. There is no color fade to ease — only the press transform. `transition-all` would churn by easing a state-snap that's meant to be instant. |
| (B/C) NO `aria-pressed` | **Correct — omit** | Controls already have `role="tab"` + `aria-selected` → selection is semantically encoded. Adding `aria-pressed` would double-encode/break the tab pattern per the token rules. |
| (B/C) OUTWARD ring (not `ring-inset`) | **OUTWARD** | Container has `p-1 rounded-full` but NO `overflow-hidden`. Per the CSS FACT: `overflow-hidden` clips descendants; without it, the outward ring is fully visible. |
| (D–G) `transition-transform` | **Correct** | No `hover:` color/opacity on any of these four controls → pure press-scale → `transition-transform` eases exactly the one animated property. |

---

## Flags

- **Sub-44px tap targets** (established repo compact pattern, not per-page fix): Back `h-9 w-9` ~36px, Accept/Decline `h-9 w-9` ~36px, Cancel/Resend `h-9` ~36px, tabs `h-9` ~36px.
- **Responsive @375px** — clean: `px-4` → ~343px inner; tab grid `grid grid-cols-2 gap-1 p-1` → two equal columns fit; request rows `flex items-center gap-3 p-3` with Avatar 48px + gap 12px + `flex-1 min-w-0` text + action buttons (~81px for Accept+Decline or ~auto for Cancel/Resend) → fits within 343px.
- **Keyboard** — all 7 edited controls are real `<button>`s (natively Tab-focusable); added focus-visible rings are functional.
- **Owner flag (logic, out of scope):** the `handleResend` wrapper calls `resend(id)` then inspects `r.ok`/`r.duplicate` — this works but the `any` typing on `r` could be tightened later.

---

## Verification

Must pass `npm run update` (type-check + worker type-check + production build — 0 errors). Diff is **7 className in-place edits, 0 new attributes, 0 logic lines touched** — minimal risk.

Ready for Claude/Codex to apply.
