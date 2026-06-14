# DeepSeek run — 2026-06-14T02:28:00.492Z

- model: deepseek-chat
- task: SLICE 36 — FanBadgesPage
======================================================================

ROLE: You are a senior front-end reviewer. I am applying a className-ONLY interaction-token + a11y polish pass to a customer-facing React (Vite + Tailwind v4 + shadcn/ui + framer-motion) page. Decide the EXACT className/attribute changes for each interactive control. Be surgical.

HARD RULE (scope): className changes + tiny DISPLAY-ONLY attributes only (aria-label / aria-pressed / aria-expanded). NO logic, NO handlers, NO tabIndex/role/onKeyDown, NO state, NO routing, NO supabase, NO new framer props (do NOT add/remove whileTap). If a control is keyboard-inaccessible or has a no-op handler, FLAG it for the owner (do not fix).

TOKEN RULES (house style, parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button>/<a>/<Link> (NOT shadcn) get the full set: active:scale-[X] + transition-(all|transform) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Tier scales: wide/card [0.98]; chips/small/segmented-pill-tabs [0.97]; icon-only scale-95; full-width/menu-rows/wide-rows [0.99].
- transition-all when the control ALSO has hover:bg-*/hover:text-*/hover:opacity (color/opacity fade) or underline; transition-transform for PURE icon/press-scale with NO hover color. If transition-all already present, just append (DON'T-CHURN). If a raw control has transition-colors AND a hover color AND we are adding active:scale, FLIP transition-colors -> transition-all. If a raw control has an EXISTING valid active treatment (active:scale OR active:opacity), KEEP it.
- framer-motion: a motion.button WITH whileTap -> CSS active:scale is DEAD (framer inline transform overrides it) -> add focus RING ONLY, do NOT add active:scale, KEEP whileTap. If such a motion.button has transition-colors + hover color, KEEP transition-colors (do NOT flip to transition-all — transition:transform would fight whileTap's inline transform -> jitter; NotificationsPage/PlacesPage/ProfileViewsPage/ForumsPage motion.button-row precedent). An existing active:OPACITY on a whileTap motion.button is fine to KEEP (opacity != transform, no conflict with whileTap).
- shadcn <Button>/<Input>/<Textarea> already ship tokens -> DO NOT add tokens.
- ring-inset KEY CSS FACT: overflow-hidden clips an element's DESCENDANTS, NOT its OWN box-shadow/ring. A control that is ITSELF overflow-hidden does NOT clip its OWN outward focus ring. ring-inset is only needed when the focusable control sits FLUSH/a few px INSIDE a SEPARATE overflow-hidden rounded ancestor. overflow-x-auto scroll rows -> OUTWARD ring (box-shadow ring is not clipped for scrollable overflow; TrendingTopicsPage/CollabsPage precedent).
- Controls with visible text get their accessible name from text (no aria-label); icon-only / emoji-only / visual-only controls need aria-label. aria-pressed ONLY for toggle/segmented/filter-chip controls whose pressed-state is conveyed ONLY by background — VALID even when each chip shows a DIFFERENT constant label, because per chip the label WORD does NOT flip on selection (AMAPage/CollabsPage/PollHistoryPage chip/tab precedent). aria-expanded only for inline disclosure (accordion) — NOT for navigation/modal.

PAGE: src/pages/FanBadgesPage.tsx (250 lines, reached via in-app nav, SwipeBackContainer, useAuth). "Fan Badges" = badges you've earned by supporting creators (read-only). Backed by fan_badges (key ["fan-badges", user?.id], .eq fan_id .order earned_at desc, enabled !!user?.id) + a creators lookup from profiles (key ["fan-badges-creators", creatorIds.join(",")], .in user_id creatorIds, enabled creatorIds.length>0). activeType useState ("All" default); creatorIds/creatorMap/types/filtered useMemo. Layout: sticky header (shadcn Back + Award badge + "Fan Badges" title), gradient hero stat card (motion.div NO onClick: "{N} badges from {M} creators"), a horizontal filter-chip row (only when types.length>1), loading skeleton grid + empty-state (with a shadcn "Discover creators" Button) + no-match state, then a 2-col grid of badge cards (each a motion.button -> creator profile). Footer hint <p>.

SKIP (confirm): Back shadcn <Button aria-label="Back" variant="ghost" size="icon"> L119 (ships tokens, labeled); hero stat motion.div L132 (no onClick, presentational); skeleton grid divs L165; the empty-state "Discover creators" shadcn <Button onClick={navigate("/feed")}> L181 (shadcn -> ships tokens, visible text -> no aria-label, no token add); no-match <p> L191; footer hint <p> L243; all Avatar/Sparkles/Clock/Award/ChevronRight icons + span/p text + the decorative badge-emoji/avatar-chip/bottom-strip divs inside each card.

TWO controls + ONE light flag:

(A) Filter type chips, L149-159 — RAW <button type="button"> in types.map, onClick={() => setActiveType(t)}. className via cn(): base "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize" + conditional (activeType===t ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted"). Visible text = {t.replace(/_/g, " ")} (the badge-type name; "All" + each distinct type). Row = `flex gap-2 overflow-x-auto scrollbar-hide` inside `max-w-2xl mx-auto px-4` (NOT overflow-hidden; horizontally scrollable). transition-all ALREADY present; inactive has hover:bg-muted; selection conveyed ONLY by background.
Q-A: append `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the cn() BASE string + add attr `aria-pressed={activeType === t}` (chip tier [0.97]; transition-all already -> append-only DON'T-CHURN; aria-pressed valid — selection bg-only, per-chip label WORD constant [CollabsPage/PollHistoryPage/AMAPage chip precedent]; visible text -> NO aria-label; OUTWARD ring — overflow-x-auto scroll row, box-shadow ring not clipped [TrendingTopicsPage/CollabsPage precedent], no ring-inset). Confirm [0.97], aria-pressed YES, append-not-flip, OUTWARD ring.

(B) Badge cards, L200-236 — motion.button type="button", entrance anim (initial/animate/transition delay idx*0.04), ALREADY whileTap={{ scale: 0.97 }}, onClick={() => creator && navigate(`/user/${creator.user_id}`)}, className = "relative aspect-square rounded-2xl bg-card border border-border overflow-hidden text-left active:opacity-90", ALREADY aria-label={`${b.badge_name ?? b.badge_type} badge from ${creator?.full_name ?? "creator"}`}. Visual-only content (big badge emoji circle + creator-avatar chip + bottom label strip). The card is ITSELF overflow-hidden; the grid is `grid grid-cols-2 gap-3` (NOT overflow-hidden). motion.button WITH whileTap + existing active:opacity-90, NO transition, NO ring.
Q-B: append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ONLY (motion.button + whileTap -> RING ONLY, NO active:scale [dead under framer's inline transform]; KEEP whileTap; KEEP the existing active:opacity-90 [valid existing active treatment; opacity != transform so no conflict with whileTap — do NOT remove, do NOT convert to scale]; do NOT add any transition [ring is a box-shadow, needs no ease; the existing active:opacity-90 snapping is the pre-existing design choice — adding transition-opacity would be churn beyond this pass]; KEEP the existing aria-label [emoji/visual card needs it; do NOT remove]; OUTWARD ring — the card is itself overflow-hidden but per the KEY CSS FACT that clips DESCENDANTS not its OWN box-shadow, and the grid parent is not overflow-hidden, so the outward ring is NOT clipped -> no ring-inset). Confirm ring-ONLY, keep whileTap + active:opacity-90 + aria-label, NO transition added, OUTWARD-not-inset (resolve the "button is itself overflow-hidden" ring question explicitly).

(LIGHT FLAG, do not fix) The badge-card onClick is `() => creator && navigate('/user/' + creator.user_id)`: if the creator's profile row is missing from creatorMap (deleted creator, or the profiles lookup returns no row for that creator_id), clicking the card is a no-op (the card stays focusable + labeled but nothing happens). This is mostly a transient loading state (creators load shortly after badges) but can be permanent for a deleted creator. LOGIC (handler guard), OUT of my className+display-only scope. Confirm this is a correct LIGHT-FLAG-not-fix for the owner.

============================================================
DELIVERABLE: For each control (A)(B) give the EXACT final className string + any attrs. Resolve A ([0.97], aria-pressed YES, append-not-flip, outward ring) and B (ring-only, keep whileTap + active:opacity-90 + aria-label, NO transition add, outward-not-inset for a self-overflow-hidden button) explicitly. Confirm the SKIP list + the no-op-onClick LIGHT FLAG. Keep it tight.
- files: src/pages/FanBadgesPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

# SLICE 36 — FanBadgesPage: Plan & Diff

## Plan

Two controls on `src/pages/FanBadgesPage.tsx`:

**(A) Filter type chips** (L149-159) — RAW `<button>` in a horizontal scroll row. Already has `transition-all` + hover color. Add: `active:scale-[0.97]` (chip tier), focus ring, `aria-pressed`.

**(B) Badge cards** (L200-236) — `motion.button` with `whileTap={{ scale: 0.97 }}` + existing `active:opacity-90`. Ring-ONLY (no `active:scale` — dead under framer inline transform). Keep `whileTap`, keep `active:opacity-90`, keep existing `aria-label`. No `transition` added.

**Skip list confirmed:** shadcn Back button, hero `motion.div`, skeleton divs, empty-state shadcn "Discover creators" Button, no-match `<p>`, footer `<p>`, all icons/avatars/spans.

**Light flag:** badge-card `onClick` is a no-op when `creator` is missing from `creatorMap` (deleted creator or loading race). Logic — out of scope.

---

## Diff

```diff
--- a/src/pages/FanBadgesPage.tsx
+++ b/src/pages/FanBadgesPage.tsx
@@ -146,7 +146,8 @@ export default function FanBadgesPage() {
               <button
                 key={t}
                 type="button"
                 onClick={() => setActiveType(t)}
+                aria-pressed={activeType === t}
                 className={cn(
-                  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize",
+                  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                   activeType === t ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
                 )}
               >
@@ -200,7 +201,7 @@ export default function FanBadgesPage() {
                   whileTap={{ scale: 0.97 }}
                   onClick={() => creator && navigate(`/user/${creator.user_id}`)}
-                  className="relative aspect-square rounded-2xl bg-card border border-border overflow-hidden text-left active:opacity-90"
+                  className="relative aspect-square rounded-2xl bg-card border border-border overflow-hidden text-left active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                   aria-label={`${b.badge_name ?? b.badge_type} badge from ${creator?.full_name ?? "creator"}`}
                 >
```

---

## Verification

- **`npm run update`** must pass (type-check + worker type-check + production build).
- **Preview** at `/fan-badges` (auth-gated — sign in as a user who has earned fan badges). Verify:
  - Filter chips: press-scale on click, focus ring on Tab, `aria-pressed` toggles correctly.
  - Badge cards: focus ring on Tab, existing `whileTap` scale + `active:opacity-90` still work, existing `aria-label` intact.
  - No regression on empty state, loading skeletons, or the "Discover creators" shadcn Button.

## Owner flags

1. **Badge-card no-op when creator missing** — `onClick={() => creator && navigate(...)}` silently does nothing if the creator's profile row is absent from `creatorMap` (deleted creator or loading race). Consider showing a fallback or disabling the card.
2. **Sub-44px tap targets** — filter chips `py-1.5` (~24px tall) are below the 44px WCAG touch target minimum. Established repo pattern, not a per-page fix.
