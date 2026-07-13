# MiMo run — 2026-06-13T22:12:26.137Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Analyze src/pages/car-dealership/PublicCarDealershipDetailPage.tsx (customer-facing PUBLIC car-dealership vehicle DETAIL page at route /car-dealership/:slug/v/:vehicleId) for PREMIUM interaction-polish parity with reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change any supabase queries, mutations, react-query keys, routing, or component logic — propose ONLY JSX/Tailwind className changes plus tiny display-only logic. CONTEXT: shadcn <Button>/<Input>/<Select>/<Checkbox>/<Textarea> ALREADY include active:scale + focus-visible:ring, so DO NOT propose edits to those. Focus ONLY on RAW interactive elements that currently have ZERO active:scale and ZERO focus rings: (a) PaymentCalculator loan-term raw <button> ~L167 'flex-1 rounded-md py-1 text-xs font-medium transition-colors'; (b) SimilarVehiclesGrid <Link> cards ~L235 'block group' (focusable); (c) Lightbox icon-only <button>s close ~L307 / prev ~L325 / next ~L333 on bg-white/10; (d) header store-name <Link> ~L781 'text-base font-bold hover:text-primary transition-colors truncate block'; (e) header tel: link ~L791; (f) back-to-inventory raw <button> ~L804 'text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1'; (g) main photo <button> ~L856 'block w-full aspect-[16/10] rounded-xl overflow-hidden bg-muted relative group'; (h) thumbnail <button>s ~L875 cn('aspect-[4/3] rounded-md overflow-hidden border-2 relative transition-all',...); (i) CTA-card tel: link ~L919; (j) footer tel: link ~L1023; (k) not-found back-to-inventory <Link> ~L747. For each propose: add active:scale-[0.98] (cards/wide) or active:scale-[0.97] (links/chips) or active:scale-[0.95] (icon-only) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring, upgrade transition-colors/transition-shadow to transition-all. Note any NON-focusable clickable div where focus ring is dead CSS (apply active:scale only). Also check responsive at 375/768/1280: header row, two-col main/sidebar layout, specs grid, thumbnail row, similar-vehicles grid — flag any crush. Also flag any fetched-but-unused DB fields worth surfacing display-only (fields fetched: vin, drivetrain, engine, cylinders, doors, seats, interior_color, description, features, photo_urls). Return a CONCISE line-referenced punch list of exact className edits. Do NOT reprint the whole component. Under ~1200 tokens.
- files: src/pages/car-dealership/PublicCarDealershipDetailPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

Identify every raw interactive element lacking `active:scale` + `focus-visible:ring` (shadcn components already have them — skip). Apply the reference `JobPostingDetailPage` interaction tokens: cards/wide → `scale-[0.98]`, links/chips → `[0.97]`, icon-only → `[0.95]`. Upgrade `transition-colors` → `transition-all`. No query/mutation/logic changes.

---

## Proposed className-only edits

**File:** `src/pages/car-dealership/PublicCarDealershipDetailPage.tsx`

| # | Element | Current (key fragment) | Proposed |
|---|---------|----------------------|----------|
| **a** | Loan-term `<button>` (L167) | `"flex-1 rounded-md py-1 text-xs font-medium transition-colors"` | `"flex-1 rounded-md py-1 text-xs font-medium transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` |
| **b** | SimilarVehiclesGrid `<Link>` (L235) | `"block group"` | `"block group rounded-lg transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` |
| **c1** | Lightbox close `<button>` (L307) | `"absolute top-4 right-4 rounded-full bg-white/10 hover:bg-white/20 p-2 text-white transition-colors"` | append `" active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"` |
| **c2** | Lightbox prev `<button>` (L325) | `"absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 hover:bg-white/20 p-2 text-white"` | append `" transition-transform active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"` |
| **c3** | Lightbox next `<button>` (L333) | same as prev | same treatment |
| **d** | Header store-name `<Link>` (L781) | `"text-base font-bold hover:text-primary transition-colors truncate block"` | `"text-base font-bold hover:text-primary transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm truncate block"` |
| **e** | Header tel: `<a>` (L791) | `"hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border bg-background hover:bg-muted px-3 py-1.5 text-sm font-medium transition-colors"` | append `" active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` |
| **f** | Back-to-inventory `<button>` (L804) | `"text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"` | append `" transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"` |
| **g** | Main photo `<button>` (L856) | `"block w-full aspect-[16/10] rounded-xl overflow-hidden bg-muted relative group"` | append `" transition-all active:scale-[0.98]"` (**no ring** — clicking opens lightbox which manages its own focus) |
| **h** | Thumbnail `<button>` (L875) | `"aspect-[4/3] rounded-md overflow-hidden border-2 relative transition-all"` | append `" active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` (inside `cn()` base) |
| **i** | CTA-card tel: `<a>` (L919) | `"flex items-center justify-center w-full gap-1.5 rounded-md border border-border bg-background hover:bg-muted px-3 py-2 text-sm font-medium transition-colors"` | append `" active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` |
| **j** | Footer tel: `<a>` (L1023) | `"flex items-center gap-1 hover:text-foreground"` | append `" transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"` |
| **k** | Not-found back `<Link>` (L747) | `"mt-4 inline-block text-primary underline"` | append `" transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"` |

---

## Fetched-but-unused DB fields

**None.** All fetched fields are already rendered
