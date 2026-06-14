# MiMo run — 2026-06-14T07:02:41.800Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/PromotePage.tsx (327-line "Promote" — boost reach for a creator's posts: REAL Supabase useQuery ["promote-posts", user.id] reading the user's own `user_posts` (limit 20); AUTH-aware via useAuth, enabled:!!user.id; mock-priced boost TIERS (starter/growth/viral); useState selectedPostId/selectedTier; sticky header [shadcn ghost icon Back + ig-gradient Promote title] + a gradient banner + STEP 1 a 3-col post-picker GRID (single-select) + STEP 2 a tier-card list (single-select) + a fixed bottom CTA bar [Total + shadcn "Boost post" Button]; handleBoost → trackMarketingEvent + toast). RULES: className strings + display-only attributes (aria-*) ONLY; preserve ALL logic, onClick, navigate, setState (setSelectedPostId/setSelectedTier), useQuery/Supabase query, handleBoost/trackMarketingEvent, byte-identical. Don't add a SECOND competing press effect (framer whileTap vs CSS active:scale). Don't churn already-polished controls. Don't churn shadcn <Button> (ships own focus/scale tokens). Don't renumber an existing scale. Don't clobber an existing selection-conveying ring-2.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD default. `focus-visible:ring-inset` ONLY when the control is a flush edge child of a rounded overflow-hidden PARENT, OR a flush media tile in a near-gapless grid where an outward ring would overlap neighbors.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring; saturated/dark/image surface AS THE PARENT (or effectively rendering over media in a flush grid) = ring-white/70.
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip/tab active:scale-[0.97]; wide full-width row/card WITH its own bordered/filled surface active:scale-[0.98]; BARE full-width row NO own surface active:scale-[0.99]; media/image grid TILE — your call.
- transition rule: transition-transform when scale is the ONLY animated prop; transition-all when ALSO hover:bg/text/border OR existing color/opacity wash. FLIP RULE: transition-colors/transition-opacity GAINING a NEW active:scale MUST flip to transition-all. ALREADY transition-all → append without flipping. ALREADY framer whileTap → append the focus ring ONLY (NO CSS active:scale — the "second competing press").
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select segmented filter/tab/picker OR a two-way toggle whose on/off is bg-conveyed. NOT aria-pressed on one-shot actions (nav, open-preview, close).

CONTROLS (give me per control: exact final after-string of appended classes, ring color + reason, press tier, transition class + whether a FLIP is needed, ring-inset vs outward + reason, and any aria-* attr; flag any to LEAVE):

A) L207 POST-PICKER tile (`motion.button`, mapped over `posts`, single-select post picker [`selectedPostId` persists and drives the boost target], ALREADY `whileTap={{ scale: 0.96 }}`, ALREADY `aria-label={`Select post${caption ? ": ..." : ""}`}`, one-shot `onClick={() => setSelectedPostId(post.id)}`): base via cn 1st arg `relative aspect-square rounded-xl overflow-hidden bg-muted ring-2 transition-all`, cn 2nd arg toggles `isSelected ? "ring-transparent" : "ring-border/0"` — i.e. the element ALREADY carries a `ring-2` (effectively invisible: transparent/border-0; the REAL selection visual is an absolutely-positioned `bg-ig-gradient p-[3px]` gradient-border div + a white Check badge). Parent = `grid grid-cols-3 gap-2` (8px gap) of photo/video media tiles. → plan: **ring-ONLY append** (whileTap IS the press → NO CSS active:scale [no double-press]; no flip — ring needs no transition, keep `transition-all`) + **ADD `aria-pressed={isSelected}`** (persistent single-select picker — to match the sibling tier card in B which already has aria-pressed; the existing aria-label is the action NAME, aria-pressed conveys STATE). OPEN QUESTIONS for you: (1) since the element ALREADY has `ring-2` (vestigial, transparent), do I append just `focus-visible:ring-white/70` (+`focus-visible:outline-none`), or the full `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70` (the `focus-visible:ring-2` is redundant with the base `ring-2` but harmless/explicit)? (2) ring COLOR — ring-white/70 (tile is photo/video MEDIA surface; black ring-ring would vanish on dark media) vs ring-ring? (3) ring-inset vs OUTWARD — gap-2 (8px) leaves SOME room for an outward ring, but the tile is a media tile with an inset-[3px] gradient-border selection zone; is inset or outward cleaner? (4) is `aria-pressed={isSelected}` warranted here, or LEAVE aria as-is (already has an action aria-label)? Resolve all four.

B) L253 TIER card (`motion.button`, mapped over `TIERS` ×3, single-select tier picker, ALREADY `aria-pressed={isSelected}`, selection bg/ring-conveyed `border-transparent ring-2 ring-rose-500/30 bg-card shadow-md` [selected] vs `border-border bg-card hover:bg-secondary/30`, NO whileTap, one-shot `onClick={() => setSelectedTier(t.id)}`): base via cn 1st arg `w-full text-left p-4 rounded-2xl border transition-all relative overflow-hidden`. ALREADY `transition-all`, NO scale/focus. Parent = `space-y-2.5` stack on bg-background. → plan: APPEND into cn 1st arg `active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (wide full-width card WITH its own bordered `bg-card` surface → tier `[0.98]`; **NO flip** — `transition-all` already present; OUTWARD `ring-ring` — `bg-card` on neutral `bg-background`, the card is NOT a flush child of a rounded overflow-hidden parent so no inset needed; the selected `ring-2 ring-rose-500/30` is overridden by `focus-visible:ring-ring` only during keyboard focus = standard pattern; NO new aria — already has aria-pressed). Confirm tier `[0.98]` + no-flip + OUTWARD ring-ring + that focus-visible:ring-ring coexisting with the selected ring-rose-500/30 is correct + no new aria.

ALSO CONFIRM I should LEAVE these: the shadcn ghost-icon Back `<Button>` L132 (aria-label="Back" already, own tokens); the shadcn "Share a post" `<Button>` L191 (empty-state CTA, own tokens); the shadcn "Boost post" `<Button>` L315 (sticky-CTA, `disabled={!selectedPostId}`, own tokens); SwipeBackContainer/SEOHead (wrappers/non-visual); the gradient banner motion.div L152 (entrance anim, NO onClick); the selection gradient-border div L218 + Check badge L232 (decorative selection visuals); Sparkles/Eye/TrendingUp/Zap/Film/Check/ImageIcon icons + media img/video (decorative/media).

Be concise and exact. Return the precise final className after-string per control + any aria attr. A/B are mapped templates (single edit hits every tile / every tier). Resolve A's four open questions explicitly.
- files: src/pages/PromotePage.tsx

---

## Plan

Two mapped controls to edit (A and B). Two aria attrs. Zero logic changes. Both are mapped templates — single edit hits every tile / every tier.

---

## Resolving A's four open questions

**Q1 (full `focus-visible:ring-2` or just `focus-visible:ring-white/70`?)**
Include the full triplet: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`. The base `ring-2` is always-on with a toggling color (`ring-transparent` / `ring-border/0`), so the `focus-visible:ring-2` is technically redundant — but harmless, explicit, and matches the vocabulary's standard pattern. Consistency > cleverness.

**Q2 (ring color)**
**`ring-white/70`**. The tile is a photo/video media surface. Black `ring-ring` vanishes on dark media. This is the media-grid pattern established on StoryArchivePage (B) and AdultDiscoveryPage (E).

**Q3 (inset vs outward)**
**OUTWARD**. The grid gap is `gap-2` (8px) — ample room for an outward 2px ring. The "near-gapless" inset rule applies only to ≤4px gaps (StoryArchivePage's `gap-[2px]`). The inner `inset-[3px]` gradient-border selection zone sits inside the tile, not at the tile edge, so no visual collision. `overflow-hidden` clips descendants, not the element's own `box-shadow`.

**Q4 (`aria-pressed` warranted?)**
**YES — add `aria-pressed={isSelected}`**. The post-picker is a persistent single-select picker, identical in semantics to the tier card (B) which already carries `aria-pressed`. The existing `aria-label` is the action name ("Select post: …"); `aria-pressed` conveys the selection state. Complementary, not redundant.

---

## Proposed diff — `src/pages/PromotePage.tsx`

### Control A — Post-picker tile (L207 `motion.button`)

**Before (line ~207–213):**
```tsx
<motion.button
  key={post.id}
  type="button"
  whileTap={{ scale: 0.96 }}
  onClick={() => setSelectedPostId(post.id)}
  className={cn(
    "relative aspect-square rounded-xl overflow-hidden bg-muted ring-2 transition-all",
    isSelected ? "ring-transparent" : "ring-border/0",
  )}
  aria-label={`Select post${post.caption ? `: ${post.caption.slice(0, 40)}` : ""}`}
>
```

**After:**
```tsx
<motion.button
  key={post.id}
  type="button"
  whileTap={{ scale: 0.96 }}
  onClick={() => setSelectedPostId(post.id)}
  className={cn(
    "relative aspect-square rounded-xl overflow-hidden bg-muted ring-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
    isSelected ? "ring-transparent" : "ring-border/0",
  )}
  aria-label={`Select post${post.caption ? `: ${post.caption.slice(0, 40)}` : ""}`}
  aria-pressed={isSelected}
>
```

**Spec:**
| | Value |
|---|---|
| Append | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70` |
| Ring color | `ring-white/70` — media tile, black ring invisible on dark photos/video |
| Ring direction | OUTWARD — `gap-2` (8px) leaves room; not near-gapless |
| Press | whileTap `{ scale: 0.96 }` IS the press → **NO CSS `active:scale`** (no double-press) |
| Transition | KEEP `transition-all` — no flip needed (no new CSS scale added) |
| aria | **ADD `aria-pressed={isSelected}`** (persistent single-select picker, matches B) |

---

### Control B — Tier card (L253 `motion.button`)

**Before (line ~253–261):**
```tsx
<motion.button
  key={t.id}
  type="button"
  initial={{ opacity: 0, y: 6 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: idx * 0.04 }}
  onClick={() => setSelectedTier(t.id)}
  className={cn(
    "w-full text-left p-4 rounded-2xl border transition-all relative overflow-hidden",
    isSelected
      ? "border-transparent ring-2 ring-rose-500/30 bg-card shadow-md"
      : "border-border bg-card hover:bg-secondary/30",
  )}
  aria-pressed={isSelected}
>
```

**After:**
```tsx
<motion.button
  key={t.id}
  type="button"
  initial={{ opacity: 0, y: 6 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: idx * 0.04 }}
  onClick={() => setSelectedTier(t.id)}
  className={cn(
    "w-full text-left p-4 rounded-2xl border transition-all relative overflow-hidden active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    isSelected
      ? "border-transparent ring-2 ring-rose-500/30 bg-card shadow-md"
      : "border-border bg-card hover:bg-secondary/30",
  )}
  aria-pressed={isSelected}
>
```

**Spec:**
| | Value |
|---|---|
| Append | `active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| Ring color | `ring-ring` — `bg-card` on neutral `bg-background` |
| Ring direction | OUTWARD — card is NOT a flush child of rounded overflow-hidden parent |
| Press tier | `[0.98]` — wide full-width card with own bordered `bg-card` surface |
| Transition | KEEP `transition-all` — already present, no flip needed |
| Focus vs selection ring | `focus-visible:ring-ring` overrides `ring-rose-500/30` during keyboard focus (higher pseudo-class specificity); standard pattern |
| aria | NONE new — already has `aria-pressed={isSelected}` |

---

### LEAVE (confirmed, no touch)

- **Shadcn Back `<Button>` L132** — `aria-label="Back"`, own tokens ✓
- **Shadcn "Share a post" `<Button>` L191** — empty-state CTA, own tokens ✓
- **Shadcn "Boost post" `<Button>` L315** — `disabled={!selectedPostId}`, own tokens ✓
- **SwipeBackContainer / SEOHead** — wrappers/non-visual ✓
- **Gradient banner `motion.div` L152** — entrance anim, no onClick ✓
- **Selection gradient-border div L218 + Check badge L232** — decorative selection visuals ✓
- **All icons** (Sparkles/Eye/TrendingUp/Zap/Film/Check/ImageIcon) — decorative ✓
- **Media `img`/`video`** — media content ✓

---

## Guard summary

- **Edits:** 2 className edits (A cn 1st arg append, B cn 1st arg append)
- **aria attrs:** 2 — `aria-pressed={isSelected}` on A (new); B's `aria-pressed` kept (pre-existing)
- **`focus-visible:ring` count:** 2
- **Ring colors:** `ring-white/70` ×1 (A), `ring-ring` ×1 (B)
- **Ring-inset:** 0
- **`active:scale` new:** 1 (B `[0.98]`)
- **FLIPs:** 0
- **`transition-colors` removed:** 0
- **Logic lines touched:** 0 (every `onClick`/`setSelectedPostId`/`setSelectedTier`/`useQuery`/`handleBoost`/`trackMarketingEvent` byte-identical)
- **Controls NOT edited:** Back Button, Share CTA Button, Boost CTA Button, SwipeBackContainer, SEOHead, gradient banner, gradient-border div, Check badge, all icons, all media

## Verification

Run `npm run update` — must exit 0 (type-check + worker type-check + production build). Preview at 375/768/1280 — post-picker grid and tier cards should be unchanged visually except for focus rings appearing on keyboard navigation.
