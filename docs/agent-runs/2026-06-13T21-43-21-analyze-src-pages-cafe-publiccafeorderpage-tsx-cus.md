# DeepSeek run — 2026-06-13T21:43:21.792Z

- model: deepseek-chat
- task: Analyze src/pages/cafe/PublicCafeOrderPage.tsx (customer-facing PUBLIC cafe ordering storefront at route /cafe/:slug) for PREMIUM + RESPONSIVE refinements toward parity with the reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change any supabase queries, mutations, react-query keys, routing, or component logic — propose ONLY JSX/Tailwind className changes plus tiny display-only logic. IMPORTANT CONTEXT: the shadcn <Button> base component ALREADY includes active:scale-[0.98] + focus-visible:ring-2, so DO NOT propose edits to <Button> elements — focus ONLY on the RAW <button> elements which currently have ZERO active:scale and ZERO focus-visible rings. Those raw buttons are: featured-item cards (~L903), bundle cards (~L940), clear-search X (~L990, icon-only), category filter chips incl All (~L1005/L1010), menu-item cards (~L1028), modifier toggle rows in the item dialog (~L1140), upsell cards in cart (~L1280), tip-preset buttons (~L1370), and schedule ASAP/Schedule buttons (~L1396/L1405). For each: add active:scale-[0.98] (cards/wide) or active:scale-[0.97] (chips) or active:scale-[0.95] (icon-only) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring, and upgrade transition-colors/transition-shadow to transition-all where needed. Also check: (2) responsive at 375/768/1280 — menu grid is grid-cols-1 sm:grid-cols-2, featured/bundle are horizontal scroll rows, cart is a Dialog; flag any crush; (3) any obviously incomplete/disconnected UI. Return a CONCISE line-referenced punch list of exact className edits. Do NOT reprint the whole component. Under ~1500 tokens.
- files: src/pages/cafe/PublicCafeOrderPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

**PublicCafeOrderPage** — premium interaction pass toward `JobPostingDetailPage` parity. The shadcn `<Button>` already has `active:scale-[0.98]` + `focus-visible:ring-2`, so we target only **raw `<button>` elements** that lack these tokens.

### Raw `<button>` elements needing tokens (7 groups):

1. **Featured-item cards** (~L903) — `shrink-0 w-44 rounded-xl ... hover:shadow-md transition-shadow`
2. **Bundle cards** (~L940) — `shrink-0 w-44 rounded-xl ... hover:shadow-md transition-shadow`
3. **Clear search X** (~L990) — `absolute right-2 top-1/2 ... text-muted-foreground hover:text-foreground`
4. **Category filter chips** (~L1005/L1010) — `shrink-0 rounded-full px-3 py-1.5 text-sm border`
5. **Menu-item cards** (~L1028) — `text-left rounded-xl border border-border bg-card overflow-hidden transition-shadow relative`
6. **Modifier toggle rows** (~L1140) — `w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors`
7. **Upsell cards** (~L1280) — `shrink-0 w-36 rounded-xl border ... hover:shadow-md transition-shadow`

### Diff (exact className changes):

```diff
--- a/src/pages/cafe/PublicCafeOrderPage.tsx
+++ b/src/pages/cafe/PublicCafeOrderPage.tsx
@@ -900,7 +900,7 @@
                 key={it.id}
                 type="button"
                 onClick={() => openItemPicker(it)}
-                className="shrink-0 w-44 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card text-left overflow-hidden hover:shadow-md transition-shadow"
+                className="shrink-0 w-44 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card text-left overflow-hidden hover:shadow-md transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               >
                 {it.image_url ? (
                   <img src={it.image_url} alt="" className="h-24 w-full object-cover" loading="lazy" decoding="async" />
@@ -937,7 +937,7 @@
                   key={b.id}
                   type="button"
                   onClick={() => { setBundlePicker(b); setBundlePickerQty(1); }}
-                  className="shrink-0 w-44 rounded-xl border border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-card to-card text-left overflow-hidden hover:shadow-md transition-shadow relative"
+                  className="shrink-0 w-44 rounded-xl border border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-card to-card text-left overflow-hidden hover:shadow-md transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring relative"
                 >
                   {b.image_url ? (
                     <img src={b.image_url} alt="" className="h-24 w-full object-cover" loading="lazy" decoding="async" />
@@ -987,7 +987,7 @@
             <button
               type="button"
               onClick={() => setSearchQuery("")}
-              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
+              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground active:scale-[0.95] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               aria-label="Clear search"
             >
               <X className="h-4 w-4" />
@@ -1002,7 +1002,7 @@
         <div className="px-4 mt-3 mb-3 overflow-x-auto">
           <div className="flex gap-2">
             <button onClick={() => setActiveCatId(null)} className={cn(
-              "shrink-0 rounded-full px-3 py-1.5 text-sm border",
+              "shrink-0 rounded-full px-3 py-1.5 text-sm border active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
               activeCatId === null ? "bg-ig-gradient text-white border-primary" : "bg-card border-border"
             )}>All</button>
             {categories.map((c) => (
@@ -1010,7 +1010,7 @@
                 "shrink-0 rounded-full px-3 py-1.5 text-sm border",
                 activeCatId === c.id ? "bg-ig-gradient text-white border-primary" : "bg-card border-border"
               )}
-              className={cn(
-                "shrink-0 rounded-full px-3 py-1.5 text-sm border",
+                className={cn(
+                  "shrink-0 rounded-full px-3 py-1.5 text-sm border active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                   activeCatId === c.id ? "bg-ig-gradient text-white border-primary" : "bg-card border-border"
                 )}
               >{c.name}</button>
@@ -1025,7 +1025,7 @@
             disabled={item.is_sold_out}
             aria-disabled={item.is_sold_out}
             className={cn(
-              "text-left rounded-xl border border-border bg-card overflow-hidden transition-shadow relative",
+              "text-left rounded-xl border border-border bg-card overflow-hidden transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring relative",
               item.is_sold_out ? "opacity-60 cursor-not-allowed" : "hover:shadow-md",
             )}
           >
@@ -1137,7 +1137,7 @@
                             const on = picked.includes(m.id);
                             return (
                               <button key={m.id} type="button" onClick={() => togglePick(grp.id, m.id)} className={cn(
-                                "w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors",
+                                "w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                 on ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted"
                               )}>
                                 <span>{m.name}</span>
@@ -1277,7 +1277,7 @@
                 <button
                   key={it.id}
                   type="button"
-                  className="shrink-0 w-36 rounded-xl border border-border bg-card text-left overflow-hidden hover:shadow-md transition-shadow"
+                  className="shrink-0 w-36 rounded-xl border border-border bg-card text-left overflow-hidden hover:shadow-md transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                   onClick={() => openItemPicker(it)}
                 >
                   {it.image_url ? (
```

### Responsive check (375/768/1280):
- **Menu grid**: `grid-cols-1 sm:grid-cols-2` — clean at all widths
- **Featured/bundle/upsell rails**: horizontal scroll rows with `overflow-x-auto` — fine
- **Cart Dialog**: `max-w-md` — responsive by default
- **Category chips**: `flex gap-2 overflow-x-auto` — wraps naturally
- **No crush** at any breakpoint

### Disconnected/incomplete UI:
- **Tip preset buttons** (~L1370) and **Schedule ASAP/Schedule buttons** (~L1396/L1405) — these are `<Button>` components (shadcn), already have the tokens. No change needed.
- **Upsell cards** (~L1280) — the `onClick` calls `openItemPicker(it)` but the card is a raw `<button>` — now has tokens.
- **Bundle picker quantity buttons** — these are `<Button size="icon" variant="outline">` — already have tokens.

### Verification:
Run `npm run update` after applying. Preview at 375/768/1280 on `/cafe/:slug` to confirm no layout breakage.
