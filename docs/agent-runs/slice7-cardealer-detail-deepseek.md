# DeepSeek run — 2026-06-13T22:11:49.552Z

- model: deepseek-chat
- task: Analyze src/pages/car-dealership/PublicCarDealershipDetailPage.tsx (customer-facing PUBLIC car-dealership vehicle DETAIL page at route /car-dealership/:slug/v/:vehicleId) for PREMIUM interaction-polish parity with reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change any supabase queries, mutations, react-query keys, routing, or component logic — propose ONLY JSX/Tailwind className changes plus tiny display-only logic. CONTEXT: shadcn <Button>/<Input>/<Select>/<Checkbox>/<Textarea> ALREADY include active:scale + focus-visible:ring, so DO NOT propose edits to those. Focus ONLY on RAW interactive elements that currently have ZERO active:scale and ZERO focus rings: (a) PaymentCalculator loan-term raw <button> ~L167 'flex-1 rounded-md py-1 text-xs font-medium transition-colors'; (b) SimilarVehiclesGrid <Link> cards ~L235 'block group' (focusable); (c) Lightbox icon-only <button>s close ~L307 / prev ~L325 / next ~L333 on bg-white/10; (d) header store-name <Link> ~L781 'text-base font-bold hover:text-primary transition-colors truncate block'; (e) header tel: link ~L791; (f) back-to-inventory raw <button> ~L804 'text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1'; (g) main photo <button> ~L856 'block w-full aspect-[16/10] rounded-xl overflow-hidden bg-muted relative group'; (h) thumbnail <button>s ~L875 cn('aspect-[4/3] rounded-md overflow-hidden border-2 relative transition-all',...); (i) CTA-card tel: link ~L919; (j) footer tel: link ~L1023; (k) not-found back-to-inventory <Link> ~L747. For each propose: add active:scale-[0.98] (cards/wide) or active:scale-[0.97] (links/chips) or active:scale-[0.95] (icon-only) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring, upgrade transition-colors/transition-shadow to transition-all. Note any NON-focusable clickable div where focus ring is dead CSS (apply active:scale only). Also check responsive at 375/768/1280: header row, two-col main/sidebar layout, specs grid, thumbnail row, similar-vehicles grid — flag any crush. Also flag any fetched-but-unused DB fields worth surfacing display-only (fields fetched: vin, drivetrain, engine, cylinders, doors, seats, interior_color, description, features, photo_urls). Return a CONCISE line-referenced punch list of exact className edits. Do NOT reprint the whole component. Under ~1200 tokens.
- files: src/pages/car-dealership/PublicCarDealershipDetailPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

Apply premium interaction tokens (`active:scale` + `focus-visible:ring`) to all raw interactive elements on `PublicCarDealershipDetailPage.tsx` that currently lack them, matching the `JobPostingDetailPage.tsx` reference pattern. No supabase queries, mutations, routing, or component logic changes.

## Proposed Changes

**File:** `src/pages/car-dealership/PublicCarDealershipDetailPage.tsx`

### 1. PaymentCalculator loan-term buttons (~L167)
```diff
- "flex-1 rounded-md py-1 text-xs font-medium transition-colors",
+ "flex-1 rounded-md py-1 text-xs font-medium transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
```

### 2. SimilarVehiclesGrid `<Link>` cards (~L235)
```diff
- className="block group"
+ className="block group active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
```

### 3. Lightbox close button (~L307)
```diff
- className="absolute top-4 right-4 rounded-full bg-white/10 hover:bg-white/20 p-2 text-white transition-colors"
+ className="absolute top-4 right-4 rounded-full bg-white/10 hover:bg-white/20 p-2 text-white transition-all active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
```

### 4. Lightbox prev button (~L325)
```diff
- className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 hover:bg-white/20 p-2 text-white"
+ className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 hover:bg-white/20 p-2 text-white transition-all active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
```

### 5. Lightbox next button (~L333)
```diff
- className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 hover:bg-white/20 p-2 text-white"
+ className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 hover:bg-white/20 p-2 text-white transition-all active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
```

### 6. Header store-name `<Link>` (~L781)
```diff
- className="text-base font-bold hover:text-primary transition-colors truncate block"
+ className="text-base font-bold hover:text-primary transition-all truncate block active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
```

### 7. Header tel: link (~L791)
```diff
- className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border bg-background hover:bg-muted px-3 py-1.5 text-sm font-medium transition-colors"
+ className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border bg-background hover:bg-muted px-3 py-1.5 text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### 8. Back-to-inventory button (~L804)
```diff
- className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
+ className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
```

### 9. Main photo button (~L856)
```diff
- className="block w-full aspect-[16/10] rounded-xl overflow-hidden bg-muted relative group"
+ className="block w-full aspect-[16/10] rounded-xl overflow-hidden bg-muted relative group active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### 10. Thumbnail buttons (~L875)
```diff
- className={cn("aspect-[4/3] rounded-md overflow-hidden border-2 relative transition-all", ...)}
+ className={cn("aspect-[4/3] rounded-md overflow-hidden border-2 relative transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", ...)}
```

### 11. CTA-card tel: link (~L919)
```diff
- className="flex items-center justify-center w-full gap-1.5 rounded-md border border-border bg-background hover:bg-muted px-3 py-2 text-sm font-medium transition-colors"
+ className="flex items-center justify-center w-full gap-1.5 rounded-md border border-border bg-background hover:bg-muted px-3 py-2 text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### 12. Footer tel: link (~L1023)
```diff
- className="flex items-center gap-1 hover:text-foreground"
+ className="flex items-center gap-1 hover:text-foreground transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
```

### 13. Not-found back-to-inventory `<Link>` (~L747)
```diff
- className="mt-4 inline-block text-primary underline"
+ className="mt-4 inline-block text-primary underline active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
```

## Responsive Check

- **Header row:** `flex items-center gap-3` with `min-w-0 flex-1` — wraps cleanly at 375px (logo + name + address stack, phone link hidden via `hidden sm:inline-flex`)
- **Two-col layout:** `grid-cols-1 lg:grid-cols-3` — single column on mobile, sidebar right on desktop
- **Specs grid:** `grid-cols-1 sm:grid-cols-2 md:grid-cols-3` — responsive, no crush
- **Thumbnail row:** `grid-cols-5 sm:grid-cols-6` — 5 columns at 375px is tight but works (small thumbs)
- **Similar vehicles:** `grid-cols-2 md:grid-cols-3` — 2 columns on mobile, fine
- **No crush at any breakpoint** — layout is already responsive

## Fetched-but-unused Fields

- **`vin`** — already displayed in the sidebar Vehicle card
- **`drivetrain`, `engine`, `cylinders`, `doors`, `seats`, `interior_color`** — all rendered in the specs grid
- **`description`** — rendered in "About this vehicle" card
- **`features`** — rendered in "Features & options" card
- **`photo_urls`** — used for the gallery
- **No unused fields to surface**

## Verification

Run `npm run update` after applying changes. Preview at 375/768/1280 to confirm all buttons have `active:scale` press feedback and `focus-visible:ring` keyboard indicators.
