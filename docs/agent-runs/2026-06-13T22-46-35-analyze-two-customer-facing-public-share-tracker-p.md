# DeepSeek run — 2026-06-13T22:46:35.313Z

- model: deepseek-chat
- task: Analyze TWO customer-facing PUBLIC share-tracker pages — src/pages/PublicOrderSharePage.tsx (live food-order tracker, route /share/order/:orderId) and src/pages/PublicTripSharePage.tsx (live ride tracker, route /share/trip/:tripId) — for PREMIUM + RESPONSIVE refinements toward parity with reference src/pages/hubs/JobPostingDetailPage.tsx. These are read-only trackers; each has exactly ONE interactive control: a 'Track this' watchlist toggle <button> that already has active:scale-[0.99] transition-transform touch-manipulation but NO focus-visible ring. HARD RULE: do NOT change any supabase queries, realtime channels, mutations, react-query keys, routing, or component logic — propose ONLY JSX/Tailwind className changes plus tiny display-only logic. For EACH page separately: (1) interaction consistency — add focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring to the watchlist button (keep its existing active:scale-[0.99]); flag any OTHER raw interactive control I may have missed; (2) responsive issues at 375/768/1280 (both are single max-w-screen-sm centered columns); (3) any fetched-but-unused fields worth surfacing display-only. Return a CONCISE per-file line-referenced punch list of exact className edits with before/after. Do NOT reprint whole components. Keep under ~900 tokens.
- files: src/pages/PublicOrderSharePage.tsx, src/pages/PublicTripSharePage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Analysis: PublicOrderSharePage & PublicTripSharePage

### Short Plan

Both pages are clean, well-structured read-only trackers. Each has exactly **one raw interactive control** (the watchlist toggle button) missing a `focus-visible` ring. No other raw controls exist. Both are responsive at 375/768/1280 (single `max-w-screen-sm` column). No fetched-but-unused fields worth surfacing.

---

### File 1: `src/pages/PublicOrderSharePage.tsx`

**Edit 1 — Watchlist button (L~160): Add focus-visible ring**

**Before:**
```tsx
className={`w-full flex items-center gap-3 rounded-2xl border p-3 text-left active:scale-[0.99] transition-transform touch-manipulation ${
```

**After:**
```tsx
className={`w-full flex items-center gap-3 rounded-2xl border p-3 text-left active:scale-[0.99] transition-transform touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
```

**Other raw controls:** None. The `Row` component is display-only (`div`s). The `Progress` is a shadcn component. The `motion.div` has no interactive role. The header/footer are static text.

**Responsive:** ✅ Clean at all breakpoints. Single column, `px-4` padding, `max-w-screen-sm` center. No crush.

**Fetched-but-unused:** `restaurant_id` is used (fetches restaurant name). `delivery_address` is used (shortened). `eta_minutes` and `updated_at` are used. Nothing to surface.

---

### File 2: `src/pages/PublicTripSharePage.tsx`

**Edit 1 — Watchlist button (L~160): Add focus-visible ring**

**Before:**
```tsx
className={`w-full flex items-center gap-3 rounded-2xl border p-3 text-left active:scale-[0.99] transition-transform touch-manipulation ${
```

**After:**
```tsx
className={`w-full flex items-center gap-3 rounded-2xl border p-3 text-left active:scale-[0.99] transition-transform touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
```

**Other raw controls:** None. Same analysis as order page — all other elements are display-only `div`s, shadcn `Progress`, or static text.

**Responsive:** ✅ Clean at all breakpoints. Same layout pattern as order page.

**Fetched-but-unused:** `assigned_driver_id` is used (fetches driver details). `pickup_address`/`dropoff_address`/`updated_at` all used. `vehicle_model`/`vehicle_color` used. Nothing to surface.

---

### Summary

| Page | Edits | Lines changed | Risk |
|------|-------|---------------|------|
| `PublicOrderSharePage.tsx` | 1 | ~L160 (className append) | None — className-only |
| `PublicTripSharePage.tsx` | 1 | ~L160 (className append) | None — className-only |

**Verify:** `npm run update` must pass. Preview both routes at 375/768/1280 — the watchlist button should show a visible ring on keyboard focus (`Tab` key).
