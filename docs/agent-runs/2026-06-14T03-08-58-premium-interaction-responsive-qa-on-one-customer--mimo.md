# MiMo run — 2026-06-14T03:08:58.994Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + responsive QA on ONE customer-facing page: src/pages/RecentlyViewedPage.tsx (186 lines, "Recently viewed travel items — hotels/flights/activities/cars", backed by user_recently_viewed). Reads views (key ["user-recently-viewed", user?.id]; select id,user_id,item_type,item_id,item_data,viewed_at; eq user_id; order viewed_at desc; limit 120). tab useState ("all"|ItemType). counts/filtered useMemo. remove(id) = OPTIMISTIC qc.setQueryData (filter row out) -> supabase.from("user_recently_viewed").delete().eq("id",id) -> onError toast.error + invalidateQueries. formatRelative + TYPE_META pure helpers. Layout: SwipeBackContainer + SEOHead(noIndex); sticky header (shadcn back <Button> + History badge + "Recently Viewed" title); gradient hero stat motion.div (NO onClick); a horizontal overflow-x-auto filter-chip row (tabs.map: All/Hotels/Flights/Activity/Cars, each WORD + count badge); loading skeletons + empty-state card; a vertical list of view ROWS (each a presentational motion.div — image/icon tile + type badge + name + relative-time, NO row onClick — with a trailing Remove icon-button). NO bottom nav (SwipeBackContainer page).

Reference standard for tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): exactly 2 RAW <button type="button"> (the filter tab in tabs.map L131 + the Remove icon-button L175) + 1 shadcn <Button> (back L104); 0 motion.button; the view ROWS are motion.DIV (presentational, NO onClick).
- shadcn back <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={navigate(-1)}> (L104) => SKIP (ships tokens, labeled).
- (A) Filter tab (L131, RAW <button> inside tabs.map): onClick={() => setTab(t.id)}, cn() base "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5" + conditional tab===t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted"; visible child = <span>{t.label}</span> (constant WORD per tab) + <span>{t.count}</span> count badge. HAS transition-all; NO active:scale; NO ring; NO aria-pressed. Row = flex gap-2 overflow-x-auto scrollbar-hide.
- (B) Remove icon-button (L175, RAW <button>): ALREADY aria-label="Remove", onClick={() => remove(v.id)}, child = decorative X icon, className "h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-colors". HAS transition-colors + hover:bg; NO active:scale; NO ring. Trailing child of row motion.div (L158, flex items-center gap-3 p-3 rounded-2xl bg-card border, NOT overflow-hidden).
- Hero stat motion.div (L117, entrance anim, NO onClick) => presentational. View-row motion.div (L158, entrance anim, NO onClick) => presentational. Loading-skeleton divs (L138) + empty-state card (L141) non-interactive. History/Sparkles/Plane/Building2/Car/Activity/ArrowRight/Clock/X icons decorative; type badge span + name/time <p> display children; item <img> display.

TOKEN TIERS (this repo): wide/primary/cards active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. DON'T-CHURN: if a raw button ALREADY has transition, do NOT re-flip a valid existing transition unless a NEW transform (active:scale) needs coverage not already provided. aria-pressed for toggles/segmented/filter-chips whose state is conveyed ONLY by color/bg (a constant label WORD per button STILL qualifies; a varying count badge does NOT disqualify) — NOT for one-shot nav/action. ring-inset ONLY when flush (zero clearance) inside an overflow-hidden rounded PARENT; OUTWARD is default; overflow-x-auto scroll does NOT clip box-shadow rings (OUTWARD).

HARD RULE: className + display-only attr (aria-*) ONLY. Do NOT change any onClick / setTab / remove / qc.setQueryData / delete / eq / invalidateQueries / useQuery / useMemo (counts/filtered) / useState (tab) / formatRelative / TYPE_META / the conditional render guards / any logic.

MY PLAN -- validate or correct each (before->after; cite classNames):

(A) Filter tab (L131; RAW button in tabs.map; HAS transition-all, NO scale/ring/aria-pressed): ADD aria-pressed={tab === t.id} (after onClick) + APPEND active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring to the cn() BASE string; KEEP transition-all (append-not-flip — it already eases the inactive hover:bg-muted color alongside the new scale). before base: "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5" -> after base: "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring inline-flex items-center gap-1.5". chip/segmented tier => [0.97]. aria-pressed VALID (selection conveyed ONLY by bg: active = gradient+white, inactive = secondary; the WORD per tab is constant, varying count badge does NOT disqualify). visible text => NO aria-label. OUTWARD ring (overflow-x-auto row, box-shadow not clipped). OK?

(B) Remove icon-button (L175; RAW; ALREADY aria-label="Remove"; HAS transition-colors + hover:bg, NO scale/ring): FLIP transition-colors->transition-all + APPEND active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring; KEEP aria-label="Remove"; NO aria-pressed (one-shot optimistic delete, not a toggle). before: "h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-colors" -> after: "h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring". FLIP required: existing transition-colors eases hover:text/hover:bg but NOT the new active:scale transform; transition-all (superset) eases both. icon-only tier => 95. OUTWARD ring (trailing child of row, p-3 clearance, parent NOT overflow-hidden). OK?

QUESTIONS:
(1) Filter tab (A): aria-pressed + [0.97] + ring, KEEP transition-all (append-not-flip), OUTWARD ring on overflow-x-auto row — same as FanBadgesPage/CollabsPage filter chips. AGREE? Confirm aria-pressed valid despite the varying count badge.
(2) Remove (B): FLIP transition-colors->transition-all + active:scale-95 + ring, KEEP aria-label="Remove", NO aria-pressed, OUTWARD ring. AGREE? Confirm FLIP is required (new transform not covered by transition-colors) and [95] icon-only tier is right.
(3) Inventory exhaustive (exactly 2 RAW buttons + 1 shadcn Button, 0 motion.button)? back L104 SKIP? Hero motion.div L117 + view-row motion.div L158 (both NO onClick) correctly presentational/leave?
(4) Responsive 375/768/1280: header (back + History + title); hero (text-3xl "N viewed"); overflow-x-auto chip row (5 chips WORD+count); view row (image tile 48px + flex-1 min-w-0 badge/name line-clamp-1/time + trailing Remove 32px). Any crush @375? sub-44px tap targets to FLAG (chips py-1.5 ~24px; Remove h-8 w-8 32px; back h-10 w-10 40px)?
(5) A11y / logic notes: view rows have NO onClick to re-open the viewed item (only Remove works) AND hero copy says "long-press to remove" but no long-press handler exists — both LOGIC/owner flags out of className+display-only scope, correct to FLAG not fix? Anything else?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/RecentlyViewedPage.tsx

---

## Plan — validated, zero corrections

Both edits are correct as-is. Here's the confirmation per question and the ready-to-apply diff.

---

### (1) Filter tab (A) — CONFIRMED

`aria-pressed={tab === t.id}` is valid: selection conveyed ONLY by bg (gradient+white vs secondary), label WORD constant per tab ("All"/"Hotels"/…), varying `{t.count}` badge does NOT disqualify (CreatorPayoutsPage/FanBadgesPage/CollabsPage/EmojiPacksPage precedent). `[0.97]` chip tier. `transition-all` already present → append-only (don't-churn). OUTWARD ring (`overflow-x-auto` doesn't clip box-shadow). No `aria-label` (rich text). All correct.

### (2) Remove (B) — CONFIRMED

FLIP `transition-colors`→`transition-all` is required: `transition-colors` does NOT cover the `transform` property that `active:scale-95` targets. `transition-all` (superset) eases the existing `hover:text-foreground` + `hover:bg-secondary` color fades AND the new press-scale. Icon-only tier `95` (sole child is decorative `X` `h-3.5 w-3.5`). KEEP `aria-label="Remove"`. NO `aria-pressed` (one-shot optimistic delete). OUTWARD ring (`p-3` clearance, parent NOT `overflow-hidden`). All correct.

### (3) Inventory — CONFIRMED exhaustive

Exactly 2 RAW `<button>` (filter tab L131, Remove L175) + 1 shadcn `<Button>` (back L104) + 0 `motion.button`. Hero `motion.div` L117 + view-row `motion.div` L158 both presentational (NO `onClick`). Back SKIP. All correct.

### (4) Responsive — CLEAN, two owner flags

No crush at 375px. `flex-1 min-w-0` + `line-clamp-1` handle overflow on the middle column (~239px). **Owner flags (sub-44px tap targets, repo-wide pattern):** filter chips `py-1.5` ~24px, Remove `h-8 w-8` ~32px.

### (5) A11y/logic owner flags — CONFIRMED

Both are LOGIC/out-of-scope: (i) view rows have no `onClick` to revisit the viewed item (only Remove works), (ii) hero copy says "long-press to remove" but no long-press handler exists (Remove is a simple click X button). Both correctly FLAGGED to owner, not fixed.

---

## Diff

**File:** `src/pages/RecentlyViewedPage.tsx`
**Stats:** 2 lines changed, 0 net (2 ins / 2 del)

```diff
--- a/src/pages/RecentlyViewedPage.tsx
+++ b/src/pages/RecentlyViewedPage.tsx
@@ -128,7 +128,7 @@
         <div className="flex gap-2 overflow-x-auto scrollbar-hide">
           {tabs.map((t) => (
-            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={cn("shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5", tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>
+            <button key={t.id} type="button" onClick={() => setTab(t.id)} aria-pressed={tab === t.id} className={cn("shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring inline-flex items-center gap-1.5", tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>
               <span>{t.label}</span>
@@ -172,5 +172,5 @@
                   </div>
-                  <button type="button" aria-label="Remove" onClick={() => remove(v.id)} className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-colors">
+                  <button type="button" aria-label="Remove" onClick={() => remove(v.id)} className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                     <X className="h-3.5 w-3.5" />
```

**Guard-clean:** every `onClick`/`setTab`/`remove`/`qc.setQueryData`/`delete`/`eq`/`invalidateQueries`/`useQuery`/`useMemo`/`useState`/`formatRelative`/`TYPE_META`/conditional renders/`navigate(-1)` left byte-identical. Only 2 className strings + 1 display-only `aria-pressed` attr changed.

---

## Owner verification

1. **Run:** `npm run update` — must pass (0 type errors + build).
2. **Preview at 375/768/1280:** chip row scrolls, Remove buttons scale on press, focus-visible rings appear on Tab.
3. **Owner flags to track:**
   - Sub-44px tap targets (chips ~24px, Remove ~32px) — repo-wide, not per-page.
   - View rows are read-only (no revisit navigation) — potential UX gap.
   - Hero copy "long-press to remove" is misleading (no long-press handler) — copy fix needed.
