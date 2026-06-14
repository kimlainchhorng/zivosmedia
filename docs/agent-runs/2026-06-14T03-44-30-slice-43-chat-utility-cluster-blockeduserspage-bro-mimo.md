# MiMo run — 2026-06-14T03:44:30.472Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## SLICE 43 — Chat Utility Cluster: BlockedUsersPage + BroadcastListsPage

### Plan

Eight controls total (1 + 7). Four need new `aria-label` additions (B, C, F, G — all icon-only RAW buttons currently missing accessible names). P1-A already has `aria-label="Go back"` (KEEP). The existing emerald ring on P1-A is preserved per DON'T-CHURN. All changes are className + display-only ARIA only.

---

### PAGE 1: `src/pages/chat/BlockedUsersPage.tsx`

**P1-A — Back button (L72)**

| | Before | After |
|---|---|---|
| className | `"w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"` | `"w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none transition-all active:scale-95"` |
| aria-label | `"Go back"` | `"Go back"` (KEEP) |

**Rationale:**
- **KEEP emerald ring** — DON'T-CHURN rule: existing `focus-visible:ring-emerald-500` is valid, do not normalize to `ring-ring`.
- **`transition-all`** (not `transition-transform`) — the button HAS `hover:bg-muted` (color fade) → both the hover-bg AND the new press-scale need easing.
- **`active:scale-95`** — icon-only tier.
- **KEEP `aria-label="Go back"`** — already present and valid.

**SKIP P1 confirmations:**
- ✅ shadcn `<Button size="sm" variant="outline">` "Unblock" L113 — ships tokens, has disabled state. SKIP.
- ✅ `<ul className="… overflow-hidden">` L98 — non-interactive wrapper. Only descendants are shadcn Unblock Buttons in padded `<li>` rows → shadcn handles its own ring; no ring-inset needed. SKIP.
- ✅ Avatar L103, all icons + text. SKIP.

---

### PAGE 2: `src/pages/chat/BroadcastListsPage.tsx`

**P2-B — Back ChevronLeft (L34)**

| | Before | After |
|---|---|---|
| className | `"p-1.5 rounded-full hover:bg-muted/60"` | `"p-1.5 rounded-full hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` |
| aria-label | *(none)* | `"Back"` **ADD** |

**Rationale:** Fresh `transition-all` (has `hover:bg-muted/60`); icon-only `scale-95`; icon-only with no accessible name → ADD `aria-label="Back"`; OUTWARD ring (header not overflow-hidden).

**P2-C — Plus button (L38)**

| | Before | After |
|---|---|---|
| className | `"p-1.5 rounded-full hover:bg-muted/60"` | `"p-1.5 rounded-full hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` |
| aria-label | *(none)* | `"New broadcast list"` **ADD** |

**Rationale:** Identical pattern to B. `aria-label` conveys the action (navigates to `/chat/broadcasts/new`).

**P2-D — "New broadcast list" empty-state CTA pill (L54)**

| | Before | After |
|---|---|---|
| className | `"px-4 py-2 rounded-full bg-ig-gradient text-white text-sm font-medium"` | `"px-4 py-2 rounded-full bg-ig-gradient text-white text-sm font-medium transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` |
| aria-label | — | *(none — visible text)* |

**Rationale:**
- **`transition-transform`** (NOT `transition-all`) — NO `hover:bg`/`hover:text`/`hover:opacity` → pure press-scale. `bg-ig-gradient` is static, not state-driven.
- **Tier `[0.97]`** — small pill CTA (not a wide row/card). Confirmed: pill/chip tier = `[0.97]`.
- Visible text "New broadcast list" supplies the accessible name.
- OUTWARD ring — element sits in a `text-center py-12 px-6` block, no overflow-hidden ancestor.

**P2-E — "Send" row action pill (L69)**

| | Before | After |
|---|---|---|
| className | `"px-3 py-1.5 text-xs font-medium rounded-full bg-ig-gradient text-white"` | `"px-3 py-1.5 text-xs font-medium rounded-full bg-ig-gradient text-white transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` |
| aria-label | — | *(none — visible text)* |

**Rationale:** Same as D. Small pill `[0.97]`; `transition-transform` (no hover color); visible text "Send"; OUTWARD ring (row container `bg-card/60 rounded-xl` is NOT `overflow-hidden`).

**P2-F — Trash/Delete icon button (L75)**

| | Before | After |
|---|---|---|
| className | `"p-1.5 rounded-full hover:bg-muted/60 text-destructive"` | `"p-1.5 rounded-full hover:bg-muted/60 text-destructive transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` |
| aria-label | *(none)* | `"Delete list"` **ADD** |

**Rationale:** Fresh `transition-all` (has `hover:bg-muted/60`); icon-only `scale-95`; icon-only with no name → ADD `aria-label="Delete list"`; OUTWARD ring.

**P2-G — Modal close X button (L88)**

| | Before | After |
|---|---|---|
| className | *(none — bare button)* | `"transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` **ADD** |
| aria-label | *(none)* | `"Close"` **ADD** |

**Rationale:**
- Adding a className from scratch is **in-scope** (className-only change — we're setting a className attribute, not adding logic).
- **`transition-transform`** (no `hover:bg`/`hover:text` → pure press-scale).
- Icon-only `scale-95`; ADD `aria-label="Close"`.
- OUTWARD ring — sits inside `bg-background rounded-2xl p-4` modal panel, NOT `overflow-hidden`.

**P2-H — "Send broadcast" full-width submit (L98)**

| | Before | After |
|---|---|---|
| className | `"w-full py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"` | `"w-full py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` |
| aria-label | — | *(none — visible text)* |

**Rationale:**
- **`transition-transform`** (NOT `transition-all`) — `disabled:opacity-50` is **NOT** a hover color/opacity fade. It only changes when the `disabled` attribute flips, not on `:hover`/`:active` → pure press-scale → `transition-transform` correct.
- **Tier `[0.99]`** — full-width `w-full` menu-row tier.
- Visible text "Send broadcast" (or "Sending…") supplies accessible name.
- OUTWARD ring — inside `p-4` modal panel, not overflow-hidden.

---

### SKIP confirmations (P2)

| Control | Reason | Confirmed |
|---|---|---|
| `<textarea>` L90 | Already has `focus:outline-none focus:ring-2 focus:ring-primary/30`. Text fields never get `active:scale`. DON'T-CHURN. | ✅ |
| All icons (Megaphone, ChevronLeft, Plus, Trash2, Send, X) | Decorative/non-interactive | ✅ |
| All text (h1, h3, p, div) | Non-interactive | ✅ |

### FLAG (do NOT fix)

| Control | Issue | Severity |
|---|---|---|
| Compose modal backdrop `<div>` L84 | `onClick={() => setComposeFor(null)}` click-outside dismiss but `<div>` has no `role="button"` / `tabIndex` / `onKeyDown` → keyboard users cannot dismiss by clicking outside. The X close button (P2-G) is the keyboard path. Established modal pattern across the repo. | Low (X button exists) |

### Keyboard / Responsive flags

| Flag | Detail |
|---|---|
| Sub-44px tap targets | P1-A `w-9 h-9` ~36px; P2-B/C/F/G `p-1.5` ~30px; P2-E `py-1.5` ~24px. Repo-wide compact pattern, not per-page. |
| Responsive @375 | BlockedUsersPage: `<ul>` row `flex items-center gap-3 px-3 py-2.5` → Avatar 44px + gap 12px + flex-1 text + shadcn Unblock ~auto → fits in ~343px inner. BroadcastListsPage: row `flex items-center gap-3 px-4 py-3` → Megaphone 36px + gap 12px + flex-1 text + Send ~56px + Trash 30px + gap 12px → ~343px inner, tight but fits. Modal `max-w-sm` + `p-4` → ~311px inner, textarea + full-width submit fit. |
| Keyboard accessibility | All 8 edited controls are real `<button>` elements (natively Tab-focusable). Added `focus-visible:ring-*` rings are functional on all. |

---

### Exact diffs

**`src/pages/chat/BlockedUsersPage.tsx` — 1 change**

```diff
-          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
+          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none transition-all active:scale-95"
```

**`src/pages/chat/BroadcastListsPage.tsx` — 7 changes**

```diff
-        <button type="button" onClick={goBack} className="p-1.5 rounded-full hover:bg-muted/60">
+        <button type="button" onClick={goBack} aria-label="Back" className="p-1.5 rounded-full hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">

-        <button type="button" onClick={() => nav("/chat/broadcasts/new")} className="p-1.5 rounded-full hover:bg-muted/60">
+        <button type="button" onClick={() => nav("/chat/broadcasts/new")} aria-label="New broadcast list" className="p-1.5 rounded-full hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">

-          <button type="button" onClick={() => nav("/chat/broadcasts/new")} className="px-4 py-2 rounded-full bg-ig-gradient text-white text-sm font-medium">
+          <button type="button" onClick={() => nav("/chat/broadcasts/new")} className="px-4 py-2 rounded-full bg-ig-gradient text-white text-sm font-medium transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">

-                className="px-3 py-1.5 text-xs font-medium rounded-full bg-ig-gradient text-white"
+                className="px-3 py-1.5 text-xs font-medium rounded-full bg-ig-gradient text-white transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

-              <button type="button" onClick={() => deleteList(l.id)} className="p-1.5 rounded-full hover:bg-muted/60 text-destructive">
+              <button type="button" onClick={() => deleteList(l.id)} aria-label="Delete list" className="p-1.5 rounded-full hover:bg-muted/60 text-destructive transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">

-              <button type="button" onClick={() => setComposeFor(null)}><X className="w-4 h-4" /></button>
+              <button type="button" onClick={() => setComposeFor(null)} aria-label="Close" className="transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="w-4 h-4" /></button>

-              className="w-full py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
+              className="w-full py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Summary: 8 className edits, 4 new `aria-label` additions, 0 logic/handler changes. Diff stats: ~16 lines changed across 2 files.**

### Owner verification

1. Run `npm run update` — must pass (type-check + worker type-check + production build).
2. Preview at 375/768/1280 — verify both pages render correctly.
3. The emerald ring on P1-A is intentionally kept (DON'T-CHURN) — if the owner wants `ring-ring` normalization across the board, that's a separate sweep.
4. FLAG: compose modal backdrop `<div>` L84 is keyboard-inaccessible for click-outside dismiss (the X button is the keyboard path).
