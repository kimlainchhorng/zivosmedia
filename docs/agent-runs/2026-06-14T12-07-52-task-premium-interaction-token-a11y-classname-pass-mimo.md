# MiMo run — 2026-06-14T12:07:52.566Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: TASK: Premium interaction-token + a11y className pass for src/pages/StoresListPage.tsx (customer-facing "Full list of nearby stores", reached via See All from /store-map).

STRICT CONSTRAINTS — className-only + tiny display-only aria attrs. NO logic, NO handlers, NO state, NO routing, NO new framer-motion props, NO tabIndex/role/onKeyDown changes. Keyboard-inaccessible clickable divs and no-op buttons are FLAGGED to the owner, never fixed.

INTERACTION-TOKEN RULES (must match the rest of the app, parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button>/<a>/<Link> get: active:scale-[X] + a transition utility + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Scale tiers: icon-only = scale-95; small/pill chips & segmented = [0.97]; self-contained cards = [0.98]; full-width / wide rows / bare full-width flex regions = [0.99].
- transition-all when the control has a REAL hover:bg-*/text-*/border-*/opacity COLOR fade; transition-transform for PURE press-scale with NO hover color. A Tailwind BARE `transition` shorthand already covers transform, so when a button has `transition` + hover:bg, just APPEND active:scale (no flip needed). FLIP transition-colors -> transition-all when adding scale alongside a color hover.
- ring: outward ring-ring default; ring-white/70 when the ring renders OVER a photographic/image/gradient media surface; ring-inset ONLY when flush inside a SEPARATE overflow-hidden rounded ancestor.
- aria allowlist = aria-label / aria-pressed / aria-expanded ONLY. icon-only raw button with NO aria-label -> ADD; with one -> KEEP. aria-pressed ONLY for segmented single-select conveying selection by BACKGROUND/BORDER fill with constant label content.

CONTROL INVENTORY (line numbers approximate):
1. renderRow (L570-697): outer motion.div whileTap={{scale:0.985}} (presentational wrapper — SKIP). Inner clickable is a <div role="button" tabIndex={0} onClick onKeyDown> at ~L586 (already keyboard-accessible div, NOT a raw button). QUESTION (b): add focus-visible ring to this div, or leave as existing accessible pattern?
   Per-row buttons: favorite heart L647 (icon, has aria-label, `transition` shorthand, hover:bg-muted); show-on-map L656 (icon, aria-label+title, hover:bg-muted); Ride L669 (flex-1 h-10, text+icon, hover:bg-primary/5); Share L676 (same); Call L685 (same).
2. Header search mode: close-search L732 (icon, aria-label, hover:bg-muted); clear L750 (icon, aria-label, no hover color).
3. Header title mode: back/exit L767 (icon, dynamic aria-label, hover:bg-muted); Manage L790 (pill, aria-label, no hover color); Recenter L801 (pill, aria-label, disabled state, no hover color); sort cycle L816 (icon, aria-label, hover:bg-muted); search-open L827 (icon, aria-label, hover:bg-muted).
4. Pending sync pill L842 (full-width, no hover color).
5. Category chips — motion.button whileTap={{scale:0.95}}: All L857, Open-now L868, Trending L881, Favorites L894, per-category L910. Each has `transition-all whitespace-nowrap`, selection by bg fill, constant label words + counts. They ALREADY have framer whileTap scale. QUESTION (a): add focus-visible:ring-ring (ring-only, since framer owns scale)? And add aria-pressed (single-select-ish filters, selection by bg fill, constant labels)?
6. GPS banner: Try-again L944 (pill, hover:bg-amber-200, disabled); Dismiss L952 (pill, hover:bg-amber-100).
7. SKIP — shadcn <Button> ships its own tokens: Retry L974, Reset filters L1017, Select-all L1045, Remove L1058.

DELIVERABLE: For EACH control above give the EXACT className delta (what to append, what to flip) and any aria attr to add. Answer the three lettered QUESTIONS explicitly. Be concise — a per-line list is ideal. Do NOT rewrite the file; just the deltas.
- files: src/pages/StoresListPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

Systematically audit every raw interactive control in `StoresListPage.tsx`. For each: add the missing `active:scale-[X]` + `transition-*` + `focus-visible:ring` per the token tiers. For the category filter chips (already framer-pressed), add ring-only + `aria-pressed`. Answer all three lettered questions. Zero logic/handler/state changes — className + tiny aria attrs only.

---

## Answers to lettered questions

**Question (a) — Category chips:** YES to both. (1) Add `focus-visible:ring-2 focus-visible:ring-ring` (ring-only — framer `whileTap` already owns scale, so no competing CSS `active:scale`). (2) Add `aria-pressed={isActive}` on each chip — these are single-select filters conveyed by bg/border fill with constant label content ("All (12)", "Open now (5)", etc.) → textbook `aria-pressed` pattern matching the rest of the app.

**Question (b) — Row `<div role="button">`:** YES, add `focus-visible:ring`. It's already keyboard-accessible (has `role="button"`, `tabIndex={0}`, `onKeyDown`), so no structural change — just the missing focus indicator. Use `ring-inset` because the parent `<motion.div>` is `overflow-hidden rounded-2xl` (an outward ring would be clipped).

**Question (c) — Manage/Recenter:** Manage is a bare pill with no hover color → bare-full-width-row equivalent tier, `scale-[0.99]`. Recenter is the same, but also needs `disabled:opacity-60` preserved (it already has it).

---

## Complete per-control delta list

### 1. Row clickable div (~L586)

```
BEFORE: className="w-full p-3.5 flex items-center gap-3 text-left"
AFTER:  className="w-full p-3.5 flex items-center gap-3 text-left rounded-xl active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
```

- **Scale:** `[0.98]` (wide full-width row, own persistent card surface from parent)
- **Transition:** `transition-transform` (no hover color on this div — pure press-scale)
- **Ring:** `ring-inset` (parent `<motion.div>` is `overflow-hidden rounded-2xl` — outward would clip)
- **`rounded-xl`** added so ring traces a clean box
- No aria added (has role="button" + visible label content already)

---

### 2. Per-row buttons

**L647 — Favorite heart (icon, has `aria-label`)**
```
BEFORE: className={`w-10 h-10 rounded-full inline-flex items-center justify-center transition touch-manipulation ${fav ? "bg-rose-50 text-rose-500" : "bg-muted/40 text-muted-foreground hover:bg-muted"}`}
AFTER:  className={`w-10 h-10 rounded-full inline-flex items-center justify-center transition touch-manipulation active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${fav ? "bg-rose-50 text-rose-500" : "bg-muted/40 text-muted-foreground hover:bg-muted"}`}
```
- Append `active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the static part before the template literal
- **NO FLIP** (bare `transition` shorthand already covers transform + color)
- `aria-label` already present → KEEP

**L656 — Show on map (icon, has `aria-label`+`title`)**
```
BEFORE: className="w-10 h-10 rounded-full inline-flex items-center justify-center bg-muted/40 text-muted-foreground hover:bg-muted transition touch-manipulation"
AFTER:  className="w-10 h-10 rounded-full inline-flex items-center justify-center bg-muted/40 text-muted-foreground hover:bg-muted transition touch-manipulation active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
- Same as favorite heart — icon-only tier `[0.95]`, bare `transition` → NO FLIP
- `aria-label` already present → KEEP

**L669 — Ride (flex-1 h-10, visible text)**
```
BEFORE: className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold text-primary hover:bg-primary/5 transition"
AFTER:  className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold text-primary hover:bg-primary/5 transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
- **Scale:** `[0.97]` (self-contained segmented pill row, not truly full-width — it's `flex-1` among 2-3 peers)
- **NO FLIP** (bare `transition` covers both)

**L676 — Share (identical pattern to Ride)**
```
BEFORE: className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold text-primary hover:bg-primary/5 transition"
AFTER:  className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold text-primary hover:bg-primary/5 transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**L685 — Call (identical pattern, conditional on `s.phone`)**
```
BEFORE: className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold text-primary hover:bg-primary/5 transition"
AFTER:  className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold text-primary hover:bg-primary/5 transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

### 3. Header — search mode

**L732 — Close search (icon, has `aria-label`, hover:bg-muted)**
```
BEFORE: className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition"
AFTER:  className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
- Icon-only `[0.95]`, bare `transition` → NO FLIP, `aria-label` present → KEEP

**L750 — Clear (icon, has `aria-label`, NO hover color)**
```
BEFORE: className="w-7 h-7 rounded-full flex items-center justify-center bg-muted/60 text-muted-foreground"
AFTER:  className="w-7 h-7 rounded-full flex items-center justify-center bg-muted/60 text-muted-foreground active:scale-[0.95] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
- Icon-only `[0.95]`; no hover color → `transition-transform` (scale-only)
- `aria-label` present → KEEP

---

### 4. Header — title mode

**L767 — Back/exit (icon, dynamic `aria-label`, hover:bg-muted)**
```
BEFORE: className="w-10 h-10 rounded-full flex items-center justify-center bg-card border border-border/40 shadow-sm text-foreground hover:bg-muted transition"
AFTER:  className="w-10 h-10 rounded-full flex items-center justify-center bg-card border border-border/40 shadow-sm text-foreground hover:bg-muted transition active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**L790 — Manage (pill, has `aria-label`, NO hover color)**
```
BEFORE: className="h-10 px-3 inline-flex items-center gap-1.5 rounded-full bg-card border border-border/40 shadow-sm text-foreground text-[12px] font-semibold"
AFTER:  className="h-10 px-3 inline-flex items-center gap-1.5 rounded-full bg-card border border-border/40 shadow-sm text-foreground text-[12px] font-semibold active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
- **Scale:** `[0.97]` (self-contained pill chip with own surface)
- `transition-transform` (no hover color — scale-only)
- `aria-label` present → KEEP

**L801 — Recenter (pill, has `aria-label`, NO hover color, `disabled:opacity-60`)**
```
BEFORE: className="h-10 px-3 inline-flex items-center gap-1.5 rounded-full bg-card border border-border/40 shadow-sm text-foreground text-[12px] font-semibold disabled:opacity-60"
AFTER:  className="h-10 px-3 inline-flex items-center gap-1.5 rounded-full bg-card border border-border/40 shadow-sm text-foreground text-[12px] font-semibold disabled:opacity-60 active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
- Same pattern as Manage; `disabled:opacity-60` preserved

**L816 — Sort cycle (icon, has `aria-label`, hover:bg-muted)**
```
BEFORE: className="w-10 h-10 rounded-full flex items-center justify-center bg-card border border-border/40 shadow-sm text-muted-foreground hover:bg-muted transition relative"
AFTER:  className="w-10 h-10 rounded-full flex items-center justify-center bg-card border border-border/40 shadow-sm text-muted-foreground hover:bg-muted transition active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring relative"
```
- Icon-only `[0.95]`; bare `transition` → NO FLIP; `relative` preserved at end

**L827 — Search open (icon, has `aria-label`, hover:bg-muted)**
```
BEFORE: className="w-10 h-10 rounded-full flex items-center justify-center bg-card border border-border/40 shadow-sm text-muted-foreground hover:bg-muted transition"
AFTER:  className="w-10 h-10 rounded-full flex items-center justify-center bg-card border border-border/40 shadow-sm text-muted-foreground hover:bg-muted transition active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

### 5. Pending sync pill (L~842)

```
BEFORE: className="mt-2 w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold rounded-full px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200"
AFTER:  className="mt-2 w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold rounded-full px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 active:scale-[0.99] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
- **Scale:** `[0.99]` (full-width, no hover color)
- `transition-transform` (no hover pseudo — scale-only)
- No aria-label (visible text: "{count} changes pending sync · tap to retry")

---

### 6. Category chips — RING-ONLY + aria-pressed (all 5 variants)

All five motion.button variants already have `whileTap={{ scale: 0.95 }}` + `transition-all`. Add **ring-only** (no competing CSS scale) + `aria-pressed`.

**All (~L857):**
```
BEFORE: className={`px-4 min-h-[40px] inline-flex items-center rounded-full text-[13px] font-semibold transition-all whitespace-nowrap border touch-manipulation ${
  !showFavorites && !trendingOnly && activeCategory === "all"
    ? "bg-ig-gradient text-white border-primary shadow-sm"
    : "bg-card text-foreground/80 border-border/40"
}`}
AFTER:  className={`px-4 min-h-[40px] inline-flex items-center rounded-full text-[13px] font-semibold transition-all whitespace-nowrap border touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
  !showFavorites && !trendingOnly && activeCategory === "all"
    ? "bg-ig-gradient text-white border-primary shadow-sm"
    : "bg-card text-foreground/80 border-border/40"
}`}
+ aria-pressed={!showFavorites && !trendingOnly && activeCategory === "all"}
```

**Open-now (~L868):**
```
STATIC APPEND: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
+ aria-pressed={openNowOnly}
```

**Trending (~L881):**
```
STATIC APPEND: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
+ aria-pressed={trendingOnly}
```

**Favorites (~L894):**
```
STATIC APPEND: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
+ aria-pressed={showFavorites}
```

**Per-category (~L910):**
```
STATIC APPEND: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
+ aria-pressed={isActive}
```

- All use `transition-all` → NO FLIP needed (already superset)
- All already have `whileTap={{ scale: 0.95 }}` → ring-ONLY, no competing CSS `active:scale`
- Ring color: `ring-ring` — parent is a neutral scrollbar-hide flex row, no clipping/overflow-hidden

---

### 7. GPS banner buttons

**L944 — Try again (pill, has hover:bg-amber-200, `disabled:opacity-60`)**
```
BEFORE: className="min-h-[40px] px-3 inline-flex items-center gap-1 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 text-[12px] font-semibold disabled:opacity-60 touch-manipulation"
AFTER:  className="min-h-[40px] px-3 inline-flex items-center gap-1 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 text-[12px] font-semibold disabled:opacity-60 touch-manipulation active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
- **Scale:** `[0.97]` (self-contained pill with own solid fill `bg-amber-100`)
- **FLIP:** `touch-manipulation` → `touch-manipulation active:scale-[0.97] transition-all` (currently no `transition-*` at all, has hover color → needs `transition-all`)
- `disabled:opacity-60` preserved

**L952 — Dismiss (pill, has hover:bg-amber-100, NO own persistent surface)**
```
BEFORE: className="min-h-[40px] px-3 inline-flex items-center justify-center rounded-full text-amber-800 text-[11px] font-semibold hover:bg-amber-100 touch-manipulation"
AFTER:  className="min-h-[40px] px-3 inline-flex items-center justify-center rounded-full text-amber-800 text-[11px] font-semibold hover:bg-amber-100 touch-manipulation active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
- **Scale:** `[0.99]` (bare transparent pill — no persistent own bg, only hover pseudo)
- `transition-all` (currently no transition, has hover color)

---

### SKIPPED (no changes needed)

| Control | Reason |
|---------|--------|
| Outer `motion.div whileTap={{scale:0.985}}` (L~570) | Presentational wrapper — SKIP |
| shadcn `<Button>` (Retry, Reset filters, Select-all, Remove) | Own tokens |
| `<Checkbox>` (manage mode) | shadcn component, own tokens |
| `<Badge>` | shadcn, not interactive |
| `<ZivoMobileNav />`, `<NavBar />` | Own files/tokens |
| `<StoreDetailsDrawer>` | Separate component |

---

## Summary guard tally

| Metric | Count |
|--------|-------|
| Raw controls edited | 18 (5 per-row buttons × N rows + 5 header search/title + 1 sync pill + 5 category chips + 2 GPS banner) |
| className edits | 18 |
| `active:scale-[0.95]` (icon-only) | 6 (favorite, map, close-search, clear, back/exit, sort, search-open — actually 7) |
| `active:scale-[0.97]` (pill/segmented) | 7 (Ride, Share, Call, Manage, Recenter, GPS Try-again, sort-search-open) |
| `active:scale-[0.98]` (card/row) | 1 (row div) |
| `active:scale-[0.99]` (bare full-width) | 2 (sync pill, Dismiss) |
| `ring-inset` | 1 (row div) |
| `ring-ring` | 17 (all others — outward) |
| `aria-pressed` added | 5 (All, Open-now, Trending, Favorites, per-category) |
| `aria-label` added | 0 (all controls already have one or have visible text) |
| FLIPs needed | 1 (GPS Try-again — no prior transition at all) |
| DON'T-CHURN preserved | 0 (no existing `active:scale-*` on any edited control) |
| `disabled` touched | 0 (all preserved as-is) |
| Logic lines touched | 0 |

---

## Owner verification checklist

1. **Run `npm run update`** — must pass (0 type errors + worker types + production build).
2. **Preview at 375/768/1280** — the `flex-1` action buttons (Ride/Share/Call) with `[0.97]` scale should feel right at mobile widths; the row div with `[0.98]` should be subtle.
3. **Keyboard tab test** — verify the row div focus ring appears (it will be inset, inside the card border) and the category chip focus rings appear (outward, against the scroll strip).
4. **`aria-pressed` on chips** — verify screen reader announces "All (12), pressed" / "not pressed" correctly.
5. **GPS Try-again `transition-all`** — verify the button didn't previously have any transition utility; the code shows none, but double-check.
6. **Pending sync pill** — requires `pendingSyncCount > 0` to appear (test by having queued offline favorites).
