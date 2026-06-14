# MiMo run — 2026-06-14T11:25:47.570Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Verification — all 3 edits CORRECT ✅

**Short plan:** Audit the 3 edits against the source, the token vocabulary, and the guard rules. The file shown is the **after** state.

---

### Per-edit audit

| # | Control | Pattern | Verdict |
|---|---------|---------|---------|
| 1 | "Create my shop" button | **DON'T-CHURN** — existing `active:scale-[0.98]` + `transition-all` + `hover:bg-emerald-600` kept; ring added only. Scale tier correct (wide full-width WITH own surface `bg-emerald-500`). OUTWARD `ring-ring` against `bg-background` parent. Visible text → no aria-label. | ✅ |
| 2 | "Not now" button | **FLIP** `transition-colors`→`transition-all` (hover:bg pseudo on self + adding scale). **Bare-full-width-row tier** `active:scale-[0.99]` — correct: transparent, only `hover:bg-muted/40`, NO persistent own surface. OUTWARD `ring-ring`. Visible text → no aria-label. | ✅ |
| 3 | Quick-action tiles (×5) | **DON'T-CHURN** — existing `active:scale-[0.97]` + `transition-all` kept. **Ring-color normalization** `ring-primary/60`→`ring-ring` — correct per house standard (explicitly calls out `ring-primary/60` as a deviation on a neutral `bg-card` parent). This is a token normalization, not a competing addition or downgrade. OUTWARD `ring-ring`. Visible text → no aria-label. | ✅ |

---

### Answering the key questions

**(1) All 3 edits correct?** **YES.** All textually verified against the after-state source.

**(2) Ring-color normalization (#3) — right call?** **YES.** The vocab says explicitly: *"A non-standard ring color (e.g. ring-primary/60) on a neutral parent is a deviation from house standard → normalize to ring-ring."* DON'T-CHURN forbids adding a competing 2nd scale or downgrading — changing a ring *color* to match the standard is a token normalization, not a structural change. The ring behavior (visible on `focus-visible`, 2px, outward) is preserved; only the color changes from semi-transparent primary to `--ring` (black).

**(3) Scale tier for #2 — `scale-[0.99]` vs `scale-[0.98]`?** **`[0.99]` is correct.** The "Not now" button is transparent with only a `hover:bg-muted/40` — no persistent fill. That's the bare-full-width-row-no-own-surface tier. `[0.98]` is for elements WITH a persistent own surface (like `bg-emerald-500` on #1).

**(4) Any missed controls or mis-tiered?** **None.** The file has exactly 7 raw `<button>`s:

| Control | Status |
|---------|--------|
| "Create my shop" | Covered (#1) |
| "Not now" | Covered (#2) |
| 5× quick-action tiles | Covered (#3) |
| `<StoreOwnerLayout>` sidebar tabs | Correctly **skipped** (layout component, own tokens — out of scope) |
| Loading spinner `<div>` | Correctly skipped (presentational) |
| 4× stats `<div>`s | Correctly skipped (presentational, no onClick) |
| All other elements | Correctly skipped |

---

### Guard-grep tally

| Guard | Count |
|-------|-------|
| className edits | 3 ✓ |
| New aria | 0 (all have visible text; no toggles/disclosures) ✓ |
| `focus-visible:ring-ring` | All 7 controls ✓ |
| `ring-inset` | 0 ✓ |
| FLIPs | 1 (#2) ✓ |
| DON'T-CHURN preserved | 2 (#1, #3) ✓ |
| `disabled` touched | 0 ✓ |
| Logic lines touched | 0 ✓ |

---

### Final after-strings (precise)

**#1 — "Create my shop":**
```
w-full h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

**#2 — "Not now":**
```
w-full h-10 mt-2 rounded-2xl text-sm font-semibold text-muted-foreground hover:bg-muted/40 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

**#3 — Quick-action tiles (×5, identical):**
```
flex flex-col items-center justify-center gap-2 rounded-2xl border border-border/40 bg-card p-3 hover:bg-muted/40 active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

---

**CORRECT ✅ — zero fixes needed. File is ready to commit as-is. No diff needed** (the source shown IS the corrected state).

**Owner verification:** `npm run update` must pass (type-check + worker type-check + production build). The `StoreOwnerLayout` sidebar tab buttons (employees/payroll/schedule/etc.) live inside that layout component and were not touched — confirm their own ring/tokens are acceptable if not already done.
