# DeepSeek run — 2026-06-14T00:19:05.317Z

- model: deepseek-chat
- task: Premium interaction + responsive QA on ONE customer-facing page: src/pages/CommunitiesPage.tsx (358 lines, route /communities -- topic-based groups list/browse: sticky header (back + create-community toggle), Discover/My-Communities tabs, search input, communities feed (motion.div cards w/ avatar/name/verified/privacy/desc/stats + per-card Join/Leave), bottom create-community sheet (name input + description textarea + public/private toggle + Create submit), ZivoMobileNav). This is the LIST page; I just finished its detail sibling CommunityDetailPage (/communities/:id) last slice.

Reference standard for tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (grep-confirmed): exactly 7 raw <button type="button">, 0 shadcn <Button>, 0 motion.button. The community cards + sheet wrappers are framer motion.div. Two <input> (search L173, name L314) + one <textarea> (desc L320) ALREADY have focus:outline-none focus:ring-2 focus:ring-primary/20 (leave them). Avatar is shadcn (skip). LoadFailureCard + DegradedDataBanner are separate components (skip), BUT the Retry <button> is raw JSX rendered in THIS file via DegradedDataBanner's rightSlot prop (in scope).

TOKEN TIERS (this repo): wide/primary/cards active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. transition-all when a bg/color also animates OR general raw-button standard; aria-label for icon-only; aria-pressed for segmented buttons whose selection is conveyed ONLY by background (per AchievementsPage/ChallengesPage/CoinTransfers filter-tab precedent). ring-inset only when a control is flush inside an overflow-hidden rounded parent.

CRITICAL edit-shape rule:
- RAW <button> (these 7) => CSS active:scale WORKS => FULL token set.
- shadcn <Button>/<Avatar> => never touch.
- motion.div (presentational OR clickable-but-not-keyboard-focusable) => NOTHING (flag, don't fix).

HARD RULE: className + display-only attr (aria-label/aria-pressed) ONLY. Do NOT change any onClick / navigate / setTab / setShowCreate / setSearchQuery / setNewCommunity / joinMutation / createMutation / refetch / supabase / queryClient / confirmContentSafe / useQuery/useMutation keys / disabled logic / e.stopPropagation().

MY PLAN -- validate or correct each (before->after; cite classNames):

(1) Header back (icon ArrowLeft) -- ALREADY has aria-label="Go back" title="Go back". before className: "p-2 -ml-2 rounded-full hover:bg-muted/50" -> append " transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (icon tier; transition-all so hover:bg fades; rounded-full -> normal ring).
(2) Header create "+" (icon Plus) -- ALREADY has aria-label="Create community" title. before: "p-2 rounded-full bg-ig-gradient text-white" -> append " transition-all active:scale-95 ...ring" (icon tier; static gradient no hover, transition-all zero-cost per Slice18).
(3) Tabs discover/joined (.map'd raw button; template-literal className with transition-all ALREADY present) -- static base "flex-1 py-2 rounded-xl text-xs font-medium transition-all" -> append " active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" + add aria-pressed={tab === t} (segmented tier [0.97]; selection conveyed only by bg-ig-gradient vs bg-muted/40; transition-all already there).
(4) DegradedDataBanner Retry pill (rightSlot raw button) -- before: "shrink-0 rounded-full bg-foreground px-3 py-1 text-[11px] font-bold text-background disabled:opacity-50" -> append " transition-all active:scale-[0.97] ...ring" (chip tier; visible "Retry"/"Refreshing..." text = name; rounded-full normal ring; disabled preserved).
(5) Card Join/Leave (wide w-full; template-literal className with transition-all ALREADY; onClick has e.stopPropagation() then joinMutation.mutate) -- static base "w-full mt-3 py-2 rounded-xl text-xs font-semibold transition-all" -> append " active:scale-[0.98] ...ring" (wide tier; transition-all already; visible Join/Leave text; inside card p-4 (16px) NOT overflow-hidden -> NO ring-inset; MUST NOT touch the stopPropagation onClick).
(6) Create-sheet privacy toggle public/private (.map'd raw button; NO transition currently) -- before: "flex-1 py-2.5 rounded-xl text-xs font-medium" -> append " transition-all active:scale-[0.97] ...ring" + add aria-pressed={newCommunity.privacy === p} (segmented tier; ADD transition-all since none present; visible "Public"/"Private" text).
(7) Create-sheet "Create Community" submit (wide w-full; NO transition) -- before: "w-full py-3.5 rounded-2xl bg-ig-gradient text-white font-bold text-sm disabled:opacity-50" -> append " transition-all active:scale-[0.98] ...ring" (wide tier; ADD transition-all; disabled preserved).

LEAVE: search input + name input + desc textarea (all have focus:ring-primary/20).
FLAG (out of scope, logic/structural): community card is motion.div with onClick navigate but NO tabIndex/role/onKeyDown -> keyboard users can't open a community (inner Join button IS reachable). Real fix: role="button"+tabIndex+onKeyDown or <Link>. Same flag-not-fix precedent as BadgesPage.

QUESTIONS:
(1) Tabs (3) + privacy (6): is aria-pressed the right ARIA (matching the AchievementsPage/ChallengesPage segmented precedent), or should discover/joined be role="tablist"/role="tab"? I lean aria-pressed (repo convention; privacy pair is clearly a toggle; keep both consistent).
(2) Tiers right? tabs/privacy/Retry [0.97], card Join/Leave + Create submit [0.98], icons 95.
(3) Card Join/Leave (5): confirm NO ring-inset (card is rounded-2xl border, NO overflow-hidden, button sits inside p-4).
(4) Retry pill (4): confirm in scope (raw <button> in THIS file's JSX via rightSlot).
(5) Card keyboard-inaccessibility: confirm FLAG-only.
(6) Responsive 375/768/1280: px-4 single column; header back+flex-1 title+create; tabs flex gap-1 (2 equal flex-1); search full-width; cards 48px avatar + gap-3 + flex-1 min-w-0 + 3-stat row flex gap-3 text-[10px] (members/posts/category); create sheet max-w-md rounded-t-3xl. Any crush/overflow at 375px, esp the 3-stat row?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/CommunitiesPage.tsx

---

## Plan

7 raw `<button>` controls need interaction tokens. All are correct per my audit — no corrections needed. The diff is 7 className extensions + 2 `aria-pressed` inserts, all display-only.

## Proposed diff

**File:** `src/pages/CommunitiesPage.tsx`

```diff
--- a/src/pages/CommunitiesPage.tsx
+++ b/src/pages/CommunitiesPage.tsx
@@ -62,7 +62,7 @@ export default function CommunitiesPage() {
       <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-xl border-b border-border/30">
         <div className="flex items-center gap-3 px-4 py-3">
           <button type="button" aria-label="Go back" title="Go back" onClick={() => navigate(-1)}
-            className="p-2 -ml-2 rounded-full hover:bg-muted/50">
+            className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <ArrowLeft className="h-5 w-5" />
           </button>
           <h1 className="text-lg font-bold flex-1">Communities</h1>
@@ -70,7 +70,7 @@ export default function CommunitiesPage() {
             <button type="button" aria-label="Create community" title="Create community"
               onClick={() => setShowCreate(true)}
-              className="p-2 rounded-full bg-ig-gradient text-white">
+              className="p-2 rounded-full bg-ig-gradient text-white transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
               <Plus className="h-4 w-4" />
             </button>
           )}
@@ -82,7 +82,7 @@ export default function CommunitiesPage() {
               key={t}
               onClick={() => setTab(t)}
               className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                 tab === t ? "bg-ig-gradient text-white" : "bg-muted/40 text-muted-foreground"
-              }`}
+              } active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
+              aria-pressed={tab === t}
             >
               {t === "discover" ? "Discover" : "My Communities"}
             </button>
@@ -113,7 +113,7 @@ export default function CommunitiesPage() {
                 disabled={isFetching}
                 className="shrink-0 rounded-full bg-foreground px-3 py-1 text-[11px] font-bold text-background disabled:opacity-50"
+                className="shrink-0 rounded-full bg-foreground px-3 py-1 text-[11px] font-bold text-background disabled:opacity-50 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               >
                 {isFetching ? "Refreshing..." : "Retry"}
               </button>
@@ -172,7 +172,7 @@ export default function CommunitiesPage() {
                   <button type="button"
                     onClick={(e) => { e.stopPropagation(); joinMutation.mutate(community.id); }}
                     disabled={joinMutation.isPending}
-                    className={`w-full mt-3 py-2 rounded-xl text-xs font-semibold transition-all ${
+                    className={`w-full mt-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                       isMember
                         ? "bg-muted text-foreground"
                         : "bg-ig-gradient text-white"
@@ -219,7 +219,7 @@ export default function CommunitiesPage() {
                   <button type="button"
                     key={p}
                     onClick={() => setNewCommunity({ ...newCommunity, privacy: p })}
-                    className={`flex-1 py-2.5 rounded-xl text-xs font-medium ${
+                    className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                       newCommunity.privacy === p
                         ? "bg-ig-gradient text-white"
                         : "bg-muted/40 text-muted-foreground"
                     }`}
+                    aria-pressed={newCommunity.privacy === p}
                   >
                     {p === "public" ? "🌍 Public" : "🔒 Private"}
                   </button>
@@ -228,7 +228,7 @@ export default function CommunitiesPage() {
                 <button type="button"
                   onClick={() => createMutation.mutate()}
                   disabled={!newCommunity.name || createMutation.isPending}
-                  className="w-full py-3.5 rounded-2xl bg-ig-gradient text-white font-bold text-sm disabled:opacity-50"
+                  className="w-full py-3.5 rounded-2xl bg-ig-gradient text-white font-bold text-sm disabled:opacity-50 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                 >
                   {createMutation.isPending ? "Creating..." : "Create Community"}
                 </button>
```

## Answers to your questions

1. **`aria-pressed` is correct** for both tabs and privacy toggle. The repo convention (AchievementsPage/ChallengesPage/CoinTransfersPage) uses `aria-pressed` for segmented buttons where selection is conveyed only by background color. These are toggle-buttons, not tablist/tab (no `aria-controls`/`role="tabpanel"`). Keep both consistent.

2. **Tiers are correct:**
   - Tabs/privacy/Retry → `[0.97]` (segmented/chip tier)
   - Card Join/Leave + Create submit → `[0.98]` (wide tier)
   - Icons (back, create "+") → `scale-95` (icon tier)

3. **No `ring-inset` on card Join/Leave (5).** Confirmed: the card is `rounded-2xl border border-border/30 p-4` — no `overflow-hidden`. The button sits inside `p-4` (16px padding), so a normal outward ring (~4px) has ~12px clearance from the card edge. Clean.

4. **Retry pill (4) is in scope.** It's a raw `<button>` rendered in this file's JSX via `DegradedDataBanner`'s `rightSlot` prop. Same pattern as every other raw button.

5. **Card keyboard-inaccessibility: FLAG-only.** The `motion.div` with `onClick={() => navigate(...)}` but no `tabIndex`/`role`/`onKeyDown` is a known pattern across the repo (same as BadgesPage). Out of scope for a className-only pass.

6. **Responsive at 375px — all clean:**
   - Header: back (36px) + `flex-1` title + create (36px) → ~96px fixed, ~247px for title in 343px content
   - Tabs: 2× `flex-1` with `gap-1` → ~171px each, comfortable
   - Search: full-width with `pl-10 pr-4` → fits
   - Cards: 48px avatar + `gap-3` + `flex-1 min-w-0` text + 3-stat row `flex gap-3 text-[10px]` — widest stat "members" ~50px, "posts" ~40px, category ~60px → ~150px total, fits in ~230px remaining
   - Create sheet: `max-w-md` (448px) at 375px → full-width `px-5` with `rounded-t-3xl`, privacy pair `flex gap-2` → ~167px each, comfortable

## Owner must verify

1. Run `npm run update` — must pass (type-check + worker + build)
2. Preview at `/communities` on localhost (375/768/1280) to confirm all 7 controls render with press-scale + focus ring
3. The card keyboard-inaccessibility flag: `motion.div` with `onClick={navigate}` but no `tabIndex`/`role`/`onKeyDown` — keyboard users can't open a community. Real fix: add `role="button"` + `tabIndex={0}` + `onKeyDown={(e) => e.key === 'Enter' && navigate(...)}`. Out of scope for this pass.
