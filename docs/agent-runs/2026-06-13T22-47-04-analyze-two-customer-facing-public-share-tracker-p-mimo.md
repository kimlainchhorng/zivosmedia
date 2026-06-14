# MiMo run — 2026-06-13T22:47:04.556Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Analyze TWO customer-facing PUBLIC share-tracker pages — src/pages/PublicOrderSharePage.tsx (live food-order tracker, route /share/order/:orderId) and src/pages/PublicTripSharePage.tsx (live ride tracker, route /share/trip/:tripId) — for PREMIUM + RESPONSIVE refinements toward parity with reference src/pages/hubs/JobPostingDetailPage.tsx. These are read-only trackers; each has exactly ONE interactive control: a 'Track this' watchlist toggle <button> that already has active:scale-[0.99] transition-transform touch-manipulation but NO focus-visible ring. HARD RULE: do NOT change any supabase queries, realtime channels, mutations, react-query keys, routing, or component logic — propose ONLY JSX/Tailwind className changes plus tiny display-only logic. For EACH page separately: (1) interaction consistency — add focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring to the watchlist button (keep its existing active:scale-[0.99]); flag any OTHER raw interactive control I may have missed; (2) responsive issues at 375/768/1280 (both are single max-w-screen-sm centered columns); (3) any fetched-but-unused fields worth surfacing display-only. Return a CONCISE per-file line-referenced punch list of exact className edits with before/after. Do NOT reprint whole components. Keep under ~900 tokens.
- files: src/pages/PublicOrderSharePage.tsx, src/pages/PublicTripSharePage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

Both pages are near-identical read-only trackers with exactly **one** interactive control each: the watchlist "Track this" `<button>`. The only gap vs. the reference is the missing keyboard focus ring. One className edit per file. No other raw interactive controls exist. No fetched-but-unused fields worth surfacing. No responsive issues (single `max-w-screen-sm` centered column, clean at all widths).

---

## Proposed Diffs

### 1. `src/pages/PublicOrderSharePage.tsx` — L195 (watchlist `<button>`)

**Before:**
```
className={`w-full flex items-center gap-3 rounded-2xl border p-3 text-left active:scale-[0.99] transition-transform touch-manipulation ${
```

**After:**
```
className={`w-full flex items-center gap-3 rounded-2xl border p-3 text-left active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation ${
```

`transition-transform` → `transition-all` + append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Keeps existing `active:scale-[0.99]` and `touch-manipulation`.

---

### 2. `src/pages/PublicTripSharePage.tsx` — L198 (watchlist `<button>`)

**Before:**
```
className={`w-full flex items-center gap-3 rounded-2xl border p-3 text-left active:scale-[0.99] transition-transform touch-manipulation ${
```

**After:**
```
className={`w-full flex items-center gap-3 rounded-2xl border p-3 text-left active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation ${
```

Identical token change — the button was already `active:scale-[0.99]`, just missing the keyboard ring.

---

### Additional audit findings

| Check | Order page | Trip page |
|-------|-----------|-----------|
| **Other raw interactive controls** | None. All other elements are `<div>`/`<span>` text (Rows, Shield card, LIVE dot). No `<a>`, no second `<button>`. | Same — zero. |
| **Responsive at 375/768/1280** | Single `max-w-screen-sm` column, no grid/sidebars. `pt-safe` header, `px-4` main. Clean. | Identical layout. Clean. |
| **Fetched-but-unused fields** | `delivery_address` → already used (shortened). `restaurant_id` → resolved to name. `updated_at` → used for expiry TTL. `eta_minutes` → shown. Nothing wasted. | `assigned_driver_id` → resolved to name/vehicle. `pickup_address`/`dropoff_address` → shown. `updated_at` → used for expiry TTL. Nothing wasted. |

**Total: 2 files, 2 insertions, 2 deletions. Pure className swaps, zero logic changes.**

---

## Owner action

1. Apply the two one-line className edits above.
2. `npm run update` — gate must pass.
3. Keyboard-tab to the watchlist button on each page → confirm the `ring-2 ring-ring` focus ring appears.
