# DeepSeek run — 2026-06-14T07:01:34.376Z

- model: deepseek-chat
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

# Plan

Two controls to edit in `src/pages/PromotePage.tsx`:

**A) Post-picker tile (L207)** — `motion.button` with `whileTap={{ scale: 0.96 }}`:
- **ring-ONLY** (no CSS `active:scale` — whileTap is the press)
- **`ring-white/70`** — media surface (photos/video), black `ring-ring` invisible on dark media
- **`ring-inset`** — `gap-2` (8px) leaves room, but the tile has an absolutely-positioned `inset-0 bg-ig-gradient p-[3px]` gradient-border selection zone; an outward ring would overlap the 8px gap AND the gradient-border zone. Inset sits cleanly inside the tile's border-box.
- **`aria-pressed={isSelected}`** — persistent single-select picker (matches the tier card's pattern); the existing `aria-label` describes the action, `aria-pressed` conveys state. Both are valid and complementary.
- **No flip** — `transition-all` already present
- **`focus-visible:ring-2` is redundant** with the base `ring-2` but harmless/explicit. Append the full standard focus ring string.

**B) Tier card (L253)** — `motion.button`, no whileTap, already `transition-all`:
- **`active:scale-[0.98]`** — wide full-width card WITH its own `bg-card` bordered surface
- **No flip** — `transition-all` already present
- **OUTWARD `ring-ring`** — `bg-card` on neutral `bg-background`, not a flush child of a rounded overflow-hidden parent
- **No new aria** — already has `aria-pressed={isSelected}`
- **`focus-visible:ring-ring` coexists correctly** with the selected `ring-2 ring-rose-500/30` — the focus ring only appears during keyboard focus, overriding the selection ring temporarily (standard pattern)

**LEAVE list confirmed:** shadcn Back Button (L132), shadcn "Share a post" Button (L191), shadcn "Boost post" Button (L315), SwipeBackContainer/SEOHead wrappers, gradient banner motion.div (L152), selection gradient-border div (L218), Check badge (L232), all icons/media.

---

# Diff

```diff
--- a/src/pages/PromotePage.tsx
+++ b/src/pages/PromotePage.tsx
@@ -204,7 +204,8 @@ export default function PromotePage() {
                     className={cn(
                       "relative aspect-square rounded-xl overflow-hidden bg-muted ring-2 transition-all",
                       isSelected ? "ring-transparent" : "ring-border/0",
-                    )}
+                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-inset"
+                    )}
                     aria-label={`Select post${post.caption ? `: ${post.caption.slice(0, 40)}` : ""}`}
+                    aria-pressed={isSelected}
                   >
```

```diff
@@ -253,7 +255,8 @@ export default function PromotePage() {
                   className={cn(
                     "w-full text-left p-4 rounded-2xl border transition-all relative overflow-hidden",
                     isSelected
                       ? "border-transparent ring-2 ring-rose-500/30 bg-card shadow-md"
                       : "border-border bg-card hover:bg-secondary/30",
+                    "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                   )}
                   aria-pressed={isSelected}
```

---

# Owner verification

1. Run `npm run update` — must pass (type-check + worker + build)
2. Preview at 375px viewport: verify the 3-col post grid tiles have keyboard focus rings (Tab through), and the tier cards have press scale + focus rings
3. Confirm `aria-pressed` on post tiles doesn't conflict with screen reader behavior (both `aria-label` + `aria-pressed` is valid — label describes action, pressed conveys state)
4. The `focus-visible:ring-2` is technically redundant with the base `ring-2` on the post tile — if you prefer minimalism, you could use just `focus-visible:ring-white/70 focus-visible:ring-inset` (the `ring-2` from the base class already sets width). I kept it explicit for clarity.
