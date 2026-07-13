# DeepSeek run — 2026-06-14T01:02:05.807Z

- model: deepseek-chat
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

# SLICE 24 — ChatMediaGalleryPage: Interaction Token + A11y Pass

## Plan

Apply className-only interaction tokens + display-only aria attributes to 5 controls on `src/pages/ChatMediaGalleryPage.tsx`. No logic changes, no whileTap additions, no tabIndex/role/onKeyDown.

## Proposed Changes

### (A) Media-type tab, L166-179

**Before:**
```tsx
className={cn(
  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5",
  tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
)}
```

**After:**
```tsx
aria-pressed={tab === t.id}
className={cn(
  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring inline-flex items-center gap-1.5",
  tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
)}
```

**Q-A1:** ✅ Confirmed — `aria-pressed={tab === t.id}` + `active:scale-[0.97]` (segmented tier) + ring.

**Q-A2:** **OUTWARD ring.** The `overflow-x: auto` on the parent row computes `overflow-y: auto`, but the buttons have `py-1.5` (6px vertical padding), and the ring is a `box-shadow` that sits on the button element itself. The button's own `overflow: visible` (default) means the ring is NOT clipped by the button's bounds. The parent's `overflow: auto` clips *overflowing content* of its children, but a 2px box-shadow ring is not "content" — it's a visual effect that extends beyond the element's border box. In practice, the ring will be visible because:
1. The ring is on the button, not the parent
2. The parent's `overflow: auto` clips scrollable content, not box-shadows of children
3. Precedent from EventsPage/GroceryPage/ARFilters tabs all use outward rings with `overflow-x-auto` parents

### (B) Photo/video grid tile, L212-242

**Before:**
```tsx
className="relative aspect-square rounded-xl overflow-hidden bg-muted active:scale-95 transition-transform"
```

**After:**
```tsx
className="relative aspect-square rounded-xl overflow-hidden bg-muted active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Q-B1:** ✅ Confirmed — append ring ONLY, keep existing `active:scale-95 transition-transform` untouched, `aria-label` already present.

**Q-B2:** **OUTWARD ring.** `gap-1.5` = 6px gutter. A 2px outward ring has 4px clearance from neighbors — comfortable. The tile's own `overflow-hidden` clips descendants, not its own box-shadow. This is fundamentally different from the ExplorePage `gap-0.5` (2px gutter) case that forced `ring-inset`.

**Q-B3:** **FLAG the reliability concern.** The entrance animation `initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}}` with `transition={{ delay: idx * 0.015 }}` — after the animation completes, framer sets `transform: none` (it clears the animated value). So the existing `active:scale-95` CSS should be **reliable** here because:
- Framer's `scale: 1` at rest resolves to `transform: none` (no residual inline transform)
- The CSS `active:scale-95` then applies cleanly on press
- This differs from the HashtagPage situation where the entrance animation left a persistent inline transform

However, to be safe, I'll flag it for the owner to verify in preview.

### (C) File download link, L285-293

**Before:**
```tsx
className="shrink-0 h-9 w-9 rounded-full bg-ig-gradient text-white inline-flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-sm"
```

**After:**
```tsx
className="shrink-0 h-9 w-9 rounded-full bg-ig-gradient text-white inline-flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Q-C:** ✅ Confirmed — append ring ONLY, normal outward ring (row not overflow-hidden), keep existing `active:scale-95 transition-all`.

### (D) Preview Close button, L319-326

**Before:**
```tsx
className="h-9 w-9 rounded-full bg-white/10 backdrop-blur-sm text-white inline-flex items-center justify-center active:scale-95"
```

**After:**
```tsx
className="h-9 w-9 rounded-full bg-white/10 backdrop-blur-sm text-white inline-flex items-center justify-center active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
```

**Q-D1:** ✅ Confirmed — ADD `transition-transform` (pure icon-scale, no hover color) so the existing `active:scale-95` eases instead of snapping. Keep scale-95 tier.

**Q-D2:** **`focus-visible:ring-white/70`** — The button sits on a fixed `bg-black` overlay. `ring-ring` would be `hsl(var(--ring))` which is typically a muted gray/blue — on black it would have extremely low contrast. `ring-white/70` provides clear visibility against the dark background while maintaining the semi-transparent aesthetic. This is a justified deviation from house parity due to the unique dark-background context (similar to how we'd use `ring-white` on a dark hero section).

### (E) Preview Open-file link, L334-341

**Before:**
```tsx
className="px-6 py-3 rounded-full bg-ig-gradient text-white font-bold text-sm shadow-lg shadow-rose-500/30 hover:opacity-90 active:scale-95 transition-all inline-flex items-center gap-2"
```

**After:**
```tsx
className="px-6 py-3 rounded-full bg-ig-gradient text-white font-bold text-sm shadow-lg shadow-rose-500/30 hover:opacity-90 active:scale-95 transition-all inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
```

**Q-E:** ✅ Confirmed — append ring ONLY, keep `active:scale-95 transition-all` (don't churn to `[0.97]`/`[0.98]`), normal outward ring, visible text → no aria-label. Using `ring-white/70` for the same dark-background reason as (D).

## Summary of Changes

| Control | Lines | Change | Ring Type |
|---------|-------|--------|-----------|
| (A) Media tabs | 166-179 | `aria-pressed` + `active:scale-[0.97]` + ring | Outward |
| (B) Grid tiles | 212-242 | Ring only | Outward |
| (C) Download link | 285-293 | Ring only | Outward |
| (D) Preview Close | 319-326 | `transition-transform` + ring (`ring-white/70`) | Outward |
| (E) Preview Open-file | 334-341 | Ring only (`ring-white/70`) | Outward |

## Owner Verification

1. **Run `npm run update`** — must pass (type-check + worker type-check + build)
2. **Preview at `/chat-media`** (auth-gated, needs populated `chat_media` rows):
   - Verify tab rings work on all 4 tabs
   - Verify grid tile rings appear on focus (Tab through)
   - Verify download link ring on focus
   - Open a preview (tap a tile) → verify Close button ring on focus (white ring on black)
   - Verify Open-file link ring on focus (white ring on black)
3. **Flag:** (B) grid tile's `active:scale-95` may be unreliable due to framer entrance animation — verify in preview that press-scale works on tiles after entrance animation completes
4. **Flag:** (D) and (E) use `ring-white/70` instead of `ring-ring` due to black overlay background — confirm this is acceptable
