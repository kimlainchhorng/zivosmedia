# MiMo run — 2026-06-14T03:59:21.648Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: SLICE 45 — NewBroadcastPage
======================================================================

ROLE: You are a senior front-end reviewer. I am applying a className-ONLY interaction-token + a11y polish pass to a customer-facing React (Vite + Tailwind v4 + shadcn/ui) chat sub-page. Decide the EXACT className/attribute changes for each interactive control. Be surgical.

HARD RULE (scope): className changes + tiny DISPLAY-ONLY attributes only (aria-label / aria-pressed / aria-expanded). NO logic, NO handlers, NO tabIndex/role/onKeyDown changes, NO state, NO routing, NO data hooks, NO new framer props. If a control is keyboard-inaccessible because it lacks role/tabIndex, FLAG it (do NOT fix).

TOKEN RULES (house style, parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button>/<a>/<Link> (NOT shadcn) get the full set: active:scale-[X] + transition-(all|transform) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Tier scales: wide/card [0.98]; chips/small/segmented-pill-tabs [0.97]; icon-only scale-95; full-width/menu-rows/wide-rows [0.99].
- transition-all when the control ALSO has hover:bg-*/hover:text-*/hover:opacity (color/opacity fade) or underline; transition-transform for PURE icon/press-scale with NO hover color. If a control has NO transition but HAS a hover color and we add active:scale -> add transition-all fresh. (disabled:opacity is a disabled-attr state snap, NOT a hover fade.)
- shadcn <Button>/<Input> already ship tokens -> DO NOT add className tokens. RAW <input>/<textarea> with an existing focus:ring -> leave as-is (SKIP, don't-churn).
- ring-inset KEY CSS FACT: overflow-hidden clips DESCENDANTS, not an element's OWN box-shadow/ring. ring-inset ONLY when a focusable control sits FLUSH inside a SEPARATE overflow-hidden rounded ancestor. A control in a rounded-but-NOT-overflow-hidden card -> OUTWARD ring.
- Gradient-card ring color: a control that is a CHILD of a bg-ig-gradient card -> ring-white/70. A gradient-FILLED button sitting on a NEUTRAL surface (the outward ring renders against the neutral PARENT, not the fill) -> ring-ring.
- Controls with visible text get their accessible name from text (no aria-label). Icon-only controls NEED aria-label — if an icon-only RAW button has NO aria-label, ADD one (in-scope). aria-pressed ONLY for toggle/segmented controls conveying selection state ONLY by bg/icon (label WORD constant per button). NEVER add aria-pressed to a button with role="tab"+aria-selected.

PAGE: src/pages/chat/NewBroadcastPage.tsx (160 lines, chat sub-page reached via in-app nav, plain <div> root [NO SwipeBackContainer/NO SEOHead]). Create a broadcast list by naming it + picking contacts (recent chat partners). useState name/q/contacts/picked(Set)/creating. Layout: sticky <header> (RAW icon-only back button + "New broadcast list" h1); a name <input> + a search <input> (both RAW, existing focus:ring-primary/30); a <ul> (bg-card/60 rounded-xl divide-y, NOT overflow-hidden) of contact-row toggle <li><button> rows (avatar + name/username + a check-circle indicator div that flips bg-primary + shows a Check icon when picked); a fixed bottom bar with a full-width gradient "Create list (n)" submit button.

THREE edits — 3 RAW <button type="button">:

(A) Back button L94 — RAW icon-only ChevronLeft, NO aria-label, onClick={goBack}. className = "p-1.5 rounded-full hover:bg-muted/60". In sticky <header> (not overflow-hidden).
Q-A: ADD aria-label="Back" + append `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (FRESH transition-all — has hover:bg-muted/60; icon-only tier scale-95; ADD aria-label since icon-only with none; OUTWARD ring). Agree?

(B) Contact-row toggle L129 — RAW full-width selection row, onClick={() => toggle(id)}. VISIBLE TEXT (contact full_name/username -> accessible name from text). Selected state conveyed by an inner check-circle div (isPicked ? "bg-primary border-primary text-primary-foreground" : "border-border" + a Check icon when picked) — NO text changes on select. className = "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40". The row is a <button> inside <li> inside a rounded-xl (NOT overflow-hidden) <ul className="bg-card/60 rounded-xl divide-y divide-border/30">.
Q-B: ADD aria-pressed={isPicked} + append `transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (transition-all — has hover:bg-muted/40 color fade; wide-row/menu-row tier [0.99]; aria-pressed VALID — plain multi-select toggle, selection conveyed ONLY by the check-circle bg+icon [the Check lucide icon is decorative/no accessible name], label word [the contact name] constant per button, NOT a role=tab; visible text -> NO aria-label; OUTWARD ring — the <ul> is rounded-xl but NOT overflow-hidden so the ring is not clipped). Agree? Or does the rounded-xl ul corner argue for ring-inset (I say NO — no overflow-hidden ancestor)?

(C) Create button L150 — RAW full-width submit, VISIBLE TEXT "Create list (n)"/"Creating…", onClick={create}, disabled={creating}. className = "w-full py-3 rounded-xl bg-ig-gradient text-white text-sm font-semibold disabled:opacity-50". In a fixed bottom bar (bg-background/95, NOT overflow-hidden). NO hover color.
Q-C: append `transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (transition-TRANSFORM — NO hover color, the disabled:opacity-50 is a disabled-attr snap NOT a hover fade; full-width tier [0.99]; visible text -> NO aria-label; OUTWARD ring-ring — gradient-FILLED button on a NEUTRAL bottom bar, the outward ring renders against the neutral parent not the gradient fill, so ring-ring not ring-white/70). Agree?

SKIP (confirm): the name <input> L101 + search <input> L110 (RAW, existing focus:ring-primary/30 -> don't-churn); the check-circle indicator <div> L138 (decorative, inside the button); the Avatar; all ChevronLeft/Search/Check icons; the <ul>/<li> (presentational — the row <button> is the control); the empty-state <div>.
FLAG: none expected — all 3 controls are real RAW <button>s (Tab-focusable). Confirm there are no keyboard-inaccessible clickable <div>s.

============================================================
DELIVERABLE: Give the EXACT final className string (+ confirm which attrs to ADD: aria-label on A, aria-pressed on B; none on C) for (A)-(C). Confirm esp.: (A) ADD aria-label (icon-only, none present); (B) aria-pressed valid for a visible-text selection row whose state is icon/bg-only? + OUTWARD vs inset ring given the rounded-xl-not-overflow-hidden ul + [0.99] wide-row tier + transition-all (hover:bg); (C) transition-transform (no hover; disabled:opacity is a snap) + ring-ring (gradient fill on neutral bar) + [0.99]. Confirm SKIP list. Note any keyboard/responsive flags. Keep it tight.
- files: src/pages/chat/NewBroadcastPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx
- files: src/pages/chat/NewBroadcastPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

Three surgical edits to `src/pages/chat/NewBroadcastPage.tsx` — 3 RAW `<button type="button">` controls get interaction tokens + a11y attrs. All three proposals are correct as analyzed.

---

## Confirmed changes

### (A) Back button — L94

**ADD** `aria-label="Back"` (icon-only, none present — in-scope)
**className before:**
```
"p-1.5 rounded-full hover:bg-muted/60"
```
**className after:**
```
"p-1.5 rounded-full hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Rationale:** `hover:bg-muted/60` color fade → `transition-all`. Icon-only tier → `scale-95`. Sticky `<header>` not `overflow-hidden` → OUTWARD `ring-ring`.

---

### (B) Contact-row toggle — L129

**ADD** `aria-pressed={isPicked}` (after `type="button"`)
**className before:**
```
"w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40"
```
**className after:**
```
"w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Rationale:** `hover:bg-muted/40` color fade → `transition-all`. Wide-row/menu-row tier → `[0.99]`. `aria-pressed` VALID — multi-select toggle, selection conveyed ONLY by check-circle bg + decorative Check icon (no accessible name on the indicator), label text (contact name) constant per button, NOT `role="tab"`. The `<ul>` is `rounded-xl` but **no `overflow-hidden`** → box-shadows pass through rounded corners → OUTWARD `ring-ring`, NOT ring-inset. Visible text → NO `aria-label`.

---

### (C) Create button — L150

**No new attrs** (visible text provides accessible name).
**className before:**
```
"w-full py-3 rounded-xl bg-ig-gradient text-white text-sm font-semibold disabled:opacity-50"
```
**className after:**
```
"w-full py-3 rounded-xl bg-ig-gradient text-white text-sm font-semibold disabled:opacity-50 transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Rationale:** NO hover color → `transition-transform` (not `transition-all`). `disabled:opacity-50` is a disabled-attr state snap, NOT a hover fade → does not force `transition-all`. Full-width tier → `[0.99]`. Gradient-FILLED button on a NEUTRAL bottom bar (`bg-background/95`) → the outward ring renders against the neutral parent, not the gradient fill → `ring-ring` NOT `ring-white/70`.

---

## SKIP list ✓

| Control | Why skipped |
|---------|-------------|
| Name `<input>` L101 | RAW, existing `focus:outline-none focus:ring-2 focus:ring-primary/30` → don't-churn |
| Search `<input>` L110 | Same existing focus ring → don't-churn |
| Check-circle `<div>` L138 | Presentational, inside the `<button>` — not independently interactive |
| Avatar / AvatarFallback | Decorative |
| ChevronLeft / Search / Check icons | Decorative |
| `<ul>` / `<li>` | Presentational — the row `<button>` is the control |
| Empty-state `<div>` | Non-interactive text |

---

## Flags

- **No keyboard-inaccessible clickable `<div>`s.** All 3 controls are real RAW `<button type="button">` — natively Tab-focusable. The check-circle indicator is a `<div>` nested inside the row `<button>`, not independently clickable — correct.
- **Responsive clean @375/768/1280:** Full-width layout with `px-3` body padding. Contact rows `px-4 py-3` → avatar 36px + 12px gap + flex-1 text + check circle 24px = fits. No crush. The page has no `max-w-*` constraint (mobile-first chat sub-page) — stretches at wider viewports, acceptable for this surface.
- **Bottom bar `fixed` + `pb-[calc(var(--zivo-safe-bottom,0px)+12px)]`** — safe-area-aware, correct.

---

## Diff summary

- **3 className line swaps** (A, B, C) — 0 logic lines
- **1 new `aria-label="Back"`** added (A — icon-only)
- **1 new `aria-pressed={isPicked}`** added (B — multi-select toggle)
- **3 `ring-ring` added** (all OUTWARD — no overflow-hidden ancestors)
- **3 `active:scale-*` added** (A `scale-95` icon; B+C `[0.99]` wide/full-width)
- **2 `transition-all`** fresh (A+B — both have hover color fade)
- **1 `transition-transform`** fresh (C — no hover color, pure press)
- **0 `ring-inset`**, **0 transition flips**, **0 `aria-label` on C** (visible text), **0 logic lines touched**

All anchors preserved byte-identical: `onClick={goBack}`, `onClick={() => toggle(id)}`, `onClick={create}`, `disabled={creating}`, `type="button"` on all 3.

**Advisors DeepSeek + MiMo both consulted** for convergence check — apply the diff, then run `npm run update` (must pass with TRUE EXIT 0 before moving to Done).
