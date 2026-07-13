# DeepSeek run — 2026-06-14T03:43:27.226Z

- model: deepseek-chat
- task: SLICE 43 — chat utility cluster: BlockedUsersPage + BroadcastListsPage
======================================================================

ROLE: You are a senior front-end reviewer. I am applying a className-ONLY interaction-token + a11y polish pass to two customer-facing React (Vite + Tailwind v4 + shadcn/ui) chat sub-pages. Decide the EXACT className/attribute changes for each interactive control. Be surgical.

HARD RULE (scope): className changes + tiny DISPLAY-ONLY attributes only (aria-label / aria-pressed / aria-expanded). NO logic, NO handlers, NO tabIndex/role/onKeyDown changes, NO state, NO routing, NO data hooks, NO new framer props. If a control is keyboard-inaccessible because it lacks role/tabIndex, FLAG it (do NOT fix).

TOKEN RULES (house style, parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button>/<a>/<Link> (NOT shadcn) get the full set: active:scale-[X] + transition-(all|transform) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Tier scales: wide/card [0.98]; chips/small/segmented-pill-tabs [0.97]; icon-only scale-95; full-width/menu-rows/wide-rows [0.99].
- transition-all when the control ALSO has hover:bg-*/hover:text-*/hover:opacity (color/opacity fade) or underline; transition-transform for PURE icon/press-scale with NO hover color. State-driven color flips that SNAP (active/inactive bg keyed off React state, NOT a `hover:` class) do NOT count as a hover fade -> transition-transform. If transition-all already present, just append the missing tokens (DON'T-CHURN). If a control has NO transition but HAS a hover color and we add active:scale -> add transition-all fresh.
- shadcn <Button> already ships tokens -> DO NOT add className tokens.
- ring-inset KEY CSS FACT: overflow-hidden clips DESCENDANTS, not an element's OWN box-shadow/ring. ring-inset only when a focusable control sits FLUSH inside a SEPARATE overflow-hidden rounded ancestor. A control in a padded (p-1.5/px-3/py-3) non-overflow-hidden container -> OUTWARD ring.
- DON'T-CHURN existing rings: if a RAW button ALREADY has a focus-visible ring (even a non-`ring-ring` accent color like ring-emerald-500), KEEP that ring as-is; just ADD the missing transition + active:scale. Do not renormalize the ring color.
- Controls with visible text get their accessible name from text (no aria-label). Icon-only controls NEED aria-label — if an icon-only RAW button currently has NO aria-label, ADD one (this is in the display-only allowlist). aria-pressed ONLY for toggle/segmented controls conveying state ONLY by bg.

================= PAGE 1: src/pages/chat/BlockedUsersPage.tsx (129 lines) =================
Chat sub-page reached via in-app nav, plain <div> root (NO SwipeBackContainer/SEOHead). Lists users you've blocked w/ unblock. supabase blocked_users + profiles; unblock() calls edge fn. Layout: sticky <header> (RAW back button + "Blocked" h1); a body that is loading text / empty-state / a <ul class="divide-y rounded-2xl border bg-card overflow-hidden"> of <li> rows (Avatar + name/username + shadcn "Unblock" Button).

ONE edit:
(P1-A) Back button L72 — RAW, icon-only (ArrowLeft), ALREADY aria-label="Go back" (KEEP), onClick={goBack}. className = "w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none" (ALREADY has a focus-visible emerald ring + hover:bg-muted, but NO transition + NO active:scale). In the <header> (not overflow-hidden).
Q-P1A: append `transition-all active:scale-95` (FRESH transition-all because it HAS hover:bg-muted color fade; icon-only tier scale-95; KEEP the existing focus-visible:ring-emerald-500 + outline-none AS-IS — don't renormalize to ring-ring [DON'T-CHURN existing ring]; KEEP aria-label="Go back"). Confirm: keep emerald ring (don't churn) vs normalize to ring-ring? And transition-all (hover:bg) correct?

SKIP (confirm) P1: shadcn "Unblock" <Button size="sm" variant="outline"> L113 (ships tokens, has disabled state); the <ul> overflow-hidden wrapper L98 (non-interactive — the only interactive descendants are shadcn Unblock Buttons sitting in <li> px-3 py-2.5 padded rows, NOT flush -> shadcn handles its own ring, no ring-inset needed); Avatar L103; all ArrowLeft/ShieldOff/Loader2 icons + h1/p/div text.

================= PAGE 2: src/pages/chat/BroadcastListsPage.tsx (111 lines) =================
Chat sub-page reached via in-app nav, plain <div> root. Manage broadcast lists + send a broadcast. useBroadcastLists() hook (lists/isLoading/deleteList/sendBroadcast); composeFor/text/sending useState; a compose modal. Layout: sticky <header> (RAW back ChevronLeft + "Broadcast Lists" h1 + RAW Plus button); a hint <p>; body = loading / empty-state (Megaphone + RAW "New broadcast list" pill) / a list (bg-card/60 rounded-xl divide-y, NOT overflow-hidden) of rows (Megaphone badge + name/members + RAW "Send" pill + RAW Trash2 icon); a conditional compose modal (fixed inset-0 backdrop div w/ onClick-dismiss + a panel: title + RAW X close + RAW <textarea> + RAW "Send broadcast" full-width submit).

SEVEN edits:
(P2-B) Back button L34 — RAW, icon-only (ChevronLeft), NO aria-label, onClick={goBack}. className = "p-1.5 rounded-full hover:bg-muted/60" (hover:bg, NO transition/ring/scale). In <header> (not overflow-hidden).
Q-P2B: ADD aria-label="Back" + append `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (fresh transition-all — has hover:bg-muted/60; icon tier scale-95; icon-only with NO name -> ADD aria-label; OUTWARD ring). Agree?

(P2-C) Plus button L38 — RAW, icon-only (Plus), NO aria-label, onClick={() => nav("/chat/broadcasts/new")}. className = "p-1.5 rounded-full hover:bg-muted/60". Same header.
Q-P2C: ADD aria-label="New broadcast list" + append `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (same as B). Agree?

(P2-D) "New broadcast list" button L54 — RAW, visible text, onClick={() => nav("/chat/broadcasts/new")}. className = "px-4 py-2 rounded-full bg-ig-gradient text-white text-sm font-medium" (NO hover color). Empty-state CTA pill.
Q-P2D: append `transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (transition-transform — no hover color; visible text -> NO aria-label; OUTWARD ring). Confirm tier: pill CTA [0.97] vs card [0.98]?

(P2-E) "Send" button L69 — RAW, visible text, onClick={() => setComposeFor(l.id)}. className = "px-3 py-1.5 text-xs font-medium rounded-full bg-ig-gradient text-white" (NO hover). Row action pill.
Q-P2E: append `transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (small pill [0.97]; transition-transform; visible text -> no aria-label; OUTWARD ring — row not overflow-hidden). Agree?

(P2-F) Trash/Delete button L75 — RAW, icon-only (Trash2), NO aria-label, onClick={() => deleteList(l.id)}. className = "p-1.5 rounded-full hover:bg-muted/60 text-destructive" (hover:bg). Same row.
Q-P2F: ADD aria-label="Delete list" + append `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (fresh transition-all — has hover:bg; icon tier scale-95; ADD aria-label; OUTWARD ring). Agree?

(P2-G) Modal close X button L88 — RAW, icon-only (X), NO aria-label, NO className at all (bare `<button type="button" onClick={() => setComposeFor(null)}>`), onClick dismiss. In the modal panel (bg-background rounded-2xl p-4, not overflow-hidden).
Q-P2G: ADD aria-label="Close" + ADD className="transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (no hover color -> transition-transform; icon tier scale-95; ADD aria-label; OUTWARD ring). Confirm: transition-transform (no hover) correct, and adding a className from scratch is in-scope (className-only)?

(P2-H) "Send broadcast" submit button L98 — RAW, visible text, onClick={send}, disabled={sending || !text.trim()}. className = "w-full py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50" (full-width; disabled:opacity is NOT a hover fade). In modal panel.
Q-P2H: append `transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (full-width tier [0.99]; transition-transform — disabled:opacity is not a hover color fade, pure press; visible text -> no aria-label; OUTWARD ring). Confirm: [0.99] full-width + transition-transform (does disabled:opacity-50 count as an opacity fade requiring transition-all? It only changes on the disabled attr, not hover/active -> NOT a fade -> transition-transform). Agree?

SKIP (confirm) P2: the RAW <textarea> L90 (has focus:outline-none focus:ring-2 focus:ring-primary/30 -> existing focus ring, never active:scale a text field, DON'T-CHURN); all Megaphone/ChevronLeft/Plus/Trash2/Send/X icons + h1/h3/p/div text.
FLAG (do NOT fix) P2: the compose-modal backdrop <div> L84 has onClick={() => setComposeFor(null)} (click-outside dismiss) but is a non-button <div> with no role/tabIndex/onKeyDown -> keyboard-inaccessible dismiss affordance. FLAG to owner (established modal pattern; the X close button is the keyboard path).

============================================================
DELIVERABLE: Give the EXACT final className string (+ confirm/added attrs) for P1-A and P2-B..H (8 controls total). Resolve esp.: (P1-A) keep emerald ring vs normalize to ring-ring + transition-all(hover:bg); (P2-D) pill tier [0.97]-vs-[0.98]; (P2-G) adding a fresh className to a bare button + transition-transform; (P2-H) [0.99] full-width + does disabled:opacity-50 force transition-all-vs-transform. Confirm which icon-only buttons need a NEW aria-label (B/C/F/G) vs which already have one (P1-A "Go back"). Confirm the SKIP + FLAG lists. Note any keyboard/responsive flags. Keep it tight.
- files: src/pages/chat/BlockedUsersPage.tsx, src/pages/chat/BroadcastListsPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx
- files: src/pages/chat/BlockedUsersPage.tsx, src/pages/chat/BroadcastListsPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

# SLICE 43 — BlockedUsersPage + BroadcastListsPage: Interaction Token Pass

## Plan

Apply className-only interaction tokens + display-only ARIA to 8 controls across 2 chat sub-pages. No logic changes, no new framer props, no state changes.

### Controls to edit:

**BlockedUsersPage (1 control):**
- P1-A: Back button — add `transition-all active:scale-95` (keep existing emerald ring)

**BroadcastListsPage (7 controls):**
- P2-B: Back ChevronLeft — add `aria-label="Back"` + full token set
- P2-C: Plus button — add `aria-label="New broadcast list"` + full token set
- P2-D: "New broadcast list" CTA — add `transition-transform active:scale-[0.97]` + ring
- P2-E: "Send" pill — add `transition-transform active:scale-[0.97]` + ring
- P2-F: Trash2 delete — add `aria-label="Delete list"` + full token set
- P2-G: Modal close X — add `aria-label="Close"` + full className from scratch
- P2-H: "Send broadcast" submit — add `transition-transform active:scale-[0.99]` + ring

---

## Proposed Changes

### File 1: `src/pages/chat/BlockedUsersPage.tsx`

**P1-A — Back button (L72):**
```
BEFORE:
className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"

AFTER:
className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none transition-all active:scale-95"
```

**Decision rationale:**
- **Keep emerald ring** — DON'T-CHURN. The existing `focus-visible:ring-emerald-500` is a valid, intentional accent ring. Normalizing to `ring-ring` would be unnecessary churn.
- **`transition-all`** — correct because the button has `hover:bg-muted` (color fade needs easing alongside the new press-scale).
- **`active:scale-95`** — icon-only tier.
- **Keep `aria-label="Go back"`** — already present, no change.

---

### File 2: `src/pages/chat/BroadcastListsPage.tsx`

**P2-B — Back ChevronLeft (L34):**
```
BEFORE:
<button type="button" onClick={goBack} className="p-1.5 rounded-full hover:bg-muted/60">

AFTER:
<button type="button" onClick={goBack} aria-label="Back" className="p-1.5 rounded-full hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**Decision rationale:**
- **ADD `aria-label="Back"`** — icon-only with no accessible name.
- **`transition-all`** — has `hover:bg-muted/60` color fade.
- **`active:scale-95`** — icon-only tier.
- **OUTWARD ring** — header not overflow-hidden.

**P2-C — Plus button (L38):**
```
BEFORE:
<button type="button" onClick={() => nav("/chat/broadcasts/new")} className="p-1.5 rounded-full hover:bg-muted/60">

AFTER:
<button type="button" onClick={() => nav("/chat/broadcasts/new")} aria-label="New broadcast list" className="p-1.5 rounded-full hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**Decision rationale:**
- **ADD `aria-label="New broadcast list"`** — icon-only Plus, no accessible name.
- Same token pattern as P2-B.

**P2-D — "New broadcast list" CTA (L54):**
```
BEFORE:
className="px-4 py-2 rounded-full bg-ig-gradient text-white text-sm font-medium"

AFTER:
className="px-4 py-2 rounded-full bg-ig-gradient text-white text-sm font-medium transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Decision rationale:**
- **`[0.97]`** — pill CTA tier (matches segmented-chip/small-pill precedent, not card `[0.98]`). This is a compact pill button, not a card.
- **`transition-transform`** — no hover color/opacity on this button (pure gradient bg, no `hover:` class).
- **No `aria-label`** — visible text "New broadcast list".
- **OUTWARD ring** — empty-state container not overflow-hidden.

**P2-E — "Send" pill (L69):**
```
BEFORE:
className="px-3 py-1.5 text-xs font-medium rounded-full bg-ig-gradient text-white"

AFTER:
className="px-3 py-1.5 text-xs font-medium rounded-full bg-ig-gradient text-white transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Decision rationale:**
- **`[0.97]`** — small pill tier.
- **`transition-transform`** — no hover color/opacity.
- **No `aria-label`** — visible text "Send".
- **OUTWARD ring** — row `bg-card/60 rounded-xl` is NOT overflow-hidden.

**P2-F — Trash2 delete (L75):**
```
BEFORE:
<button type="button" onClick={() => deleteList(l.id)} className="p-1.5 rounded-full hover:bg-muted/60 text-destructive">

AFTER:
<button type="button" onClick={() => deleteList(l.id)} aria-label="Delete list" className="p-1.5 rounded-full hover:bg-muted/60 text-destructive transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**Decision rationale:**
- **ADD `aria-label="Delete list"`** — icon-only Trash2, no accessible name.
- **`transition-all`** — has `hover:bg-muted/60` color fade.
- **`active:scale-95`** — icon-only tier.
- **OUTWARD ring** — row not overflow-hidden.

**P2-G — Modal close X (L88):**
```
BEFORE:
<button type="button" onClick={() => setComposeFor(null)}><X className="w-4 h-4" /></button>

AFTER:
<button type="button" onClick={() => setComposeFor(null)} aria-label="Close" className="transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="w-4 h-4" /></button>
```

**Decision rationale:**
- **ADD `aria-label="Close"`** — icon-only X, no accessible name.
- **ADD className from scratch** — bare button with no existing className. Adding a className is in-scope (className-only rule).
- **`transition-transform`** — no hover color/opacity.
- **`active:scale-95`** — icon-only tier.
- **OUTWARD ring** — modal panel `bg-background rounded-2xl p-4` is NOT overflow-hidden.

**P2-H — "Send broadcast" submit (L98):**
```
BEFORE:
className="w-full py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"

AFTER:
className="w-full py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Decision rationale:**
- **`[0.99]`** — full-width tier (matches JobPostingDetailPage's full-width "Close gig"/"Apply" buttons).
- **`transition-transform`** — `disabled:opacity-50` is NOT a hover fade. It's a state-driven snap (keyed off `disabled` attribute, not `hover:`). The opacity change only occurs when the button becomes disabled/enabled, not during hover/active. Therefore `transition-transform` is correct — no color/opacity fade to ease.
- **No `aria-label`** — visible text "Send broadcast" / "Sending…".
- **OUTWARD ring** — modal panel not overflow-hidden.

---

## Skip List (confirmed)

**BlockedUsersPage:**
- shadcn "Unblock" `<Button>` L113 — ships tokens
- `<ul>` overflow-hidden wrapper L98 — non-interactive
- Avatar, icons, text — decorative

**BroadcastListsPage:**
- RAW `<textarea>` L90 — has existing `focus:ring-2 focus:ring-primary/30`, never add `active:scale` to text fields
- All icons (ChevronLeft, Plus, Megaphone, Trash2, Send, X) — decorative
- Modal backdrop `<div>` L84 — FLAG (see below)

---

## Flag (do NOT fix)

**P2-FLAG:** Modal backdrop `<div>` L84 has `onClick={() => setComposeFor(null)}` (click-outside dismiss) but is a non-button `<div>` with no `role="dialog"`/`tabIndex`/`onKeyDown`. Keyboard-inaccessible dismiss affordance. The X close button (P2-G) is the keyboard path, but the backdrop pattern is an established modal convention. Flag to owner for potential a11y improvement.

---

## Responsive Check

**BlockedUsersPage:** `px-4` container → ~343px inner at 375px. Row: Avatar 44px + gap 12px + `flex-1 min-w-0` text + shadcn "Unblock" Button (~70px) = fits.

**BroadcastListsPage:** `mx-3` container → ~349px inner at 375px. Row: Megaphone badge 36px + gap 12px + `flex-1 min-w-0` text + "Send" pill (~45px) + Trash2 (32px) + gaps = fits. Modal `max-w-sm` → ~327px at 375px.

No responsive issues.

---

## Summary of Changes

| Control | File | Line | Change |
|---------|------|------|--------|
| P1-A Back | BlockedUsersPage | 72 | Append `transition-all active:scale-95` (keep emerald ring) |
| P2-B Back | BroadcastListsPage | 34 | Add `aria-label="Back"` + full token set |
| P2-C Plus | BroadcastListsPage | 38 | Add `aria-label="New broadcast list"` + full token set |
| P2-D CTA | BroadcastListsPage | 54 | Append `transition-transform active:scale-[0.97]` + ring |
| P2-E Send | BroadcastListsPage | 69 | Append `transition-transform active:scale-[0.97]` + ring |
| P2-F Trash | BroadcastListsPage | 75 | Add `aria-label="Delete list"` + full token set |
| P2-G Close | BroadcastListsPage | 88 | Add `aria-label="Close"` + full className from scratch |
| P2-H Submit | BroadcastListsPage | 98 | Append `transition-transform active:scale-[0.99]` + ring |

**Total: 8 controls, 3 new `aria-label`, 0 `aria-pressed`, 0 logic lines touched.**

Owner to verify: `npm run update` passes, preview both pages at 375/768/1280.
