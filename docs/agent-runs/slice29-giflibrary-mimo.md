# MiMo run — 2026-06-14T01:41:03.317Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + responsive QA on ONE customer-facing page: src/pages/GifLibraryPage.tsx (337 lines, route /gif-library -- trending GIFs catalog + user saved favorites. Reads gif_trending (key ["gif-trending"]) + gif_favorites (key ["gif-favorites", user?.id]); saveMutation insert into gif_favorites, unsaveMutation delete; busyId useState gates per-tile; tab/activeCategory/query useState; favoriteUrls/categories/filteredTrending/filteredFavs useMemo). Layout: sticky header (shadcn back <Button> + ImageIcon badge + "GIFs" title); a gradient hero stat card (motion.div, NO onClick); a 2-tab segmented control (trending/favorites); a search <input>; a horizontal category chip row (overflow-x-auto, shown when tab=trending && categories>1); a 3-col trending grid (each tile is motion.div [NO onClick] = img + gradient + optional label + a Save heart icon btn); a 3-col favorites grid (each tile motion.div [NO onClick] = img + a Remove X icon btn); loading skeletons; empty states.

Reference standard for tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): exactly 4 raw <button type="button">, 0 motion.button. shadcn back <Button aria-label="Back" variant="ghost" size="icon"> (L167) => SKIP (ships tokens). The hero motion.div (L180), each trending tile motion.div (L259), each favorites tile motion.div (L310) have entrance initial/animate but NO onClick => presentational, leave alone. The search <input type="search"> (L211) ALREADY has focus:outline-none focus:ring-2 focus:ring-rose-500/30 => leave as-is (valid focus treatment, not a button). <img> GIFs decorative. Loading skeletons non-interactive.

TOKEN TIERS (this repo): wide/primary/cards active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. DON'T-CHURN: if a raw <button> ALREADY has active:scale + a transition, ADD ring (+aria) ONLY -- don't change existing scale/transition (e.g. an existing active:scale-90 is NOT renumbered to icon [0.95]). aria-pressed for toggle/segmented buttons whose selection is conveyed ONLY by bg/color (a count like "favorites (3)" that changes but whose LABEL word stays constant per button STILL qualifies). ring-inset ONLY when an outward ring WOULD be clipped (control flush inside an overflow-hidden/overflow-x-auto rounded parent with zero clearance). REPO PRECEDENT: overflow-x-auto chip rows use NORMAL OUTWARD ring (EventsPage L138 chips in a "flex gap-2 ... overflow-x-auto" row use outward, NO inset; ChatMediaGallery tiles + chips outward) -- so overflow-x-auto alone does NOT force inset.

HARD RULE: className + display-only attr ONLY. Do NOT change any onClick / setTab / setActiveCategory / setQuery / saveMutation / unsaveMutation / navigate / useQuery / useMutation / useMemo / useState / supabase / disabled / any logic.

MY PLAN -- validate or correct each (before->after; cite classNames):

(1) Tab buttons (L195, .map over ["trending","favorites"]; onClick={() => setTab(t)}; cn() base "flex-1 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize" + cond ${tab === t ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted"}; visible text "trending"/"favorites (N)" -- the count varies but the LABEL word is constant per button; selection by bg/gradient only; transition-all ALREADY) -> ADD aria-pressed={tab === t} + INSERT "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" into the static base (after transition-all, before capitalize). DON'T-CHURN transition-all (segmented tier [0.97]; visible text => NO aria-label; container L193 "flex gap-2" NOT overflow => normal OUTWARD ring, gap-2 clearance). OK?

(2) Category chips (L223, .map over categories; onClick={() => setActiveCategory(c)}; cn() base "shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-all capitalize" + cond ${activeCategory === c ? "bg-foreground text-background" : "border border-border text-muted-foreground hover:bg-secondary"}; visible category name = constant per button; selection by bg only; transition-all ALREADY) -> ADD aria-pressed={activeCategory === c} + INSERT same ring tokens into static base. DON'T-CHURN transition-all (chip tier [0.97]; visible text => NO aria-label). RING SHAPE: container L221 "flex gap-2 overflow-x-auto scrollbar-hide" has NO vertical padding (unlike EventsPage's pb-3) so chips are vertically flush -- BUT repo precedent (EventsPage/ChatMediaGallery) uses NORMAL OUTWARD ring for overflow-x-auto chip rows + a 2px box-shadow ring is ignored for scroll-overflow + py-1 chips => I lean NORMAL OUTWARD ring (NO ring-inset), matching precedent. Agree outward, or does the zero vertical clearance here warrant ring-inset?

(3) Save heart button (L273, icon-only Heart; onClick={() => saveMutation.mutate(g)}; disabled={saved || busy}; ALREADY aria-label={saved ? "Already saved" : "Save GIF"}; cn() base "absolute top-1.5 right-1.5 h-7 w-7 rounded-full flex items-center justify-center transition-all active:scale-90" + cond ${saved ? "bg-ig-gradient text-white" : "bg-black/55 backdrop-blur-sm text-white hover:bg-black/70"}) -> APPEND " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" to the static base ONLY. DON'T-CHURN: keep active:scale-90 (do NOT renumber to icon [0.95] -- existing valid scale, InterestsPage Remove-X precedent) + keep transition-all (eases hover:bg-black/70 + the scale). aria present (dynamic) => no change. RING SHAPE: button is absolute top-1.5 right-1.5 (6px inset) h-7 w-7 inside the tile motion.div "relative aspect-square rounded-xl overflow-hidden bg-muted" (L264) -- parent IS overflow-hidden. Clearance math: 6px inset - 2px ring = 4px clearance on straight edges; the ring's nearest point to the rounded-xl (12px radius) corner sits INSIDE the corner arc (not clipped). So I lean NORMAL OUTWARD ring (the 6px inset keeps the ring clear of the clip edge; ChatMediaGallery overflow-hidden tile precedent uses outward). Agree outward, or ring-inset to be safe on the overflow-hidden tile?

(4) Remove X button (L318, icon-only X; onClick={() => unsaveMutation.mutate(g.id)}; disabled={busy}; ALREADY aria-label="Remove from favorites"; className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/55 backdrop-blur-sm text-white flex items-center justify-center hover:bg-destructive/80 active:scale-90 transition-all") -> APPEND ring ONLY. DON'T-CHURN: keep active:scale-90 + transition-all (eases hover:bg-destructive/80 + scale). aria present => no change. Same overlay-on-overflow-hidden-tile as #3 => same OUTWARD-ring reasoning. OK?

QUESTIONS:
(1) Tabs (#1) + Category chips (#2): both get aria-pressed (selection by bg only, label word constant per button) + active:scale-[0.97] + ring, DON'T-CHURN transition-all. Agree both qualify for aria-pressed (incl the favorites "(N)" count case)? Agree [0.97] segmented/chip tier?
(2) Category chips (#2) RING SHAPE: overflow-x-auto row with ZERO vertical padding -- normal OUTWARD ring (repo precedent) or ring-inset (zero clearance)? I lean OUTWARD. Your call?
(3) Save heart (#3) + Remove X (#4): ring-only DON'T-CHURN (both already active:scale-90 + transition-all + aria-label) -- keep scale-90 (no renumber to [0.95]), keep transition-all, no aria change. Agree?
(4) Save/Remove RING SHAPE: 6px-inset h-7 w-7 overlay inside an overflow-hidden rounded-xl tile -- normal OUTWARD ring (6px inset clears the 2px ring per the corner math) or ring-inset? I lean OUTWARD. Your call?
(5) Responsive 375/768/1280: header (back h-10 w-10 + badge + title); hero p-5; 2 tabs flex-1; search h-11; category chips overflow-x-auto scroll; 3-col grid gap-2 (tiles aspect-square, ~105px each @375). Any crush? Inventory exhaustive (exactly 4 raw <button>, no missed control)? shadcn back => correctly SKIP? search <input> (focus:ring-rose-500/30) => leave as-is? hero + tile motion.divs (no onClick) => presentational? sub-44px tap targets to FLAG (Save/Remove h-7 w-7 ~28px; tabs py-1.5 ~30px; chips py-1 ~26px; back h-10 40px)?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/GifLibraryPage.tsx

---

## 1. Plan

4 edits, all className + 2 standalone `aria-pressed` attrs. Zero logic changes.

| # | Control | What changes | Tier | Ring |
|---|---------|-------------|------|------|
| 1 | Tab buttons (L195) | ADD `aria-pressed={tab === t}` + INSERT `active:scale-[0.97]` + ring into `cn()` static base | segmented `[0.97]` | outward |
| 2 | Category chips (L223) | ADD `aria-pressed={activeCategory === c}` + INSERT same into `cn()` static base | chip `[0.97]` | outward |
| 3 | Save heart (L273) | APPEND ring ONLY into `cn()` static base | DON'T-CHURN `active:scale-90` | outward |
| 4 | Remove X (L318) | APPEND ring ONLY to className | DON'T-CHURN `active:scale-90` | outward |

All 5 your questions answered below in the diff notes. Your plan is **correct as-is** on every point — I only have one clarification on #2's ring shape.

---

## 2. Diff (`src/pages/GifLibraryPage.tsx`)

```diff
--- a/src/pages/GifLibraryPage.tsx
+++ b/src/pages/GifLibraryPage.tsx
@@ -195,12 +195,13 @@
           {(["trending", "favorites"] as Tab[]).map((t) => (
             <button
               key={t}
               type="button"
               onClick={() => setTab(t)}
+              aria-pressed={tab === t}
               className={cn(
-                "flex-1 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize",
+                "flex-1 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring capitalize",
                 tab === t ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
               )}
             >
@@ -223,12 +224,13 @@
               <button
                 key={c}
                 type="button"
                 onClick={() => setActiveCategory(c)}
+                aria-pressed={activeCategory === c}
                 className={cn(
-                  "shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-all capitalize",
+                  "shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring capitalize",
                   activeCategory === c ? "bg-foreground text-background" : "border border-border text-muted-foreground hover:bg-secondary",
                 )}
@@ -273,7 +275,7 @@
                         className={cn(
-                          "absolute top-1.5 right-1.5 h-7 w-7 rounded-full flex items-center justify-center transition-all active:scale-90",
+                          "absolute top-1.5 right-1.5 h-7 w-7 rounded-full flex items-center justify-center transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                           saved ? "bg-ig-gradient text-white" : "bg-black/55 backdrop-blur-sm text-white hover:bg-black/70",
                         )}
@@ -318,3 +320,3 @@
-                        className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/55 backdrop-blur-sm text-white flex items-center justify-center hover:bg-destructive/80 active:scale-90 transition-all"
+                        className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/55 backdrop-blur-sm text-white flex items-center justify-center hover:bg-destructive/80 active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Totals: 4 className edits (each appending tokens) + 2 standalone `aria-pressed` attrs = 6 ins / 4 del, +2 net.** Every `onClick`/`disabled`/`type`/`key` line untouched.

---

## 3. Answers to your 5 questions

**(1) `aria-pressed` for both — YES, agree.** Selection by bg/gradient only, label word (`"trending"` / `"favorites"` / `"All"` / `"CategoryName"`) is constant per button. The `(N)` count on "favorites" varies the text but doesn't change the semantic label of the button — `aria-pressed` conveys the toggle state that's currently invisible to AT. `[0.97]` segmented/chip tier — correct, matches EventsPage tabs and category chips throughout.

**(2) Category chips ring shape — NORMAL OUTWARD, agree with you.** The `overflow-x-auto` clips scrollable *content overflow*, not a 2px box-shadow ring (box-shadow doesn't contribute to scrollable overflow width per CSS spec). The zero `py` on the row means chips sit near the row's top/bottom edge, but the ring is a visual outline on the button itself, not a descendant layout box — it won't create scrollbar artifacts. The EventsPage and ChatMediaGallery chip rows confirm the precedent: `overflow-x-auto` chip rows use outward ring. `ring-inset` is only for the specific case where a control sits flush inside an `overflow-hidden` rounded parent with zero clearance (like the Save heart below).

**(3) Save/Remove DON'T-CHURN — YES, agree on all counts.** Both already have `active:scale-90` (valid, don't renumber to `[0.95]` per InterestsPage Remove-X precedent) + `transition-all` (eases `hover:bg-black/70` / `hover:bg-destructive/80` + the scale) + `aria-label` (present, dynamic). Ring-only append. Correct.

**(4) Save/Remove ring shape — NORMAL OUTWARD, agree with you.** The 6px inset (`top-1.5 right-1.5`) gives 4px clearance to the `overflow-hidden` edge (6px − 2px ring = 4px). The nearest corner of a 28px `rounded-full` button at 6px inset from the parent's rounded-xl corner is well inside the clip arc. The ChatMediaGallery overflow-hidden tile buttons confirm the precedent: overlay icon buttons with adequate inset use outward ring. `ring-inset` would look wrong on a `rounded-full` button (it'd pinch inward).

**(5) Inventory + responsive — all correct, one flag:**

- **4 raw `<button>`**: tabs, category chips, Save heart, Remove X. ✅ exhaustive.
- **SKIP correct**: shadcn back (`Button` ships tokens); search `<input>` (`focus:ring-rose-500/30` valid); hero `motion.div` (no onClick, presentational); tile `motion.div`s (no onClick, presentational). ✅
- **Responsive 375**: `max-w-2xl mx-auto px-4` → ~343px inner. 3-col grid `gap-2` → ~109px/tile `aspect-square`. Header `flex items-center gap-3` (back 40px + badge 28px + title). Hero `p-5`. Tabs `flex-1` each. Search `h-11`. Category chips `overflow-x-auto` scroll. **No crush.** ✅
- **Owner flag (sub-44px tap targets)**: Save/Remove `h-7 w-7` ≈ 28px, chips `py-1` ≈ 26px, tabs `py-1.5` ≈ 30px, back `h-10` 40px.

**Verified**: `npm run update` must pass (type-check + worker type-check + production build) before moving to Done.
