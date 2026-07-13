# MiMo run — 2026-06-14T05:13:34.752Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + a11y QA on ONE customer-facing page: src/pages/FlightPriceAlertsPage.tsx (212 lines, "Flight-specific price watchers", REAL Supabase flight_price_alerts table, AUTH-GATED via useAuth). One useQuery ["flight-price-alerts-me", user?.id]; remove(id) = OPTIMISTIC qc.setQueryData (filter row out) -> sb.from("flight_price_alerts").delete().eq("id",id) -> on error toast.error + qc.invalidateQueries (rollback); else toast.success. stats useMemo (total/active/triggered). Layout: SwipeBackContainer + SEOHead noIndex; sticky header (shadcn back <Button> + Plane badge + title); gradient hero stat motion.div (NO onClick); loading skeletons; empty-state card (with shadcn "Search flights" <Button> navigate("/flights")); list of alert rows (presentational motion.div [entrance anim, NO onClick] containing origin->destination, date/passengers/cabin meta, a RAW icon-only "Remove" Trash2 button, a target/now/lowest price grid, last-checked line). NO bottom nav.

Reference standard: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring). Direct precedent: PushDevicesPage Revoke icon button (icon-only transition-colors+hover gaining a NEW scale -> FLIP to transition-all + add ring).

VERIFIED FACTS (full line-by-line read): exactly 1 RAW <button type="button"> (the Remove icon button L172) + 2 shadcn <Button> (back L99, "Search flights" L133). 0 motion.button.
- shadcn back <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full"> (L99) => SKIP (ships tokens, labeled).
- shadcn "Search flights" <Button> (L133) => SKIP (ships tokens).
- (A) Remove button (L172, RAW, ICON-ONLY Trash2): ALREADY aria-label="Remove", onClick={() => remove(a.id)}. BEFORE className: "h-8 w-8 rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors" — HAS transition-colors + hover:text/bg, NO scale, NO ring. Right-aligned in the per-row flex (row is "rounded-2xl bg-card border p-3.5" — NOT overflow-hidden).

TOKEN TIERS (this repo): wide/primary/cards active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. transition-all when the control ALSO has hover:bg/text/opacity; transition-transform for PURE press-scale with NO hover. CRITICAL: when ADDING a NEW active:scale to a transition-colors button that ALSO has a hover color/bg fade -> FLIP transition-colors->transition-all. aria-pressed ONLY for persistent toggle/segmented/filter state -- NOT for one-shot actions. ring-inset ONLY when flush inside an overflow-hidden rounded PARENT; OUTWARD default.

HARD RULE: className + display-only attr (aria-*) ONLY. Do NOT change any onClick / remove / qc.setQueryData / delete / qc.invalidateQueries / navigate / useQuery / useMemo / useAuth / any logic. Do NOT add onClick to a no-op control (FLAG it).

EDIT APPLIED (validate exact):
(A) Remove button (L172): ADD active:scale-95 (icon tier) + FLIP transition-colors->transition-all + append ring. KEEP aria-label="Remove". NO aria-pressed (one-shot destructive; row optimistically removed). OUTWARD ring.
AFTER: "h-8 w-8 rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring".

QUESTIONS:
(1) Remove button (A): ADD active:scale-95 + FLIP transition-colors->transition-all + ring (PushDevices Revoke precedent)? AGREE or advise.
(2) NO aria-pressed, KEEP aria-label="Remove"? Confirm.
(3) Inventory exhaustive (1 RAW Remove + 2 shadcn)? hero stat motion.div L112 + alert-row motion.div L146 correctly presentational (NO onClick)? skeletons/empty-state non-interactive?
(4) Responsive 375/768/1280: header; hero stat; alert row (icon tile 40px + flex-1 [origin->dest + meta flex-wrap] + Remove h-8 w-8 + 3-col price grid). Any crush @375? sub-44px tap targets to FLAG (back h-10 40px; Remove h-8 w-8 32px)?
(5) Owner flags (logic/out of scope, FLAG not fix): supabase cast type-workaround; optimistic delete rolls back via invalidateQueries; no human-readable airline/route name (raw IATA codes); row has no tap-through; anything else?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/FlightPriceAlertsPage.tsx

---

## Validation: FlightPriceAlertsPage — Edit already applied, all correct

The file as provided already contains the AFTER className on the Remove button. The edit is applied correctly. Here's the per-question verdict:

---

### (1) Remove button — **AGREE**

The edit is correct and matches the PushDevicesPage Revoke precedent exactly:

- **FLIP** `transition-colors` → `transition-all` ✅ (existing `hover:text-rose-500` + `hover:bg-rose-500/10` color fades need `transition-all` to also cover the new transform)
- **ADD** `active:scale-95` ✅ (icon-only tier)
- **APPEND** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ✅ (OUTWARD — row `rounded-2xl bg-card border p-3.5` is NOT `overflow-hidden`, button is right-aligned `shrink-0`)

Final className: `"h-8 w-8 rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` ✅

### (2) NO aria-pressed, KEEP aria-label="Remove" — **CONFIRM**

- `aria-pressed` would be wrong: this is a one-shot destructive action that optimistically removes the row from the DOM, not a persistent toggle. Same ruling as PushDevicesPage Revoke, MutedChatsPage Unmute, WarningsPage Acknowledge.
- `aria-label="Remove"` already present — KEEP, no churn.

### (3) Inventory exhaustive — **CONFIRM**

| Control | Type | Action |
|---|---|---|
| Back `Button` L99 | shadcn ghost icon | SKIP — ships tokens, `aria-label="Back"` ✅ |
| "Search flights" `Button` L133 | shadcn gradient | SKIP — ships tokens ✅ |
| **Remove `button` L172** | **RAW icon-only** | **EDITED** ✅ |
| Hero stat `motion.div` L112 | presentational | SKIP — NO onClick ✅ |
| Alert-row `motion.div` L146 | presentational | SKIP — NO onClick, entrance anim only ✅ |
| Skeletons L135 | `animate-pulse` divs | SKIP ✅ |
| Empty-state card L137 | no interactive children beyond the shadcn Button | SKIP ✅ |

### (4) Responsive — **CLEAN**

- **375px**: Header (Back `h-10` + icon-pill `h-7` + gradient h1) wraps gracefully. Alert row: icon tile `h-10 w-10` (40px) + `flex-1 min-w-0` column (origin→dest + meta `flex-wrap` truncates) + `shrink-0` Remove `h-8 w-8` (32px) + below it the 3-col `grid grid-cols-3 gap-2` price grid — all fits in ~343px content area (375 − 32px padding). No crush.
- **768/1280px**: Capped at `max-w-2xl` (672px) centered — comfortable.

**Sub-44px tap targets to FLAG** (not fix — repo-wide compact pattern):
- Back Button `h-10 w-10` = 40px ⚠️
- Remove button `h-8 w-8` = 32px ⚠️

### (5) Owner flags — **FLAG, not fix**

1. **`supabase as unknown as {…}`** hand-rolled cast for `flight_price_alerts` — clean up when Supabase types regenerate. Present on both the query and the delete.
2. **Optimistic delete** rolls back correctly via `qc.invalidateQueries` + `toast.error` — no confirm dialog on single-tap (existing pattern, intentional).
3. **Raw IATA codes** (`origin_iata` → `destination_iata`) — no human-readable airline/route name; flagged as a product enhancement opportunity (not a bug).
4. **No tap-through** on the alert row — fully presentational; could link to a re-search or detail view in the future.
5. **Price grid condition** `> 0` on a comma expression `(target || cur || low) > 0` — this evaluates `(low > 0)` after the `||` chain, which happens to work but is a pre-existing logic quirk (flagged, not in scope).

---

### (6) HARD RULE — **CLEAN**

The diff is exactly **1 className edit** (`−`/`+` pair): the Remove button. Zero logic lines touched. Zero new `aria-*` attributes (the pre-existing `aria-label="Remove"` is kept). Every `onClick`, `remove()`, `qc.setQueryData`, `supabase.from().delete()`, `qc.invalidateQueries`, `useQuery`, `useMemo`, `useAuth`, `navigate`, `toast`, `cn()` conditional preserved byte-for-byte.

---

### Summary

**The edit is correct as-applied.** No further changes needed. Verified against the PushDevicesPage Revoke precedent (byte-identical token pattern). `npm run update` must pass (type-check + worker type-check + production build) before moving to Done. Owner commits.
