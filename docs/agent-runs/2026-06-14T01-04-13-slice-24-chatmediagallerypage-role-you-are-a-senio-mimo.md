# MiMo run — 2026-06-14T01:04:13.007Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: SLICE 24 — ChatMediaGalleryPage
======================================================================

ROLE: You are a senior front-end reviewer. I am applying a className-ONLY interaction-token + a11y polish pass to a customer-facing React (Vite + Tailwind v4 + shadcn/ui + framer-motion) page. Decide the EXACT className/attribute changes for each interactive control. Be surgical.

HARD RULE (scope): className changes + tiny DISPLAY-ONLY attributes only (aria-label / aria-pressed / aria-expanded). NO logic, NO handlers, NO tabIndex/role/onKeyDown, NO state, NO routing, NO supabase, NO new framer props (do NOT add whileTap — it is outside this aria-only scope; if a press-scale is unreliable because of a residual entrance-animation transform, FLAG it for the owner instead of adding whileTap). If a control is keyboard-inaccessible because it lacks role/tabIndex, FLAG it for the owner.

TOKEN RULES (house style, parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button>/<a>/<Link> (NOT shadcn) get the full set: active:scale-[X] + transition-(all|transform) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Tier scales: wide/card [0.98]; chips/small/segmented-pill-tabs [0.97]; icon-only scale-95; full-width/menu-rows/wide-rows [0.99].
- transition-all when the control ALSO has hover:bg-*/hover:opacity (color/opacity fade) or underline; transition-transform for pure icon-scale with no hover color. If transition-all already present, just append active:scale + ring. If a raw control has active:scale-95 but NO transition utility (scale snaps), ADD transition-transform (pure icon-scale) so it eases.
- shadcn <Button>/<Input>/<Textarea> already ship tokens -> DO NOT add tokens.
- framer-motion motion.button WITH whileTap -> focus RING ONLY (CSS active:scale is DEAD under motion's inline transform). motion.button WITHOUT whileTap -> CSS active:scale is LIVE *unless* a one-shot entrance animation (initial/animate on scale) leaves a residual inline transform at rest that overrides Tailwind's active:scale (the HashtagPage tile situation). In that ambiguous case: keep the existing active:scale untouched, append the ring (a box-shadow, unaffected by transforms), and FLAG the reliability question (do NOT add whileTap — out of scope here).
- Non-interactive div/span/img with no onClick -> NOTHING. Click-catcher backdrop divs (role="dialog"/dismiss-on-click) -> leave alone (no scale/ring); the explicit Close button provides the accessible dismiss.
- ring-inset KEY CSS FACT: `overflow-hidden` clips an element's DESCENDANTS, NOT the element's OWN box-shadow/ring — so a ring on the overflow-hidden element ITSELF is NOT clipped; ring-inset is only needed when the focusable control sits a few px INSIDE a SEPARATE overflow-hidden rounded ancestor, OR a tight grid gutter would make an outward ring bleed into neighbors.
- overflow-x-auto scroller rows: PRECEDENT (GroceryPage/EventsPage/ARFilters tabs) = NORMAL outward ring. NOTE the nuance below for (A).
- Toggle/segmented controls whose pressed-state is conveyed ONLY by background also get aria-pressed (display-only). Controls with visible text get their accessible name from text (no aria-label); icon-only controls need aria-label.

PAGE: src/pages/ChatMediaGalleryPage.tsx (355 lines, /chat-media, ProtectedRoute, SwipeBackContainer)
SKIP: Back (shadcn Button L136); hero banner motion.div L149 (no onClick); loading skeleton divs L183; empty-state div L191; file-row motion.div L260 (NO onClick on wrapper — presentational card; its only interactive child is the download <a>); preview backdrop motion.div L304 (onClick dismiss + role="dialog" — click-catcher, leave alone); inner preview content div L328 (stopPropagation wrapper); <video> L330; <img> L332/L222 (decorative/media).

FIVE controls:

(A) Media-type tab, L166-179 — RAW <button type="button">, .map over `tabs`, onClick={() => setTab(t.id)}. className = cn("shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5", tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted"). transition-all ALREADY present. Selection conveyed ONLY by bg. Visible label + count badge = accessible name. Parent row = `flex gap-2 overflow-x-auto scrollbar-hide` with **NO vertical padding** (unlike ARFilters' py-4). NUANCE: overflow-x:auto makes overflow-y compute to auto, and the buttons fill the row height exactly (no py on the row) -> a ~2px OUTWARD ring's top/bottom 2px MIGHT clip. Precedent (EventsPage/ARFilters/GroceryPage overflow-x-auto tab rows) = outward ring (those had px/py or row-above clearance).

Q-A1: aria-pressed={tab === t.id} + append active:scale-[0.97] (segmented tier) + ring to the cn base — confirm.
Q-A2: OUTWARD ring (follow the overflow-x-auto-tab precedent) or ring-inset (because THIS row has ZERO vertical padding, so an outward ring may trim 2px top/bottom under the computed overflow-y:auto)? I lean OUTWARD for precedent-consistency but flag the no-py nuance — your call, and say WHY.

(B) Photo/video grid tile, L212-242 — motion.button **WITHOUT whileTap** (has a one-shot entrance `initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}}`), onClick={() => setPreview(m)}. ALREADY has aria-label={`${kind} from ${you/partner}, ${relative}`} + existing `active:scale-95 transition-transform`. className = "relative aspect-square rounded-xl overflow-hidden bg-muted active:scale-95 transition-transform". Element ITSELF is rounded-xl overflow-hidden (clips its inner <img>/video-overlay/corner-badges, NOT its own ring). Parent grid `grid grid-cols-3 gap-1.5` (gap-1.5 = 6px gutter).

Q-B1: Append ring ONLY, keep the existing active:scale-95 transition-transform untouched, aria-label already present (no change)? Confirm.
Q-B2: OUTWARD ring (gap-1.5 = 6px gutter gives a 2px ring 4px clearance from neighbors — comfortable, like the HashtagPage gap-2 tiles) or ring-inset (like the tight ExplorePage gap-0.5=2px grids)? I lean OUTWARD (6px is comfortable; the tile's own overflow-hidden doesn't clip its own ring). Confirm.
Q-B3: The entrance animation may leave a residual inline transform that makes the existing active:scale-95 unreliable (HashtagPage situation). Since adding whileTap is OUT of my aria-only scope, I keep active:scale-95 as-is + append the ring (box-shadow, unaffected) + FLAG the reliability to the owner. Agree? (Or is the active:scale-95 reliable here in practice — i.e. does framer clear the transform to none at rest for a completed one-shot scale:1?)

(C) File download link, L285-293 — RAW <a href target rel>, ALREADY aria-label={`Download ${file_name}`} + `active:scale-95 transition-all` + hover:opacity-90. className = "shrink-0 h-9 w-9 rounded-full bg-ig-gradient text-white inline-flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-sm". Inside the file-row motion.div (NOT overflow-hidden). Icon-only (Download) w/ aria-label.

Q-C: Just append ring (icon tier scale-95 + transition-all already present), normal OUTWARD ring (row not overflow-hidden)? Confirm.

(D) Preview Close button, L319-326 — RAW <button type="button">, ALREADY aria-label="Close" + `active:scale-95` but NO transition utility + NO ring. className = "h-9 w-9 rounded-full bg-white/10 backdrop-blur-sm text-white inline-flex items-center justify-center active:scale-95". In the full-screen BLACK preview overlay header (flex row, NOT overflow-hidden). Icon-only (X) w/ aria-label. No hover:bg.

Q-D1: ADD `transition-transform` (pure icon-scale, no hover color — so the existing active:scale-95 eases instead of snapping) + append ring? Confirm tier scale-95 stays.
Q-D2: ring color — house parity = ring-ring, but this sits over a fixed BLACK overlay. Is `focus-visible:ring-ring` visible enough on black, or do you recommend a higher-contrast `ring-white/70`? I lean ring-ring for parity but flag the dark context — your call.

(E) Preview Open-file link, L334-341 — RAW <a href target rel> (shown when preview.kind === "file"), visible text "Open {file_name}" (= accessible name), ALREADY `active:scale-95 transition-all` + hover:opacity-90, NO ring. className = "px-6 py-3 rounded-full bg-ig-gradient text-white font-bold text-sm shadow-lg shadow-rose-500/30 hover:opacity-90 active:scale-95 transition-all inline-flex items-center gap-2". Centered in preview content area (NOT overflow-hidden).

Q-E: Just append ring (active:scale-95 + transition-all already present; keep 95 — don't churn to [0.97]/[0.98]), normal OUTWARD ring, visible text → no aria-label? Confirm.

============================================================
DELIVERABLE: For each control (A)(B)(C)(D)(E) give the EXACT final className string + any attrs. Note where you DIVERGE from my proposals and why. Resolve the A2/B2/B3/D2 judgment calls explicitly. Keep it tight.
- files: src/pages/ChatMediaGalleryPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

Five controls, five className edits, one new attribute (`aria-pressed` on tab), one new utility (`transition-transform` on Close). All outward rings. Total: **6 ins / 5 del** (+1 net = the `aria-pressed` line). Zero logic/handler changes.

---

## Exact Changes

### (A) Media-type tab — **agree with all your calls; OUTWARD ring + flag**

**Decision on A2:** Outward ring, for these reasons:
1. 22+ prior slices all use outward rings on `overflow-x-auto` tab rows — strong precedent.
2. `ring-inset` would visually shrink/inset the ring, breaking consistency with every other segmented tab in the repo.
3. The 2px box-shadow clipping (if any) under the computed `overflow-y: auto` is cosmetically negligible — the ring's top/bottom edges are the least visible parts of a rounded-full ring anyway.
4. **Flag to owner:** if visible clipping is ever noticed, add `py-0.5` to the row div for clearance.

**Attr:** add `aria-pressed={tab === t.id}` (new line on `<button>`).

**Before (className string inside `cn()`):**
```
"shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5"
```

**After:**
```
"shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring inline-flex items-center gap-1.5"
```

`transition-all` already present → just appended `active:scale-[0.97]` + ring after it.

---

### (B) Photo/video grid tile — **agree with all your calls; OUTWARD ring + flag B3**

**B2 decision:** Outward ring. Gap-1.5 (6px) gives the 2px ring 4px clearance from neighbors — comfortable, same as HashtagPage `gap-2` tiles. The tile's own `overflow-hidden` clips its *descendants* (the inner `<img>`/overlays), not its own box-shadow ring.

**B3 decision:** Agree — the entrance animation's resting state leaves an inline `transform: scale(1)` from framer-motion, which overrides Tailwind's `active:scale-95` (inline styles beat CSS class selectors). The existing `active:scale-95` is **unreliable at rest**. Since adding `whileTap` is out of scope: keep `active:scale-95` as-is (don't touch), append the ring (`box-shadow` is unaffected by transform conflicts), and **flag to owner** that `whileTap={{ scale: 0.95 }}` should be added for reliable press feedback (or the entrance animation should be refactored to not leave a residual transform).

**No attr changes** (aria-label already present, byte-identical).

**Before:**
```
"relative aspect-square rounded-xl overflow-hidden bg-muted active:scale-95 transition-transform"
```

**After:**
```
"relative aspect-square rounded-xl overflow-hidden bg-muted active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

### (C) File download link — **confirm, no divergence**

**No attr changes** (aria-label already present).

**Before:**
```
"shrink-0 h-9 w-9 rounded-full bg-ig-gradient text-white inline-flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-sm"
```

**After:**
```
"shrink-0 h-9 w-9 rounded-full bg-ig-gradient text-white inline-flex items-center justify-center hover:opacity-90 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-sm"
```

Outward ring (file-row `motion.div` is NOT `overflow-hidden`; comfortable placement).

---

### (D) Preview Close button — **confirm D1; for D2, use `ring-ring` for parity + flag**

**D2 decision:** `ring-ring` for house parity. The `--ring` custom property is typically a medium-gray or primary hue that's visible on both light and dark backgrounds. On a pure black overlay it should read as a subtle but visible focus indicator. If the owner finds it too dim, they can swap to `ring-white/70` — but I won't break parity preemptively across 22+ slices for one dark overlay.

**D1 confirmed:** add `transition-transform` (no `hover:bg` color → pure icon-scale utility) so the existing `active:scale-95` eases instead of snapping.

**No attr changes** (aria-label already present).

**Before:**
```
"h-9 w-9 rounded-full bg-white/10 backdrop-blur-sm text-white inline-flex items-center justify-center active:scale-95"
```

**After:**
```
"h-9 w-9 rounded-full bg-white/10 backdrop-blur-sm text-white inline-flex items-center justify-center active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

### (E) Preview Open-file link — **confirm, no divergence**

**No attr changes** (visible text "Open {file_name}" = accessible name; no aria-label needed).

**Before:**
```
"px-6 py-3 rounded-full bg-ig-gradient text-white font-bold text-sm shadow-lg shadow-rose-500/30 hover:opacity-90 active:scale-95 transition-all inline-flex items-center gap-2"
```

**After:**
```
"px-6 py-3 rounded-full bg-ig-gradient text-white font-bold text-sm shadow-lg shadow-rose-500/30 hover:opacity-90 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring inline-flex items-center gap-2"
```

Keep `active:scale-95` (don't churn to `[0.98]`). Outward ring (centered in preview content div, not overflow-hidden).

---

## Summary diff

```diff
--- a/src/pages/ChatMediaGalleryPage.tsx
+++ b/src/pages/ChatMediaGalleryPage.tsx
@@ -166,12 +166,13 @@
           {tabs.map((t) => (
             <button
               key={t.id}
               type="button"
               onClick={() => setTab(t.id)}
+              aria-pressed={tab === t.id}
               className={cn(
-                "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5",
+                "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring inline-flex items-center gap-1.5",
                 tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
               )}
@@ -217,7 +218,7 @@
                   onClick={() => setPreview(m)}
-                  className="relative aspect-square rounded-xl overflow-hidden bg-muted active:scale-95 transition-transform"
+                  className="relative aspect-square rounded-xl overflow-hidden bg-muted active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                   aria-label={`${m.kind === "video" ? "Video" : "Photo"} from ${isMine ? "you" : "partner"}, ${formatRelative(m.created_at)}`}
@@ -289,7 +290,7 @@
                   aria-label={`Download ${m.file_name}`}
-                  className="shrink-0 h-9 w-9 rounded-full bg-ig-gradient text-white inline-flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-sm"
+                  className="shrink-0 h-9 w-9 rounded-full bg-ig-gradient text-white inline-flex items-center justify-center hover:opacity-90 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-sm"
@@ -321,7 +322,7 @@
                 aria-label="Close"
                 onClick={(e) => { e.stopPropagation(); setPreview(null); }}
-                className="h-9 w-9 rounded-full bg-white/10 backdrop-blur-sm text-white inline-flex items-center justify-center active:scale-95"
+                className="h-9 w-9 rounded-full bg-white/10 backdrop-blur-sm text-white inline-flex items-center justify-center active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
@@ -337,7 +338,7 @@
                   rel="noopener noreferrer"
-                  className="px-6 py-3 rounded-full bg-ig-gradient text-white font-bold text-sm shadow-lg shadow-rose-500/30 hover:opacity-90 active:scale-95 transition-all inline-flex items-center gap-2"
+                  className="px-6 py-3 rounded-full bg-ig-gradient text-white font-bold text-sm shadow-lg shadow-rose-500/30 hover:opacity-90 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring inline-flex items-center gap-2"
```

**Diff stats:** 6 insertions / 5 deletions (+1 net = the `aria-pressed` attribute line).

---

## Owner flags (NOT fixed — out of scope)

1. **Grid tile `active:scale-95` unreliable** — the entrance animation `initial={{scale:0.96}} animate={{scale:1}}` leaves framer-motion's inline `transform: scale(1)` at rest, which overrides Tailwind's `active:scale-95` (inline > CSS). Fix: add `whileTap={{ scale: 0.95 }}` to the `motion.button` for guaranteed press feedback. The focus ring (box-shadow) is unaffected.

2. **Tab row zero-py nuance** — `overflow-x: auto` computes `overflow-y: auto`; the buttons fill the row height exactly (no vertical padding on the row). A 2px outward ring may clip 1-2px at top/bottom. Fix if visible: add `py-0.5` to the row.

3. **Close button ring on black overlay** — `ring-ring` uses the theme's `--ring` value; if too dim on the fixed black preview overlay, swap to `ring-white/70` on that single control.

4. **Sub-44px tap targets** (established repo pattern) — tab chips ~26px tall, grid-tile touch target is fine (square ~112px), download/close buttons 36px, Open-file ~44px.

---

## Verify

`npm run update` must pass (type-check + worker type-check + production build, true exit 0). Preview at `/chat-media` (auth-gated + needs `chat_media` rows for non-empty states).
