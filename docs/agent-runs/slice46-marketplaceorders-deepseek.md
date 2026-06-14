# DeepSeek run — 2026-06-14T03:58:12.598Z

- model: deepseek-chat
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and tell me whether my planned per-control edits are complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/MarketplaceOrdersPage.tsx (a marketplace order tracker reached by in-app navigation; `useAuth` + two real `useQuery` [["marketplace-purchases", user?.id] .eq("buyer_id", user.id) and ["marketplace-sales", user?.id] .eq("seller_id", user.id), both from `marketplace_orders` .select("*").order("created_at",desc).limit(50)]; `tab` useState<"purchases"|"sales">; `advancingId`/`buyerRating` useState; `advanceSaleStatus(orderId,current)` [optimistic supabase update + queryClient.setQueryData + sonner toast]; `submitBuyerReview(orderId,stars)` [supabase update + setBuyerRating + toast]; `STATUS_CONFIG` record. Layout: a PLAIN `<div>` root (NO SwipeBackContainer) with a sticky header [RAW icon-only back button + "Orders" h1 + ShoppingBag icon] followed by a 2-button segmented tab row [RAW buttons Purchases(n)/Sales(n)]; then a list of order-row motion.div cards [entrance anim, NO onClick] each holding order id/date + status pill + price + a 4-segment progress bar + optional notes + (sales tab) a full-width "advance status" RAW button + (purchases tab, delivered) a 5-star RAW rating button row; a ZivoMobileNav component at the bottom.)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, framer-motion whileTap if warranted). Keep ALL logic byte-identical: the two `useQuery`, every `setTab`, `advanceSaleStatus`, `submitBuyerReview`, `setAdvancingId`, `setBuyerRating`, `navigate(-1)`, `STATUS_CONFIG`, the `disabled` props. Only advise on className tokens, whileTap, and aria-* attributes.

DESIGN TOKEN SYSTEM we are applying consistently across the app:
- Focus ring (append to every focusable interactive control that lacks one): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (no ring-offset). Use focus-visible:ring-inset when the control is a flush edge child of a rounded overflow-hidden parent.
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99].
- transition class: transition-transform when scale is the only animated property; transition-all when there is also a hover:bg/hover:text/hover:opacity that should animate alongside the press. If a control ALREADY ships transition-all, append the ring (don't re-add/re-flip). If a control ships transition-colors AND a NEW active:scale transform is being added -> FLIP to transition-all. If transition-colors is present but the press is framer whileTap (not a CSS transform) -> KEEP transition-colors. DON'T-CHURN: if a control already ships a valid press-scale, keep it rather than re-adding/re-flipping.
- aria-label only on icon-only / image-only controls (a control with rich descriptive visible child text does NOT get an aria-label). aria-pressed on a segmented/toggle control with a persistent on/off selected state; NOT on a one-shot action or navigation.
- Don't-churn: if a control already has a valid focus ring / aria-label / press-scale, keep it.

RING COLOR: --ring resolves to BLACK in this app; bg-ig-gradient is a warm gradient. A control whose OUTWARD ring renders against a neutral bg-card/bg-background uses ring-ring; a control whose ring renders ON a gradient surface uses ring-white/70.

COMPONENT-TYPE RULES we follow:
- shadcn <Button>/<Input>/<Textarea> ship built-in tokens -> leave untouched.
- A framer-motion motion.div with an entrance initial/animate and NO onClick is presentational -> leave untouched.
- A RAW <button> (plain HTML) ships NO tokens.

MY PLANNED EDITS (please confirm each is right, or correct it):

1. Header back button, line ~90 (RAW, ICON-ONLY ArrowLeft, NO aria-label, onClick={() => navigate(-1)}, className "p-2 -ml-2 rounded-full hover:bg-muted/50" — HAS hover:bg, NO transition/scale/ring/aria-label; sits in a neutral bg-background/80 sticky header):
   plan: ADD aria-label="Back" + append `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (FRESH transition-all since hover:bg-muted/50 is present and a new scale transform is added; icon-only tier scale-95; OUTWARD ring-ring on neutral header bg).

2. The 2 segmented tabs, line ~100 (RAW <button> in (["purchases","sales"]).map, onClick={() => setTab(t)}, visible text "Purchases (${purchases.length})"/"Sales (${sales.length})" [count is dynamic data], TEMPLATE-LITERAL className base "flex-1 py-2 rounded-xl text-xs font-medium transition-all" + active/inactive conditional bg [bg-ig-gradient text-white vs bg-muted/40 text-muted-foreground], HAS transition-all, NO scale/ring/aria-pressed; tab row in the neutral sticky header):
   plan: ADD aria-pressed={tab === t} + APPEND `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the base string (append-not-flip, transition-all already present; segmented-filter tier [0.97]; aria-pressed valid [toggle-filter, NOT role=tab, selection conveyed by bg, the dynamic count is data]; NO aria-label [visible text]; OUTWARD ring-ring [tabs on neutral header bg]).

3. Seller advance-status button, line ~180 (RAW, full-width, visible text "Mark as Confirmed/Shipped/Delivered →"/"Updating…", disabled={advancingId === order.id}, onClick advanceSaleStatus, className "mt-3 w-full py-2 rounded-xl bg-primary/10 text-primary text-xs font-bold border border-primary/20 active:scale-[0.98] transition-all touch-manipulation disabled:opacity-50" — ALREADY has active:scale-[0.98] + transition-all, NO ring; sits in a bg-card order card, NOT overflow-hidden):
   plan: APPEND ring-only `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (KEEP existing active:scale-[0.98] DON'T-CHURN — even though full-width tier is [0.99], the control already ships a valid press-scale so I keep it; KEEP transition-all; NO aria-label [visible text]; OUTWARD ring-ring [bg-card, not overflow-hidden]).

4. The 5 star-rating buttons, line ~193 (RAW, in [1,2,3,4,5].map, ALREADY aria-label={`Rate ${s} star...`}, onClick submitBuyerReview, className "flex-1 flex items-center justify-center py-1.5 rounded-lg border border-border/40 bg-muted/30 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors active:scale-90" — HAS hover:bg color fade + active:scale-90 (PRE-EXISTING scale) + transition-colors, NO ring; KEEPS aria-label):
   plan: APPEND ring-only `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (KEEP existing active:scale-90 + transition-colors + aria-label — DON'T-CHURN: the active:scale-90 is PRE-EXISTING, not newly added, so the FLIP-when-adding-scale rule does not trigger; the snappy un-eased scale-90 is the intended feel; OUTWARD ring-ring [bg-muted/30 in bg-card]).

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm):
- The order-row motion.div cards (line ~127): entrance anim, NO onClick -> presentational.
- ZivoMobileNav component (line ~213): separate component, own file -> out of scope.
- The 4-segment progress bar divs, status pill, all icons (ArrowLeft/Package/Truck/CheckCircle/XCircle/Clock/ShoppingBag/DollarSign/Star), price/date/notes text: decorative.

QUESTIONS:
Q1. Back button (#1): ADD aria-label="Back" + FRESH transition-all + active:scale-95 (icon-only) + OUTWARD ring-ring — correct?
Q2. 2 segmented tabs (#2): aria-pressed (NOT role=tab) + append-only (transition-all already) + active:scale-[0.97] + OUTWARD ring-ring — correct? Is aria-pressed right even though the visible label includes a dynamic count? And is appending into a TEMPLATE-LITERAL base string (not cn()) fine?
Q3. Advance-status button (#3): ring-only append + KEEP existing active:scale-[0.98] (don't churn to [0.99]) + KEEP transition-all — correct? Or should I bump [0.98]->[0.99] for the full-width tier?
Q4. The 5 star buttons (#4): ring-only append + KEEP active:scale-90 + KEEP transition-colors (NO flip because the scale is PRE-EXISTING, not new) + KEEP aria-label — correct? Or should I FLIP transition-colors->transition-all so the pre-existing scale-90 gets eased?
Q5. At 375px, does the 2-button tab row, the order card (id/date + status pill, price row, 4-seg progress, full-width advance button, 5-star flex row), lay out without crushing? And at iPad 768/1024 + desktop 1280?

Please answer Q1-Q5 and give me the corrected className strings + confirm the aria attributes. Keep all logic unchanged. Thank you.
- files: src/pages/MarketplaceOrdersPage.tsx

---

# Review: MarketplaceOrdersPage Premium Interaction Pass

## Short Plan

Your planned edits are **correct and complete** across all 4 controls. I confirm the token choices, tier assignments, and don't-churn decisions. Below are the exact diffs and answers to Q1–Q5.

---

## Answers to Q1–Q5

**Q1. Back button (#1) — CORRECT ✅**
- `aria-label="Back"` is needed (icon-only, no visible text)
- `transition-all` is correct (has `hover:bg-muted/50` color fade + new `active:scale-95` transform)
- `active:scale-95` is correct icon-only tier
- OUTWARD `ring-ring` is correct (neutral `bg-background/80` header, not overflow-hidden)

**Q2. Segmented tabs (#2) — CORRECT ✅**
- `aria-pressed` is correct (toggle-filter buttons, NOT `role="tab"`/`aria-selected` — no ARIA tablist parent)
- The dynamic count in the visible label does NOT invalidate `aria-pressed` — the count is **data**, the selected state is conveyed by the background gradient. This is the same pattern used in `GroupOrdersPage` and `BrandDealsPage`.
- Append-only is correct (`transition-all` already present)
- `active:scale-[0.97]` is correct segmented-filter tier
- OUTWARD `ring-ring` is correct (neutral header bg)
- **Template literal is fine** — the className string is a runtime expression, not a static class. Appending to the base string inside the template literal works identically to `cn()`.

**Q3. Advance-status button (#3) — CORRECT ✅**
- Ring-only append is correct
- **KEEP `active:scale-[0.98]`** — DON'T-CHURN rule applies. The control already ships a valid press-scale. Renumbering to `[0.99]` would be noise with zero UX benefit. The existing `[0.98]` is close enough to the full-width tier.
- KEEP `transition-all` — already present, no flip needed

**Q4. Star rating buttons (#4) — CORRECT ✅**
- Ring-only append is correct
- **KEEP `active:scale-90`** — DON'T-CHURN rule applies. The scale is PRE-EXISTING, not newly added. The FLIP-when-adding-scale rule only triggers when you're ADDING a new `active:scale` to a control that has `transition-colors`.
- **KEEP `transition-colors`** — no flip needed. The pre-existing `active:scale-90` is already working without `transition-all` (it's a snappy instant press, which is the intended feel for star buttons). Adding `transition-all` would ease the scale animation, making it feel sluggish.
- KEEP `aria-label` — already present and correct

**Q5. Responsive layout — CLEAN ✅**
- **375px**: `px-4` → ~343px inner. Tab row: 2× `flex-1` buttons each ~167px, "Purchases (n)" / "Sales (n)" fits. Order card `p-4`: id/date row (8-char mono + date) + status pill (~80px) fits side-by-side. Price row: `$XX.XX` + optional shipping text fits. 4-seg progress bar: 4× `flex-1` segments ~74px each. Full-width advance button: `w-full` ~311px. 5-star row: 5× `flex-1` buttons ~58px each with Star icon — tight but fits.
- **768px/1024px**: Within `min-h-dvh` with no `max-w` constraint, content stretches to full width. All elements scale proportionally. No crush.
- **1280px**: Same as 768/1024. If owner wants a max-width constraint, that's a separate layout pass.

---

## Proposed Diff

**File:** `src/pages/MarketplaceOrdersPage.tsx`

### Edit 1: Header back button (line ~90)
```diff
-          <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted/50">
+          <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### Edit 2: Segmented tabs (line ~100)
```diff
-              className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
+              className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
```
```diff
+              aria-pressed={tab === t}
```

### Edit 3: Advance-status button (line ~180)
```diff
-                    className="mt-3 w-full py-2 rounded-xl bg-primary/10 text-primary text-xs font-bold border border-primary/20 active:scale-[0.98] transition-all touch-manipulation disabled:opacity-50">
+                    className="mt-3 w-full py-2 rounded-xl bg-primary/10 text-primary text-xs font-bold border border-primary/20 active:scale-[0.98] transition-all touch-manipulation disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### Edit 4: Star rating buttons (line ~193)
```diff
-                          className="flex-1 flex items-center justify-center py-1.5 rounded-lg border border-border/40 bg-muted/30 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors active:scale-90">
+                          className="flex-1 flex items-center justify-center py-1.5 rounded-lg border border-border/40 bg-muted/30 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

---

## Summary of Changes

| # | Control | Type | Changes | Tokens Added |
|---|---------|------|---------|--------------|
| 1 | Back button | RAW icon-only | +aria-label, +transition-all, +scale-95, +ring | 4 |
| 2 | Segmented tabs (×2) | RAW toggle-filter | +aria-pressed, +scale-[0.97], +ring | 3 per tab |
| 3 | Advance-status button | RAW full-width | +ring only | 1 |
| 4 | Star buttons (×5) | RAW icon+text | +ring only | 1 per button |

**Total: 4 new aria attributes, 0 logic lines touched, 0 transition flips, 0 don't-churn violations.**

## Owner Verification

1. Run `npm run update` — must pass (type-check + worker type-check + build)
2. Preview at 375px, 768px, 1280px to confirm layout
3. Verify keyboard focus rings appear on all 4 control types
4. Verify `aria-pressed` toggles correctly on tab switch (inspect in devtools)
5. Commit when ready (owner does this)
