# MiMo run — 2026-06-14T03:37:05.701Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + responsive QA on ONE customer-facing page: src/pages/SoundsPage.tsx (211 lines, "Creator audio library — trending sounds creators attach to reels/stories", MOCK DATA v1 — header comment "structure maps directly to a sounds table"). State: activeGenre useState ("All" default), playingId useState (string|null). filtered = activeGenre filter over const SOUNDS; trending = SOUNDS.filter(s.trending). Layout: SwipeBackContainer + SEOHead (indexable, NOT noIndex); sticky header (shadcn back <Button> + Music2 badge + "Sounds" title + shadcn Filter <Button>); a horizontal overflow-x-auto genre-chip row (GENRES.map: All/Chill/Jazz/Pop/Ambient/Electronic/Cinematic/World, each constant WORD); a conditional "Trending now" section (only when activeGenre==="All": header + overflow-x-auto carousel of presentational motion.div cards, each w/ an overlaid RAW Play/Pause button on a 150px cover); an "All sounds" section (h2 + list of presentational motion.div ROWS, each w/ a RAW Play/Pause cover-button + title/artist/duration + a shadcn "Use" Button); a footer hint <p>. NO bottom nav.

Reference standard for tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): exactly 3 RAW <button type="button"> (genre chip L83, trending Play/Pause L120, list Play/Pause L161) + 0 motion.button + 3 shadcn <Button> (back L53, Filter L68, "Use" L191). The trending cards (motion.div L110) and list rows (motion.div L154) are PRESENTATIONAL (NO onClick — only the buttons inside are controls).
- shadcn back <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={navigate(-1)}> (L53) => SKIP (ships tokens, labeled).
- shadcn Filter <Button aria-label="Filter sounds" variant="ghost" size="icon" className="h-10 w-10 rounded-full"> (L68, NO onClick) => SKIP token-wise (shadcn ships tokens + labeled); FLAG missing onClick (does nothing).
- shadcn "Use" <Button size="sm" onClick={() => navigate("/feed/new")} className="bg-ig-gradient text-white font-bold rounded-full h-8 px-3 hover:opacity-90 border-0 shrink-0"> (L191, visible "Use" text + Plus icon) => SKIP (shadcn ships tokens; visible text = no aria-label).
- (A) Genre chip (L83, RAW in GENRES.map): onClick={() => setActiveGenre(g)}, cn() base "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all" + conditional activeGenre===g ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted"; visible text {g} (constant WORD). HAS transition-all; NO scale/ring/aria-pressed. Row = flex gap-2 overflow-x-auto scrollbar-hide.
- (B) Trending Play/Pause (L120, RAW): ALREADY aria-label={isPlaying ? "Pause" : "Play"}, onClick={() => setPlayingId(isPlaying ? null : sound.id)}, className "absolute inset-0 flex items-center justify-center active:scale-95" — HAS active:scale-95 but NO transition class, NO ring. The button itself has NO hover color (the inner h-11 w-11 white circle div has no hover either). Overlays a 150px cover; parent div L117 = relative w-[150px] h-[150px] rounded-2xl overflow-hidden (the cover is overflow-hidden — the play button is a CHILD of it, inset-0).
- (C) List Play/Pause (L161, RAW): ALREADY aria-label={isPlaying ? "Pause" : "Play"}, onClick={() => setPlayingId(isPlaying ? null : sound.id)}, className "shrink-0 relative active:scale-95 transition-transform" — ALREADY HAS active:scale-95 + transition-transform, NO ring. The button itself has NO hover color (its CHILD overlay div L168 has hover:bg-black/55 transition-colors, but that's a child, not the button). Overlays a 48px (w-12 h-12) cover; the list row L159 = flex items-center gap-3 p-2.5 rounded-xl bg-card border (p-2.5 clearance); the button is NOT overflow-hidden.

TOKEN TIERS (this repo): wide/primary/cards active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. transition-all when the control ALSO has hover:bg/text/opacity (color/opacity fade); transition-transform for PURE press-scale with NO hover color. DON'T-CHURN: if a raw button ALREADY has active:scale + a transition, ADD ring (+aria) ONLY — do NOT renumber a valid existing scale, do NOT re-flip an existing valid transition. aria-pressed for toggles/segmented/filter-chips whose state is conveyed ONLY by color/bg (constant label WORD qualifies) — NOT for one-shot nav/action. ring-inset ONLY when flush (zero clearance) inside an overflow-hidden rounded PARENT; OUTWARD is default; overflow-x-auto scroll does NOT clip box-shadow rings (OUTWARD).

HARD RULE: className + display-only attr (aria-*) ONLY. Do NOT change any onClick / setActiveGenre / setPlayingId / useState / filtered / trending / navigate / the SOUNDS/GENRES consts / the conditional render / any logic. Do NOT add onClick to any no-op control (that is logic/out of scope — FLAG it).

MY PLAN -- validate or correct each (before->after; cite classNames):

(A) Genre chip (L83; RAW in map; HAS transition-all; working onClick): ADD aria-pressed={activeGenre === g} (after onClick) + APPEND active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring to the cn() BASE string; KEEP transition-all (append-not-flip — eases the inactive hover:bg-muted color alongside the new scale). base before: "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all" -> after: "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring". chip tier => [0.97]. aria-pressed VALID (selection conveyed ONLY by bg; constant WORD per chip). visible text => NO aria-label. OUTWARD ring (overflow-x-auto row). OK?

(B) Trending Play/Pause (L120; RAW; ALREADY active:scale-95 but NO transition; working onClick; ALREADY aria-label): ADD transition-transform (the button has a press-scale but NO transition to ease it -> it snaps; transition-transform completes the token set and matches sibling C; pure press-scale, button has NO hover color -> transition-transform NOT transition-all) + APPEND focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring; KEEP active:scale-95 (icon-tier, correct), KEEP aria-label. className before: "absolute inset-0 flex items-center justify-center active:scale-95" -> after: "absolute inset-0 flex items-center justify-center active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring". QUESTION: is ADDING transition-transform here correct (completing an incomplete token set + matching sibling C), or should it be RING-ONLY (treat the lone active:scale-95 as "already has scale" don't-churn and leave it snapping)? I lean ADD transition-transform for consistency with C. RING placement: the button is a CHILD of an overflow-hidden rounded-2xl cover (L117) and sits flush at inset-0 (zero clearance) -> should the ring be ring-inset (the overflow-hidden parent WOULD clip an outward box-shadow ring on this flush child)? I lean ring-inset here (flush child inside overflow-hidden rounded parent = the documented ring-inset case). CONFIRM ring-inset vs outward for B.

(C) List Play/Pause (L161; RAW; ALREADY active:scale-95 + transition-transform; working onClick; ALREADY aria-label): RING-ONLY (DON'T-CHURN) -> append " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"; KEEP active:scale-95 (icon-tier), KEEP transition-transform (pure press-scale, the button has NO hover color of its own — its child overlay div has the hover:bg + transition-colors; do NOT flip the button's transition-transform), KEEP aria-label. className before: "shrink-0 relative active:scale-95 transition-transform" -> after: "shrink-0 relative active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring". OUTWARD ring (the button is NOT overflow-hidden; it sits in a p-2.5 rounded-xl row with clearance). OK? Confirm DON'T flip transition-transform->transition-all (the button itself has no hover color; the hover is on a child div).

QUESTIONS:
(1) Chips (A): aria-pressed + [0.97] + ring, KEEP transition-all (append-not-flip), OUTWARD ring. AGREE?
(2) Trending Play (B): ADD transition-transform + ring + keep active:scale-95/aria-label. AGREE with ADDING transition-transform (vs ring-only)? And confirm ring-inset (flush child at inset-0 inside the overflow-hidden rounded-2xl cover) vs OUTWARD.
(3) List Play (C): RING-ONLY, DON'T flip transition-transform (button has no own hover; child div owns the hover) => don't-churn. AGREE? OUTWARD ring (button not overflow-hidden, p-2.5 row clearance)?
(4) Inventory exhaustive (3 RAW + 0 motion.button + 3 shadcn)? back L53 + Filter L68 + "Use" L191 SKIP (Filter no onClick=flag)? trending motion.div L110 + list row motion.div L154 correctly presentational (NO onClick => the row hover:bg-secondary/40 on L159 is a dead affordance => FLAG not fix)?
(5) Responsive 375/768/1280: header (back + Music2 + title + Filter); genre chip row (overflow-x-auto 8 WORD chips); trending carousel (150px cards overflow-x-auto, conditional on activeGenre==="All"); list row (48px cover + flex-1 min-w-0 title line-clamp-1/artist truncate/duration + "Use" h-8 button). Any crush @375? sub-44px tap targets to FLAG (chips py-1.5 ~24px; back/Filter h-10 w-10 40px; trending play 44px h-11 w-11 OK; list play 48px cover OK; "Use" h-8 ~32px)?
(6) Owner flags (logic/out of scope, FLAG not fix): Filter button no onClick; trending/list rows presentational (no row onClick, dead hover:bg on list row). All correct to FLAG? Anything else?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/SoundsPage.tsx

---

## Verdict: Your plan is correct on all six items. One correction on (B) ring direction — you're right to ask, and your instinct is right.

---

### (1) Genre chip (A) — **AGREE, all correct**

- `aria-pressed={activeGenre === g}` ✓ (bg-only selection, constant WORD)
- `[0.97]` segmented-chip tier ✓
- **append-not-flip** on `transition-all` ✓ (already eases `hover:bg-muted`)
- OUTWARD ring ✓ (`overflow-x-auto` doesn't clip box-shadow)
- No `aria-label` ✓ (visible `{g}`)

### (2) Trending Play/Pause (B) — **AGREE on both questions**

**ADD transition-transform — correct (not ring-only).** The don't-churn rule requires the control to ALREADY have **both** `active:scale` **and** a transition. B has `active:scale-95` but **no transition at all** — the scale currently snaps. Adding `transition-transform` completes the incomplete token set and matches sibling C. This is not churn; it's a missing token.

**ring-inset — correct.** The button is `absolute inset-0` (flush, zero clearance) inside a `rounded-2xl overflow-hidden` parent (L117). An outward box-shadow ring would be clipped by the parent's `overflow-hidden`. `ring-inset` renders inside the button's boundary, staying within the clip.

Final className:
```
"absolute inset-0 flex items-center justify-center active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
```

Note the `ring-inset` (not `ring-ring`… wait — it should be `ring-inset ring-ring` to combine both? No. Let me be precise: Tailwind's `ring-2` sets the ring width, `ring-ring` sets the color (from CSS variable), and `ring-inset` makes it inset. So the correct combination is `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset`.)

### (3) List Play/Pause (C) — **AGREE, all correct**

- RING-ONLY (has `active:scale-95` + `transition-transform` already → don't-churn) ✓
- **DON'T flip** `transition-transform`→`transition-all` ✓ — the button has NO hover color of its own; the `hover:bg-black/55` is on a **child** div (L168), not the button. The button's `transition-transform` correctly eases only its own transform. Flipping = zero-value churn.
- OUTWARD ring ✓ — button has no `overflow-hidden`, sits in a `p-2.5` row with clearance.
- Keep `active:scale-95`, keep `aria-label` ✓

Final className:
```
"shrink-0 relative active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### (4) Inventory — **AGREE, exhaustive**

3 RAW `<button>` (chip L83, trending play L120, list play L161) + 0 `motion.button` + 3 shadcn `<Button>` (back L53, Filter L68, "Use" L191). All skips correct.

Additional flags:
- **Filter (L68)**: no `onClick` → FLAG (dead control)
- **List row `motion.div` (L159)**: `hover:bg-secondary/40 transition-colors` with NO `onClick` → dead hover affordance → FLAG
- **Trending cards `motion.div` (L110)**: presentational, no dead affordance → clean ✓

### (5) Responsive 375/768/1280 — **AGREE, clean**

No crush at any breakpoint. Sub-44px tap targets to FLAG (repo-wide compact pattern):
- Genre chips `py-1.5` ~24px
- Back/Filter `h-10 w-10` ~40px
- "Use" `h-8` ~32px
- Trending play `h-11 w-11` ~44px ✓
- List play 48px cover ✓

### (6) Owner flags — **AGREE, complete**

1. Filter button no `onClick` → does nothing
2. Trending/list rows presentational (no row `onClick`)
3. List row dead `hover:bg-secondary/40` (hover visual works but clicking does nothing — misleading affordance)

Nothing else to flag.

---

## Proposed Diff

**File:** `src/pages/SoundsPage.tsx`

```diff
--- a/src/pages/SoundsPage.tsx
+++ b/src/pages/SoundsPage.tsx
@@ -83,7 +83,8 @@
             <button
               key={g}
               type="button"
               onClick={() => setActiveGenre(g)}
+              aria-pressed={activeGenre === g}
               className={cn(
-                "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
+                "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                 activeGenre === g
@@ -120,7 +121,7 @@
                         aria-label={isPlaying ? "Pause" : "Play"}
                         onClick={() => setPlayingId(isPlaying ? null : sound.id)}
-                        className="absolute inset-0 flex items-center justify-center active:scale-95"
+                        className="absolute inset-0 flex items-center justify-center active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                       >
@@ -161,7 +162,7 @@
                     aria-label={isPlaying ? "Pause" : "Play"}
                     onClick={() => setPlayingId(isPlaying ? null : sound.id)}
-                    className="shrink-0 relative active:scale-95 transition-transform"
+                    className="shrink-0 relative active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                   >
```

**Summary:** 3 edits, 0 logic lines touched. 1 `aria-pressed` added (A), 3 focus rings added (A/B/C), 1 `transition-transform` added (B), 1 `ring-inset` (B only). All `onClick`/`setActiveGenre`/`setPlayingId`/`useState`/`filtered`/`trending`/`navigate`/`SOUNDS`/`GENRES`/conditional render left byte-identical.

**Owner verify:** `npm run update` must pass (type-check + worker type-check + production build). Preview at `/sounds` to confirm genre chip selection highlighting, play/pause toggles, and visible focus rings on Tab.
