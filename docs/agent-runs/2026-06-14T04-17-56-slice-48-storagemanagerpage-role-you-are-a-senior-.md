# DeepSeek run — 2026-06-14T04:17:56.451Z

- model: deepseek-chat
- task: SLICE 48 — StorageManagerPage
======================================================================

ROLE: You are a senior front-end reviewer. I am applying a className-ONLY interaction-token + a11y polish pass to a customer-facing React (Vite + Tailwind v4 + shadcn/ui + Radix) chat-settings sub-page. Decide the EXACT className/attribute changes for each interactive control. Be surgical.

HARD RULE (scope): className changes + tiny DISPLAY-ONLY attributes only (aria-label / aria-pressed / aria-expanded). NO logic, NO handlers, NO tabIndex/role/onKeyDown changes, NO state, NO routing, NO data hooks, NO new framer props. If a control is keyboard-inaccessible because it lacks role/tabIndex, FLAG it (do NOT fix).

TOKEN RULES (house style, parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button>/<a>/<Link> (NOT shadcn) get the full set: active:scale-[X] + transition-(all|transform) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Tier scales: wide/card [0.98]; chips/small/segmented-pill-tabs [0.97]; icon-only scale-95; full-width/menu-rows/wide-rows [0.99].
- transition-all when the control ALSO has a REAL hover:bg-*/hover:text-*/hover:opacity color/opacity FADE or underline; transition-transform for PURE icon/press-scale with NO hover color. If a control has NO transition but HAS a hover color and we add active:scale -> add transition-all fresh. (disabled:opacity is a disabled-attr state snap, NOT a hover fade.) DON'T-CHURN: if a control already has a transition that covers the new transform, don't renormalize it.
- BARE `transition` (Tailwind) eases a curated property set that INCLUDES transform + opacity + color — so a control that already has bare `transition` does NOT need a flip to transition-all to ease a newly-added active:scale (the bare `transition` already covers it). Leave bare `transition` as-is (don't-churn).
- shadcn <Button>/<Switch>/<Slider>/<Input> already ship tokens -> DO NOT add className tokens, SKIP.
- ring-inset KEY CSS FACT: overflow-hidden clips DESCENDANTS, not an element's OWN box-shadow/ring. ring-inset ONLY when a focusable control sits FLUSH inside a SEPARATE overflow-hidden rounded ancestor. A control in a non-overflow-hidden container -> OUTWARD ring.
- Gradient ring color: a control that is a CHILD of a bg-ig-gradient CARD -> ring-white/70. A control whose ACTIVE state merely sets bg-ig-gradient on ITSELF but sits in a NEUTRAL grid/container -> the outward ring renders against the neutral parent -> ring-ring.
- Controls with visible text get their accessible name from text (no aria-label). Icon-only controls NEED aria-label — KEEP existing. aria-pressed ONLY for toggle/segmented controls conveying selection state ONLY by bg (label word constant), NOT on role=tab/aria-selected.

PAGE: src/pages/chat/settings/StorageManagerPage.tsx (590 lines, Telegram-style Data & Storage controls, plain <div> root, min-h-screen). useSmartBack; useChatStoragePrefs(user.id) -> prefs/setPrefs; lots of useState (stats/selectedBuckets/selectedConnection/clearing flags); a sticky header (Back + title + Reset); a device-cache summary card; several <Section> blocks: Clear cache (5 bucket toggle cards + Select all + Clear), Locked media (Clear previews), Keep media (4 segmented options), Auto-download (3 connection tabs + shadcn Switch ToggleRows), Download limits (2 shadcn Sliders), Network/playback (Switch rows), Local data (stat cards).

EIGHT RAW <button> edits (all the rest are shadcn Switch/Slider or presentational divs):

(A) Back button L377 — RAW icon-only ChevronLeft, ALREADY aria-label="Back" (KEEP), onClick={goBack}. className = "flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted/70". In sticky <header> (not overflow-hidden).
Q-A: append `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (FRESH transition-all — has hover:bg-muted/70 color fade; icon tier scale-95; KEEP aria-label; OUTWARD ring). Agree?

(B) Reset button L384 — RAW icon-only RotateCcw, ALREADY aria-label="Reset storage settings" (KEEP), onClick={resetPrefs}. className = "flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted/70". In sticky <header>.
Q-B: append `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (same as A — FRESH transition-all hover:bg; icon tier scale-95; KEEP aria-label; OUTWARD ring). Agree?

(C) Cache-bucket toggle cards L422 — RAW, in ALL_CACHE_BUCKETS.map (5 cells: Photos/Videos/Files/Audio/Other), onClick={() => toggleBucket(bucket)}, VISIBLE TEXT (icon + label + stats). MULTI-SELECT toggle, selection conveyed by bg/border (selected ? "border-primary bg-primary/10" : "border-border/60 bg-background hover:bg-muted/50"). className base = `min-h-[82px] rounded-[8px] border px-3 py-3 text-left transition ${selected ? ... : ...}` — has BARE `transition` + conditional inactive hover:bg-muted/50. In a `grid grid-cols-2 gap-2` (not overflow-hidden).
Q-C: ADD `aria-pressed={selected}` (multi-select toggle conveying state ONLY by bg — valid; label word constant, visible text gives the name) + append `active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` and KEEP the bare `transition` (do NOT flip to transition-all — bare transition already eases the new transform + the inactive hover:bg + opacity). NUANCE: tier — these are biggish multi-select toggle CARDS (min-h-[82px], icon+label+2-line stats) -> I lean wide/card [0.98] (NOT segmented [0.97]). Agree on [0.98] + aria-pressed + KEEP bare transition + OUTWARD ring-ring?

(D) Select all button L445 — RAW, VISIBLE TEXT "Select all", onClick={() => setSelectedBuckets(new Set(ALL_CACHE_BUCKETS))}. className = "h-10 rounded-full border border-border px-4 text-sm font-semibold". NO hover color, NO transition. Fixed-width pill, shares a row with Clear.
Q-D: append `transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (transition-TRANSFORM — NO hover color, pure press; small-pill tier [0.97]; visible text -> NO aria-label; OUTWARD ring-ring). Agree?

(E) Clear button L452 — RAW, VISIBLE TEXT (Trash2 icon + "Clearing"/"Clear {size}"), onClick={clearSelected}, disabled={clearing || selectedBuckets.size === 0}. className = "flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-destructive px-4 text-sm font-bold text-destructive-foreground disabled:opacity-50". NO hover color (disabled:opacity is a snap), NO transition. flex-1 (wide), shares the row with Select all.
Q-E: append `transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (transition-TRANSFORM — NO hover color, disabled:opacity is a disabled-attr snap NOT a fade; this is the flex-1 WIDE primary action -> wide tier [0.98] [NOT [0.97]]; visible text -> NO aria-label; OUTWARD ring-ring — bg-destructive FILL on neutral card surface, outward ring renders against the neutral parent -> ring-ring). Agree on [0.98] wide + transition-transform + ring-ring?

(F) Clear previews button L487 — RAW, VISIBLE TEXT "Clearing"/"Clear previews", onClick={clearLockedPreviews}, disabled={clearingLockedPreviews || lockedCacheTotals.previewEntries === 0}. className = "h-9 rounded-full border border-border px-3 text-xs font-bold disabled:opacity-50". NO hover color, NO transition.
Q-F: append `transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (transition-TRANSFORM — NO hover color, disabled:opacity is a snap; small-pill tier [0.97]; visible text -> NO aria-label; OUTWARD ring-ring). Agree?

(G) Keep-media options L502 — RAW, in KEEP_MEDIA_OPTIONS.map (4 cells: 3 days/1 week/1 month/Forever), onClick={() => setPrefs(... keepMedia: option.value)}, VISIBLE TEXT (label + hint). SINGLE-SELECT segmented, active state by bg (prefs.keepMedia === option.value ? "border-primary bg-ig-gradient text-white" : "border-border bg-background"). className base = `min-h-[64px] rounded-[8px] border px-2 py-2 text-center transition ${...}` — BARE `transition`, NO hover color. In a `grid grid-cols-4 gap-2` (not overflow-hidden).
Q-G: ADD `aria-pressed={prefs.keepMedia === option.value}` (single-select segmented conveying selection ONLY by bg — house aria-pressed pattern, matches the GroupOrders/MarketplaceOrders/Transactions segmented filters; label word constant; NOT role=tab) + append `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` and KEEP bare `transition` (segmented-pill tier [0.97]; OUTWARD ring-ring — the active bg-ig-gradient is set on the button ITSELF but it sits in a NEUTRAL grid, outward ring renders against the neutral grid bg -> ring-ring NOT ring-white/70). Agree on [0.97] + aria-pressed + KEEP bare transition + ring-ring?

(H) Connection tabs L523 — RAW, in CONNECTIONS.map (3 tabs: Wi-Fi/Cellular/Roaming), onClick={() => setSelectedConnection(item.value)}, VISIBLE TEXT label. SINGLE-SELECT segmented, active by bg (selectedConnection === item.value ? "bg-background shadow-sm" : "text-muted-foreground"). className base = `h-9 rounded-[7px] text-sm font-bold transition ${...}` — BARE `transition`, NO hover color. The 3 tabs sit FLUSH inside a `grid grid-cols-3 gap-2 rounded-[8px] bg-muted p-1` container (iOS-style segmented control). The container is rounded + bg-muted but NOT overflow-hidden.
Q-H: ADD `aria-pressed={selectedConnection === item.value}` + append `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` and KEEP bare `transition` (segmented-pill-tab tier [0.97]). RING NUANCE: the tabs sit flush in a rounded bg-muted p-1 container — but that container is NOT overflow-hidden, so per the ring-inset CSS fact -> OUTWARD ring-ring (ring-inset ONLY if the ancestor is overflow-hidden, which it is NOT). Agree on [0.97] + aria-pressed + KEEP bare transition + OUTWARD ring-ring (NOT ring-inset)?

SKIP (confirm): all shadcn <Switch> (the ToggleRow component L369 — Data saver/Stream/Background/Save edited + the 4 Auto-download photo/video/file/voice rows); both shadcn <Slider> (Video limit L554 + File limit L561); the device-cache summary card + progress-bar <div> L403 (presentational, has transition-all but is NOT a button); the Locked-media stat cards (Preview cache / Unlocked originals — presentational <div>); the Local-data stat cards (Local settings / Session queue — presentational <div>); the <Section>/<ToggleRow> sub-components themselves; all icons + all h1/h2/p/span text.

============================================================
DELIVERABLE: Give the EXACT final className string (+ confirm attrs: KEEP aria-label on A+B; ADD aria-pressed on C [multi-select], G [single-select segmented], H [single-select segmented]; ADD none elsewhere) for (A)-(H). Resolve the nuances explicitly: (C) tier [0.98] card vs [0.97] + KEEP bare transition; (E) tier [0.98] wide + transition-transform + ring-ring; (G)/(H) aria-pressed on single-select segmented (valid house pattern? confirm), [0.97] + KEEP bare transition + ring-ring (NOT ring-white/70, NOT ring-inset). Confirm the SKIP list (esp. all shadcn Switch/Slider, the progress-bar div, the presentational stat cards). Note any keyboard/responsive flags + confirm there are NO keyboard-inaccessible clickable <div>s. Keep it tight.
- files: src/pages/chat/settings/StorageManagerPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx
- files: src/pages/chat/settings/StorageManagerPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

# StorageManagerPage — Interaction Token + A11y Pass

## Plan

Apply className-only interaction tokens (press scale, focus ring, transition) and display-only ARIA attributes to 8 RAW `<button>` controls on `src/pages/chat/settings/StorageManagerPage.tsx`. All other controls (shadcn Switch/Slider, presentational divs) are skipped per house style.

## Proposed Changes

### File: `src/pages/chat/settings/StorageManagerPage.tsx`

**8 edits, all className + display-only ARIA. Zero logic changes.**

---

### (A) Back button L377 — icon-only ChevronLeft

**Before:**
```tsx
className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted/70"
```

**After:**
```tsx
className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted/70 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

- FRESH `transition-all` (has `hover:bg-muted/70` color fade)
- Icon tier `scale-95`
- KEEP existing `aria-label="Back"`
- OUTWARD `ring-ring` (header not overflow-hidden)

---

### (B) Reset button L384 — icon-only RotateCcw

**Before:**
```tsx
className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted/70"
```

**After:**
```tsx
className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted/70 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

- Same as (A) — FRESH `transition-all`, icon tier `scale-95`
- KEEP existing `aria-label="Reset storage settings"`
- OUTWARD `ring-ring`

---

### (C) Cache-bucket toggle cards L422 — multi-select, visible text

**Before:**
```tsx
className={`min-h-[82px] rounded-[8px] border px-3 py-3 text-left transition ${
  selected ? "border-primary bg-primary/10" : "border-border/60 bg-background hover:bg-muted/50"
}`}
```

**After:**
```tsx
className={`min-h-[82px] rounded-[8px] border px-3 py-3 text-left transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
  selected ? "border-primary bg-primary/10" : "border-border/60 bg-background hover:bg-muted/50"
}`}
```

- **ADD `aria-pressed={selected}`** after `type="button"` — multi-select toggle, selection by bg only, label word constant
- **Wide/card tier `[0.98]`** — min-h-[82px] cards with icon + 2-line stats
- **KEEP bare `transition`** — already eases transform + hover:bg + opacity
- OUTWARD `ring-ring` (grid not overflow-hidden)

---

### (D) "Select all" button L445 — visible text, no hover color

**Before:**
```tsx
className="h-10 rounded-full border border-border px-4 text-sm font-semibold"
```

**After:**
```tsx
className="h-10 rounded-full border border-border px-4 text-sm font-semibold transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

- `transition-transform` — no hover color, pure press
- Small-pill tier `[0.97]`
- Visible text → no `aria-label`
- OUTWARD `ring-ring`

---

### (E) "Clear" button L452 — visible text, bg-destructive fill, flex-1 wide

**Before:**
```tsx
className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-destructive px-4 text-sm font-bold text-destructive-foreground disabled:opacity-50"
```

**After:**
```tsx
className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-destructive px-4 text-sm font-bold text-destructive-foreground disabled:opacity-50 transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

- `transition-transform` — no hover color (disabled:opacity is a snap, not a fade)
- **Wide tier `[0.98]`** — flex-1 primary action
- OUTWARD `ring-ring` — bg-destructive fill on neutral card surface, ring renders against neutral parent
- Visible text → no `aria-label`

---

### (F) "Clear previews" button L487 — visible text, no hover color

**Before:**
```tsx
className="h-9 rounded-full border border-border px-3 text-xs font-bold disabled:opacity-50"
```

**After:**
```tsx
className="h-9 rounded-full border border-border px-3 text-xs font-bold disabled:opacity-50 transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

- `transition-transform` — no hover color
- Small-pill tier `[0.97]`
- Visible text → no `aria-label`
- OUTWARD `ring-ring`

---

### (G) Keep-media options L502 — single-select segmented, visible text

**Before:**
```tsx
className={`min-h-[64px] rounded-[8px] border px-2 py-2 text-center transition ${
  prefs.keepMedia === option.value ? "border-primary bg-ig-gradient text-white" : "border-border bg-background"
}`}
```

**After:**
```tsx
className={`min-h-[64px] rounded-[8px] border px-2 py-2 text-center transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
  prefs.keepMedia === option.value ? "border-primary bg-ig-gradient text-white" : "border-border bg-background"
}`}
```

- **ADD `aria-pressed={prefs.keepMedia === option.value}`** — single-select segmented, selection by bg only, label word constant. Valid house pattern (matches GroupOrders/MarketplaceOrders/Transactions segmented filters). NOT role=tab.
- Segmented-pill tier `[0.97]`
- **KEEP bare `transition`**
- OUTWARD `ring-ring` — active bg-ig-gradient is on the button itself but sits in neutral grid → ring renders against neutral parent

---

### (H) Connection tabs L523 — single-select segmented, visible text

**Before:**
```tsx
className={`h-9 rounded-[7px] text-sm font-bold transition ${
  selectedConnection === item.value ? "bg-background shadow-sm" : "text-muted-foreground"
}`}
```

**After:**
```tsx
className={`h-9 rounded-[7px] text-sm font-bold transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
  selectedConnection === item.value ? "bg-background shadow-sm" : "text-muted-foreground"
}`}
```

- **ADD `aria-pressed={selectedConnection === item.value}`** — single-select segmented, same house pattern as (G)
- Segmented-pill tier `[0.97]`
- **KEEP bare `transition`**
- **OUTWARD `ring-ring`** — the `grid grid-cols-3 gap-2 rounded-[8px] bg-muted p-1` container is NOT overflow-hidden, so outward ring is correct

---

## SKIP list (confirmed)

- All shadcn `<Switch>` in `ToggleRow` components (L369, 4 auto-download rows, 4 network/playback rows)
- Both shadcn `<Slider>` (Video limit L554, File limit L561)
- Device-cache summary card `<div>` L403 (presentational, has `transition-all` but is NOT a button)
- Locked-media stat cards (Preview cache / Unlocked originals — presentational `<div>`s)
- Local-data stat cards (Local settings / Session queue — presentational `<div>`s)
- `<Section>` / `<ToggleRow>` sub-components
- All icons, h1/h2/p/span text

## Keyboard / Responsive flags

- **No keyboard-inaccessible clickable `<div>`s** — all 8 controls are real `<button type="button">` elements (natively Tab-focusable)
- **Responsive clean** — `max-w-xl` container, grid layouts use `grid-cols-2`/`grid-cols-4`/`grid-cols-3` with `gap-2`, all buttons have adequate padding. No overflow-hidden ancestors clipping rings.
- **Sub-44px tap targets** — repo-wide compact pattern (h-9/h-10 buttons ~36-40px). Flagged for owner awareness, not fixed.

## Summary of changes

| Control | Scale | Transition | Ring | ARIA |
|---------|-------|-----------|------|------|
| (A) Back | `scale-95` | FRESH `transition-all` | outward `ring-ring` | KEEP `aria-label` |
| (B) Reset | `scale-95` | FRESH `transition-all` | outward `ring-ring` | KEEP `aria-label` |
| (C) Bucket cards | `[0.98]` | KEEP bare `transition` | outward `ring-ring` | ADD `aria-pressed` |
| (D) Select all | `[0.97]` | FRESH `transition-transform` | outward `ring-ring` | — |
| (E) Clear | `[0.98]` | FRESH `transition-transform` | outward `ring-ring` | — |
| (F) Clear previews | `[0.97]` | FRESH `transition-transform` | outward `ring-ring` | — |
| (G) Keep media | `[0.97]` | KEEP bare `transition` | outward `ring-ring` | ADD `aria-pressed` |
| (H) Connection tabs | `[0.97]` | KEEP bare `transition` | outward `ring-ring` | ADD `aria-pressed` |

**0 logic lines touched. 8 className swaps. 3 new `aria-pressed` attributes. 0 `aria-label` changes (2 kept).**

## Verification

Run `npm run update` before marking done. The diff should show exactly 8 `−`/`+` className line swaps + 3 `aria-pressed` additions, with zero logic changes.
