# MiMo run — 2026-06-14T03:31:25.104Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

Your plan is **correct on all six items**. Here's the validation and the ready diff.

---

## (1) Category chip (A) — AGREE

`aria-pressed` + `[0.97]` + ring + KEEP `transition-all` (append-not-flip) + OUTWARD. Textbook segmented chip. Constant WORD, selection via bg only, overflow-x-auto row doesn't clip box-shadow. No aria-label needed.

## (2) No-op buttons (B, C) — AGREE with ring-only

Ring-only on no-ops is the right call. A focus ring is pure a11y (keyboard users see focus). Adding `active:scale` to a dead button manufactures misleading press feedback — exactly the distinction your no-op policy draws.

- **(B) "See all"**: ring-only, no transition needed (no hover/color/transform to ease, instant ring is standard for a text link).
- **(C) Show card**: ring-only + KEEP `whileTap={{ scale: 0.97 }}` (pre-existing framer affordance, hard rule says don't touch; also reasonable even on a no-op since it was intentionally placed). NO `active:scale` class (dead under framer's inline transform anyway). OUTWARD ring — the button itself is not overflow-hidden, only its child cover div is; parent overflow-x-auto doesn't clip box-shadow.

## (3) Play/Pause (D) — AGREE, don't re-flip

The don't-churn distinction is exactly right:

| Scenario | Rule |
|----------|------|
| Scale **newly added** | Flip `transition-colors` → `transition-all` to ease the new transform (RecentlyViewedPage Remove, MusicStickersPage external link) |
| Scale **pre-existing** | Ring-only, don't re-flip (PodcastsPage Play/Pause — `active:scale-95` + `transition-colors` was already there) |

The existing `transition-colors` doesn't technically ease `active:scale-95` (it snaps), but that's a pre-existing condition — don't-churn says we don't fix it. Ring-only is correct.

## (4) Inventory — EXHAUSTIVE ✓

- 3 RAW `<button>`: chip L93, "See all" L113, Play/Pause L171
- 1 `motion.button`: show card L119
- 2 shadcn `<Button>`: back L63 (skip, ships tokens), Search L78 (skip, ships tokens + FLAG no onClick)
- Episode rows `motion.div` L156: presentational (hover:bg + ChevronRight = dead affordance → FLAG)
- All icons, imgs, p/span, footer hint = display/decorative

## (5) Responsive 375/768/1280 — NO CRUSH

At 375px (~343px inner): header (40+12+28+8+title+40 ≈ fine), chip row scrolls horizontally, 160px carousel scrolls horizontally, episode row (56px cover + 12px gap + flex-1 text + 16px Chevron ≈ 239px for text with line-clamp-2) = no crush.

**Sub-44px tap targets to FLAG** (repo-wide compact pattern):
- Category chips `py-1.5` ~24px
- Back/Search `h-10 w-10` ~40px

## (6) Owner flags — COMPLETE

All four no-op controls flagged. Nothing else to add. The footer ("Audio playback rolls out as more episodes publish") confirms intentional v1 no-ops.

---

## Proposed diff

**File**: `src/pages/PodcastsPage.tsx`

```
(A) Category chip — add aria-pressed + append scale + ring to cn() base

--- BEFORE (L93-102)
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                activeCategory === cat
                  ? "bg-ig-gradient text-white shadow-sm"
                  : "bg-secondary text-foreground hover:bg-muted",
              )}
            >

+++ AFTER
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              aria-pressed={activeCategory === cat}
              className={cn(
                "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeCategory === cat
                  ? "bg-ig-gradient text-white shadow-sm"
                  : "bg-secondary text-foreground hover:bg-muted",
              )}
            >


(B) "See all" — ring-only, no scale, keep aria-label

--- BEFORE (L113)
            <button type="button" aria-label="View all shows" className="text-xs font-semibold text-ig-gradient">

+++ AFTER
            <button type="button" aria-label="View all shows" className="text-xs font-semibold text-ig-gradient focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">


(C) Featured show card — ring-only, keep whileTap

--- BEFORE (L119-128)
              <motion.button
                key={show.id}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileTap={{ scale: 0.97 }}
                className="shrink-0 w-[160px] text-left"
              >

+++ AFTER
              <motion.button
                key={show.id}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileTap={{ scale: 0.97 }}
                className="shrink-0 w-[160px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >


(D) Play/Pause — ring-only, keep transition-colors + active:scale-95 + aria-label

--- BEFORE (L171-176)
                    <button
                      type="button"
                      aria-label={isPlaying ? "Pause episode" : "Play episode"}
                      onClick={() => setPlayingId(isPlaying ? null : ep.id)}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/55 rounded-xl transition-colors active:scale-95"
                    >

+++ AFTER
                    <button
                      type="button"
                      aria-label={isPlaying ? "Pause episode" : "Play episode"}
                      onClick={() => setPlayingId(isPlaying ? null : ep.id)}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/55 rounded-xl transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
```

**Diff summary**: 4 className changes (all append-only) + 1 new `aria-pressed` attribute = **5 ins / 4 del (+1 net)**. Zero logic lines touched. Every `onClick`/`setActiveCategory`/`setPlayingId`/`useState`/`filteredShows`/`navigate`/`whileTap`/`SHOWS`/`EPISODES`/`CATEGORIES`/conditional render preserved byte-for-byte.

---

## Owner must verify/deploy

1. **Run** `npm run update` — must be true exit 0 (type-check + worker type-check + production build).
2. **Preview** at 375/768/1280 — chips scroll, carousel scrolls, episode rows don't crush.
3. **No-op controls to wire** (logic, not this pass):
   - Search `<Button>` L78 — add search/modal onClick
   - "See all" L113 — add navigation (filter reset or separate page)
   - Show cards L119 — add `onClick` to navigate to show detail
   - Episode rows L156 — add `onClick` or remove the hover:bg + ChevronRight dead affordance (currently misleads users into thinking rows are tappable)
4. **Sub-44px tap targets** (repo-wide): category chips `py-1.5` ~24px, back/Search `h-10` ~40px.
