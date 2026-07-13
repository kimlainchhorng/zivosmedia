# MiMo run — 2026-06-14T10:49:00.616Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Audit Result: **CLEAN 1-edit slice — confirmed CORRECT, zero fixes needed.**

---

### (1) The Back button edit — **CORRECT ✅**

| Attribute | Value | Verdict |
|---|---|---|
| `aria-label="Go back"` | Icon-only ArrowLeft | ✅ required |
| `rounded-full` | Tight ring trace, no padding → layout byte-identical | ✅ |
| `active:scale-95` | Icon tier | ✅ |
| `transition-transform` | Scale sole interactive CSS prop on element; no hover/active pseudo on element → NOT flip | ✅ |
| `focus-visible:ring-2 focus-visible:ring-ring` | OUTWARD against `bg-background/95` header parent | ✅ |
| `focus-visible:outline-none` | Suppresses default outline | ✅ |
| `ring-inset` | NOT added — header is not overflow-hidden | ✅ |
| `onClick` / `navigate(-1)` | Byte-identical, untouched | ✅ |

**Final className:** `rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
**Final aria:** `aria-label="Go back"`

---

### (2) SKIP/LEAVE confirmations — all correct ✅

| Control | Why SKIP |
|---|---|
| L263 "Boost for $5.00" `<Button>` | shadcn — own tokens, visible text, `disabled` is logic |
| L304 "Boost This Reel" `<Button variant="outline" size="sm">` | shadcn — own tokens, visible text |
| All `<Badge>` (BETA + conversion) | shadcn |
| All `Card` / `CardContent` | shadcn layout |
| All `motion.div` funnel wrappers + animated progress-bar fills | Animation only, no onClick |
| Funnel-step cards, revenue card, top-reel cards | Presentational, no onClick |
| All lucide icons | Decorative |
| `<h1>` + all `<p>` / `<span>` | Text |

---

### (3) Full scan — no missed raw interactive controls ✅

**`period` state:** `useState<"7d" | "30d" | "all">("30d")` exists but **no rendered control calls `setPeriod`** in the JSX. There is no hidden period toggle. The `period` value is passed as a `useEffect` dependency (fetches data) but the UI selector was never built — **FLAG only**, not a styling concern.

**No other raw `<button>`, no raw `<a>`, no `onClick` divs, no `role="button"` / `cursor-pointer` divs anywhere in the file.**

---

### (4) Owner flags (logic / out of scope — FLAG not fix)

1. **Synthetic click data:** `reel.clicks = Math.floor(view_count * 0.05)` and `purchases = Math.floor(view_count * 0.01)` — estimated, not real attribution. The funnel's Map Clicks come from `map_pin_clicks` (real) but the per-reel breakdowns are synthetic. Pre-existing, not touched.
2. **`period` filter is dead code:** the `setPeriod` setter is never called by any UI control — the page always fetches with `"30d"`. Pre-existing, not touched.
3. **`reel_views` computed from `post.view_count`:** these are post view counts, not dedicated reel-attribution views. Pre-existing, not touched.
4. **`(supabase as any)` casts** — untyped reads, pre-existing.
5. **`handleBoost` opens Stripe checkout in `_blank`** — confirm `create-reel-boost` edge function is live and the checkout URL is valid.

---

### Verdict

```
className edits = 1
new aria         = 1 (1 aria-label)
ring-ring        = 1 (OUTWARD)
ring-inset       = 0
FLIPs            = 0
disabled touched = 0
logic lines      = 0
```

**File is ready to commit as-is. No diff needed — the edit in the working tree is already correct.**
