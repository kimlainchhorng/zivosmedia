# DeepSeek run — 2026-06-14T03:08:07.568Z

- model: deepseek-chat
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

## Plan

Two edits, both className + display-only ARIA, zero logic changes:

### (A) Filter tab (L131) — RAW `<button>` in `tabs.map`
- **Add** `aria-pressed={tab === t.id}` after `onClick`
- **Append** `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the `cn()` base string
- **Keep** existing `transition-all` (append-not-flip)

### (B) Remove icon-button (L175) — RAW `<button>` in view row
- **Flip** `transition-colors` → `transition-all`
- **Append** `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Keep** existing `aria-label="Remove"`, no `aria-pressed`

---

## Diff

**File:** `src/pages/RecentlyViewedPage.tsx`

```diff
--- a/src/pages/RecentlyViewedPage.tsx
+++ b/src/pages/RecentlyViewedPage.tsx
@@ -128,7 +128,7 @@ export default function RecentlyViewedPage() {
         <div className="flex gap-2 overflow-x-auto scrollbar-hide">
           {tabs.map((t) => (
             <button key={t.id} type="button" onClick={() => setTab(t.id)}
-              className={cn("shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5",
+              className={cn("shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring inline-flex items-center gap-1.5",
                 tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}
               aria-pressed={tab === t.id}
             >
@@ -172,7 +172,7 @@ export default function RecentlyViewedPage() {
                   <button type="button" aria-label="Remove" onClick={() => remove(v.id)}
-                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-colors"
+                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                   >
                     <X className="h-3.5 w-3.5" />
                   </button>
```

---

## Answers to your questions

**(1) Filter tab (A):** ✅ **Agree.** `aria-pressed` is valid — each tab's label WORD is constant ("All"/"Hotels"/"Flights"/"Activity"/"Cars"), selection is conveyed only by background color. The varying `{t.count}` badge does NOT disqualify (same as FanBadgesPage/CollabsPage). `[0.97]` chip tier, append-not-flip on `transition-all`, outward ring (overflow-x-auto doesn't clip box-shadow). Matches precedent exactly.

**(2) Remove (B):** ✅ **Agree.** FLIP `transition-colors`→`transition-all` is required — the existing `transition-colors` eases `hover:text-foreground` + `hover:bg-secondary` but does NOT cover the new `active:scale-95` transform. `transition-all` is the superset that eases both. `[95]` icon-only tier is correct (32px circle with a single decorative X icon, no text). Outward ring (trailing child of row with `p-3` clearance, parent NOT `overflow-hidden`). No `aria-pressed` (one-shot destructive action, not a toggle).

**(3) Inventory:** ✅ **Correct.** Exactly 2 RAW `<button>` controls (filter tab + remove icon-button) + 1 shadcn `<Button>` (back L104 — skip, ships tokens). 0 `motion.button`. Hero `motion.div` (L117, no onClick) + view-row `motion.div` (L158, no onClick) both correctly left as presentational.

**(4) Responsive @375:** ✅ **Clean.** Header: back `h-10 w-10` (40px) + History badge + title fits. Hero: `text-3xl "{N} viewed"` fits. Chip row: 5 chips scroll horizontally via `overflow-x-auto`, each `px-3.5 py-1.5` with WORD + count badge — no crush. View row: image tile `w-12 h-12` (48px) + `flex-1 min-w-0` column (badge + `line-clamp-1` name + time) + trailing Remove `h-8 w-8` (32px) — middle column gets ~239px at 375px, comfortable. **Sub-44px flags (established repo compact pattern, not a per-page fix):** chips `py-1.5` ~24px tall, Remove `h-8 w-8` ~32px, back `h-10 w-10` ~40px.

**(5) A11y/logic flags:** ✅ **Correct to FLAG not fix.** Two owner notes:
- View rows have NO `onClick` to re-open the viewed item — only the Remove button works. This is a deliberate read-only list design, but the owner may want navigation.
- Hero copy says "long-press to remove" but no long-press handler exists — the Remove is a single-tap icon button. Copy mismatch is a content/UX concern, out of scope.

---

## Verify

Run `npm run update` before marking done.
