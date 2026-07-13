# MiMo run — 2026-06-14T05:18:58.786Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + a11y QA on ONE customer-facing page: src/pages/ReelEffectsPage.tsx (204 lines, "Browse reel effects catalog", REAL Supabase reel_effects table, NOT auth-gated [public catalog]). One useQuery ["reel-effects"] (.select/.order usage_count desc). useState activeCategory ("All"). categories useMemo (derived set). filtered useMemo (by activeCategory). handleUse(e): if e.is_premium -> toast.info (return); else toast.success + navigate("/feed/new"). formatCount util. Layout: SwipeBackContainer + SEOHead (indexed, no noIndex); sticky header (shadcn back <Button> + Wand2 badge + title); gradient hero stat motion.div (NO onClick); a horizontal category filter pill row (overflow-x-auto scrollbar-hide); loading skeleton grid; empty-state card; then a 2/3-col grid of effect cards (each a motion.button w/ image cover + category/premium badges + Play affordance + name/usage). NO bottom nav.

Reference standard: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring). Precedents: OrderDisputesPage/MyJobApplicationsPage segmented filter (ADD aria-pressed + APPEND active:scale-[0.97] + ring, APPEND-not-flip since transition-all already present); image-card motion.button with whileTap → ring-only.

VERIFIED FACTS (full line-by-line read): exactly 1 RAW <button type="button"> (category filter pill L111) + 1 motion.button (effect card L147) + 1 shadcn back <Button> (L83).
- shadcn back <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full"> (L83) => SKIP (ships tokens, labeled).
- (A) Category filter pill (L111, RAW): onClick={() => setActiveCategory(c)}, VISIBLE constant text = category name {c} (capitalize). cn() base BEFORE: "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize" + conditional active "bg-ig-gradient text-white shadow-sm" / inactive "bg-secondary text-foreground hover:bg-muted". Selection conveyed by BACKGROUND. Sits in a "flex gap-2 overflow-x-auto scrollbar-hide" row (gap-2 between pills; overflow-x-auto is a horizontal scroll container).
- (B) Effect card (L147, motion.button): onClick={() => handleUse(e)}, has whileTap={{ scale: 0.96 }} (framer press) + className BEFORE "relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted shadow-sm text-left active:opacity-90" (HAS active:opacity-90 press, NO ring, NO CSS active:scale — framer whileTap supplies the press-scale). Image/gradient cover surface; the button itself is overflow-hidden rounded-2xl; sits in a "grid grid-cols-2 sm:grid-cols-3 gap-3" (parent NOT overflow-hidden).

TOKEN TIERS (this repo): wide/primary/cards active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. transition-all when control ALSO has hover bg/color/opacity; transition-transform for PURE press-scale. DON'T-CHURN: if a button ALREADY has a press mechanism (whileTap OR active:scale) + a transition, ADD ring (+aria) ONLY — do NOT add a second/duplicate CSS scale on top of framer whileTap. APPEND-not-flip when transition-all already present and you add a CSS scale. aria-pressed ONLY for persistent toggle/segmented/filter state conveyed by bg/color (constant label WORD per button qualifies) — NOT one-shot. ring-inset ONLY when flush inside an overflow-hidden rounded PARENT; OUTWARD default; ring-white/70 ONLY when the ring sits ON an image/gradient cover.

HARD RULE: className + display-only attr (aria-*) ONLY. Do NOT change any onClick / setActiveCategory / handleUse / navigate / toast / useQuery / useMemo / useState / whileTap value / any logic. Do NOT add onClick to a no-op control (FLAG it).

EDITS APPLIED (validate exact):
(A) Category pill (L111): ADD aria-pressed={activeCategory === c} + APPEND " active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" to the cn() base. Segmented/pill tier [0.97]. APPEND-not-flip (transition-all already present, eases inactive hover:bg-muted + new scale). aria-pressed VALID (persistent single-select filter, bg-conveyed selection, constant category-name label). NO aria-label (visible text). Ring OUTWARD ring-ring (default). NEW base: "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring".
(B) Effect card (L147): RING-ONLY — append " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring". KEEP whileTap scale 0.96 (do NOT add a duplicate CSS active:scale), KEEP active:opacity-90. NO aria-label (the card has a visible name + alt text on the img). OUTWARD ring-ring (the button's own overflow-hidden does NOT clip its own outward ring [ring is box-shadow, renders outside border box]; parent grid NOT overflow-hidden; the outward ring renders on the neutral grid bg, NOT on the image → ring-ring not ring-white/70). AFTER: "relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted shadow-sm text-left active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring".

QUESTIONS:
(1) Category pill (A): ADD aria-pressed + APPEND active:scale-[0.97] (segmented tier) + ring, APPEND-not-flip? aria-pressed VALID for a bg-conveyed single-select category filter with constant per-button label? OUTWARD ring-ring (NOT ring-inset) despite the overflow-x-auto scroll container — gap-2 + horizontal-scroll, the pills are not flush-stacked and the row is a horizontal scroller not an overflow-hidden rounded card? Or advise ring-inset if the scroll container vertically clips the 2px ring?
(2) Effect card (B): RING-ONLY (keep whileTap 0.96, do NOT add a duplicate CSS active:scale; keep active:opacity-90)? OUTWARD ring-ring (NOT ring-white/70 — the outward ring renders on the neutral grid bg, not on the image cover; the button's own overflow-hidden does not clip its own box-shadow ring)? NO aria-label (visible name + img alt)? Or advise.
(3) Inventory exhaustive (1 RAW pill + 1 motion.button card + 1 shadcn back)? hero stat motion.div L96 presentational (NO onClick)? skeletons + empty-state non-interactive? The trailing "Tap an effect…" <p> non-interactive?
(4) Responsive 375/768/1280: header; hero stat; the overflow-x-auto pill row; the 2-col (sm:3-col) effect-card grid (aspect-[3/4] image cards). Any crush @375? sub-44px tap targets to FLAG (back h-10 40px; pills py-1.5 ~28px tall)?
(5) Owner flags (logic/out of scope, FLAG not fix): supabase cast type-workaround; handleUse premium gate is a toast.info stub (no real unlock flow); the non-premium card navigates to /feed/new (generic, not effect-scoped — the effect id isn't passed through); preview_url images loaded lazily; public (un-gated) catalog; anything else?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/ReelEffectsPage.tsx

---

## (1) Plan

Validate the two edits already applied in the provided code, answer all 5 questions, confirm no further changes needed.

---

## (2) Diff — NONE

Both edits are **already correctly applied** in the file as provided. No further changes required.

**Validation summary:**

**(A) Category pill** — `aria-pressed={activeCategory === c}` + `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` appended to cn() base. ✅ Correct.

**(B) Effect card** — `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` appended. `whileTap={{ scale: 0.96 }}` preserved. `active:opacity-90` preserved. No duplicate CSS `active:scale`. ✅ Correct.

---

## (3) Answers to all 5 questions

### Q1 — Category pill (A): ✅ All correct as-is

- **aria-pressed VALID.** Persistent single-select filter, bg-conveyed selection (`bg-ig-gradient text-white` vs `bg-secondary`), constant category-name label per button. Exact OrderDisputesPage / MyJobApplicationsPage segmented-filter precedent.
- **APPEND-not-flip correct.** `transition-all` was already present before the edit (eases inactive `hover:bg-muted`). Appending the new `active:scale-[0.97]` onto it is the right move.
- **OUTWARD `ring-ring` correct.** `overflow-x-auto scrollbar-hide` sets overflow-x only — overflow-y remains `visible`, so vertical ring is not clipped. Horizontally, `gap-2` (8px) between `shrink-0` pills provides ample clearance for the 2px ring. NOT ring-inset.

### Q2 — Effect card (B): ✅ All correct as-is

- **RING-ONLY correct.** `whileTap={{ scale: 0.96 }}` is the framer press mechanism. Don't-churn rule: do NOT add a duplicate CSS `active:scale` on top of it. Ring-only append is the right pattern.
- **`active:opacity-90` kept** — visual feedback on the image cover, harmless.
- **OUTWARD `ring-ring` correct.** The button's own `overflow-hidden` does NOT clip its own box-shadow ring (box-shadow renders outside the border box). Parent grid is NOT `overflow-hidden`. The ring extends into the grid gap which shows the neutral page bg → `ring-ring`, NOT `ring-white/70` (that would be if the ring rendered directly over an image/gradient surface).
- **NO `aria-label` correct.** The button contains visible content (`{e.name}` at absolute bottom + `alt={e.name}` on the img) — both contribute to accessible name computation.

### Q3 — Inventory: ✅ Exhaustive

| Control | Type | Verdict |
|---------|------|---------|
| Back (L83) | shadcn `<Button aria-label="Back">` | SKIP — ships tokens, labeled |
| Category pill (L111) | RAW `<button>` | EDITED (A) |
| Effect card (L147) | `motion.button` | EDITED (B) |
| Hero stat `motion.div` (L96) | presentational, NO onClick | SKIP ✅ |
| Skeleton grid (L127) | `animate-pulse` divs | non-interactive ✅ |
| Empty-state card (L136) | no interactive children | non-interactive ✅ |
| Trailing "Tap an effect…" `<p>` (L199) | informational text only | non-interactive ✅ |

No other interactive controls. Inventory exhaustive.

### Q4 — Responsive: ✅ Clean

| Breakpoint | Notes |
|------------|-------|
| 375 | Header (back 40px + badge 28px + title) fits. Hero stat `p-5` fits. Pill row scrolls horizontally. Effect grid: (375 − 32px padding − 12px gap) / 2 ≈ 165px/card, aspect 3/4 ≈ 220px tall — fine. |
| 768 | `max-w-2xl` (672px) centered; pills wider; grid switches to 3-col at `sm:`. |
| 1280 | Same 672px cap centered. No concern. |

**Sub-44px tap targets to FLAG** (repo-wide compact, not introduced here):
- Back button `h-10` = 40px
- Category pills `py-1.5` ≈ 28px tall
- Effect-card play affordance `h-9 w-9` = 36px

### Q5 — Owner flags (logic / out of scope — FLAG not fix)

1. **`supabase as unknown as {…}` hand-rolled cast** on the `reel_effects` query — clean up when types regenerate.
2. **`handleUse` premium gate** is a `toast.info` stub ("Premium effect — unlock with ZIVO+"); no real unlock/purchase flow. Existing behavior.
3. **Non-premium navigates to `/feed/new`** generically — the effect's `id`/`name` is NOT passed through, so the Reels creator can't auto-apply the selected effect. Existing behavior (a product gap, not an interaction bug).
4. **`preview_url` images** loaded with `loading="lazy" decoding="async"` — correct for a scrollable catalog.
5. **Public catalog** — no auth gate, anyone can browse effects. Intentional per spec.
6. **Play affordance icon** (`h-9 w-9` white circle with Play) only renders for non-premium effects — reasonable UX gate.

---

## Verification

The two edits are already applied. No code changes proposed. The owner should run:

```bash
npm run update
```

to confirm type-check + worker type-check + production build all pass (the edits are className + display-only attrs only, so they should be zero-risk for the build gate).
