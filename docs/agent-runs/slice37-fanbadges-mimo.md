# MiMo run — 2026-06-14T02:31:00.360Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + responsive QA on ONE customer-facing page: src/pages/FanBadgesPage.tsx (250 lines, "Badges you've earned by supporting creators", read-only grid). Reads server-awarded fan_badges rows (key ["fan-badges", user?.id]; select id,badge_type,badge_name,badge_icon,creator_id,earned_at; eq fan_id; order earned_at desc) + a second profiles lookup for creator info (key ["fan-badges-creators", creatorIds.join(",")]; select user_id,full_name,username,avatar_url; in user_id creatorIds). creatorMap/types/filtered useMemo derivations; activeType useState ("All"). formatRelative pure helper. Layout: SwipeBackContainer + SEOHead(noIndex); sticky header (shadcn back <Button> + Award badge + "Fan Badges" title); gradient hero "Earned {n} badges from {m} creators" summary (motion.div, NO onClick); a CONDITIONAL type-filter chip row (only when types.length > 1); loading skeleton grid + empty-state card + no-match line; a 2-col grid of badge tiles (each a motion.button); closing helper <p>. NO bottom nav (SwipeBackContainer page).

Reference standard for tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): exactly 1 RAW <button type="button"> (the filter chip, in types.map) + 1 motion.button (the badge tile, in filtered.map) + 2 shadcn <Button> (back + empty-state CTA).
- shadcn back <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={navigate(-1)}> (L119) => SKIP (ships tokens, labeled).
- shadcn "Discover creators" <Button onClick={() => navigate("/feed")} className="bg-ig-gradient text-white font-bold rounded-full h-10 px-5 hover:opacity-90 border-0"> (L181, empty-state only) => SKIP (shadcn ships its own active/focus tokens).
- (A) type-filter chip (L149, RAW <button type="button"> in types.map, conditionally rendered only when types.length > 1): onClick={() => setActiveType(t)}, visible text {t.replace(/_/g," ")} (a category WORD, constant per chip), cn() base "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize" + conditional activeType===t ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted". HAS transition-all; NO active:scale; NO ring; NO aria-pressed. Sits in a flex gap-2 overflow-x-auto scrollbar-hide row (L147). === BYTE-IDENTICAL to the CouponsPage slice-33 filter chip base.
- (B) badge tile motion.button (L200, in filtered.map): whileTap={{ scale: 0.97 }} ALREADY present, ENTRANCE anim (initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay: idx*0.04}}), onClick={() => creator && navigate(`/user/${creator.user_id}`)}, className="relative aspect-square rounded-2xl bg-card border border-border overflow-hidden text-left active:opacity-90", aria-label={`${b.badge_name ?? b.badge_type} badge from ${creator?.full_name ?? "creator"}`} ALREADY present. HAS whileTap + active:opacity-90; NO ring; NO transition class. Tile is its OWN overflow-hidden rounded-2xl (clips its absolutely-positioned children: emoji/avatar/bottom-strip). Sits in grid grid-cols-2 gap-3 (L195, NOT overflow-hidden).
- Hero summary motion.div (L132, entrance anim, NO onClick) => presentational. Loading-skeleton divs (L165), empty-state card div (L173), no-match <p> (L191), closing helper <p> (L243) non-interactive. Award/Sparkles/Clock/ChevronRight icons + Avatar (shadcn) decorative.

TOKEN TIERS (this repo): wide/primary/cards active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. DON'T-CHURN: if a raw button ALREADY has transition + a valid scale, ADD ring (+aria) ONLY — do NOT renumber, do NOT re-flip an existing valid transition. motion.button with whileTap => its CSS active:* (active:scale OR active:opacity) is DEAD under framer's lingering inline style (inline-style precedence beats the stylesheet :active rule) => ring ONLY, KEEP whileTap, do NOT add transition-all (its transition:transform would fight whileTap's inline transform => jitter); keep any existing transition-colors (eases color only) but here there is NONE so add none. aria-pressed for toggles/segmented (state conveyed by color/bg only; a constant label WORD per button STILL qualifies; a varying count badge does NOT disqualify) — NOT for one-shot nav/action. ring-inset ONLY when a control is flush (zero clearance) inside an overflow-hidden rounded PARENT; OUTWARD is default; a button's OWN overflow-hidden does NOT clip its OWN box-shadow ring; overflow-x-auto scroll rows use OUTWARD (box-shadow ignored for scroll overflow per CSS spec, but :focus-visible ring still renders on the focused element).

HARD RULE: className + display-only attr (aria-*) + keep-existing-whileTap ONLY. Do NOT change any onClick / setActiveType / navigate / navigate(`/user/${creator.user_id}`) / whileTap value / entrance-anim props / useQuery / supabase from/select/eq/in/order / useMemo (creatorMap/types/filtered) / useState (activeType) / formatRelative / the conditional render guards / any logic.

MY PLAN -- validate or correct each (before->after; cite classNames):

(A) type-filter chip (L149; HAS transition-all, NO scale, NO ring, NO aria-pressed; identical to CouponsPage S33): ADD aria-pressed={activeType === t} (after onClick) + APPEND active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring to the cn() BASE string; KEEP transition-all (don't re-flip — it eases the inactive hover:bg-muted color alongside the new scale). before base: "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize" -> after base: "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring capitalize". chip/pill tier => [0.97]. aria-pressed VALID (selection conveyed ONLY by bg: active = gradient+white, inactive = secondary; the label WORD is constant per chip). visible text => NO aria-label. OUTWARD ring (overflow-x-auto scroll row). OK?

(B) badge tile motion.button (L200; whileTap={{scale:0.97}} ALREADY, entrance anim, active:opacity-90 [DEAD residue], aria-label ALREADY, NO ring, NO transition class): RING-ONLY — APPEND focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring to className; KEEP whileTap={{ scale: 0.97 }} (don't-churn — provides the tactile press); KEEP active:opacity-90 (harmless dead residue; removing = churn); KEEP the existing aria-label (descriptive, don't churn); do NOT add any transition (no hover state; transition-all would add transition:transform and fight whileTap => jitter). before: "relative aspect-square rounded-2xl bg-card border border-border overflow-hidden text-left active:opacity-90" -> after: "relative aspect-square rounded-2xl bg-card border border-border overflow-hidden text-left active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring". OUTWARD ring (the tile's OWN overflow-hidden does NOT clip its OWN ring; grid parent NOT overflow-hidden). OK?

QUESTIONS:
(1) Filter chip (A): aria-pressed + [0.97] + ring, KEEP transition-all (append-not-flip), OUTWARD ring on the overflow-x-auto scroll row — same as CouponsPage S33. AGREE? Confirm aria-pressed is valid (state by bg only, constant label word) and there's no double-counting issue.
(2) Badge tile (B): RING-ONLY (keep whileTap + keep active:opacity-90 residue + keep existing aria-label), NO transition added — do you AGREE active:opacity-90 is DEAD under framer's entrance inline style (so whileTap is the live press feedback), and that adding transition-all would cause jitter against whileTap? Confirm OUTWARD ring is correct (tile's own overflow-hidden does NOT clip its own box-shadow ring; the grid-cols-2 parent is not overflow-hidden) — NOT ring-inset.
(3) Inventory exhaustive (exactly 1 RAW button + 1 motion.button + 2 shadcn Button)? back <Button> L119 + "Discover creators" <Button> L181 correctly SKIP (both shadcn)? Hero summary motion.div L132 + skeleton/empty/no-match/helper nodes presentational? Note (A) renders only when types.length > 1 and (B) only when filtered.length > 0 — confirm those guards hide no extra control.
(4) Responsive 375/768/1280: header (back + Award + title); hero (3xl badge count + "from N creators"); filter chip row (overflow-x-auto, no crush — scrolls); 2-col badge grid (each aspect-square tile = centered 80px emoji disc + top-left creator avatar+name chip [max-w-[80px] line-clamp-1] + bottom gradient strip [badge name line-clamp-1 + earned-relative]). Any crush in the 2-col grid @375 (each col ~165px), or the avatar-name chip overflow? sub-44px tap targets to FLAG (chips py-1.5 ~28px; back h-10 w-10 40px; badge tiles aspect-square large = fine)?
(5) Any a11y note: badge tile aria-label already composes "{badge} badge from {creator}"; filter chips get aria-pressed; back labeled; empty-state CTA is shadcn (ships tokens). Anything else?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/FanBadgesPage.tsx

---

**VALIDATION: Plan is correct on all five points. The file you provided already has both changes applied — I'll confirm each and give the diff for the record.**

---

## (1) Plan

Two edits, both className + display-only-attr:

| # | Control | What | Tier |
|---|---------|------|------|
| A | Filter chip (RAW `<button>`) | Add `aria-pressed` + append scale + ring to cn() base | chip `[0.97]` |
| B | Badge tile (`motion.button`) | Ring-only append | — |

---

## (2) Diff

**File:** `src/pages/FanBadgesPage.tsx`

```diff
@@ Filter chip (types.map) @@
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
@@ Badge tile (filtered.map) @@
-                  className="relative aspect-square rounded-2xl bg-card border border-border overflow-hidden text-left active:opacity-90"
+                  className="relative aspect-square rounded-2xl bg-card border border-border overflow-hidden text-left active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Diffstat: 3 ins / 2 del (+1 net).** Logic-guard CLEAN — zero handler/logic/query lines touched.

**Note:** the file you provided already contains both changes (`aria-pressed` present, ring+scale tokens appended on both controls). If this is the working-tree state, the edits are done — just need the verify gate.

---

## (3)–(5) Answers to your questions

**(1) Filter chip — AGREE.** `aria-pressed={activeType === t}` is valid: state conveyed by bg only (gradient+white vs secondary), label WORD is constant per chip. `[0.97]` chip/pill tier correct. `transition-all` append-not-flip is correct — it eases the inactive `hover:bg-muted` color and now also covers the new `active:scale` transform (superset). OUTWARD ring on `overflow-x-auto` scroll row is correct (box-shadow is not clipped by scroll overflow per CSS spec; `:focus-visible` ring renders on the focused element and scrolls with it). Same as CouponsPage S33 exactly.

**(2) Badge tile — AGREE.** `active:opacity-90` is DEAD under framer's entrance inline `transform: translateY(0px)` + `whileTap` inline transform (inline-style precedence beats stylesheet `:active` rule). `whileTap={{ scale: 0.97 }}` is the live press feedback — KEEP. Adding `transition-all` would introduce `transition:transform` which fights `whileTap`'s lingering inline transform → jitter (NotificationsPage/PlacesPage/ForumsPage `motion.button`-row precedent). Ring-only is correct. OUTWARD ring is correct: the tile's own `overflow-hidden` does NOT clip its own `box-shadow` (box-shadow is rendered outside/around the element's border-box, and `overflow: hidden` only clips **child** content — not the element's own decorative effects). The `grid-cols-2` parent is not `overflow-hidden`. NOT ring-inset. Existing `aria-label` already present — KEEP (don't-churn).

**(3) Inventory — CONFIRMED exhaustive.** Exactly 1 RAW `<button>` (filter chip, `types.map`) + 1 `motion.button` (badge tile, `filtered.map`) + 2 shadcn `<Button>` (back L119 + "Discover creators" L181). Both shadcn buttons correctly SKIP (ship own tokens). Hero `motion.div` L132 (entrance-only, NO onClick) = presentational. Skeleton divs L165, empty-state card L173, no-match `<p>` L191, closing helper `<p>` L243 = non-interactive. Icons + Avatar = decorative. Conditional guards: `types.length > 1` hides the chip row entirely (no hidden sibling control); `filtered.length > 0` hides the badge grid entirely (no hidden sibling control). ✅

**(4) Responsive 375/768/1280 — CLEAN.** At 375: `max-w-2xl mx-auto px-4` → ~343px inner. Header (back 40px + Award badge + title) fits. Hero `text-3xl` count + "from N creators" fits. Filter chips `overflow-x-auto scrollbar-hide` → scrolls, no crush. **2-col grid: each col ~165px** — emoji disc `h-20 w-20` (80px) centered fits; avatar-name chip `absolute top-2 left-2 max-w-[80px] line-clamp-1` = 88px from left edge, leaving ~77px clearance to the right tile edge → **no overflow**; bottom strip `p-2.5 line-clamp-1` fits within 165px. **Sub-44px tap targets to FLAG (repo compact-pattern, not a per-page fix):** filter chips `py-1.5` ≈ ~28px; back `h-10 w-10` ≈ 40px. Badge tiles are large ~165px squares — fine.

**(5) a11y — nothing else to flag.** Badge tile `aria-label` composes "{name} badge from {creator}" (already present). Filter chips get `aria-pressed` (added). Back button `aria-label="Back"` (already present). Empty-state CTA is shadcn (ships tokens). All controls are real `<button>`/`motion.button` (natively focusable).

---

## Owner action

1. **Verify gate:** `npm run update` — must pass (0 type errors + worker types + production build).
2. **Preview** at 375/768/1280 — confirm filter chips scroll, badge grid renders, tile tap navigates to creator profile.
3. **Commit + deploy** when satisfied. Diff is 3 ins / 2 del (+1 net), className + display-only-attr only.
