# DeepSeek run — 2026-06-14T00:51:58.567Z

- model: deepseek-chat
- task: Premium interaction + responsive QA on ONE customer-facing page: src/pages/account/FavoritesPage.tsx (337 lines, route /account/favorites -- view + manage favorites across service types [restaurant/hotel/destination/flight]). Sticky header (back + centered "Favorites" + spacer); horizontal-scroll filter-tab row (All/Restaurants/Hotels/Destinations/Flights, each w/ count badge); search+sort+view-toggle row (shadcn Input search w/ clear-X + shadcn DropdownMenu sort trigger + view-mode list/grid toggle); loading skeletons; empty-state (2 shadcn Buttons); no-match-state (1 shadcn Button); favorites list/grid of motion.div cards (cover img, type badge, REMOVE button, info). Uses useFavorites(filterType) hook (favorites, isLoading, removeFavorite), localStorage for sortKey + viewMode.

Reference standard for tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): exactly 5 raw <button type="button">, 0 motion.button. shadcn to SKIP: <Input> search (L170), <Button> sort-trigger (L189), <DropdownMenuItem> x3 (L196), <Button> empty-state Restaurants/Hotels (L241/245), <Button variant="link"> clear-search (L258), <Skeleton>. The favorite CARD is a motion.div WITH onClick={() => navigate(getItemLink(fav))} (cursor-pointer active:scale-[0.98] transition-transform) -- a clickable <div>, NOT a <button>, no role/tabIndex/onKeyDown => keyboard-inaccessible => CSS focus ring would be DEAD. State: useState activeTab, search, sortKey, viewMode.

TOKEN TIERS (this repo): wide/primary/cards active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. transition-all when a bg/color also animates OR general raw-button standard; transition-transform when scale is the SOLE animated prop. aria-label for icon-only; aria-pressed for TOGGLE buttons whose pressed-state is conveyed ONLY by color/fill/bg (NOT by a text change). ring-inset ONLY when a control is flush inside an overflow-hidden rounded parent. DON'T-CHURN: if a raw <button> ALREADY has active:scale + a transition, ADD ring (+aria) ONLY -- don't change existing scale value or flip transition-transform<->all unless a hover-bg demands the new scale to animate. Clickable <div> (no tabIndex/role): do NOT add a dead focus ring -- FLAG keyboard gap as owner fix (BadgesPage / AudioSpaces space-Card precedent).

HARD RULE: className + display-only attr (aria-label/aria-pressed) ONLY. Do NOT change any onClick / navigate / setActiveTab / setSearch / setSortKey / setViewMode / removeFavorite / useFavorites / localStorage / useMemo / any logic.

MY PLAN -- validate or correct each (before->after; cite classNames):

(1) Header back (L127, icon ArrowLeft; onClick navigate(-1); "w-10 h-10 rounded-full bg-muted flex items-center justify-center" -- NO hover-bg, NO transition, NO active:scale) -> append " transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" + add aria-label="Go back" (icon tier). Q: transition-all vs transition-transform? bg-muted is STATIC (no hover) => scale is SOLE animated prop => strictly transition-transform, BUT every prior header-back in this marathon used transition-all (raw-button standard). Lean transition-all for consistency -- agree or use transition-transform?

(2) Filter tabs (L143-160, .map x5; onClick setActiveTab(tab.key); cn() base "shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all" [transition-all ALREADY] + active "bg-ig-gradient text-white border-primary" vs inactive "bg-card text-muted-foreground border-border hover:border-primary/30"; tab label ALWAYS visible, selection conveyed ONLY by bg-ig-gradient vs bg-card) -> append " active:scale-[0.97] focus-visible:...ring" to cn base + add aria-pressed={isActive} (segmented tier; KEEP transition-all; row is "flex gap-2 overflow-x-auto scrollbar-hide pb-3" => overflow-x-auto clips overflowing CONTENT not the ~2px outward ring => NORMAL ring, NO ring-inset -- same as GroceryPage/EventsPage tabs). Agree aria-pressed (not role=tab/aria-selected)?

(3) Search clear-X (L178-184, icon X; onClick setSearch(""); "absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:bg-muted/60" -- aria-label="Clear search" + rounded-md ALREADY; NO transition, NO active:scale) -> append " transition-all active:scale-95 focus-visible:...ring" (icon tier; transition-all so hover:bg-muted/60 fades; rounded-md present => normal ring). No aria-label change (already has it).

(4) View-mode toggle (L203-209, icon Grid3x3<->List; onClick setViewMode(list<->grid); "h-9 w-9 rounded-full flex items-center justify-center bg-card border border-border/40 hover:bg-accent/50 active:scale-95 transition-all shrink-0" -- aria-label={viewMode==="list" ? "Switch to grid view" : "Switch to list view"} + active:scale-95 + transition-all ALREADY; NO ring) -> append " focus-visible:...ring" ONLY (ring-only; KEEP active:scale-95 + transition-all). Q: aria-pressed? It's a MODE-SWITCH whose dynamic aria-label ("Switch to grid view"/"Switch to list view") AND icon change with state => state IS conveyed by a text(label)+icon change => aria-pressed NOT needed (would be redundant/confusing on an action-label button). Lean ring-only, NO aria-pressed. Agree?

(5) Remove button (L302-310, icon Heart fill-current; onClick e.stopPropagation()+removeFavorite({itemType,itemId}); "absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-destructive/20 backdrop-blur-md border border-destructive/30 flex items-center justify-center text-destructive hover:bg-destructive/30 transition-colors" -- has transition-colors [for hover:bg-destructive/30]; NO active:scale, NO ring, NO aria-label) -> change transition-colors->transition-all + append " active:scale-95 focus-visible:...ring" + add aria-label="Remove from favorites" (icon tier; FLIP transition-colors->transition-all is REQUIRED so the new active:scale animates while keeping the hover-bg fade -- this is the "hover-bg demands it" exception to don't-churn). Q: ring-inset? Button sits inside the card's "rounded-2xl overflow-hidden" but is absolute top-2.5 right-2.5 (10px inset) + w-8 h-8 => ~2px outward ring lands ~8px from the card edge => NOT clipped => NORMAL ring, NO ring-inset. Agree? And aria-label wording "Remove from favorites" (filled heart = unfavorite) ok?

(6) FLAG (owner fix, NOT className-fixable): favorite CARD (L277-285) is a clickable motion.div (onClick navigate) with NO role/tabIndex/onKeyDown => keyboard users can't reach/open a favorite; already has active:scale-[0.98] transition-transform => leave className untouched, do NOT add a dead focus ring; owner fix = role="button" + tabIndex={0} + onKeyDown (BadgesPage/AudioSpaces precedent). Agree leave-and-flag?

QUESTIONS:
(1) Header back transition-all vs transition-transform (static bg-muted, no hover)? Lean transition-all (consistency).
(2) View-mode toggle: ring-only NO aria-pressed (dynamic action-label + icon convey state)? Agree?
(3) Filter tabs aria-pressed (segmented precedent) vs role=tab/aria-selected? Lean aria-pressed.
(4) Remove button: flip transition-colors->transition-all + active:scale-95 + ring + aria-label="Remove from favorites"? Agree wording + flip?
(5) ring-inset on remove button (inside overflow-hidden card, 10px inset)? Lean NO (normal ring).
(6) Favorite card: leave-and-flag the keyboard gap (clickable div), no dead ring? Agree?
(7) Responsive 375/768/1280: max-w-2xl mx-auto px-6; tabs overflow-x-auto scrollbar-hide (5 tabs + count badges); search+sort+view row flex gap-2 (search flex-1, sort Button label "hidden sm:inline" => icon-only @375, view h-9 w-9); list = space-y-3, grid = grid-cols-2 gap-3. Any crush @375 (esp the search+sort+view row + grid-cols-2 cards)?

ALSO confirm: (a) inventory exhaustive (exactly 5 raw <button>, no missed control)? (b) sub-44px tap targets to FLAG (header back w-10 h-10=40px; clear-X p-1~20px; view-toggle h-9 w-9=36px; remove w-8 h-8=32px; tabs px-3.5 py-2~32px)? (c) the favorite card clickable-div keyboard gap = owner flag not a per-page fix?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/account/FavoritesPage.tsx

---

## Plan

Apply premium interaction tokens to the 5 raw `<button>` controls in `src/pages/account/FavoritesPage.tsx`. All changes are className + display-only attr only. Flag the clickable `motion.div` card keyboard gap as owner fix.

## Proposed Diff

```diff
--- a/src/pages/account/FavoritesPage.tsx
+++ b/src/pages/account/FavoritesPage.tsx
@@ -124,7 +124,8 @@ export default function FavoritesPage() {
       <div className="sticky top-0 safe-area-top z-50 bg-background/80 backdrop-blur-xl border-b">
         <div className="flex items-center justify-between px-6 py-4 max-w-2xl mx-auto">
-          <button type="button" onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
+          <button type="button" onClick={() => navigate(-1)}
+            aria-label="Go back"
+            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <ArrowLeft className="w-5 h-5" />
           </button>
           <h1 className="font-bold text-lg">Favorites</h1>
@@ -148,6 +149,7 @@ export default function FavoritesPage() {
               <button type="button"
                 key={tab.key}
                 onClick={() => setActiveTab(tab.key)}
+                aria-pressed={isActive}
                 className={cn(
                   "shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all",
                   isActive
@@ -155,6 +157,7 @@ export default function FavoritesPage() {
                     : "bg-card text-muted-foreground border-border hover:border-primary/30"
+                    " active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                 )}
               >
                 <Icon className="w-3.5 h-3.5" />
@@ -182,7 +185,8 @@ export default function FavoritesPage() {
                 <button type="button"
                   onClick={() => setSearch("")}
                   aria-label="Clear search"
-                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:bg-muted/60"
+                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:bg-muted/60
+                    transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                 >
                   <X className="h-3 w-3" />
                 </button>
@@ -204,7 +208,8 @@ export default function FavoritesPage() {
               onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
               aria-label={viewMode === "list" ? "Switch to grid view" : "Switch to list view"}
-              className="h-9 w-9 rounded-full flex items-center justify-center bg-card border border-border/40 hover:bg-accent/50 active:scale-95 transition-all shrink-0"
+              className="h-9 w-9 rounded-full flex items-center justify-center bg-card border border-border/40 hover:bg-accent/50 active:scale-95 transition-all shrink-0
+                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             >
               {viewMode === "list" ? <Grid3x3 className="h-4 w-4" /> : <List className="h-4 w-4" />}
             </button>
@@ -299,7 +304,8 @@ export default function FavoritesPage() {
                     <button type="button"
                       onClick={(e) => {
                         e.stopPropagation();
                         removeFavorite({ itemType: fav.item_type, itemId: fav.item_id });
                       }}
-                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-destructive/20 backdrop-blur-md border border-destructive/30 flex items-center justify-center text-destructive hover:bg-destructive/30 transition-colors"
+                      aria-label="Remove from favorites"
+                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-destructive/20 backdrop-blur-md border border-destructive/30 flex items-center justify-center text-destructive hover:bg-destructive/30 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                     >
                       <Heart className="w-4 h-4 fill-current" />
                     </button>
```

## Validation of Your Plan

1. **Header back** — `transition-all` ✅ (consistency with prior header-backs; `bg-muted` is static but the `transition-all` is zero-cost and matches the repo pattern)

2. **Filter tabs** — `aria-pressed` ✅ (segmented toggle precedent; `role="tab"` would need `aria-controls`/`tabpanel` wiring that doesn't exist); normal outward ring ✅ (`overflow-x-auto` clips content, not the button's ring)

3. **Search clear-X** — already has `aria-label="Clear search"` ✅; `transition-all` ✅ (hover-bg fades)

4. **View-mode toggle** — ring-only, NO `aria-pressed` ✅ (dynamic action-label + icon change conveys state; `aria-pressed` would be confusing on a "Switch to X" action button)

5. **Remove button** — `transition-colors`→`transition-all` ✅ (required for the new `active:scale` to animate); `aria-label="Remove from favorites"` ✅; normal ring, NO `ring-inset` ✅ (10px inset from `rounded-2xl overflow-hidden` edge is sufficient clearance)

6. **Favorite card** — leave-and-flag ✅ (clickable `motion.div`, no `role`/`tabIndex`/`onKeyDown`; adding a dead focus ring would be misleading)

## Owner Flags

- **Keyboard gap**: The favorite card (`motion.div` at L277) is clickable but not keyboard-accessible. Fix: add `role="button"` + `tabIndex={0}` + `onKeyDown={(e) => e.key === 'Enter' && navigate(getItemLink(fav))}`.
- **Sub-44px tap targets** (repo-wide compact pattern, not a regression): header back (40px), clear-X (~20px), view-toggle (36px), remove button (32px), filter tabs (~32px).

## Verify

Run `npm run update` before marking done.
