# MiMo run — 2026-06-13T21:57:46.847Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Analyze src/pages/car-dealership/PublicCarDealershipListingPage.tsx (customer-facing PUBLIC car-dealership inventory storefront at route /car-dealership/:slug) for PREMIUM + RESPONSIVE refinements toward parity with the reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change any supabase queries, mutations, react-query keys, routing, or component logic — propose ONLY JSX/Tailwind className changes plus tiny display-only logic. IMPORTANT CONTEXT: the shadcn <Button>, <Input>, <Select>, <Checkbox>, <Textarea> components ALREADY include active:scale + focus-visible:ring, so DO NOT propose edits to those. Focus ONLY on the RAW interactive elements which currently have ZERO active:scale and ZERO focus-visible rings: (a) the header reviews anchor <a href=#reviews> (~L495), (b) the header phone link <a href=tel:> which is bordered button-style (~L508), (c) the clickable vehicle <Card onClick> grid cards which are DIVs not buttons with cursor-pointer hover:shadow-md transition-shadow group (~L668), (d) the footer phone link <a href=tel:> (~L792), (e) the not-found Back-to-home <Link> (~L450). For each propose: add active:scale-[0.98] (cards/wide) or active:scale-[0.97] (chips/links) or scale-[0.95] (icon-only) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring, upgrade transition-colors/transition-shadow to transition-all. Note: the vehicle card is a non-focusable DIV — flag whether a focus ring there is dead CSS and whether to leave it as active:scale only. Also check (2) responsive at 375/768/1280: header row, toolbar (search flex-1 min-w-200 + sort w-160 + Filters), filter grid grid-cols-2 md:grid-cols-5, vehicle grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3, reviews grid-cols-1 md:grid-cols-2 — flag any crush; (3) any obviously incomplete/disconnected UI. Return a CONCISE line-referenced punch list of exact className edits. Do NOT reprint the whole component. Under ~1200 tokens.
- files: src/pages/car-dealership/PublicCarDealershipListingPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

5 raw interactive elements need the standard premium interaction tokens (active:scale + focus-visible:ring). Vehicle card is a non-focusable `<div>` (via shadcn `<Card>`) — focus ring is dead CSS there; apply `active:scale-[0.98]` only. Responsive layout is clean at all three breakpoints — no crush.

---

## Punch list — exact className edits

**File:** `src/pages/car-dealership/PublicCarDealershipListingPage.tsx`

| # | Location | Current className | Add |
|---|----------|-------------------|-----|
| 1 | **L~495** header `#reviews` anchor | `flex items-center gap-1 hover:text-foreground transition-colors` | `active:scale-[0.97]` → change `transition-colors` to `transition-all`, add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| 2 | **L~508** header `tel:` link | `hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border bg-background hover:bg-muted px-3 py-1.5 text-sm font-medium transition-colors` | add `active:scale-[0.97]` → change `transition-colors` to `transition-all`, add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| 3 | **L~450** not-found `<Link to="/">` | `mt-4 inline-block text-primary underline` | add `active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| 4 | **L~668** vehicle `<Card onClick>` | `overflow-hidden cursor-pointer hover:shadow-md transition-shadow group` | add `active:scale-[0.98]` → change `transition-shadow` to `transition-all`. **No `focus-visible` ring** — this is a non-focusable `<div>` (shadcn Card), so `focus-visible:` is dead CSS. Leave as `active:scale` only. |
| 5 | **L~792** footer `tel:` link | `flex items-center gap-1 hover:text-foreground` | add `active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |

---

## Before/after diffs

**1 — Header reviews anchor (L~495):**
```diff
-                <a
-                  href="#reviews"
-                  className="flex items-center gap-1 hover:text-foreground transition-colors"
-                >
+                <a
+                  href="#reviews"
+                  className="flex items-center gap-1 hover:text-foreground transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
+                >
```

**2 — Header phone link (L~508):**
```diff
-              className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border bg-background hover:bg-muted px-3 py-1.5 text-sm font-medium transition-colors"
+              className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border bg-background hover:bg-muted px-3 py-1.5 text-sm font-medium transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**3 — Not-found back link (L~450):**
```diff
-          <Link to="/" className="mt-4 inline-block text-primary underline">Back to home</Link>
+          <Link to="/" className="mt-4 inline-block text-primary underline active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Back to home</Link>
```

**4 — Vehicle cards (L~668):**
```diff
-                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
+                className="overflow-hidden cursor-pointer hover:shadow-md transition-all active:scale-[0.98] group"
```
> Note: no `focus-visible:ring` — `<Card>` renders a `<div>`, not focusable via keyboard. Adding focus-visible would be dead CSS. If keyboard navigation is desired later, add `tabIndex={0}` + `onKeyDown` handler (behavior change — out of scope here).

**5 — Footer phone link (L~792):**
```diff
-                <a href={`tel:${store.phone}`} className="flex items-center gap-1 hover:text-foreground">
+                <a href={`tel:${store.phone}`} className="flex items-center gap-1 hover:text-foreground transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

---

## Responsive analysis (375 / 768 / 1280) — no crush found

| Element | 375px | 768px | 1280px |
|---------|-------|-------|--------|
| Header row | Phone hidden (`sm:hidden`); Contact shows icon-only text; logo+name truncate. ✓ | Phone + full "Contact dealer" visible. ✓ | Same. ✓ |
| Toolbar | Search `min-w-[200px]` + sort `w-[160px]` wrap to 2 rows via `flex-wrap`. ✓ | Fits one row (~400px used of ~720). ✓ | Comfortable. ✓ |
| Filter grid | `grid-cols-2` (2×3 grid, last item solo). ✓ | `md:grid-cols-5` single row. ✓ | Same. ✓ |
| Vehicle grid | `grid-cols-1` full-width cards. ✓ | `sm:grid-cols-2`. ✓ | `lg:grid-cols-3`. ✓ |
| Reviews | `grid-cols-1` stacked. ✓ | `md:grid-cols-2`. ✓ | Same. ✓ |
| Promo banner | `grid-cols-1` stacked. ✓ | `md:grid-cols-
