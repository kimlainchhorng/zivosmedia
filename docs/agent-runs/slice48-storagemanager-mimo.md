# MiMo run — 2026-06-14T04:19:07.953Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

# Slice 48 — StorageManagerPage: Proposed Tokens

## Plan (short)

8 RAW `<button>` edits, all className + display-only ARIA. Zero logic lines touched.

- **A+B**: Header icon-only back + reset → FRESH `transition-all` (has `hover:bg`), `scale-95`, keep `aria-label`, outward `ring-ring`
- **C**: Multi-select cache-bucket cards → `aria-pressed={selected}` + `[0.98]` wide/card tier + KEEP bare `transition` + outward `ring-ring`
- **D**: "Select all" small pill → `transition-transform` + `[0.97]` + outward `ring-ring`
- **E**: "Clear" wide destructive → `transition-transform` + `[0.98]` wide tier + outward `ring-ring`
- **F**: "Clear previews" small pill → same as D
- **G**: Keep-media segmented cards → `aria-pressed` + `[0.97]` + KEEP bare `transition` + `ring-ring` (NOT `ring-white/70`)
- **H**: Connection segmented tabs → `aria-pressed` + `[0.97]` + KEEP bare `transition` + OUTWARD `ring-ring` (NOT `ring-inset`)

## Confirmations on each nuance

| Nuance | Resolution |
|---|---|
| **(C) tier** | `[0.98]` wide/card — these are `min-h-[82px]` cards with icon + 2-line stats, not small pills. Correct. |
| **(C) bare `transition`** | KEEP — bare `transition` eases transform + color + opacity; adding `active:scale-*` is covered, no flip to `transition-all`. |
| **(C) `aria-pressed`** | Valid — multi-select toggle, state conveyed ONLY by bg/border, label word ("Photos"/"Videos"/etc.) is constant. |
| **(E) tier** | `[0.98]` wide — `flex-1` wide primary action in a button row. Correct. NOT `[0.97]`. |
| **(E) `transition-transform`** | Correct — NO hover color (only `disabled:opacity-50`, which is a disabled-attr snap, not a hover fade). |
| **(E) ring color** | `ring-ring` — `bg-destructive` FILL on a neutral card row → outward ring renders against neutral parent. NOT `ring-white/70`. |
| **(G)+(H) `aria-pressed` on single-select** | Valid house pattern — matches GroupOrders/MarketplaceOrders/Transactions precedent. State conveyed ONLY by bg, label constant, NOT `role=tab`/`aria-selected`. |
| **(G) `ring-white/70`?** | NO — `bg-ig-gradient` set on the BUTTON itself, but it sits in a NEUTRAL `grid grid-cols-4` container → outward ring renders against neutral grid bg → `ring-ring`. |
| **(H) `ring-inset`?** | NO — the parent `bg-muted p-1` container has rounded corners but is NOT `overflow-hidden`. Ring-inset ONLY when the ancestor explicitly clips. → OUTWARD `ring-ring`. |

## Exact diff — `src/pages/chat/settings/StorageManagerPage.tsx`

### (A) Back — line ~377

```
  // BEFORE:
  className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted/70"
  aria-label="Back"

  // AFTER:
  className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted/70 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  aria-label="Back"   // ← KEEP
```

### (B) Reset — line ~384

```
  // BEFORE:
  className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted/70"
  aria-label="Reset storage settings"

  // AFTER:
  className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted/70 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  aria-label="Reset storage settings"   // ← KEEP
```

### (C) Cache-bucket toggle cards — line ~422

```
  // BEFORE:
  <button
    key={bucket}
    type="button"
    onClick={() => toggleBucket(bucket)}
    className={`min-h-[82px] rounded-[8px] border px-3 py-3 text-left transition ${
      selected ? "border-primary bg-primary/10" : "border-border/60 bg-background hover:bg-muted/50"
    }`}
  >

  // AFTER:
  <button
    key={bucket}
    type="button"
    onClick={() => toggleBucket(bucket)}
    aria-pressed={selected}
    className={`min-h-[82px] rounded-[8px] border px-3 py-3 text-left transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      selected ? "border-primary bg-primary/10" : "border-border/60 bg-background hover:bg-muted/50"
    }`}
  >
```

Note: `transition` PRESERVED (bare `transition` covers transform). `aria-pressed={selected}` ADDED (multi-select toggle).

### (D) Select all — line ~445

```
  // BEFORE:
  className="h-10 rounded-full border border-border px-4 text-sm font-semibold"

  // AFTER:
  className="h-10 rounded-full border border-border px-4 text-sm font-semibold transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### (E) Clear — line ~452

```
  // BEFORE:
  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-destructive px-4 text-sm font-bold text-destructive-foreground disabled:opacity-50"

  // AFTER:
  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-destructive px-4 text-sm font-bold text-destructive-foreground disabled:opacity-50 transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### (F) Clear previews — line ~487

```
  // BEFORE:
  className="h-9 rounded-full border border-border px-3 text-xs font-bold disabled:opacity-50"

  // AFTER:
  className="h-9 rounded-full border border-border px-3 text-xs font-bold disabled:opacity-50 transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### (G) Keep-media segmented options — line ~502

```
  // BEFORE:
  <button
    key={option.value}
    type="button"
    onClick={() => setPrefs((current) => ({ ...current, keepMedia: option.value }))}
    className={`min-h-[64px] rounded-[8px] border px-2 py-2 text-center transition ${
      prefs.keepMedia === option.value ? "border-primary bg-ig-gradient text-white" : "border-border bg-background"
    }`}
  >

  // AFTER:
  <button
    key={option.value}
    type="button"
    onClick={() => setPrefs((current) => ({ ...current, keepMedia: option.value }))}
    aria-pressed={prefs.keepMedia === option.value}
    className={`min-h-[64px] rounded-[8px] border px-2 py-2 text-center transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      prefs.keepMedia === option.value ? "border-primary bg-ig-gradient text-white" : "border-border bg-background"
    }`}
  >
```

Note: `transition` PRESERVED. `aria-pressed` ADDED (single-select segmented). `ring-ring` NOT `ring-white/70` (gradient on button itself, neutral grid parent).

### (H) Connection tabs — line ~523

```
  // BEFORE:
  <button
    key={item.value}
    type="button"
    onClick={() => setSelectedConnection(item.value)}
    className={`h-9 rounded-[7px] text-sm font-bold transition ${
      selectedConnection === item.value ? "bg-background shadow-sm" : "text-muted-foreground"
    }`}
  >

  // AFTER:
  <button
    key={item.value}
    type="button"
    onClick={() => setSelectedConnection(item.value)}
    aria-pressed={selectedConnection === item.value}
    className={`h-9 rounded-[7px] text-sm font-bold transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      selectedConnection === item.value ? "bg-background shadow-sm" : "text-muted-foreground"
    }`}
  >
```

Note: `transition` PRESERVED. `aria-pressed` ADDED (single-select segmented). OUTWARD `ring-ring` (parent NOT `overflow-hidden`).

## Diff summary

| Metric | Count |
|---|---|
| className line swaps (`−`/`+`) | **8** |
| `aria-pressed` added | **5** (C=1 per map iteration [dynamic], G=1 per iteration [dynamic], H=1 per iteration [dynamic]) |
| `aria-label` added/changed | **0** (2 KEPT: A, B) |
| Rings added | **8** (all outward `ring-ring`) |
| `active:scale` additions | **8** (2 × `scale-95` icon [A,B]; 3 × `[0.98]` wide/card [C,E]; 3 × `[0.97]` segmented/small-pill [D,F,G,H]) |
| FRESH `transition-all` | **2** (A, B — have `hover:bg`) |
| FRESH `transition-transform` | **3** (D, E, F — no hover color) |
| bare `transition` PRESERVED | **3** (C, G, H — already covers transform, don't-churn) |
| `ring-inset` | **0** |
| `ring-white/70` | **0** |
| Transition flips | **0** |
| Logic lines touched | **0** |

## SKIP list — confirmed

- ✅ All shadcn `<Switch>` (ToggleRow sub-component) — ship tokens
- ✅ Both shadcn `<Slider>` (Video limit, File limit) — ship tokens
- ✅ Device-cache progress-bar `<div>` — presentational (has `transition-all` on the inner bar, but it's NOT a button — it's a width-driven progress indicator)
- ✅ Locked-media stat cards (Preview cache / Unlocked originals `<div>`) — presentational
- ✅ Local-data stat cards (Local settings / Session queue `<div>`) — presentational
- ✅ All icons + all h1/h2/p/span text — decorative

## Keyboard / responsive flags

- **No keyboard-inaccessible `<div>`s** — every interactive control is a real `<button>` (natively Tab-focusable). The cache-bucket grid cards, keep-media options, connection tabs, stat cards, progress bar are all either `<button>`s or presentational `<div>`s.
- **No keyboard gaps** — all 8 edited controls are native `<button>`s; added focus-visible rings will function correctly.
- **Responsive 375/768/1280 — clean:** `max-w-xl` body → ~343px inner at 375px; `grid-cols-2` cache-bucket cards (each ~165px) fit; `grid-cols-4` keep-media options (each ~78px at `text-center` + 2-char hints) fit; `grid-cols-3` connection tabs (each ~105px, "Wi-Fi"/"Cellular"/"Roaming" at `text-sm`) fit; button row "Select all" + "Clear" (`flex-1` wide) fits; all at 768/1280 within `max-w-xl` centered.

## Owner verification

1. Apply the 8 className edits + 3 `aria-pressed` additions (across 5 template locations) as listed above
2. Run `npm run update` — must be true exit 0 (type-check + worker type-check + production build)
3. Verify at 375/768/1280: bucket cards scale, keep-media grid doesn't crush, connection tabs wrap text properly
4. Do NOT commit unless owner approves
