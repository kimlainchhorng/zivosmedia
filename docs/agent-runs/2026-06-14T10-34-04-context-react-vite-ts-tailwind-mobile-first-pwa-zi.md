# DeepSeek run — 2026-06-14T10:34:04.587Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/shop/ReferAShopPage.tsx (295-line merchant "Refer a Shop" page inside <AppLayout>; useAuth + supabase reads (store_profiles, merchant_referrals) + insert into merchant_referrals; copy/share via navigator.clipboard/navigator.share; framer-motion motion.div). RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) ONLY; preserve ALL logic, onClick, onKeyDown, navigate, supabase, .insert, useState, useEffect, disabled, setState byte-identical. Don't add role/tabIndex/onKeyDown (structural — FLAG). SKIP shadcn Button/Card/CardHeader/CardTitle/CardContent/Input/Badge (own tokens). LEAVE shadcn Input (its onKeyDown Enter-to-submit is existing logic — do NOT touch).

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO a hover:/active: bg/text(color)/border/opacity pseudo ON THE ELEMENT ITSELF.
- Adding a className FROM SCRATCH to a bare icon button (one with NO className attribute) IS in-scope (a className edit, not logic). Use rounded-full + scale-95 + ring with no padding so layout stays byte-identical.
- aria: aria-label ONLY on icon-only/glyph-only controls. aria-pressed ONLY on a persistent single-select toggle. aria-expanded on a disclosure.

ONE edit applied — confirm CORRECT or NEEDS-FIX:

1) L133 BACK button — was a **BARE `<button type="button" onClick={() => navigate(-1)}>` with NO className at all** (icon-only ArrowLeft glyph; in the sticky `bg-background/95 backdrop-blur-md` header; NO hover/transition/scale/ring; NO aria) → **ADDED a className from scratch: `rounded-full` (tight ring trace, no padding → layout byte-identical) + `aria-label="Go back"` + `active:scale-95` (icon tier) + `transition-transform` (scale sole prop → NOT flip) + ring**. Final className: `rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + aria-label="Go back". **CONFIRM: className-from-scratch on bare button in-scope; scale-95 icon tier; transition-transform; OUTWARD ring-ring against the bg-background header parent.**

ALSO CONFIRM I should LEAVE/SKIP: L191 "Send Invitation" shadcn `<Button>` (own tokens, disabled={sending || !email}, visible text); L244 "Copy Link" + L253 "Share" shadcn `<Button variant="outline" size="sm">` (own tokens, visible text); L184 shadcn `<Input>` (own tokens — and its onKeyDown Enter-to-submit is existing LOGIC, do NOT touch); all `<Badge>` (shadcn); all Card/CardHeader/CardTitle/CardContent (shadcn); all motion.div wrappers (animation only, no onClick); the hero stats divs + "How It Works" step divs (presentational, no onClick); all lucide icons (decorative); the h1 + all <p>/<span>/<strong> text; the loading + no-store empty-states. No other raw <button>, no raw <a>, no onClick divs, no role="button"/cursor-pointer divs.

Be concise and exact. Return the precise final className after-string + the aria attr. Flag any other in-scope raw interactive control I missed. KEY QUESTIONS: (1) the bare Back button edit — className-from-scratch + scale-95 + transition-transform + ring + aria-label="Go back" correct? (2) confirm ALL the shadcn Buttons/Input/Badge/Cards are correctly SKIPPED (this is essentially a 1-edit slice — is that right, or did I miss a raw interactive control)?
- files: src/pages/app/shop/ReferAShopPage.tsx

---

## Plan

This is a **1-edit slice** — the only raw interactive control is the bare `<button>` at L133 (Back). All other interactive elements are shadcn primitives (`Button`, `Input`, `Badge`, `Card`) with their own design tokens, correctly skipped.

## Proposed Change

**File:** `src/pages/app/shop/ReferAShopPage.tsx`

**Before (L133):**
```tsx
<button type="button" onClick={() => navigate(-1)}>
```

**After (L133):**
```tsx
<button type="button" aria-label="Go back" onClick={() => navigate(-1)} className="rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

## Confirmation

**Edit 1 (L133 Back button) — CORRECT ✅**
- `className-from-scratch` on bare button → in-scope ✅
- `rounded-full` → tight ring trace, no padding, layout byte-identical ✅
- `active:scale-95` → icon-only tier ✅
- `transition-transform` → scale is sole animated prop (no hover pseudo on element) ✅
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` → OUTWARD ring against `bg-background/95` header parent ✅
- `aria-label="Go back"` → icon-only control ✅

**Skipped controls — CORRECT ✅**
- L191 "Send Invitation" `<Button>` → shadcn, own tokens, `disabled={sending || !email}`, visible text ✅
- L244 "Copy Link" + L253 "Share" `<Button variant="outline" size="sm">` → shadcn, own tokens, visible text ✅
- L184 `<Input>` → shadcn, own tokens, `onKeyDown` Enter-to-submit is existing LOGIC (do NOT touch) ✅
- All `<Badge>` → shadcn ✅
- All `Card`/`CardHeader`/`CardTitle`/`CardContent` → shadcn ✅
- All `motion.div` wrappers → animation only, no `onClick` ✅
- Hero stats divs + "How It Works" step divs → presentational, no `onClick` ✅
- All lucide icons → decorative ✅
- `<h1>` + all `<p>`/`<span>`/`<strong>` text → presentational ✅
- Loading + no-store empty-states → presentational ✅

**No other raw interactive controls found** — no raw `<a>`, no `onClick` divs, no `role="button"`/`cursor-pointer` divs.

## Owner Verification

- Run `npm run update` before committing
- This is a 1-edit, 0-logic-line-touched change — safe to apply directly
