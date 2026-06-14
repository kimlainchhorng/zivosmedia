# DeepSeek run — 2026-06-14T03:30:01.252Z

- model: deepseek-chat
- task: Premium interaction + responsive QA on ONE customer-facing page: src/pages/PodcastsPage.tsx (207 lines, "ZIVO podcasts directory", MOCK DATA v1 — header comment says "structure is real, a podcasts table can populate this without UI changes"). State: activeCategory useState ("All" default), playingId useState (string|null). filteredShows = activeCategory filter over const SHOWS. Layout: SwipeBackContainer + SEOHead (indexable, NOT noIndex); sticky header (shadcn back <Button> + Headphones badge + "Podcasts" title + shadcn Search <Button>); a horizontal overflow-x-auto category-chip row (CATEGORIES.map: All/Travel/Business/Hospitality/Tech, each constant WORD); a "Featured shows" section (header h2 + a RAW "See all" text button + a horizontal overflow-x-auto carousel of motion.button show cards); a "Latest episodes" section (h2 + a list of episode ROWS, each a motion.div with an overlaid RAW Play/Pause button on the cover); a footer hint <p>. NO bottom nav (SwipeBackContainer page).

Reference standard for tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): exactly 3 RAW <button type="button"> (category chip in CATEGORIES.map L93, "See all" L113, Play/Pause L171) + 1 motion.button (show card in filteredShows.map L119) + 2 shadcn <Button> (back L63, Search L78); the episode ROWS are motion.DIV (presentational). IMPORTANT — this is a MOCK v1 page with MANY no-op/placeholder controls: the Search shadcn Button (L78) has NO onClick; the "See all" button (L113) has NO onClick; the show-card motion.button (L119) has NO onClick; the episode-row motion.div (L156) has hover:bg-secondary/40 + transition-colors + a trailing ChevronRight (clickable affordance) but NO row onClick. Only the category chips (setActiveCategory) and the Play/Pause button (setPlayingId) actually DO anything.
- shadcn back <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={navigate(-1)}> (L63) => SKIP (ships tokens, labeled).
- shadcn Search <Button aria-label="Search podcasts" variant="ghost" size="icon" className="h-10 w-10 rounded-full"> (L78, NO onClick) => SKIP token-wise (shadcn ships tokens + labeled); FLAG missing onClick (does nothing).
- (A) Category chip (L93, RAW <button> in CATEGORIES.map): onClick={() => setActiveCategory(cat)}, cn() base "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all" + conditional activeCategory===cat ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted"; visible text {cat} (constant WORD). HAS transition-all; NO scale/ring/aria-pressed. Row = flex gap-2 overflow-x-auto scrollbar-hide.
- (B) "See all" (L113, RAW <button>): ALREADY aria-label="View all shows", NO onClick, className "text-xs font-semibold text-ig-gradient" (a text link button; NO transition/scale/ring). Sits in a flex justify-between header (NOT overflow-hidden).
- (C) Featured show card (L119, motion.button in filteredShows.map): entrance anim initial/animate/transition, ALREADY whileTap={{ scale: 0.97 }}, NO onClick, className "shrink-0 w-[160px] text-left" (NO ring). Parent row = flex gap-3 overflow-x-auto scrollbar-hide. Inner cover div is overflow-hidden (a CHILD div, not the button).
- (D) Play/Pause (L171, RAW <button>): ALREADY aria-label={isPlaying ? "Pause episode" : "Play episode"}, onClick={() => setPlayingId(isPlaying ? null : ep.id)}, className "absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/55 rounded-xl transition-colors active:scale-95" (ALREADY has active:scale-95 + transition-colors + hover:bg, NO ring). Overlays the 56px (w-14 h-14) episode cover img; parent div L163 = shrink-0 relative (NOT overflow-hidden); the episode row L161 = flex items-center gap-3 p-3 rounded-2xl bg-card border (p-3 clearance).
- Episode row motion.div (L156, entrance anim, hover:bg-secondary/40 transition-colors, trailing ChevronRight L194, NO onClick) => presentational dead affordance (FLAG). Headphones/Play/Pause/Clock/Search/ChevronRight/ArrowLeft icons decorative; all <img>/<p>/<span> display children.

TOKEN TIERS (this repo): wide/primary/cards active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. DON'T-CHURN: if a raw button ALREADY has active:scale + a transition, ADD ring (+aria) ONLY — do NOT renumber a valid existing scale, do NOT re-flip an existing valid transition. motion.button with whileTap => ring ONLY (CSS active:scale is DEAD under framer's inline transform; keep whileTap, do NOT add active:scale). aria-pressed for toggles/segmented/filter-chips whose state is conveyed ONLY by color/bg (constant label WORD qualifies) — NOT for one-shot nav/action. ring-inset ONLY when flush (zero clearance) inside an overflow-hidden rounded PARENT; OUTWARD is default; overflow-x-auto scroll does NOT clip box-shadow rings (OUTWARD).

NO-OP CONTROL POLICY (my read): a focus-visible ring on a focusable <button>/motion.button is ALWAYS a pure a11y win (keyboard focus visible) regardless of whether onClick exists — so ADD the ring. But active:scale = press feedback should only be added where there is a REAL action, else it manufactures misleading feedback for a dead control. So for the no-op buttons (B "See all", C show card) => RING-ONLY, NO active:scale, and FLAG the missing onClick to owner.

HARD RULE: className + display-only attr (aria-*) ONLY. Do NOT change any onClick / setActiveCategory / setPlayingId / useState / filteredShows / navigate / the SHOWS/EPISODES/CATEGORIES consts / the conditional render / any logic. Do NOT add onClick to any no-op control (that is logic/out of scope — FLAG it).

MY PLAN -- validate or correct each (before->after; cite classNames):

(A) Category chip (L93; RAW in map; HAS transition-all; working onClick): ADD aria-pressed={activeCategory === cat} (after onClick) + APPEND active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring to the cn() BASE string; KEEP transition-all (append-not-flip — eases the inactive hover:bg-muted color alongside the new scale). base before: "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all" -> after: "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring". chip tier => [0.97]. aria-pressed VALID (selection conveyed ONLY by bg; constant WORD per chip, NO count badge). visible text => NO aria-label. OUTWARD ring (overflow-x-auto row). OK?

(B) "See all" (L113; RAW; NO onClick; NO transition/scale/ring; ALREADY aria-label): RING-ONLY -> append " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" to className; NO active:scale (no-op control — don't fake press); NO transition (ring is instant, correct); KEEP aria-label="View all shows". className before: "text-xs font-semibold text-ig-gradient" -> after: "text-xs font-semibold text-ig-gradient focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring". FLAG missing onClick to owner. OK? (Or do you prefer FULL link treatment transition-transform + active:scale-[0.97] + ring even though it is a no-op? Advise.)

(C) Featured show card (L119; motion.button; whileTap present; NO onClick; NO ring): RING-ONLY -> append " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" to className; KEEP whileTap={{ scale: 0.97 }}; NO active:scale (dead under framer). className before: "shrink-0 w-[160px] text-left" -> after: "shrink-0 w-[160px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring". OUTWARD ring (the button itself is NOT overflow-hidden — only its child cover div is; parent row overflow-x-auto doesn't clip box-shadow). FLAG missing onClick to owner. OK?

(D) Play/Pause (L171; RAW; ALREADY active:scale-95 + transition-colors + hover:bg + aria-label; working onClick): RING-ONLY (DON'T-CHURN) -> append " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"; KEEP active:scale-95 (icon-only tier, correct), KEEP transition-colors (do NOT re-flip — the existing active:scale-95 + transition-colors is a pre-existing valid combo, NOT a newly-added transform; don't-churn says ring-only), KEEP aria-label. className before: "absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/55 rounded-xl transition-colors active:scale-95" -> after: "... transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring". OUTWARD ring (parent shrink-0 relative NOT overflow-hidden; ~p-3 row clearance). OK? Confirm DON'T re-flip transition-colors->transition-all here (active:scale-95 pre-existing => ring-only per don't-churn; vs the RecentlyViewedPage/LiveLocationsPage case where the scale was NEWLY added so the flip WAS required).

QUESTIONS:
(1) Chips (A): aria-pressed + [0.97] + ring, KEEP transition-all (append-not-flip), OUTWARD ring. AGREE?
(2) NO-OP buttons (B "See all", C show card): RING-ONLY (a11y) + NO active:scale + FLAG missing onClick. AGREE with the no-op policy, or do you want full tokens? For (C) confirm ring-only + keep whileTap (no dead active:scale).
(3) Play/Pause (D): RING-ONLY, DON'T re-flip transition-colors (pre-existing active:scale-95 => don't-churn). AGREE? Confirm the don't-flip distinction (pre-existing scale vs newly-added).
(4) Inventory exhaustive (3 RAW + 1 motion.button + 2 shadcn)? back L63 + Search L78 SKIP (Search no onClick=flag)? episode row motion.div L156 correctly presentational (dead hover affordance + ChevronRight but NO onClick => FLAG not fix)?
(5) Responsive 375/768/1280: header (back + Headphones + title + Search); category chip row (overflow-x-auto 5 WORD chips); featured carousel (160px show cards overflow-x-auto); episode row (56px cover + Play overlay + flex-1 min-w-0 showTitle/title line-clamp-2/duration/ago + trailing ChevronRight). Any crush @375? sub-44px tap targets to FLAG (chips py-1.5 ~24px; back/Search h-10 w-10 40px; Play overlay = 56px ok)?
(6) Owner flags (logic/out of scope, FLAG not fix): Search button no onClick; "See all" no onClick; show cards no onClick; episode rows no onClick (dead hover:bg + ChevronRight affordance). All correct to FLAG? Anything else?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/PodcastsPage.tsx

---

## Plan

Apply premium interaction tokens to 4 controls on `src/pages/PodcastsPage.tsx`:

1. **Category chips (A)** — `aria-pressed` + `active:scale-[0.97]` + ring (append to existing `transition-all`)
2. **"See all" (B)** — ring-only (no-op control, no `active:scale`)
3. **Show cards (C)** — ring-only (`motion.button` with `whileTap`, no dead CSS `active:scale`)
4. **Play/Pause (D)** — ring-only (already has `active:scale-95` + `transition-colors` → don't-churn)

All changes are className + display-only ARIA. No logic touched.

## Diff

```diff
--- a/src/pages/PodcastsPage.tsx
+++ b/src/pages/PodcastsPage.tsx
@@ -90,7 +90,7 @@ export default function PodcastsPage() {
               key={cat}
               type="button"
               onClick={() => setActiveCategory(cat)}
-              className={cn(
+              aria-pressed={activeCategory === cat}
                 "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                 activeCategory === cat
                   ? "bg-ig-gradient text-white shadow-sm"
@@ -109,7 +109,7 @@ export default function PodcastsPage() {
           <div className="flex items-center justify-between px-4 mb-3">
             <h2 className="text-base font-bold text-foreground">Featured shows</h2>
             <button type="button" aria-label="View all shows" className="text-xs font-semibold text-ig-gradient">
-              See all
+              See all
             </button>
           </div>
           <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
@@ -119,7 +119,7 @@ export default function PodcastsPage() {
                 initial={{ opacity: 0, y: 8 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: idx * 0.05 }}
-                whileTap={{ scale: 0.97 }}
+                whileTap={{ scale: 0.97 }}
                 className="shrink-0 w-[160px] text-left"
               >
                 <div className="relative w-[160px] h-[160px] rounded-2xl overflow-hidden bg-muted shadow-md">
@@ -168,7 +168,7 @@ export default function PodcastsPage() {
                     <button
                       type="button"
                       aria-label={isPlaying ? "Pause episode" : "Play episode"}
-                      onClick={() => setPlayingId(isPlaying ? null : ep.id)}
+                      onClick={() => setPlayingId(isPlaying ? null : ep.id)}
                       className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/55 rounded-xl transition-colors active:scale-95"
                     >
                       {isPlaying ? (
```

Wait — the diff above is malformed (I lost the `cn()` wrapper on the chip). Let me provide the correct before/after for each control:

### (A) Category chip — L93-99

**Before:**
```tsx
className={cn(
  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
  activeCategory === cat
    ? "bg-ig-gradient text-white shadow-sm"
    : "bg-secondary text-foreground hover:bg-muted",
)}
```

**After:**
```tsx
aria-pressed={activeCategory === cat}
className={cn(
  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  activeCategory === cat
    ? "bg-ig-gradient text-white shadow-sm"
    : "bg-secondary text-foreground hover:bg-muted",
)}
```

### (B) "See all" — L113

**Before:**
```tsx
className="text-xs font-semibold text-ig-gradient"
```

**After:**
```tsx
className="text-xs font-semibold text-ig-gradient focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### (C) Show card — L119

**Before:**
```tsx
className="shrink-0 w-[160px] text-left"
```

**After:**
```tsx
className="shrink-0 w-[160px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### (D) Play/Pause — L171

**Before:**
```tsx
className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/55 rounded-xl transition-colors active:scale-95"
```

**After:**
```tsx
className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/55 rounded-xl transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

## Answers to your questions

1. **(A) Chips: AGREE** — `aria-pressed` + `[0.97]` + ring, append to existing `transition-all`, outward ring. ✅

2. **(B/C) No-op buttons: AGREE with ring-only** — `active:scale` on a dead control manufactures misleading press feedback. Ring-only is the correct a11y win. For (C), ring-only + keep `whileTap` is correct (the framer transform is the intended press feedback, not a dead CSS class). ✅

3. **(D) Play/Pause: AGREE ring-only, DON'T re-flip** — `active:scale-95` is pre-existing and valid. The `transition-colors` flip was only needed in cases like `RecentlyViewedPage` where the scale was **newly added** (so the existing `transition-colors` wouldn't ease the new transform). Here the scale is already present and already eased by... actually, `transition-colors` does NOT ease `transform` — but since the scale is pre-existing and working, changing `transition-colors` to `transition-all` would be a behavioral change (it would now ease the hover `bg` fade AND the scale, whereas currently only the bg fades). **Don't-churn rule wins: ring-only.** ✅

4. **Inventory: CORRECT** — 3 RAW `<button>` (chip, "See all", Play/Pause) + 1 `motion.button` (show card) + 2 shadcn `<Button>` (back, Search). Search's missing `onClick` is a flag, not a fix. Episode row `motion.div` is correctly presentational (dead hover + ChevronRight = flag). ✅

5. **Responsive @375: CLEAN** — `max-w-2xl mx-auto px-4` → ~343px inner. Category chips: 5 WORD chips at `px-3.5 py-1.5` (~60px each) = ~300px → fits in `flex gap-2 overflow-x-auto`. Show cards: `w-[160px]` + `gap-3` → scroll. Episode rows: 56px cover + `flex-1 min-w-0` + 16px ChevronRight → ~255px for text column → `line-clamp-2` + `min-w-0` handles overflow. **Sub-44px flags**: chips `py-1.5` ~24px (established pattern), back/Search `h-10 w-10` ~40px (close but accepted). ✅

6. **Owner flags: CORRECT** — 4 dead controls: Search button (no `onClick`), "See all" (no `onClick`), show cards (no `onClick`), episode rows (no `onClick` despite hover + ChevronRight affordance). All out of scope for this pass. ✅

## Owner verification

- Run `npm run update` — must pass (type-check + worker + build)
- Preview at `/podcasts` on localhost (no auth gate — renders immediately with mock data)
- Verify: category chips have ring on keyboard focus + `aria-pressed` in devtools; "See all" and show cards have ring only (no scale); Play/Pause has ring appended to existing tokens
- 4 dead controls flagged for owner to wire `onClick` handlers when audio playback / search / full catalog navigation is ready
