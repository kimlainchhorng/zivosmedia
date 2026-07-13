# MiMo run — 2026-06-14T07:26:25.884Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/SoundPage.tsx (252-line "Sound" page — a TikTok-style audio page: shows every reel using a specific sound + a "Use this sound" CTA. REAL Supabase `useQuery ["sound-reels", slug]` querying BOTH `store_posts` AND `user_posts` by `audio_name` across name-variant search terms, dedup+merge+sort; AUTH-aware via useAuth (`enabled: !!slug`); `useState showCreatePost`; `useMemo searchTerms`; renders a CreatePostModal when showCreatePost. Layout: sticky header [raw icon Back + ig-gradient sound-title + reel/views count] + a sound-info card [spinning vinyl icon + title/artist/genre/duration + a conditional "Use this sound" CTA] + a 3-col reel grid [each tile a button → navigate to /reels/:id, showing a video/img thumbnail or a Music placeholder + a hover Play overlay + an optional view-count badge]). RULES: className strings + display-only attributes (aria-*) ONLY; preserve ALL logic, onClick, navigate, setShowCreatePost, useQuery/Supabase queries, byte-identical. Don't add a SECOND competing press effect (framer whileTap vs CSS active:scale). Don't churn already-polished controls. Don't renumber an existing scale (the "Use this sound" CTA already carries active:scale-[0.98] — LEAVE that number).

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD default. `focus-visible:ring-inset` ONLY when the control is a flush edge child of a rounded overflow-hidden PARENT (so an outward box-shadow ring would be clipped), OR a flush media tile in a NEAR-GAPLESS grid (gap-[2px]/gap-0.5 = near-gapless → inset; gap-2/gap-3 has clearance → outward).
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring; saturated/dark/IMAGE/MEDIA surface AS THE PARENT (or a ring rendering OVER media — e.g. an INSET ring on a media tile, OR an outward ring in a near-gapless media grid) = ring-white/70. A gradient-FILLED button (bg-ig-gradient) on a NEUTRAL parent still uses ring-ring (the ring renders against the neutral parent, not the button's own fill).
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip/tab active:scale-[0.97]; wide full-width row/card WITH its own surface active:scale-[0.98]; BARE full-width row NO own surface active:scale-[0.99]; media/image grid TILE — your call.
- transition rule: transition-transform when scale is the ONLY animated prop ON THE BUTTON; transition-all when ALSO hover:bg/text/border/opacity OR existing color wash ON THE BUTTON ITSELF. FLIP RULE: transition-colors/transition-opacity GAINING a NEW active:scale MUST flip to transition-all. NO transition class at all + adding scale + a hover:bg ON THE BUTTON → use transition-all. ALREADY transition-transform with NO hover (scale only) → append ring without flipping. A hover/transition that lives on a CHILD element (not the button) does NOT force the button to gain a color transition.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select segmented filter/tab/picker OR a two-way toggle whose on/off is bg-conveyed. NOT aria-pressed on one-shot actions (nav, open-modal).

CONTROLS (give me per control: exact final after-string of appended classes, ring color + reason, press tier, transition class + whether a FLIP is needed, ring-inset vs outward + reason, and any aria-* attr; flag any to LEAVE):

A) L134 HEADER BACK button (raw `<button>`, icon-only ArrowLeft, one-shot `onClick={() => navigate(-1)}`, base `p-1.5 rounded-full hover:bg-muted/50`, has hover:bg, NO transition class, NO scale, NO focus, NO aria). Parent = sticky header `bg-background/95 backdrop-blur` (neutral). → plan: ADD `aria-label="Back"` (icon-only) + APPEND `active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (icon tier active:scale-95 NEW; the button has hover:bg-muted/50 + gains a scale + had NO transition class → transition-all [covers both hover-bg and transform]; OUTWARD ring-ring on neutral header). Confirm tier + transition-all (NEW, not a flip-from-colors since there was no transition class) + OUTWARD ring-ring + aria-label.

B) L174 "USE THIS SOUND" CTA (raw `<button>`, conditional on `user`, one-shot `onClick={() => setShowCreatePost(true)}` opens CreatePostModal, VISIBLE text "Use this sound" + Music icon, base `mt-4 w-full py-2.5 rounded-xl bg-ig-gradient text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform`, ALREADY active:scale-[0.98] + transition-transform, NO hover, NO focus). Parent = the sound-info card section on the page `bg-background` (neutral). → plan: ring-ONLY append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (LEAVE active:scale-[0.98] — don't renumber; transition-transform scale-only NO hover → NO flip; OUTWARD ring-ring — bg-ig-gradient is the button's OWN fill, ring renders against the neutral page parent; NO aria — visible text, one-shot open-modal). Confirm ring color + no-flip + no-aria + keep [0.98].

C) L203 REEL GRID TILE button (raw `<button>`, mapped per post, one-shot `onClick={() => navigate(`/reels/${post.id}`)}`, content = a `<video>`/`<img object-cover>` thumbnail OR a Music-icon placeholder [IMAGE/MEDIA, NO visible text label], plus a `group-hover` Play overlay [a child `<div>` with its OWN `transition-colors` + a child Play icon with its OWN `transition-opacity`], base `relative aspect-[9/16] bg-muted overflow-hidden group`, NO transition ON THE BUTTON, NO scale, NO focus, NO aria). Parent grid = `grid grid-cols-3 gap-0.5` (gap-0.5 = 2px = NEAR-GAPLESS media grid). → plan: ADD `aria-label={`View reel by ${post.author_name}`}` (image/media-only tile, no visible text) + APPEND a press tier + `transition-transform` (scale-only ON THE BUTTON — the hover overlay lives on CHILD elements which keep their own transition-colors/opacity, so the button does NOT gain transition-all) + ring. OPEN QUESTIONS for you: (1) PRESS TIER for a near-gapless media grid tile — active:scale-[0.98] (medium tile) vs active:scale-95 (your judgment)? (2) ring-inset vs OUTWARD — gap-0.5 (2px) near-gapless grid → INSET (an outward ring would overlap the immediate neighbor tiles)? (3) ring COLOR — ring-white/70 (the tile IS a media/image surface AND the ring renders OVER the media as an inset) vs ring-ring? Resolve all three + give the exact final after-string. (4) confirm `transition-transform` NOT transition-all (button's own only-animated prop is the scale; the hover overlay is on children).

ALSO CONFIRM I should LEAVE these: the spinning vinyl `<div>` L149 (decorative anim); the `<svg>` music-note (decorative); the CreatePostModal (own component); Helmet/VerifiedBadge (non-visual/own); the loading spinner div L192; the view-count badge `<div>`s + genre/duration `<span>`s (non-interactive); the Play/Music/Users/Grid3X3/Eye/ArrowLeft icons (decorative); the child group-hover overlay `<div>` + Play icon (presentational, keep their own transition-colors/opacity).

Be concise and exact. Return the precise final className after-string per control + any aria attr. C is a mapped template (single edit hits every reel tile). Resolve C's three open questions (tier + inset-vs-outward + ring color for a gap-0.5 near-gapless media grid tile) explicitly.
- files: src/pages/SoundPage.tsx

---

## Plan

3 raw `<button>` controls on `SoundPage.tsx` need the house interaction+focus tokens. No logic touches; className strings + `aria-label` only.

---

## Resolutions for C's open questions

| # | Question | Answer | Why |
|---|----------|--------|-----|
| 1 | Press tier | **`active:scale-[0.98]`** (medium tile) | `aspect-[9/16]` portrait tiles ≈122×217px on mobile — medium-large tile, `[0.98]` is the right subtlety for a near-gapless grid to avoid neighbor bleed. |
| 2 | Inset vs outward | **`ring-inset`** | `gap-0.5` (2px) = near-gapless per the rule; an outward box-shadow ring would overlap immediate neighbor tiles. |
| 3 | Ring color | **`ring-white/70`** | The inset ring renders OVER the media content (video/img). Per the rule: "a ring rendering OVER media — e.g. an INSET ring on a media tile" → `ring-white/70`. |
| 4 | transition class | **`transition-transform`** (NOT `transition-all`) | The button's own only-animated prop is scale. The hover overlay is on a CHILD `<div>` with its own `transition-colors`; the child's transitions don't force the button to gain color transitions. No flip needed (no existing transition class to flip from). |

---

## Diff — `src/pages/SoundPage.tsx`

### A) Header Back button (L134)

**Before:**
```tsx
<button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-muted/50">
```

**After:**
```tsx
<button type="button" onClick={() => navigate(-1)} aria-label="Back" className="p-1.5 rounded-full hover:bg-muted/50 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

| Token | Value | Reason |
|-------|-------|--------|
| aria | `aria-label="Back"` | Icon-only, no visible text |
| Press | `active:scale-95` NEW | Icon-only tier |
| Transition | `transition-all` NEW | Button has `hover:bg-muted/50` + gains scale; no prior transition class → `transition-all` covers both (not a flip — there was nothing to flip from) |
| Ring | `ring-ring` OUTWARD | Neutral header `bg-background/95` |

### B) "Use this sound" CTA (L174)

**Before:**
```tsx
className="mt-4 w-full py-2.5 rounded-xl bg-ig-gradient text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
```

**After:**
```tsx
className="mt-4 w-full py-2.5 rounded-xl bg-ig-gradient text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

| Token | Value | Reason |
|-------|-------|--------|
| Press | `[0.98]` KEPT | Don't renumber existing scale |
| Transition | `transition-transform` KEPT | Scale-only, no hover on button → no flip |
| Ring | `ring-ring` OUTWARD | `bg-ig-gradient` is the button's OWN fill; ring renders against neutral page `bg-background` |
| aria | NONE | Visible text "Use this sound"; one-shot open-modal |

### C) Reel grid tile (L203 — mapped template, single edit hits every tile)

**Before:**
```tsx
className="relative aspect-[9/16] bg-muted overflow-hidden group"
```

**After:**
```tsx
aria-label={`View reel by ${post.author_name}`}
className="relative aspect-[9/16] bg-muted overflow-hidden group active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
```

| Token | Value | Reason |
|-------|-------|--------|
| aria | `aria-label={...}` | Image/media-only tile, no visible text label |
| Press | `active:scale-[0.98]` NEW | Medium tile tier (≈122×217px portrait) |
| Transition | `transition-transform` NEW | Scale is the only animated prop on the button; hover overlay lives on child `<div>` with its own `transition-colors` |
| Ring | `ring-white/70` INSET | Near-gapless grid (`gap-0.5` = 2px) → inset to avoid bleed; inset ring renders OVER media content → white |

---

## Confirmed LEAVE list

All correct — do not touch:

- Spinning vinyl `<div>` L149 (decorative animation)
- `<svg>` music-note (decorative)
- `CreatePostModal` (own component, manages its own internals)
- `Helmet` / `VerifiedBadge` (non-visual / own tokens)
- Loading spinner `<div>` L192 (decorative)
- View-count badge `<div>`s + genre/duration `<span>`s (non-interactive)
- All icons: Play, Music, Users, Grid3X3, Eye, ArrowLeft (decorative)
- Child group-hover overlay `<div>` + Play icon (presentational; they keep their own `transition-colors` / `transition-opacity` — not the button's own props)

---

## Hard-rule guard grep (expected over the diff)

| Metric | Count |
|--------|-------|
| `−`/`+` className edits | 3 (A, B, C) |
| `aria-label` new | 2 (A Back, C reel tile) |
| `focus-visible:ring` total | 3 |
| `ring-ring` | 2 (A OUTWARD, B OUTWARD) |
| `ring-inset` | 1 (C) |
| `ring-white/70` | 1 (C) |
| `active:scale-95` new | 1 (A) |
| `active:scale-[0.98]` kept | 1 (B, unchanged) |
| `active:scale-[0.98]` new | 1 (C) |
| FLIPs | 0 |
| Logic lines touched | 0 |

---

## Verify / Deploy

Run **`npm run update`** (type-check + worker type-check + production build) — must pass with exit 0 before moving to Done.
