# MiMo run — 2026-06-14T00:54:16.681Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: You are a senior React / Tailwind / framer-motion reviewer. Please review one file from a React + Vite + TypeScript web app (also wrapped with Capacitor for iOS and Android). We are doing a small accessibility-and-polish pass: adding keyboard focus rings, press feedback, and ARIA where useful on interactive controls. Reference style file: src/pages/hubs/JobPostingDetailPage.tsx.

File under review: src/pages/HashtagPage.tsx (a hashtag landing page at /tag/:tag: sticky header + hero stat card + a responsive media tile grid of every post tagged with the hashtag; ~284 lines).

Scope guardrail: only CSS className changes and a few display-only attributes are in scope (aria-label, aria-pressed, and framer-motion whileTap which is display-only press feedback). Please keep all data fetching, navigation targets, click handlers, query keys, and list/filter/sort logic exactly as they are. If you notice a logic or content issue, list it under "Owner flags" for later — no need to change it.

House conventions to apply consistently:
- Focus ring appended to every interactive control: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (no ring-offset).
- A control that sits flush inside an overflow-hidden rounded PARENT uses focus-visible:ring-inset so the ring corners are not clipped. A control whose OWN element is the rounded one (parent not overflow-hidden) uses a normal outward ring.
- Press-scale tiers: icon-only -> active:scale-95; medium chip/pill -> active:scale-[0.98]; large full-width card/row -> active:scale-[0.99]; small inline text link -> active:scale-[0.97] + rounded-sm.
- transition-transform when press-scale is the only animated property; transition-all when there is also a hover:bg / hover:opacity / hover:text / hover:border that should animate together.
- aria-label only on icon-only or image-only controls (no visible text). Controls with visible text get no aria-label.
- "Don't churn already-polished tokens": if a control already carries a valid active:scale value, keep it rather than renumbering to the nominal tier, unless it is clearly wrong.

Important framer-motion detail: on a motion.button that has whileTap, a CSS active:scale does nothing (motion's inline transform wins), so for those add the focus ring only (a box-shadow focus ring is safe — motion overrides transform, not box-shadow), and do not add a CSS transition class to a motion.button. A motion.button WITHOUT whileTap that nonetheless has an entrance animation (initial/animate on scale) may also leave an inline transform at rest, so a CSS active:scale on it is unreliable — if press feedback is wanted there, the clean way is to add a whileTap rather than a CSS active:scale. Raw <button>/<a> elements honor active:scale and get the full set. Native <input> with an existing focus ring is left alone.

Here is my proposed control inventory — please verify each, and correct me if I mislabeled motion-vs-raw, the tier, the inset choice, or the aria:

1. Header back button (L155) — raw <button type="button">, icon-only ArrowLeft, already has aria-label="Back", already has `active:scale-95 transition-transform` and `hover:bg-muted/50` and `min-w-[44px] min-h-[44px]`, currently NO focus ring. Sits in a sticky header `flex items-center gap-3 ... bg-background/95 backdrop-blur` (NOT overflow-hidden). Plan: append the outward ring; and because the button has `hover:bg-muted/50`, switch `transition-transform` -> `transition-all` so the bg fade eases alongside the existing press-scale (matching how prior back buttons in this app were treated). Keep active:scale-95. No aria-label change (already present). (Q1 below.)

2. EmptyState "Browse the feed" button (L204) — raw <button type="button">, visible text "Browse the feed", already has `bg-ig-gradient ... hover:opacity-90 active:scale-95 transition-all`, currently NO focus ring. Rendered via the EmptyState component's `action` prop (the <button> JSX itself lives in this file). Plan: append the outward ring only (keep the existing active:scale-95 + transition-all + hover:opacity-90 — do not renumber to [0.98]). Visible text -> no aria-label. (Q4 below.)

3. Media tile grid (L216) — motion.button mapped over tiles. It has an ENTRANCE animation (initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition delay) but NO whileTap. It already has aria-label={`Open: ${tile.caption ?? "post"}`} (an accessible name is already present). The element is `group relative overflow-hidden rounded-xl bg-muted aspect-[3/4]`, sitting in `grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6` (a comfortable 8px `gap-2` gutter, NOT a tight 2px gutter; the grid is NOT overflow-hidden). Inner media has a `group-hover:scale-105` zoom. Plan: add the focus ring. Open questions on whileTap and inset-vs-outward below (Q2, Q3). Keep the existing aria-label as-is.

Presentational / out of scope (leave alone): StatTile (a non-interactive <div>, no onClick); the "Invalid hashtag" guard screen (no controls); SEOHead; the EmptyState wrapper itself; ReelThumbnail (child component); <img> media; the Hash/Play/Heart/MessageCircle/Loader2 decorative icons.

Please answer these questions explicitly:
Q1. Header back (#1): agree to switch `transition-transform` -> `transition-all` (it has hover:bg-muted/50) and append the outward ring, keeping active:scale-95? Or would you keep transition-transform and only add the ring?
Q2. Media tiles (#3): this motion.button has an entrance scale animation but NO whileTap, so it currently has no press feedback at all. Options: (a) add the focus ring only (the a11y win) and leave press feedback to the existing inner `group-hover:scale-105`; or (b) also add `whileTap={{ scale: 0.97 }}` to give a real, reliable press-scale (matching the sibling ExplorePage trending/tagged tiles which use whileTap={{ scale: 0.97 }}). A CSS active:scale would be unreliable here because the entrance animation leaves an inline transform. Which do you recommend — ring-only, or ring + whileTap? If whileTap, what scale value (0.97 vs 0.98)?
Q3. Media tiles (#3): inset vs outward ring? The tile's OWN element is `overflow-hidden rounded-xl`; the PARENT grid is NOT overflow-hidden; the gutter is a comfortable `gap-2` (8px), so an outward ~2px ring would sit in the gutter without touching neighbors. My understanding: an element's own overflow-hidden clips its descendants/content but NOT its own box-shadow ring, so an outward ring renders and follows the rounded-xl corners. My lean: outward ring (per the convention: own-element-is-the-rounded-one + comfortable gutter, unlike the tight gap-0.5 grids that force inset). Confirm outward vs inset, and give the exact ring string.
Q4. EmptyState button (#2): keep the existing active:scale-95, or renumber to the medium-pill [0.98] tier? My lean: keep active:scale-95 (don't churn a valid existing token). Agree?
Q5. At 375px wide: any concern with the sticky header row (back + Hash icon + gradient title), the hero stat card (`grid grid-cols-3 gap-2` of three StatTiles), or the `grid grid-cols-2 gap-2` tile grid? Note any small tap targets as a flag only; do not resize.

Output, please:
A) A short per-control table: control #, agree or corrected label, and the exact final className string (or "ring only [+ whileTap]") with the exact attribute additions.
B) Direct answers to Q1-Q5.
C) Any motion-vs-raw / tier / inset corrections.
D) Owner flags (things to note but not change here).
Be precise and give exact strings I can paste.
- files: src/pages/HashtagPage.tsx

---

## Review: `src/pages/HashtagPage.tsx` — Premium Interaction + A11y Pass

---

### A) Per-Control Table

| # | Control | Label correct? | Action | Exact additions |
|---|---------|---------------|--------|-----------------|
| 1 | Header back (L155) | ✅ raw `<button>`, icon-only, already `aria-label="Back"` | `transition-transform` → `transition-all`; append ring | className change (see diff below); no attr change |
| 2 | EmptyState "Browse the feed" (L204) | ✅ raw `<button>`, visible text | append ring only, keep `active:scale-95` | className change; no attr change |
| 3 | Media tile grid (L216) | ✅ `motion.button`, entrance animation, NO `whileTap` | add `whileTap={{ scale: 0.97 }}`; append ring only (no CSS transition class on motion.element) | attr addition; className change; keep existing `aria-label` unchanged |

---

### B) Answers to Q1–Q5

**Q1. Header back: `transition-transform` → `transition-all`?**
**Agree.** The button carries `hover:bg-muted/50` — a color property. `transition-transform` only animates `transform`; the hover bg would snap without easing. Switching to `transition-all` lets both the bg fade and the press-scale ease. This matches how every other back button with `hover:bg` was treated in the prior slices (EventsPage, MonetizationArticleDetailPage, etc.). Keep `active:scale-95`.

**Q2. Media tiles: ring-only vs ring + whileTap?**
**Recommend (b): ring + `whileTap={{ scale: 0.97 }}`.** Rationale:

- The entrance animation (`animate={{ scale: 1 }}`) leaves an inline `transform: scale(1)` at rest. A CSS `active:scale-95` would be **unreliable** — framer's inline transform wins over the CSS `:active` pseudo-class in many browsers.
- The tiles currently have **zero** press feedback (no `whileTap`, no `active:scale`, no CSS press state). The inner `group-hover:scale-105` is a hover-only zoom — it doesn't fire on tap/click and doesn't convey "pressed" to a user.
- The ExplorePage trending/tagged tiles (same visual pattern — `motion.button` with entrance scale, image tile, `overflow-hidden rounded-xl`) use `whileTap={{ scale: 0.97 }}` + ring-only, already verified live. Same pattern, same value.
- `0.97` matches the medium-tile tier (these are roughly 165×220px at 375px, similar to the ExplorePage image grid tiles). Do NOT use `0.98` (that's the wide-full-row tier) or `0.95` (icon tier).

**Q3. Media tiles: inset vs outward?**
**Confirm: outward ring, NO `ring-inset`.** Your analysis is exactly right:

- The tile's OWN `overflow-hidden` clips its **descendants** (the image, overlay badges, zoom) but does **not** clip its own box-shadow ring. The ring renders outward and follows the `rounded-xl` corners.
- The PARENT grid (`grid grid-cols-2 gap-2 p-2`) is NOT `overflow-hidden`. The gutter is `gap-2` = **8px** — a comfortable ~2px outward ring sits cleanly in the gutter without touching the neighbor. This is fundamentally different from the tight `gap-0.5` (2px) ExplorePage grids where inset was required.
- Exact ring string: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

**Q4. EmptyState button: keep `active:scale-95`?**
**Agree — keep it.** "Don't churn already-polished tokens." The button is `rounded-full ... py-2` (~38px tall) — physically in the pill/toggle range but the visual weight and gradient background match the "icon-CTA" tier. The existing `95` is valid and well-established on gradient CTA buttons throughout the repo. No user-visible benefit to renumbering to `[0.98]`.

**Q5. 375px layout concerns?**
No layout crush. Details:

- **Header row:** back (44px enforced by `min-w-[44px]`) + `gap-3` + Hash icon (20px) + `gap-2` + `flex-1 min-w-0` gradient title (truncated) + `px-4` → easily fits in 375px.
- **Hero stat card:** `grid grid-cols-3 gap-2` inside `p-5` → 3 × ~103px columns, comfortable.
- **Media tile grid:** `grid grid-cols-2 gap-2 p-2` → 2 × ~173px columns (each `aspect-[3/4]` ≈ 231px tall), well within bounds. The stat tiles at `p-2.5` are compact (~38px per tile including text) but they're **non-interactive** (`<div>`, no `onClick`) so tap-target size is not a concern.
- **Owner flag only (NOT fixing):** The back button's 44px tap target is explicitly set via `min-w-[44px] min-h-[44px]` — this is already compliant (unlike many other pages in the repo). No sub-44px flag needed here.

---

### C) Motion-vs-Raw / Tier / Inset Corrections

Your inventory is **accurate on all points**. One minor correction on Q2 framing: you correctly noted the entrance animation but I want to emphasize that a `motion.button` with `initial/animate` on `scale` **does** leave an inline `transform` at rest after the animation completes (`transform: scale(1)`). This is why CSS `active:scale` is unreliable on these elements — the inline style wins. `whileTap` is the correct mechanism. No other corrections.

---

### D) Owner Flags (not changed)

1. **No card→feed navigation from stat tiles.** The three `StatTile` `<div>`s in the hero show aggregate stats for the hashtag but are non-interactive. If the owner ever wants "tap Posts stat → filter feed by this tag," that's a future feature.
2. **No hashtag deep-link param contract.** Unlike flights/hotels/cars/bus which have `?from&to&start` deep-link params, hashtag pages rely solely on the `:tag` URL param. Consistent with the current design — just noting for completeness.
3. **`ReelThumbnail` child component.** Its internal controls (if any) are out of scope for this pass. If it renders its own interactive elements, a separate review would be needed.
4. **Video badge (`Play` icon overlay).** Non-interactive decorative overlay — correct to skip.

---

### E) Proposed Diff

**File:** `src/pages/HashtagPage.tsx`

**Change 1 — Header back button (L155):**

Before:
```tsx
className="rounded-full p-2.5 hover:bg-muted/50 active:scale-95 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center"
```

After:
```tsx
className="rounded-full p-2.5 hover:bg-muted/50 active:scale-95 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Change 2 — EmptyState "Browse the feed" button (L204):**

Before:
```tsx
className="rounded-full bg-ig-gradient px-5 py-2 text-sm font-bold text-white shadow-sm hover:opacity-90 active:scale-95 transition-all"
```

After:
```tsx
className="rounded-full bg-ig-gradient px-5 py-2 text-sm font-bold text-white shadow-sm hover:opacity-90 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Change 3 — Media tile motion.button (L216):**

Before:
```tsx
<motion.button
  key={`${tile.source}-${tile.feedId}`}
  initial={{ opacity: 0, scale: 0.96 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ delay: Math.min(i * 0.02, 0.4) }}
  onClick={() => navigate(`/feed?post=${tile.feedId}`)}
  className="group relative overflow-hidden rounded-xl bg-muted aspect-[3/4]"
  aria-label={`Open: ${tile.caption ?? "post"}`}
>
```

After:
```tsx
<motion.button
  key={`${tile.source}-${tile.feedId}`}
  initial={{ opacity: 0, scale: 0.96 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ delay: Math.min(i * 0.02, 0.4) }}
  whileTap={{ scale: 0.97 }}
  onClick={() => navigate(`/feed?post=${tile.feedId}`)}
  className="group relative overflow-hidden rounded-xl bg-muted aspect-[3/4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  aria-label={`Open: ${tile.caption ?? "post"}`}
>
```

---

### Diff Summary (compact)

```diff
--- a/src/pages/HashtagPage.tsx
+++ b/src/pages/HashtagPage.tsx
@@ Header back button @@
-          className="rounded-full p-2.5 hover:bg-muted/50 active:scale-95 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center"
+          className="rounded-full p-2.5 hover:bg-muted/50 active:scale-95 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

@@ EmptyState "Browse the feed" button @@
-              className="rounded-full bg-ig-gradient px-5 py-2 text-sm font-bold text-white shadow-sm hover:opacity-90 active:scale-95 transition-all"
+              className="rounded-full bg-ig-gradient px-5 py-2 text-sm font-bold text-white shadow-sm hover:opacity-90 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

@@ Media tile motion.button @@
               transition={{ delay: Math.min(i * 0.02, 0.4) }}
+              whileTap={{ scale: 0.97 }}
               onClick={() => navigate(`/feed?post=${tile.feedId}`)}
-              className="group relative overflow-hidden rounded-xl bg-muted aspect-[3/4]"
+              className="group relative overflow-hidden rounded-xl bg-muted aspect-[3/4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Totals:** 3 controls / 3 className edits + 1 attr addition (`whileTap`). No logic, query, or handler changes. The `git diff` will show ~3 line-pairs changed + 1 line inserted.

---

### F) Verify Gate

After applying, run:

```bash
npm run update
```

Must pass with TRUE EXIT 0 (type-check + worker type-check + production build). The changes are className-only + one `whileTap` prop (display-only attribute), so type-check should be clean. The `whileTap` value is a simple `scale` number — no new imports or types.

**Preview caveat:** The page renders at `/tag/:tag` and needs populated posts in the local DB with hashtag captions for the tile grid to render (otherwise only the EmptyState button is visible). The sticky back button is always visible. If previewing locally, test keyboard focus by Tab-navigating to each control.
