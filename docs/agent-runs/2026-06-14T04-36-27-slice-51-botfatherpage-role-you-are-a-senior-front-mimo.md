# MiMo run — 2026-06-14T04:36:27.962Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Plan

7 RAW `<button>` className-only edits on `src/pages/chat/BotFatherPage.tsx`. All 7 have a `hover:bg` color fade and no prior transition → FRESH `transition-all` on every one. Two icon-only controls (A, B) keep their existing `aria-label`; five visible-text controls (C–G) need none. No `aria-pressed` (all one-shot nav/create, not toggles). No `aria-expanded` on B (dialog opener, not inline disclosure). Zero logic changes.

---

## Tier resolution — (F) `[0.99]` wide-row, confirmed

**(F) Bot-admin row** gets `[0.99]`, not `[0.98]`:

- It is `w-full p-4 gap-3` — structurally identical to (G) menu rows.
- It reads as a **full-width interactive row** (icon + text + subtitle + ChevronRight), not a compact grid tile.
- The `rounded-2xl bg-card border` is visual framing; the interaction model is a full-width row.
- Consistent with (G) which is the same pattern wrapped in a parent card.

**(D)/(E)** are `[0.98]` — confirmed. They are **half-width grid tiles** in a `grid-cols-2` layout with `p-3` (compact), not full-width rows.

**(G)** is `[0.99]` + **OUTWARD** `ring-ring` — confirmed. The `divide-y` parent is `rounded-2xl` but has **no `overflow-hidden`**, so per the ring-inset CSS fact the rows' own box-shadow/ring is NOT clipped → outward, not `ring-inset`.

---

## Proposed diff

**File:** `src/pages/chat/BotFatherPage.tsx`

```diff
@@ -177,1 +177,1 @@
-          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted">
+          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">

@@ -181,1 +181,1 @@
-            className="p-2 -mr-1 rounded-full hover:bg-muted"
+            className="p-2 -mr-1 rounded-full hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">

@@ -205,1 +205,1 @@
-                  className="rounded-2xl bg-card border border-border p-3 text-left hover:bg-muted/40 disabled:opacity-60"
+                  className="rounded-2xl bg-card border border-border p-3 text-left hover:bg-muted/40 disabled:opacity-60 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">

@@ -228,1 +228,1 @@
-            className="flex items-center gap-2 p-3 rounded-2xl bg-card border border-border text-left hover:bg-muted/40"
+            className="flex items-center gap-2 p-3 rounded-2xl bg-card border border-border text-left hover:bg-muted/40 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">

@@ -241,1 +241,1 @@
-            className="flex items-center gap-2 p-3 rounded-2xl bg-card border border-border text-left hover:bg-muted/40"
+            className="flex items-center gap-2 p-3 rounded-2xl bg-card border border-border text-left hover:bg-muted/40 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">

@@ -257,1 +257,1 @@
-            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border text-left hover:bg-muted/40"
+            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border text-left hover:bg-muted/40 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">

@@ -287,1 +287,1 @@
-                className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40"
+                className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

---

## Summary table

| # | Control | Line | Tier | transition | active:scale | Ring | Attrs |
|---|---------|------|------|-----------|-------------|------|-------|
| A | Back (icon-only) | 177 | icon | FRESH `transition-all` | `scale-95` | OUTWARD `ring-ring` | KEEP `aria-label="Back"` |
| B | Info/help (icon-only) | 181 | icon | FRESH `transition-all` | `scale-95` | OUTWARD `ring-ring` | KEEP `aria-label="How bots work"` |
| C | Template cards ×4 | 205 | card `[0.98]` | FRESH `transition-all` | `[0.98]` | OUTWARD `ring-ring` | — |
| D | Bot inbox | 228 | card `[0.98]` | FRESH `transition-all` | `[0.98]` | OUTWARD `ring-ring` | — |
| E | Discover | 241 | card `[0.98]` | FRESH `transition-all` | `[0.98]` | OUTWARD `ring-ring` | — |
| F | Bot admin (conditional) | 257 | wide-row `[0.99]` | FRESH `transition-all` | `[0.99]` | OUTWARD `ring-ring` | — |
| G | Bot-list rows ×N | 287 | wide-row `[0.99]` | FRESH `transition-all` | `[0.99]` | OUTWARD `ring-ring` | — |

**Diff counts:** 7 className swaps, 0 new attributes, 0 logic lines touched.

---

## SKIP list — confirmed

- **shadcn `<Button>`** — "New" L187, empty-state "Create bot" L280 → ship tokens, SKIP.
- **All Dialog controls** — help "Got it" L344, token "Copy" L362, token "Done" L372, CreateBotDialog "Cancel" L455 + "Create" L456 + `<Input>` ×2 (L430/L434) + `<Textarea>` L451 → all shadcn, SKIP.
- **`<Switch>`** — imported but unused in this file, SKIP.
- **All Dialog/DialogContent/Header/Footer wrappers** — presentational, SKIP.
- **All icons** (ArrowLeft/Info/Bot/Plus/Compass/Inbox/Shield/ChevronRight/Sparkles/MessageSquare/HelpCircle/Quote/Copy/RefreshCw/Trash2) + all h1/p/div/span/label text + avatar imgs + the "bot" badge span → decorative, SKIP.

---

## Keyboard & responsive notes

- **No keyboard-inaccessible clickable `<div>`s** — every interactive control is a real `<button>` (natively Tab-focusable). The bot-list wrapper `<div>`, the template icon containers, and all presentational cards have no `onClick`.
- **All 7 controls natively Tab-focusable** — added `focus-visible:ring` is functional on every one.
- **Responsive 375/768/1280 — clean:** `max-w-2xl mx-auto px-4` body. At 375: 2-col grids (~165px cells) hold template/nav cards with p-3 padding + icon + text — fits. Bot-list rows are full-width single column with `flex items-center gap-3 p-4` (avatar 40px + text + ChevronRight) — fits. At 768/1280 within `max-w-2xl` (672px) centered, unchanged.
- **Owner flag (pre-existing, not introduced):** the `p-2` padding on 20px icons (A, B) yields ~36px tap targets, sub-44px. Repo-wide compact pattern.

---

## Verify

After applying, run:
```bash
npm run update
```
Must pass (0 TypeScript errors + 0 worker errors + production build success). The diff is purely className strings — no import changes, no type changes, no logic changes.
