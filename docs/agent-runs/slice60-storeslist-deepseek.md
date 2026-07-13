# DeepSeek run — 2026-06-14T12:06:14.776Z

- model: deepseek-chat
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

# StoresListPage Premium Interaction + A11y Pass — Plan & Diffs

## Plan

Apply the same interaction-token + a11y className pattern used across the app (ref `JobPostingDetailPage.tsx`) to all raw interactive controls in `src/pages/StoresListPage.tsx`. No logic changes, no new framer props, no structural a11y upgrades (role/tabIndex/onKeyDown). Only className edits + display-only aria attrs.

## Control-by-Control Deltas

### QUESTION ANSWERS FIRST

**(a) Category chips — add focus-visible:ring-ring + aria-pressed?**
- **YES** to both. They're single-select filter chips with selection conveyed by background fill and constant label text → `aria-pressed` is the house pattern. Since framer `whileTap={{ scale: 0.95 }}` already handles press, add **ring-only** (no competing CSS `active:scale`).

**(b) renderRow inner `<div role="button" tabIndex={0}>` — add focus-visible ring?**
- **YES**, add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to its className. It's already keyboard-accessible (native keyboard handling via tabIndex + onKeyDown), but lacks a visible focus indicator. This is a className-only fix (no role/tabIndex/onKeyDown changes).

---

### CONTROL DELTAS (line numbers approximate from provided file)

#### 1. renderRow controls (L570-697)

**L647 — Favorite heart button** (icon-only, has `aria-label`, has `transition` + `hover:bg-muted`)
- **DON'T-CHURN**: KEEP existing `transition` (already covers transform), KEEP `hover:bg-muted`
- **ADD**: `active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **aria**: KEEP existing `aria-label` (already present)
- After: `w-10 h-10 rounded-full inline-flex items-center justify-center transition touch-manipulation active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

**L656 — Show on map button** (icon-only, has `aria-label`+`title`, has `transition` + `hover:bg-muted`)
- **DON'T-CHURN**: KEEP existing `transition`, KEEP `hover:bg-muted`
- **ADD**: `active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **aria**: KEEP existing `aria-label` + `title`
- After: `w-10 h-10 rounded-full inline-flex items-center justify-center bg-muted/40 text-muted-foreground hover:bg-muted transition touch-manipulation active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

**L669 — Ride button** (text+icon, has `transition` + `hover:bg-primary/5`)
- **DON'T-CHURN**: KEEP `transition` (already covers transform), KEEP `hover:bg-primary/5`
- **ADD**: `active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **aria**: none needed (visible text "Ride")
- After: `flex-1 h-10 inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold text-primary hover:bg-primary/5 transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

**L676 — Share button** (text+icon, has `transition` + `hover:bg-primary/5`)
- Same as Ride: `active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

**L685 — Call button** (text+icon, has `transition` + `hover:bg-primary/5`)
- Same as Ride: `active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

**L586 — renderRow outer `<div role="button" tabIndex={0}>`** (keyboard-accessible div, no ring)
- **ADD**: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to its className
- **NO** scale (the wrapping `motion.div whileTap={{ scale: 0.985 }}` handles press)
- **NO** aria (the div is a container, not a toggle/disclosure — its click opens the drawer)
- After: `w-full p-3.5 flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

#### 2. Header search mode controls

**L732 — Close search button** (icon-only, has `aria-label`, has `transition` + `hover:bg-muted`)
- **DON'T-CHURN**: KEEP `transition`, KEEP `hover:bg-muted`
- **ADD**: `active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **aria**: KEEP existing `aria-label="Close search"`
- After: `w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

**L750 — Clear search button** (icon-only, has `aria-label`, NO hover color)
- **NO** hover pseudo → `transition-transform` (scale is sole animated prop)
- **ADD**: `active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **aria**: KEEP existing `aria-label="Clear"`
- After: `w-7 h-7 rounded-full flex items-center justify-center bg-muted/60 text-muted-foreground active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

#### 3. Header title mode controls

**L767 — Back/exit button** (icon-only, has dynamic `aria-label`, has `transition` + `hover:bg-muted`)
- **DON'T-CHURN**: KEEP `transition`, KEEP `hover:bg-muted`
- **ADD**: `active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **aria**: KEEP existing dynamic `aria-label`
- After: `w-10 h-10 rounded-full flex items-center justify-center bg-card border border-border/40 shadow-sm text-foreground hover:bg-muted transition active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

**L790 — Manage button** (pill, has `aria-label`, NO hover color)
- **NO** hover pseudo → `transition-transform`
- **ADD**: `active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **aria**: KEEP existing `aria-label="Manage favorites"`
- After: `h-10 px-3 inline-flex items-center gap-1.5 rounded-full bg-card border border-border/40 shadow-sm text-foreground text-[12px] font-semibold active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

**L801 — Recenter button** (pill, has `aria-label`, has `disabled` state, NO hover color)
- **NO** hover pseudo → `transition-transform`
- **ADD**: `active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **aria**: KEEP existing `aria-label="Recenter distance"` + `title`
- After: `h-10 px-3 inline-flex items-center gap-1.5 rounded-full bg-card border border-border/40 shadow-sm text-foreground text-[12px] font-semibold disabled:opacity-60 active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

**L816 — Sort cycle button** (icon-only, has `aria-label`, has `transition` + `hover:bg-muted`)
- **DON'T-CHURN**: KEEP `transition`, KEEP `hover:bg-muted`
- **ADD**: `active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **aria**: KEEP existing `aria-label="Sort stores"` + `title`
- After: `w-10 h-10 rounded-full flex items-center justify-center bg-card border border-border/40 shadow-sm text-muted-foreground hover:bg-muted transition active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring relative`

**L827 — Search-open button** (icon-only, has `aria-label`, has `transition` + `hover:bg-muted`)
- **DON'T-CHURN**: KEEP `transition`, KEEP `hover:bg-muted`
- **ADD**: `active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **aria**: KEEP existing `aria-label="Search"`
- After: `w-10 h-10 rounded-full flex items-center justify-center bg-card border border-border/40 shadow-sm text-muted-foreground hover:bg-muted transition active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

#### 4. Pending sync pill (L842)

**L842 — Sync pill** (full-width, NO hover color)
- **NO** hover pseudo → `transition-transform`
- **ADD**: `active:scale-[0.99] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **aria**: none needed (visible text)
- After: `mt-2 w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold rounded-full px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 active:scale-[0.99] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

#### 5. Category chips (L857-910)

**All chips** — each is a `motion.button` with `whileTap={{ scale: 0.95 }}` + `transition-all whitespace-nowrap` + selection by bg fill + constant label text
- **RING-ONLY** (framer owns scale — no competing CSS `active:scale`)
- **ADD**: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **ADD**: `aria-pressed={isActive}` (where `isActive` is the boolean determining the selected state)
- **NO** FLIP (already `transition-all`)
- **aria**: `aria-pressed` for each chip's selection boolean

**L857 — "All" chip**: `aria-pressed={!showFavorites && !trendingOnly && activeCategory === "all"}`
**L868 — "Open now" chip**: `aria-pressed={openNowOnly}`
**L881 — "Trending" chip**: `aria-pressed={trendingOnly}`
**L894 — "Favorites" chip**: `aria-pressed={showFavorites}`
**L910 — per-category chip**: `aria-pressed={!showFavorites && activeCategory === cat.value}`

#### 6. GPS banner controls (L944-952)

**L944 — Try again button** (pill, has `hover:bg-amber-200`, has `disabled`)
- **DON'T-CHURN**: KEEP `hover:bg-amber-200` (it's a real color hover)
- **FLIP**: `transition` is NOT present → **ADD** `transition-all` (covers both hover color + scale)
- **ADD**: `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **aria**: none needed (visible text "Try again")
- After: `min-h-[40px] px-3 inline-flex items-center gap-1 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 text-[12px] font-semibold disabled:opacity-60 touch-manipulation transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

**L952 — Dismiss button** (pill, has `hover:bg-amber-100`)
- **DON'T-CHURN**: KEEP `hover:bg-amber-100`
- **FLIP**: `transition` is NOT present → **ADD** `transition-all`
- **ADD**: `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **aria**: none needed (visible text "Dismiss")
- After: `min-h-[40px] px-3 inline-flex items-center justify-center rounded-full text-amber-800 text-[11px] font-semibold hover:bg-amber-100 touch-manipulation transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

#### 7. SKIPPED — shadcn `<Button>` components (own tokens)
- L974 Retry `<Button>`
- L1017 Reset filters `<Button variant="outline">`
- L1045 Select all `<Button variant="outline" size="sm">`
- L1058 Remove `<Button>`

---

## Diff

```diff
--- a/src/pages/StoresListPage.tsx
+++ b/src/pages/StoresListPage.tsx
@@ -583,7 +583,7 @@ function renderRow(s: StorePin) {
           onKeyDown={(e) => {
             if (e.key === "Enter" || e.key === " ") {
               e.preventDefault();
               if (inManage) toggleSelected(s.id);
               else setDrawerStore(s);
             }
           }}
-          className="w-full p-3.5 flex items-center gap-3 text-left"
+          className="w-full p-3.5 flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
         >
           <StoreThumb store={s} isLive={isLive} />
           <div className="flex-1 min-w-0">
@@ -644,7 +644,7 @@ function renderRow(s: StorePin) {
               <button type="button"
                 onClick={(e) => { e.stopPropagation(); handleToggleFavorite(s); }}
                 className={`w-10 h-10 rounded-full inline-flex items-center justify-center transition touch-manipulation ${
                   fav ? "bg-rose-50 text-rose-500" : "bg-muted/40 text-muted-foreground hover:bg-muted"
-                }`}
+                } active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                 aria-label={fav ? "Remove from favorites" : "Add to favorites"}
               >
                 <Heart className={`w-4 h-4 ${fav ? "fill-current" : ""}`} />
@@ -653,7 +653,7 @@ function renderRow(s: StorePin) {
                 onClick={(e) => { e.stopPropagation(); navigate(`/store-map?focus=${s.id}`); }}
                 className="w-10 h-10 rounded-full inline-flex items-center justify-center bg-muted/40 text-muted-foreground hover:bg-muted transition touch-manipulation"
                 aria-label="Show on map"
+                className="w-10 h-10 rounded-full inline-flex items-center justify-center bg-muted/40 text-muted-foreground hover:bg-muted transition touch-manipulation active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                 title="Show on map"
               >
                 <MapPin className="w-4 h-4" />
@@ -665,14 +665,14 @@ function renderRow(s: StorePin) {
             <button type="button"
               onClick={(e) => { e.stopPropagation(); handleRide(s); }}
-              className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold text-primary hover:bg-primary/5 transition"
+              className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold text-primary hover:bg-primary/5 transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             >
               <Car className="w-3.5 h-3.5" /> Ride
             </button>
             <div className="w-px bg-border/30" />
             <button type="button"
               onClick={(e) => { e.stopPropagation(); shareStore(s, distMi); }}
-              className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold text-primary hover:bg-primary/5 transition"
+              className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold text-primary hover:bg-primary/5 transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             >
               <Share2 className="w-3.5 h-3.5" /> Share
             </button>
@@ -682,7 +682,7 @@ function renderRow(s: StorePin) {
                 <button type="button"
                   onClick={(e) => { e.stopPropagation(); window.open(`tel:${s.phone}`,
