# MiMo run — 2026-06-13T21:52:02.340Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Analyze src/pages/car-rental/PublicCarRentalBookingPage.tsx (a customer-facing PUBLIC car-rental booking storefront at route /car-rental/:slug) for PREMIUM + RESPONSIVE refinements toward parity with the reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change any supabase queries, mutations, react-query keys, routing, or component logic — propose ONLY JSX/Tailwind className changes plus tiny display-only logic. This page currently has ZERO active:scale, ZERO focus-visible rings, ZERO reduced-motion guards. Focus on: (1) interaction consistency — add active:scale-[0.98] transition-transform + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring to every interactive button, vehicle/location/addon card, date control, and the booking CTA (icon-only buttons use scale-[0.95]); (2) responsive issues at 375/768/1280 (vehicle grid, location/addon lists, summary layout); (3) any obviously incomplete/disconnected UI piece (fetched-but-unused fields). Return a CONCISE, line-referenced punch list of exact className edits. Do NOT reprint the whole component. Keep under ~1500 tokens.
- files: src/pages/car-rental/PublicCarRentalBookingPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## 1. Short plan

Scan every interactive element (buttons, cards, toggle chips, quantity controls, CTAs) for the three missing tokens: `active:scale`, `focus-visible:ring`, `transition-*`. Then check responsive breakpoints and fetched-but-unused fields. 14 edits total — all className-only except two tiny display-only additions for `v.description` and `v.mileage_limit_per_day`.

---

## 2. Proposed changes — `src/pages/car-rental/PublicCarRentalBookingPage.tsx`

### A. Vehicle card button (step `"vehicle"`, the main `<button>` per vehicle)

```diff
- "group w-full rounded-2xl border bg-card p-4 text-left transition-all",
+ "group w-full rounded-2xl border bg-card p-4 text-left transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
```

### B. Alternative vehicle button (in the "Available alternatives" block)

```diff
- className="rounded-md border border-border bg-card px-2 py-1 text-[11px] hover:border-primary/40 hover:bg-primary/5 transition-colors"
+ className="rounded-md border border-border bg-card px-2 py-1 text-[11px] hover:border-primary/40 hover:bg-primary/5 transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### C. Add-on card body toggle button

```diff
- className="min-w-0 flex-1 text-left"
+ className="min-w-0 flex-1 text-left active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### D. Add-on quantity buttons (− and +)

```diff
  {/* decrease */}
- className="grid h-7 w-7 place-items-center rounded-full border border-border text-foreground hover:bg-muted"
+ className="grid h-7 w-7 place-items-center rounded-full border border-border text-foreground hover:bg-muted active:scale-[0.95] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

  {/* increase */}
- className="grid h-7 w-7 place-items-center rounded-full border border-border text-foreground hover:bg-muted disabled:opacity-30"
+ className="grid h-7 w-7 place-items-center rounded-full border border-border text-foreground hover:bg-muted disabled:opacity-30 active:scale-[0.95] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### E. Add-on "Add" button (when not selected)

```diff
- className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground"
+ className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### F. Promo "Remove" button

```diff
- className="text-xs text-muted-foreground underline hover:text-foreground"
+ className="text-xs text-muted-foreground underline hover:text-foreground active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### G. Promo "Apply" `<Button>`

```diff
- <Button type="button" variant="outline" onClick={applyPromoCode} disabled={!promoCodeInput.trim() || promoChecking}>
+ <Button type="button" variant="outline" onClick={applyPromoCode} disabled={!promoCodeInput.trim() || promoChecking} className="active:scale-[0.98] transition-transform">
```

### H. Wizard nav buttons (Back / Next / Submit)

```diff
- <Button variant="outline" onClick={goBack} disabled={submitting}>
+ <Button variant="outline" onClick={goBack} disabled={submitting} className="active:scale-[0.98] transition-transform">

- <Button onClick={goNext}>
+ <Button onClick={goNext} className="active:scale-[0.98] transition-transform">

- <Button onClick={submit} disabled={submitting}>
+ <Button onClick={submit} disabled={submitting} className="active:scale-[0.98] transition-transform">
```

### I. Responsive: vehicle grid 2→3 col at `lg:`

```diff
- <ul className="grid gap-3 sm:grid-cols-2">
+ <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
```

### J. Responsive: confirmation card padding tightens on mobile

```diff
- <CardContent className="p-8 text-center space-y-3">
+ <CardContent className="p-6 sm:p-8 text-center space-y-3">
```

### K. Fetched-but-unused: vehicle description

Insert **after** the features `<div>`, **before** the pricing `<div>`:

```jsx
{v.description && (
  <p className="mt-1.5 text-[11px] text-muted-foreground line-clamp-2">{v.description}</p>
)}
```

### L. Fetched-but-unused: mileage limit per day

Insert into the spec chips `<div className="mt-2 flex flex-wrap gap-2 …">`, after the `air_conditioning` chip:

```jsx
{v.mileage_limit_per_day != null && (
  <span className="inline-flex items-center gap-1">
    <Search className="h-3 w-3" />{v.mileage_limit_per_day} km/day
  </span>
)}
```

> *(Uses `Search` as a stand-in icon since there's no `Gauge` in the current imports. Alternatively add `import { Gauge } from "lucide-react"` and use `<Gauge>` — one extra import, display-only.)*

### M. Fetched-but-unused: store `category`

The `StoreInfo.category` field is fetched and stored but never rendered. Add it as a subtle tag next to the header city/state line:

```diff
  <p className="text-[11px] text-muted-foreground">
-   {[store.city, store.state].filter(Boolean).join(", ") || "Car Rental"}
+   {[store.city, store.state].filter(Boolean).join(", ") || "Car Rental"}
+   {store.category ? ` · ${store.category}` : ""}
  </p>
```

---

## 3. Owner must verify / deploy

- **Preview at 375 / 768 / 1280** — vehicle cards at `lg:grid-cols-3` (3 cards in `max-w-5xl` at 1280px = ~160px each with photo — verify the photo + price stack doesn't crush); addon quantity `h-7 w-7` buttons stay tappable (44px touch target is tight — they're already 28px, same as before, just adding visual feedback).
- **`npm run update`** must pass (no logic/imports changed beyond one optional `Gauge` import).
- The **`Storefront` sub-component** (passed as `<Storefront …>` in storefront mode) was not in the truncated source — it should receive the same interaction-token sweep separately.
- The `mileage_limit_per_day` chip uses `Search` as a placeholder icon — owner may prefer adding `Gauge` import for a speedometer glyph.
