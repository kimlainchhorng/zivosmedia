# MiMo run — 2026-06-13T22:44:55.139Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + responsive QA pass on ONE customer-facing page: src/pages/GroceryMarketplace.tsx (the LIVE /grocery landing — nearby grocery store list with delivery address bar, featured store spotlight, category chips, store cards). It ALREADY uses framer-motion whileTap for press feedback and has aria-labels on icon-only header buttons. Reference standard for interaction tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring). HARD RULE: className and display-only attribute (incl. framer-motion whileTap) changes ONLY — do NOT change any supabase query, hook, RPC, mutation, react-query key, routing, navigate target, or filter/sort logic. Identify genuine gaps ONLY: (1) interactive controls (motion.button/button/a) missing focus-visible keyboard rings; (2) controls missing press feedback (whileTap/active:scale) that their siblings already have; (3) icon-only buttons without aria-label; (4) responsive crush/overflow at 375px; (5) fetched-but-unused data fields; (6) contrast/legibility bugs. IMPORTANT: for motion elements whose scale is already controlled by framer-motion (whileTap or a scale variant), CSS active:scale is dead — use whileTap instead. Be concise; cite exact classNames not line numbers.
- files: src/pages/GroceryMarketplace.tsx

---

## Plan

Audit of `GroceryMarketplace.tsx` against the `JobPostingDetailPage` interaction-token reference found **6 genuine gaps** — all className-only (plus one `whileTap` addition on a sibling-matching control):

| # | Gap | Fix |
|---|-----|-----|
| 1 | **Header back button** — has `whileTap` + `aria-label` ✅, missing `focus-visible` ring | Append ring tokens, `transition-colors` → `transition-all` |
| 2 | **Orders button** — has `whileTap` + `aria-label` ✅, missing ring | Same |
| 3 | **Cart button** — has `whileTap` + `aria-label` ✅, missing ring | Same |
| 4 | **FeaturedStore** card — has `whileTap` ✅, missing ring | Append ring |
| 5 | **StoreCardWithLocation** card — has `whileTap` ✅, missing ring | Append ring |
| 6 | **Local-store cards** — **missing `whileTap`** (siblings have `scale: 0.97`) **and** missing ring | Add `whileTap={{ scale: 0.97 }}` + ring |
| 7 | **Hero trust-badge row** — `flex` at 375px could jam 3 items | Add `flex-wrap` |

No aria-label gaps (3 icon-only buttons all labeled ✅). No fetched-but-unused fields. No contrast bugs. No logic/queries touched.

---

## Proposed Diff — `src/pages/GroceryMarketplace.tsx`

**Edit 1 — Header back button** (className swap):
```
BEFORE: className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-2xl hover:bg-muted/60 transition-colors duration-200 touch-manipulation"
AFTER:  className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-2xl hover:bg-muted/60 transition-all duration-200 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Edit 2 — Orders button** (className swap):
```
BEFORE: className="p-2.5 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors duration-200"
AFTER:  className="p-2.5 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Edit 3 — Cart button** (className swap):
```
BEFORE: className="relative p-2.5 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors duration-200"
AFTER:  className="relative p-2.5 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Edit 4 — FeaturedStore** (className swap):
```
BEFORE: className="w-full relative p-5 rounded-[24px] border border-primary/15 bg-card overflow-hidden group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
AFTER:  className="w-full relative p-5 rounded-[24px] border border-primary/15 bg-card overflow-hidden group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Edit 5 — StoreCardWithLocation** (className swap):
```
BEFORE: className={`group w-full flex items-center gap-4 p-4 rounded-[20px] border bg-card transition-all duration-300 ${
AFTER:  className={`group w-full flex items-center gap-4 p-4 rounded-[20px] border bg-card transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
```

**Edit 6 — Local-store cards** (add `whileTap` + className swap):
```
BEFORE:
          <motion.button
            key={ds.id}
            variants={cardVariant}
            onClick={() => navigate(getStorePublicPath(ds))}
            className="w-full rounded-2xl bg-card border border-border/30 hover:border-primary/20 hover:shadow-lg transition-all text-left group overflow-hidden"

AFTER:
          <motion.button
            key={ds.id}
            variants={cardVariant}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(getStorePublicPath(ds))}
            className="w-full rounded-2xl bg-card border border-border/30 hover:border-primary/20 hover:shadow-lg transition-all text-left group overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Edit 7 — Hero trust-badge row** (className swap):
```
BEFORE: <div className="flex items-center gap-4 mt-3 pt-3 border-t border-primary/10">
AFTER:  <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-primary/10">
```

---

**Net: 7 edits, all className + one `whileTap` prop. Zero logic/query/mutation changes.**

## Owner / verifier action

1. Apply the 7 edits above (or the full diff — it's ~10 insertions / 10 deletions).
2. Run `npm run update` — must pass (type-check + worker type-check + production build).
3. Preview `/grocery` at 375 / 768 / 1280 — confirm:
   - Tab through header buttons → visible ring on each.
   - Tab into FeaturedStore / StoreCardWithLocation / Local-store cards → visible ring.
   - Tap/click local-store cards → press feedback (scale 0.97).
   - Hero trust badges wrap cleanly at 375px.
