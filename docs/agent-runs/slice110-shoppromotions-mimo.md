# MiMo run — 2026-06-14T10:05:09.315Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/shop/ShopPromotionsPage.tsx (239-line merchant "Promotions" page; raw div shell min-h-screen bg-background, NOT AppLayout; useAuth + supabase; load() fetches store_profiles + promotions; handleCreate/toggleActive/deletePromo via supabase.functions.invoke("promotion-manage"); copyCode via navigator.clipboard; framer-motion AnimatePresence create-form + list). RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) + whileTap ONLY; preserve ALL logic, onClick, navigate, supabase, functions.invoke, setState, useState byte-identical. Don't add a SECOND COMPETING press effect. Don't churn controls that ALREADY ship press+transition (add ring only). Don't add role/tabIndex/onKeyDown (structural — FLAG). SKIP all shadcn primitives (Button/Card/Badge/Input/Select — own tokens). LEAVE raw native form fields.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring. An OUTWARD ring on a control with its OWN tinted fill (bg-primary/10) STILL renders against the neutral PARENT (the Card) → ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO hover:bg/text(color)/border/opacity ON THE ELEMENT ITSELF.
- FLIP / ADD: ADDING a new active:scale to a transition-colors/no-transition control that ALSO has a hover/active color/bg/border ON ITSELF → use transition-all (FLIP).
- aria: aria-label ONLY on icon-only/glyph-only controls. aria-pressed ONLY on a persistent single-select toggle. aria-expanded on a disclosure.

ONE edit applied — confirm CORRECT or NEEDS-FIX:

L200 COPY-CODE chip button — was `font-mono text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-primary/20 transition-colors` (VISIBLE text = the promo.code + a decorative Copy icon; onClick copyCode(promo.code) → navigator.clipboard; auto-width chip with its OWN tinted surface bg-primary/10; hover:bg-primary/20 ON ITSELF; transition-colors; NO scale, NO ring; rounded present; inside a shadcn <Card className="p-4"> bg-card neutral) → ADDED `active:scale-[0.97]` (chip/pill tier — auto-width, has own surface but is a small inline chip not a wide full-width button) + FLIP (transition-colors→transition-all, because hover:bg-primary/20 ON ITSELF + new scale) + ring; NO aria (visible text is the code). Final: `font-mono text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-primary/20 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Confirm: (1) scale-[0.97] chip/pill tier correct (auto-width inline chip, NOT a full-width button → NOT [0.98]/[0.99]); (2) FLIP transition-colors→transition-all correct (hover:bg-primary/20 ON ITSELF + new scale); (3) OUTWARD ring-ring correct against the neutral bg-card Card parent even though the chip's own fill is bg-primary/10 (NOT a tinted/inset ring); (4) NO aria-label correct (visible text = the code).

ALSO CONFIRM I should LEAVE (all shadcn primitives, own tokens): L141 Back Button (variant ghost size icon, aria-label="Back"); L145 "Create" Button; L156/157 Input (Code/name); L160 Select (discountType); L167 Input (value); L170/171 Input (usage limit / date); L174 "Create" Button (disabled saving); L177 "Cancel" Button; L191 "Create your first promo" Button; L211 "Toggle active" Button (aria-label, ghost icon); L214 "Delete" Button (aria-label, ghost icon). And LEAVE non-interactive: all Badges (L206/221/224/228); the motion.div list items (L196 — no onClick, animation only); the AnimatePresence create-form motion.div (L153 — no onClick); all lucide icons (decorative); the h1 + <p> text; the loading Loader2 + empty-state.

Be concise and exact. Return the precise final className after-string for the one edit + any aria. Flag any other in-scope raw interactive control I missed. Note especially: (1) chip/pill tier scale-[0.97] (auto-width inline chip) — correct vs full-width? (2) FLIP transition-colors→transition-all — correct? (3) OUTWARD ring-ring against the neutral Card parent despite the chip's own bg-primary/10 fill — correct (not tinted/inset)?
- files: src/pages/app/shop/ShopPromotionsPage.tsx

---

## Audit Result: ✅ EDIT CONFIRMED CORRECT — ZERO additional edits needed

### The one edit (L200 COPY-CODE chip button) — all 4 confirmations ✅

**Final className (already applied in working tree):**
```
font-mono text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-primary/20 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
No new aria (visible text = the promo code). No `aria-label`. No `aria-pressed`.

| # | Confirmation | Verdict |
|---|---|---|
| 1 | `scale-[0.97]` chip/pill tier | ✅ CORRECT — auto-width inline chip (`px-2 py-0.5`), NOT `w-full` → NOT `[0.98]`/`[0.99]` |
| 2 | FLIP `transition-colors`→`transition-all` | ✅ CORRECT — `hover:bg-primary/20` ON ITSELF (bg change) + new `active:scale-[0.97]` (transform) both need to animate → `transition-all` |
| 3 | OUTWARD `ring-ring` against neutral `bg-card` parent | ✅ CORRECT — chip's own `bg-primary/10` doesn't matter; ring renders OUTWARD against the parent `<Card className="p-4">` which is `bg-card` (neutral). NOT `ring-inset` (Card is not `overflow-hidden`) |
| 4 | NO `aria-label` | ✅ CORRECT — visible text `{promo.code}` + decorative `<Copy>` icon → no label needed |

### Leave list — all confirmed correct

**Shadcn primitives (own tokens, SKIP):** L141 Back `Button` (ghost/icon/aria-label="Back"), L145 "Create" `Button`, L156/157 `Input` (code/name), L160 `Select` (discountType), L167 `Input` (value), L170/171 `Input` (usage limit/date), L174 "Create" `Button` (disabled saving), L177 "Cancel" `Button`, L191 "Create your first promo" `Button`, L211 "Toggle active" `Button` (aria-label/ghost/icon), L214 "Delete" `Button` (aria-label/ghost/icon) — all SKIP ✅

**Non-interactive LEFT:** all `Badge` variants (L206/221/224/228), `motion.div` list items (L196, no onClick), `AnimatePresence` `motion.div` (L153, no onClick), all lucide icons (decorative), `h1`/`p` text, loading `Loader2` + empty-state — all SKIP ✅

### Missed controls scan: **NONE**

Scanned the entire file for raw interactive controls (non-shadcn `<button>`, `<a>`, clickable divs, `role="button"`, `cursor-pointer` divs): the COPY-CODE chip is the **only** non-shadcn interactive control on this page. Every other button is a shadcn `<Button>` with its own tokens.

### Guard grep

| Token | Count |
|---|---|
| className edits | 1 |
| new aria | 0 |
| `focus-visible:ring` | 1 |
| `ring-ring` (OUTWARD) | 1 |
| `ring-inset` | 0 |
| `active:scale-[0.97]` | 1 (chip tier) |
| FLIPs | 1 (`transition-colors`→`transition-all`) |
| Logic lines touched | 0 |

### Build

No additional changes proposed — the edit is already applied in the working tree. The existing green `npm run update` covers this file.

**Ready for owner to commit.**
