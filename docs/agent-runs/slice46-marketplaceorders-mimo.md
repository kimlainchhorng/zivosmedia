# MiMo run — 2026-06-14T03:59:42.443Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Review: `MarketplaceOrdersPage.tsx` — Interaction Polish

I've read every line. Your inventory is **exhaustive and correct**. There are exactly 4 interactive controls (the back button, the 2 segmented tabs, the advance-status button, and the 5 star-rating buttons). Everything else (order-row `motion.div` cards, progress bars, status pills, icons, text, `ZivoMobileNav`) is decorative or out-of-scope.

---

### Q1 — Back button ✅ CORRECT

**ADD** `aria-label="Back"` **+ APPEND** tokens.

```
BEFORE: "p-2 -ml-2 rounded-full hover:bg-muted/50"
AFTER:  "p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

Reasoning: icon-only (needs aria-label), `hover:bg-muted/50` mandates a transition class, adding `active:scale-95` (icon-only tier) means `transition-all` (not `transition-colors`) to ease both the hover color and the press transform, OUTWARD `ring-ring` on the neutral `bg-background/80` header. FRESH (no prior tokens).

---

### Q2 — Segmented tabs ✅ CORRECT

**ADD** `aria-pressed={tab === t}` **+ APPEND** to the base portion of the template literal.

```
BEFORE base: "flex-1 py-2 rounded-xl text-xs font-medium transition-all"
AFTER base:  "flex-1 py-2 rounded-xl text-xs font-medium transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

(The conditional `${tab === t ? "bg-ig-gradient text-white" : "bg-muted/40 text-muted-foreground"}` stays unchanged.)

Three sub-answers:

- **`aria-pressed` is correct**, not `role="tab"`. These are plain toggle-filter buttons, not an ARIA tablist. The dynamic count in the visible label is **data**, not the selected state — `aria-pressed` conveys the selection that is currently only communicated by bg color.
- **Appending into a template literal is fine.** You insert the new tokens after `transition-all` and before `${...}`. The class list is identical in effect to a `cn()` append.
- **OUTWARD `ring-ring`** on neutral header bg. (The `overflow-x` on a parent doesn't apply here — the tab row doesn't scroll.)

---

### Q3 — Advance-status button ✅ CORRECT (keep `[0.98]`)

**APPEND ring-only. DON'T-CHURN the existing `[0.98]`.**

```
BEFORE: "mt-3 w-full py-2 rounded-xl bg-primary/10 text-primary text-xs font-bold border border-primary/20 active:scale-[0.98] transition-all touch-manipulation disabled:opacity-50"
AFTER:  "mt-3 w-full py-2 rounded-xl bg-primary/10 text-primary text-xs font-bold border border-primary/20 active:scale-[0.98] transition-all touch-manipulation disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Do NOT bump `[0.98]` → `[0.99]`.** The control already ships a valid press-scale. The difference between 2% and 1% compression is imperceptible, and changing it is textbook churn. The DON'T-CHURN rule exists precisely for this case.

- OUTWARD `ring-ring` — card is `bg-card rounded-2xl` with NO `overflow-hidden`, button has `mt-3` padding clearance.
- `transition-all` stays — it eases `disabled:opacity-50` state snaps AND the existing press scale.
- NO `aria-label` — has visible text ("Mark as Confirmed →" etc.).

---

### Q4 — Star-rating buttons ✅ CORRECT (ring-only, no flip)

**APPEND ring-only. KEEP `transition-colors` (no flip). KEEP `active:scale-90`. KEEP `aria-label`.**

```
BEFORE: "flex-1 flex items-center justify-center py-1.5 rounded-lg border border-border/40 bg-muted/30 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors active:scale-90"
AFTER:  "flex-1 flex items-center justify-center py-1.5 rounded-lg border border-border/40 bg-muted/30 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Why no FLIP?** The FLIP rule is: *"If a control ALREADY ships `transition-colors` AND a **NEW** `active:scale` transform is being added → FLIP to `transition-all`."* Here the `active:scale-90` is **pre-existing**, not newly added. The flip rule simply doesn't trigger. The snappy un-eased `scale-90` is the existing intended micro-tap feel — the `transition-colors` eases the `hover:bg-amber-50` color fade, and the scale is deliberately instant. DON'T-CHURN.

- KEEP `aria-label={...}` — already present, icon-only star glyphs.
- OUTWARD `ring-ring` — buttons sit in a padded `mt-3` area inside a `bg-card` card, not overflow-hidden.

---

### Q5 — Responsive layout ✅ NO CRUSHING

| Breakpoint | Analysis |
|---|---|
| **375px** | `px-4` → 343px inner. Tab row: 2× `flex-1` ~170px each, text "Purchases (0)" fits. Order card `p-4` (311px inner): id/date left + status pill right → fits; price row trivial; 4-segment progress `flex gap-1` → 4× ~76px; advance button `w-full text-xs` "Mark as Confirmed →" wraps cleanly within 311px; 5 star buttons `flex gap-1.5` → 5× `flex-1` ~60px each, `py-1.5` → ~24px tall. No crush anywhere. |
| **768/1024px** | Same structure, wider cards. Everything scales. |
| **1280px** | Cards stretch to ~1248px minus padding. Visually sparse (no `max-w-*`), but nothing crushes or overflows. Adding a `max-w-2xl mx-auto` is a layout enhancement outside this className-only pass. |

The 5 star buttons at 375px each get ~60px width (Star icon 16px centered) — comfortable tap area width-wise (though `py-1.5` ≈ 24px height is sub-44px — repo-wide compact pattern, flag not fix).

---

## Final diff summary

**4 unique `−`/`+` className line swaps + 2 new aria attributes. 0 logic lines.**

| # | Control | Tokens added | aria change |
|---|---------|-------------|-------------|
| 1 | Back button | FRESH `transition-all` + `active:scale-95` + `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | **ADD** `aria-label="Back"` |
| 2 | Tab buttons ×2 | APPEND `active:scale-[0.97]` + `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (onto existing `transition-all`) | **ADD** `aria-pressed={tab === t}` |
| 3 | Advance-status | APPEND `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` only | — |
| 4 | Star-rating ×5 | APPEND `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` only | — (KEEP existing) |

**Ring count:** 4 rings added (all OUTWARD `ring-ring`), 0 `ring-inset`.
**Scale count:** 1 `scale-95` added (back), 1 `scale-[0.97]` added (tabs), 2 preserved (advance `[0.98]`, stars `90`).
**Transition count:** 1 FRESH `transition-all` (back), 3 preserved (tabs `transition-all`, advance `transition-all`, stars `transition-colors`).
**aria-label:** 1 new (back). **aria-pressed:** 1 new (tabs map, renders 2).

**Diff counts: 4 ins / 4 del className swaps + 1 new `aria-label` + 1 new `aria-pressed`, 0 logic lines touched.** Every `navigate(-1)`, `setTab(t)`, `advanceSaleStatus`, `submitBuyerReview`, `advancingId`, `buyerRating`, both `useQuery`, `STATUS_CONFIG`, every `disabled` prop — all byte-identical between `−` and `+`.

---

**What the owner must verify:** Run `npm run update` (must be TRUE EXIT 0 — type-check + worker type-check + production build). Preview at 375/768/1280 to confirm the rings appear on keyboard focus (Tab to each control). The page is auth-gated (`useAuth` + two `useQuery` requiring `user.id`), so preview requires a signed-in user with `marketplace_orders` rows.
