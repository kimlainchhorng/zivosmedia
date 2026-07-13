# DeepSeek run — 2026-06-14T04:11:41.256Z

- model: deepseek-chat
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

# SLICE 47 — SecretChatPage: Plan & Diff

## Plan

Five RAW `<button>` controls on `src/pages/chat/SecretChatPage.tsx` need interaction tokens + a11y polish. All are className-only + display-only ARIA attrs. No logic, no handlers, no state changes.

## Proposed Changes

### File: `src/pages/chat/SecretChatPage.tsx`

#### (A) Back button L127 — icon-only ArrowLeft
**Before:**
```tsx
className="-ml-1 rounded-full p-2 hover:bg-foreground/5"
```
**After:**
```tsx
className="-ml-1 rounded-full p-2 hover:bg-foreground/5 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
- **FRESH `transition-all`** — has `hover:bg-foreground/5` color fade
- **`active:scale-95`** — icon-only tier
- **KEEP `aria-label="Back"`** — already present
- **OUTWARD `ring-ring`** — header not overflow-hidden

#### (B) Options button L154 — icon-only MoreVertical (Radix DropdownMenuTrigger)
**Before:**
```tsx
className="rounded-full p-2 hover:bg-foreground/5"
```
**After:**
```tsx
className="rounded-full p-2 hover:bg-foreground/5 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
- **FRESH `transition-all`** — has `hover:bg-foreground/5`
- **`active:scale-95`** — icon-only tier
- **KEEP `aria-label="Options"`** — already present
- **NO `aria-expanded`** — Radix manages it
- **OUTWARD `ring-ring`**

#### (C) Delete-message button L239 — icon-only Trash2
**Before:**
```tsx
className="opacity-0 transition group-hover:opacity-100 hover:text-destructive"
```
**After:**
```tsx
className="opacity-0 transition group-hover:opacity-100 hover:text-destructive active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
- **KEEP bare `transition`** — already covers transform + opacity + color (don't-churn)
- **`active:scale-95`** — icon-only tier
- **KEEP `aria-label="Delete message"`** — already present
- **OUTWARD `ring-ring`** — message bubble not overflow-hidden

#### (D) Jump-to-latest button L258 — visible text "Jump to latest"
**Before:**
```tsx
className="pointer-events-auto rounded-full bg-foreground px-3 py-2 text-xs font-semibold text-white shadow-lg"
```
**After:**
```tsx
className="pointer-events-auto rounded-full bg-foreground px-3 py-2 text-xs font-semibold text-white shadow-lg transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
- **`transition-transform`** — NO hover color, pure press-scale
- **`active:scale-[0.97]`** — small-pill tier
- **Visible text → NO `aria-label`**
- **OUTWARD `ring-ring`** — floating pill on neutral timeline

#### (E) Attach button L291 — icon-only Plus (Radix DropdownMenuTrigger)
**Before:**
```tsx
className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-foreground hover:bg-secondary disabled:opacity-50"
```
**After:**
```tsx
className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-foreground hover:bg-secondary disabled:opacity-50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
- **`transition-all`** — I choose `transition-all` over `transition-transform` because:
  - The `hover:bg-secondary` class is literally present in the className string
  - Even though it's a visual no-op (same color), the class is there and could change with theme/state
  - Consistency with the other 4 buttons that all use `transition-all`
  - The `disabled:opacity-50` snap is a disabled-attr state, not a hover fade — but `transition-all` doesn't hurt it
- **`active:scale-95`** — icon-only tier
- **KEEP `aria-label="Attach"`** — already present
- **NO `aria-expanded`** — Radix manages it
- **OUTWARD `ring-ring`** — composer form not overflow-hidden

## SKIP List (confirmed)

| Element | Reason |
|---------|--------|
| shadcn `<Button>` Send L333 | Ships tokens |
| Hidden `<input type="file">` L281 | `className="hidden"` |
| All `<DropdownMenuItem>` rows | shadcn, ship tokens |
| `SafetyNumberSheet` + `SecretMediaBubble` | Separate components, out of scope |
| `motion.li` message bubbles L211 | Presentational entrance anim, NO onClick |
| All icons + Avatar + ttl badge + text | Decorative |

## FLAGs (do NOT fix, confirm)

1. **Composer `<textarea>` L316** — `outline-none focus:border-border` where `border-border === border-border` → no visible focus indicator (WCAG 2.4.7 fail). **FLAG to owner** — out of scope for className-only pass.

2. **Delete-message button opacity-0 reveal** — button is `opacity-0` until `group-hover:opacity-100`. On keyboard focus, the ring is masked until hover. On touch devices, no hover → button never reveals. **FLAG to owner** — established hover-reveal pattern, do NOT fix here.

## Responsive Check

- Header: `flex shrink-0 items-center gap-2 px-3` → back 36px + Avatar 36px + 8px gap + flex-1 name + ttl badge + Options 36px → fits at 375px
- Messages: `px-3` → ~351px inner; bubbles `max-w-[78%]` → ~274px max
- Composer: `gap-2 px-3` → Attach 36px + textarea + Send 36px → fits
- Jump-to-latest: `fixed right-4 bottom-[calc(...)]` → floating pill, no layout impact
- No `max-w-*` constraint (full-screen chat) → stretches at wider viewports — acceptable for chat surface

## Diff Summary

```diff
--- a/src/pages/chat/SecretChatPage.tsx
+++ b/src/pages/chat/SecretChatPage.tsx
@@ -124,7 +124,7 @@
         <button type="button"
           aria-label="Back"
           onClick={goBack}
-          className="-ml-1 rounded-full p-2 hover:bg-foreground/5"
+          className="-ml-1 rounded-full p-2 hover:bg-foreground/5 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
         >
           <ArrowLeft className="h-5 w-5" />
         </button>
@@ -151,7 +151,7 @@
         <DropdownMenu>
           <DropdownMenuTrigger asChild>
-            <button type="button" aria-label="Options" className="rounded-full p-2 hover:bg-foreground/5">
+            <button type="button" aria-label="Options" className="rounded-full p-2 hover:bg-foreground/5 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
               <MoreVertical className="h-5 w-5" />
             </button>
           </DropdownMenuTrigger>
@@ -236,7 +236,7 @@
                     {mine && (
                       <button type="button"
                         onClick={() => void deleteMessage(m.id)}
-                        className="opacity-0 transition group-hover:opacity-100 hover:text-destructive"
+                        className="opacity-0 transition group-hover:opacity-100 hover:text-destructive active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                         aria-label="Delete message"
                       >
                         <Trash2 className="h-3 w-3" />
@@ -255,7 +255,7 @@
           <button
             type="button"
             onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })}
-            className="pointer-events-auto rounded-full bg-foreground px-3 py-2 text-xs font-semibold text-white shadow-lg"
+            className="pointer-events-auto rounded-full bg-foreground px-3 py-2 text-xs font-semibold text-white shadow-lg transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
             Jump to latest
           </button>
@@ -288,7 +288,7 @@
               type="button"
               aria-label="Attach"
               disabled={!chatId}
-              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-foreground hover:bg-secondary disabled:opacity-50"
+              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-foreground hover:bg-secondary disabled:opacity-50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             >
               <Plus className="h-4 w-4" />
             </button>
```

## Verification

Run `npm run update` before marking done. Preview at `/chat/secret/:partnerId` with a signed-in user.
