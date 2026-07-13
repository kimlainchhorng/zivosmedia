# MiMo run — 2026-06-14T11:19:44.229Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/shop/TruckDashboardPage.tsx (368-line merchant **Truck Dashboard** — GPS-powered mobile driver view for truck inventory + nearby customers + barcode-scan sale, INSIDE `<AppLayout>` with its own `min-h-screen bg-background pb-24` inner shell: a sticky `bg-background/95 backdrop-blur-md border-b` header with a **bare** raw Back `<button>` (icon-only ArrowLeft, NO className at all) + Truck icon + title + a shadcn "GPS Active" `<Badge variant="outline">`; a 3-col stats grid of shadcn Cards (Items/Customers/Value); a "Quick Scan Sale" Card with a shadcn `<Input>` (barcode/SKU, onChange + onKeyDown Enter→handleBarcodeScan) + a shadcn submit `<Button disabled={syncing || !barcodeInput} size="sm">`; a "Recent Customers" section of shadcn Cards each with a shadcn "Message" `<Button variant="outline" size="sm">` (navigate to /chat); a "Truck Inventory" section of shadcn Cards with shadcn `<Badge>` qty pills. `useState`/`useEffect`/`useCallback`/`useRef`; `useAuth`; `navigator.geolocation.watchPosition`; `(supabase as any).from("store_profiles"|"truck_inventory"|"store_products"|"store_orders"|"profiles").select/update`; sonner toast; framer-motion imported). RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) + whileTap ONLY; preserve ALL logic, onClick, navigate, useState/useEffect/useCallback/useRef, setState, supabase calls, onChange, onKeyDown, disabled byte-identical. Don't add role/tabIndex/onKeyDown (structural — FLAG). SKIP shadcn Button/Card/CardContent/Badge/Input (own tokens).

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills/card-tiles active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99]. Back-icon-buttons already shipping active:scale-90 keep it (DON'T-CHURN); a FRESH back icon button with no prior scale gets the standard icon-only active:scale-95.
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO a hover:/active: bg/text(color)/border/opacity pseudo ON THE ELEMENT ITSELF.
- Adding className from scratch to a bare button (no className attr) IS in-scope — use rounded-full + scale + ring with NO padding so layout stays byte-identical.
- aria: aria-label ONLY on icon-only/glyph-only controls. aria-pressed on a persistent single-select toggle. aria-expanded on a disclosure.

ONE edit applied — confirm CORRECT or NEEDS-FIX:

1) L218 Back `<button>` — a **bare** raw button (`<button type="button" onClick={() => navigate(-1)}>` with NO className, icon-only ArrowLeft, no visible text). Added className FROM SCRATCH + aria. Since the button had NO prior padding/size, used `rounded-full` (no padding) so layout stays byte-identical. Icon-only tier → fresh `active:scale-95` (no prior scale, so NOT the active:scale-90 DON'T-CHURN case). Scale is the SOLE animated prop (no hover pseudo) → `transition-transform`. OUTWARD `ring-ring` (parent is the neutral sticky header bar). After: `aria-label="Go back"` + `className="rounded-full active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`.

SKIP confirmed: L223 "GPS Active" shadcn `<Badge variant="outline">` (not interactive, no onClick); L264 barcode `<Input>` (shadcn, onChange + onKeyDown Enter logic — LEAVE); L272 scan submit shadcn `<Button disabled={syncing || !barcodeInput} size="sm">` (own tokens, icon-only content but shadcn handles its own aria/focus); L308 "Message" shadcn `<Button variant="outline" size="sm">` (own tokens, visible text, navigate logic); all `<Card>`/`CardContent` (shadcn); all qty `<Badge>` (shadcn, not interactive); all lucide icons (decorative); all `<p>` text.

KEY QUESTIONS: (1) the bare-Back-button edit correct (className-from-scratch with rounded-full + icon-only active:scale-95 + transition-transform + OUTWARD ring-ring + aria-label="Go back")? (2) is icon-only `active:scale-95` the right tier for a fresh back button (vs active:scale-90 which is only for back buttons ALREADY shipping it = DON'T-CHURN), and is `transition-transform` correct (scale sole animated prop, no hover pseudo)? (3) did I miss any raw interactive control or mis-skip? Confirm the scan submit `<Button>` (icon-only Loader2/CheckCircle content) and the "Message" `<Button>` are correctly SKIPPED as shadcn (no raw aria-label needed). (4) any dead-code FLAG worth noting (e.g. `scanMode`/`setScanMode` state + several imported-but-unused lucide icons appear unused)? Be concise and exact; return precise final className after-string + aria attr.
- files: src/pages/app/shop/TruckDashboardPage.tsx

---

## Audit: TruckDashboardPage — Back-button slice

**Verdict: CORRECT ✅ — zero fixes needed. File is ready to commit as-is.**

---

### (1) Short plan

Single raw interactive control in the file: the **bare Back `<button>`** at L218 (icon-only ArrowLeft, zero className). Everything else is shadcn (Button/Card/Badge/Input) with own tokens. One edit, no missed controls.

---

### (2) Proposed change — exact before/after

**File:** `src/pages/app/shop/TruckDashboardPage.tsx`

**Before (L218):**
```tsx
<button type="button" onClick={() => navigate(-1)}>
```

**After (L218):**
```tsx
<button type="button" aria-label="Go back" onClick={() => navigate(-1)} className="rounded-full active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**That's it.** The file already shows the after state in the context you provided — the edit has been applied. No other lines changed.

---

### (3) Per-attribute verification

| Attribute | Value | Rationale |
|-----------|-------|-----------|
| `rounded-full` | ✅ | Tight ring trace; no padding → layout byte-identical |
| `active:scale-95` | ✅ | Fresh back button (no prior scale) → icon-only tier; NOT the `active:scale-90` DON'T-CHURN case |
| `transition-transform` | ✅ | Scale is the SOLE animated prop on the element (no hover:bg/border/opacity pseudo) |
| `focus-visible:ring-2 focus-visible:ring-ring` | ✅ | OUTWARD — parent is `bg-background/95` sticky header (neutral) |
| `aria-label="Go back"` | ✅ | Icon-only control (ArrowLeft glyph, no visible text) |

**Guard-grep tally:** 1 className edit, 1 new aria (1 `aria-label`, 0 `aria-pressed`, 0 `aria-expanded`); `ring-ring`=1 OUTWARD; `ring-inset`=0; `active:scale-95`=1; FLIPs=0; DON'T-CHURN preserved=0; competing 2nd press=0; `disabled` touched=0; 0 logic lines touched.

---

### (3a) Skip audit — all correct

| Line | Control | Skip reason |
|------|---------|-------------|
| L223 | `<Badge variant="outline">` "GPS Active" | shadcn, not interactive, no onClick |
| L264 | `<Input>` barcode | shadcn, onChange + onKeyDown logic (LEAVE) |
| L272 | `<Button disabled={...} size="sm">` scan submit | shadcn, own tokens/focus, visible content |
| L308 | `<Button variant="outline" size="sm">` "Message" | shadcn, own tokens, navigate logic |
| All | `<Card>`/`<CardContent>` | shadcn presentational |
| All | `<Badge>` qty pills | shadcn, not interactive |
| All | lucide icons | decorative |
| All | `<p>`/`<span>`/`<div>` text | no onClick, no role="button" |

**No other raw `<button>`, raw `<a>`, clickable `onClick` divs, or `role="button"`/`cursor-pointer` divs.**

---

### (4) Dead-code FLAGS (not fixed — out of scope)

1. **`scanMode` / `setScanMode`** (L56) — declared as `useState(false)` but **never read or toggled** anywhere in the JSX or logic. Dead state.
2. **Unused lucide imports** — `Navigation`, `Minus`, `Plus`, `Camera`, `RefreshCw` are imported but **never rendered** in the component. Dead imports (lint may or may not flag these depending on config).
3. **`(supabase as any)` casts** — all Supabase reads use `(supabase as any)` (untyped). Pre-existing pattern across the codebase.
4. **GPS `watchPosition` has no cleanup** — the `useEffect` at L60 calls `navigator.geolocation.watchPosition` but **never calls `clearPosition`** on unmount. The watcher ID is discarded. Minor memory-lifecycle concern, pre-existing.
5. **Nearby customers are synthetic** — `lat`/`lng` are set to the truck driver's own position (`userLat`/`userLng`), and `distance_km` is hardcoded to `0`. These are not real nearby-customer coordinates — they're just recent-order customers. Naming is misleading but functionally harmless.

---

### Owner verification

Run `npm run update` — must pass (type-check + worker type-check + production build, TRUE EXIT 0).

The `aria-label` and `className` are the only additions; no logic, no `onClick`, no `navigate`, no `useState`, no `useEffect`, no `useCallback`, no `useRef`, no `supabase` calls, no `onChange`, no `onKeyDown`, no `disabled` bytes were touched. Diff is 1 line, purely display-aria.
