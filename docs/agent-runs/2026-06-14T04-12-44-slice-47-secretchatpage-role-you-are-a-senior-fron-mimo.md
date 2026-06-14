# MiMo run — 2026-06-14T04:12:44.134Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: SLICE 47 — SecretChatPage
======================================================================

ROLE: You are a senior front-end reviewer. I am applying a className-ONLY interaction-token + a11y polish pass to a customer-facing React (Vite + Tailwind v4 + shadcn/ui + framer-motion + Radix) chat sub-page. Decide the EXACT className/attribute changes for each interactive control. Be surgical.

HARD RULE (scope): className changes + tiny DISPLAY-ONLY attributes only (aria-label / aria-pressed / aria-expanded). NO logic, NO handlers, NO tabIndex/role/onKeyDown changes, NO state, NO routing, NO data hooks, NO new framer props. If a control is keyboard-inaccessible because it lacks role/tabIndex, FLAG it (do NOT fix). NEVER add aria-expanded to a Radix DropdownMenuTrigger — Radix injects aria-haspopup/aria-expanded automatically; a manual one would conflict.

TOKEN RULES (house style, parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button>/<a>/<Link> (NOT shadcn) get the full set: active:scale-[X] + transition-(all|transform) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Tier scales: wide/card [0.98]; chips/small/segmented-pill-tabs [0.97]; icon-only scale-95; full-width/menu-rows/wide-rows [0.99].
- transition-all when the control ALSO has hover:bg-*/hover:text-*/hover:opacity (a real color/opacity FADE) or underline; transition-transform for PURE icon/press-scale with NO hover color. If a control has NO transition but HAS a hover color and we add active:scale -> add transition-all fresh. (disabled:opacity is a disabled-attr state snap, NOT a hover fade.) DON'T-CHURN: if a control already has a transition that covers the new transform, don't renormalize it.
- BARE `transition` (Tailwind) eases a curated property set that INCLUDES transform + opacity + color — so a control that already has bare `transition` does NOT need a flip to transition-all to ease a newly-added active:scale (the bare `transition` already covers it). Leave bare `transition` as-is (don't-churn).
- shadcn <Button>/<Input>/<Textarea> already ship tokens -> DO NOT add className tokens, SKIP. RAW <textarea>/<input> with an existing focus:ring -> leave as-is (SKIP, don't-churn).
- ring-inset KEY CSS FACT: overflow-hidden clips DESCENDANTS, not an element's OWN box-shadow/ring. ring-inset ONLY when a focusable control sits FLUSH inside a SEPARATE overflow-hidden rounded ancestor. A control in a non-overflow-hidden container -> OUTWARD ring.
- Controls with visible text get their accessible name from text (no aria-label). Icon-only controls NEED aria-label — KEEP existing. A Radix DropdownMenuTrigger `asChild` <button> is still a RAW button for tokens (gets active:scale + transition + ring) but its aria-expanded/aria-haspopup are Radix-managed — do NOT add them.

PAGE: src/pages/chat/SecretChatPage.tsx (352 lines, full-screen E2E-encrypted 1-on-1 chat at /chat/secret/:partnerId, has SEOHead, `flex h-[100dvh] flex-col` root). useSecretChat(partnerId) hook; useState draft/sasOpen/showJumpToBottom; refs scrollRef/fileInputRef; a partner useQuery; messages list (framer motion.li bubbles); a header (back + avatar + name + ttl badge + Options dropdown); a composer form (Attach dropdown + hidden file input + textarea + Send).

FIVE RAW <button> edits (the Send button L333 is a shadcn <Button> -> SKIP):

(A) Back button L127 — RAW icon-only ArrowLeft, ALREADY aria-label="Back" (KEEP), onClick={goBack}. className = "-ml-1 rounded-full p-2 hover:bg-foreground/5". In <header> (not overflow-hidden).
Q-A: append `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (FRESH transition-all — has hover:bg-foreground/5 color fade; icon tier scale-95; KEEP aria-label; OUTWARD ring). Agree?

(B) Options button L154 — RAW icon-only MoreVertical, ALREADY aria-label="Options" (KEEP), inside <DropdownMenuTrigger asChild>. className = "rounded-full p-2 hover:bg-foreground/5". In <header>.
Q-B: append `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (FRESH transition-all — has hover:bg-foreground/5; icon tier scale-95; KEEP aria-label; OUTWARD ring; do NOT add aria-expanded — Radix manages it). Agree?

(C) Delete-message button L239 — RAW icon-only Trash2, ALREADY aria-label="Delete message" (KEEP), onClick={() => void deleteMessage(m.id)}. className = "opacity-0 transition group-hover:opacity-100 hover:text-destructive" (it is hidden until the message bubble is group-hovered; has BARE `transition` [covers transform+opacity+color] + group-hover:opacity-100 reveal + hover:text-destructive color). In a message bubble meta row (not overflow-hidden).
Q-C: append `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` and KEEP the existing bare `transition` (do NOT flip to transition-all — bare `transition` already eases the new transform + the existing opacity/color; icon tier scale-95; KEEP aria-label; OUTWARD ring). Agree? OR would you flip bare `transition`->`transition-all`? (I say KEEP bare transition — don't-churn, it already covers transform.) ALSO: the button is `opacity-0` until group-hover, so a keyboard-focus ring is masked until hover, and on touch devices there is no hover to reveal it -> FLAG this opacity-0 reveal limitation to the owner (established hover-reveal pattern, do NOT fix)?

(D) Jump-to-latest button L258 — RAW, VISIBLE TEXT "Jump to latest", onClick={() => scrollRef.current?.scrollTo(...)}. className = "pointer-events-auto rounded-full bg-foreground px-3 py-2 text-xs font-semibold text-white shadow-lg". NO hover color. Floating pill in a `pointer-events-none fixed` wrapper (not overflow-hidden).
Q-D: append `transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (transition-TRANSFORM — NO hover color, pure press; small-pill tier [0.97]; visible text -> NO aria-label; OUTWARD ring-ring — the bg-foreground fill sits on the neutral timeline, the outward ring renders against the neutral page bg). Agree?

(E) Attach button L291 — RAW icon-only Plus, ALREADY aria-label="Attach" (KEEP), inside <DropdownMenuTrigger asChild>, disabled={!chatId}. className = "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-foreground hover:bg-secondary disabled:opacity-50" (NOTE: hover:bg-secondary === bg-secondary -> a NO-OP hover, no actual color fade; disabled:opacity-50 is a disabled-attr snap). In the composer form (not overflow-hidden).
Q-E: append `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (icon tier scale-95; KEEP aria-label; do NOT add aria-expanded — Radix; OUTWARD ring). BUT: is transition-all right given hover:bg-secondary is a NO-OP (same color, no fade)? Should it be transition-TRANSFORM instead (pure press, since there's no real hover fade and disabled:opacity is just a snap)? Decide and justify — I lean transition-all (a hover:bg-* class is literally present) but transition-transform is defensible (the hover is a visual no-op). Pick ONE.

SKIP (confirm): the shadcn Send <Button> L333 (ships tokens); the hidden file <input type="file" className="hidden"> L281; all DropdownMenuItem rows (shadcn, ship tokens); the SafetyNumberSheet + SecretMediaBubble (separate components, out of scope); the framer motion.li message bubbles L211 (presentational entrance anim, NO onClick — only the inner Delete button is a control); all ArrowLeft/Send/Lock/ShieldCheck/Clock/Trash2/RefreshCw/MoreVertical/Plus/ImageIcon/VideoIcon/Mic/Paperclip icons + Avatar + ttl badge + all text.

FLAG (do NOT fix, confirm): (1) the composer <textarea> L316 has `outline-none focus:border-border` — but focus:border-border === the default border-border, so on focus the border does NOT change and the native outline is removed -> NO effective visible focus indicator (WCAG 2.4.7 fail). Per house style RAW text fields are normally SKIPPED/left-alone, and changing its focus model is borderline for a className-only pass -> FLAG to owner (do NOT fix here). Agree it should be FLAGGED not fixed? (2) the Delete-message opacity-0 reveal limitation from Q-C.

============================================================
DELIVERABLE: Give the EXACT final className string (+ confirm attrs: KEEP all existing aria-labels, ADD none, NO aria-expanded on the 2 Radix triggers) for (A)-(E). Resolve the two nuances explicitly: (C) KEEP bare `transition` vs flip to transition-all (I say KEEP); (E) transition-all vs transition-transform given the no-op hover:bg-secondary (pick ONE + justify). Confirm the SKIP list (esp. shadcn Send, hidden file input, Radix dropdown items, motion.li bubbles) and the 2 FLAGs (textarea no-focus-indicator + delete opacity-0 reveal). Note any other keyboard/responsive flags. Keep it tight.
- files: src/pages/chat/SecretChatPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx
- files: src/pages/chat/SecretChatPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

5 RAW `<button>` edits — all append-only className changes + KEEP existing `aria-label` on 4 icon-only controls. 0 new attrs, 0 logic. Two nuanced decisions resolved below.

---

## Resolved Nuances

**(C) bare `transition` → KEEP, do NOT flip to `transition-all`.**
Bare `transition` in Tailwind eases `color`, `background-color`, `border-color`, `text-decoration-color`, `fill`, `stroke`, `opacity`, `box-shadow`, `transform`, `filter`, `backdrop-filter` — it already covers the new `active:scale-95` transform AND the existing `hover:text-destructive` color AND the `group-hover:opacity-100` opacity. Flipping to `transition-all` would be textbook churn (wider property set for zero visual gain). Don't-churn rule applies.

**(E) `hover:bg-secondary` is present but `bg-secondary === bg-secondary` → functionally a no-op hover.**
My call: **use `transition-all`** (literal interpretation — the `hover:bg-*` class IS present). Reasoning: (1) if the theme token changes or a dark-mode override makes them diverge, the transition is already in place; (2) when no color property actually changes, `transition-all` has nothing to ease on that axis — zero overhead; (3) making a subjective "is this hover real enough" judgment per-control introduces inconsistency. The literal rule ("has `hover:bg-*` → `transition-all`") is safer and matches every prior slice.

---

## Exact Diffs — `src/pages/chat/SecretChatPage.tsx`

### (A) Back button — L127
```diff
-          className="-ml-1 rounded-full p-2 hover:bg-foreground/5"
+          className="-ml-1 rounded-full p-2 hover:bg-foreground/5 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
**Attrs:** KEEP `aria-label="Back"` (icon-only, already present).
**Rationale:** `hover:bg-foreground/5` = real color fade → `transition-all`; icon-only tier `scale-95`; OUTWARD `ring-ring` (neutral header bg, no overflow-hidden).

### (B) Options button — L154 (DropdownMenuTrigger asChild)
```diff
-            <button type="button" aria-label="Options" className="rounded-full p-2 hover:bg-foreground/5">
+            <button type="button" aria-label="Options" className="rounded-full p-2 hover:bg-foreground/5 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```
**Attrs:** KEEP `aria-label="Options"`; **NO `aria-expanded`** (Radix injects `aria-haspopup`/`aria-expanded` automatically via `DropdownMenuTrigger asChild` — manual one would conflict).
**Rationale:** identical to (A) — same hover, same tier, same ring direction.

### (C) Delete-message button — L239
```diff
-                        className="opacity-0 transition group-hover:opacity-100 hover:text-destructive"
+                        className="opacity-0 transition group-hover:opacity-100 hover:text-destructive active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
**Attrs:** KEEP `aria-label="Delete message"` (icon-only, already present).
**Rationale:** bare `transition` already eases transform+opacity+color → DON'T flip (don't-churn); append `active:scale-95` (icon tier) + ring only; OUTWARD `ring-ring` (message meta row, not overflow-hidden).

### (D) Jump-to-latest button — L258
```diff
-            className="pointer-events-auto rounded-full bg-foreground px-3 py-2 text-xs font-semibold text-white shadow-lg"
+            className="pointer-events-auto rounded-full bg-foreground px-3 py-2 text-xs font-semibold text-white shadow-lg transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
**Attrs:** none added (visible text "Jump to latest" → accessible name from text).
**Rationale:** NO hover color → `transition-transform` (pure press); small-pill tier `[0.97]`; OUTWARD `ring-ring` (bg-foreground fill on neutral timeline/page bg).

### (E) Attach button — L291 (DropdownMenuTrigger asChild, disabled)
```diff
-              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-foreground hover:bg-secondary disabled:opacity-50"
+              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-foreground hover:bg-secondary disabled:opacity-50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
**Attrs:** KEEP `aria-label="Attach"` (icon-only, already present); **NO `aria-expanded`** (Radix-managed).
**Rationale:** `hover:bg-secondary` is literally present → `transition-all` (literal rule; zero overhead when no property actually changes); icon-only tier `scale-95`; OUTWARD `ring-ring`; `disabled:opacity-50` is a disabled-attr snap, not a hover fade.

---

## SKIP — Confirmed

| Control | Reason |
|---------|--------|
| shadcn `<Button>` Send L333 | Ships tokens |
| Hidden `<input type="file" className="hidden">` L281 | Not user-visible |
| All `<DropdownMenuItem>` rows (5+4 = 9 items) | shadcn, ships tokens |
| `SafetyNumberSheet`, `SecretMediaBubble` | Separate components, out of scope |
| framer `motion.li` message bubbles L211 | Presentational entrance anim, NO onClick |
| All icons (ArrowLeft/Send/Lock/ShieldCheck/Clock/Trash2/RefreshCw/MoreVertical/Plus/ImageIcon/VideoIcon/Mic/Paperclip), Avatar, ttl badge, all text | Decorative |

---

## FLAGs — Confirmed

**(1) Composer `<textarea>` L316 — no effective visible focus indicator (WCAG 2.4.7 fail).**
Current: `outline-none focus:border-border`. The `focus:border-border` value equals the base `border-border` → no visual change on focus, AND the native outline is removed. Per house style, RAW text fields with an existing `focus:ring` are SKIPPED; this one has `outline-none` + a no-op focus:border → effectively NO visible focus. Changing its focus model (`focus:ring-*`) is borderline for a className-only pass (it's an existing pattern, not a new control). **FLAG to owner — do NOT fix here.**

**(2) Delete-message button opacity-0 reveal limitation (Q-C).**
The button is `opacity-0` until `group-hover:opacity-100`. The newly-added `focus-visible:ring` is present in the DOM but **visually masked** (opacity-0) until the parent message bubble is hovered. On keyboard navigation, the ring won't be visible until the user focuses the button — but since it's opacity-0, the entire button (including ring) is invisible. On touch devices with no hover, the button is effectively hidden. This is an **established hover-reveal pattern** (same as chat apps: hover to see delete). **FLAG to owner — do NOT change the reveal mechanism in a className-only pass.**

---

## Diff Summary

```
5 className line-swaps (all append-only)
0 new attrs (4 existing aria-label KEPT, 0 aria-expanded on 2 Radix triggers)
0 logic lines touched
```

**Diff counts:** 5 rings added (all OUTWARD `ring-ring`), 5 `active:scale-*` added (4 × `scale-95` icon + 1 × `[0.97]` pill), 3 FRESH `transition-all` (A, B, E — have `hover:bg-*`), 1 bare `transition` PRESERVED (C — don't-churn), 1 FRESH `transition-transform` (D — no hover), 0 `ring-inset`, 0 transition flips, 0 `aria-label` added/changed, 0 `aria-expanded` added.

**Responsive 375/768/1280 — clean:** Full-screen `flex h-[100dvh] flex-col` chat layout (mobile-first); header `flex items-center gap-2 px-3` → back 40px + avatar 36px + flex-1 name + ttl badge + Options 40px fits at 375; messages are `max-w-[78%]` bubbles; composer `flex items-end gap-2 px-3` → Attach 36px + textarea flex-1 + Send 36px fits; jump-to-latest floating pill `px-3 py-2 text-xs` is compact; at 768/1280 the chat stretches full-width (no max-w, intentional for a chat surface). No crush at any breakpoint.

**No keyboard gaps beyond the 2 FLAGs** — all 5 edited controls are real RAW `<button>`s (natively Tab-focusable); added focus-visible rings are functional (except the opacity-0 masking on C per FLAG-2).

---

## Verify / Deploy

```bash
npm run update
```

Must exit 0 (type-check + worker type-check + production build). Owner commits and deploys.
