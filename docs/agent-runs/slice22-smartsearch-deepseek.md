# DeepSeek run — 2026-06-14T01:01:28.238Z

- model: deepseek-chat
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and tell me whether my planned per-control changes are complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/SmartSearchPage.tsx  (route /search — a unified search surface: people, posts, communities, marketplace)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, framer-motion whileTap). Please keep all data logic exactly as it is: every Supabase query, the .or()/.ilike()/.eq() filters, react-query keys, localStorage recent-search logic, navigate() targets, the debounce, and all prop wiring should stay byte-identical. Only advise on className tokens and the display-only attributes listed above.

DESIGN TOKEN SYSTEM we are applying consistently across the app:
- Focus ring (append to every focusable interactive control): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  (no ring-offset)
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] + rounded-sm ; medium chip/pill -> active:scale-[0.98] ; wide full-width row/card -> active:scale-[0.99]
- transition class: use transition-transform when scale is the only animated property; use transition-all when there is also a hover:bg / hover:text / hover:opacity that should animate alongside the press.
- aria-label only on icon-only / image-only controls (visible-text controls do not need it).

COMPONENT-TYPE RULES we follow (so we don't double-style or mis-style):
- shadcn <Button>, <Input>, <Badge> (non-clickable), <TabsTrigger> already ship built-in tokens (focus ring, press feel, role) -> we leave them untouched, EXCEPT an icon-only shadcn Button still needs an aria-label if it lacks one.
- A raw <button>/<a> gets the full token set.
- A framer-motion element with whileTap: CSS active:scale is overridden by motion's inline transform, so we add the focus ring via box-shadow ring only (never a CSS transition/scale class on a motion element).
- A *clickable* shadcn <Badge> renders a plain <div> with onClick but NO role / NO tabIndex, so it is NOT keyboard-focusable: a CSS focus ring would be dead on it. For those we add transition-all + active:scale (press feedback for pointer/touch works on the div) but NO focus ring, and aria-pressed ONLY if it is a toggle (not if the click just runs an action like setting a search query). We call this our "BadgesPage precedent."

MY PLANNED EDITS (please confirm each is right, or correct it):

1. Clear-search "X" button, line ~155:
   current: <button type="button" onClick={() => setQuery("")} aria-label="Clear search" title="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2">
   plan: append  transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
   (raw icon-only button; already has aria-label; outward ring.)

2. "Clear" recent-searches text button, line ~169:
   current: <button type="button" onClick={clearRecent} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
   plan: append  transition-all active:scale-[0.97] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
   (small inline text-link; transition-all because of hover:text-foreground; visible text so no aria-label.)

3. Recent-search row buttons, line ~173:
   current: <button type="button" key={i} onClick={() => handleSelectSearch(s)} className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-accent text-sm text-foreground">
   plan: append  transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
   (wide full-width row; transition-all because of hover:bg-accent; visible text so no aria-label.)

4. Trending-tag Badge, line ~187:
   current: <Badge key={tag} variant="outline" className="cursor-pointer" onClick={() => handleSelectSearch(tag.replace("#", ""))}>{tag}</Badge>
   plan: append  transition-all active:scale-[0.97]  to className; NO focus ring (Badge renders a non-focusable div); NO aria-pressed (the click runs an action — it sets the search query — it is not a toggle).
   (BadgesPage precedent.)

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm none of these need a change):
- Back button, line ~145: shadcn <Button variant="ghost" size="icon" aria-label="Back"> — already labeled, ships tokens.
- Search <Input>, line ~150 — shadcn, ships tokens.
- The 5 <TabsTrigger> (All/People/Posts/Groups/Market), lines ~203-207 — shadcn, ship role=tab + tokens.
- "Follow" button (UserCard, line ~265) and "Join" button (CommunityCard, line ~291) — shadcn <Button>. (Side note: both currently have no onClick handler — is that worth flagging to the owner? I will only flag it, not change behavior in this pass.)
- Result cards UserCard / PostCard / CommunityCard / MarketCard — each is a framer-motion motion.div with an entrance animation and NO onClick, so they are presentational (not pressable). Should they become tappable to open the result? Again I will only flag, not implement here.

QUESTIONS:
Q1. Is appending the icon press+ring set to edit #1 the right call, matching a standard clear-X?
Q2. For #2 the small "Clear" text-link: is active:scale-[0.97] + rounded-sm + transition-all the right tier, or would you treat it differently?
Q3. For #3 the recent row: is [0.99] the right wide-row tier, or would [0.98] feel better for a p-2 row?
Q4. For #4 the trending Badge: confirm the BadgesPage precedent (transition-all + active:scale-[0.97], no ring, no aria-pressed) is correct here.
Q5. Is my untouched list correct, and does anything there actually need a token? Also: at a 375px-wide phone viewport, do these controls keep a comfortable >=44px tap target, and do the trending badges wrap cleanly?

Please answer Q1-Q5 and give me any corrected className strings. Keep all data/query logic unchanged. Thank you.
- files: src/pages/SmartSearchPage.tsx

---

# Review: SmartSearchPage.tsx — Premium Interaction Polish

## Short Plan

Apply the standard 4-control interaction pass (clear-X, "Clear" text-link, recent-search rows, trending Badge) using the established design token system. All 4 edits are className-only + display-only attrs. Leave all data logic, shadcn components, and result cards untouched. Flag the non-functional "Follow"/"Join" buttons and presentational result cards to the owner.

---

## Proposed Changes (exact diff)

**File:** `src/pages/SmartSearchPage.tsx`

### Edit 1 — Clear-search "X" button (line ~155)

**Before:**
```tsx
<button type="button" onClick={() => setQuery("")} aria-label="Clear search" title="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2">
```

**After:**
```tsx
<button type="button" onClick={() => setQuery("")} aria-label="Clear search" title="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### Edit 2 — "Clear" recent-searches text button (line ~169)

**Before:**
```tsx
<button type="button" onClick={clearRecent} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
```

**After:**
```tsx
<button type="button" onClick={clearRecent} className="text-xs text-muted-foreground hover:text-foreground transition-all active:scale-[0.97] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Clear</button>
```

### Edit 3 — Recent-search row buttons (line ~173)

**Before:**
```tsx
<button type="button" key={i} onClick={() => handleSelectSearch(s)} className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-accent text-sm text-foreground">
```

**After:**
```tsx
<button type="button" key={i} onClick={() => handleSelectSearch(s)} className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-accent text-sm text-foreground transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### Edit 4 — Trending-tag Badge (line ~187)

**Before:**
```tsx
<Badge key={tag} variant="outline" className="cursor-pointer" onClick={() => handleSelectSearch(tag.replace("#", ""))}>{tag}</Badge>
```

**After:**
```tsx
<Badge key={tag} variant="outline" className="cursor-pointer transition-all active:scale-[0.97]" onClick={() => handleSelectSearch(tag.replace("#", ""))}>{tag}</Badge>
```

---

## Answers to Q1–Q5

### Q1. Clear-X icon button — correct?
**Yes.** `transition-transform active:scale-95` + outward ring is the standard icon-only pattern. Already has `aria-label`. The `transition-transform` is correct since there's no `hover:bg` to animate (the button is bare, positioned absolutely). ✅

### Q2. "Clear" text-link — correct tier?
**Yes.** `active:scale-[0.97]` + `rounded-sm` + `transition-all` is the correct small inline text-link tier. The `transition-all` is needed because `hover:text-foreground` should animate alongside the press. The `rounded-sm` gives the ring a clean shape. ✅

### Q3. Recent-search row — correct tier?
**Yes.** `active:scale-[0.99]` is the correct wide-row tier. The row is `w-full p-2` (~36px tall) — `[0.99]` gives a subtle press without feeling too aggressive. `transition-all` is correct because `hover:bg-accent` should animate. ✅

### Q4. Trending Badge — correct precedent?
**Yes.** The BadgesPage precedent applies perfectly:
- `transition-all active:scale-[0.97]` — press feedback for pointer/touch
- **No focus ring** — the Badge renders a `<div>` with `onClick` but no `role`/`tabIndex`, so a CSS ring would be dead on it
- **No `aria-pressed`** — clicking sets the search query (an action), not a toggle state
✅

### Q5. Untouched list — correct? 375px viewport concerns?

**Untouched list is correct:**
- ✅ Back button — shadcn `<Button>`, already has `aria-label`, ships tokens
- ✅ Search `<Input>` — shadcn, ships tokens
- ✅ `<TabsTrigger>` ×5 — shadcn, ship `role="tab"` + tokens
- ✅ "Follow" / "Join" buttons — shadcn `<Button>`, ship tokens
- ✅ Result cards (`UserCard`, `PostCard`, `CommunityCard`, `MarketCard`) — `motion.div` with entrance animation, no `onClick`, presentational

**375px viewport check:**
- **Clear-X** — absolutely positioned in the search input's `relative` wrapper (~36px wide input area), the `X` icon is ~16px with no padding → **sub-44px tap target** (established repo-wide pattern, flag only)
- **"Clear" text-link** — `text-xs` (~12px font), no padding → **sub-44px** (flag only)
- **Recent rows** — `p-2` (~32px tall) → **sub-44px** (flag only)
- **Trending badges** — `flex-wrap gap-2` in a `p-4` container (~343px inner width at 375px). 8 badges at ~60-80px each would wrap to 2-3 rows, which is clean. No crush. ✅

**Owner flags (not fixing in this pass):**
1. "Follow" button (UserCard) and "Join" button (CommunityCard) have **no `onClick` handler** — they render but do nothing
2. All 4 result cards (`UserCard`, `PostCard`, `CommunityCard`, `MarketCard`) are `motion.div` with **no `onClick`** — they display results but are not tappable to navigate to the result detail
3. Sub-44px tap targets on clear-X, "Clear" text-link, and recent rows (established repo compact pattern)

---

## Verification

After applying these 4 edits, run:
```bash
npm run update
```
Expected: type-check + worker type-check + production build all pass (true exit 0). The changes are purely additive className strings — no data logic, no imports, no structural changes.
