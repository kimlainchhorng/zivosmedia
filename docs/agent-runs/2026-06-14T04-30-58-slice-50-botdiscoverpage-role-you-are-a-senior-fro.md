# DeepSeek run — 2026-06-14T04:30:58.189Z

- model: deepseek-chat
- task: SLICE 50 — BotDiscoverPage
======================================================================

ROLE: You are a senior front-end reviewer. I am applying a className-ONLY interaction-token + a11y polish pass to a customer-facing React (Vite + Tailwind v4 + shadcn/ui) chat bot-directory page. Decide the EXACT className/attribute changes for each interactive control. Be surgical.

HARD RULE (scope): className changes + tiny DISPLAY-ONLY attributes only (aria-label / aria-pressed / aria-expanded). NO logic, NO handlers, NO tabIndex/role/onKeyDown changes, NO state, NO routing, NO data hooks, NO new framer props. If a control is keyboard-inaccessible because it lacks role/tabIndex, FLAG it (do NOT fix).

TOKEN RULES (house style, parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button>/<a>/<Link> (NOT shadcn) get the full set: active:scale-[X] + transition-(all|transform) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Tier scales: wide/card [0.98]; chips/small/segmented-pill-tabs [0.97]; icon-only scale-95; full-width/menu-rows/wide-rows [0.99].
- transition-all when the control ALSO has a REAL hover:bg-*/hover:text-*/hover:opacity color/opacity FADE or underline; transition-transform for PURE icon/press-scale with NO hover color. If a control has NO transition but HAS a hover color and we add active:scale -> add transition-all FRESH. (disabled:opacity is a disabled-attr snap, NOT a hover fade.)
- BARE `transition` already eases transform+opacity+color -> if present, KEEP (don't-churn).
- shadcn <Button>/<Switch>/<Input> already ship tokens -> DO NOT add className tokens, SKIP.
- ring-inset KEY CSS FACT: overflow-hidden clips DESCENDANTS, not an element's OWN box-shadow/ring. ring-inset ONLY when a focusable control sits FLUSH inside a SEPARATE overflow-hidden rounded ancestor. A control in a rounded-but-NOT-overflow-hidden container -> OUTWARD ring.
- Gradient ring color: a gradient-FILLED button (active state sets bg-ig-gradient on ITSELF) sitting on a NEUTRAL surface -> the OUTWARD ring renders against the neutral parent -> ring-ring (NOT ring-white/70). ring-white/70 is ONLY for a control that is a CHILD of a bg-ig-gradient CARD.
- Controls with visible text get their accessible name from text (no aria-label). Icon-only controls NEED aria-label — KEEP existing. aria-pressed ONLY for toggle/segmented controls conveying selection state by bg (single OR multi select, label word constant, NOT role=tab).

PAGE: src/pages/chat/BotDiscoverPage.tsx (262 lines, Telegram-style "Discover bots" directory, plain <div> root, min-h-screen). useSmartBack; supabase RPCs (search_bots/bots_by_category/trending_bots/rate_bot/block_bot/unsubscribe_bot/report_bot) + bot_collections select; q/category/bots/loading/trending/collections useState. Layout: sticky header (RAW icon-only back + "Discover bots" h1); a shadcn <Input> search; a "Trending this week" horizontal scroll row of RAW bot cards; a "Collections" 2-col grid of RAW collection cards; a horizontal scroll row of RAW category filter chips (single-select); then a loading/empty/results block — the results are a divide-y list of bot rows, each row a presentational <div> (NO onClick) containing 5 shadcn <Button> (Chat / Rate / Unsubscribe / Block / Report).

FOUR RAW <button> edits:

(A) Back button L118 — RAW icon-only ArrowLeft, ALREADY aria-label="Back" (KEEP), onClick={goBack}. className = "p-2 -ml-2 rounded-full hover:bg-muted". In sticky header (not overflow-hidden).
Q-A: append `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (FRESH transition-all — has hover:bg-muted color fade, no prior transition; icon tier scale-95; KEEP aria-label; OUTWARD ring). Agree?

(B) Trending bot card L143 (×N in trending.map) — RAW, VISIBLE TEXT (avatar + display_name + @username), onClick={() => openChat(b)} (navigates /chat?with=). className = "flex-shrink-0 w-32 rounded-2xl bg-card border border-border p-3 text-center hover:bg-muted/40". NO transition/scale/ring. The card is rounded-2xl but NOT overflow-hidden (the avatar div inside has overflow-hidden, but that's a descendant).
Q-B: append `transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (FRESH transition-all — hover:bg-muted/40 color fade; wide/card tier [0.98]; visible text -> NO aria-label; OUTWARD ring-ring — card NOT overflow-hidden). Agree on [0.98] card tier + FRESH transition-all + OUTWARD ring?

(C) Collection card L165 (×N in collections.map) — RAW, VISIBLE TEXT (emoji + title + description), onClick={() => navigate(`/chat/bots/collections/${col.slug}`)}. className = "rounded-2xl bg-card border border-border p-3 text-left hover:bg-muted/40". NO transition/scale/ring. In a grid grid-cols-2, card rounded-2xl NOT overflow-hidden.
Q-C: append `transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (same rationale as B — card tier [0.98], FRESH transition-all, visible text NO aria-label, OUTWARD ring-ring). Agree?

(D) Category filter chip L185 (×N in CATEGORIES.map) — RAW, VISIBLE TEXT (icon + label), SINGLE-SELECT segmented filter, onClick={() => setCategory(c.id)}. active by bg: className base `flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap border` + conditional `active ? "bg-ig-gradient text-white border-primary" : "bg-card border-border hover:bg-muted/40"`. NO transition/scale/ring. The chips sit in a horizontal scroll row (flex gap-2 overflow-x-auto), NOT overflow-hidden in the ring-clipping sense — and even so the chip's OWN ring is not clipped by a sibling scroll container.
Q-D: ADD `aria-pressed={active}` + append `transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (chip tier [0.97]; FRESH transition-all — inactive has hover:bg-muted/40 color fade + active flips to bg-ig-gradient; aria-pressed valid [single-select segmented filter conveying selection ONLY by bg, label word constant, NOT role=tab — matches the GroupOrders/MarketplaceOrders/Transactions segmented-filter precedent]; RING COLOR: the active chip sets bg-ig-gradient on ITSELF but the chip sits in a NEUTRAL scroll row -> the OUTWARD ring renders against the neutral row bg -> ring-ring NOT ring-white/70). Agree on [0.97] + aria-pressed + FRESH transition-all + OUTWARD ring-ring (NOT ring-white/70 — the gradient is on the button itself, not a gradient-card parent)?

SKIP (confirm): all 5 shadcn <Button> per bot row (Chat L239 / Rate L242 / Unsubscribe L245 / Block L248 / Report L251 — ship tokens; Rate/Unsub/Block/Report already have aria-label + title); the shadcn <Input> search L128 (ships tokens); the bot-row container <div> L211 (presentational, NO onClick — confirm it is NOT a keyboard-inaccessible clickable div); all icons (ArrowLeft/Bot/Search/Flame/Star/MessageCircle/etc.) + all h1/div/span text + avatar imgs + the "bot" badge span.

============================================================
DELIVERABLE: Give the EXACT final className string for (A),(B),(C),(D) + confirm attrs (KEEP aria-label on A; ADD none on B/C [visible text]; ADD aria-pressed on D [single-select segmented, selection by bg]). Resolve explicitly: (B)/(C) card tier [0.98] + OUTWARD ring (cards NOT overflow-hidden); (D) chip tier [0.97] + aria-pressed + OUTWARD ring-ring NOT ring-white/70 (gradient on the button itself, neutral scroll-row parent). Confirm FRESH transition-all on all 4 (all have a hover:bg color fade, none have a prior transition). Confirm the SKIP list (esp. the 5 shadcn Buttons + shadcn Input + the presentational bot-row div). Note any keyboard/responsive flags + confirm there are NO keyboard-inaccessible clickable <div>s. Keep it tight.
- files: src/pages/chat/BotDiscoverPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx
- files: src/pages/chat/BotDiscoverPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

Apply className-only interaction tokens + a11y attributes to 4 RAW `<button>` controls on `BotDiscoverPage.tsx`. Each gets `active:scale`, `transition-all` (all have hover color fades), and `focus-visible:ring`. The category filter chips additionally get `aria-pressed`. No logic, no handlers, no new components.

## Proposed Changes

**File:** `src/pages/chat/BotDiscoverPage.tsx`

### (A) Back button L118
**Before:**
```tsx
className="p-2 -ml-2 rounded-full hover:bg-muted"
```
**After:**
```tsx
className="p-2 -ml-2 rounded-full hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### (B) Trending bot card L143
**Before:**
```tsx
className="flex-shrink-0 w-32 rounded-2xl bg-card border border-border p-3 text-center hover:bg-muted/40"
```
**After:**
```tsx
className="flex-shrink-0 w-32 rounded-2xl bg-card border border-border p-3 text-center hover:bg-muted/40 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### (C) Collection card L165
**Before:**
```tsx
className="rounded-2xl bg-card border border-border p-3 text-left hover:bg-muted/40"
```
**After:**
```tsx
className="rounded-2xl bg-card border border-border p-3 text-left hover:bg-muted/40 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### (D) Category filter chip L185
**Before:**
```tsx
className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap border ${
  active ? "bg-ig-gradient text-white border-primary" : "bg-card border-border hover:bg-muted/40"
}`}
```
**After:**
```tsx
className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
  active ? "bg-ig-gradient text-white border-primary" : "bg-card border-border hover:bg-muted/40"
}`}
```
**Plus add `aria-pressed={active}`** to the `<button>` element.

## Summary of changes

| Control | Scale tier | Transition | Ring | New attrs |
|---------|-----------|------------|------|-----------|
| (A) Back | `scale-95` (icon) | `transition-all` (FRESH — has `hover:bg-muted`) | OUTWARD `ring-ring` | KEEP `aria-label="Back"` |
| (B) Trending card | `[0.98]` (card) | `transition-all` (FRESH — has `hover:bg-muted/40`) | OUTWARD `ring-ring` | None (visible text) |
| (C) Collection card | `[0.98]` (card) | `transition-all` (FRESH — has `hover:bg-muted/40`) | OUTWARD `ring-ring` | None (visible text) |
| (D) Category chip | `[0.97]` (chip) | `transition-all` (FRESH — has `hover:bg-muted/40` + active gradient flip) | OUTWARD `ring-ring` (gradient on self, neutral parent) | `aria-pressed={active}` |

## Skip list confirmed

- ✅ 5 shadcn `<Button>` per bot row (Chat L239, Rate L242, Unsubscribe L245, Block L248, Report L251) — ship tokens, leave untouched
- ✅ shadcn `<Input>` search L128 — ships tokens
- ✅ Bot-row container `<div>` L211 — presentational, NO onClick, NOT a keyboard-inaccessible clickable div
- ✅ All icons, text, avatar imgs, badges — decorative

## Flags

- **No keyboard-inaccessible clickable `<div>`s** — every interactive control is a real `<button>`
- **Responsive:** All controls fit at 375px (trending cards `w-32` in horizontal scroll, collection cards `grid-cols-2`, chips in horizontal scroll, results list full-width)
- **No `aria-expanded` needed** — no disclosure regions
- **No `role="tab"`** — category chips are single-select filters, `aria-pressed` is correct per precedent

## Verification

Run `npm run update` before marking done.
