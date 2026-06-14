# DeepSeek run — 2026-06-14T11:24:57.566Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/ShopDashboard.tsx (221-line merchant **Shop Dashboard** root — wrapped in `<StoreOwnerLayout>` (a sidebar layout component) on the happy path, but renders TWO bare fallback states before that: a loading spinner, and a **"Open your shop" empty state** (own `min-h-screen bg-background flex items-center justify-center` shell) with two raw full-width `<button>`s ("Create my shop" → /store/setup, "Not now" → /more); the resolved dashboard body has a `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5` of FIVE quick-action `<button>` tiles (`quickActions.map`: Edit shop/Products/Orders/Analytics/Payments, each navigate) + a stats grid of presentational `<div>`s. `useEffect`/`useState`; `useAuth`; `@tanstack/react-query` `useQuery`×2 (store + stats); `supabase.from("store_profiles"|"store_orders")`; `resolveBusinessDashboardRoute`; `<Navigate>` redirect; lucide icons). RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) + whileTap ONLY; preserve ALL logic, onClick, navigate, useState/useEffect, useQuery/queryKey/queryFn/enabled, supabase calls, the TAB_ROUTES redirect effect, the <Navigate> redirect, disabled byte-identical. Don't add role/tabIndex/onKeyDown (structural — FLAG). SKIP `<StoreOwnerLayout>` (layout component, own tokens/sidebar).

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Neutral parent (bg-card/background/secondary/muted) = ring-ring. A non-standard ring color (e.g. ring-primary/60) on a neutral parent is a deviation from house standard → normalize to ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills/card-tiles active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface (transparent, only a hover bg) active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO a hover:/active: bg/text(color)/border/opacity pseudo ON THE ELEMENT ITSELF. FLIP transition-colors->transition-all when adding a scale to an element that ALSO has a hover color/bg/border pseudo.
- DON'T-CHURN: control ALREADY has press (active:scale) + transition-all -> add ring (+aria) ONLY; don't add a competing 2nd scale, don't downgrade.
- aria: aria-label ONLY on icon-only/glyph-only controls (these all have visible text → NO aria-label). aria-pressed on a persistent single-select toggle. aria-expanded on a disclosure.

THREE edits applied — confirm CORRECT or NEEDS-FIX:

1) L101 "Create my shop" full-width `<button>` (visible text + ArrowRight icon) — **DON'T-CHURN** (already `active:scale-[0.98] transition-all`, has `hover:bg-emerald-600` pseudo). Was missing ring. ADDED ring ONLY: `w-full h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Tier `active:scale-[0.98]` already correct (wide full-width WITH own surface bg-emerald-500). OUTWARD ring-ring (renders against the neutral bg-background empty-state parent, even though the button fill is emerald). NO aria-label (visible text).

2) L108 "Not now" full-width `<button>` (visible text only) — was `hover:bg-muted/40 transition-colors`, NO scale/ring. It has NO persistent own surface (transparent, only a hover bg) → **bare full-width row tier `active:scale-[0.99]`**. ADDED `active:scale-[0.99]` + ring, **FLIP `transition-colors`→`transition-all`** (has hover:bg pseudo + adding scale). After: `w-full h-10 mt-2 rounded-2xl text-sm font-semibold text-muted-foreground hover:bg-muted/40 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. NO aria-label (visible text). OUTWARD ring-ring.

3) L184 quick-action tile `<button>` (×5 via `quickActions.map`, visible text label + colored icon) — **DON'T-CHURN otherwise** (already `active:scale-[0.97] transition-all` card-tile tier + a focus ring), BUT the existing ring used a **non-standard color `focus-visible:ring-primary/60`** → **NORMALIZED to house-standard `focus-visible:ring-ring`** (bg-card tile on a neutral parent = ring-ring per the vocab). KEPT scale-[0.97] + transition-all + focus-visible:outline-none. After: `flex flex-col items-center justify-center gap-2 rounded-2xl border border-border/40 bg-card p-3 hover:bg-muted/40 active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. NO aria-label (visible text). OUTWARD ring-ring.

SKIP confirmed: `<StoreOwnerLayout>` (layout component, own sidebar/tokens — the sidebar tab buttons live inside it and are out of scope for this file); the loading-spinner `<div>` (presentational); the 4 stats `<div>`s (presentational, no onClick); all lucide icons (decorative); all `<h1>`/`<h2>`/`<p>`/`<span>` text; the `<Navigate>` redirect (routing logic).

KEY QUESTIONS: (1) all 3 edits correct (1 DON'T-CHURN add ring only; 2 FLIP + bare-full-width-row scale-[0.99] + ring; 3 normalize ring-primary/60→ring-ring keeping the rest)? (2) **the #3 ring-color normalization** — is changing `focus-visible:ring-primary/60` → `focus-visible:ring-ring` the RIGHT call for a token pass (house standard = ring-ring on a neutral bg-card parent), or should a DON'T-CHURN control that ALREADY has a working (if non-standard) ring be LEFT untouched? (3) for #2 — is `active:scale-[0.99]` (bare full-width row, NO own surface) the correct tier vs `active:scale-[0.98]` (full-width WITH own surface)? The "Not now" button is transparent with only a hover:bg-muted/40, no persistent fill → I read it as bare-row tier. (4) did I miss any raw interactive control or mis-tier any? Be concise and exact; return precise final className after-strings.
- files: src/pages/app/ShopDashboard.tsx

---

## Review of ShopDashboard.tsx — 3 edits

### (1) Short plan

Three className-only edits on raw `<button>`s in the empty-state and dashboard body. All logic, hooks, supabase calls, and `<StoreOwnerLayout>` left untouched. Edits follow the house token vocabulary exactly.

### (2) Proposed changes — exact before/after

**File:** `src/pages/app/ShopDashboard.tsx`

**Edit #1 — L101 "Create my shop" button (DON'T-CHURN)**

Before:
```tsx
className="w-full h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
```

After:
```tsx
className="w-full h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Edit #2 — L108 "Not now" button (FLIP + bare-row tier)**

Before:
```tsx
className="w-full h-10 mt-2 rounded-2xl text-sm font-semibold text-muted-foreground hover:bg-muted/40 transition-colors"
```

After:
```tsx
className="w-full h-10 mt-2 rounded-2xl text-sm font-semibold text-muted-foreground hover:bg-muted/40 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Edit #3 — L184 quick-action tile button (normalize ring color)**

Before:
```tsx
className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border/40 bg-card p-3 hover:bg-muted/40 active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
```

After:
```tsx
className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border/40 bg-card p-3 hover:bg-muted/40 active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### (3) Key questions answered

1. **All 3 edits correct?** ✅ Yes. #1 is textbook DON'T-CHURN (ring only, no aria needed for visible text). #2 is correct FLIP + bare-row `scale-[0.99]`. #3 normalizes the ring color.

2. **Ring color normalization (#3) — right call?** ✅ **Yes.** The house standard is `ring-ring` on neutral parents (`bg-card`). `ring-primary/60` was a deviation. This is a token pass — normalizing to the standard is the correct action. DON'T-CHURN means "don't add competing scale or change transition", not "leave non-standard tokens". The ring color is a token, not a structural change.

3. **#2 tier — `scale-[0.99]` correct?** ✅ **Yes.** The "Not now" button has no persistent surface (transparent, only `hover:bg-muted/40`). That's the bare full-width row tier. `scale-[0.98]` is for buttons WITH own surface (like the emerald "Create my shop" button). Correct distinction.

4. **Missed controls?** ✅ **None.** The loading spinner `<div>`, stats `<div>`s, lucide icons, text, `<Navigate>`, and `<StoreOwnerLayout>` are all correctly skipped. No other raw `<button>`, `<a>`, or clickable `onClick` divs exist.

### Guard grep tally
- className edits: 3
- New aria: 0 (all visible text)
- `focus-visible:ring`: 3
- `ring-ring`: 3 (OUTWARD)
- `ring-inset`: 0
- `active:scale-[0.98]` kept: 1 (#1 DON'T-CHURN)
- `active:scale-[0.99]` new: 1 (#2)
- `active:scale-[0.97]` kept: 1 (#3 DON'T-CHURN)
- FLIPs: 1 (#2)
- DON'T-CHURN preserved: 2 (#1, #3)
- `disabled` touched: 0
- Logic lines touched: 0

### Owner verification
- Run `npm run update` to confirm type-check + build pass
- Preview the empty state at `/shop-dashboard` (requires no store profile for the signed-in user)
- Preview the dashboard body (requires a store profile) to verify the quick-action tiles' ring color change
- The `<StoreOwnerLayout>` sidebar tab buttons are out of scope for this file — they live in the layout component
