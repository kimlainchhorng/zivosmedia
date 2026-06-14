# DeepSeek run — 2026-06-14T10:48:33.805Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/shop/SalesAttributionPage.tsx (322-line merchant "Proof" funnel dashboard inside <AppLayout>: revenue highlight, Reel Views → Map Clicks → Purchases funnel viz, Boost CTA, top-performing-reels with per-reel Boost; useEffect + (supabase as any) reads (store_profiles, store_posts, map_pin_clicks, merchant_ad_spend, store_orders) + a boost-success URL-param branch that inserts merchant_ad_spend; handleBoost via supabase.functions.invoke("create-reel-boost") then window.open; framer-motion motion.div). RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) ONLY; preserve ALL logic, onClick, navigate, supabase, functions.invoke, insert, useState, useEffect, setState, disabled byte-identical. Don't add role/tabIndex/onKeyDown (structural — FLAG). SKIP shadcn Button/Card/CardContent/Badge (own tokens).

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO a hover:/active: bg/text(color)/border/opacity pseudo ON THE ELEMENT ITSELF.
- Adding a className FROM SCRATCH to a bare icon button (NO className attribute) IS in-scope (a className edit, not logic). Use rounded-full + scale + ring with no padding so layout stays byte-identical.
- aria: aria-label ONLY on icon-only/glyph-only controls. aria-pressed ONLY on a persistent single-select toggle. aria-expanded on a disclosure.

ONE edit applied — confirm CORRECT or NEEDS-FIX:

1) L173 BACK button — was a BARE `<button type="button" onClick={() => navigate(-1)}>` with NO className (icon-only ArrowLeft glyph; in sticky `bg-background/95 backdrop-blur-md border-b` header; NO hover/transition/scale/ring/aria) → ADDED className-from-scratch: `rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + aria-label="Go back". (icon tier scale-95; transition-transform = scale sole prop, no hover pseudo on element → NOT flip; OUTWARD ring-ring against bg-background header.)

ALSO CONFIRM I should LEAVE/SKIP: L263 "Boost for $5.00" shadcn `<Button onClick={() => handleBoost()} disabled={boosting} className="w-full mt-3 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white">` (shadcn — own tokens, visible text); L304 "Boost This Reel" shadcn `<Button variant="outline" size="sm" onClick={() => handleBoost(reel.id)}>` (shadcn — own tokens, visible text); all `<Badge>` (shadcn BETA + conversion-rate chips); all Card/CardContent (shadcn); all motion.div funnel wrappers + the animated progress-bar fills (animation only, no onClick); the funnel-step cards + revenue-highlight card + top-reel cards (presentational, no onClick); all lucide icons (decorative); h1 + all <p>/<span> text; loading spinner. No other raw <button>, no raw <a>, no onClick divs, no role="button"/cursor-pointer divs.

KEY QUESTIONS: (1) the bare Back button edit — className-from-scratch + scale-95 + transition-transform + ring + aria-label="Go back" correct? (2) confirm ALL shadcn correctly SKIPPED — is this a clean 1-edit slice, or did I miss a raw interactive control? (Note: there is a `period` useState + setPeriod that has NO rendered selector control in the JSX — confirm there's no hidden period toggle I should style.) Be concise and exact; return precise final className after-string + the aria attr.
- files: src/pages/app/shop/SalesAttributionPage.tsx

---

## Plan

This is a **clean 1-edit slice**. The page is built almost entirely from shadcn primitives (`Button`/`Card`/`CardContent`/`Badge`) and presentational `motion.div` wrappers. The ONLY raw interactive control is the bare Back button at L173.

**Edit:** Add className-from-scratch + `aria-label` to the bare icon-only Back button.

**Skip list:** All shadcn controls (Boost CTA button, per-reel Boost button, Badges, Cards), all `motion.div` wrappers (animation only, no onClick), all presentational divs, all lucide icons, all text.

**Key question answered:** The `period` useState exists but has **no rendered selector control in the JSX** — it's declared but unused in the UI (the `useEffect` dependency array includes it, but there's no period toggle rendered). No hidden control to style.

---

## Proposed Change

**File:** `src/pages/app/shop/SalesAttributionPage.tsx`

**Before (L173):**
```tsx
<button type="button" onClick={() => navigate(-1)}>
  <ArrowLeft className="h-5 w-5" />
</button>
```

**After (L173):**
```tsx
<button type="button" aria-label="Go back" onClick={() => navigate(-1)} className="rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
  <ArrowLeft className="h-5 w-5" />
</button>
```

**Final className string:** `rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

**Aria attribute:** `aria-label="Go back"`

---

## Verification

1. **Clean 1-edit slice** — only the bare Back button was touched.
2. **All shadcn controls correctly SKIPPED** — the Boost CTA button (L263), per-reel Boost button (L304), all Badges, all Cards/CardContent.
3. **No other raw `<button>`, no raw `<a>`, no `onClick` divs, no `role="button"`/`cursor-pointer` divs** — confirmed by full file scan.
4. **`period` useState** — declared but no rendered selector; no hidden control to style.
5. **HARD RULE honored:** 1 className edit + 1 new aria (aria-label); focus-visible:ring=1, ring-ring=1 (OUTWARD); ring-inset=0; `active:scale-95` new=1 (icon tier); FLIPs=0; `transition-transform` (scale sole prop); every `onClick`/`navigate`/`supabase`/`functions.invoke`/`useState`/`useEffect`/`setState` byte-identical, 0 logic lines touched.

**Owner must verify:** Run `npm run update` (type-check + worker type-check + production build) before committing.
