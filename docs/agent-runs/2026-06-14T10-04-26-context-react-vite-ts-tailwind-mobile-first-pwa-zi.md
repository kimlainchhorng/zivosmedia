# DeepSeek run — 2026-06-14T10:04:26.324Z

- model: deepseek-chat
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

## Plan

The single edit at L200 (copy-code chip button) is **already applied correctly** in the file you provided. The final className string matches the house standard exactly. No changes needed.

## Verification of the one edit

**Before (L200):**
```
className="font-mono text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-primary/20 transition-colors"
```

**After (L200, already in file):**
```
className="font-mono text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-primary/20 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Confirmations:**

1. **`active:scale-[0.97]` chip/pill tier — CORRECT.** Auto-width inline chip (`px-2 py-0.5`), NOT a full-width button → `[0.97]` is the correct tier (not `[0.98]` or `[0.99]`).

2. **FLIP `transition-colors`→`transition-all` — CORRECT.** The element has `hover:bg-primary/20` ON ITSELF (not a child), so the new scale + the existing hover background change both need to animate → `transition-all` is required.

3. **OUTWARD `ring-ring` — CORRECT.** The chip sits inside a `<Card className="p-4">` which has `bg-card` (neutral parent). Even though the chip's own fill is `bg-primary/10`, the OUTWARD ring renders against the Card's neutral surface → `ring-ring` is correct (NOT a tinted/inset ring).

4. **NO `aria-label` — CORRECT.** The button has visible text (`promo.code`), so no `aria-label` needed.

## Controls to LEAVE (all correct — shadcn primitives or non-interactive)

| Line | Control | Reason to skip |
|------|---------|----------------|
| L141 | Back `<Button>` | shadcn, `variant="ghost" size="icon"`, already has `aria-label="Back"` |
| L145 | "Create" `<Button>` | shadcn, own tokens |
| L156 | Code `<Input>` | shadcn, native form field |
| L157 | Name `<Input>` | shadcn, native form field |
| L160 | `<Select>` discountType | shadcn, own tokens |
| L167 | Value `<Input>` | shadcn, native form field |
| L170 | Usage limit `<Input>` | shadcn, native form field |
| L171 | Date `<Input>` | shadcn, native form field |
| L174 | "Create" `<Button>` | shadcn, own tokens, `disabled={saving}` |
| L177 | "Cancel" `<Button>` | shadcn, `variant="ghost"`, own tokens |
| L191 | "Create your first promo" `<Button>` | shadcn, own tokens |
| L211 | "Toggle active" `<Button>` | shadcn, `variant="ghost" size="icon"`, already has `aria-label="Toggle active"` |
| L214 | "Delete" `<Button>` | shadcn, `variant="ghost" size="icon"`, already has `aria-label="Delete"` |

**Non-interactive left as-is:** all `<Badge>`s (L206/221/224/228), `motion.div` list items (L196 — animation only), `AnimatePresence` form wrapper (L153 — no onClick), all lucide icons (decorative), `<h1>`/`<p>` text, loading `Loader2`, empty-state div.

## Missed controls scan

**No other raw interactive controls found.** Every interactive element is either:
- A shadcn `<Button>` (own tokens, skip)
- A shadcn `<Input>`/`<Select>` (own tokens, skip)
- The one raw `<button>` at L200 (already edited correctly)

No clickable `<div>`s with `onClick`, no raw `<a>`, no `cursor-pointer`/`role="button"` divs, no native form fields outside shadcn.

## Verdict

**File is ready as-is.** The single edit is correctly applied. Run `npm run update` to confirm the build passes, then commit.
