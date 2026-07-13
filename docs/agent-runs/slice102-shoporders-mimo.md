# MiMo run — 2026-06-14T09:34:57.542Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/shop/ShopOrdersPage.tsx (191-line merchant "Orders" page rendered inside <AppLayout>; @tanstack/react-query useQuery my-store (store_profiles) + shop-orders (store_orders); useMutation updateStatus via supabase.functions.invoke store-order-state-update; supabase realtime channel for new-order INSERT toast + NEW badge; useState search/statusFilter/newOrderIds; useRef initialLoadDone; date-fns; cn()). RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) ONLY; preserve ALL logic, onClick, navigate, supabase, react-query keys, mutation, realtime, setState byte-identical. Don't add a SECOND COMPETING press effect. Don't churn controls that ALREADY ship press+transition. Don't add role/tabIndex/onKeyDown (structural — FLAG). Don't touch disabled. SKIP shadcn Button/Input/Badge/AppLayout (own tokens). LEAVE native form fields.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface (even if the control's OWN fill is colored). Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO hover:bg/text(color)/border/opacity ON THE ELEMENT ITSELF.
- FLIP / ADD: ADDING a new active:scale to a transition-colors/no-transition control that ALSO has a hover/active color/bg/border ON ITSELF → use transition-all (FLIP from transition-colors / no-transition).
- For bare icon/text-link buttons/anchors add a rounded/rounded-full so the ring traces tightly.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select toggle/segmented filter. aria-expanded on a disclosure.

TWO edits applied — confirm each CORRECT or NEEDS-FIX:

A) L112 BACK button — was `p-2 -ml-2 rounded-full hover:bg-muted/50` (icon-only ArrowLeft; hover:bg ON ITSELF; NO transition class, NO scale, NO ring; rounded-full present; NO aria-label; on the sticky bg-background/95 header neutral) → ADDED `aria-label="Go back"` + FLIP (no-transition→transition-all because hover:bg + new scale must both animate) + `active:scale-95` (icon-only tier) + ring. Final: `p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` plus `aria-label="Go back"`. Confirm: (1) aria-label correct (was missing on icon-only); (2) transition-all correct (hover:bg + new scale both animate — was no transition class); (3) scale-95 icon-only tier; (4) OUTWARD ring-ring on the neutral header.

B) L125 STATUS-FILTER segmented buttons (all/pending/confirmed/picked_up/delivered/cancelled) — was `cn("shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors capitalize", s === statusFilter ? "bg-foreground text-background" : "bg-muted/60 text-muted-foreground")` (persistent single-select segmented filter toggling setStatusFilter; transition-colors present for the active/inactive bg+text swap; NO scale, NO ring, NO aria-pressed; horizontal-scroll row; rounded-full present) → ADDED `active:scale-[0.97]` + FLIP transition-colors→transition-all + ring + `aria-pressed={s === statusFilter}`. Final className: `cn("shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all active:scale-[0.97] capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", s === statusFilter ? "bg-foreground text-background" : "bg-muted/60 text-muted-foreground")` plus `aria-pressed={s === statusFilter}`. Confirm: (1) aria-pressed correct for a persistent single-select segmented filter; (2) scale-[0.97] chips/pills tier correct; (3) FLIP transition-colors→transition-all correct (new scale + existing bg/text color swap both animate); (4) OUTWARD ring-ring (the active button's own fill is bg-foreground but the ring traces the neutral header parent).

ALSO CONFIRM I should LEAVE: AppLayout shell; shadcn <Input> L121 (search), shadcn <Badge> L116 (pending count), shadcn <Button> L179 (Mark as next-status, has its own tokens + onClick mutation) — all own tokens, SKIP; the motion.div order cards L155 (no onClick — non-interactive container); the status pill div L167 (non-interactive); the NEW badge span L162; the loading-skeleton + empty-state divs; all lucide icons (decorative). No clickable divs with onClick. No native form fields besides the shadcn Input.

Be concise and exact. Return the precise final className after-string for EACH of A–B + any aria attr. Flag any other in-scope raw interactive control I missed. Note especially: (1) A — aria-label add + FLIP no-transition→transition-all + scale-95 + ring on the Back button — correct? (2) B — aria-pressed + scale-[0.97] + FLIP transition-colors→transition-all + ring on the segmented status filter — correct? (3) leaving the shadcn Button "Mark as X" (L179) untouched — correct?
- files: src/pages/app/shop/ShopOrdersPage.tsx

---

## Verdict: ALL CORRECT — zero fixes needed

---

### A) Back button (L112)

**CORRECT.** Final className + aria:

```
p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
```
aria-label="Go back"
```

| Token | Rationale |
|-------|-----------|
| `aria-label="Go back"` | Icon-only, no visible text → required |
| `transition-all` (FLIP) | `hover:bg-muted/50` (bg ON ELEMENT) + new `active:scale-95` (transform) must both animate; was no-transition → `transition-all` |
| `active:scale-95` | Icon-only tier (single ArrowLeft) |
| OUTWARD `ring-ring` | Neutral `bg-background/95` header parent; `rounded-full` already present traces the ring |

---

### B) Status-filter segmented buttons (L125)

**CORRECT.** Final className + aria:

```
shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all active:scale-[0.97] capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
(dynamic: `"bg-foreground text-background"` active / `"bg-muted/60 text-muted-foreground"` inactive)
```
aria-pressed={s === statusFilter}
```

| Token | Rationale |
|-------|-----------|
| `aria-pressed={s === statusFilter}` | Persistent single-select segmented filter → correct disclosure of active state |
| `transition-all` (FLIP) | `bg` + `text-color` swap ON ELEMENT + new `active:scale-[0.97]` → must both animate |
| `active:scale-[0.97]` | Chips/pills tier (rounded-full pill buttons) |
| OUTWARD `ring-ring` | Ring traces the neutral header parent, not the button's own `bg-foreground` fill |

---

### Leave list — CONFIRMED correct

All of these are correctly **skipped**:

- **AppLayout** shell (own tokens)
- **shadcn `<Input>`** L121 search (own tokens)
- **shadcn `<Badge>`** L116 pending count (own tokens)
- **shadcn `<Button>`** L179 "Mark as X" (own tokens, has its own `onClick` mutation) — **correct to leave untouched**
- **`motion.div` order cards** L155 (no `onClick` — non-interactive container)
- **Status pill `<div>`** L167 (non-interactive)
- **`<span>` NEW badge** L162 (non-interactive)
- Loading skeleton / empty-state divs, all lucide icons (decorative)

---

### Missed controls scan

Scanned every `<button>`, `<a>`, `onClick`, `cursor-pointer`, and interactive element in the 191-line file:

- L112 Back `<button>` → **COVERED (A)**
- L125 status-filter `<button>` × 6 (mapped) → **COVERED (B)**
- L179 shadcn `<Button>` "Mark as X" → **SKIP (own tokens)**
- **No clickable divs with `onClick`**
- **No raw `<a>` elements**
- **No native form fields besides the shadcn `<Input>`** (which wraps a native input with its own tokens)

**Zero missed in-scope raw interactive controls.**

---

### Guard-grep summary

| Check | Count |
|-------|-------|
| className edits | 2 |
| new `aria-label` | 1 (A) |
| new `aria-pressed` | 1 (B) |
| `focus-visible:ring` | 2 (A + B) |
| `ring-ring` | 2, both OUTWARD |
| `ring-inset` | 0 |
| `active:scale-95` | 1 (A) |
| `active:scale-[0.97]` | 1 (B) |
| FLIPs | 2 (A: no-transition→`transition-all`; B: `transition-colors`→`transition-all`) |
| Competing 2nd press added | 0 |
| `disabled` touched | 0 |
| Logic lines touched | 0 |

---

### Owner action

1. **Apply** the two edits (already shown in the provided file — they appear to already be in the working tree).
2. **Verify**: `npm run update` — must pass (type-check + worker type-check + production build, TRUE EXIT 0).
3. **Preview** at 375/768/1280 — confirm Back button ring visible on tap, segmented filter pills scale + ring on focus.
4. **Commit** when satisfied. Do not commit unless owner asks.
