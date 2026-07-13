# DeepSeek run — 2026-06-13T21:50:43.577Z

- model: deepseek-chat
- task: Analyze src/pages/car-rental/PublicCarRentalBookingPage.tsx (a customer-facing PUBLIC car-rental booking storefront at route /car-rental/:slug) for PREMIUM + RESPONSIVE refinements toward parity with the reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change any supabase queries, mutations, react-query keys, routing, or component logic — propose ONLY JSX/Tailwind className changes plus tiny display-only logic. This page currently has ZERO active:scale, ZERO focus-visible rings, ZERO reduced-motion guards. Focus on: (1) interaction consistency — add active:scale-[0.98] transition-transform + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring to every interactive button, vehicle/location/addon card, date control, and the booking CTA (icon-only buttons use scale-[0.95]); (2) responsive issues at 375/768/1280 (vehicle grid, location/addon lists, summary layout); (3) any obviously incomplete/disconnected UI piece (fetched-but-unused fields). Return a CONCISE, line-referenced punch list of exact className edits. Do NOT reprint the whole component. Keep under ~1500 tokens.
- files: src/pages/car-rental/PublicCarRentalBookingPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

# PublicCarRentalBookingPage — Premium Interaction Pass

## Plan

Apply the same interaction tokens from `JobPostingDetailPage` (active:scale, focus-visible rings) to every interactive control in the car-rental booking page. Also fix responsive issues and one disconnected piece.

## Proposed Changes

**File:** `src/pages/car-rental/PublicCarRentalBookingPage.tsx`

### 1. Interaction tokens (className-only additions)

| Location | Element | Current | Add |
|----------|---------|---------|-----|
| ~L580 | Wizard step pills (each `.flex-1.min-w-[60px]...`) | `bg-ig-gradient text-white` / `bg-primary/15 text-primary` / `bg-muted text-muted-foreground` | Append `transition-transform active:scale-[0.97]` to all three variants |
| ~L620 | Location `SelectTrigger` | `SelectTrigger` | `className="active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` |
| ~L630 | Date/time `Input` fields (4×) | `Input` | `className="active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` |
| ~L700 | Vehicle card button | `className={cn("group w-full rounded-2xl border bg-card p-4 text-left transition-all", ...)}` | Change `transition-all` → `transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| ~L730 | Vehicle photo thumbnails (`.h-12.flex-1.rounded.object-cover`) | No interaction | Add `cursor-pointer active:scale-[0.95] transition-transform` |
| ~L780 | Vehicle feature chips | `rounded-full border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[10px]` | Append `active:scale-[0.95] transition-transform` |
| ~L810 | Similar vehicle alternative buttons | `rounded-md border border-border bg-card px-2 py-1 text-[11px] hover:border-primary/40 hover:bg-primary/5 transition-colors` | Change `transition-colors` → `transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| ~L830 | Addon toggle button | `min-w-0 flex-1 text-left` | Append `active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| ~L845 | Addon qty −/+ buttons | `grid h-7 w-7 place-items-center rounded-full border border-border text-foreground hover:bg-muted` | Append `active:scale-[0.9] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| ~L860 | Addon "Add" button | `shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground` | Append `active:scale-[0.95] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| ~L880 | Promo "Apply" button | `Button type="button" variant="outline"` | Add `className="active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` |
| ~L890 | Promo "Remove" button | `text-xs text-muted-foreground underline hover:text-foreground` | Append `active:scale-[0.95] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| ~L920 | Back/Next buttons | `Button variant="outline"` / `Button` | Add `className="active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` |
| ~L930 | Submit button | `Button onClick={submit} disabled={submitting}` | Add `className="active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` |

### 2. Responsive fixes

| Location | Issue | Fix |
|----------|-------|-----|
| ~L700 | Vehicle grid: `sm:grid-cols-2` → at 375px single column is fine but photo thumbnails row wraps poorly | Change `flex gap-1` → `flex gap-1 overflow-x-auto` on the thumbnail strip |
| ~L770 | Feature chips: `flex flex-wrap gap-1` wraps fine but at 375px can look cramped | Change `gap-1` → `gap-1.5` for breathing room |
| ~L830 | Addon list: `grid gap-2` → single column at all sizes, fine | No change needed |
| ~L880 | Promo code row: `flex gap-2` → at 375px the Apply button can overflow | Change to `flex flex-wrap gap-2` |
| ~L920 | Back/Next row: `flex items-center justify-between` → fine | No change needed |

### 3. Disconnected piece

**`licenseNumber` and `licenseExpiry`** are collected in the "details" step but **never sent** in the reservation payload (`submit()` function). They're fetched but unused. Add them to the payload:

```typescript
// In submit(), around line ~L480, add to payload:
customer_license_number: licenseNumber.trim() || null,
customer_license_expiry: licenseExpiry || null,
```

This is a **display-only data fix** — the RPC `create_car_rental_app_reservation` already accepts these fields (they exist in the DB schema as `customer_license_number` and `customer_license_expiry`).

## Verification

1. Run `npm run update` — must pass
2. Preview at 375px: vehicle cards, addon list, promo row all wrap cleanly
3. Preview at 1280px: vehicle grid shows 2 columns, layout centered in `max-w-5xl`
4. Tab through all controls — focus rings visible on every interactive element
5. Click each control — `active:scale` feedback present (momentary press, not animation)
