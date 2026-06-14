# MiMo run — 2026-06-14T00:42:45.521Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: You are a senior React / Tailwind / framer-motion reviewer. Please review one file from a React + Vite + TypeScript web app (also wrapped with Capacitor for iOS and Android). We are doing a small accessibility-and-polish pass: adding keyboard focus rings, press feedback, and ARIA where useful on interactive controls. Reference style file: src/pages/hubs/JobPostingDetailPage.tsx.

File under review: src/pages/ExplorePage.tsx (a discovery surface: search, trending grid, people, hashtags; ~445 lines).

Scope guardrail: only CSS className changes and a few display-only attributes are in scope (aria-label, aria-pressed). Please keep all data fetching, navigation targets, click handlers, query keys, and list/filter logic exactly as they are. If you notice a logic or content issue, list it under "Owner flags" for later — no need to change it.

House conventions to apply consistently:
- Focus ring appended to every interactive control: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (no ring-offset).
- A control that sits flush inside an overflow-hidden rounded parent uses focus-visible:ring-inset so the ring corners are not clipped. A control whose own element is the rounded one (parent not overflow-hidden) uses a normal outward ring.
- Press-scale tiers: icon-only -> active:scale-95; medium chip -> active:scale-[0.98]; large full-width card/row -> active:scale-[0.99]; small inline text link -> active:scale-[0.97] + rounded-sm; a segmented filter chip -> active:scale-[0.97].
- transition-transform when press-scale is the only animated property; transition-all when there is also a hover:bg / hover:text / hover:border that should animate together.
- aria-label only on icon-only or image-only controls (no visible text). Controls with visible text get no aria-label. Use aria-pressed on toggle/filter tabs.

Important framer-motion detail: on a motion.button that has whileTap, a CSS active:scale does nothing (motion's inline transform wins), so for those add the focus ring only (plus aria-label if image/icon-only). A box-shadow focus ring is safe on a motion.button (motion overrides transform, not box-shadow). Do not add a CSS transition class to a motion.button (let the ring appear instantly; avoid fighting motion's transform transitions). Raw <button>/<a> elements do honor active:scale, so they get the full set. Native <input> with an existing focus ring is left alone.

Here is my proposed control inventory — please verify each, and correct me if I mislabeled motion-vs-raw, the tier, the inset choice, or the aria:
1. Search clear "X" (L227) — raw <button>, icon-only X, absolutely positioned (no padding/bg) inside a `relative` wrapper (not overflow-hidden). Already has aria-label="Clear search" + title. Currently no transition/scale/ring. Plan: add active:scale-95 + transition-transform + outward ring. (Q: is a tight ring around a bare absolutely-positioned 16px icon acceptable, or would you skip the ring here since the sibling input is already focusable+ringed? My lean: keep the ring — it's a separate tab stop / separate action.)
2. Search <input> (L220) — native input, already has `focus:outline-none focus:ring-2 focus:ring-primary/30`. Plan: skip.
3. Tabs x3 (L237) — raw <button> mapped over tabs, has visible text+icon, `transition-colors` present, selection conveyed only by `bg-ig-gradient` vs `bg-muted/50`, rounded-full, parent `flex gap-1 px-4` not overflow-hidden. Plan: add aria-pressed={activeTab === t.id} + active:scale-[0.97] (segmented tier) + outward ring, and switch transition-colors -> transition-all so the new scale eases. Append the ring to the cn() base string (applies to both active and inactive).
4. Search-result user rows (L286) — raw wide <button>, rich content (avatar + name), classes "w-full ... rounded-xl bg-card border ... hover:bg-accent/50 transition-colors", parent `p-4 space-y-2` not overflow-hidden, button is the rounded element. Plan: add active:scale-[0.99] (wide row) + outward ring + transition-colors -> transition-all. No aria-label (rich text).
5. Suggested-user rows (L352) AND Hashtag rows (L424) — both raw wide <button> with the identical className "w-full ... rounded-xl bg-card border ... hover:bg-accent/50 transition-colors text-left". Same treatment as #4: active:scale-[0.99] + outward ring + transition-all. No aria-label. (These two share a byte-identical className string, so a single find/replace covers both.)
6. Trending grid tiles (L319) AND Tagged grid tiles (L405) — motion.button with whileTap={{ scale: 0.97 }}, image-only (square media thumbnail, <img alt="">), the element itself is `relative aspect-square bg-muted overflow-hidden`, sitting in a `grid grid-cols-3 gap-0.5` (2px gutter, not rounded, not overflow-hidden). Plan: ring only (motion). Open questions below (Q2, Q3).
7. "Clear" hashtag text button (L383) — raw <button>, visible text "Clear" + X icon, "text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors", not rounded. Plan: small inline text-link tier -> add active:scale-[0.97] + rounded-sm + outward ring + transition-colors -> transition-all. No aria-label (visible text).
Presentational / out of scope (leave alone): DegradedDataBanner + LoadFailureCard (separate components; their retry buttons are internal — used here via onRetry props, no raw JSX button in this file); PullToRefresh wrapper; ZivoMobileNav; Avatar; VerifiedBadge (interactive={false}); the loading <Loader2> spinners; <img>/<video> media.

Please answer these questions explicitly:
Q1. Search clear "X" (#1): keep the ring or skip it (bare absolutely-positioned icon)? And is active:scale-95 + transition-transform right?
Q2. Image grid tiles (#6): the tile element is itself `overflow-hidden`. Does an OUTWARD focus ring (box-shadow) get clipped by the element's own overflow-hidden? (My understanding: no — overflow clips descendants/content, not the element's own box-shadow.) So outward ring should render. But given the tight `gap-0.5` (2px) grid gutter, an outward 2px ring would bleed into the gutter and touch the neighbor tile. Would you use focus-visible:ring-inset on these tiles instead (ring sits crisply on the image edge, no gutter bleed, not clipped since it's inset)? My lean: ring-inset for the tiles. Please confirm inset vs outward and give the exact ring string.
Q3. Image grid tiles (#6): they are image-only buttons with no accessible name (the post caption is in the data as post.caption but not rendered in the tile). Should each tile get a generic static aria-label (e.g. aria-label="Open post") for screen-reader users, or stay ring-only? If yes, exact wording. (Keep it a plain static string — no template that changes behavior.)
Q4. Tabs (#3): aria-pressed (toggle-button semantics) is correct here vs role="tab"/tablist — agree? (The tabs filter content with no aria-controls/tabpanel wiring, so they read as toggle buttons. This matches the repo's segmented-filter precedent.)
Q5. At 375px wide: any concern with the tabs row (`flex gap-1 px-4`, 3 chips), the `grid grid-cols-3 gap-0.5` media grid (note the large tile uses `col-span-2 row-span-2` every 7th item), or the full-width rows? Tap targets: the tabs are ~30px tall and the clear-X is ~16px — note small tap targets as a flag only; do not resize.

Output, please:
A) A short per-control table: control #, agree or corrected label, and the exact final className string (or "ring only [+ aria]") with the exact attribute additions.
B) Direct answers to Q1-Q5.
C) Any motion-vs-raw / tier / inset corrections.
D) Owner flags (things to note but not change here).
Be precise and give exact strings I can paste.
- files: src/pages/ExplorePage.tsx

---

## Review: `src/pages/ExplorePage.tsx` — Interaction + A11y Pass

---

### Control Inventory Verification

I verified every `<button>`, `motion.button`, `<input>`, and interactive element in the file. **Your inventory is exhaustive and correctly labeled.** Minor corrections below.

| # | Control | Motion vs Raw | Your label | My correction | Tier | Ring |
|---|---------|--------------|------------|---------------|------|------|
| 1 | Search clear X (L227) | Raw `<button>` | ✓ | — | icon `active:scale-95` | outward |
| 2 | Search `<input>` (L220) | Native | ✓ skip | — | — | — |
| 3 | Tabs ×3 (L237) | Raw `<button>` | ✓ | — | segmented `[0.97]` | outward |
| 4 | Search-result user rows (L286) | Raw `<button>` | ✓ | — | wide row `[0.99]` | outward |
| 5a | Suggested-user rows (L352) | Raw `<button>` | ✓ | — | wide row `[0.99]` | outward |
| 5b | Hashtag rows (L424) | Raw `<button>` | ✓ | — | wide row `[0.99]` | outward |
| 6a | Trending grid tiles (L319) | `motion.button` | ✓ | — | ring-only | **inset** |
| 6b | Tagged grid tiles (L405) | `motion.button` | ✓ | — | ring-only | **inset** |
| 7 | "Clear" hashtag (L383) | Raw `<button>` | ✓ | — | text-link `[0.97]` | outward |

**Motion-vs-raw / tier / inset corrections:** None. Your labels are all correct. One nuance: you described the search-clear button as having "no padding/bg" — confirmed, the className is purely positional (`absolute right-3 top-1/2 -translate-y-1/2`), so the element is sized entirely by its 16px `<X>` child. The ring and scale still apply correctly.

---

### Answers to Q1–Q5

**Q1. Search clear X — keep the ring?**

**Keep the ring.** It's a separate tab stop with a distinct action. A tight 2px ring around a 16px bare icon looks minimal but is a valid keyboard-focus indicator. `active:scale-95` + `transition-transform` is correct — press-scale is the only animated property (no `hover:bg` on this button). Exact string:

```
"absolute right-3 top-1/2 -translate-y-1/2 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Q2. Grid tiles — inset vs outward?**

Your understanding is correct: `overflow-hidden` clips **descendant** content, not the element's own `box-shadow`. An outward ring **would render**. However, with `gap-0.5` (2px gutter), a 2px outward ring bleeds into the gutter and touches the neighbor tile's edge — it looks muddy.

**Use `ring-inset`.** The ring sits crisply on the image edge inside the tile, no gutter bleed, no clipping concern. Exact ring string for the className:

```
focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-ring
```

Since these are `motion.button` with `whileTap`, add ring + `aria-label` only — no CSS transition class, no `active:scale`.

**Q3. Grid tiles — aria-label?**

**Yes, add `aria-label="Open post"`.** The tiles are image-only buttons with `<img alt="">` — screen readers get nothing. A generic static string is the right call (the caption data isn't rendered in the tile, and a template literal would be a behavior change). Exact:

```
aria-label="Open post"
```

**Q4. Tabs — `aria-pressed` vs `role="tablist"/tab`?**

**Agree, `aria-pressed` is correct.** The tabs filter content with no `aria-controls`/`role="tabpanel"` wiring. They read as toggle buttons. This matches the repo's segmented-filter precedent (AchievementsPage, ChallengesPage, CoinTransfers).

**Q5. 375px responsive — any crush?**

**No crush.** The 3-tab row (`flex gap-1 px-4`, ~55px per chip × 3 + gaps ≈ 180px in 343px inner) is comfortable. The `grid-cols-3 gap-0.5` media grid tiles at ~124px/col (the `col-span-2 row-span-2` large tile at ~249px also fits cleanly within 374px usable). Full-width rows are fine. **Flag only (no resize):** clear-X ~16px tap target, tabs ~30px tall — both sub-44px WCAG guideline, established repo-wide compact pattern.

---

### Per-Control Table with Exact Strings

| # | Control | Action | Exact className / attribute addition |
|---|---------|--------|--------------------------------------|
| 1 | Search clear X | `className` change | `"absolute right-3 top-1/2 -translate-y-1/2 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` |
| 2 | Search input | **SKIP** | — |
| 3 | Tabs ×3 | `className` change + add attr | cn base → `"flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` + `aria-pressed={activeTab === t.id}` |
| 4 | Search user rows | `className` change | `"w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40 hover:bg-accent/50 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` |
| 5a | Suggested-user rows | `className` change | `"w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40 hover:bg-accent/50 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-left"` |
| 5b | Hashtag rows | `className` change | `"w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40 hover:bg-accent/50 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-left"` |
| 6a | Trending grid tiles | `className` change + add attr | cn base → `"relative aspect-square bg-muted overflow-hidden focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-ring"` + `aria-label="Open post"` |
| 6b | Tagged grid tiles | `className` change + add attr | `"relative aspect-square bg-muted overflow-hidden focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-ring"` + `aria-label="Open post"` |
| 7 | "Clear" hashtag | `className` change | `"text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-all active:scale-[0.97] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` |

---

### Proposed Diff — `src/pages/ExplorePage.tsx`

**8 className edits + 4 display-only attribute additions. Zero logic changes.**

```diff
--- a/src/pages/ExplorePage.tsx
+++ b/src/pages/ExplorePage.tsx
@@ -224,7 +224,7 @@
             {search && (
-              <button type="button" onClick={() => setSearch("")} aria-label="Clear search" title="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2">
+              <button type="button" onClick={() => setSearch("")} aria-label="Clear search" title="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                 <X className="h-4 w-4 text-muted-foreground" />
@@ -237,10 +237,11 @@
           {tabs.map((t) => (
-            <button type="button"
+            <button type="button"
               key={t.id}
               onClick={() => setActiveTab(t.id)}
+              aria-pressed={activeTab === t.id}
               className={cn(
-                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
+                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                 activeTab === t.id ? "bg-ig-gradient text-white" : "bg-muted/50 text-muted-foreground"
               )}
@@ -286,7 +287,7 @@
               onClick={() => navigate(`/profile/${u.id}`)}
-                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40 hover:bg-accent/50 transition-colors"
+                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40 hover:bg-accent/50 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
@@ -319,8 +320,9 @@
                 <motion.button
                   key={post.id}
+                  aria-label="Open post"
                   className={cn(
-                    "relative aspect-square bg-muted overflow-hidden",
+                    "relative aspect-square bg-muted overflow-hidden focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-ring",
                     isLarge && "col-span-2 row-span-2"
                   )}
@@ -352,7 +354,7 @@
               onClick={() => navigate(`/profile/${u.id}`)}
-                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40 hover:bg-accent/50 transition-colors text-left"
+                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40 hover:bg-accent/50 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-left"
@@ -383,7 +385,7 @@
                   onClick={() => setSelectedTag(null)}
-                    className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
+                    className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-all active:scale-[0.97] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
@@ -405,6 +407,7 @@
                       <motion.button
                         key={post.id}
-                        className="relative aspect-square bg-muted overflow-hidden"
+                        aria-label="Open post"
+                        className="relative aspect-square bg-muted overflow-hidden focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-ring"
@@ -424,7 +427,7 @@
               onClick={() => setSelectedTag(h.tag)}
-                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40 hover:bg-accent/50 transition-colors text-left"
+                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40 hover:bg-accent/50 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:
