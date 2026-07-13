# MiMo run — 2026-06-14T07:38:22.367Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + a11y QA on ONE customer-facing page: src/pages/TravelerDashboard.tsx (350 lines, "Premium 2026-era traveler profile with glassmorphism"; auth-guarded — redirects to /login if !user; uses useSavedSearches + useBookingHistory hooks; mostly presentational mock data for achievements/bucketList/journal/packingChecklist). Embeds AIConciergeTrigger, MobileBottomNav, TripTimeline (own internals, SKIP).

Reference standard: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

RAW interactive controls EDITED:
(1) L130 Bucket List disclosure raw <button> — onClick toggles setShowBucketList(!showBucketList); visible text "Bucket List" + a ChevronRight CHILD that owns its OWN `transition-transform` + `showBucketList && "rotate-90"`. The BUTTON itself had NO transition/scale/focus/aria. className was "w-full flex items-center gap-2 text-lg font-bold mb-3". It is a disclosure toggle that REMAINS in the DOM right next to the region it reveals.
(2) L156 Smart Packing List disclosure raw <button> — same pattern, onClick setShowPackingHelper(!showPackingHelper), "Smart Packing List" + rotating ChevronRight child, same className, same remains-in-DOM disclosure.

SHADCN (SKIP): Button L243 toggleAlert (already aria-label), L250 deleteSearch (already aria-label), L280 "Search Flights" asChild Link, L328 Quick Actions Buttons asChild Link; Card/Badge styling. COMPONENTS (own internals, SKIP): AIConciergeTrigger, MobileBottomNav, TripTimeline. Cards with hover:border but NO onClick = presentational, SKIP. Star/Heart/Package/ChevronRight icons decorative.

TOKEN TIERS: wide/primary/cards/full-width active:scale-[0.98]; links/chips/pills active:scale-[0.97]; icon-only active:scale-95; bare full-width row active:scale-[0.99]. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. Transition rule: transition-transform when scale is the SOLE animated property on the element (no hover on it, OR hover/anim lives on a CHILD with its own transition); transition-all when a hover bg/color/border animates alongside the scale ON THE SAME element. FLIP RULE: ADDING a NEW CSS scale to a transition-colors/no-transition control that ALSO has hover color/bg/border ON ITSELF -> FLIP. DON'T-CHURN: control ALREADY has press + transition -> ring (+aria) ONLY. aria-expanded for disclosure controls that REMAIN in the DOM next to the revealed region (NOT for triggers that unmount on open). OUTWARD ring-ring default on neutral surfaces. shadcn Button SKIP.

EDITS APPLIED (validate exact):
(A) L130 Bucket List <button> — ADD aria-expanded={showBucketList} + APPEND "transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (full-width bare row tier [0.99]; the BUTTON had NO transition/scale -> add a NEW scale; transition-transform NOT transition-all — scale is the SOLE animated property ON THE BUTTON [the button has NO hover; the ChevronRight rotate lives on the CHILD icon which keeps its OWN transition-transform, independent]; NO flip — no self-hover on the button; aria-expanded warranted — disclosure toggle remains in DOM beside the revealed bucket-list region; OUTWARD ring-ring on neutral surface).
(B) L156 Packing <button> — ADD aria-expanded={showPackingHelper} + APPEND same "transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (identical rationale to A).

QUESTIONS:
(1) aria-expanded on BOTH disclosure toggles correct (they remain in DOM next to the revealed region, no role=tablist/dialog)?
(2) transition-transform (NOT transition-all) correct since the BUTTON has no hover [the rotate-90 is on the child ChevronRight with its own transition-transform]? NO flip correct?
(3) [0.99] bare full-width row tier correct for these full-width section-header toggles? OUTWARD ring-ring?
(4) Inventory exhaustive (2 raw disclosure buttons edited; shadcn toggleAlert/deleteSearch/asChild-Link Buttons SKIP; AIConciergeTrigger/MobileBottomNav/TripTimeline own internals; presentational cards SKIP)?
(5) Owner flags (logic/out of scope, FLAG not fix): (a) showTravelMap useState exists (L31) but NO visible toggle renders it (dead state?); (b) bucketList/journal/packingChecklist/achievements are hardcoded mock data, not fetched; anything else?
(6) Responsive 375/768/1280: section-header toggle rows full-width; packing grid sm:grid-cols-2. Any crush @375? sub-44px tap targets to FLAG (toggle rows are text-lg ~ tall enough; ChevronRight ml-auto)?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/TravelerDashboard.tsx

---

## Validation — TravelerDashboard.tsx (2 raw disclosure buttons)

**Plan:** Validate the two edits already present in the file against the reference standard. No additional edits needed — both are correct as-is. Full inventory confirms no missed controls.

---

### Answers to all 6 questions

**(1) `aria-expanded` on both disclosure toggles — ✅ correct.**
Both buttons **remain in the DOM** beside the revealed region (they are the section headers, not ternary-swap triggers that unmount). No `role=tablist`/`role=dialog` involved. `aria-expanded={showBucketList}` and `aria-expanded={showPackingHelper}` are the correct disclosure pattern, matching the NutritionPage "Add" precedent (where the trigger unmounts → LEAVE; here the trigger PERSISTS → ADD).

**(2) `transition-transform` (not `transition-all`), NO flip — ✅ correct.**
The BUTTON (`className="w-full flex items-center gap-2 text-lg font-bold mb-3 …"`) has **zero hover classes** — no `hover:bg`, no `hover:border`, no `hover:text`. The only animated property on the button element is the `active:scale-[0.99]` transform. The ChevronRight child owns its own `transition-transform` independently. Therefore:
- `transition-transform` is correct (scale is the sole animated property on the button).
- **NO flip** — flip rule requires "hover color/bg/border ON ITSELF." Neither button has any.

**(3) `[0.99]` bare full-width row tier, OUTWARD `ring-ring` — ✅ correct.**
Both are `w-full` bare section-header rows with no surface fill of their own — `[0.99]` is the designated tier. The parent is a neutral `bg-background` page. OUTWARD `ring-ring` is correct (no inset needed — not a gapless grid, not overlapping siblings).

**(4) Inventory exhaustive — ✅ confirmed.**

| Control | Decision | Reason |
|---------|----------|--------|
| L130 Bucket List `<button>` | **EDITED (A)** | Raw disclosure toggle |
| L156 Packing `<button>` | **EDITED (B)** | Raw disclosure toggle |
| `toggleAlert` Button L243 | **SKIP** | shadcn `variant="ghost" size="icon"`, already `aria-label` |
| `deleteSearch` Button L250 | **SKIP** | shadcn, already `aria-label="Delete saved search"` |
| "Search Flights" Button L280 | **SKIP** | shadcn `asChild` Link |
| Quick Actions 4× Button L328 | **SKIP** | shadcn `asChild` Links |
| `AIConciergeTrigger` | **SKIP** | Own component internals |
| `MobileBottomNav` | **SKIP** | Own component internals |
| `TripTimeline` | **SKIP** | Own component internals |
| Achievements/Journal Cards | **SKIP** | `hover:border` presentational, no `onClick` |

No missed raw interactive controls.

**(5) Owner flags — ✅ confirmed, two items:**

**(a) Dead state `showTravelMap`:** `useState(false)` declared at L31, `setShowTravelMap` is **never called**, no JSX conditional consumes it. Likely a stub for a future "Travel Map" section. Can be removed or wired up — owner's call.

**(b) Mock data:** `travelAchievements`, `bucketList`, `travelJournal`, `packingChecklist` are all **hardcoded local constants** — no Supabase query or hook feeds them. Only `useSavedSearches` and `useBookingHistory` are real data hooks. The page is a hybrid: real data in the sidebar (saved searches + booking history), mock data in the main content area (achievements/journal/bucket list/packing/stats). Owner should plan to replace mocks with real Supabase tables or remove the sections if not intended for launch.

**(c) Additional flag (minor):** During `isLoading`, the component renders **nothing** (no loading skeleton) — the auth guard `if (!isLoading && !user)` only triggers after load completes, so there's a brief blank screen flash on first mount. Pre-existing pattern, not introduced here.

**(6) Responsive + sub-44px — ✅ clean layout, one FLAG:**

**Layout at 375:** Both toggles are `w-full flex items-center gap-2` — "Bucket List" (12 chars) and "Smart Packing List" (18 chars) both fit within `px-4` (~343px). The ChevronRight `ml-auto` floats right. Packing grid is `grid sm:grid-cols-2 gap-3` — single column at 375, two-column at 640+. No crush at any breakpoint.

**Sub-44px FLAG:** Both toggle buttons are raw `<button>` with **no explicit height/padding** — only `text-lg font-bold` content (~28px line-height) + a `w-5 h-5` icon. Rendered tappable height is **~28px** — below the 44px guideline. Mitigated by being **full-width** (~343px at 375), but flagged for an owner-wide tap-target sweep. Adding `py-2` would bring them to ~44px. **Not changed here** — consistent with repo-wide flagging pattern.

---

### Diff summary (already applied, validating correctness)

```
 src/pages/TravelerDashboard.tsx | 4 ++--
```

**Edit A (L130 — Bucket List toggle):**
```diff
- <button type="button" onClick={() => setShowBucketList(!showBucketList)} className="w-full flex items-center gap-2 text-lg font-bold mb-3">
+ <button type="button" onClick={() => setShowBucketList(!showBucketList)} aria-expanded={showBucketList} className="w-full flex items-center gap-2 text-lg font-bold mb-3 transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**Edit B (L156 — Packing toggle):**
```diff
- <button type="button" onClick={() => setShowPackingHelper(!showPackingHelper)} className="w-full flex items-center gap-2 text-lg font-bold mb-3">
+ <button type="button" onClick={() => setShowPackingHelper(!showPackingHelper)} aria-expanded={showPackingHelper} className="w-full flex items-center gap-2 text-lg font-bold mb-3 transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**Guard grep over the diff:**
- `−`/`+` className edits: **2** ✅
- `aria-expanded` added: **2** (both disclosure toggles) ✅
- `focus-visible:ring`: **2**, `ring-ring`: **2**, `ring-inset`: **0**, `ring-white/70`: **0** ✅
- `active:scale-[0.99]`: **2** (bare full-width row tier) ✅
- `transition-transform`: **2** (scale-only, child owns its rotate) ✅
- FLIPs: **0** (no self-hover on either button) ✅
- `transition-colors` removed: **0** ✅
- Logic lines touched: **0** ✅

---

### Verdict

**Both edits are correct as-is. No additional changes needed.** The file matches the reference standard (`JobPostingDetailPage`) pattern. Move to **In review** — ready for the owner to commit after verifying the two owner flags (dead `showTravelMap` state; mock data sections). Run `npm run update` as the final gate before commit.
