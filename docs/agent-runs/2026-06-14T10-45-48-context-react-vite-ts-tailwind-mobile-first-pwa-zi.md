# DeepSeek run — 2026-06-14T10:45:48.128Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/shop/MerchantROIDashboard.tsx (339-line shop-owner analytics dashboard inside <AppLayout>: KPI grid, ROI/conversion cards, recharts AreaChart/BarChart, verified Meta revenue, Boost CTA, top reels, viewer heatmap; useEffect + (supabase as any) parallel reads (store_profiles, store_posts, map_pin_clicks, store_orders, merchant_ad_spend, merchant_boosts); framer-motion motion.div; child components MerchantBoostModal + MerchantViewerHeatmap). RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) ONLY; preserve ALL logic, onClick, navigate, supabase, useState, useEffect, setState byte-identical. Don't add role/tabIndex/onKeyDown (structural — FLAG). SKIP shadcn Button/Card/CardHeader/CardTitle/CardContent/Badge (own tokens). SKIP recharts + child components (MerchantBoostModal/MerchantViewerHeatmap — separate files).

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO a hover:/active: bg/text(color)/border/opacity pseudo ON THE ELEMENT ITSELF.
- Adding a className FROM SCRATCH to a bare icon button (NO className attribute) IS in-scope (a className edit, not logic). Use rounded-full + scale + ring with no padding so layout stays byte-identical.
- aria: aria-label ONLY on icon-only/glyph-only controls. aria-pressed ONLY on a persistent single-select toggle. aria-expanded on a disclosure.

ONE edit applied — confirm CORRECT or NEEDS-FIX:

1) L148 BACK button — was a BARE `<button type="button" onClick={() => navigate(-1)}>` with NO className (icon-only ArrowLeft glyph; in sticky `bg-background/95 backdrop-blur-md border-b` header; NO hover/transition/scale/ring/aria) → ADDED className-from-scratch: `rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + aria-label="Go back". (icon tier scale-95; transition-transform = scale sole prop, no hover pseudo on element → NOT flip; OUTWARD ring-ring against bg-background header.)

ALSO CONFIRM I should LEAVE/SKIP: L286 "Boost from $5" shadcn `<Button onClick={() => setShowBoost(true)} className="w-full rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white">` (shadcn — own tokens, visible text; its own hover:bg is the shadcn variant override, not my concern); all `<Badge>` (shadcn BOOSTED chip); all Card/CardHeader/CardTitle/CardContent (shadcn); all recharts (AreaChart/BarChart/Bar/Area/XAxis/YAxis/Tooltip/ResponsiveContainer — non-interactive viz); all motion.div KPI wrappers (animation only, no onClick); the KPI cards + ROI/conversion cards + Verified-Revenue card + top-reel cards (presentational, no onClick); MerchantBoostModal + MerchantViewerHeatmap (child components, separate files — out of scope); all lucide icons (decorative); h1 + all <p>/<span> text; loading spinner + "No store found" empty-state. No other raw <button>, no raw <a>, no onClick divs, no role="button"/cursor-pointer divs.

KEY QUESTIONS: (1) the bare Back button edit — className-from-scratch + scale-95 + transition-transform + ring + aria-label="Go back" correct? (2) confirm ALL shadcn/recharts/child-components correctly SKIPPED — is this a clean 1-edit slice, or did I miss a raw interactive control? Be concise and exact; return precise final className after-string + the aria attr.
- files: src/pages/app/shop/MerchantROIDashboard.tsx

---

## Plan

This is a **1-edit slice** — the only raw interactive control in `MerchantROIDashboard.tsx` is the bare Back button at L148. Everything else is shadcn primitives, recharts (non-interactive), child components (separate files), or presentational divs.

## Proposed Change

**File:** `src/pages/app/shop/MerchantROIDashboard.tsx`

**Before (L148):**
```tsx
<button type="button" onClick={() => navigate(-1)}>
```

**After (L148):**
```tsx
<button type="button" aria-label="Go back" onClick={() => navigate(-1)} className="rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

## Key Questions — Confirmed

**(1) Bare Back button edit — CORRECT ✅**
- `className-from-scratch` on a bare `<button>` with no className is in-scope (a className edit, not logic)
- `rounded-full` — tight ring trace, no padding → layout byte-identical
- `active:scale-95` — icon-only tier
- `transition-transform` — scale is the sole animated prop on the element (no hover/active pseudo on the button itself) → NOT a flip
- `focus-visible:ring-2 focus-visible:ring-ring` — OUTWARD ring against the `bg-background/95` header parent
- `aria-label="Go back"` — icon-only (ArrowLeft glyph, no visible text)

**(2) SKIP list — CORRECT ✅ — clean 1-edit slice**
- L286 `Button` "Boost from $5" — shadcn (own tokens, visible text, its own `hover:bg-amber-600`)
- All `<Badge>` — shadcn
- All `Card`/`CardHeader`/`CardTitle`/`CardContent` — shadcn
- All recharts (`AreaChart`, `BarChart`, `Bar`, `Area`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`) — non-interactive visualization
- All `motion.div` KPI wrappers — animation only, no onClick
- KPI cards, ROI/conversion cards, Verified Revenue card, top-reel cards — presentational, no onClick
- `MerchantBoostModal` + `MerchantViewerHeatmap` — child components (separate files)
- All lucide icons — decorative
- `<h1>` + all `<p>`/`<span>` text
- Loading spinner + "No store found" empty-state

**No other raw `<button>`, no raw `<a>`, no `onClick` divs, no `role="button"`/`cursor-pointer` divs.**

## Final className string
```
rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

## Final aria attribute
```
aria-label="Go back"
```

## Guard grep (diff)
- className edits: **1**
- new aria: **1** (1 `aria-label`, 0 `aria-pressed`, 0 `aria-expanded`)
- `focus-visible:ring`: **1**
- `ring-ring`: **1** (OUTWARD)
- `ring-inset`: **0**
- `active:scale-95`: **1** (new)
- FLIPs: **0** (`transition-transform` — scale sole prop)
- `disabled` touched: **0**
- Logic lines touched: **0**

## Owner verification
- Run `npm run update` — must pass (type-check + worker type-check + production build)
- Preview at 375/768/1280 — the sticky header with Back + BarChart3 icon + h1 + optional BOOSTED badge fits at all widths
- No logic, data fetching, or routing was touched
