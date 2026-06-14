# DeepSeek run — 2026-06-14T04:35:11.670Z

- model: deepseek-chat
- task: SLICE 51 — BotFatherPage
======================================================================

ROLE: You are a senior front-end reviewer. I am applying a className-ONLY interaction-token + a11y polish pass to a customer-facing React (Vite + Tailwind v4 + shadcn/ui) chat bot-management page ("My Bots" / BotFather). Decide the EXACT className/attribute changes for each interactive control. Be surgical.

HARD RULE (scope): className changes + tiny DISPLAY-ONLY attributes only (aria-label / aria-pressed / aria-expanded). NO logic, NO handlers, NO tabIndex/role/onKeyDown changes, NO state, NO routing, NO data hooks, NO new framer props. If a control is keyboard-inaccessible because it lacks role/tabIndex, FLAG it (do NOT fix).

TOKEN RULES (house style, parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button>/<a>/<Link> (NOT shadcn) get the full set: active:scale-[X] + transition-(all|transform) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Tier scales: wide/card [0.98]; chips/small/segmented-pill-tabs [0.97]; icon-only scale-95; full-width/menu-rows/wide-rows [0.99].
- transition-all when the control ALSO has a REAL hover:bg-*/hover:text-*/hover:opacity color/opacity FADE or underline; transition-transform for PURE icon/press-scale with NO hover color. If a control has NO transition but HAS a hover color and we add active:scale -> add transition-all FRESH. (disabled:opacity is a disabled-attr snap, NOT a hover fade.)
- BARE `transition` already eases transform+opacity+color -> if present, KEEP (don't-churn).
- shadcn <Button>/<Switch>/<Input>/<Textarea> already ship tokens -> DO NOT add className tokens, SKIP.
- ring-inset KEY CSS FACT: overflow-hidden clips DESCENDANTS, not an element's OWN box-shadow/ring. ring-inset ONLY when a focusable control sits FLUSH inside a SEPARATE overflow-hidden rounded ancestor. A control in a rounded-but-NOT-overflow-hidden container -> OUTWARD ring.
- Controls with visible text get their accessible name from text (no aria-label). Icon-only controls NEED aria-label — KEEP existing. aria-pressed ONLY for toggle/segmented controls conveying selection state by bg (NOT one-shot nav/create actions).

PAGE: src/pages/chat/BotFatherPage.tsx (461 lines, Telegram-style "My Bots" bot-management, plain <div> root, min-h-screen). useSmartBack; supabase (bot-create function / bots select / is_bot_admin rpc); bots/loading/createOpen/tokenOpen/creatingTpl/helpOpen/isAdmin useState. Layout: sticky header (RAW icon-only back + "My Bots" h1 + RAW icon-only Info/help + shadcn "New" Button); an intro <p>; a "Quick start" 2-col grid of 4 RAW template cards (AI/FAQ/Echo/Quote, each creates a bot); a 2-col grid of 2 RAW nav cards (Bot inbox / Discover); a conditional (isAdmin) RAW full-width Bot-admin row; then loading/empty/results — the results are a divide-y list of RAW bot rows (each navigates to /chat/bots/:id). Plus 3 Dialogs (help, token-save, CreateBotDialog) full of shadcn Buttons/Input/Textarea — all OUT OF SCOPE (ship tokens).

SEVEN RAW <button> edits:

(A) Back L177 — RAW icon-only ArrowLeft, ALREADY aria-label="Back" (KEEP), onClick={goBack}. className = "p-2 -ml-2 rounded-full hover:bg-muted". In sticky header (not overflow-hidden).
Q-A: append `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (FRESH transition-all — hover:bg-muted color fade, no prior transition; icon tier scale-95; KEEP aria-label; OUTWARD ring). Agree?

(B) Info/help L181 — RAW icon-only Info, ALREADY aria-label="How bots work" (KEEP), onClick={() => setHelpOpen(true)} (opens a Dialog). className = "p-2 -mr-1 rounded-full hover:bg-muted". In sticky header.
Q-B: append `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (same as A — icon tier scale-95; KEEP aria-label; OUTWARD ring). NO aria-expanded (it opens a Dialog, not an inline disclosure — and even so the Dialog is not a child disclosure region of this button; per house rule we do NOT manufacture aria-expanded for dialog-openers). Agree?

(C) Template cards L205 (×4 in TEMPLATES.map) — RAW, VISIBLE TEXT (icon + title + description), disabled={busy}, onClick={() => createFromTemplate(tpl)}. className = "rounded-2xl bg-card border border-border p-3 text-left hover:bg-muted/40 disabled:opacity-60". In a grid grid-cols-2; card rounded-2xl NOT overflow-hidden.
Q-C: append `transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (FRESH transition-all — hover:bg-muted/40 color fade; disabled:opacity-60 is a disabled-attr SNAP not a fade; wide/card tier [0.98]; visible text -> NO aria-label; OUTWARD ring-ring). Agree on [0.98] + FRESH transition-all + OUTWARD ring?

(D) Bot inbox L228 — RAW, VISIBLE TEXT (icon + "Bot inbox" + subtitle), onClick={() => navigate("/chat/bots/inbox")}. className = "flex items-center gap-2 p-3 rounded-2xl bg-card border border-border text-left hover:bg-muted/40". In a grid grid-cols-2 (so HALF-WIDTH, not full-width); card rounded-2xl NOT overflow-hidden.
Q-D: append `transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (FRESH transition-all; HALF-WIDTH grid card -> wide/card tier [0.98] [NOT [0.99] — it's a grid card, not a full-width row]; visible text NO aria-label; OUTWARD ring-ring). Agree?

(E) Discover L241 — RAW, VISIBLE TEXT, onClick={() => navigate("/chat/bots/discover")}. className = "flex items-center gap-2 p-3 rounded-2xl bg-card border border-border text-left hover:bg-muted/40". Identical structure to D (grid-cols-2 half-width card).
Q-E: append `transition-all active:scale-[0.98]` + ring (same as D — card tier [0.98], OUTWARD ring). Agree?

(F) Bot admin L257 (conditional isAdmin) — RAW, VISIBLE TEXT (Shield icon + "Bot admin" + subtitle + ChevronRight), onClick={() => navigate("/chat/bots/admin")}. className = "w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border text-left hover:bg-muted/40". This one IS full-width (w-full), p-4, structurally IDENTICAL to the bot-list menu rows (G) below — but it is a STANDALONE rounded-2xl bg-card border row (NOT inside a divide-y list).
Q-F: append `transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (FRESH transition-all; TIER NUANCE: I read this as a FULL-WIDTH/wide-row [0.99] — it is w-full p-4 gap-3, identical structure to the menu rows in G; even though it has rounded-2xl bg-card border, a full-width row reads as a wide-row not a compact grid card -> [0.99]; visible text NO aria-label; OUTWARD ring-ring — standalone card NOT overflow-hidden). RESOLVE EXPLICITLY: [0.99] wide-row vs [0.98] card for this full-width standalone bg-card row? (I lean [0.99] for full-width parity with G; argue if you'd use [0.98] because it's visually a "card".)

(G) Bot-list rows L287 (×N in bots.map) — RAW, VISIBLE TEXT (avatar + display_name + @username/status + ChevronRight), onClick={() => navigate(`/chat/bots/${b.id}`)}. className = "w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40". These sit FLUSH inside a `div className="rounded-2xl bg-card border border-border divide-y divide-border"` — rounded-2xl but NOT overflow-hidden.
Q-G: append `transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (FRESH transition-all — hover:bg-muted/40 color fade; full-width/menu-row tier [0.99]; visible text NO aria-label; OUTWARD ring-ring — the divide-y card is rounded-2xl but NOT overflow-hidden, so per the ring-inset CSS fact the rows' own ring is NOT clipped -> outward, NOT ring-inset). Agree on [0.99] + OUTWARD ring (NOT ring-inset)?

SKIP (confirm): the shadcn "New" Button L187 + empty-state "Create bot" Button L280; ALL Dialog controls — help Dialog "Got it" L344; token Dialog "Copy" L362 + "Done" L372; CreateBotDialog "Cancel" L455 + "Create" L456 + its <Input> ×2 (L430/L434) + <Textarea> L451 (all shadcn → ship tokens); the imported-but-unused <Switch>; all Dialog/DialogContent/Header/Footer wrappers; all icons (ArrowLeft/Info/Bot/Plus/Compass/Inbox/Shield/ChevronRight/template icons) + all h1/p/div/span/label text + avatar imgs + the "bot" badge span.

============================================================
DELIVERABLE: Give the EXACT final className string for (A)-(G) + confirm attrs (KEEP aria-label on A+B; ADD none on C-G [visible text]; NO aria-pressed anywhere [all are one-shot nav/create actions, NOT toggles]; NO aria-expanded on B [dialog opener]). RESOLVE the (F) tier nuance explicitly: [0.99] full-width wide-row vs [0.98] card for the standalone full-width bg-card Bot-admin row (I lean [0.99]). Confirm (D)/(E) are [0.98] (half-width grid cards, NOT [0.99]). Confirm (G) is [0.99] + OUTWARD ring (NOT ring-inset — divide-y card NOT overflow-hidden). Confirm FRESH transition-all on all 7 (all have a hover:bg color fade, none have a prior transition; disabled:opacity-60 on C is a snap NOT a fade). Confirm the SKIP list (esp. the shadcn New/Create Buttons + all Dialog controls). Note any keyboard/responsive flags + confirm there are NO keyboard-inaccessible clickable <div>s. Keep it tight.
- files: src/pages/chat/BotFatherPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx
- files: src/pages/chat/BotFatherPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

# BotFatherPage — Slice 51 Review & Plan

## Plan

Apply the house-style interaction tokens (press-scale + transition + focus ring) to 7 RAW `<button>` controls on `src/pages/chat/BotFatherPage.tsx`. All are one-shot navigation/create actions (no toggles), so no `aria-pressed`/`aria-expanded` needed. All have `hover:bg-*` color fades → FRESH `transition-all`. All sit in non-overflow-hidden containers → OUTWARD `ring-ring`.

## Proposed Diff

```diff
--- a/src/pages/chat/BotFatherPage.tsx
+++ b/src/pages/chat/BotFatherPage.tsx
@@ -174,7 +174,7 @@ export default function BotFatherPage() {
       <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border safe-area-top">
         <div className="flex items-center gap-2 h-14 px-2">
-          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted">
+          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <ArrowLeft className="w-5 h-5" />
           </button>
           <h1 className="text-base font-semibold flex-1">My Bots</h1>
-          <button type="button" onClick={() => setHelpOpen(true)} aria-label="How bots work" className="p-2 -mr-1 rounded-full hover:bg-muted">
+          <button type="button" onClick={() => setHelpOpen(true)} aria-label="How bots work" className="p-2 -mr-1 rounded-full hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <Info className="w-5 h-5" />
           </button>
           <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1">
@@ -199,7 +199,7 @@ export default function BotFatherPage() {
                 <button
                   key={tpl.id}
                   type="button"
                   disabled={busy}
                   onClick={() => createFromTemplate(tpl)}
-                  className="rounded-2xl bg-card border border-border p-3 text-left hover:bg-muted/40 disabled:opacity-60"
+                  className="rounded-2xl bg-card border border-border p-3 text-left hover:bg-muted/40 disabled:opacity-60 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                 >
                   <div className="flex items-center gap-2 mb-1">
@@ -225,7 +225,7 @@ export default function BotFatherPage() {
           <button
             type="button"
             onClick={() => navigate("/chat/bots/inbox")}
-            className="flex items-center gap-2 p-3 rounded-2xl bg-card border border-border text-left hover:bg-muted/40"
+            className="flex items-center gap-2 p-3 rounded-2xl bg-card border border-border text-left hover:bg-muted/40 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
             <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
@@ -238,7 +238,7 @@ export default function BotFatherPage() {
           <button
             type="button"
             onClick={() => navigate("/chat/bots/discover")}
-            className="flex items-center gap-2 p-3 rounded-2xl bg-card border border-border text-left hover:bg-muted/40"
+            className="flex items-center gap-2 p-3 rounded-2xl bg-card border border-border text-left hover:bg-muted/40 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
             <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
@@ -257,7 +257,7 @@ export default function BotFatherPage() {
           <button
             type="button"
             onClick={() => navigate("/chat/bots/admin")}
-            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border text-left hover:bg-muted/40"
+            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border text-left hover:bg-muted/40 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
             <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
@@ -287,7 +287,7 @@ export default function BotFatherPage() {
               <button
                 key={b.id}
                 type="button"
                 onClick={() => navigate(`/chat/bots/${b.id}`)}
-                className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40"
+                className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               >
                 <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
```

## Exact Final ClassNames & Attribute Decisions

| Control | Line | Final className (appended tokens) | Attrs | Tier rationale |
|---------|------|-----------------------------------|-------|----------------|
| **(A) Back** | L177 | `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | KEEP `aria-label="Back"` | Icon-only → `scale-95`; has `hover:bg-muted` → FRESH `transition-all` |
| **(B) Info/help** | L181 | `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | KEEP `aria-label="How bots work"`; NO `aria-expanded` (dialog opener, not inline disclosure) | Same as A |
| **(C) Template cards** | L205 | `transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | NO new attrs (visible text) | Grid card (`grid-cols-2`, half-width) → `[0.98]`; has `hover:bg-muted/40` → FRESH `transition-all`; `disabled:opacity-60` is a snap, not a fade |
| **(D) Bot inbox** | L228 | `transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | NO new attrs (visible text) | Half-width grid card → `[0.98]` (NOT `[0.99]`) |
| **(E) Discover** | L241 | `transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | NO new attrs (visible text) | Same as D |
| **(F) Bot admin** | L257 | `transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | NO new attrs (visible text) | **`[0.99]`** — full-width `w-full` standalone row with `p-4 gap-3`, structurally identical to the bot-list rows (G). Even though it has `rounded-2xl bg-card border`, it's a full-width row, not a compact grid card. Parity with G. |
| **(G) Bot-list rows** | L287 | `transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | NO new attrs (visible text) | Full-width menu row → `[0.99]`; **OUTWARD `ring-ring`** (the `divide-y` card is `rounded-2xl` but NOT `overflow-hidden` → ring is NOT clipped) |

## Key Resolutions

1. **(F) tier: `[0.99]`** — The Bot-admin row is `w-full p-4 gap-3`, identical structure to the bot-list rows (G). Even though it has `rounded-2xl bg-card border`, it's a full-width standalone row, not a compact grid card. `[0.99]` for full-width parity with G.

2. **(D)/(E): `[0.98]`** — These are half-width cards in a `grid grid-cols-2 gap-2`. The `p-3` card layout matches the template cards (C), not the full-width rows. `[0.98]` is correct.

3. **(G): OUTWARD `ring-ring`** — The `divide-y` container is `rounded-2xl` but NOT `overflow-hidden`. Per the CSS fact: `overflow-hidden` clips *descendants*, not an element's own box-shadow/ring. A descendant's outward ring is NOT clipped by a non-overflow-hidden ancestor. Correct: outward.

4. **FRESH `transition-all` on all 7** — Every control has a `hover:bg-*` color fade with no prior `transition`. `disabled:opacity-60` on (C) is a disabled-attr snap, not a hover fade — doesn't change the analysis.

5. **NO `aria-pressed` anywhere** — All 7 are one-shot navigation/create actions, not toggles/segmented controls.

6. **NO `aria-expanded` on (B)** — It opens a Dialog, not an inline disclosure. Per house rule, we don't manufacture `aria-expanded` for dialog-openers.

## Skip List (confirmed)

- shadcn `<Button>` "New" L187 + empty-state "Create bot" L280 — ship tokens, skip
- All Dialog controls: help "Got it" L344; token "Copy" L362 + "Done" L372; CreateBotDialog "Cancel" L455 + "Create" L456 + `<Input>` ×2 (L430/L434) + `<Textarea>` L451 — all shadcn, ship tokens
- The imported-but-unused `<Switch>` — not rendered
- All `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogFooter` wrappers
- All icons, text, avatar imgs, badge spans — decorative

## Keyboard/Responsive Flags

- **No keyboard-inaccessible clickable `<div>`s** — every interactive control is a real `<button>` (natively Tab-focusable; added rings functional)
- **Responsive clean** — `max-w-2xl mx-auto px-4` body; sticky header `h-14`; template cards `grid-cols-2 gap-2`; nav cards `grid-cols-2 gap-2`; bot-list rows `w-full p-4` stack vertically; all fit at 375/768/1280
- **Owner flags (out of scope):** (a) back button `p-2` on 20px icon ≈ 36px sub-44px tap target (repo-wide compact pattern); (b) the `(supabase as any)` casts for `is_bot_admin` RPC and `bots`/`bot_workflows`/`bot_commands`/`bot_scheduled_messages` schema (clean up when types regenerate); (c) `confirm()`/`prompt()` dialogs in the template setup functions (product decision — could be styled modals, but that's logic/markup not in scope)

## Verify

Run `npm run update` after applying — must pass (type-check + worker type-check + production build).
