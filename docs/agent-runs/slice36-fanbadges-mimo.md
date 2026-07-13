# MiMo run — 2026-06-14T02:29:09.531Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## (1) Short Plan

Two controls to touch, both surgical className + attribute appends. No logic, no handler changes, no new framer props.

| Control | Type | Action | Diff impact |
|---------|------|--------|-------------|
| **(A)** Filter chips | RAW `<button>` | Append tokens to cn() base + add `aria-pressed` | 2 ins / 1 del (+1 net) |
| **(B)** Badge cards | `motion.button` + `whileTap` | Append ring-only to className | 1 ins / 1 del (+0 net) |
| **TOTAL** | | | **3 ins / 2 del (+1 net)** |

---

## (2) Proposed Diff — `src/pages/FanBadgesPage.tsx`

### (A) Filter type chips — L149–159

**Before:**
```tsx
              <button
                key={t}
                type="button"
                onClick={() => setActiveType(t)}
                className={cn(
                  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize",
                  activeType === t ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
                )}
              >
```

**After:**
```tsx
              <button
                key={t}
                type="button"
                onClick={() => setActiveType(t)}
                aria-pressed={activeType === t}
                className={cn(
                  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  activeType === t ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
                )}
              >
```

**Rationale (every decision):**
- **`[0.97]` chip tier** — segmented-pill filter chips (text-xs, `px-3.5 py-1.5 rounded-full`, `flex gap-2` row). Same tier as AMAPage/CollabsPage/PollHistoryPage chips.
- **`transition-all` already present → append-only, DON'T-CHURN.** It eases both the inactive `hover:bg-muted` color fade AND the new scale — correct superset, no flip needed.
- **`aria-pressed={activeType === t}`** — VALID: selection is conveyed ONLY by background (active = `bg-ig-gradient text-white shadow-sm`, inactive = `bg-secondary`). Per-chip, the label WORD is constant (`"All"`, each badge-type name — doesn't flip on selection). CollabsPage/PollHistoryPage/AMAPage chip precedent.
- **Visible text (`{t.replace(/_/g, " ")}`) → NO `aria-label`.** The chip's accessible name comes from its text child.
- **OUTWARD ring, no `ring-inset`** — parent row is `flex gap-2 overflow-x-auto scrollbar-hide`; `overflow-x-auto` scroll does NOT clip `box-shadow` rings (TrendingTopicsPage/CollabsPage precedent). The chip's own outward ring is fully visible.

### (B) Badge cards — L200–236

**Before:**
```tsx
                  className="relative aspect-square rounded-2xl bg-card border border-border overflow-hidden text-left active:opacity-90"
```

**After:**
```tsx
                  className="relative aspect-square rounded-2xl bg-card border border-border overflow-hidden text-left active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Rationale (every decision):**
- **Ring-ONLY** — `motion.button` with `whileTap={{ scale: 0.97 }}` → any CSS `active:scale` would be DEAD under framer's inline transform (inline-style precedence beats the stylesheet `:active` rule). NotificationsPage/PlacesPage/ProfileViewsPage/ForumsPage `motion.button`-row precedent.
- **KEEP `whileTap={{ scale: 0.97 }}`** — don't-churn; it already provides tactile press feedback.
- **KEEP existing `active:opacity-90`** — valid existing active treatment. Opacity ≠ transform, so no conflict with `whileTap`'s inline transform. NOT converted to scale; NOT removed.
- **NO transition added** — the focus ring is a `box-shadow` change that appears instantly (the accessible, conventional behavior). The existing `active:opacity-90` snapping is the pre-existing design choice — adding `transition-opacity` or `transition-all` would be churn beyond this pass. The card had no transition before; it needs none now.
- **KEEP existing `aria-label`** — the card's visual content is entirely decorative (big badge emoji circle + creator-avatar chip + bottom label strip); the emoji/visual-only card needs `aria-label` for screen readers. Already present → no attr change.
- **OUTWARD ring, no `ring-inset`** — **KEY CSS FACT resolution:** the card is ITSELF `overflow-hidden`, but `overflow-hidden` clips an element's DESCENDANTS, NOT its OWN `box-shadow`/ring. The button's outward focus ring is a `box-shadow` on the button itself — `overflow-hidden` does NOT clip it. The grid parent (`grid grid-cols-2 gap-3`) is NOT `overflow-hidden`. Therefore the outward ring is fully visible → no `ring-inset` needed.

---

## (3) SKIP List Confirmation

All verified correct — no changes:

| Item | Location | Reason |
|------|----------|--------|
| Back `<Button>` | L119 | shadcn, `aria-label="Back"` ✓ |
| Hero stat `motion.div` | L132 | No `onClick`, presentational ✓ |
| Skeleton grid divs | L165 | Non-interactive ✓ |
| "Discover creators" `<Button>` | L181 | shadcn → ships tokens; visible text → no aria-label ✓ |
| No-match `<p>` | L191 | Non-interactive text ✓ |
| Footer hint `<p>` | L243 | Non-interactive text ✓ |
| All icons (Avatar/Sparkles/Clock/Award/ChevronRight) | various | Display children, decorative ✓ |

---

## (3b) LIGHT FLAG — no-op onClick on badge cards (do NOT fix)

**Confirmed correct LIGHT FLAG.** The badge-card `onClick` is `() => creator && navigate('/user/' + creator.user_id)`. If `creator` is `undefined` (deleted creator, or the `profiles` lookup returns no matching row for that `creator_id`), clicking the card does nothing — the card remains focusable + labeled + shows `whileTap` feedback, but the navigation is suppressed by the `&&` guard. This is a **LOGIC/handler** concern (the owner should decide: navigate to a 404? remove the card? show a toast?), entirely outside the className + display-only attribute scope.

---

## Owner Verification

1. Run `npm run update` — must pass (types + worker types + production build). Diff is 3 ins / 2 del (+1 net), zero logic changes.
2. Preview at 375/768/1280: filter chips scroll horizontally on narrow screens (ring visible via `overflow-x-auto` precedent); badge cards are `grid-cols-2` with `aspect-square` — ring visible despite self `overflow-hidden` per the CSS fact above.
3. Keyboard: Tab through filter chips → each gets a focus ring + announces "All, toggle button" / "Cambodia, toggle button" (via `aria-pressed`). Tab to badge cards → ring appears; Enter navigates to creator profile.
4. Verify `aria-pressed` reads correctly in VoiceOver/NVDA: "All, toggle button, pressed" when active, "Cambodia, toggle button, not pressed" when inactive.
